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
import { DEFAULT_MODEL, callAgent, tryParseJson } from '@/lib/agents/gateway'
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
import { houseSignal } from './house.server'
import { TECHNIQUES, bankFromFunniest, costumeToken, dealTechniques, formatTechniques, techniqueCraftFailure, type Dealt, type Technique } from './techniques'

/* ── the /funniest bank ──
   Built once per process from the published /funniest pages and the
   /guides pages that declare techniques, so every new daily page feeds the
   writer on the next build. Loaded lazily: the pages
   module uses import.meta.glob, which only Vite provides; under plain node
   (the unit tests) the bank is empty and the hand-tuned 25 stand alone. */
let bankPromise: Promise<{ line: Technique[]; performance: Technique[] }> | null = null
export function funniestBank(): Promise<{ line: Technique[]; performance: Technique[] }> {
  bankPromise ??= Promise.all([import('@/lib/seo/funniest'), import('@/lib/seo/guides')])
    .then(([f, g]) =>
      bankFromFunniest([
        ...f.FUNNIEST.flatMap((e) => e.techniques.map((t) => ({ slug: e.slug, name: t.name, whyItWorks: t.whyItWorks, example: t.example, tryIt: t.tryIt }))),
        // The /guides pages that declare techniques (same shape) join the bank too.
        ...g.GUIDES.flatMap((e) => (e.techniques ?? []).map((t) => ({ slug: `guides/${e.slug}`, name: t.name, whyItWorks: t.whyItWorks, example: t.example, tryIt: t.tryIt }))),
      ]),
    )
    .catch(() => ({ line: [], performance: [] }))
  return bankPromise
}

export { BIT_PROMPT_VERSION }

/* ── budgets ──
   The target is a bit in under ten seconds end to end. Each stage gets a
   wall-clock cap, tunable with BIT_*_MS; past it the ladder moves on: the
   writer without premises, the first passing bit without a judge.

   The writer is HEDGED (Oct 21 2026): one model with a hard cap and serial
   retries of the same call returned nothing for five days when that model
   ran slow (every attempt hit the cap, ~50s, then an error). Now the primary
   writer starts at once; if it has not answered by BIT_HEDGE_MS, a backup
   writer on a faster model starts beside it, and the first usable answer
   wins. A slow model costs seconds, never the bit.

   Hedge raised 3s → 9s (Oct 29 2026, bit-1.3): at 3s the backup joined
   every run and won 194 of 196 bits in a week, so the weakest model wrote
   almost everything.

   bit-1.4 (Oct 29 2026): the primary writer is a stronger, slower model
   (BIT_WRITER_MODEL, default openai/gpt-5 at low reasoning) and the race
   PREFERS it: the backup still starts at the hedge, but its answer is only
   used if the primary fails or runs past its cap. Funny is the product; a
   few more seconds is the price. BIT_PREFER_PRIMARY=off restores the pure
   race. The judge is back on by default (BIT_JUDGE=off turns it off).

   bit-1.5 (Oct 29 2026): back to a fast writer. In the blind eval gpt-5
   ran past its 30s cap on 19 of 30 stories and, when it did answer, won
   2 of 11. Default writer is now google/gemini-3-flash-preview; the judge
   moves to the other family (openai/gpt-5-mini) with a 10s cap. */
function budgetMs(name: string, fallback: number): number {
  const n = Number(process.env[name] ?? '')
  return Number.isFinite(n) && n > 0 ? n : fallback
}
export const BIT_BUDGET = {
  premises: () => budgetMs('BIT_PREMISE_MS', 7_000),
  /** primary writer's own cap; it keeps running while the backup races it */
  write: () => budgetMs('BIT_WRITE_MS', 30_000),
  /** when the backup writer joins the race */
  hedge: () => budgetMs('BIT_HEDGE_MS', 9_000),
  /** backup writer's cap, from the moment it starts */
  backup: () => budgetMs('BIT_BACKUP_MS', 22_000),
  judge: () => budgetMs('BIT_JUDGE_MS', 10_000),
  vary: () => budgetMs('BIT_VARY_MS', 15_000),
}

/** The backup writer: a different, faster model than the primary. Falls back
 *  to the default model when the primary is set to something else. */
export function backupWriterModel(): string {
  const wanted = (process.env['BIT_BACKUP_MODEL'] ?? '').trim() || 'google/gemini-2.5-flash-lite'
  return wanted === bitWriterModel() ? DEFAULT_MODEL : wanted
}

/** The bit writer's primary model: BIT_WRITER_MODEL, else the card
 *  pipeline's writer when one is set explicitly, else a fast Gemini. */
export function bitWriterModel(): string {
  const own = (process.env['BIT_WRITER_MODEL'] ?? '').trim()
  if (own) return own
  const shared = (process.env['JOKE_WRITER_MODEL'] ?? '').trim()
  return shared || 'google/gemini-3-flash-preview'
}

/** The bit judge: must be a different family from the writer. */
export function bitJudgeModel(): string {
  const wanted = (process.env['BIT_JUDGE_MODEL'] ?? '').trim() || 'openai/gpt-5-mini'
  const same = wanted.split('/')[0] === bitWriterModel().split('/')[0]
  return same ? (wanted.startsWith('openai/') ? 'google/gemini-3-flash-preview' : 'openai/gpt-5-mini') : wanted
}

/** Reasoning models take an effort level instead of a temperature. */
function reasoning(model: string): 'low' | undefined {
  return /^openai\/(gpt-5|o[1-9])/i.test(model) ? 'low' : undefined
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
  // Check every line before answering: a safety failure anywhere outranks
  // a craft failure on an earlier line, so the closest-miss fallback never
  // shows a bit whose later tag or button breaks a safety rule.
  let craft: string | null = null
  for (const line of [...b.tags, b.button]) {
    const f = hardRuleFailure(own(line), story, 'the_roast', { ignoreLength: true })
    if (!f || f === 'too short') continue
    if (isSafetyFailure(f)) return f
    craft ??= f
  }
  if (craft) return craft
  const technique = techniqueCraftFailure([...b.tags, b.button], story)
  if (technique) return technique
  const once = setupFailure(b, story)
  if (once) return once
  if (b.hook.split(/\s+/).length > 10) return 'hook over 10 words'
  if (bitWords(b) > maxWords(controls)) return 'over length'
  return null
}

/* bit-1.5 · say the situation once. The Oct 29 blind eval: the hook told the
   story, the setup told it again, and the costume (audit, inventory, merger)
   sat in the hook where the tag rule never looked. */
const SETUP_MAX_WORDS = 18
const ONCE_STOP = new Set(
  ('a an the and or but so to of in on at for with from by my me i i\'m im she he her him his they them their we our you your ' +
    'it its it\'s was were is are am be been had has have did do does just that this then there what when who said says ' +
    'told tell still now every all one up out about after before while like not no').split(' '),
)
const contentSet = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9' ]/g, ' ')
      .split(/\s+/)
      .map((w) => w.replace(/^'+|'+$/g, '').replace(/'s$/, ''))
      .filter((w) => w.length > 2 && !ONCE_STOP.has(w)),
  )

/** The setup retells what the hook said, runs long, or the hook/setup wear a
 *  costume on top of one already in the tags. Craft, not safety. */
export function setupFailure(b: Pick<BitDraft, 'hook' | 'setup' | 'tags' | 'button'>, story: string): string | null {
  if (b.setup.split(/\s+/).filter(Boolean).length > SETUP_MAX_WORDS) return 'setup retells the story (over 18 words)'
  const hook = contentSet(b.hook)
  const shared = [...contentSet(b.setup)].filter((w) => hook.has(w))
  if (shared.length >= 3) return `setup repeats the hook (${shared.slice(0, 4).join(', ')})`
  // A setup made of the story's own words is the story told again. The exact
  // words someone said are allowed: quoted text is left out of the count.
  const own = [...contentSet(b.setup.replace(/"[^"]*"|'[^']{6,}'/g, ' '))]
  const told = contentSet(story)
  const retold = own.filter((w) => told.has(w))
  if (retold.length >= 5 && retold.length >= own.length * 0.6) return `setup retells the story (${retold.slice(0, 4).join(', ')})`
  const worn = [b.hook, b.setup, ...b.tags, b.button].map((l) => costumeToken(l, story)).filter((t): t is string => !!t)
  if (worn.length >= 2) return `costume vocabulary: ${worn.join(', ')}`
  return null
}

/** Rules that protect people (advice, reassurance, therapy words, banned
 *  constructions) are never relaxed. The rest are craft: when no bit passes
 *  them all, the best craft-only miss is shown rather than nothing. */
export function isSafetyFailure(rule: string): boolean {
  return rule === 'advice' || rule === 'reassurance' || rule === 'clinical vocabulary' || rule.startsWith('banned construction')
}

/** The bit-1.3 technique rules (labels, costume, copied example). */
export function isTechniqueFailure(rule: string): boolean {
  return (
    rule.startsWith('labels, not acts') ||
    rule.startsWith('costume vocabulary') ||
    rule === 'copied a technique example' ||
    rule.startsWith('setup ')
  )
}

/* ── stage 2 · the bit pass ── */

export type BitPass = {
  bits: BitDraft[]
  /** each bit's position in the writer's output = the technique it was dealt */
  slots?: number[]
  altTags: string[]
  angles: string[]
  model: string
  error?: string
}

export async function runBitPass(
  story: string,
  premises: Premise[],
  controls: BitControls,
  opts: { model?: string; timeoutMs?: number; signal?: AbortSignal; dealt?: Dealt[]; prompt?: string; angleFinder?: string; house?: string } = {},
): Promise<BitPass> {
  const model = opts.model ?? bitWriterModel()
  const prompt = fill(opts.prompt ?? BIT_PROMPT, {
    SITUATION: story.slice(0, 2000),
    PREMISES: premises.length ? formatPremisesForBit(premises) : (opts.angleFinder ?? BIT_ANGLE_FINDER),
    TECHNIQUES: formatTechniques(opts.dealt ?? dealTechniques(4)),
    HOUSE: opts.house ?? '',
    ...controlVars(controls),
  })
  const res = await callAgent({
    model,
    temperature: 1.0,
    reasoningEffort: reasoning(model),
    maxTokens: 4000,
    timeoutMs: opts.timeoutMs ?? BIT_BUDGET.write(),
    signal: opts.signal,
    messages: [{ role: 'user', content: prompt }],
  })
  if (res.error) return { bits: [], altTags: [], angles: [], model: res.model, error: res.error }
  const parsed = tryParseJson<{ bits?: unknown; alt_tags?: unknown; angles?: unknown }>(res.text)
  const cleaned = (Array.isArray(parsed?.bits) ? parsed!.bits : []).map(cleanBit)
  const slots = cleaned.flatMap((b, i) => (b ? [i] : []))
  const bits = cleaned.filter((b): b is BitDraft => !!b)
  const altTags = (Array.isArray(parsed?.alt_tags) ? parsed!.alt_tags : [])
    .map(tidy)
    .filter((t) => t && !hardRuleFailure(t, story, 'the_roast', { ignoreLength: true }))
    .slice(0, 5)
  const angles = (Array.isArray(parsed?.angles) ? parsed!.angles : []).map(tidy).filter(Boolean).slice(0, 6)
  return { bits, slots, altTags, angles, model: res.model, ...(bits.length ? {} : { error: 'no bits parsed' }) }
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
  const model = bitJudgeModel()
  const identity = bits.map((_, i) => i)
  if (bits.length < 2) return { order: identity, why: null, model }
  const res = await callAgent({
    model,
    temperature: 0,
    reasoningEffort: reasoning(model),
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

/* ── the hedged writer ── */

export type WriterAttempt = { model: string; leg: 'primary' | 'backup' | 'last'; ms: number; bits: number; usable: boolean; error: string | null }

type Leg = { model: string; leg: WriterAttempt['leg']; timeoutMs: number }

/**
 * Runs the primary writer; if it has not produced a usable answer within
 * `hedgeMs`, or fails before then, starts the backup beside it. The first
 * leg whose answer `usable` accepts wins and the other is cancelled. When
 * both legs come back unusable quickly, one last attempt runs on the backup
 * model, provided there is still time inside `deadlineMs`.
 *
 * `run` is injected so the race can be tested without a gateway.
 */
export async function raceWriters<T>(opts: {
  primary: Leg
  backup: Leg
  hedgeMs: number
  deadlineMs: number
  /** Hold a usable backup answer and keep waiting for the primary until
   *  its cap; the backup is used only when the primary fails. */
  preferPrimary?: boolean
  run: (leg: Leg, signal: AbortSignal) => Promise<T & { bits: unknown[]; error?: string }>
  usable: (result: T & { bits: unknown[] }) => boolean
}): Promise<{ winner: (T & { bits: unknown[]; error?: string }) | null; last: (T & { bits: unknown[]; error?: string }) | null; attempts: WriterAttempt[] }> {
  const t0 = Date.now()
  const attempts: WriterAttempt[] = []
  type R = T & { bits: unknown[]; error?: string }
  let last: R | null = null

  const start = (leg: Leg) => {
    const ctl = new AbortController()
    const began = Date.now()
    const done = opts
      .run(leg, ctl.signal)
      .catch((e): R => ({ bits: [], error: e instanceof Error ? e.message : 'threw' }) as unknown as R)
      .then((r) => {
        const ok = !ctl.signal.aborted && opts.usable(r)
        const cancelled = ctl.signal.aborted
        attempts.push({ model: leg.model, leg: leg.leg, ms: Date.now() - began, bits: r.bits.length, usable: ok, error: cancelled ? 'cancelled (lost the race)' : r.error ?? null })
        if (!cancelled) last = r
        return { r, ok }
      })
    return { ctl, done }
  }

  const a = start(opts.primary)
  // The backup joins when the primary is slow OR fails early.
  let hedgeTimer: ReturnType<typeof setTimeout> | undefined
  const hedge = await Promise.race([
    a.done.then((x) => ({ kind: 'primary' as const, ...x })),
    new Promise<{ kind: 'hedge' }>((res) => {
      hedgeTimer = setTimeout(() => res({ kind: 'hedge' }), opts.hedgeMs)
    }),
  ])
  clearTimeout(hedgeTimer)
  if (hedge.kind === 'primary' && hedge.ok) return { winner: hedge.r, last, attempts }

  const b = start(opts.backup)
  const legs = hedge.kind === 'primary' ? [b] : [a, b]
  const winner = await new Promise<R | null>((resolve) => {
    let pending = legs.length
    let held: R | null = null
    for (const leg of legs) {
      void leg.done.then(({ r, ok }) => {
        if (ok) {
          // Preferring the primary: a usable backup waits for the primary's
          // own verdict; a usable primary wins outright.
          if (opts.preferPrimary && leg === b && hedge.kind !== 'primary' && pending > 1) {
            held = r
            if (--pending === 0) resolve(held)
            return
          }
          for (const other of legs) if (other !== leg) other.ctl.abort()
          resolve(r)
        } else if (--pending === 0) resolve(held)
      })
    }
  })
  if (winner) return { winner, last, attempts }

  // Both legs answered but nothing usable (bad JSON, every bit refused).
  // One more try on the backup, only if it fits inside the deadline.
  const left = opts.deadlineMs - (Date.now() - t0)
  if (left > 6_000) {
    const c = start({ ...opts.backup, leg: 'last', timeoutMs: Math.min(opts.backup.timeoutMs, left) })
    const { r, ok } = await c.done
    if (ok) return { winner: r, last, attempts }
  }
  return { winner: null, last, attempts }
}

/* ── the whole run ── */

/** Why a run returned nothing, for the failure log (no story text). */
export type BitFailure = { rejected: { hook: string; rule: string }[]; error: string | null; attempts?: WriterAttempt[] }

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
  /** the technique dealt to each bit, in writer order (bit-1.3) */
  techniques: string[]
  rejected: { hook: string; rule: string }[]
  attempts: WriterAttempt[]
}

/** Premises are passed in when they were started early (beside the Guard). */
/** A pipeline variant, for the eval bench: which prompt, models and
 *  stages. Production passes nothing and gets the current pipeline. */
export type BitVariant = {
  prompt?: string
  angleFinder?: string
  writer?: string
  backup?: string
  judge?: boolean
  preferPrimary?: boolean
  /** extra techniques the deal may draw from (the /funniest bank) */
  pool?: Technique[]
  /** no technique deal at all (bit-1.2 behaviour) */
  noTechniques?: boolean
}

export async function writeBitFromStory(
  story: string,
  controls: BitControls,
  premisesPromise?: Promise<Premise[]>,
  sink?: { failure?: BitFailure },
  variant: BitVariant = {},
): Promise<WrittenBit | null> {
  const t0 = Date.now()
  // Since bit-1.1 the writer finds its own angles (BIT_ANGLE_FINDER), which
  // saves the separate premise call. BIT_PREMISE_PASS=on brings it back.
  const premises = premisesPromise ? await premisesPromise : premisePassOn() ? await startPremises(story) : []
  const t1 = Date.now()

  const rejected: { hook: string; rule: string }[] = []
  // One deal per run: both writers in the race get the same techniques, so
  // the bit is the same operation whichever model answers first.
  const house = variant.noTechniques ? { examples: '', weights: {} } : await houseSignal()
  let dealt = variant.noTechniques ? [] : dealTechniques(4, Math.random, variant.pool ?? (await funniestBank()).line, house.weights)
  // "Use this move" from a funniest page: the pinned technique is every
  // candidate's primary, so the judge picks the best use of that move
  // rather than the best of four different moves.
  if (controls.move && dealt.length) {
    const fb = await funniestBank()
    const bank = [...TECHNIQUES, ...fb.line, ...fb.performance]
    const pinned = bank.find((t) => t.id === controls.move)
    if (pinned) dealt = dealt.map((d) => ({ ...d, primary: pinned }))
  }
  const primaryModel = variant.writer ?? bitWriterModel()
  const backupModel = variant.backup ?? backupWriterModel()
  const sortBits = (bits: BitDraft[]) => {
    const ok: BitDraft[] = []
    const craftOnly: BitDraft[] = []
    for (const b of bits) {
      const f = bitFailure(b, story, controls)
      if (!f) ok.push(b)
      else if (!isSafetyFailure(f)) craftOnly.push(b)
    }
    return { ok, craftOnly }
  }
  // A pass is usable when at least one bit is safe to show (a craft-only
  // miss still counts: it is shown rather than an error).
  const race = await raceWriters<BitPass>({
    primary: { model: primaryModel, leg: 'primary', timeoutMs: BIT_BUDGET.write() },
    backup: { model: backupModel === primaryModel ? DEFAULT_MODEL : backupModel, leg: 'backup', timeoutMs: BIT_BUDGET.backup() },
    hedgeMs: BIT_BUDGET.hedge(),
    deadlineMs: BIT_BUDGET.write() + 5_000,
    preferPrimary: variant.preferPrimary ?? preferPrimaryOn(),
    run: (leg, signal) => runBitPass(story, premises, controls, { model: leg.model, timeoutMs: leg.timeoutMs, signal, dealt, prompt: variant.prompt, angleFinder: variant.angleFinder, house: house.examples }),
    usable: (p) => {
      const s = sortBits(p.bits as BitDraft[])
      return s.ok.length + s.craftOnly.length > 0
    },
  })
  const t2 = Date.now()
  const pass = (race.winner ?? race.last ?? { bits: [], altTags: [], angles: [], model: primaryModel, error: 'no attempt' }) as BitPass
  for (const b of pass.bits) {
    const f = bitFailure(b, story, controls)
    if (f) rejected.push({ hook: b.hook, rule: f })
  }
  const sorted = race.winner ? sortBits(pass.bits) : { ok: [], craftOnly: [] }
  // Only craft misses (too long, a restatement, a soft landing): show the
  // shortest of them rather than an error. Safety misses are never shown.
  const passing = sorted.ok.length ? sorted.ok : [...sorted.craftOnly].sort((a, b) => bitWords(a) - bitWords(b))
  if (!passing.length) {
    const error = race.attempts.map((a) => `${a.leg}:${a.model}:${a.ms}ms:${a.error ?? (a.usable ? 'ok' : `${a.bits} bits, none usable`)}`).join(' | ') || pass.error || null
    console.warn('[bit] no usable bit', { rejected: rejected.map((r) => r.rule), attempts: race.attempts })
    if (sink) sink.failure = { rejected, error, attempts: race.attempts }
    return null
  }

  // The judge (a different model family) ranks what passed; BIT_JUDGE=off
  // falls back to the writer's own order.
  const verdict: BitVerdict = (variant.judge ?? judgeOn())
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
    techniques: dealt.map((d) => d.primary.id),
    rejected,
    attempts: race.attempts,
  }
}

const flag = (name: string) => (process.env[name] ?? '').trim().toLowerCase() === 'on'
function premisePassOn(): boolean {
  return flag('BIT_PREMISE_PASS')
}
/** On unless BIT_JUDGE=off (bit-1.4; it was opt-in from bit-1.1 to 1.3). */
function judgeOn(): boolean {
  return (process.env['BIT_JUDGE'] ?? '').trim().toLowerCase() !== 'off'
}
function preferPrimaryOn(): boolean {
  return (process.env['BIT_PREFER_PRIMARY'] ?? '').trim().toLowerCase() !== 'off'
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
  // A rewrite that only misses the bit-1.3 technique rules (a second label
  // line, costume vocabulary) is kept as a last resort: better a rewrite
  // than "try again". Safety rules are never relaxed.
  let craftMiss: BitDraft | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    const model = attempt === 0 ? bitWriterModel() : backupWriterModel()
    const res = await callAgent({
      model,
      temperature: 1.0,
      reasoningEffort: reasoning(model),
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
    if (isTechniqueFailure(f)) craftMiss ??= draft
    console.warn('[bit-vary] failed a rule', { kind, rule: f })
  }
  return craftMiss
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
      model: attempt === 0 ? writerModel() : backupWriterModel(),
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
      model: attempt === 0 ? writerModel() : backupWriterModel(),
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
    const caption = tidy(raw?.caption).slice(0, 120)
    const hashtags = (Array.isArray(raw?.hashtags) ? raw!.hashtags : [])
      .map((h) => '#' + tidy(h).replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, ''))
      .filter((h) => h.length > 2 && h.length < 40)
      .filter((h, i, a) => a.findIndex((x) => x.toLowerCase() === h.toLowerCase()) === i)
      .slice(0, 5)
    if (caption && !toneFailure(caption) && hashtags.length >= 3) return { caption, hashtags }
  }
  return null
}
