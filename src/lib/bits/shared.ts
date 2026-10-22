// Shapes and constants for bits, safe to import from the browser.

export const AUDIENCES = ['social', 'live', 'office', 'work', 'family', 'school'] as const
export const VOICES = ['deadpan', 'storyteller', 'roast', 'dry'] as const
export const LENGTHS = ['15s', '30s', '60s', '2m'] as const
export const VARY_KINDS = ['hotter', 'tighter', 'escalate'] as const

export type Audience = (typeof AUDIENCES)[number]
export type BitVoice = (typeof VOICES)[number]
export type BitLength = (typeof LENGTHS)[number]
export type VaryKind = (typeof VARY_KINDS)[number]
export type VersionKind = 'original' | VaryKind | 'mix' | 'tag_swap'

export type BitControls = {
  audience: Audience
  voice: BitVoice
  length: BitLength
  heat: 1 | 2 | 3 | 4 | 5
}

export const DEFAULT_CONTROLS: BitControls = { audience: 'social', voice: 'deadpan', length: '30s', heat: 3 }

/** Talking pace the teleprompter and the seconds estimate share. */
export const WORDS_PER_SECOND = 2.6

/** The four parts of a bit, as written. */
export type BitDraft = {
  hook: string
  setup: string
  tags: string[]
  button: string
  why: string
}

export type BitVersion = BitDraft & {
  id: string
  kind: VersionKind
  est_seconds: number
  heat: number
  created_at: string
}

export type Bit = {
  id: string
  story: string
  controls: BitControls
  alt_tags: string[]
  versions: BitVersion[]
  created_at: string
}

/** Who is writing, for limits and the watermark. Decided on the server only. */
export type BitTier = 'guest' | 'free' | 'basic' | 'pro'

/** New bits written today. `cap` is null for Pro, whose fair-use cap is never
 *  shown. `resets_at` is the next midnight in Los Angeles. */
export type BitUsage = { used: number; cap: number | null; resets_at: string }

/** Paid tiers download without the watermark. */
export function isPaidTier(tier: BitTier): boolean {
  return tier === 'basic' || tier === 'pro'
}

/** True when this tier has no new bits left today. Pro (no cap shown) never
 *  blocks here; the server enforces its fair-use cap. A count from before
 *  the last Pacific midnight is stale: a tab left open overnight must not
 *  stay blocked (the server checks again either way). */
export function atCap(u: BitUsage | null | undefined, now = Date.now()): boolean {
  if (!u || u.cap === null || u.used < u.cap) return false
  const resets = Date.parse(u.resets_at)
  return !(Number.isFinite(resets) && now >= resets)
}

export function wordCount(text: string): number {
  const t = text.trim()
  return t ? t.split(/\s+/).length : 0
}

export function bitWords(b: Pick<BitDraft, 'hook' | 'setup' | 'tags' | 'button'>): number {
  return wordCount([b.hook, b.setup, ...b.tags, b.button].join(' '))
}

export function estSeconds(b: Pick<BitDraft, 'hook' | 'setup' | 'tags' | 'button'>): number {
  return Math.max(1, Math.round(bitWords(b) / WORDS_PER_SECOND))
}

/* ── phase 5: the bit laid out for filming ── */
export type SceneBeat = { shot: string; speaker: string; line: string; on_screen: string }
export type ScreenplayElement = {
  type: 'scene_heading' | 'action' | 'character' | 'parenthetical' | 'dialogue' | 'transition'
  text: string
}
export const SCREENPLAY_TYPES: ScreenplayElement['type'][] = ['scene_heading', 'action', 'character', 'parenthetical', 'dialogue', 'transition']
