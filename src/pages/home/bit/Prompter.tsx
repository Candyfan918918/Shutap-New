/* The teleprompter: the bit, full screen, dark, big type, scrolling at
 * talking pace so it can be read to camera.
 *
 *   3-2-1 countdown, then it rolls at 2.6 words a second
 *   tap the text to pause or resume; − and + change speed by 0.2
 *   mirror flips the text for a glass rig; restart goes back to the top
 *   the screen is kept awake while it is open (Screen Wake Lock, where the
 *   browser has it — iPhone Safari does from iOS 16.4; an in-app browser
 *   that lacks it just dims on its own schedule)
 *
 * Built on requestAnimationFrame and a transform, which is smooth in
 * iPhone Safari and TikTok's in-app browser alike. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { WORDS_PER_SECOND, bitWords, type BitDraft } from '@/lib/bits/shared'

type WakeLockSentinelLike = { release: () => Promise<void> }

export function Prompter({ bit, onClose }: { bit: Pick<BitDraft, 'hook' | 'setup' | 'tags' | 'button'>; onClose: () => void }) {
  const lines = [bit.hook, bit.setup, ...bit.tags, bit.button].filter(Boolean)
  const words = bitWords(bit)
  const [speed, setSpeed] = useState(WORDS_PER_SECOND)
  const [state, setState] = useState<'ready' | 'counting' | 'rolling' | 'paused' | 'done'>('ready')
  const [count, setCount] = useState(3)
  const [mirror, setMirror] = useState(false)
  const viewRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLDivElement | null>(null)
  const pos = useRef(0)
  const last = useRef(0)
  const raf = useRef(0)
  const speedRef = useRef(speed)
  const mirrorRef = useRef(mirror)
  mirrorRef.current = mirror
  const wake = useRef<WakeLockSentinelLike | null>(null)
  speedRef.current = speed

  const startY = () => (viewRef.current?.clientHeight ?? 600) * 0.36
  const paint = () => {
    if (textRef.current) textRef.current.style.transform = `translateY(${startY() - pos.current}px)${mirrorRef.current ? ' scaleX(-1)' : ''}`
  }

  /* keep the screen awake while the prompter is open */
  const lock = useCallback(async () => {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } }
      if (nav.wakeLock && !wake.current) wake.current = await nav.wakeLock.request('screen')
    } catch { /* not available here */ }
  }, [])
  useEffect(() => {
    void lock()
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        wake.current = null
        void lock()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      document.body.style.overflow = prevOverflow
      void wake.current?.release().catch(() => {})
      wake.current = null
      cancelAnimationFrame(raf.current)
    }
  }, [lock])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(paint, [mirror])
  useEffect(() => {
    const onResize = () => paint()
    window.addEventListener('resize', onResize)
    paint()
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const frame = useCallback((t: number) => {
    const dt = Math.min(0.1, (t - last.current) / 1000)
    last.current = t
    const height = textRef.current?.scrollHeight ?? 1
    const pxPerWord = height / Math.max(1, words)
    pos.current += pxPerWord * speedRef.current * dt
    paint()
    if (pos.current >= height - 40) {
      setState('done')
      return
    }
    raf.current = requestAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words])

  function roll() {
    last.current = performance.now()
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(frame)
    setState('rolling')
  }

  function start() {
    setState('counting')
    setCount(3)
    let n = 3
    const iv = window.setInterval(() => {
      n -= 1
      if (n <= 0) {
        window.clearInterval(iv)
        roll()
      } else setCount(n)
    }, 800)
  }

  function toggle() {
    if (state === 'ready' || state === 'done') {
      if (state === 'done') restart()
      start()
    } else if (state === 'rolling') {
      cancelAnimationFrame(raf.current)
      setState('paused')
    } else if (state === 'paused') roll()
  }

  function restart() {
    cancelAnimationFrame(raf.current)
    pos.current = 0
    paint()
    setState('ready')
  }

  const nudge = (d: number) => setSpeed((s) => Math.max(1, Math.min(5, Math.round((s + d) * 10) / 10)))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === ' ') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const label =
    state === 'rolling' ? 'pause' : state === 'paused' ? 'resume' : state === 'done' ? 'again' : state === 'counting' ? '…' : 'start'

  return createPortal(
    <div className="bt-stage" role="dialog" aria-modal="true" aria-label="Teleprompter">
      <div className="bt-between">
        <span className="bt-lbl" style={{ color: '#b9a7ae' }}>
          teleprompter · ~{Math.round(words / speed)}s at this pace
        </span>
        <button className="bt-stage-btn" onClick={onClose}>
          close
        </button>
      </div>
      <div className="bt-stage-view" ref={viewRef} onClick={toggle} aria-live="off">
        <div className="bt-stage-guide" aria-hidden="true" />
        <div className="bt-stage-text" ref={textRef}>
          {lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
        {state === 'counting' && (
          <div className="bt-stage-count" aria-live="assertive">
            {count}
          </div>
        )}
        {(state === 'paused' || state === 'done') && (
          <div className="bt-stage-hint">{state === 'paused' ? 'paused · tap to resume' : 'that was the button · tap to go again'}</div>
        )}
      </div>
      <div className="bt-stage-ctrl">
        <button className="bt-stage-btn" aria-label="slower" onClick={() => nudge(-0.2)}>
          −
        </button>
        <button className="bt-stage-btn go" onClick={toggle} disabled={state === 'counting'}>
          {label}
        </button>
        <button className="bt-stage-btn" aria-label="faster" onClick={() => nudge(0.2)}>
          +
        </button>
        <button className="bt-stage-btn" aria-pressed={mirror} onClick={() => setMirror((m) => !m)}>
          mirror
        </button>
        <button className="bt-stage-btn" onClick={restart}>
          restart
        </button>
      </div>
      <p className="bt-note" style={{ textAlign: 'center', color: '#a3969c' }}>
        {speed.toFixed(1)} words a second{mirror ? ' · mirrored' : ''}
      </p>
    </div>,
    document.body,
  )
}
