// Chapter 02 — "the scan · sample". 4-phase loop inside a 330px stage.
import { useEffect, useRef, useState } from 'react'
import { useOnScreen, usePrefersReducedMotion } from '../hero/Mascot'
import { useReactiveCard, useMagnetic } from '@/components/motion'
import { EyeMark } from '@/components/brand/EyeMark'

const SORA = "'Sora',system-ui,sans-serif"
const NEWS = "'Newsreader',Georgia,serif"

const PHASE_TIMES = [0, 2300, 4600, 6500, 12200] // start of P1..P4, then restart

export function Chapter02Scan({ onCtaScan }: { onCtaScan: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const onScreen = useOnScreen(ref, 0.15)
  const reduce = usePrefersReducedMotion()
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(reduce ? 3 : 0)
  const [dialProgress, setDialProgress] = useState(reduce ? 1 : 0)
  const [counter, setCounter] = useState(reduce ? 740 : 0)
  const card = useReactiveCard({ glow: 'rgba(23,19,26,.55)' })
  const magneticCta = useMagnetic<HTMLButtonElement>()

  useEffect(() => {
    if (reduce || !onScreen) return
    const timers: number[] = []
    const cycle = () => {
      setPhase(0); setDialProgress(0); setCounter(0)
      timers.push(window.setTimeout(() => setPhase(1), PHASE_TIMES[1]))
      timers.push(window.setTimeout(() => setPhase(2), PHASE_TIMES[2]))
      timers.push(window.setTimeout(() => {
        setPhase(3)
        // sweep dial 0->1 over 1.6s (kick a rAF)
        const start = performance.now()
        const step = (now: number) => {
          const p = Math.min(1, (now - start) / 1600)
          const eased = 1 - Math.pow(1 - p, 3)
          setDialProgress(eased)
          setCounter(Math.round(eased * 740))
          if (p < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }, PHASE_TIMES[3]))
    }
    cycle()
    const iv = window.setInterval(cycle, PHASE_TIMES[4])
    timers.push(iv)
    return () => {
      timers.forEach((h) => { window.clearTimeout(h); window.clearInterval(h) })
    }
  }, [onScreen, reduce])

  return (
    <section
      ref={ref}
      className="home-chapter"
      style={{
        position: 'relative',
        background: 'linear-gradient(165deg,#241d47 0%,#151030 60%,#100c14)',
        minHeight: '96vh',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        color: '#fdfbf9',
      }}
    >
      <div className="home-grid-2" style={{ maxWidth: 1280, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 'clamp(34px,6vw,90px)', padding: 'clamp(90px,12vh,150px) clamp(20px,4vw,32px)', alignItems: 'center' }}>
        <div style={{ order: 2 }}>
          <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', color: '#aaa3e8', marginBottom: 22 }}>
            chapter 02 — scan it
          </div>
          <h2 style={{ fontFamily: SORA, fontWeight: 800, fontSize: 'clamp(30px,3.8vw,54px)', lineHeight: 1.08, letterSpacing: '-.04em', margin: '0 0 24px', color: '#fff' }}>
            how heavy is it, <em style={{ fontFamily: NEWS, fontStyle: 'italic', color: '#aaa3e8', fontWeight: 400 }}>really?</em>
          </h2>
          <p style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 'clamp(16px,1.4vw,20px)', lineHeight: 1.6, color: '#c6c0ef', maxWidth: '44ch', margin: '0 0 32px' }}>
            a 60-second read. the companion asks, you answer, and you get a private intensity score — before you decide whether the world gets to sit in.
          </p>
          <button
            type="button"
            ref={magneticCta}
            onClick={onCtaScan}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: '#fff',
              color: '#100c14',
              border: 0,
              padding: '16px 30px',
              borderRadius: 999,
              fontFamily: SORA,
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            scan it →
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', order: 1 }}>
          <div
            ref={card.ref}
            style={{
              width: 'min(330px,88vw)',
              background: 'linear-gradient(170deg,#1b1b1b,#101010 70%)',
              border: '1px solid rgba(23,19,26,.35)',
              borderRadius: 24,
              padding: '24px 22px 20px',
              boxShadow: '0 40px 90px -40px rgba(0,0,0,.7)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(23,19,26,.16)', color: '#e2dde0', border: '.5px solid rgba(23,19,26,.3)', borderRadius: 999, padding: '4px 12px', fontFamily: SORA, fontWeight: 600, fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                relationships
              </span>
              <span style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 12.5, color: '#6f666c' }}>
                the scan · sample
              </span>
            </div>

            <div style={{ minHeight: 330, position: 'relative' }}>
              {(phase === 0 || phase === 1) && (
                <ScanQuestion
                  n={phase === 0 ? 2 : 3}
                  question={phase === 0 ? 'when it flares up, where do you feel it first?' : 'how often does it visit you?'}
                  options={
                    phase === 0
                      ? ['my chest goes tight', 'a knot in my stomach', 'my head starts racing']
                      : ['most days', 'a few times a week', 'now and then']
                  }
                  highlight={0}
                />
              )}
              {phase === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16 }}>
                  <EyeMark size={46} />
                  <div style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 16.5, color: '#c6c0ef' }}>reading the weight of it…</div>
                  <div style={{ display: 'inline-flex', gap: 7 }}>
                    <span className="home-breathe-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#7F77DD' }} />
                    <span className="home-breathe-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#7F77DD', animationDelay: '.2s' }} />
                    <span className="home-breathe-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#7F77DD', animationDelay: '.4s' }} />
                  </div>
                </div>
              )}
              {phase === 3 && <ScanDial value={counter} progress={dialProgress} />}
            </div>

            <div style={{ marginTop: 10, opacity: .6, textAlign: 'center', fontFamily: SORA, fontWeight: 800, fontSize: 8.5, letterSpacing: '.28em', color: '#bdb8bb' }}>
              SHUTAP · THE SCAN
            </div>
            {card.decor}
          </div>
        </div>
      </div>
    </section>
  )
}


function ScanQuestion({ n, question, options, highlight }: { n: number; question: string; options: string[]; highlight: number }) {
  const reduce = usePrefersReducedMotion()
  const [hi, setHi] = useState<number>(reduce ? highlight : -1)
  useEffect(() => {
    if (reduce) return
    const t = window.setTimeout(() => setHi(highlight), 1300)
    return () => window.clearTimeout(t)
  }, [reduce, highlight, n])
  return (
    <div>
      <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: '#8d86c9', marginBottom: 10 }}>
        question {n} of 6
      </div>
      <div style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 20, lineHeight: 1.45, color: '#fdfbf9', marginBottom: 18 }}>
        {question}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {options.map((o, i) => {
          const active = i === hi
          return (
            <div
              key={i}
              style={{
                display: 'block',
                fontFamily: NEWS,
                fontStyle: 'italic',
                fontSize: 14.5,
                padding: '11px 14px',
                border: '1px solid ' + (active ? '#aaa3e8' : 'rgba(255,255,255,.14)'),
                background: active ? 'rgba(90,90,95,.25)' : 'rgba(255,255,255,.05)',
                borderRadius: 14,
                color: active ? '#fff' : '#e9e4f6',
                transform: active ? 'scale(1.03)' : 'scale(1)',
                transition: 'background .35s, border-color .35s, transform .35s',
              }}
            >
              {o}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ScanDial({ value, progress }: { value: number; progress: number }) {
  const size = 196
  const r = 84
  const c = 2 * Math.PI * r
  const dash = c * progress
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 300, justifyContent: 'center' }}>
      <div style={{ position: 'relative', display: 'grid', placeItems: 'center', margin: '2px 0' }}>
        <svg width={size} height={size} viewBox={`0 0 200 200`} style={{ width: '60%', maxWidth: 196, transform: 'rotate(-90deg)' }}>
          <circle cx={100} cy={100} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={10} />
          <circle
            cx={100}
            cy={100}
            r={r}
            fill="none"
            stroke="#2b2630"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            style={{ filter: 'drop-shadow(0 0 8px rgba(23,19,26,.6))', transition: 'stroke-dasharray .1s linear' }}
          />
        </svg>
        <div style={{ position: 'absolute', textAlign: 'center' }}>
          <div style={{ fontFamily: SORA, fontWeight: 800, fontSize: 52, letterSpacing: '-.04em', color: '#2b2630', lineHeight: .9, fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </div>
          <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: '#6f666c', marginTop: 5 }}>
            of 999 · heavy &amp; loud
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: SORA, fontWeight: 800, fontSize: 20, color: '#fdfbf9', lineHeight: 1.15 }}>Carrying It Loud</div>
        <div style={{ marginTop: 6, fontFamily: NEWS, fontStyle: 'italic', fontSize: 13.5, lineHeight: 1.5, color: '#bdb8bb' }}>
          the part that hurts is how unseen it makes you feel — and you keep showing up anyway.
        </div>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'linear-gradient(90deg,#6f666c,#7F77DD,#c87c4a,#2b2630,#17131a)', position: 'relative' }}>
        <span style={{ position: 'absolute', left: `${100 * progress}%`, top: '50%', width: 13, height: 13, borderRadius: '50%', background: '#fff', border: '3px solid #2b2630', transform: 'translate(-50%,-50%)' }} />
      </div>
    </div>
  )
}
