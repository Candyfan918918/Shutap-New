/* The 5-second video of the bit on screen. Plays in a canvas (free users
 * see the shutap.com watermark; Basic and Pro see it clean). Download encodes
 * it on the device, charges one download of kind 'video', and shares on
 * phones or saves on desktop. A phone that cannot encode gets the picture
 * instead, without a second charge. */
import { useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { chargeDownload, type DownloadCharge } from '@/lib/bits.functions'
import { isPaidTier, type BitTier, type BitVersion } from '@/lib/bits/shared'
import { buildSpec, VIDEO_H, VIDEO_SECONDS, VIDEO_W, type VideoSpec } from '@/lib/bits/video/spec'
import { drawFrame } from '@/lib/bits/video/draw'
import { scheduleSfx } from '@/lib/bits/video/sfx'
import { canEncodeVideo, encodeVideo, type EncodeSupport } from '@/lib/bits/video/encode'
import { anonSessionId, canShareFiles, isShareAbort, jokeTrack, saveBlob } from '../joke/jokeClient'

export function VideoCard({
  bitId,
  version,
  story,
  tier,
  say,
  onSignIn,
  onLimit,
  onFallbackPicture,
  downloadsLeft,
  onCharged,
}: {
  bitId: string
  version: BitVersion
  story: string
  tier: BitTier
  say: (m: string) => void
  /** guests: downloading needs an account */
  onSignIn?: () => void
  /** at the daily download cap: open the plans */
  onLimit: (why: 'count' | 'watermark') => void
  /** this device cannot make a video file: open the picture download instead */
  onFallbackPicture: () => void
  downloadsLeft: number | null | undefined
  onCharged: (r: Extract<DownloadCharge, { ok: true }>) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [spec, setSpec] = useState<VideoSpec>(() => buildSpec(version, story))
  const [playing, setPlaying] = useState(true)
  const [support, setSupport] = useState<EncodeSupport | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const charge = useServerFn(chargeDownload)
  const watermark = !isPaidTier(tier)
  const audioRef = useRef<AudioContext | null>(null)
  const completedRef = useRef(false)

  useEffect(() => {
    setSpec(buildSpec(version, story))
    completedRef.current = false
  }, [version, story])

  useEffect(() => {
    canEncodeVideo().then(setSupport).catch(() => setSupport('none'))
  }, [])

  // the player: draws the frame for the current time, loops every 5s
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const scale = canvas.width / VIDEO_W
    let raf = 0
    let start = performance.now()
    let lastLoop = 0
    const tick = () => {
      const now = performance.now()
      const t = ((now - start) / 1000) % VIDEO_SECONDS
      const loop = Math.floor((now - start) / 1000 / VIDEO_SECONDS)
      if (loop !== lastLoop) {
        lastLoop = loop
        if (!completedRef.current) {
          completedRef.current = true
          jokeTrack('video_completed', tier, { kind: version.kind })
        }
        if (audioRef.current && audioRef.current.state === 'running') scheduleSfx(audioRef.current, spec, audioRef.current.currentTime + 0.02)
      }
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      drawFrame(ctx, t, spec, { watermark })
      if (playing) raf = requestAnimationFrame(tick)
    }
    if (playing) {
      start = performance.now()
      jokeTrack('video_played', tier, { kind: version.kind })
      if (audioRef.current && audioRef.current.state === 'running') scheduleSfx(audioRef.current, spec, audioRef.current.currentTime + 0.02)
      raf = requestAnimationFrame(tick)
    } else {
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      drawFrame(ctx, 4.6, spec, { watermark })
    }
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, playing, watermark])

  function toggleSound() {
    if (!audioRef.current) {
      try {
        const AC = (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext
        audioRef.current = new AC()
      } catch {
        return
      }
    }
    const ac = audioRef.current!
    if (ac.state === 'running') void ac.suspend()
    else void ac.resume()
  }

  async function download() {
    if (onSignIn) return onSignIn()
    if (support === 'none') {
      say("This browser can't make a video file. Saving the picture instead.")
      return onFallbackPicture()
    }
    let r: DownloadCharge
    try {
      r = await charge({ data: { bit_id: bitId, version_id: version.id, kind: 'video', anon_session_id: anonSessionId() } })
    } catch {
      say("Couldn't start the download. Try again.")
      return
    }
    if (!r.ok) {
      if (r.reason === 'limited') {
        jokeTrack('download_blocked', tier, { kind: 'video', used: r.used, cap: r.cap })
        say(`That's today's ${r.cap} download${r.cap === 1 ? '' : 's'}.`)
        return onLimit('count')
      }
      say(r.reason === 'sign_in' ? 'Sign in to download it.' : "Couldn't start the download. Try again.")
      return
    }
    onCharged(r)
    setBusy(0)
    try {
      const out = await encodeVideo(spec, { watermark, onProgress: (p) => setBusy(p) })
      const slug = version.hook.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'bit'
      const name = `${slug}-shutap.${out.ext}`
      jokeTrack('download', tier, { kind: 'video', ext: out.ext, audio: out.audio, watermarked: watermark, used: r.used, cap: r.cap, repeat: r.repeat })
      const file = new File([out.blob], name, { type: out.blob.type })
      if (canShareFiles([file])) {
        try {
          await navigator.share({ files: [file] })
          return
        } catch (e) {
          if (isShareAbort(e)) return
        }
      }
      saveBlob(out.blob, name)
      say(watermark ? 'Saved, with the shutap.com watermark.' : 'Saved. No watermark.')
    } catch (e) {
      console.warn('[video] encode failed', e)
      say("Couldn't make the video on this device. Saving the picture instead; it won't count again.")
      onFallbackPicture()
    } finally {
      setBusy(null)
    }
  }

  const left = downloadsLeft
  const label =
    busy !== null
      ? `making the video… ${Math.round(busy * 100)}%`
      : onSignIn
        ? 'sign in to download'
        : left === 0
          ? "that's today's downloads · see plans"
          : `download video${left === null || left === undefined ? '' : ` · ${left} left today`}`

  return (
    <section className="bt-card" aria-label="The 5-second video" data-ph-private style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="bt-between">
        <span className="bt-lbl">5-second video · {version.kind === 'original' ? 'this bit' : version.kind}</span>
        <span className="bt-note">1080×1920 · {support === 'webm' ? 'webm' : 'mp4'}</span>
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 180, flexShrink: 0 }}>
          <canvas
            ref={canvasRef}
            width={360}
            height={Math.round((360 * VIDEO_H) / VIDEO_W)}
            className="ph-no-capture"
            style={{ width: 180, height: 320, borderRadius: 14, display: 'block', border: '1px solid var(--line)', cursor: 'pointer' }}
            onClick={() => setPlaying((p) => !p)}
            role="img"
            aria-label={playing ? 'The video, playing. Tap to pause.' : 'The video, paused. Tap to play.'}
          />
          <button
            type="button"
            className="bt-btn ghost sm"
            onClick={toggleSound}
            aria-label="Sound on or off"
            style={{ position: 'absolute', right: 8, bottom: 8, height: 30, padding: '0 10px', fontSize: 12 }}
          >
            {audioRef.current && audioRef.current.state === 'running' ? 'sound on' : 'sound'}
          </button>
        </div>
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
          <p className="bt-note" style={{ fontSize: 'var(--fs-body)', color: 'var(--ink)' }}>
            The hook, the tags and the button in the Shutap style, with a cartoon of what happened. Made from this version; a rewrite makes a new one.
          </p>
          <button className="bt-btn block" disabled={busy !== null || support === null} onClick={() => void download()}>
            {label}
          </button>
          {watermark ? (
            <button type="button" className="bt-note" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', color: 'var(--rose)' }} onClick={() => onLimit('watermark')}>
              remove the shutap.com watermark · Basic $1.99
            </button>
          ) : (
            <span className="bt-note">clean, no watermark</span>
          )}
        </div>
      </div>
    </section>
  )
}
