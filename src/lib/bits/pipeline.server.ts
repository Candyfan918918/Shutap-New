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
  fill,
} from '@/lib/jokes/prompts.server'
import {
  hardRuleFailure,
  judgeModel,
  runPremisePass,
  toneFailure,
  writerModel,
  type Premise,
} from '@/lib/jokes/pipeline.server'
import { WORDS_PER_SECOND, bitWords, type BitControls, type BitDraft, type VaryKind } from './shared'

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
  if (!premises.length) return '(none: read the story yourself, past the obvious)'
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
  if (b.hook.split(/\s+/).length > 10) return 'hook over 10 words'
  for (const part of [b.hook, b.setup]) {
    const f = toneFailure(part)
    if (f) return f
  }
  for (const line of [...b.tags, b.button]) {
    const f = hardRuleFailure(line, story, 'the_roast', { ignoreLength: true })
    if (f && f !== 'too short') return f
  }
  if (bitWords(b) > maxWords(controls)) return 'over length'
  return null
}

/* ── stage 2 · the bit pass ── */

export async function runBitPass(
  story: string,
  premises: Premise[],
  controls: BitControls,
): Promise<{ bits: BitDraft[]; altTags: string[]; model: string; error?: string }> {
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
  if (res.error) return { bits: [], altTags: [], model: res.model, error: res.error }
  const parsed = tryParseJson<{ bits?: unknown; alt_tags?: unknown }>(res.text)
  const bits = (Array.isArray(parsed?.bits) ? parsed!.bits : [])
    .map(cleanBit)
    .filter((b): b is BitDraft => !!b)
  const altTags = (Array.isArray(parsed?.alt_tags) ? parsed!.alt_tags : [])
    .map(tidy)
    .filter((t) => t && !hardRuleFailure(t, story, 'the_roast', { ignoreLength: true }))
    .slice(0, 5)
  return { bits, altTags, model: res.model, ...(bits.length ? {} : { error: 'no bits parsed' }) }
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
): Promise<WrittenBit | null> {
  const t0 = Date.now()
  const premises = await (premisesPromise ?? startPremises(story))
  const t1 = Date.now()

  let pass = await runBitPass(story, premises, controls)
  // One retry when the writer failed outright (timeout, unparseable).
  if (!pass.bits.length) pass = await runBitPass(story, premises, controls)
  const t2 = Date.now()

  const rejected: { hook: string; rule: string }[] = []
  const passing = pass.bits.filter((b) => {
    const f = bitFailure(b, story, controls)
    if (f) rejected.push({ hook: b.hook, rule: f })
    return !f
  })
  if (!passing.length) {
    console.warn('[bit] nothing passed the rules', { rejected, error: pass.error })
    return null
  }

  const verdict = await runBitJudge(story, controls, passing)
  const t3 = Date.now()
  if (verdict.error) console.warn('[bit-judge] fell back to writer order', verdict.error)
  // The judge may reject everything; then the rules' survivors stand in
  // writer order rather than returning nothing.
  const order = verdict.order.length ? verdict.order : passing.map((_, i) => i)
  const ranked = order.map((i) => passing[i]!).filter(Boolean)

  return {
    ranked,
    altTags: pass.altTags,
    premises,
    judgeWhy: verdict.why,
    writerModel: pass.model,
    judgeModel: verdict.model,
    promptVersion: BIT_PROMPT_VERSION,
    timings: { premises_ms: t1 - t0, write_ms: t2 - t1, judge_ms: t3 - t2 },
    rejected,
  }
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
