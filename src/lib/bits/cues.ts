/* Delivery cues for the stand-up teleprompter (Nov 11 2026).
 *
 * The cues are the sketch page's parentheticals: nothing new is written. Each
 * parenthetical that comes before a line ME says is pinned to the bit line
 * that dialogue matches (word overlap, in order), so the teleprompter shows
 * "(beat)" or "(his voice)" where the sketch put it. The bit's words never
 * change; a line the sketch can't be matched to just gets no cue.
 *
 * Two kinds:
 *   voice: "(his voice)", "(as HER)", "(impression)" on a line with a quote,
 *          drawn inline right before the first quote
 *   line:  everything else, drawn on its own small line above the bit line
 * A cue that asks for a pause ("beat", "pause", "hold", "let it land",
 * "laugh") makes the teleprompter hold for PAUSE_MS when it reaches it. */
import type { SketchElement } from './shared'

export type Cue = { text: string; voice: boolean; hold: boolean }

/** How long the teleprompter holds at a pause cue. */
export const PAUSE_MS = 1200

const PAUSE = /\b(beat|pause|hold|wait|let it (land|sit|breathe)|laugh)/i
const VOICE = /\b(voice|impression|imitat|mimic|as (him|her|them|my)\b)/i
const QUOTE = /["“]/

function words(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1)
}

/** Share of the bit line's words that appear in the dialogue. */
function covered(line: string, dialogue: Set<string>): number {
  const w = words(line)
  if (!w.length) return 0
  return w.filter((x) => dialogue.has(x)).length / w.length
}

export function cueText(raw: string): string {
  const t = raw.trim().replace(/^\(+|\)+$/g, '').trim()
  return t ? `(${t.toLowerCase()})` : ''
}

export function isPauseCue(text: string): boolean {
  return PAUSE.test(text)
}

/** Share of the dialogue's words that appear in the bit line: a short line
 *  ("Shh.") said inside a longer bit line ("I said shh. She announced…"). */
function inside(line: string, dialogue: string[]): number {
  if (!dialogue.length) return 0
  const l = new Set(words(line))
  return dialogue.filter((x) => l.has(x)).length / dialogue.length
}

/** One list of cues per bit line, same order as `lines`.
 *
 *  Nov 12 2026: a short ME line inside a longer bit line now gets its cue
 *  (the /bits demo's "(hushed)" on "Shh." never showed). Another speaker's
 *  delivery note reaches the line that quotes them, when the performer has
 *  no voice cue of their own there: the person acts that part out on stage
 *  ("(loudly)" before the daughter's words). Still nothing new is written:
 *  every cue is a parenthetical from the sketch page. */
export function cuesForLines(lines: string[], sketch: SketchElement[] | null | undefined): Cue[][] {
  const out: Cue[][] = lines.map(() => [])
  if (!sketch?.length || !lines.length) return out
  let speaker = ''
  let pending: string[] = []
  let cursor = 0
  const quoted: { at: number; texts: string[] }[] = []
  for (const e of sketch) {
    if (e.type === 'character') {
      speaker = e.text.trim().toUpperCase()
      pending = []
      continue
    }
    if (e.type === 'parenthetical') {
      const t = cueText(e.text)
      if (t) pending.push(t)
      continue
    }
    if (e.type !== 'dialogue') continue
    const dw = words(e.text)
    if (!/^ME\b/.test(speaker) || cursor >= lines.length) {
      if (pending.length && speaker) {
        // the bit line that quotes this speaker (the one just said or the next two)
        for (let i = Math.max(0, cursor - 1); i < Math.min(lines.length, cursor + 3); i++) {
          if (dw.length && inside(lines[i]!, dw) >= 0.8) {
            quoted.push({ at: i, texts: pending })
            break
          }
        }
      }
      pending = []
      continue
    }
    const said = new Set(dw)
    // the first line from the cursor this dialogue says (within two lines)
    let at = -1
    for (let i = cursor; i < Math.min(lines.length, cursor + 3); i++) {
      if (covered(lines[i]!, said) >= 0.5 || (dw.length && inside(lines[i]!, dw) >= 0.8)) {
        at = i
        break
      }
    }
    if (at < 0) {
      pending = []
      continue
    }
    for (const text of pending) {
      const voice = VOICE.test(text) && QUOTE.test(lines[at]!)
      out[at]!.push({ text, voice, hold: !voice && isPauseCue(text) })
    }
    pending = []
    // one dialogue block can hold several bit lines: move past all of them
    let end = at
    while (end + 1 < lines.length && covered(lines[end + 1]!, said) >= 0.6) end++
    cursor = end + 1
  }
  for (const q of quoted) {
    const line = out[q.at]!
    if (line.some((c) => c.voice)) continue
    for (const text of q.texts) if (!line.some((c) => c.text === text)) line.push({ text, voice: false, hold: isPauseCue(text) })
  }
  return out
}
