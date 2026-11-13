// Nov 8 2026 (Candy): when every line is the person's, the bit is those
// lines, word for word: no writer, no judge, no candidates. Nov 13: every
// line is optional; the AI copilot drafts the empty ones (anyLineGiven). Pure, so it can be tested without the server.
import type { BitDraft } from './shared'
import type { WrittenBit } from './pipeline.server'

export type GivenLines = Partial<Pick<BitDraft, 'hook' | 'setup' | 'tags' | 'button'>>
export type AllLines = { hook: string; setup: string; tags: string[]; button: string }

export function allLinesGiven(g: GivenLines | undefined): g is AllLines {
  return !!g && [g.hook, g.setup, g.tags?.[0], g.tags?.[1], g.button].every((x) => !!x?.trim())
}

/** Nov 13 2026 (Candy): every line is optional. One written line is enough
 *  to make the bit; a line left empty is drafted by the writer around the
 *  written ones, which stay word for word (applyGiven). */
export function anyLineGiven(g: GivenLines | undefined): boolean {
  return !!g && [g.hook, g.setup, ...(g.tags ?? []), g.button].some((x) => !!x?.trim())
}

export function keptAsWritten(g: AllLines, promptVersion: string): WrittenBit {
  return {
    ranked: [{ hook: g.hook.trim(), setup: g.setup.trim(), tags: [g.tags[0]!.trim(), g.tags[1]!.trim()], button: g.button.trim(), why: 'kept as written by you' }],
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
