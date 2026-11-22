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

/** How long each of the three shots may run, by the video length the owner
 *  picked. 15 and 30 seconds share the length equally. 7 seconds is 2, 3, 2
 *  (Candy, Nov 21 2026): the middle shot, where the joke gets worse, gets
 *  the extra second. A shot is never under two seconds. */
export function shotLengths(length: number): [number, number, number] {
  if (length === 7) return [2, 3, 2]
  const each = Math.max(2, Math.round((length / 3) * 10) / 10)
  return [each, each, each]
}
/** How long shot `index` (0..2) may run. */
export function shotSeconds(length: number, index = 0): number {
  return shotLengths(length)[Math.min(2, Math.max(0, index))]!
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

/** The end card wears the business's own colour (Candy, Nov 21 2026: "design
 *  with logo color"). From the logo's pixels (RGBA bytes), the colour that
 *  covers the most of it once see-through, near-white and grey pixels are set
 *  aside; a logo with no colour gives its darkest tone, and one that is all
 *  white or empty gives null (the card stays Shutap rose). */
export function logoColor(rgba: ArrayLike<number>): [number, number, number] | null {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>()
  let dark = { n: 0, r: 0, g: 0, b: 0 }
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const r = rgba[i]!, g = rgba[i + 1]!, b = rgba[i + 2]!, a = rgba[i + 3]!
    if (a < 128) continue
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    if (min > 232) continue
    if (max - min < 28) { if (max < 110) { dark = { n: dark.n + 1, r: dark.r + r, g: dark.g + g, b: dark.b + b } } continue }
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5)
    const k = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
    // a vivid pixel counts a little more than a muddy one of the same area
    const w = 1 + (max - min) / 255
    k.n += w; k.r += r * w; k.g += g * w; k.b += b * w
    buckets.set(key, k)
  }
  let best: { n: number; r: number; g: number; b: number } | null = null
  for (const k of buckets.values()) if (!best || k.n > best.n) best = k
  const pick = best && best.n >= 4 ? best : dark.n >= 4 ? dark : null
  return pick ? [Math.round(pick.r / pick.n), Math.round(pick.g / pick.n), Math.round(pick.b / pick.n)] : null
}

/** The end card's colours from the logo's colour: a top and bottom for the
 *  background, and ink that reads on it (white on a dark card, near-black on
 *  a light one). */
export function endCardColors(c: [number, number, number] | null): { top: string; bottom: string; ink: string; soft: string } {
  if (!c) return { top: '#c2185b', bottom: '#8e1043', ink: '#ffffff', soft: 'rgba(255, 255, 255, 0.88)' }
  const lum = (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255
  const mix = (t: number, to: number) => `rgb(${c.map((v) => Math.round(v + (to - v) * t)).join(', ')})`
  const light = lum > 0.62
  return light
    ? { top: mix(0.12, 255), bottom: mix(0.1, 0), ink: '#1d1a22', soft: 'rgba(29, 26, 34, 0.78)' }
    : { top: mix(0.08, 255), bottom: mix(0.38, 0), ink: '#ffffff', soft: 'rgba(255, 255, 255, 0.88)' }
}
