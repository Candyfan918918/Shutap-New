// The card artwork, authored as SVG.
//
// Isomorphic on purpose: the same function draws the public share image (the
// GET route) and the tier-aware export (the server fn). It is never a
// screenshot of the DOM — the SHUTAP mark is drawn here, on the server, so it
// cannot be styled away in a browser before the file is written.
//
// Everything is laid out against a fixed 1080×1920 viewBox and the requested
// pixel size is applied to the root element only, so 1080×1920 and 2160×3840
// are the same document at two scales.

export const VB_W = 1080
export const VB_H = 1920

export type CardArt = {
  /** the joke itself — the line that carries the card */
  text: string
  /** "the take" · "the clapback" · "the roast" */
  label: string
  /** slot accent, hex */
  accent: string
  /** the de-identified situation, printed small above the joke */
  situation?: string
  width: number
  height: number
  /** free exports carry the mark; paid exports do not */
  mark: boolean
}

// Georgia and Helvetica are the fallbacks that actually exist on the machine
// doing the rasterising — a bare "Newsreader, serif" renders as Times.
const VOICE = "Newsreader, Georgia, 'Iowan Old Style', 'Times New Roman', serif"
const DISPLAY = "Sora, 'Helvetica Neue', Helvetica, Arial, sans-serif"

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Greedy wrap. `perLine` is a character budget, not a measurement — the
 *  callers below derive it from the font size so long lines shrink instead
 *  of overflowing the card. */
function wrap(text: string, perLine: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    if (line && (line + ' ' + w).length > perLine) {
      lines.push(line)
      line = w
    } else {
      line = line ? line + ' ' + w : w
    }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  kept[maxLines - 1] = kept[maxLines - 1]!.replace(/[.,;:]?$/, '…')
  return kept
}

/** Pick the largest joke size that still fits. A one-line take sits at the
 *  top of the ladder; a three-beat, fifty-word roast walks down it until its
 *  lines fit, and only the very last rung truncates. */
function fitJoke(text: string): { size: number; lines: string[] } {
  for (const size of [96, 86, 76, 68, 60, 52, 46, 40]) {
    // Newsreader italic runs about .46em to the character.
    const perLine = Math.floor((VB_W - 2 * 70) / (size * 0.46))
    const maxLines = size >= 86 ? 4 : size >= 60 ? 5 : size >= 46 ? 7 : 8
    const lines = wrap(text, perLine, maxLines + 1)
    if (lines.length <= maxLines) return { size, lines }
  }
  const size = 40
  return { size, lines: wrap(text, Math.floor((VB_W - 140) / (size * 0.46)), 8) }
}

/** The eyes, drawn rather than imported — two rounded bars and two pupils. */
function eyes(x: number, y: number, h: number, accent: string): string {
  const w = h * 0.48
  const gap = h * 0.12
  const r = w / 2
  const pupilRx = w * 0.35
  const pupilRy = h * 0.21
  const cy = y + h * 0.54
  return (
    `<g>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${accent}"/>` +
    `<rect x="${x + w + gap}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${accent}"/>` +
    `<ellipse cx="${x + w / 2}" cy="${cy}" rx="${pupilRx}" ry="${pupilRy}" fill="#120710"/>` +
    `<ellipse cx="${x + w + gap + w / 2}" cy="${cy}" rx="${pupilRx}" ry="${pupilRy}" fill="#120710"/>` +
    `</g>`
  )
}

function watermark(): string {
  const rows = [640, 990, 1340]
  const text = 'shutap · shutap · shutap'
  return (
    `<g opacity="0.07" transform="rotate(-22 540 960)">` +
    rows
      .map(
        (y) =>
          `<text x="540" y="${y}" text-anchor="middle" font-family="${DISPLAY}" font-weight="800" font-size="150" letter-spacing="-6" fill="#ffffff">${text}</text>`,
      )
      .join('') +
    `</g>`
  )
}

export function renderCardSvg(art: CardArt): string {
  const accent = /^#[0-9a-fA-F]{3,8}$/.test(art.accent) ? art.accent : '#e7548a'
  const { size, lines } = fitJoke(art.text)
  const lead = size * 1.32

  // Laid out from the bottom up: footer, then the joke, then the situation.
  const footerY = VB_H - 108
  const jokeBottom = footerY - 190
  const jokeTop = jokeBottom - (lines.length - 1) * lead
  const joke = lines
    .map(
      (l, i) =>
        `<text x="70" y="${jokeTop + i * lead}" font-family="${VOICE}" font-style="italic" font-size="${size}" letter-spacing="-1" fill="#f7e8f0">${esc(l)}</text>`,
    )
    .join('')

  const sitLines = art.situation ? wrap(art.situation.trim(), 42, 3) : []
  const sitLead = 68
  const sitBottom = jokeTop - size - 44
  const situation = sitLines
    .map(
      (l, i) =>
        `<text x="70" y="${sitBottom - (sitLines.length - 1 - i) * sitLead}" font-family="Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="47" fill="#9b8090">${esc(l)}</text>`,
    )
    .join('')

  const markPill = art.mark
    ? `<g>` +
      `<rect x="${VB_W - 70 - 330}" y="${footerY - 44}" width="330" height="62" rx="31" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1.5"/>` +
      `<text x="${VB_W - 70 - 165}" y="${footerY - 2}" text-anchor="middle" font-family="Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif" font-weight="700" font-size="34" letter-spacing="2" fill="rgba(247,232,240,.55)">made on shutap</text>` +
      `</g>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${art.width}" height="${art.height}" viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <radialGradient id="bg" cx="50%" cy="0%" r="110%">
      <stop offset="0" stop-color="#3a1022"/><stop offset="0.6" stop-color="#1a0a12"/><stop offset="1" stop-color="#120710"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.30"/><stop offset="0.66" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grain" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.5" fill="#ffffff" fill-opacity="0.06"/>
    </pattern>
  </defs>

  <rect width="${VB_W}" height="${VB_H}" fill="url(#bg)"/>
  <ellipse cx="540" cy="${VB_H * 0.32}" rx="${VB_W * 0.78}" ry="${VB_H * 0.24}" fill="url(#glow)"/>
  <rect width="${VB_W}" height="${VB_H}" fill="url(#grain)"/>
  ${art.mark ? watermark() : ''}

  ${eyes(70, 96, 92, accent)}
  <text x="188" y="182" font-family="${DISPLAY}" font-weight="800" font-size="76" letter-spacing="-3" fill="#f7e8f0">shut<tspan fill="${accent}">ap</tspan></text>
  <text x="${VB_W - 70}" y="${172}" text-anchor="end" font-family="${DISPLAY}" font-weight="800" font-size="45" letter-spacing="12" fill="${accent}">${esc(art.label.toUpperCase())}</text>

  ${situation}
  ${joke}

  <text x="70" y="${footerY}" font-family="${VOICE}" font-style="italic" font-size="47" fill="#9b8090">said it on shutap.com</text>
  ${markPill}
</svg>`
}

/** `shutap-the-roast-1a2b3c4d.png` — readable in a camera roll. */
export function cardFilename(label: string, cardId: string, ext = 'png'): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'card'
  return `shutap-${slug}-${cardId.slice(0, 8)}.${ext}`
}
