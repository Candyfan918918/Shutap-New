// The card artwork, authored as SVG.
//
// Isomorphic on purpose: the same function draws the public share image (the
// GET route) and the tier-aware export (the server fn). It is never a
// screenshot of the DOM — the SHUTAP mark is drawn here, on the server, so it
// cannot be styled away in a browser before the file is written.
//
// It is, however, the SAME composition as CardFace.tsx, measured in the same
// units: CardFace sizes everything in cqw against the card's width, and this
// document is laid out against a fixed 1080×1920 viewBox, so 1cqw = 10.8
// viewBox units. Any visual change to the card face has to be made in both.
//
// The requested pixel size is applied to the root element only, so 1080×1920
// and 2160×3840 are the same document at two scales.

export const VB_W = 1080
export const VB_H = 1920

/** 1cqw of CardFace, in viewBox units. */
const CQW = VB_W / 100

// The safe area CardFace uses (13cqw 8.5cqw), in viewBox units: TikTok and
// Reels lay their caption and chrome over a 9:16 card's edges.
const SAFE_X = 8.5 * CQW // 92
const SAFE_Y = 13 * CQW // 140

// The card's own palette — CARD_GROUND / CARD_INK / CARD_FAINT in ui.tsx.
const INK = '#f7e8f0'
const FAINT = '#9b8090'
/** The wordmark's "ap" is the brand pink on every card, whatever the slot. */
const BRAND_PINK = '#e7548a'

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

// The family names match the @font-face rules the client embeds into this
// document before rasterising (see embedCardFonts in jokeClient.ts). Georgia
// and Helvetica are the fallbacks that actually exist on a machine that has
// none of them — a bare "Newsreader, serif" renders as Times.
const VOICE = "Newsreader, Georgia, 'Iowan Old Style', 'Times New Roman', serif"
const DISPLAY = "Sora, 'Helvetica Neue', Helvetica, Arial, sans-serif"
const BODY = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif"

/** The accent trio are light-surface inks. On the card's ground a small
 *  uppercase label in the raw accent misses 4.5:1 — the clapback lands at
 *  3.2:1 — so lift it toward white before painting. The one copy of this
 *  rule; CardFace paints its label through the same function. */
export function lift(hex: string, amount: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1]!, 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(v + (255 - v) * amount),
  )
  return `rgb(${ch.join(',')})`
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const r1 = (n: number) => Math.round(n * 10) / 10

/** Greedy wrap. `perLine` is a character budget, not a measurement — the
 *  callers below derive it from the font size so long lines shrink instead
 *  of overflowing the card. */
function wrap(text: string, perLine: number, maxLines: number): string[] {
  const lines: string[] = []
  // A newline in the text is a hard break: the clapback's stage direction
  // sits on its own line above the quote.
  for (const para of text.split(/\r?\n/)) {
    const words = para.split(/\s+/).filter(Boolean)
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
  }
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  kept[maxLines - 1] = kept[maxLines - 1]!.replace(/[.,;:]?$/, '…')
  return kept
}

/** The joke's size, by length — CardFace's jokeSize, in viewBox units. Steps,
 *  not a formula, so two cards of similar length read at the same size, and
 *  so the export sits at the size the card was just read at on screen. */
function screenJokeSize(text: string): number {
  const n = text.length
  const cqw = n <= 110 ? 8 : n <= 170 ? 6.8 : n <= 240 ? 5.9 : n <= 320 ? 5.2 : 4.7
  return cqw * CQW
}

/** The character budget's width estimate for Newsreader italic, in em. */
const EM_PER_CHAR = 0.4

/** Start at the on-screen size and only step down if the lines still do not
 *  fit — the screen wraps by measurement and this wraps by a character
 *  budget, so a card of long words can need one more rung. Only the very last
 *  rung truncates. */
function fitJoke(text: string): { size: number; lines: string[] } {
  const ladder = [8, 6.8, 5.9, 5.2, 4.7, 4.2, 3.7].map((c) => c * CQW)
  const start = screenJokeSize(text)
  for (const size of ladder.filter((s) => s <= start + 0.01)) {
    // Newsreader italic runs .33–.39em to the character across a line of
    // prose; .40 is the budget, so a line of wide letters still fits.
    const perLine = Math.floor((VB_W - 2 * SAFE_X) / (size * EM_PER_CHAR))
    // The small rungs have the whole middle of the card to themselves — the
    // header and footer are pinned — so a long roast steps down and runs
    // longer instead of being cut at "…" with half the face empty.
    const maxLines = size >= 80 ? 4 : size >= 60 ? 6 : size >= 52 ? 8 : size >= 46 ? 11 : 13
    const lines = wrap(text, perLine, maxLines + 1)
    if (lines.length <= maxLines) return { size, lines }
  }
  const size = ladder[ladder.length - 1]!
  return { size, lines: wrap(text, Math.floor((VB_W - 2 * SAFE_X) / (size * EM_PER_CHAR)), 13) }
}

/** The eyes: the canonical brand mark from components/brand/EyeMark.tsx, at
 *  the lockup's size — pink capsules, dark pupils, the heart glints. Never a
 *  stand-in in the slot's colour: the eyes are the same pair on every card,
 *  as they are on screen. */
function eyeMark(x: number, y: number, width: number): string {
  const s = width / 140
  return (
    `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s.toFixed(4)})">` +
    `<rect x="16" y="6" width="56" height="84" rx="28" fill="url(#eye)"/>` +
    `<rect x="84" y="6" width="56" height="84" rx="28" fill="url(#eye)"/>` +
    `<ellipse cx="44" cy="62" rx="19" ry="24" fill="url(#pupil)"/>` +
    `<ellipse cx="112" cy="62" rx="19" ry="24" fill="url(#pupil)"/>` +
    `<path d="M44 22 C41 18 35 18 35 24 C35 30 44 36 44 36 C44 36 53 30 53 24 C53 18 47 18 44 22Z" fill="#ffffff" opacity=".95"/>` +
    `<path d="M112 22 C109 18 103 18 103 24 C103 30 112 36 112 36 C112 36 121 30 121 24 C121 18 115 18 112 22Z" fill="#ffffff" opacity=".95"/>` +
    `</g>`
  )
}

/** The diagonal wash a free card carries: three rows of the name at 13cqw,
 *  9cqw apart, centred and turned 22°, at CardFace's opacity. */
function watermark(): string {
  const size = 13 * CQW
  const gap = 9 * CQW
  const total = 3 * size + 2 * gap
  const top = (VB_H - total) / 2
  const text = 'shutap · shutap'
  return (
    `<g opacity="0.085" transform="rotate(-22 ${VB_W / 2} ${VB_H / 2})">` +
    [0, 1, 2]
      .map((i) => {
        const baseline = top + i * (size + gap) + size * 0.78
        return `<text x="${VB_W / 2}" y="${r1(baseline)}" text-anchor="middle" font-family="${DISPLAY}" font-weight="800" font-size="${r1(size)}" letter-spacing="${r1(-0.04 * size)}" fill="#ffffff">${text}</text>`
      })
      .join('') +
    `</g>`
  )
}

export function renderCardSvg(art: CardArt): string {
  const accent = /^#[0-9a-fA-F]{3,8}$/.test(art.accent) ? art.accent : BRAND_PINK
  const { size, lines } = fitJoke(art.text)
  const lead = size * 1.32

  // ── header: the lockup on the left, the slot label on the right ──
  // CardFace: eyes 6.4cqw wide, a 2.4cqw gap, the wordmark at 7cqw, the label
  // at 4.2cqw with .28em tracking; the row is as tall as the wordmark and
  // everything sits on its centre line.
  const eyesW = 6.4 * CQW
  const eyesH = eyesW * (96 / 140)
  const wordSize = 7 * CQW
  const rowH = wordSize
  const rowMid = SAFE_Y + rowH / 2
  const headerBottom = SAFE_Y + rowH
  const labelSize = 4.2 * CQW

  // ── footer: one quiet line, pinned to the bottom of the safe area ──
  const footerSize = 3.9 * CQW
  const footerBottom = VB_H - SAFE_Y
  const footerBaseline = footerBottom - footerSize * 0.24

  // ── the middle: situation + joke, centred as one block in what's left ──
  const zoneTop = headerBottom
  const zoneBottom = footerBottom - footerSize

  // 4.4cqw Inter at 1.45, capped at 26ch — about 29 characters of prose.
  const sitLines = art.situation ? wrap(art.situation.trim(), 29, 4) : []
  const sitSize = 4.4 * CQW
  const sitLead = sitSize * 1.45
  const sitH = sitLines.length ? (sitLines.length - 1) * sitLead + sitSize : 0
  const sitGap = sitLines.length ? 4 * CQW : 0
  const jokeH = (lines.length - 1) * lead + size
  const blockTop = zoneTop + Math.max(0, (zoneBottom - zoneTop - (sitH + sitGap + jokeH)) / 2)

  // y is a baseline: a line's caps start about .8em above it.
  const situation = sitLines
    .map(
      (l, i) =>
        `<text x="${SAFE_X}" y="${r1(blockTop + sitSize * 0.8 + i * sitLead)}" font-family="${BODY}" font-size="${r1(sitSize)}" fill="${FAINT}">${esc(l)}</text>`,
    )
    .join('')

  const jokeTop = blockTop + sitH + sitGap
  const joke = lines
    .map(
      (l, i) =>
        `<text x="${SAFE_X}" y="${r1(jokeTop + size * 0.8 + i * lead)}" font-family="${VOICE}" font-style="italic" font-size="${r1(size)}" letter-spacing="${r1(-0.01 * size)}" fill="${INK}">${esc(l)}</text>`,
    )
    .join('')

  // ── the ground ──
  // CardFace: radial-gradient(135% 78% at 50% 0%, …) — an ellipse 1.35 card
  // widths by .78 card heights, centred on the top edge. SVG gradients are
  // circles, so the circle is stretched to the ellipse.
  const bgRx = 1.35 * VB_W
  const bgRy = 0.78 * VB_H
  // The slot's glow. CardFace paints a box 150% wide and 44% tall, starting
  // 14% down, with a circle of the accent at 30% fading out toward the box's
  // corners — the box's edges cut the circle, which reads as nothing at deck
  // size and as a hard band at 1080. So the same centre and the same width,
  // as an ellipse squashed to the box, fading to nothing before any edge.
  const glowW = 1.5 * VB_W
  const glowH = 0.44 * VB_H
  const glowCx = VB_W / 2
  const glowCy = 0.14 * VB_H + glowH / 2
  const glowR = Math.hypot(glowW / 2, glowH / 2)
  const glowSquash = 0.62

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${art.width}" height="${art.height}" viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <radialGradient id="bg" gradientUnits="userSpaceOnUse" cx="${VB_W / 2}" cy="0" r="${r1(bgRx)}" gradientTransform="scale(1 ${(bgRy / bgRx).toFixed(4)})">
      <stop offset="0" stop-color="#3a1022"/><stop offset="0.6" stop-color="#1a0a12"/><stop offset="1" stop-color="#120710"/>
    </radialGradient>
    <radialGradient id="glow" gradientUnits="userSpaceOnUse" cx="${r1(glowCx)}" cy="${r1(glowCy / glowSquash)}" r="${r1(glowR)}" gradientTransform="scale(1 ${glowSquash})">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.30"/><stop offset="0.66" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grain" width="12" height="12" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.5" fill="#ffffff" fill-opacity="0.9"/>
    </pattern>
    <radialGradient id="eye" cx="38%" cy="22%" r="82%">
      <stop offset="0" stop-color="#ffffff"/><stop offset="0.18" stop-color="#ffd0e8"/><stop offset="0.48" stop-color="#f060a0"/><stop offset="0.78" stop-color="#c0206a"/><stop offset="1" stop-color="#880040"/>
    </radialGradient>
    <radialGradient id="pupil" cx="50%" cy="42%" r="72%">
      <stop offset="0" stop-color="#2a0d18"/><stop offset="1" stop-color="#060106"/>
    </radialGradient>
  </defs>

  <rect width="${VB_W}" height="${VB_H}" fill="url(#bg)"/>
  <rect width="${VB_W}" height="${VB_H}" fill="url(#glow)"/>
  <rect width="${VB_W}" height="${VB_H}" fill="url(#grain)" opacity="0.06"/>
  ${art.mark ? watermark() : ''}

  ${eyeMark(SAFE_X, rowMid - eyesH / 2, eyesW)}
  <text x="${r1(SAFE_X + eyesW + 2.4 * CQW)}" y="${r1(rowMid + wordSize * 0.29)}" font-family="${DISPLAY}" font-weight="800" font-size="${r1(wordSize)}" letter-spacing="${r1(-0.04 * wordSize)}" fill="${INK}">shut<tspan fill="${BRAND_PINK}">ap</tspan></text>
  <text x="${VB_W - SAFE_X}" y="${r1(rowMid + labelSize * 0.36)}" text-anchor="end" font-family="${DISPLAY}" font-weight="800" font-size="${r1(labelSize)}" letter-spacing="${r1(0.28 * labelSize)}" fill="${lift(accent, 0.34)}">${esc(art.label.toUpperCase())}</text>

  ${situation}
  ${joke}

  <text x="${SAFE_X}" y="${r1(footerBaseline)}" font-family="${DISPLAY}" font-weight="800" font-size="${r1(footerSize)}" letter-spacing="${r1(0.02 * footerSize)}" fill="${FAINT}">SHUTAP. Joke about it.</text>
</svg>`
}

/** `shutap-the-roast-1a2b3c4d.png` — readable in a camera roll. */
export function cardFilename(label: string, cardId: string, ext = 'png'): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'card'
  return `shutap-${slug}-${cardId.slice(0, 8)}.${ext}`
}
