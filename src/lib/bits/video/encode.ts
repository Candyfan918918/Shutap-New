// Encodes the 5-second video on the device: canvas frames → WebCodecs
// VideoEncoder (H.264) → mp4, with the synth soundtrack as AAC when the
// browser can encode audio. No server renders anything.
//
// Fallbacks, in order: H.264 mp4 with sound · H.264 mp4 without sound ·
// (older browsers) MediaRecorder webm · none, and the caller offers the
// picture instead. `canEncodeVideo()` says which is available before any
// download is charged.
import { ArrayBufferTarget, Muxer } from './vendor'
import { drawFrame } from './draw'
import { renderSfx } from './sfx'
import { VIDEO_FPS, VIDEO_FRAMES, VIDEO_H, VIDEO_SECONDS, VIDEO_W, type VideoSpec } from './spec'

export type EncodeSupport = 'mp4' | 'webm' | 'none'

const H264_CODECS = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.42001f']

async function pickVideoCodec(): Promise<string | null> {
  const VE = (globalThis as any).VideoEncoder as typeof VideoEncoder | undefined
  if (!VE || typeof VE.isConfigSupported !== 'function') return null
  for (const codec of H264_CODECS) {
    try {
      const r = await VE.isConfigSupported({ codec, width: VIDEO_W, height: VIDEO_H, framerate: VIDEO_FPS, bitrate: 6_000_000 })
      if (r.supported) return codec
    } catch {
      /* next */
    }
  }
  return null
}

async function audioSupported(): Promise<boolean> {
  const AE = (globalThis as any).AudioEncoder as typeof AudioEncoder | undefined
  if (!AE || typeof AE.isConfigSupported !== 'function') return false
  try {
    const r = await AE.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 1, bitrate: 96_000 })
    return !!r.supported
  } catch {
    return false
  }
}

export async function canEncodeVideo(): Promise<EncodeSupport> {
  if (typeof document === 'undefined') return 'none'
  if (await pickVideoCodec()) return 'mp4'
  const canvas = document.createElement('canvas')
  if (typeof (canvas as any).captureStream === 'function' && typeof (globalThis as any).MediaRecorder !== 'undefined') return 'webm'
  return 'none'
}

export type EncodeResult = { blob: Blob; ext: 'mp4' | 'webm'; audio: boolean }

/** Encode the spec. `onProgress` gets 0..1. */
export async function encodeVideo(spec: VideoSpec, opts: { watermark: boolean; onProgress?: (p: number) => void }): Promise<EncodeResult> {
  const codec = await pickVideoCodec()
  if (codec) return encodeMp4(spec, codec, opts)
  return encodeWebm(spec, opts)
}

async function encodeMp4(spec: VideoSpec, codec: string, opts: { watermark: boolean; onProgress?: (p: number) => void }): Promise<EncodeResult> {
  const canvas = document.createElement('canvas')
  canvas.width = VIDEO_W
  canvas.height = VIDEO_H
  const ctx = canvas.getContext('2d', { alpha: false })!
  await (document as any).fonts?.load?.(`800 100px Sora`).catch(() => {})

  const withAudio = await audioSupported()
  const sfx = withAudio ? await renderSfx(spec).catch(() => null) : null
  const audio = !!sfx

  const target = new ArrayBufferTarget()
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width: VIDEO_W, height: VIDEO_H, frameRate: VIDEO_FPS },
    ...(audio ? { audio: { codec: 'aac', sampleRate: 48000, numberOfChannels: 1 } } : {}),
    fastStart: 'in-memory',
  })

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      throw e
    },
  })
  videoEncoder.configure({ codec, width: VIDEO_W, height: VIDEO_H, framerate: VIDEO_FPS, bitrate: 6_000_000, latencyMode: 'quality' })

  for (let i = 0; i < VIDEO_FRAMES; i++) {
    const t = i / VIDEO_FPS
    drawFrame(ctx, t, spec, { watermark: opts.watermark })
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1_000_000) / VIDEO_FPS), duration: Math.round(1_000_000 / VIDEO_FPS) })
    videoEncoder.encode(frame, { keyFrame: i % 30 === 0 })
    frame.close()
    if (videoEncoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 0))
    opts.onProgress?.((i + 1) / VIDEO_FRAMES)
  }
  await videoEncoder.flush()
  videoEncoder.close()

  if (audio && sfx) {
    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (e) => {
        throw e
      },
    })
    audioEncoder.configure({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 1, bitrate: 96_000 })
    const data = sfx.getChannelData(0)
    const chunkFrames = 48000 / 10
    for (let off = 0; off < data.length; off += chunkFrames) {
      const n = Math.min(chunkFrames, data.length - off)
      const slice = data.slice(off, off + n)
      const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 1, timestamp: Math.round((off / 48000) * 1_000_000), data: slice })
      audioEncoder.encode(ad)
      ad.close()
    }
    await audioEncoder.flush()
    audioEncoder.close()
  }

  muxer.finalize()
  return { blob: new Blob([target.buffer], { type: 'video/mp4' }), ext: 'mp4', audio }
}

/** Older browsers: real-time capture of the canvas. Silent. */
async function encodeWebm(spec: VideoSpec, opts: { watermark: boolean; onProgress?: (p: number) => void }): Promise<EncodeResult> {
  const canvas = document.createElement('canvas')
  canvas.width = VIDEO_W
  canvas.height = VIDEO_H
  const ctx = canvas.getContext('2d', { alpha: false })!
  const stream = (canvas as any).captureStream(VIDEO_FPS) as MediaStream
  const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm', videoBitsPerSecond: 6_000_000 })
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  const done = new Promise<void>((res) => (rec.onstop = () => res()))
  rec.start(200)
  const t0 = performance.now()
  await new Promise<void>((res) => {
    const tick = () => {
      const t = (performance.now() - t0) / 1000
      drawFrame(ctx, Math.min(t, VIDEO_SECONDS), spec, { watermark: opts.watermark })
      opts.onProgress?.(Math.min(1, t / VIDEO_SECONDS))
      if (t < VIDEO_SECONDS) requestAnimationFrame(tick)
      else res()
    }
    requestAnimationFrame(tick)
  })
  rec.stop()
  await done
  return { blob: new Blob(chunks, { type: 'video/webm' }), ext: 'webm', audio: false }
}
