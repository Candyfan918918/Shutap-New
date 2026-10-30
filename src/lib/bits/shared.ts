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
  /** a technique id pinned from a funniest page ("Use this move"): every
   *  candidate is written with it as its primary move */
  move?: string
}

export const DEFAULT_CONTROLS: BitControls = { audience: 'social', voice: 'deadpan', length: '30s', heat: 3 }

/** A link can open the writer with its controls preset, e.g.
 *  `/?voice=roast&length=60s&heat=4#joke` from a tool page. Only the controls:
 *  the story box always opens empty. Unknown or invalid values are ignored. */
export const PRESET_KEYS = ['audience', 'voice', 'length', 'heat'] as const

export function presetFromSearch(search: string): Partial<BitControls> {
  const p = new URLSearchParams(search)
  const out: Partial<BitControls> = {}
  const a = p.get('audience')
  if (a && (AUDIENCES as readonly string[]).includes(a)) out.audience = a as Audience
  const v = p.get('voice')
  if (v && (VOICES as readonly string[]).includes(v)) out.voice = v as BitVoice
  const l = p.get('length')
  if (l && (LENGTHS as readonly string[]).includes(l)) out.length = l as BitLength
  const h = Number(p.get('heat'))
  if (Number.isInteger(h) && h >= 1 && h <= 5) out.heat = h as BitControls['heat']
  return out
}

/** Search params for a preset link (heat stays a number so the router
 *  writes `heat=4`, not a quoted string). */
export function presetSearch(preset: Partial<BitControls>): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  for (const k of PRESET_KEYS) if (preset[k] !== undefined) out[k] = preset[k] as string | number
  return out
}

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
