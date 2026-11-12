// Nov 12 2026 (Candy): the /bits box is one big box. The person tells it
// their way; Shutap cuts what they typed into hook, setup, tag 1, tag 2 and
// button. It only cuts and places their words: it adds none. Every line that
// comes back must be found, word for word, in what they typed (checked here,
// in code, whatever a model returned). A line their story doesn't cover
// stays empty and they write it. Pure, so it can be tested without a server.

export type SplitLines = { hook: string; setup: string; tags: [string, string]; button: string }
export const EMPTY_SPLIT: SplitLines = { hook: '', setup: '', tags: ['', ''], button: '' }

/** whitespace collapsed, curly quotes straightened: how "found in the story" is compared */
export function norm(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Sentences as typed, punctuation kept. */
export function sentences(text: string): string[] {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return []
  return (t.match(/[^.!?]+(?:[.!?]+["”’')\]]*|$)/g) ?? []).map((s) => s.trim()).filter(Boolean)
}

/** True when `line` is a run of the story's own words (case kept, spacing and
 *  quote style ignored, a missing final period allowed). */
export function foundIn(line: string, story: string): boolean {
  const l = norm(line)
  if (!l) return true
  const s = norm(story)
  if (s.includes(l)) return true
  const bare = l.replace(/[.!?,;:]+$/, '')
  return bare.length > 0 && s.includes(bare)
}

/** The cut without a model: sentences in order. Five or more: the first
 *  three are hook, setup and tag 1, the last is the button, everything in
 *  between is tag 2. Fewer: hook first, button last, the middle in order, and
 *  the lines the story didn't reach stay empty. */
export function splitBySentence(text: string): SplitLines {
  const ss = sentences(text)
  if (!ss.length) return { ...EMPTY_SPLIT, tags: ['', ''] }
  if (ss.length === 1) return { hook: ss[0]!, setup: '', tags: ['', ''], button: '' }
  if (ss.length >= 5) {
    return { hook: ss[0]!, setup: ss[1]!, tags: [ss[2]!, ss.slice(3, -1).join(' ')], button: ss[ss.length - 1]! }
  }
  const mid = ss.slice(1, -1)
  return { hook: ss[0]!, setup: mid[0] ?? '', tags: [mid[1] ?? '', mid[2] ?? ''], button: ss[ss.length - 1]! }
}

/** A model's cut, checked: any line not found word for word in the story is
 *  thrown out. If the model's cut keeps fewer of the story's words than the
 *  plain sentence cut, or repeats a line, the sentence cut is used instead. */
export function checkedSplit(proposed: Partial<{ hook: unknown; setup: unknown; tag1: unknown; tag2: unknown; button: unknown }> | null, story: string): { lines: SplitLines; source: 'model' | 'sentences' } {
  const fallback = { lines: splitBySentence(story), source: 'sentences' as const }
  if (!proposed) return fallback
  const pick = (v: unknown) => (typeof v === 'string' && foundIn(v, story) ? norm(v) : '')
  const lines: SplitLines = { hook: pick(proposed.hook), setup: pick(proposed.setup), tags: [pick(proposed.tag1), pick(proposed.tag2)], button: pick(proposed.button) }
  const all = [lines.hook, lines.setup, ...lines.tags, lines.button].filter(Boolean)
  if (new Set(all).size !== all.length) return fallback
  const words = (s: string) => norm(s).split(' ').filter(Boolean).length
  const kept = all.reduce((n, l) => n + words(l), 0)
  const plain = [fallback.lines.hook, fallback.lines.setup, ...fallback.lines.tags, fallback.lines.button].reduce((n, l) => n + words(l), 0)
  if (!lines.hook || kept < plain * 0.6) return fallback
  return { lines, source: 'model' }
}

/** What the four checks under the box look for. Hints only: nothing is
 *  blocked by them. */
export type StoryCheck = { id: 'who' | 'said' | 'after' | 'ending'; label: string; ok: boolean }
export function storyChecks(text: string): StoryCheck[] {
  const low = text.toLowerCase()
  const n = sentences(text).length
  return [
    { id: 'who', label: 'who’s in it', ok: /\b(i|my|me|mom|dad|mum|boss|kid|kids|daughter|son|wife|husband|partner|friend|roommate|coworker|she|he|they|lady|guy|man|woman|neighbor|teacher|doctor|waiter|uber|driver)\b/.test(low) },
    { id: 'said', label: 'what someone said', ok: /(\bsaid\b|\bsays\b|\bgoes\b|\basked\b|\btold\b|\byelled\b|\bwent\b|["“”:])/.test(low) },
    { id: 'after', label: 'what happened after', ok: n >= 3 },
    { id: 'ending', label: 'how it ended', ok: n >= 4 },
  ]
}
