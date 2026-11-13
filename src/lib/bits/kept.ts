// Nov 8 2026 (Candy): on Bits the person writes all five lines. When every
// line is theirs, the bit is those lines, word for word: no writer, no
// judge, no candidates. AI writes on a bit only when "funnier" is tapped on
// one line (touchLine). Pure, so it can be tested without the server.
import type { BitDraft } from './shared'
import type { WrittenBit } from './pipeline.server'

export type GivenLines = Partial<Pick<BitDraft, 'hook' | 'setup' | 'tags' | 'button'>>
export type AllLines = { hook: string; setup: string; tags: string[]; button: string }

/** Nov 13 2026: hook, setup, one tag and button make a whole bit; the second
 *  tag is optional (a four-sentence story left it empty and the make button
 *  refused, so ad visitors never saw a bit). */
export function allLinesGiven(g: GivenLines | undefined): g is AllLines {
  return !!g && [g.hook, g.setup, g.button].every((x) => !!x?.trim()) && (g.tags ?? []).some((t) => !!t?.trim())
}

export function keptAsWritten(g: AllLines, promptVersion: string): WrittenBit {
  return {
    ranked: [{ hook: g.hook.trim(), setup: g.setup.trim(), tags: g.tags.map((t) => (t ?? '').trim()).filter(Boolean), button: g.button.trim(), why: 'kept as written by you' }],
    crowdWork: [],
    premises: [],
    judgeWhy: null,
    writerModel: 'kept-as-written',
    judgeModel: 'none',
    promptVersion,
    timings: { premises_ms: 0, write_ms: 0, judge_ms: 0 },
    techniques: [],
    rejected: [],
    attempts: [],
  }
}
