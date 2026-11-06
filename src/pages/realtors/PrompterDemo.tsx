/* The teleprompter demo on /realtors (Nov 6 2026): the sample kit's
 * walkthrough in shoot mode, inside a card the size of the sample kit, so a
 * visitor sees what their phone shows while they film. Plays by itself once
 * it is on screen; tap to pause. No camera, no account. */
import { useEffect, useRef, useState } from 'react'
import { SAMPLE_KIT, SAMPLE_LISTING } from '@/lib/realtors/sample-kit'
import { trackEvent } from '@/lib/tracking'

const WPS = 2.4

export function PrompterDemo() {
  const shots = SAMPLE_KIT.walkthrough.shots
  const [idx, setIdx] = useState(0)
  const [running, setRunning] = useState(false)
  const box = useRef<HTMLDivElement | null>(null)
  const scroll = useRef<HTMLDivElement | null>(null)
  const segs = useRef<(HTMLDivElement | null)[]>([])
  const started = useRef(false)

  // start once the card is on screen
  useEffect(() => {
    const el = box.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting) && !started.current) { started.current = true; setRunning(true) }
    }, { threshold: 0.5 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // advance at reading pace, loop at the end
  useEffect(() => {
    if (!running) return
    const words = shots[idx]!.line.split(/\s+/).filter(Boolean).length
    const t = window.setTimeout(() => setIdx((i) => (i + 1) % shots.length), Math.max(1800, (words / WPS) * 1000 + 700))
    return () => window.clearTimeout(t)
  }, [running, idx, shots])

  // keep the lit line in the middle of the card (scroll the card, never the page)
  useEffect(() => {
    const s = scroll.current, seg = segs.current[idx]
    if (!s || !seg) return
    s.scrollTo({ top: seg.offsetTop - s.clientHeight / 2 + seg.clientHeight / 2, behavior: 'smooth' })
  }, [idx])

  return (
    <section ref={box} className="rl-demo-pr" aria-label="Shoot mode, the teleprompter, with the sample kit">
      <div className="rl-demo-pr-top">
        <span>shoot mode · {SAMPLE_LISTING.address} · {idx + 1} of {shots.length}</span>
        <button type="button" onClick={() => { setRunning((r) => !r); void trackEvent('sample_prompter_toggle', { product: 'realtors' }) }}>{running ? 'pause' : 'play'}</button>
      </div>
      <div className="rl-demo-pr-scroll" ref={scroll} onClick={() => setRunning((r) => !r)}>
        {shots.map((s, i) => (
          <div key={i} ref={(el) => { segs.current[i] = el }} className={`rl-demo-pr-seg${i === idx ? ' on' : ''}`}>
            <div className="cue">{i + 1} · {s.where}<small>{s.seconds}s</small></div>
            <p className="act">{s.action}</p>
            <p className="line">{s.line}</p>
          </div>
        ))}
      </div>
      <div className="rl-demo-pr-foot">big text, one line at a time, scrolls by itself · mirror for a glass rig · record with a second phone or a laptop</div>
    </section>
  )
}
