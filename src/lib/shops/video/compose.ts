// Shutap for small business: making the finished video on the owner's own
// phone (Nov 21 2026). Browser only. The three clips never leave the device.
//
// How: the clips play one after another into a canvas with the words drawn
// over them, and the canvas (plus the clips' own sound) is recorded as it
// plays. So making a 15-second video takes about 15 seconds, and the owner
// watches it happen. This is the route that keeps sound on every phone,
// including iPhones that cannot yet encode audio any other way in a browser.
//
// When the phone cannot do it (no canvas recording), `canCompose()` says so
// before anything starts and the screen offers the three clips instead.
import { END_CARD_SECONDS, VIDEO_FPS, VIDEO_H, VIDEO_W, coverCrop, fitText, lineAt } from './layout'
import { textStyle, type TextStyle, type TextStyleKey } from './styles'

export type VideoTexts = {
  hook: string
  /** the line on each of the three clips */
  shots: string[]
  /** the end card: the business's name, big */
  name: string
  /** under the name: its street address, or its city when there is none */
  place: string
  /** the code word line, or '' when the owner chose no code word */
  code: string
  /** the business's logo as a data: image, or null */
  logo: string | null
  /** which of the five looks the words wear */
  style: TextStyleKey
  /** Free plan: the "— shutap.com" mark, bottom of every frame */
  marked: boolean
}

/** What happened while the video was made: sent with the event so a video
 *  that came out wrong on a real phone can be understood afterwards. */
export type ComposeNotes = { tries: number; want: number; made: number | null; chunks: number; bytes: number; clips: number[]; stalls: number; errors: string[] }
export type ComposeResult = { blob: Blob; ext: 'mp4' | 'webm'; seconds: number; audio: boolean; notes: ComposeNotes }

/** How long a made video really is, by opening it. Null when the browser
 *  will not say (some report no length for a file they just recorded). */
export async function videoSeconds(blob: Blob): Promise<number | null> {
  const v = document.createElement('video')
  const url = URL.createObjectURL(blob)
  try {
    v.preload = 'metadata'; v.muted = true; v.playsInline = true
    v.src = url
    await once(v, 'loadedmetadata', 5000)
    if (!Number.isFinite(v.duration)) {
      // a just-recorded file: seeking far ahead makes the browser work it out
      v.currentTime = 1e7
      await once(v, 'durationchange', 3000).catch(() => {})
    }
    return Number.isFinite(v.duration) && v.duration > 0 ? v.duration : null
  } catch { return null } finally { v.removeAttribute('src'); try { v.load() } catch { /* noop */ } URL.revokeObjectURL(url) }
}

/** A made video this much shorter than its clips is cut off, not rounded. */
export const SHORT_BY_SECONDS = 1.2

const MP4 = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4']
const WEBM = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']

/** The recording format this browser can write: mp4 when it can (iPhone,
 *  newer Android), else webm. Null when it cannot record at all. */
export function pickMime(): { mime: string; ext: 'mp4' | 'webm' } | null {
  const MR = (globalThis as any).MediaRecorder as typeof MediaRecorder | undefined
  if (!MR || typeof MR.isTypeSupported !== 'function') return null
  for (const mime of MP4) if (MR.isTypeSupported(mime)) return { mime, ext: 'mp4' }
  for (const mime of WEBM) if (MR.isTypeSupported(mime)) return { mime, ext: 'webm' }
  return null
}

/** Can this phone film (camera + recorder) and put the video together (a
 *  canvas it can record)? */
export function canFilm(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && !!pickMime()
}
export function canCompose(): boolean {
  if (typeof document === 'undefined' || !pickMime()) return false
  return typeof (document.createElement('canvas') as any).captureStream === 'function'
}

const FONT = (st: TextStyle, size: number) => `${st.weight} ${size}px "${st.family}", Sora, system-ui, sans-serif`

/** Fetch the look's font before the first frame, so no word is ever drawn
 *  in a stand-in font. A font that will not load falls back to Sora. */
const FONTS_IN = new Set<string>()
async function readyFont(st: TextStyle): Promise<void> {
  const fonts = (document as any).fonts
  try {
    if (st.file && !FONTS_IN.has(st.family)) {
      const face = new (globalThis as any).FontFace(st.family, `url(/fonts/sb/${st.file})`, { weight: String(st.weight), style: 'normal' })
      await face.load()
      fonts.add(face)
      FONTS_IN.add(st.family)
    }
    await fonts?.load?.(FONT(st, 40))
  } catch { /* drawn in Sora */ }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + k, y); ctx.arcTo(x + w, y, x + w, y + h, k); ctx.arcTo(x + w, y + h, x, y + h, k); ctx.arcTo(x, y + h, x, y, k); ctx.arcTo(x, y, x + w, y, k)
  ctx.closePath()
}

function drawWords(ctx: CanvasRenderingContext2D, text: string, centerY: number, st: TextStyle) {
  if (!text) return
  const box = st.box
  const maxW = VIDEO_W - 96 - (box ? box.padX * 2 : 0)
  const words = st.upper ? text.toUpperCase() : text
  const fit = fitText(words, maxW, 4, st.sizes, (size) => { ctx.font = FONT(st, size); return (s) => ctx.measureText(s).width })
  ctx.font = FONT(st, fit.size)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  const lh = fit.size * st.lineHeight
  const top = centerY - ((fit.rows.length - 1) * lh) / 2
  const widths = fit.rows.map((r) => ctx.measureText(r).width)
  if (box && !box.perRow) {
    const w = Math.max(...widths) + box.padX * 2
    const h = fit.rows.length * lh + box.padY * 2
    roundRect(ctx, (VIDEO_W - w) / 2, top - lh / 2 - box.padY, w, h, box.radius)
    ctx.fillStyle = box.fill
    ctx.fill()
    if (box.stroke) { ctx.lineWidth = box.strokeWidth ?? 4; ctx.strokeStyle = box.stroke; ctx.stroke() }
  }
  fit.rows.forEach((row, i) => {
    const y = top + i * lh
    if (box?.perRow) { ctx.fillStyle = box.fill; ctx.fillRect((VIDEO_W - widths[i]!) / 2 - box.padX, y - lh / 2, widths[i]! + box.padX * 2, lh + 1) }
    if (st.outline) { ctx.lineWidth = Math.max(6, fit.size * st.outline * 2); ctx.strokeStyle = 'rgba(29, 26, 34, 0.92)'; ctx.strokeText(row, VIDEO_W / 2, y + (st.shadow ? fit.size * st.shadow.dy : 0)); ctx.strokeText(row, VIDEO_W / 2, y) }
    if (st.shadow) { ctx.fillStyle = st.shadow.color; ctx.fillText(row, VIDEO_W / 2, y + fit.size * st.shadow.dy) }
    ctx.fillStyle = st.color
    ctx.fillText(row, VIDEO_W / 2, y)
  })
}

function drawMark(ctx: CanvasRenderingContext2D) {
  ctx.font = '700 26px Sora, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 6
  ctx.strokeStyle = 'rgba(29, 26, 34, 0.7)'
  ctx.strokeText('— shutap.com', VIDEO_W / 2, VIDEO_H - 56)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
  ctx.fillText('— shutap.com', VIDEO_W / 2, VIDEO_H - 56)
}

const PLAIN: TextStyle = { key: 'classic', name: '', family: 'Sora', weight: 800, sizes: [72, 62, 54, 46, 40], lineHeight: 1.14, upper: false, color: '#ffffff' }
const SMALL: TextStyle = { key: 'classic', name: '', family: 'Sora', weight: 600, sizes: [34, 30, 26], lineHeight: 1.3, upper: false, color: 'rgba(255, 255, 255, 0.88)' }

/** The end card: the business's logo in a white circle when it has one, its
 *  name, where it is, and the code word line in the look the owner picked. */
function drawEndCard(ctx: CanvasRenderingContext2D, texts: VideoTexts, st: TextStyle, logo: CanvasImageSource | null, logoSize: { w: number; h: number }) {
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO_H)
  g.addColorStop(0, '#c2185b')
  g.addColorStop(1, '#8e1043')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, VIDEO_W, VIDEO_H)
  const hasCode = !!texts.code
  let nameY = VIDEO_H * (hasCode ? 0.36 : 0.46)
  if (logo && logoSize.w && logoSize.h) {
    const R = 112
    const cy = VIDEO_H * (hasCode ? 0.2 : 0.28)
    ctx.save()
    ctx.beginPath(); ctx.arc(VIDEO_W / 2, cy, R, 0, Math.PI * 2); ctx.closePath()
    ctx.fillStyle = '#ffffff'; ctx.fill()
    ctx.clip()
    // the whole logo inside the circle, never cropped
    const side = R * 2 * 0.74
    const k = Math.min(side / logoSize.w, side / logoSize.h)
    ctx.drawImage(logo, VIDEO_W / 2 - (logoSize.w * k) / 2, cy - (logoSize.h * k) / 2, logoSize.w * k, logoSize.h * k)
    ctx.restore()
    nameY = cy + R + 110
  }
  drawWords(ctx, texts.name.slice(0, 60), nameY, PLAIN)
  if (texts.place) drawWords(ctx, texts.place.slice(0, 90), nameY + 130, SMALL)
  if (hasCode) drawWords(ctx, texts.code, VIDEO_H * 0.74, st)
}

async function loadLogo(src: string | null): Promise<{ img: HTMLImageElement; w: number; h: number } | null> {
  if (!src || !src.startsWith('data:image/')) return null
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = src
    await img.decode()
    const w = img.naturalWidth || 256
    const h = img.naturalHeight || 256
    return { img, w, h }
  } catch { return null }
}

function once(el: HTMLMediaElement, ok: string, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { off(); reject(new Error(`timeout waiting for ${ok}`)) }, ms)
    const yes = () => { off(); resolve() }
    const no = () => { off(); reject(new Error('the clip would not play')) }
    const off = () => { clearTimeout(t); el.removeEventListener(ok, yes); el.removeEventListener('error', no) }
    el.addEventListener(ok, yes, { once: true })
    el.addEventListener('error', no, { once: true })
  })
}

/** Put the three clips and the words together. Call it from a tap (the
 *  browser only lets sound start from one). `canvas` must be in the page and
 *  visible: the owner watches the video being made, and some phones only
 *  record a canvas that is on screen. `host` is where the hidden clip
 *  players are placed. */
export async function composeVideo(opts: { clips: Blob[]; texts: VideoTexts; canvas: HTMLCanvasElement; host: HTMLElement; onProgress?: (p: number) => void }): Promise<ComposeResult> {
  // A video that came out cut short is never handed over: it is made once
  // more, and if it is short again the owner is told (they keep the clips).
  let last: ComposeResult | null = null
  for (let n = 1; n <= 2; n++) {
    const out = await composeOnce(opts)
    out.notes.tries = n
    out.notes.made = await videoSeconds(out.blob)
    last = out
    if (out.notes.made === null || out.notes.made >= out.notes.want - SHORT_BY_SECONDS) return out
    opts.onProgress?.(0)
  }
  throw new Error(`cut short: ${JSON.stringify(last?.notes)}`.slice(0, 200))
}

async function composeOnce(opts: { clips: Blob[]; texts: VideoTexts; canvas: HTMLCanvasElement; host: HTMLElement; onProgress?: (p: number) => void }): Promise<ComposeResult> {
  const format = pickMime()
  if (!format || !canCompose()) throw new Error('this phone cannot put the video together')
  const { clips, texts, canvas, host } = opts
  canvas.width = VIDEO_W
  canvas.height = VIDEO_H
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('no canvas')
  const st = textStyle(texts.style)
  await readyFont(st)
  await (document as any).fonts?.load?.('800 60px Sora').catch(() => {})
  const logo = await loadLogo(texts.logo)
  ctx.fillStyle = '#1d1a22'
  ctx.fillRect(0, 0, VIDEO_W, VIDEO_H)

  // the clips' own sound, mixed into the recording (never to the speaker)
  const AC = (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext
  let audioCtx: AudioContext | null = null
  let dest: MediaStreamAudioDestinationNode | null = null
  try {
    audioCtx = new AC() as AudioContext
    await audioCtx.resume().catch(() => {})
    dest = audioCtx.createMediaStreamDestination()
  } catch { audioCtx = null; dest = null }

  const urls: string[] = []
  const players = clips.map((blob) => {
    const v = document.createElement('video')
    const url = URL.createObjectURL(blob)
    urls.push(url)
    v.src = url
    v.playsInline = true
    v.setAttribute('playsinline', '')
    v.preload = 'auto'
    v.style.cssText = 'position:absolute;width:2px;height:2px;opacity:0;pointer-events:none'
    host.appendChild(v)
    if (audioCtx && dest) {
      try { audioCtx.createMediaElementSource(v).connect(dest) } catch { /* this clip plays silent */ }
    } else {
      v.muted = true
    }
    return v
  })

  const stream: MediaStream = (canvas as any).captureStream(VIDEO_FPS)
  const audioTrack = dest?.stream.getAudioTracks()[0]
  if (audioTrack) stream.addTrack(audioTrack)
  const recorder = new MediaRecorder(stream, { mimeType: format.mime, videoBitsPerSecond: 4_000_000, audioBitsPerSecond: 128_000 })
  const chunks: Blob[] = []
  const errors: string[] = []
  let stalls = 0
  let asked = false
  let lastData: () => void = () => {}
  const gotLast = new Promise<void>((resolve) => { lastData = resolve })
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); if (asked) lastData() }
  recorder.onerror = (e) => { errors.push(String((e as any)?.error?.name ?? 'recorder error')) }
  const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve() })
  // some phones only pass a frame on when the picture changed: one corner
  // pixel flips every frame so a held picture still counts as a new frame
  let flip = false
  const nudge = () => { flip = !flip; ctx.fillStyle = flip ? '#1d1a22' : '#1c1a22'; ctx.fillRect(0, 0, 2, 2) }

  const cleanup = () => {
    for (const v of players) { try { v.pause() } catch { /* noop */ } v.remove() }
    for (const u of urls) URL.revokeObjectURL(u)
    for (const t of stream.getTracks()) t.stop()
    void audioCtx?.close().catch(() => {})
  }

  const t0 = performance.now()
  let want = 0
  let clipSeconds: number[] = []
  try {
    for (const v of players) if (v.readyState < 2) await once(v, 'loadeddata', 8000)
    const lengths = players.map((v) => (Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0))
    const total = lengths.reduce((a, b) => a + b, 0) + END_CARD_SECONDS
    want = total
    clipSeconds = lengths.map((x) => Math.round(x * 10) / 10)
    let done = 0
    // one piece at the end: pieces handed over every second went missing on
    // an iPhone (Nov 21 2026: a 9-second video came out 4 seconds long)
    recorder.start()
    for (let i = 0; i < players.length; i++) {
      const v = players[i]!
      await v.play()
      await new Promise<void>((resolve, reject) => {
        let raf = 0
        let at = -1
        let moved = performance.now()
        let nudged = false
        const fail = () => { cancelAnimationFrame(raf); reject(new Error('the clip stopped')) }
        v.addEventListener('error', fail, { once: true })
        const tick = () => {
          const crop = coverCrop(v.videoWidth, v.videoHeight)
          if (crop.sw && crop.sh) ctx.drawImage(v, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, VIDEO_W, VIDEO_H)
          drawWords(ctx, lineAt(i, v.currentTime, lengths[i] || v.duration || 5, texts), VIDEO_H * 0.72, st)
          if (texts.marked) drawMark(ctx)
          nudge()
          opts.onProgress?.(Math.min(0.99, (done + v.currentTime) / (total || 1)))
          if (v.ended) { v.removeEventListener('error', fail); resolve(); return }
          // a clip that stops moving: push it once, then give up on it so the
          // owner is never left watching a frozen screen
          const now = performance.now()
          if (v.currentTime !== at) { at = v.currentTime; moved = now; nudged = false }
          else if (now - moved > 1500 && !nudged) { nudged = true; stalls += 1; void v.play().catch(() => {}) }
          else if (now - moved > 5000) { errors.push(`clip ${i + 1} froze at ${at.toFixed(1)}`); v.removeEventListener('error', fail); reject(new Error(`clip ${i + 1} froze`)); return }
          raf = requestAnimationFrame(tick)
        }
        tick()
      })
      done += lengths[i] || 0
    }
    // the end card
    const endStart = performance.now()
    await new Promise<void>((resolve) => {
      const tick = () => {
        drawEndCard(ctx, texts, st, logo?.img ?? null, { w: logo?.w ?? 0, h: logo?.h ?? 0 })
        if (texts.marked) drawMark(ctx)
        nudge()
        const t = (performance.now() - endStart) / 1000
        opts.onProgress?.(Math.min(0.99, (done + t) / (total || 1)))
        if (t >= END_CARD_SECONDS) { resolve(); return }
        requestAnimationFrame(tick)
      }
      tick()
    })
    asked = true
    recorder.stop()
    await stopped
    // the last piece can arrive just after the stop on some phones
    if (!chunks.length) await Promise.race([gotLast, new Promise((r) => setTimeout(r, 1500))])
  } catch (e) {
    try { if (recorder.state !== 'inactive') recorder.stop() } catch { /* noop */ }
    cleanup()
    throw e
  }
  cleanup()
  opts.onProgress?.(1)
  const blob = new Blob(chunks, { type: format.mime.split(';')[0] })
  if (!blob.size) throw new Error('the recording came out empty')
  return { blob, ext: format.ext, seconds: Math.round((performance.now() - t0) / 100) / 10, audio: !!audioTrack, notes: { tries: 1, want: Math.round(want * 10) / 10, made: null, chunks: chunks.length, bytes: blob.size, clips: clipSeconds, stalls, errors } }
}
