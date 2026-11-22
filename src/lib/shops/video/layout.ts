// Shutap for small business: where the words go on the finished video, and
// how long each one stays. Pure (no canvas, no DOM) so it is tested here and
// drawn by compose.ts.
//
// The video is the owner's three clips back to back, then a two-second end
// card. The hook sits over the start of the first clip; each clip then
// carries its own line; the end card carries the code word line, or the
// business's name when the owner chose no code word.
export const VIDEO_W = 720
export const VIDEO_H = 1280
export const VIDEO_FPS = 30
export const END_CARD_SECONDS = 2
/** the hook stays this long, or half the first clip if that is shorter */
export const HOOK_SECONDS = 2.2

/** How long one shot may run, by the video length the owner picked: the
 *  three shots share the length, and a shot is never under two seconds. */
export function shotSeconds(length: number): number {
  return Math.max(2, Math.round((length / 3) * 10) / 10)
}

/** The line on screen `t` seconds into clip `clip` (0..2). */
export function lineAt(clip: number, t: number, clipSeconds: number, texts: { hook: string; shots: string[] }): string {
  if (clip === 0 && t < Math.min(HOOK_SECONDS, clipSeconds / 2)) return texts.hook
  return texts.shots[clip] ?? ''
}

/** Break a line into rows that fit `maxWidth`, measuring with `measure`.
 *  A single word wider than the row stays whole on its own row. */
export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const rows: string[] = []
  let row = ''
  for (const w of words) {
    const next = row ? `${row} ${w}` : w
    if (row && measure(next) > maxWidth) { rows.push(row); row = w } else row = next
  }
  if (row) rows.push(row)
  return rows
}

/** The largest font size (from `sizes`, big to small) at which the text fits
 *  in `maxRows` rows; the smallest size if none does. */
export function fitText(text: string, maxWidth: number, maxRows: number, sizes: number[], measureAt: (size: number) => (s: string) => number): { size: number; rows: string[] } {
  for (const size of sizes) {
    const rows = wrapLines(text, maxWidth, measureAt(size))
    if (rows.length <= maxRows) return { size, rows }
  }
  const size = sizes[sizes.length - 1] ?? 32
  return { size, rows: wrapLines(text, maxWidth, measureAt(size)) }
}

/** Draw a w×h source to cover a W×H frame, centered: the source rectangle to copy. */
export function coverCrop(w: number, h: number, W = VIDEO_W, H = VIDEO_H): { sx: number; sy: number; sw: number; sh: number } {
  if (!w || !h) return { sx: 0, sy: 0, sw: w, sh: h }
  const frame = W / H
  const src = w / h
  if (src > frame) { const sw = h * frame; return { sx: (w - sw) / 2, sy: 0, sw, sh: h } }
  const sh = w / frame
  return { sx: 0, sy: (h - sh) / 2, sw: w, sh }
}
