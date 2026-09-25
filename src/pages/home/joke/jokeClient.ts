// Browser-side plumbing for the joke-card surface. Holds no authority: the
// tier, the card text and the export size all come from the server. What
// happens here is only rasterising, packaging and handing the file over.
import { phCapture } from '@/lib/posthog'
import type { JokeTier } from '@/lib/jokes/deck'
// The card's faces, as files: the same woff2 the page itself loads. An SVG
// drawn into a canvas is a closed document — it cannot reach the page's fonts
// or fetch its own — so these are inlined into it before it is drawn.
import soraSemiWoff2 from '@fontsource/sora/files/sora-latin-600-normal.woff2?url'
import soraBoldWoff2 from '@fontsource/sora/files/sora-latin-700-normal.woff2?url'
import soraBlackWoff2 from '@fontsource/sora/files/sora-latin-800-normal.woff2?url'
import newsreaderItalicWoff2 from '@fontsource/newsreader/files/newsreader-latin-400-italic.woff2?url'

const ANON_KEY = 'shutap_anon_id'

function uuid(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* fall through */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function anonSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    const cur = localStorage.getItem(ANON_KEY)
    if (cur) return cur
    const next = uuid()
    localStorage.setItem(ANON_KEY, next)
    return next
  } catch {
    return uuid()
  }
}

export function clearAnonSessionId(): void {
  try { localStorage.removeItem(ANON_KEY) } catch { /* noop */ }
}

/** Every joke event carries the tier. Situation text never rides along. */
export function jokeTrack(name: string, tier: JokeTier, props: Record<string, unknown> = {}): void {
  void phCapture(name, { ...props, tier })
}

/** The public link for a card. Kept for link previews; a share hands over the
 *  picture itself, never this URL. */
export function cardImageUrl(cardId: string): string {
  return `/api/public/joke-card?id=${encodeURIComponent(cardId)}`
}

/** Where a shared card points back to. Always the public site — never a
 *  preview host — tagged so arrivals from a card can be counted. */
export function shareLink(): string {
  return 'https://shutap.com/?utm_source=share&utm_medium=joke_card'
}

/** One line of the situation, for a caption — enough to set the scene, short
 *  enough that the card and the link still fit an X post. */
export function sceneLine(situation: string, max = 90): string {
  const t = situation.trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t
  return t.slice(0, max - 1).trimEnd() + '…'
}

/** The caption a card travels with — the whole scene, the way a spill or a
 *  scan travels: what happened, then the card, then the way back. */
export function shareCaption(
  card: { text: string; angleLabel?: string },
  situation = '',
  link = shareLink(),
): string {
  const scene = sceneLine(situation)
  const label = card.angleLabel ? `${card.angleLabel}: ` : ''
  return (scene ? `the situation: “${scene}”\n` : '') + `${label}“${card.text.trim()}”\njoke about it → ${link}`
}

/** What a card posts as a room: the situation, then the card under it — the
 *  same whole scene a spill or a scan opens with. No link; it lives here.
 *  Composed the same way on the server, so an untouched caption is stored as
 *  is and only an edited one goes back through the scrubber. */
export function roomCaption(card: { text: string; angleLabel?: string }, situation = ''): string {
  const scene = situation.trim()
  const label = card.angleLabel ? `${card.angleLabel}: ` : ''
  return (scene ? `${scene}\n\n` : '') + `🃏 ${label}“${card.text.trim()}”`
}

// ───────────────────────── rasterising ─────────────────────────

const CARD_FONTS: { family: string; weight: number; style: string; url: string }[] = [
  // 600 the headline's slot label, 700 the joke, wordmark and foot, 800 the
  // stack's label and the watermark.
  { family: 'Sora', weight: 600, style: 'normal', url: soraSemiWoff2 },
  { family: 'Sora', weight: 700, style: 'normal', url: soraBoldWoff2 },
  { family: 'Sora', weight: 800, style: 'normal', url: soraBlackWoff2 },
  { family: 'Newsreader', weight: 400, style: 'italic', url: newsreaderItalicWoff2 },
]

let cardFontCss: Promise<string> | null = null

async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`font ${res.status}`)
  const blob = await res.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('font read failed'))
    reader.readAsDataURL(blob)
  })
}

/** The @font-face rules for the card's faces, each font inlined as a data
 *  URL. Fetched once per page; about 160 KB of base64 for the four. */
export function cardFontsCss(): Promise<string> {
  if (!cardFontCss) {
    cardFontCss = Promise.all(
      CARD_FONTS.map(async (f) => {
        const data = await toDataUrl(f.url)
        return `@font-face{font-family:'${f.family}';font-weight:${f.weight};font-style:${f.style};src:url(${data}) format('woff2')}`
      }),
    )
      .then((rules) => rules.join(''))
      .catch((e) => {
        cardFontCss = null // try again next time rather than remembering the failure
        throw e
      })
  }
  return cardFontCss
}

/** The server's SVG with the card's fonts written into it, so the picture is
 *  set in Sora and Newsreader like the card on screen — not in
 *  whatever serif and sans the saving machine happens to have. If the fonts
 *  cannot be fetched the document is returned as is: a card in the fallback
 *  faces beats no card. */
export async function embedCardFonts(svg: string): Promise<string> {
  let css: string
  try {
    css = await cardFontsCss()
  } catch {
    return svg
  }
  const style = `<style>${css}</style>`
  const at = svg.indexOf('<defs>')
  return at >= 0
    ? svg.slice(0, at + '<defs>'.length) + style + svg.slice(at + '<defs>'.length)
    : svg.replace(/<svg\b[^>]*>/, (m) => m + style)
}

/** Draw a server-authored SVG document into a PNG blob at its own size. */
export async function svgToPng(svg: string, width: number, height: number): Promise<Blob> {
  const doc = await embedCardFonts(svg)
  const blobUrl = URL.createObjectURL(new Blob([doc], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('decode failed'))
      img.src = blobUrl
    })
    // Safari can fire onload before the embedded fonts are usable and then
    // draw the fallbacks; decode() waits for the whole document.
    try { await img.decode() } catch { /* already decoded, or not supported */ }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    ctx.drawImage(img, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/png')
    })
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoking immediately can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// ───────────────────── handing the picture over ─────────────────────
//
// More than one card is more than one PNG — never an archive. A phone gets the
// files through the OS sheet (where "save image" and every app live); anything
// else gets ordinary downloads.

export type NamedBlob = { name: string; blob: Blob }

export function pngFile({ name, blob }: NamedBlob): File {
  return new File([blob], name, { type: 'image/png' })
}

/** True when this browser can hand actual files to the OS share sheet. */
export function canShareFiles(files: File[]): boolean {
  if (typeof navigator === 'undefined' || !navigator.canShare || !navigator.share) return false
  try {
    return navigator.canShare({ files })
  } catch {
    return false
  }
}

/** A finger, not a mouse — the case where an anchor download misses Photos. */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return (navigator.maxTouchPoints ?? 0) > 0 || 'ontouchstart' in window
}

/** The one platform where an anchor download of a blob never reaches Photos.
 *  Android Chrome downloads perfectly well, so it is NOT included here. */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/.test(ua)) return true
  // iPadOS reports itself as a Mac; the touch points give it away.
  return navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1
}

/** The user closing the OS sheet is not a failure. */
export function isShareAbort(e: unknown): boolean {
  return e instanceof Error && (e.name === 'AbortError' || /abort|cancel/i.test(e.message))
}

/** Saves each file as its own download, with a gap so browsers keep all of
 *  them instead of swallowing every click after the first. */
export async function saveEach(files: NamedBlob[]): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 300))
    saveBlob(files[i]!.blob, files[i]!.name)
  }
}

/** Last resort on a phone with no file sharing: the picture itself, in a tab,
 *  where a long press reaches the camera roll. */
export function openBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// ────────────── the deck a guest left behind at the sign-in gate ──────────────
//
// Signing in is a full-page round trip through /welcome, so the cards they had
// turned over and the thing they were reaching for are written down first and
// picked back up on return.

const PENDING_KEY = 'shutap_joke_pending'
const PENDING_TTL = 24 * 60 * 60 * 1000

export type PendingHeld = {
  set_id: string
  position: number
  angle: string
  text: string
  used_fallback?: boolean
  judge_score?: number | null
}

export type JokePending = {
  set: { id: string; situation: string; archetype: string }
  /** every card of the open set — the deck is RESTORED from this on return,
   *  never re-dealt: the slots are already claimed and the set already paid. */
  cards: PendingHeld[]
  /** the subset they had turned over, which the claim writes to their name */
  held: PendingHeld[]
  revealed: string[]
  action: { type: string; position?: number }
  /** Where /welcome sends them once they have a name: the landing page for
   *  the alias gate, the paywall for the mirror reading. Kept in the note —
   *  which is localStorage — because sessionStorage is per tab, and a magic
   *  link opened from email arrives in a fresh one with no memory of this. */
  returnTo?: string
  at: number
}

export function writeJokePending(p: Omit<JokePending, 'at'>): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ ...p, at: Date.now() }))
  } catch { /* noop */ }
}

export function readJokePending(): JokePending | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as JokePending
    if (!p?.set?.id || !Array.isArray(p.held)) return null
    // A note from an older build carries no full deck; it cannot be restored,
    // so it is treated as expired rather than half-honoured.
    if (!Array.isArray(p.cards) || p.cards.length === 0) {
      clearJokePending()
      return null
    }
    if (!Number.isFinite(p.at) || Date.now() - p.at > PENDING_TTL) {
      clearJokePending()
      return null
    }
    return p
  } catch {
    return null
  }
}

export function clearJokePending(): void {
  try { localStorage.removeItem(PENDING_KEY) } catch { /* noop */ }
}
