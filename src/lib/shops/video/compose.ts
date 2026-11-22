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

export type VideoTexts = {
  hook: string
  /** the line on each of the three clips */
  shots: string[]
  /** the end card's big line: the code word line, or the business's name */
  end: string
  /** small line above it on the end card (the business's name) */
  endSmall: string
  /** Free plan: the "— shutap.com" mark, bottom of every frame */
  marked: boolean
}

export type ComposeResult = { blob: Blob; ext: 'mp4' | 'webm'; seconds: number; audio: boolean }

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

const FONT = (size: number) => `800 ${size}px Sora, system-ui, sans-serif`

function drawWords(ctx: CanvasRenderingContext2D, text: string, centerY: number) {
  if (!text) return
  const maxW = VIDEO_W - 96
  const fit = fitText(text.toUpperCase(), maxW, 4, [68, 58, 50, 42, 36], (size) => { ctx.font = FONT(size); return (s) => ctx.measureText(s).width })
  ctx.font = FONT(fit.size)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lh = fit.size * 1.16
  const top = centerY - ((fit.rows.length - 1) * lh) / 2
  ctx.lineJoin = 'round'
  fit.rows.forEach((row, i) => {
    const y = top + i * lh
    ctx.lineWidth = Math.max(8, fit.size * 0.2)
    ctx.strokeStyle = 'rgba(29, 26, 34, 0.92)'
    ctx.strokeText(row, VIDEO_W / 2, y)
    ctx.fillStyle = '#ffffff'
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

function drawEndCard(ctx: CanvasRenderingContext2D, texts: VideoTexts) {
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO_H)
  g.addColorStop(0, '#c2185b')
  g.addColorStop(1, '#8e1043')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, VIDEO_W, VIDEO_H)
  if (texts.endSmall) {
    ctx.font = '700 34px Sora, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.86)'
    ctx.fillText(texts.endSmall.slice(0, 40), VIDEO_W / 2, VIDEO_H * 0.34)
  }
  drawWords(ctx, texts.end, VIDEO_H * 0.5)
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
  const format = pickMime()
  if (!format || !canCompose()) throw new Error('this phone cannot put the video together')
  const { clips, texts, canvas, host } = opts
  canvas.width = VIDEO_W
  canvas.height = VIDEO_H
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('no canvas')
  await (document as any).fonts?.load?.(FONT(60)).catch(() => {})
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
  recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
  const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve() })

  const cleanup = () => {
    for (const v of players) { try { v.pause() } catch { /* noop */ } v.remove() }
    for (const u of urls) URL.revokeObjectURL(u)
    for (const t of stream.getTracks()) t.stop()
    void audioCtx?.close().catch(() => {})
  }

  const t0 = performance.now()
  try {
    for (const v of players) if (v.readyState < 2) await once(v, 'loadeddata', 8000)
    const lengths = players.map((v) => (Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0))
    const total = lengths.reduce((a, b) => a + b, 0) + END_CARD_SECONDS
    let done = 0
    recorder.start(1000)
    for (let i = 0; i < players.length; i++) {
      const v = players[i]!
      await v.play()
      await new Promise<void>((resolve, reject) => {
        let raf = 0
        const fail = () => { cancelAnimationFrame(raf); reject(new Error('the clip stopped')) }
        v.addEventListener('error', fail, { once: true })
        const tick = () => {
          const crop = coverCrop(v.videoWidth, v.videoHeight)
          if (crop.sw && crop.sh) ctx.drawImage(v, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, VIDEO_W, VIDEO_H)
          drawWords(ctx, lineAt(i, v.currentTime, lengths[i] || v.duration || 5, texts), VIDEO_H * 0.72)
          if (texts.marked) drawMark(ctx)
          opts.onProgress?.(Math.min(0.99, (done + v.currentTime) / (total || 1)))
          if (v.ended) { v.removeEventListener('error', fail); resolve(); return }
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
        drawEndCard(ctx, texts)
        if (texts.marked) drawMark(ctx)
        const t = (performance.now() - endStart) / 1000
        opts.onProgress?.(Math.min(0.99, (done + t) / (total || 1)))
        if (t >= END_CARD_SECONDS) { resolve(); return }
        requestAnimationFrame(tick)
      }
      tick()
    })
    recorder.stop()
    await stopped
  } catch (e) {
    try { if (recorder.state !== 'inactive') recorder.stop() } catch { /* noop */ }
    cleanup()
    throw e
  }
  cleanup()
  opts.onProgress?.(1)
  const blob = new Blob(chunks, { type: format.mime.split(';')[0] })
  if (!blob.size) throw new Error('the recording came out empty')
  return { blob, ext: format.ext, seconds: Math.round((performance.now() - t0) / 100) / 10, audio: !!audioTrack }
}
