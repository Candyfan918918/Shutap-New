// A bit as a picture: 1080×1920 SVG, rendered on the server so the tier —
// and with it the watermark — is decided where the client cannot touch it.
// The browser only rasterises it (svgToPng, which inlines the faces used
// here: Sora 600/700/800 and Newsreader italic).
//
//   'bit'   the whole bit: hook, setup, tags, button. A guest's picture
//           carries the hook and setup only, and points at the rest.
//   'hook'  the hook alone, big, for a cover or the first frame.
//
// Guest and free pictures carry the heavy mark: SHUTAP.COM tiled corner to
// corner at an angle under the words, and a solid rose band across the
// bottom. Shutap+ pictures are clean.

export const ART_W = 1080
export const ART_H = 1920

const X = 92
const INNER = ART_W - 2 * X
const DISPLAY = "Sora, 'Helvetica Neue', Helvetica, Arial, sans-serif"
const VOICE = "Newsreader, Georgia, 'Times New Roman', serif"
const WINE = '#8e1c4c'
const ROSE = '#b8456b'
const PINK = '#e7548a'
const INK = '#1a1418'
const INK2 = '#3a3236'
const MUTED = '#6e6468'
const BG = '#fbf6f7'

const r1 = (n: number) => Math.round(n * 10) / 10

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Greedy wrap by an average glyph width (em fraction) for the face. */
function wrap(text: string, size: number, em: number, width = INNER): string[] {
  const per = Math.max(8, Math.floor(width / (size * em)))
  const out: string[] = []
  let line = ''
  for (const word of text.replace(/\s+/g, ' ').trim().split(' ')) {
    if (!line) line = word
    else if (line.length + 1 + word.length <= per) line += ' ' + word
    else {
      out.push(line)
      line = word
    }
  }
  if (line) out.push(line)
  return out
}

type Block = { text: string; size: number; em: number; family: string; weight: number; italic?: boolean; fill: string; lead: number; gapAfter: number; label?: string }

function measure(blocks: Block[], k: number): number {
  return blocks.reduce((h, b) => {
    const size = b.size * k
    const lines = wrap(b.text, size, b.em).length
    return h + (b.label ? 34 + 14 : 0) + lines * size * b.lead + b.gapAfter * k
  }, 0)
}

function draw(blocks: Block[], k: number, top: number): string {
  let y = top
  let out = ''
  for (const b of blocks) {
    const size = b.size * k
    if (b.label) {
      y += 26
      out += `<text x="${X}" y="${r1(y)}" font-family="${DISPLAY}" font-weight="700" font-size="26" letter-spacing="4" fill="${b.label === 'BUTTON' || b.label === 'HOOK' ? ROSE : '#7d7277'}">${b.label}</text>`
      y += 22
    }
    for (const line of wrap(b.text, size, b.em)) {
      y += size * b.lead
      out += `<text x="${X}" y="${r1(y - size * (b.lead - 1) * 0.5 - size * 0.18)}" font-family="${b.family}" font-weight="${b.weight}"${b.italic ? ' font-style="italic"' : ''} font-size="${r1(size)}" letter-spacing="${r1(b.family === DISPLAY ? -0.025 * size : 0)}" fill="${b.fill}">${esc(line)}</text>`
    }
    y += b.gapAfter * k
  }
  return out
}

function heavyMark(): string {
  const size = 86
  const text = 'SHUTAP.COM · SHUTAP.COM · SHUTAP.COM'
  return (
    `<g opacity="0.13" transform="rotate(-22 ${ART_W / 2} ${ART_H / 2})">` +
    Array.from({ length: 14 })
      .map((_, i) => `<text x="${ART_W / 2}" y="${r1(-ART_H * 0.25 + i * 225)}" text-anchor="middle" font-family="${DISPLAY}" font-weight="800" font-size="${size}" letter-spacing="-2" fill="${ROSE}">${text}</text>`)
      .join('') +
    `</g>`
  )
}

function band(): string {
  const h = 97
  const y = ART_H - h
  return (
    `<rect x="0" y="${y}" width="${ART_W}" height="${h}" fill="${ROSE}"/>` +
    `<text x="${ART_W / 2}" y="${r1(y + h / 2 + 13)}" text-anchor="middle" font-family="${DISPLAY}" font-weight="800" font-size="36" letter-spacing="2.2" fill="#ffffff">MADE WITH SHUTAP.COM · WRITE YOURS FREE</text>`
  )
}

function header(label: string): string {
  return (
    `<text x="${X}" y="186" font-family="${DISPLAY}" font-weight="700" font-size="64" letter-spacing="-2.6" fill="${INK}">shut<tspan fill="${PINK}">ap</tspan></text>` +
    `<text x="${ART_W - X}" y="180" text-anchor="end" font-family="${DISPLAY}" font-weight="700" font-size="30" letter-spacing="6" fill="#7d7277">${esc(label)}</text>`
  )
}

function footer(watermarked: boolean): string {
  const y = watermarked ? ART_H - 150 : ART_H - 120
  return (
    `<line x1="${X}" y1="${y - 52}" x2="${ART_W - X}" y2="${y - 52}" stroke="rgba(90,30,50,.14)" stroke-width="2"/>` +
    `<text x="${X}" y="${y}" font-family="${DISPLAY}" font-weight="800" font-size="34" letter-spacing="-1" fill="${INK}">SHUTAP. <tspan font-weight="600" fill="${MUTED}">Say it funnier.</tspan></text>` +
    `<text x="${ART_W - X}" y="${y}" text-anchor="end" font-family="${DISPLAY}" font-weight="700" font-size="34" fill="${ROSE}">shutap.com</text>`
  )
}

export type BitArt = {
  hook: string
  setup: string
  tags: string[]
  button: string
  format: 'bit' | 'hook'
  /** guest: tags and button are not theirs to export */
  locked: boolean
  watermark: boolean
}

export function renderBitSvg(a: BitArt): string {
  const top = 290
  const bottom = a.watermark ? ART_H - 250 : ART_H - 220
  const room = bottom - top
  let body = ''

  if (a.format === 'hook') {
    const blocks: Block[] = [{ text: a.hook, size: 150, em: 0.56, family: DISPLAY, weight: 800, fill: WINE, lead: 1.08, gapAfter: 0 }]
    let k = 1
    while (k > 0.4 && measure(blocks, k) > room * 0.8) k -= 0.04
    const h = measure(blocks, k)
    body = draw(blocks, k, top + (room - h) / 2)
  } else {
    const blocks: Block[] = [
      { label: 'HOOK', text: a.hook, size: 84, em: 0.56, family: DISPLAY, weight: 800, fill: WINE, lead: 1.1, gapAfter: 40 },
      { label: 'SETUP', text: a.setup, size: 46, em: 0.5, family: DISPLAY, weight: 600, fill: INK2, lead: 1.32, gapAfter: 40 },
    ]
    if (a.locked) {
      blocks.push({ text: 'The tags and the button are at shutap.com', size: 50, em: 0.45, family: VOICE, weight: 400, italic: true, fill: ROSE, lead: 1.3, gapAfter: 0 })
    } else {
      a.tags.forEach((t, i) => blocks.push({ label: `TAG ${i + 1}`, text: t, size: 56, em: 0.42, family: VOICE, weight: 400, italic: true, fill: INK, lead: 1.28, gapAfter: 34 }))
      blocks.push({ label: 'BUTTON', text: a.button, size: 62, em: 0.42, family: VOICE, weight: 400, italic: true, fill: WINE, lead: 1.26, gapAfter: 0 })
    }
    let k = 1
    while (k > 0.45 && measure(blocks, k) > room) k -= 0.03
    body = draw(blocks, k, top)
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ART_W}" height="${ART_H}" viewBox="0 0 ${ART_W} ${ART_H}">` +
    `<rect width="${ART_W}" height="${ART_H}" fill="${BG}"/>` +
    (a.watermark ? heavyMark() : '') +
    header(a.format === 'hook' ? 'A BIT' : 'THE BIT') +
    body +
    footer(a.watermark) +
    (a.watermark ? band() : '') +
    `</svg>`
  )
}

export function artFilename(hook: string, format: 'bit' | 'hook'): string {
  const slug = hook.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
  return `${slug || 'bit'}${format === 'hook' ? '-hook' : ''}.png`
}
