// Shutap Toasts (Nov 6 2026): the speech as text, for "copy" and the PDFs.
// Names are put back in the browser; the free toast ends with the mark.
import { OCCASION, clock, fromPlaceholders, lineSeconds, type Names, type Occasion, type ToastLine } from './shared'

export const MARK = '— shutap.com'

/** One line with its delivery marks, as said. */
export function spoken(l: ToastLine, names: Partial<Names>): string {
  let t = fromPlaceholders(l.text, names)
  if (l.pause) t += ' ‖'
  if (l.laugh) t += ' (wait for the laugh)'
  if (l.glass) t += ' ↑ glasses up'
  return t
}

/** The whole speech for "copy all": one line per row, marks kept. */
export function speechText(lines: ToastLine[], names: Partial<Names>, opts: { marked?: boolean } = {}): string {
  const body = lines.map((l) => spoken(l, names)).join('\n')
  return opts.marked ? `${body}\n\n${MARK}` : body
}

/** A plain text block (the text after, the 60-second version) with the mark if free. */
export function withMark(text: string, marked: boolean): string {
  return marked ? `${text}\n\n${MARK}` : text
}

/** Start time of each line, from the clock. */
export function lineTimes(lines: ToastLine[]): number[] {
  let t = 0
  return lines.map((l) => { const at = t; t += lineSeconds(l); return at })
}

export function toastTitle(o: Occasion, names: Partial<Names>): string {
  const spec = OCCASION[o]
  const who = fromPlaceholders('{friend}', names)
  return spec.partner ? `For ${who} & ${fromPlaceholders('{partner}', names)}` : `For ${who}`
}

export { clock }
