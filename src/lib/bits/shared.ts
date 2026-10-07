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

export type BitTier = 'guest' | 'free' | 'paying'

export type BitUsage = { used: number; cap: number; resets_at: string }

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
