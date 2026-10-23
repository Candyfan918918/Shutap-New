/* A wait that visibly moves (Oct 22 2026). The old loading cards were
 * static: one bar segment lit and a fixed "a few seconds", so a 15s wait
 * looked frozen. This bar fills on its own every frame (fast at first, then
 * easing toward 95% so it never claims to be done), the named steps advance
 * with it, a seconds counter ticks, and the note changes past the usual
 * time. When the work finishes the parent unmounts this. */
import { useEffect, useState } from 'react'

export function Progress({
  steps,
  expectSec,
  note,
}: {
  /** what is happening, in order; the current one is highlighted */
  steps: string[]
  /** a normal wait, in seconds; the bar is about 2/3 full by then */
  expectSec: number
  /** the note while within the normal wait */
  note?: string
}) {
  const [t, setT] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const id = window.setInterval(() => setT((performance.now() - start) / 1000), 200)
    return () => window.clearInterval(id)
  }, [])

  const fill = 0.95 * (1 - Math.exp(-t / expectSec))
  const step = Math.min(steps.length - 1, Math.floor((fill / 0.95) * steps.length))
  const secs = Math.floor(t)
  const msg =
    t < expectSec
      ? note ?? `usually about ${expectSec} seconds`
      : t < expectSec * 2.5
        ? 'taking a little longer than usual…'
        : 'still working. Slow AI right now, hang on'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="bt-steps" aria-live="polite">
        {steps.map((s, i) => (
          <span key={s} className={`bt-step${i < step ? ' done' : i === step ? ' on' : ''}`}>
            {s}
          </span>
        ))}
      </div>
      <div
        role="progressbar"
        aria-label="Working"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fill * 100)}
        style={{ height: 6, borderRadius: 3, background: 'var(--line-2)', overflow: 'hidden', position: 'relative' }}
      >
        <div
          style={{
            height: '100%',
            width: `${(fill * 100).toFixed(1)}%`,
            background: 'var(--rose)',
            borderRadius: 3,
            transition: 'width 0.2s linear',
          }}
        />
        {/* a light sweep so it reads as alive even while the fill is slow */}
        <div className="bt-sweep" aria-hidden="true" />
      </div>
      <div className="bt-between" style={{ gap: 8 }}>
        <span className="bt-note">{msg}</span>
        <span className="bt-note" style={{ fontVariantNumeric: 'tabular-nums' }}>{secs}s</span>
      </div>
    </div>
  )
}
