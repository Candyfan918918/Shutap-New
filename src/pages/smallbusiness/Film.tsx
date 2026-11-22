// Shutap for small business (Nov 21 2026): film the three shots and get the
// finished video, on the owner's own phone.
//
//   ask     "Turn on camera and mic": what each is for, what the phone will
//           ask, and what to do if it didn't ask
//   film    the camera, one shot at a time: the instruction, flip, record
//           (it stops itself at the shot's length), redo
//   make    the video being put together while the owner watches
//   ready   the video, "Save for TikTok, Instagram and other apps"
//   clips   the phone cannot put it together: the three clips to save
//
// The clips stay on this phone; nothing is uploaded here.
import { useCallback, useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/tracking'
import { markMyVideo, noteFilmProblem, recordMyVideo, type ShopVideo } from '@/lib/shops.functions'
import { cameraTip, defaultFacing, type Camera, type Facing, type Length } from '@/lib/shops/shop'
import { canCompose, canFilm, composeVideo, pickMime, type VideoTexts } from '@/lib/shops/video/compose'
import { shotSeconds } from '@/lib/shops/video/layout'

type Phase = 'ask' | 'help' | 'film' | 'make' | 'ready' | 'clips'
const ev = (name: string, props: Record<string, unknown> = {}) => { void trackEvent(name, { product: 'smallbusiness', ...props }) }

export type FilmProps = {
  setId: string
  title: string
  /** what to film, one per shot */
  actions: string[]
  texts: VideoTexts
  camera: Camera
  length: Length
  onDone: (video: ShopVideo | null) => void
}

function fileName(title: string, ext: string, n?: number): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'video'
  return `shutap-${slug}${n ? `-shot-${n}` : ''}.${ext}`
}

/** Hand a file to the phone: the share sheet where there is one (it is how
 *  an iPhone saves a video to Photos), a download otherwise. */
async function give(blob: Blob, name: string): Promise<'shared' | 'saved' | 'cancelled'> {
  const file = new File([blob], name, { type: blob.type })
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
  if (nav.canShare?.({ files: [file] }) && typeof nav.share === 'function') {
    try { await nav.share({ files: [file] }); return 'shared' } catch (e) { if ((e as Error)?.name === 'AbortError') return 'cancelled' }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
  return 'saved'
}

export function Film({ setId, title, actions, texts, camera, length, onDone }: FilmProps) {
  const [phase, setPhase] = useState<Phase>('ask')
  const [facing, setFacing] = useState<Facing>(defaultFacing(camera))
  const [clips, setClips] = useState<Blob[]>([])
  const [recording, setRecording] = useState(false)
  const [left, setLeft] = useState(0)
  const [note, setNote] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ blob: Blob; ext: 'mp4' | 'webm'; url: string } | null>(null)
  const [video, setVideo] = useState<ShopVideo | null>(null)
  const [saved, setSaved] = useState(false)
  const live = useRef<HTMLVideoElement | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const timer = useRef<number | null>(null)
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const host = useRef<HTMLDivElement | null>(null)
  const per = shotSeconds(length)
  const shot = Math.min(clips.length, 2)
  const allIn = clips.length >= 3

  const stopCamera = useCallback(() => {
    if (timer.current) { window.clearInterval(timer.current); timer.current = null }
    try { if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop() } catch { /* noop */ }
    for (const t of stream.current?.getTracks() ?? []) t.stop()
    stream.current = null
  }, [])
  useEffect(() => () => { stopCamera(); if (result) URL.revokeObjectURL(result.url) }, [stopCamera]) // eslint-disable-line react-hooks/exhaustive-deps

  const problem = (what: 'camera_blocked' | 'no_camera' | 'cannot_record' | 'cannot_compose' | 'compose_failed' | 'clips_saved', detail?: string) => { void noteFilmProblem({ data: { what, ...(detail ? { detail: detail.slice(0, 200) } : {}) } }).catch(() => {}) }

  async function openCamera(want: Facing): Promise<boolean> {
    if (!canFilm()) { setNote('This browser can’t film. Open Shutap in Safari or Chrome on your phone.'); problem('cannot_record'); return false }
    for (const t of stream.current?.getTracks() ?? []) t.stop()
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: want === 'front' ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true })
      stream.current = s
      if (live.current) { live.current.srcObject = s; await live.current.play().catch(() => {}) }
      return true
    } catch (e) {
      const name = (e as Error)?.name ?? ''
      if (name === 'NotFoundError' || name === 'OverconstrainedError') { setNote('We couldn’t find a camera on this device.'); problem('no_camera', name) } else { problem('camera_blocked', name) }
      return false
    }
  }

  async function turnOn() {
    setNote(null)
    setPhase('film')
    // the <video> must be on the page before the stream is attached
    await new Promise((r) => setTimeout(r, 0))
    const ok = await openCamera(facing)
    ev('sb_camera', { ok, facing })
    if (!ok) setPhase('help')
  }

  async function flip() {
    if (recording) return
    const next: Facing = facing === 'front' ? 'back' : 'front'
    setFacing(next)
    ev('sb_flip', { to: next })
    if (!(await openCamera(next))) setPhase('help')
  }

  function record() {
    if (allIn || !stream.current) return
    if (recording) { recorder.current?.stop(); return }
    const format = pickMime()
    if (!format) { setNote('This browser can’t record.'); return }
    const chunks: Blob[] = []
    let r: MediaRecorder
    try { r = new MediaRecorder(stream.current, { mimeType: format.mime, videoBitsPerSecond: 5_000_000 }) } catch { setNote('This browser can’t record.'); problem('cannot_record', format.mime); return }
    recorder.current = r
    r.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
    r.onstop = () => {
      if (timer.current) { window.clearInterval(timer.current); timer.current = null }
      setRecording(false)
      const blob = new Blob(chunks, { type: format.mime.split(';')[0] })
      if (blob.size) { setClips((c) => [...c, blob].slice(0, 3)); ev('sb_shot', { n: clips.length + 1, bytes: blob.size }) } else setNote('That shot didn’t record. Try it again.')
    }
    setNote(null)
    setRecording(true)
    const end = Date.now() + per * 1000
    setLeft(Math.ceil(per))
    timer.current = window.setInterval(() => {
      const s = Math.max(0, (end - Date.now()) / 1000)
      setLeft(Math.ceil(s))
      if (s <= 0) { try { r.stop() } catch { /* noop */ } }
    }, 100)
    r.start()
  }

  function redo() {
    if (recording) return
    setClips((c) => c.slice(0, -1))
    ev('sb_redo')
  }

  async function make() {
    if (!allIn) return
    if (!canCompose()) { stopCamera(); setPhase('clips'); problem('cannot_compose'); return }
    stopCamera()
    setPhase('make')
    setProgress(0)
    await new Promise((r) => setTimeout(r, 0))
    try {
      const out = await composeVideo({ clips, texts, canvas: canvas.current!, host: host.current!, onProgress: setProgress })
      const url = URL.createObjectURL(out.blob)
      setResult({ blob: out.blob, ext: out.ext, url })
      setPhase('ready')
      ev('sb_video_ready', { seconds: out.seconds, ext: out.ext, audio: out.audio })
      const rec = await recordMyVideo({ data: { set_id: setId, seconds: Math.min(120, out.seconds), ext: out.ext, audio: out.audio, facing } }).catch(() => null)
      if (rec?.ok) setVideo(rec.video)
    } catch (e) {
      problem('compose_failed', e instanceof Error ? e.message : String(e))
      setPhase('clips')
    }
  }

  async function save() {
    if (!result) return
    const how = await give(result.blob, fileName(title, result.ext))
    if (how === 'cancelled') return
    setSaved(true)
    ev('sb_video_saved', { how })
    if (video) void markMyVideo({ data: { video_id: video.id, how } }).catch(() => {})
  }

  async function saveClip(i: number) {
    const blob = clips[i]
    if (!blob) return
    await give(blob, fileName(title, blob.type.includes('mp4') ? 'mp4' : 'webm', i + 1))
    problem('clips_saved', String(i + 1))
  }

  if (phase === 'ask' || phase === 'help') {
    return (
      <div className="sb-screen">
        <div className="sb-head"><h1 className="sb-h1">Turn on <b>camera and mic</b></h1><p className="sb-sub">{phase === 'help' ? 'Your camera or mic is off. Turn them on here, then try again.' : 'Your phone will ask twice. Tap Allow both times.'}</p></div>
        <div className="sb-mid">
          {phase === 'ask' ? (
            <>
              <div className="sb-card" style={{ cursor: 'default' }}><b>Camera</b><span>To film your 3 shots</span></div>
              <div className="sb-card" style={{ cursor: 'default' }}><b>Microphone</b><span>To record your voice</span></div>
              <p className="sb-note">You film right here. No other app needed.</p>
            </>
          ) : (
            <>
              <div className="sb-card" style={{ cursor: 'default' }}><p className="src">IPHONE</p><span style={{ color: '#1d1a22', fontSize: 15 }}>Open Settings, find Safari, and set Camera and Microphone to Allow.</span></div>
              <div className="sb-card" style={{ cursor: 'default' }}><p className="src">ANDROID</p><span style={{ color: '#1d1a22', fontSize: 15 }}>Tap the icon beside the web address, then Permissions, and allow Camera and Microphone.</span></div>
            </>
          )}
          {note && <p className="sb-err">{note}</p>}
        </div>
        <div className="sb-foot">
          <button type="button" className="sb-btn" onClick={() => void turnOn()}>{phase === 'help' ? 'Try again' : 'Turn on camera and mic'}</button>
          {phase === 'ask' ? <button type="button" className="sb-quiet" onClick={() => setPhase('help')}>My phone didn’t ask</button> : <button type="button" className="sb-quiet" onClick={() => onDone(null)}>Film it later</button>}
        </div>
      </div>
    )
  }

  if (phase === 'film') {
    return (
      <div className="sb-screen">
        <div className="sb-head"><h1 className="sb-h1">Film <b>shot {shot + 1} of 3</b></h1></div>
        <div className="sb-mid top" style={{ gap: 12 }}>
          <div className="sb-cam">
            <video ref={live} muted playsInline autoPlay style={{ transform: facing === 'front' ? 'scaleX(-1)' : undefined }} />
            <div className="sb-cam-top">
              <div><p className="act">{allIn ? 'All 3 shots are in.' : actions[shot]}</p><p className="tip">{cameraTip(camera, facing)}</p></div>
              <button type="button" className="sb-flip" aria-label={facing === 'front' ? 'Flip to back camera' : 'Flip to front camera'} disabled={recording} onClick={() => void flip()}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 9a8 8 0 0 1 14-3l2 2" /><path d="M20 4v4h-4" /><path d="M20 15a8 8 0 0 1-14 3l-2-2" /><path d="M4 20v-4h4" /></svg>
              </button>
            </div>
            <p className="sb-cam-foot">{recording ? `Recording · ${left}s` : allIn ? 'Ready to make your video' : `Tap the button · up to ${Math.ceil(per)}s`} · Don’t film real customers.</p>
          </div>
          {note && <p className="sb-err">{note}</p>}
          <div className="sb-rec-row">
            <div className="sb-thumbs">{[0, 1, 2].map((k) => <span key={k} className={k < clips.length ? 'on' : ''}>{k < clips.length ? '✓' : k + 1}</span>)}</div>
            <button type="button" className={`sb-rec${recording ? ' on' : ''}`} aria-label={recording ? 'Stop recording' : 'Start recording'} disabled={allIn} onClick={record} />
            <button type="button" className="sb-white" style={{ width: 104, minHeight: 48, fontSize: 15 }} disabled={recording || !clips.length} onClick={redo}>Redo</button>
          </div>
        </div>
        <div className="sb-foot"><button type="button" className="sb-btn" disabled={!allIn || recording} onClick={() => void make()}>{allIn ? 'Make my video' : 'Film all 3 shots first'}</button></div>
      </div>
    )
  }

  if (phase === 'make') {
    return (
      <div className="sb-screen">
        <div className="sb-head"><h1 className="sb-h1">Making <b>your video</b></h1><p className="sb-sub">Keep this screen open. It takes as long as the video.</p></div>
        <div className="sb-mid top"><div className="sb-cam"><canvas ref={canvas} /></div><div ref={host} aria-hidden style={{ position: 'relative', height: 0, overflow: 'hidden' }} /></div>
        <div className="sb-foot"><div className="sb-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><span style={{ width: `${Math.round(progress * 100)}%` }} /></div></div>
      </div>
    )
  }

  if (phase === 'ready' && result) {
    return (
      <div className="sb-screen">
        <div className="sb-head"><h1 className="sb-h1">Your video <b>is ready</b></h1></div>
        <div className="sb-mid top"><div className="sb-cam"><video src={result.url} controls playsInline loop preload="auto" onLoadedMetadata={(e) => { try { e.currentTarget.currentTime = 0.05 } catch { /* the first frame is only a preview */ } }} /></div></div>
        <div className="sb-foot">
          <button type="button" className="sb-btn" style={{ fontSize: 16 }} onClick={() => void save()}>{saved ? 'Saved ✓ · save again' : 'Save for TikTok, Instagram and other apps'}</button>
          <button type="button" className="sb-quiet" onClick={() => onDone(video)}>{saved ? 'Done' : 'Not now'}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="sb-screen">
      <div className="sb-head"><h1 className="sb-h1">Your 3 shots <b>are saved here</b></h1><p className="sb-sub">This phone couldn’t put them together with the words. Save the shots and post them as they are, or try again on another phone.</p></div>
      <div className="sb-mid">{clips.map((_, i) => <button key={i} type="button" className="sb-white" onClick={() => void saveClip(i)}>Save shot {i + 1}</button>)}</div>
      <div className="sb-foot"><button type="button" className="sb-quiet" onClick={() => onDone(null)}>Done</button></div>
    </div>
  )
}
