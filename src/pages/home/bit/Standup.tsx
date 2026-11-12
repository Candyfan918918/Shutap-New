/* Stand-up: the bit on the teleprompter, full screen, dark, big type, scrolling at
 * talking pace so it can be read to camera.
 *
 *   3-2-1 countdown, then it rolls at 2.6 words a second
 *   tap the text to pause or resume; − and + change speed by 0.2
 *   mirror flips the text for a glass rig; restart goes back to the top
 *   delivery cues (Nov 11 2026): the sketch's parentheticals, pinned to the
 *   lines they belong to ("(beat)", "(his voice)"); the scroll holds
 *   PAUSE_MS at a pause cue; "cues" hides them. Only on the person's own
 *   bit (bitId + versionId), since the sketch is theirs; the feed has none.
 *   the screen is kept awake while it is open (Screen Wake Lock, where the
 *   browser has it — iPhone Safari does from iOS 16.4; an in-app browser
 *   that lacks it just dims on its own schedule)
 *
 * Built on requestAnimationFrame and a transform, which is smooth in
 * iPhone Safari and TikTok's in-app browser alike. */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useServerFn } from '@tanstack/react-start'
import { WORDS_PER_SECOND, bitWords, type BitDraft, type SketchElement } from '@/lib/bits/shared'
import { PAUSE_MS, cuesForLines } from '@/lib/bits/cues'
import { getSketch } from '@/lib/bits.functions'
import { trackEvent } from '@/lib/tracking'
import { anonSessionId } from '../joke/jokeClient'
import './bit.css'

type WakeLockSentinelLike = { release: () => Promise<void> }

const QUOTE = /["“]/

export function Standup({
  bit,
  onClose,
  bitId,
  versionId,
}: {
  bit: Pick<BitDraft, 'hook' | 'setup' | 'tags' | 'button'>
  onClose: () => void
  /** the person's own bit: its sketch supplies the delivery cues */
  bitId?: string
  versionId?: string
}) {
  const lines = [bit.hook, bit.setup, ...bit.tags, bit.button].filter(Boolean)
  const words = bitWords(bit)
  const sketchFn = useServerFn(getSketch)
  const [sketch, setSketch] = useState<{ state: 'off' | 'loading' | 'ok'; data: SketchElement[] | null }>({ state: bitId && versionId ? 'loading' : 'off', data: null })
  const [cuesOn, setCuesOn] = useState(true)
  const [holding, setHolding] = useState('')
  const cues = useMemo(() => cuesForLines(lines, sketch.data), [sketch.data, lines.join('\n')]) // eslint-disable-line react-hooks/exhaustive-deps
  const hasCues = cues.some((c) => c.length > 0)
  const holds = cuesOn ? cues.flat().filter((c) => c.hold).length : 0
  const holdUntil = useRef(0)
  useEffect(() => {
    if (!bitId || !versionId) return
    let live = true
    sketchFn({ data: { bit_id: bitId, version_id: versionId, anon_session_id: anonSessionId() } })
      .then((r: { ok: boolean; data?: SketchElement[] }) => live && setSketch({ state: 'ok', data: r.ok ? (r.data ?? null) : null }))
      .catch(() => live && setSketch({ state: 'ok', data: null }))
    return () => {
      live = false
    }
  }, [bitId, versionId, sketchFn])
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
    if (holdUntil.current) {
      if (t < holdUntil.current) {
        raf.current = requestAnimationFrame(frame)
        return
      }
      holdUntil.current = 0
      setHolding('')
    }
    const height = textRef.current?.scrollHeight ?? 1
    const pxPerWord = height / Math.max(1, words)
    const before = pos.current
    pos.current += pxPerWord * speedRef.current * dt
    // a pause cue reaching the guide holds the scroll there
    const hit = Array.from(textRef.current?.querySelectorAll<HTMLElement>('[data-hold]') ?? []).find((el) => el.offsetTop > before && el.offsetTop <= pos.current)
    if (hit) {
      pos.current = hit.offsetTop
      holdUntil.current = t + PAUSE_MS
      setHolding(hit.dataset.hold ?? '')
    }
    paint()
    if (pos.current >= height - 40) {
      setState('done')
      return
    }
    raf.current = requestAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words])

  function roll() {
    holdUntil.current = 0
    setHolding('')
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
    holdUntil.current = 0
    setHolding('')
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
    <div data-ph-private className="bt-stage" role="dialog" aria-modal="true" aria-label="Stand-up teleprompter">
      <div className="bt-between">
        <span className="bt-lbl" style={{ color: '#b9a7ae' }}>
          stand-up · ~{Math.round(words / speed + (holds * PAUSE_MS) / 1000)}s {holds ? 'with pauses' : 'at this pace'}
        </span>
        <button className="bt-stage-btn" onClick={onClose}>
          close
        </button>
      </div>
      <div className="bt-stage-view" ref={viewRef} onClick={toggle} aria-live="off">
        <div className="bt-stage-guide" aria-hidden="true" />
        <div className="bt-stage-text" ref={textRef}>
          {lines.map((l, i) => {
            const mine = cuesOn ? cues[i] ?? [] : []
            const voice = mine.find((c) => c.voice)
            const q = voice ? l.search(QUOTE) : -1
            return (
              <Fragment key={i}>
                {mine
                  .filter((c) => !c.voice)
                  .map((c, j) => (
                    <p key={j} className="bt-stage-cue" data-hold={c.hold ? `${i}.${j}` : undefined}>
                      {c.text}
                      {holding === `${i}.${j}` && <span className="bt-stage-holding">holding</span>}
                    </p>
                  ))}
                <p>
                  {q >= 0 ? (
                    <>
                      {l.slice(0, q)}
                      <span className="bt-stage-cue in">{voice!.text}</span> {l.slice(q)}
                    </>
                  ) : (
                    l
                  )}
                </p>
              </Fragment>
            )
          })}
        </div>
        {sketch.state === 'loading' && (
          <div className="bt-stage-hint top">
            <span aria-hidden="true" className="dot" />
            adding delivery cues · about 10s
          </div>
        )}
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
        {(hasCues || sketch.state === 'loading') && (
          <button
            className="bt-stage-btn"
            aria-pressed={cuesOn}
            disabled={sketch.state === 'loading'}
            onClick={() => {
              setCuesOn((c) => !c)
              void trackEvent('standup_cues_toggled', { on: !cuesOn })
            }}
          >
            cues
          </button>
        )}
      </div>
      <p className="bt-note" style={{ textAlign: 'center', color: '#a3969c' }}>
        {speed.toFixed(1)} words a second{mirror ? ' · mirrored' : ''}
        {sketch.state === 'loading' ? ' · start any time, cues drop in when ready' : hasCues && cuesOn ? ' · cues from the sketch' : ''}
      </p>
    </div>,
    document.body,
  )
}
