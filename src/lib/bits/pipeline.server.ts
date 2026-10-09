// The bit generator: one story in, one bit out.
//
//   1 · PREMISE PASS  the card pipeline's stage 1, reused unchanged: twelve
//                     observations about the story, cached on bits.premises.
//   2 · BIT PASS      four whole bits in one call, each on a different
//                     observation, plus five spare tags.
//   3 · BIT JUDGE     a DIFFERENT MODEL FAMILY ranks the bits that survive
//                     the deterministic rules and names a winner.
//
// Deterministic rules run before the judge, so a bit is still safe when the
// judge is down: then the first bit that passes wins. Every prompt lives in
// src/lib/jokes/prompts.server.ts.
import { callAgent, tryParseJson } from '@/lib/agents/gateway'
import {
  BIT_AUDIENCE,
  BIT_HEAT,
  BIT_JUDGE_PROMPT,
  BIT_PROMPT,
  BIT_PROMPT_VERSION,
  BIT_SECONDS,
  BIT_VARY_PROMPT,
  BIT_VARY_RULES,
  BIT_VOICES,
  BIT_ANGLE_FINDER,
  CAPTION_PROMPT,
  SCENE_PROMPT,
  SCREENPLAY_PROMPT,
  fill,
} from '@/lib/jokes/prompts.server'
import {
  clinicalWord,
  hardRuleFailure,
  judgeModel,
  runPremisePass,
  toneFailure,
  writerModel,
  type Premise,
} from '@/lib/jokes/pipeline.server'
import {
  SCREENPLAY_TYPES,
  WORDS_PER_SECOND,
  bitWords,
  type BitControls,
  type BitDraft,
  type SceneBeat,
  type ScreenplayElement,
  type VaryKind,
} from './shared'

export { BIT_PROMPT_VERSION }

/* ── budgets ──
   The target is a bit in under ten seconds end to end. Each stage gets a
   wall-clock cap, tunable with BIT_*_MS; past it the ladder moves on: the
   writer without premises, the first passing bit without a judge. */
function budgetMs(name: string, fallback: number): number {
  const n = Number(process.env[name] ?? '')
  return Number.isFinite(n) && n > 0 ? n : fallback
}
export const BIT_BUDGET = {
  premises: () => budgetMs('BIT_PREMISE_MS', 7_000),
  write: () => budgetMs('BIT_WRITE_MS', 15_000),
  judge: () => budgetMs('BIT_JUDGE_MS', 6_000),
  vary: () => budgetMs('BIT_VARY_MS', 12_000),
}

/* ── controls → prompt text ── */
function controlVars(c: BitControls) {
  const seconds = BIT_SECONDS[c.length] ?? 30
  const words = Math.round(seconds * WORDS_PER_SECOND)
  return {
    AUDIENCE: BIT_AUDIENCE[c.audience] ?? BIT_AUDIENCE.social,
    VOICE: BIT_VOICES[c.voice] ?? BIT_VOICES.deadpan,
    HEAT: BIT_HEAT[c.heat] ?? BIT_HEAT[3],
    SECONDS: String(seconds),
    WORDS: String(words),
    MAX_WORDS: String(Math.round(words * 1.25)),
  }
}

function maxWords(c: BitControls): number {
  return Math.round((BIT_SECONDS[c.length] ?? 30) * WORDS_PER_SECOND * 1.35)
}

/** The observations, the four dealt ones first, numbered for the writer. */
export function formatPremisesForBit(premises: Premise[]): string {
  if (!premises.length) return BIT_ANGLE_FINDER
  const ordered = [...premises.filter((p) => p.used), ...premises.filter((p) => !p.used)]
  return ordered.map((p, i) => `${i + 1}. ${p.t}`).join('\n')
}

/* ── cleaning and the deterministic rules ── */

const tidy = (s: unknown): string =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim()

/** A model's bit, normalised, or null when a part is missing. */
export function cleanBit(raw: unknown): BitDraft | null {
  const r = (raw ?? {}) as Record<string, unknown>
  const hook = tidy(r.hook).replace(/^["']|["']$/g, '')
  const setup = tidy(r.setup)
  const button = tidy(r.button)
  const why = tidy(r.why)
  const tags = (Array.isArray(r.tags) ? r.tags : [])
    .map(tidy)
    .filter(Boolean)
    .slice(0, 3)
  if (!hook || !setup || !button || tags.length === 0) return null
  return { hook, setup, tags, button, why }
}

/** Why a bit fails a hard rule, or null when it passes. The hook and setup
 *  may restate the story (that is their job), so they get the tone rules
 *  only; the tags and the button must also pass the naming test. */
export function bitFailure(b: BitDraft, story: string, controls: BitControls): string | null {
  // A therapy word the STORY itself used is the story's vocabulary, not the
  // writer's register ("trigger" in a story about guns, "healing" about a
  // cut finger): quote it so the clinical check reads past it.
  const own = (line: string) => {
    let out = line
    for (let i = 0; i < 4; i++) {
      const w = clinicalWord(out)
      if (!w || !story.toLowerCase().includes(w)) break
      out = out.replace(new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), (m) => `"${m}"`)
    }
    return out
  }
  for (const part of [b.hook, b.setup]) {
    const f = toneFailure(own(part))
    if (f) return f
  }
  for (const line of [...b.tags, b.button]) {
    const f = hardRuleFailure(own(line), story, 'the_roast', { ignoreLength: true })
    if (f && f !== 'too short') return f
  }
  if (b.hook.split(/\s+/).length > 10) return 'hook over 10 words'
  if (bitWords(b) > maxWords(controls)) return 'over length'
  return null
}

/** Rules that protect people (advice, reassurance, therapy words, banned
 *  constructions) are never relaxed. The rest are craft: when no bit passes
 *  them all, the best craft-only miss is shown rather than nothing. */
export function isSafetyFailure(rule: string): boolean {
  return rule === 'advice' || rule === 'reassurance' || rule === 'clinical vocabulary' || rule.startsWith('banned construction')
}

/* ── stage 2 · the bit pass ── */

export async function runBitPass(
  story: string,
  premises: Premise[],
  controls: BitControls,
): Promise<{ bits: BitDraft[]; altTags: string[]; angles: string[]; model: string; error?: string }> {
  const prompt = fill(BIT_PROMPT, {
    SITUATION: story.slice(0, 2000),
    PREMISES: formatPremisesForBit(premises),
    ...controlVars(controls),
  })
  const res = await callAgent({
    model: writerModel(),
    temperature: 1.0,
    maxTokens: 4000,
    timeoutMs: BIT_BUDGET.write(),
    messages: [{ role: 'user', content: prompt }],
  })
  if (res.error) return { bits: [], altTags: [], angles: [], model: res.model, error: res.error }
  const parsed = tryParseJson<{ bits?: unknown; alt_tags?: unknown; angles?: unknown }>(res.text)
  const bits = (Array.isArray(parsed?.bits) ? parsed!.bits : [])
    .map(cleanBit)
    .filter((b): b is BitDraft => !!b)
  const altTags = (Array.isArray(parsed?.alt_tags) ? parsed!.alt_tags : [])
    .map(tidy)
    .filter((t) => t && !hardRuleFailure(t, story, 'the_roast', { ignoreLength: true }))
    .slice(0, 5)
  const angles = (Array.isArray(parsed?.angles) ? parsed!.angles : []).map(tidy).filter(Boolean).slice(0, 6)
  return { bits, altTags, angles, model: res.model, ...(bits.length ? {} : { error: 'no bits parsed' }) }
}

/* ── stage 3 · the judge ── */

export type BitVerdict = { order: number[]; why: string | null; model: string; error?: string }

function formatBits(bits: BitDraft[]): string {
  return bits
    .map(
      (b, i) =>
        `${i}.\n  HOOK: ${b.hook}\n  SETUP: ${b.setup}\n${b.tags.map((t, j) => `  TAG ${j + 1}: ${t}`).join('\n')}\n  BUTTON: ${b.button}`,
    )
    .join('\n\n')
}

export async function runBitJudge(story: string, controls: BitControls, bits: BitDraft[]): Promise<BitVerdict> {
  const model = judgeModel()
  const identity = bits.map((_, i) => i)
  if (bits.length < 2) return { order: identity, why: null, model }
  const res = await callAgent({
    model,
    temperature: 0,
    reasoningEffort: 'low',
    maxTokens: 3000,
    timeoutMs: BIT_BUDGET.judge(),
    messages: [
      {
        role: 'user',
        content: fill(BIT_JUDGE_PROMPT, {
          SITUATION: story.slice(0, 2000),
          AUDIENCE: BIT_AUDIENCE[controls.audience] ?? BIT_AUDIENCE.social,
          BITS: formatBits(bits),
        }),
      },
    ],
  })
  if (res.error) return { order: identity, why: null, model, error: res.error }
  const parsed = tryParseJson<{ winner?: unknown; why?: unknown; ranking?: unknown; rejected?: unknown }>(res.text)
  if (!parsed) return { order: identity, why: null, model, error: 'unparseable verdict' }
  const n = bits.length
  const inRange = (i: unknown): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < n
  const rejected = new Set(
    (Array.isArray(parsed.rejected) ? parsed.rejected : []).map((r: any) => Number(r?.i)).filter(inRange),
  )
  const ranked = (Array.isArray(parsed.ranking) ? parsed.ranking : []).filter(inRange) as number[]
  const winner = inRange(parsed.winner) && !rejected.has(parsed.winner) ? parsed.winner : null
  const order: number[] = []
  for (const i of [...(winner !== null ? [winner] : []), ...ranked, ...identity]) {
    if (!rejected.has(i) && !order.includes(i)) order.push(i)
  }
  // Every bit rejected: the judge found nothing fit to perform.
  return { order, why: typeof parsed.why === 'string' ? parsed.why.trim().slice(0, 300) : null, model }
}

/* ── the whole run ── */

/** Why a run returned nothing, for the failure log (no story text). */
export type BitFailure = { rejected: { hook: string; rule: string }[]; error: string | null }

export type WrittenBit = {
  /** best first; [0] is the bit the user sees */
  ranked: BitDraft[]
  altTags: string[]
  premises: Premise[]
  judgeWhy: string | null
  writerModel: string
  judgeModel: string
  promptVersion: string
  timings: Record<string, number>
  rejected: { hook: string; rule: string }[]
}

/** Premises are passed in when they were started early (beside the Guard). */
export async function writeBitFromStory(
  story: string,
  controls: BitControls,
  premisesPromise?: Promise<Premise[]>,
  sink?: { failure?: BitFailure },
): Promise<WrittenBit | null> {
  const t0 = Date.now()
  // Since bit-1.1 the writer finds its own angles (BIT_ANGLE_FINDER), which
  // saves the separate premise call. BIT_PREMISE_PASS=on brings it back.
  const premises = premisesPromise ? await premisesPromise : premisePassOn() ? await startPremises(story) : []
  const t1 = Date.now()

  let pass = await runBitPass(story, premises, controls)
  // One retry when the writer failed outright (timeout, unparseable).
  if (!pass.bits.length) pass = await runBitPass(story, premises, controls)
  const t2 = Date.now()

  const rejected: { hook: string; rule: string }[] = []
  const judge = (bits: BitDraft[]) => {
    const ok: BitDraft[] = []
    const craftOnly: BitDraft[] = []
    for (const b of bits) {
      const f = bitFailure(b, story, controls)
      if (!f) ok.push(b)
      else {
        rejected.push({ hook: b.hook, rule: f })
        if (!isSafetyFailure(f)) craftOnly.push(b)
      }
    }
    return { ok, craftOnly }
  }
  let sorted = judge(pass.bits)
  // Nothing safe to show at all: write once more before giving up.
  if (!sorted.ok.length && !sorted.craftOnly.length) {
    pass = await runBitPass(story, premises, controls)
    sorted = judge(pass.bits)
  }
  // Only craft misses (too long, a restatement, a soft landing): show the
  // shortest of them rather than an error. Safety misses are never shown.
  const passing = sorted.ok.length ? sorted.ok : [...sorted.craftOnly].sort((a, b) => bitWords(a) - bitWords(b))
  if (!passing.length) {
    console.warn('[bit] nothing passed the rules', { rejected, error: pass.error })
    if (sink) sink.failure = { rejected, error: pass.error ?? null }
    return null
  }

  // Since bit-1.1 the writer orders its own four, strongest first, which
  // saves the judge call. BIT_JUDGE=on brings the judge back.
  const verdict: BitVerdict = judgeOn()
    ? await runBitJudge(story, controls, passing)
    : { order: passing.map((_, i) => i), why: null, model: 'writer-order' }
  const t3 = Date.now()
  if (verdict.error) console.warn('[bit-judge] fell back to writer order', verdict.error)
  // The judge may reject everything; then the rules' survivors stand in
  // writer order rather than returning nothing.
  const order = verdict.order.length ? verdict.order : passing.map((_, i) => i)
  const ranked = order.map((i) => passing[i]!).filter(Boolean)

  return {
    ranked,
    altTags: pass.altTags,
    premises: premises.length ? premises : pass.angles.map((t) => ({ t, used: true })),
    judgeWhy: verdict.why,
    writerModel: pass.model,
    judgeModel: verdict.model,
    promptVersion: BIT_PROMPT_VERSION,
    timings: { premises_ms: t1 - t0, write_ms: t2 - t1, judge_ms: t3 - t2 },
    rejected,
  }
}

const flag = (name: string) => (process.env[name] ?? '').trim().toLowerCase() === 'on'
function premisePassOn(): boolean {
  return flag('BIT_PREMISE_PASS')
}
function judgeOn(): boolean {
  return flag('BIT_JUDGE')
}

/** Stage 1 on the bit budget: one attempt, then the writer reads the story itself. */
export function startPremises(story: string): Promise<Premise[]> {
  return runPremisePass(story, { timeoutMs: BIT_BUDGET.premises(), attempts: 1 }).catch(() => [])
}

/* ── versions ── */

export async function varyBitDraft(
  story: string,
  bit: BitDraft,
  controls: BitControls,
  kind: VaryKind,
): Promise<BitDraft | null> {
  const asText = `HOOK: ${bit.hook}\nSETUP: ${bit.setup}\n${bit.tags.map((t, j) => `TAG ${j + 1}: ${t}`).join('\n')}\nBUTTON: ${bit.button}`
  const cv = controlVars(controls)
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await callAgent({
      model: writerModel(),
      temperature: 1.0,
      maxTokens: 2000,
      timeoutMs: BIT_BUDGET.vary(),
      messages: [
        {
          role: 'user',
          content: fill(BIT_VARY_PROMPT, {
            SITUATION: story.slice(0, 2000),
            BIT: asText,
            AUDIENCE: cv.AUDIENCE,
            VOICE: cv.VOICE,
            KIND_RULE: BIT_VARY_RULES[kind],
          }),
        },
      ],
    })
    if (res.error) {
      console.warn('[bit-vary] gateway error', { kind, error: res.error })
      continue
    }
    const draft = cleanBit(tryParseJson(res.text))
    if (!draft) continue
    const f = bitFailure(draft, story, { ...controls, length: '2m' })
    if (!f) return draft
    console.warn('[bit-vary] failed a rule', { kind, rule: f })
  }
  return null
}

export function heatFor(kind: VaryKind | 'original', controls: BitControls): number {
  return kind === 'hotter' ? Math.min(5, controls.heat + 2) : controls.heat
}

/* ── phase 5: scene and screenplay ── */


function bitAsText(b: Pick<BitDraft, 'hook' | 'setup' | 'tags' | 'button'>): string {
  return `HOOK: ${b.hook}\nSETUP: ${b.setup}\n${b.tags.map((t, j) => `TAG ${j + 1}: ${t}`).join('\n')}\nBUTTON: ${b.button}`
}

async function layout<T>(template: string, story: string, bit: Pick<BitDraft, 'hook' | 'setup' | 'tags' | 'button'>, parse: (raw: unknown) => T | null): Promise<T | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await callAgent({
      model: writerModel(),
      temperature: 0.7,
      maxTokens: 2500,
      timeoutMs: BIT_BUDGET.vary(),
      messages: [{ role: 'user', content: fill(template, { SITUATION: story.slice(0, 2000), BIT: bitAsText(bit) }) }],
    })
    if (res.error) {
      console.warn('[bit-layout] gateway error', res.error)
      continue
    }
    const out = parse(tryParseJson(res.text))
    if (out) return out
  }
  return null
}

export function writeScene(story: string, bit: Pick<BitDraft, 'hook' | 'setup' | 'tags' | 'button'>): Promise<SceneBeat[] | null> {
  return layout(SCENE_PROMPT, story, bit, (raw) => {
    const list = Array.isArray((raw as any)?.beats) ? ((raw as any).beats as any[]) : []
    const beats = list
      .map((b) => ({
        shot: tidy(b?.shot).slice(0, 120),
        speaker: tidy(b?.speaker).slice(0, 40) || '—',
        line: tidy(b?.line).slice(0, 600),
        on_screen: tidy(b?.on_screen).slice(0, 60),
      }))
      .filter((b) => b.shot && b.line && !toneFailure(b.line))
      .slice(0, 10)
    return beats.length >= 3 ? beats : null
  })
}

export function writeScreenplay(story: string, bit: Pick<BitDraft, 'hook' | 'setup' | 'tags' | 'button'>): Promise<ScreenplayElement[] | null> {
  return layout(SCREENPLAY_PROMPT, story, bit, (raw) => {
    const list = Array.isArray((raw as any)?.elements) ? ((raw as any).elements as any[]) : []
    const els = list
      .map((e) => ({ type: String(e?.type ?? '') as ScreenplayElement['type'], text: tidy(e?.text).slice(0, 800) }))
      .filter((e) => SCREENPLAY_TYPES.includes(e.type) && e.text && !toneFailure(e.text))
      .slice(0, 60)
    const hasDialogue = els.some((e) => e.type === 'dialogue')
    return els.length >= 4 && hasDialogue ? els : null
  })
}

/* ── caption + hashtags ── */

export type BitCaption = { caption: string; hashtags: string[] }

export async function writeCaption(
  story: string,
  bit: Pick<BitDraft, 'hook' | 'setup' | 'tags' | 'button'>,
  audience: string,
): Promise<BitCaption | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await callAgent({
      model: writerModel(),
      temperature: 0.9,
      maxTokens: 600,
      timeoutMs: BIT_BUDGET.vary(),
      messages: [
        {
          role: 'user',
          content: fill(CAPTION_PROMPT, {
            SITUATION: story.slice(0, 2000),
            BIT: bitAsText(bit),
            AUDIENCE: BIT_AUDIENCE[audience] ?? BIT_AUDIENCE.social,
          }),
        },
      ],
    })
    if (res.error) continue
    const raw = tryParseJson<{ caption?: unknown; hashtags?: unknown }>(res.text)
    const caption = tidy(raw?.caption).slice(0, 220)
    const hashtags = (Array.isArray(raw?.hashtags) ? raw!.hashtags : [])
      .map((h) => '#' + tidy(h).replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, ''))
      .filter((h) => h.length > 2 && h.length < 40)
      .filter((h, i, a) => a.findIndex((x) => x.toLowerCase() === h.toLowerCase()) === i)
      .slice(0, 8)
    if (caption && !toneFailure(caption) && hashtags.length >= 3) return { caption, hashtags }
  }
  return null
}
