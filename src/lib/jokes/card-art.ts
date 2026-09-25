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
// viewBox units. Any visual change to the card face has to be made in both —
// which is why the palette and the type ladders live here, and ui.tsx and
// CardFace read them from this file.
//
// The requested pixel size is applied to the root element only, so 1080×1920
// and 2160×3840 are the same document at two scales.
import { resolveFace, type CardLayout } from './deck'

export const VB_W = 1080
export const VB_H = 1920

/** 1cqw of CardFace, in viewBox units. */
const CQW = VB_W / 100

// The safe area CardFace uses (13cqw 8.5cqw), in viewBox units: TikTok and
// Reels lay their caption and chrome over a 9:16 card's edges.
const SAFE_X = 8.5 * CQW // 92
const SAFE_Y = 13 * CQW // 140
const INNER_W = VB_W - 2 * SAFE_X

/* ─────────────────────────── the card's palette ───────────────────────────
   Two faces and one back. The headline face and every back are off-white;
   the stack face is ink. Plum survives as one lit phrase and the back's
   pill — nowhere else. ui.tsx re-exports these for the screen. */

export const CARD_LIGHT = '#fdfbf9'
export const CARD_LIGHT_EDGE = '1px solid rgba(11,8,15,.08)'
export const CARD_BACK_EDGE = '1px solid rgba(11,8,15,.14)'
export const CARD_LIGHT_SHADOW = '0 12px 30px -24px rgba(80,10,45,.3)'
export const CARD_DARK = '#17131a'
export const CARD_DARK_EDGE = '.5px solid rgba(255,255,255,.16)'
export const CARD_DARK_SHADOW = '0 22px 50px -24px rgba(0,0,0,.7)'
export const LIGHT_INK = '#17131a'
export const LIGHT_INK_STRONG = '#0b080f'
export const LIGHT_MUTED = '#645b61'
export const LIGHT_EYEBROW = '#6f666c'
export const LIGHT_RULE = 'rgba(11,8,15,.08)'
/** The one plum phrase. */
export const LIT = '#8e1c4c'
export const DARK_TEXT = '#ffffff'
export const DARK_TEXT_2 = '#c4a0b2'
export const DARK_TEXT_3 = '#9b8090'
export const DARK_RULE = 'rgba(255,255,255,.16)'
export const WATERMARK_DARK = 'rgba(255,255,255,.085)'
export const WATERMARK_LIGHT = 'rgba(11,8,15,.05)'
/** The wordmark's "ap" is the brand pink on every card, whatever the face. */
export const BRAND_PINK = '#e7548a'

/** Stack punchline colour by line index; the third line on stays the last. */
export const STACK_RAMP = [DARK_TEXT, DARK_TEXT_2, DARK_TEXT_3] as const

/* ─────────────────────────── the type ladders ─────────────────────────── */

/** The headline joke's size in cqw, by length. Steps, not a formula, so two
 *  cards of similar length read at the same size — and never a truncation on
 *  screen: a fifty-word roast steps down until it sits on the face. */
export function headlineSize(text: string): number {
  const n = text.length
  if (n <= 70) return 11.5
  if (n <= 120) return 9.6
  if (n <= 180) return 8.2
  if (n <= 250) return 7
  if (n <= 330) return 6
  return 5.2
}

/** Sora 700 at the stack's -.06em runs about .6em to the character. */
const STACK_EM = 0.6

/** The stack's one-word-a-line size in cqw: 20cqw for up to three words,
 *  60cqw shared between more, and never wider than the safe area — a single
 *  long word steps down rather than running off the card. */
export function stackSize(words: string[]): number {
  const base = words.length > 3 ? 60 / words.length : 20
  const longest = Math.max(1, ...words.map((w) => w.length))
  const fit = (INNER_W / CQW) / (longest * STACK_EM)
  return Math.round(Math.min(base, fit) * 100) / 100
}

export function stackWords(punchline: string): string[] {
  return punchline.split(/\s+/).filter(Boolean)
}

/* ─────────────────────────── the document ─────────────────────────── */

export type CardArt = {
  /** the joke itself — what a headline face prints, and every card's caption */
  text: string
  /** "the take" · "the clapback" · "the roast" */
  label: string
  /** the slot's permanent subtitle, printed above a headline joke */
  subtitle?: string
  layout?: CardLayout
  lit?: string
  setup?: string
  punchline?: string
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

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const r1 = (n: number) => Math.round(n * 10) / 10

/** A word as runs of plain and lit text — the lit phrase can start or stop
 *  inside a word ("“the writing thing”" carries its quotes), and it can
 *  break across lines, so the wrap works on these rather than on strings. */
type Run = { text: string; lit: boolean }
type Word = Run[]

function toWords(text: string, lit: string): Word[] {
  const start = lit ? text.indexOf(lit) : -1
  const end = start + lit.length
  const out: Word[] = []
  for (const m of text.matchAll(/\S+/g)) {
    const a = m.index!
    const b = a + m[0].length
    const runs: Run[] = []
    const cut = (x: number, y: number, on: boolean) => {
      if (y > x) runs.push({ text: text.slice(x, y), lit: on })
    }
    if (start < 0 || b <= start || a >= end) {
      cut(a, b, false)
    } else {
      const s = Math.max(a, start)
      const e = Math.min(b, end)
      cut(a, s, false)
      cut(s, e, true)
      cut(e, b, false)
    }
    out.push(runs)
  }
  return out
}

const wordLen = (w: Word) => w.reduce((n, r) => n + r.text.length, 0)

/** Greedy wrap. `perLine` is a character budget, not a measurement — the
 *  callers derive it from the font size so long lines shrink instead of
 *  overflowing the card. */
function wrapWords(words: Word[], perLine: number): Word[][] {
  const lines: Word[][] = []
  let line: Word[] = []
  let len = 0
  for (const w of words) {
    const n = wordLen(w)
    if (line.length && len + 1 + n > perLine) {
      lines.push(line)
      line = [w]
      len = n
    } else {
      len = line.length ? len + 1 + n : n
      line.push(w)
    }
  }
  if (line.length) lines.push(line)
  return lines
}

function wrapPlain(text: string, perLine: number): string[] {
  return wrapWords(toWords(text, ''), perLine).map((l) => l.map((w) => w[0]!.text).join(' '))
}

/** One line as tspans, adjacent runs of the same colour merged. */
function lineTspans(line: Word[], ink: string): string {
  const runs: Run[] = []
  line.forEach((w, i) => {
    w.forEach((r, j) => {
      const text = (i > 0 && j === 0 ? ' ' : '') + r.text
      const last = runs[runs.length - 1]
      if (last && last.lit === r.lit) last.text += text
      else runs.push({ text, lit: r.lit })
    })
  })
  return runs
    .map((r) => (r.lit ? `<tspan fill="${LIT}">${esc(r.text)}</tspan>` : `<tspan fill="${ink}">${esc(r.text)}</tspan>`))
    .join('')
}

/** Sora 700 at -.045em runs .5–.56em to the character; .56 is the budget. */
const HEADLINE_EM = 0.56
const HEADLINE_LEAD = 1.04

/** Start at the on-screen size and step down only if the lines still do not
 *  fit the height — the screen wraps by measurement and this wraps by a
 *  character budget, so a card of long words can need one more rung. Only the
 *  very last rung truncates. */
function fitHeadline(text: string, lit: string, maxH: number): { size: number; lines: Word[][] } {
  const words = toWords(text, lit)
  const ladder = [11.5, 9.6, 8.2, 7, 6, 5.2, 4.6]
  const start = headlineSize(text)
  for (const cqw of ladder.filter((c) => c <= start)) {
    const size = cqw * CQW
    const lines = wrapWords(words, Math.floor(INNER_W / (size * HEADLINE_EM)))
    if ((lines.length - 1) * size * HEADLINE_LEAD + size <= maxH) return { size, lines }
  }
  const size = ladder[ladder.length - 1]! * CQW
  const all = wrapWords(words, Math.floor(INNER_W / (size * HEADLINE_EM)))
  const keep = Math.max(1, Math.floor((maxH - size) / (size * HEADLINE_LEAD)) + 1)
  if (all.length <= keep) return { size, lines: all }
  const lines = all.slice(0, keep)
  const tail = lines[keep - 1]!
  const lastWord = tail[tail.length - 1]!
  const lastRun = lastWord[lastWord.length - 1]!
  lastRun.text = lastRun.text.replace(/[.,;:]?$/, '…')
  return { size, lines }
}

/** The eyes: the canonical brand mark from components/brand/EyeMark.tsx.
 *  Only the stack face carries them. */
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
 *  9cqw apart, centred and turned 22°, in the surface's watermark ink. */
function watermark(dark: boolean): string {
  const size = 13 * CQW
  const gap = 9 * CQW
  const total = 3 * size + 2 * gap
  const top = (VB_H - total) / 2
  const text = 'shutap · shutap'
  const fill = dark ? '#ffffff' : LIGHT_INK_STRONG
  const opacity = dark ? 0.085 : 0.05
  return (
    `<g opacity="${opacity}" transform="rotate(-22 ${VB_W / 2} ${VB_H / 2})">` +
    [0, 1, 2]
      .map((i) => {
        const baseline = top + i * (size + gap) + size * 0.78
        return `<text x="${VB_W / 2}" y="${r1(baseline)}" text-anchor="middle" font-family="${DISPLAY}" font-weight="800" font-size="${r1(size)}" letter-spacing="${r1(-0.04 * size)}" fill="${fill}">${text}</text>`
      })
      .join('') +
    `</g>`
  )
}

export function renderCardSvg(art: CardArt): string {
  const face = resolveFace(art)
  const dark = face.layout === 'stack'

  // ── header: wordmark left (eyes too, on the stack), slot label right ──
  const wordSize = 6 * CQW
  const rowMid = SAFE_Y + wordSize / 2
  const eyesW = 9 * CQW
  const eyesH = eyesW * (96 / 140)
  const wordX = dark ? SAFE_X + eyesW + 2.4 * CQW : SAFE_X
  const labelSize = (dark ? 3.6 : 3.4) * CQW
  const header =
    (dark ? eyeMark(SAFE_X, rowMid - eyesH / 2, eyesW) : '') +
    `<text x="${r1(wordX)}" y="${r1(rowMid + wordSize * 0.36)}" font-family="${DISPLAY}" font-weight="700" font-size="${r1(wordSize)}" letter-spacing="${r1(-0.04 * wordSize)}" fill="${dark ? DARK_TEXT : LIGHT_INK}">shut<tspan fill="${BRAND_PINK}">ap</tspan></text>` +
    `<text x="${VB_W - SAFE_X}" y="${r1(rowMid + labelSize * 0.36)}" text-anchor="end" font-family="${DISPLAY}" font-weight="${dark ? 800 : 600}" font-size="${r1(labelSize)}" letter-spacing="${r1((dark ? 0.28 : 0.2) * labelSize)}" fill="${dark ? DARK_TEXT_2 : LIGHT_EYEBROW}">${esc(art.label.toUpperCase())}</text>`

  // ── foot: a rule, the slogan left, shutap.com right, on the safe-area bottom ──
  const sloganSize = 3.8 * CQW
  const urlSize = 4.4 * CQW
  const footBaseline = VB_H - SAFE_Y - urlSize * 0.24
  const ruleY = VB_H - SAFE_Y - urlSize - 4 * CQW
  const foot =
    `<rect x="${SAFE_X}" y="${r1(ruleY)}" width="${INNER_W}" height="${dark ? 1.5 : 2}" fill="${dark ? DARK_RULE : LIGHT_RULE}"/>` +
    `<text x="${SAFE_X}" y="${r1(footBaseline)}" font-family="${DISPLAY}" font-weight="700" font-size="${r1(sloganSize)}" letter-spacing="${r1(-0.02 * sloganSize)}" fill="${dark ? DARK_TEXT : LIGHT_INK}">SHUTAP. Joke about it.</text>` +
    `<text x="${VB_W - SAFE_X}" y="${r1(footBaseline)}" text-anchor="end" font-family="${VOICE}" font-style="italic" font-size="${r1(urlSize)}" fill="${dark ? DARK_TEXT_3 : LIGHT_MUTED}">shutap.com</text>`

  // ── the middle: centred as one block between header and rule ──
  const zoneTop = SAFE_Y + wordSize + 4 * CQW
  const zoneBottom = ruleY - 4 * CQW
  const zoneH = zoneBottom - zoneTop

  let middle = ''
  if (face.layout === 'headline') {
    const subSize = 5 * CQW
    const subLines = art.subtitle ? wrapPlain(art.subtitle, Math.floor(INNER_W / (subSize * 0.42))) : []
    const subH = subLines.length ? subLines.length * subSize * 1.2 : 0
    const subGap = subLines.length ? 5 * CQW : 0
    const { size, lines } = fitHeadline(face.text, face.lit, zoneH - subH - subGap)
    const lead = size * HEADLINE_LEAD
    const jokeH = (lines.length - 1) * lead + size
    const top = zoneTop + Math.max(0, (zoneH - (subH + subGap + jokeH)) / 2)
    middle =
      subLines
        .map((l, i) => `<text x="${SAFE_X}" y="${r1(top + subSize * 0.9 + i * subSize * 1.2)}" font-family="${VOICE}" font-style="italic" font-size="${r1(subSize)}" fill="${LIGHT_MUTED}">${esc(l)}</text>`)
        .join('') +
      lines
        .map((l, i) => `<text x="${SAFE_X}" y="${r1(top + subH + subGap + size * 0.78 + i * lead)}" font-family="${DISPLAY}" font-weight="700" font-size="${r1(size)}" letter-spacing="${r1(-0.045 * size)}">${lineTspans(l, LIGHT_INK_STRONG)}</text>`)
        .join('')
  } else {
    const setupSize = 5.6 * CQW
    const setupLead = setupSize * 1.3
    const setupLines = face.setup ? wrapPlain(face.setup, Math.floor(INNER_W / (setupSize * 0.42))) : []
    const setupH = setupLines.length ? (setupLines.length - 1) * setupLead + setupSize : 0
    const setupGap = setupLines.length ? 5 * CQW : 0
    const words = stackWords(face.punchline)
    const size = stackSize(words) * CQW
    const lead = size * 0.92
    const stackH = (words.length - 1) * lead + size
    const top = zoneTop + Math.max(0, (zoneH - (setupH + setupGap + stackH)) / 2)
    middle =
      setupLines
        .map((l, i) => `<text x="${SAFE_X}" y="${r1(top + setupSize * 0.8 + i * setupLead)}" font-family="${VOICE}" font-style="italic" font-size="${r1(setupSize)}" fill="${DARK_TEXT_2}">${esc(l)}</text>`)
        .join('') +
      words
        .map((w, i) => `<text x="${SAFE_X}" y="${r1(top + setupH + setupGap + size * 0.76 + i * lead)}" font-family="${DISPLAY}" font-weight="700" font-size="${r1(size)}" letter-spacing="${r1(-0.06 * size)}" fill="${STACK_RAMP[Math.min(i, STACK_RAMP.length - 1)]}">${esc(w)}</text>`)
        .join('')
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${art.width}" height="${art.height}" viewBox="0 0 ${VB_W} ${VB_H}" preserveAspectRatio="xMidYMid slice">
  <defs>
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

  <rect width="${VB_W}" height="${VB_H}" fill="${dark ? CARD_DARK : CARD_LIGHT}"/>
  ${dark ? `<rect width="${VB_W}" height="${VB_H}" fill="url(#grain)" opacity="0.06"/>` : ''}
  ${art.mark ? watermark(dark) : ''}

  ${header}
  ${middle}
  ${foot}
</svg>`
}

/** `shutap-the-roast-1a2b3c4d.png` — readable in a camera roll. */
export function cardFilename(label: string, cardId: string, ext = 'png'): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'card'
  return `shutap-${slug}-${cardId.slice(0, 8)}.${ext}`
}
