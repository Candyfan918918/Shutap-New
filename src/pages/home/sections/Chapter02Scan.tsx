/* Section: Chapter02Scan — text column unchanged; demo card is a scripted,
 * self-playing React sample of the real Scan flow: choice → spectrum →
 * scanning → result. No AI, no DB. Pauses off-screen; prefers-reduced-motion
 * shows the final result static. */
import { useEffect, useRef, useState } from 'react'

const SORA = "'Sora',sans-serif"
const NEWS = "'Newsreader',serif"

function bandColor(v: number) {
  if (v < 200) return '#6f666c'
  if (v < 400) return '#7F77DD'
  if (v < 600) return '#c87c4a'
  if (v < 800) return '#2b2630'
  return '#17131a'
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const set = () => setReduced(mq.matches)
    set()
    mq.addEventListener('change', set)
    return () => mq.removeEventListener('change', set)
  }, [])
  return reduced
}

function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [threshold])
  return { ref, inView }
}

type ScanS = {
  phase: 1 | 2 | 3 | 4
  bar: number
  thumb: number
  picked: boolean
  score: number
}

const INIT: ScanS = { phase: 1, bar: 24, thumb: 50, picked: false, score: 0 }
const FINAL: ScanS = { phase: 4, bar: 100, thumb: 80, picked: true, score: 740 }

function ScanCard() {
  const reduced = usePrefersReducedMotion()
  const { ref, inView } = useInView<HTMLDivElement>(0.15)
  const [s, setS] = useState<ScanS>(INIT)

  useEffect(() => {
    if (reduced) {
      setS(FINAL)
      return
    }
    if (!inView) return
    let cancelled = false
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => {
      const id = window.setTimeout(() => {
        if (!cancelled) fn()
      }, ms)
      timers.push(id)
    }
    const countUp = (from: number, to: number, ms: number) => {
      const start = performance.now()
      const tick = (now: number) => {
        if (cancelled) return
        const t = Math.min(1, (now - start) / ms)
        const eased = 1 - Math.pow(1 - t, 3)
        const v = Math.round(from + (to - from) * eased)
        setS((p) => ({ ...p, score: v }))
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    const run = () => {
      setS(INIT)
      at(280, () => setS((p) => ({ ...p, picked: true })))
      at(580, () => setS((p) => ({ ...p, phase: 2, bar: 46 })))
      at(760, () => setS((p) => ({ ...p, thumb: 80 })))
      at(1140, () => setS((p) => ({ ...p, phase: 3, bar: 72 })))
      at(1540, () => {
        setS((p) => ({ ...p, phase: 4, bar: 100 }))
        countUp(0, 740, 300)
      })
      at(2680, () => {
        if (!cancelled) run()
      })
    }
    run()
    return () => {
      cancelled = true
      timers.forEach((id) => clearTimeout(id))
    }
  }, [inView, reduced])

  const color = bandColor(s.score)

  return (
    <div
      ref={ref}
      style={{
        width: 'min(420px,100%)',
        background: 'linear-gradient(170deg,#1a1226,#100c14 72%)',
        border: '1px solid rgba(90,90,95,.28)',
        borderRadius: '26px',
        padding: '26px 26px 22px',
        boxShadow: '0 40px 100px -40px rgba(90,90,95,.55), 0 20px 60px -20px rgba(0,0,0,.7)',
      }}
    >
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <span
          style={{
            fontFamily: SORA,
            fontWeight: 800,
            fontSize: '13px',
            letterSpacing: '.3em',
            color: '#7F77DD',
            flex: 'none',
          }}
        >
          SCAN
        </span>
        <div
          style={{
            flex: 1,
            height: '6px',
            borderRadius: '3px',
            background: 'rgba(255,255,255,.10)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${s.bar}%`,
              height: '100%',
              borderRadius: '3px',
              background: 'linear-gradient(90deg,#5B8A5E,#7F77DD)',
              boxShadow: '0 0 12px rgba(90,90,95,.55)',
              transition: 'width .16s cubic-bezier(.16,1,.3,1)',
            }}
          />
        </div>
        <span style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: '12px', color: '#6f666c', flex: 'none' }}>
          sample
        </span>
      </div>

      {/* stage */}
      <div style={{ position: 'relative', height: '678px' }}>
        {/* phase 1 — choice */}
        <Phase active={s.phase === 1}>
          <PhaseHead reaction="ok — so it's her, and it's been sitting a while." prompt="where do you feel it first?" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            {['my chest goes tight', 'my head starts spinning', 'i go completely numb'].map((opt, i) => {
              const isPicked = i === 0 && s.picked
              return (
                <div
                  key={opt}
                  style={{
                    border: `1px solid ${isPicked ? '#7F77DD' : 'rgba(90,90,95,.22)'}`,
                    background: isPicked ? '#7F77DD' : 'rgba(90,90,95,.06)',
                    borderRadius: '16px',
                    padding: '15px 18px',
                    fontFamily: SORA,
                    fontWeight: 600,
                    fontSize: '15.5px',
                    color: isPicked ? '#fff' : '#ece6f5',
                    transform: isPicked ? 'translateX(6px)' : 'translateX(0)',
                    boxShadow: isPicked ? '0 10px 30px -10px rgba(90,90,95,.6)' : 'none',
                    transition: 'background .3s, border-color .3s, transform .3s, color .3s, box-shadow .3s',
                  }}
                >
                  {opt}
                </div>
              )
            })}
          </div>
        </Phase>

        {/* phase 2 — spectrum */}
        <Phase active={s.phase === 2}>
          <PhaseHead reaction="yeah. that tracks." prompt="how loud is it right now?" />
          <div style={{ marginTop: '30px', padding: '0 6px' }}>
            <div
              style={{
                position: 'relative',
                height: '10px',
                borderRadius: '999px',
                background: 'linear-gradient(90deg,rgba(90,90,95,.4),rgba(23,19,26,.5))',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: `${s.thumb}%`,
                  transform: 'translate(-50%,-50%)',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: '#fff',
                  border: '3px solid #7F77DD',
                  boxShadow: '0 6px 18px -4px rgba(0,0,0,.5)',
                  transition: 'left .28s cubic-bezier(.16,1,.3,1)',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px' }}>
              <span style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: '13px', color: '#6f666c' }}>a low hum</span>
              <span style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: '13px', color: '#2b2630' }}>deafening</span>
            </div>
          </div>
        </Phase>

        {/* phase 3 — scanning */}
        <Phase active={s.phase === 3}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '18px',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '160px',
                height: '160px',
                borderRadius: '24px',
                border: '1px solid rgba(90,90,95,.35)',
                boxShadow: '0 0 40px -8px rgba(90,90,95,.55)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(90,90,95,.05)',
              }}
            >
              <svg viewBox="0 0 56 56" fill="none" style={{ width: '40px', height: '40px', position: 'relative', zIndex: 2 }}>
                <rect x="15.25" y="16" width="11.5" height="24" rx="5.75" fill="url(#eyeG2)" />
                <rect x="29.25" y="16" width="11.5" height="24" rx="5.75" fill="url(#eyeG2)" />
                <ellipse cx="21" cy="29" rx="4" ry="5" fill="url(#pupG2)" />
                <ellipse cx="35" cy="29" rx="4" ry="5" fill="url(#pupG2)" />
              </svg>
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: '40%',
                  background: 'linear-gradient(180deg, transparent, rgba(90,90,95,.25), transparent)',
                  animation: 'scanbeam 1.1s ease-in-out infinite',
                }}
              />
            </div>
            <div style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: '15px', color: '#c6c0ef' }}>reading that</div>
            <div style={{ display: 'flex', gap: '7px' }}>
              {[0, 0.2, 0.4].map((d, i) => (
                <span
                  key={i}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#7F77DD',
                    animation: `breathe 1.2s ease-in-out ${d}s infinite`,
                    display: 'block',
                  }}
                />
              ))}
            </div>
          </div>
          <style>{`@keyframes scanbeam { 0% { top: -40%; } 100% { top: 100%; } }`}</style>
        </Phase>

        {/* phase 4 — result */}
        <Phase active={s.phase === 4}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: SORA,
                  fontWeight: 800,
                  fontSize: 'clamp(54px,12vw,74px)',
                  lineHeight: 1,
                  letterSpacing: '-.04em',
                  color,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {s.score}
              </div>
              <div
                style={{
                  fontFamily: SORA,
                  fontWeight: 700,
                  fontSize: '12px',
                  letterSpacing: '.18em',
                  textTransform: 'uppercase',
                  color,
                  marginTop: '6px',
                }}
              >
                intensity
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
              <span
                style={{
                  fontFamily: SORA,
                  fontWeight: 600,
                  fontSize: '10.5px',
                  color: '#2b2630',
                  background: 'rgba(23,19,26,.13)',
                  border: '.5px solid rgba(23,19,26,.3)',
                  borderRadius: '999px',
                  padding: '4px 11px',
                }}
              >
                relationships
              </span>
              {['still looping', 'not said out loud'].map((c) => (
                <span
                  key={c}
                  style={{
                    fontFamily: SORA,
                    fontWeight: 600,
                    fontSize: '10.5px',
                    color: '#b9a9e6',
                    background: 'rgba(90,90,95,.14)',
                    borderRadius: '999px',
                    padding: '4px 11px',
                  }}
                >
                  {c}
                </span>
              ))}
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(255,255,255,.10)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'center',
              }}
            >
              <svg viewBox="0 0 56 56" fill="none" style={{ width: '28px', height: '28px' }}>
                <rect x="15.25" y="16" width="11.5" height="24" rx="5.75" fill="url(#eyeG2)" />
                <rect x="29.25" y="16" width="11.5" height="24" rx="5.75" fill="url(#eyeG2)" />
                <ellipse cx="21" cy="29" rx="4" ry="5" fill="url(#pupG2)" />
                <ellipse cx="35" cy="29" rx="4" ry="5" fill="url(#pupG2)" />
              </svg>
              <div style={{ fontFamily: SORA, fontWeight: 800, fontSize: '20px', color: '#fdfbf9' }}>
                Carrying It Loud
              </div>
              <div style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: '15px', color: '#bdb8bb', lineHeight: 1.5 }}>
                the part that hurts is how unseen it makes you feel — and you keep showing up anyway.
              </div>
            </div>

            <div
              style={{
                fontFamily: NEWS,
                fontStyle: 'italic',
                fontSize: '14px',
                color: '#6f666c',
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              this is your read. keep it just for you, or let a room hold your number too.
            </div>

            <div
              style={{
                background: 'rgba(23,19,26,.08)',
                border: '1px solid rgba(23,19,26,.25)',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <svg viewBox="0 0 56 56" fill="none" style={{ width: '24px', height: '24px', flex: 'none' }}>
                <rect x="15.25" y="16" width="11.5" height="24" rx="5.75" fill="url(#eyeG2)" />
                <rect x="29.25" y="16" width="11.5" height="24" rx="5.75" fill="url(#eyeG2)" />
                <ellipse cx="21" cy="29" rx="4" ry="5" fill="url(#pupG2)" />
                <ellipse cx="35" cy="29" rx="4" ry="5" fill="url(#pupG2)" />
              </svg>
              <div
                style={{
                  flex: 1,
                  fontFamily: NEWS,
                  fontStyle: 'italic',
                  fontSize: '13px',
                  color: '#dedede',
                  lineHeight: 1.45,
                }}
              >
                this is one moment. i'm holding the whole pattern — every scan adds to the picture of you.
              </div>
              <span
                style={{
                  fontFamily: SORA,
                  fontWeight: 700,
                  fontSize: '12.5px',
                  color: '#e2dde0',
                  flex: 'none',
                }}
              >
                see your mirror →
              </span>
            </div>

            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                background: 'linear-gradient(120deg,#d6d0d4,#17131a)',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                padding: '13px 16px',
                fontFamily: SORA,
                fontWeight: 700,
                fontSize: '13.5px',
                letterSpacing: '.04em',
                cursor: 'default',
                boxShadow: '0 20px 40px -18px rgba(23,19,26,.65)',
              }}
            >
              <span>+</span> share your score
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div
                style={{
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid rgba(255,255,255,.10)',
                  borderRadius: '12px',
                  padding: '11px 12px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: SORA,
                    fontWeight: 700,
                    fontSize: '10.5px',
                    letterSpacing: '.14em',
                    textTransform: 'uppercase',
                    color: '#fdfbf9',
                  }}
                >
                  keep private
                </div>
                <div style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: '11.5px', color: '#6f666c', marginTop: '3px' }}>
                  yours alone. saved to your journal.
                </div>
              </div>
              <div
                style={{
                  background: 'rgba(23,19,26,.10)',
                  border: '1px solid #2b2630',
                  borderRadius: '12px',
                  padding: '11px 12px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: SORA,
                    fontWeight: 700,
                    fontSize: '10.5px',
                    letterSpacing: '.14em',
                    textTransform: 'uppercase',
                    color: '#e2dde0',
                  }}
                >
                  post to a room
                </div>
                <div style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: '11.5px', color: '#bdb8bb', marginTop: '3px' }}>
                  let a room hold your number too.
                </div>
              </div>
            </div>
          </div>
        </Phase>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px', opacity: 0.6 }}>
        <span
          style={{
            fontFamily: SORA,
            fontWeight: 800,
            fontSize: '8.5px',
            letterSpacing: '.28em',
            color: '#bdb8bb',
          }}
        >
          SHUTAP · THE SCAN
        </span>
      </div>
    </div>
  )
}

function Phase({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        opacity: active ? 1 : 0,
        transition: 'opacity .1s',
        pointerEvents: 'none',
      }}
    >
      {children}
    </div>
  )
}

function PhaseHead({ reaction, prompt }: { reaction: string; prompt: string }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <svg viewBox="0 0 56 56" fill="none" style={{ width: '26px', height: '26px', flex: 'none' }}>
          <rect x="15.25" y="16" width="11.5" height="24" rx="5.75" fill="url(#eyeG2)" />
          <rect x="29.25" y="16" width="11.5" height="24" rx="5.75" fill="url(#eyeG2)" />
          <ellipse cx="21" cy="29" rx="4" ry="5" fill="url(#pupG2)" />
          <ellipse cx="35" cy="29" rx="4" ry="5" fill="url(#pupG2)" />
        </svg>
        <span style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: '14.5px', color: '#b3a0d0' }}>{reaction}</span>
      </div>
      <div
        style={{
          fontFamily: SORA,
          fontWeight: 800,
          fontSize: 'clamp(22px,5vw,30px)',
          lineHeight: 1.18,
          letterSpacing: '-.03em',
          color: '#fdfbf9',
          marginTop: '14px',
        }}
      >
        {prompt}
      </div>
    </>
  )
}

export function Chapter02Scan() {
  return (
    <section
      data-screen-label="02 Scan"
      data-theme="dark"
      className="chsec"
      style={{
        position: 'relative',
        minHeight: '100vh',
        scrollSnapAlign: 'start',
        background: 'linear-gradient(165deg,#241d47,#151030 60%,#100c14)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <div className="chgrid rev">
        <div data-rv="pop" data-democard="" style={{ display: 'flex', justifyContent: 'center' }}>
          <ScanCard />
        </div>

        <div data-rv="swipe-r">
          <div
            style={{
              fontFamily: SORA,
              fontWeight: 700,
              fontSize: '12px',
              letterSpacing: '.24em',
              textTransform: 'uppercase',
              color: '#aaa3e8',
              marginBottom: '22px',
            }}
          >
            chapter 01 — scan it
          </div>
          <h2
            data-words=""
            style={{
              fontFamily: SORA,
              fontWeight: 800,
              fontSize: 'clamp(38px,5vw,68px)',
              lineHeight: 1.05,
              letterSpacing: '-.045em',
              margin: '0 0 24px',
              color: '#fff',
            }}
          >
            how heavy is it,{' '}
            <em style={{ fontFamily: NEWS, fontStyle: 'italic', fontWeight: 400, color: '#aaa3e8' }}>really?</em>
          </h2>
          <p
            style={{
              fontFamily: NEWS,
              fontStyle: 'italic',
              fontSize: 'clamp(16px,1.4vw,20px)',
              lineHeight: 1.6,
              color: '#c6c0ef',
              maxWidth: '44ch',
              margin: '0 0 32px',
            }}
          >
            a 60-second read. the companion asks, you answer, and you get a private intensity score — before you decide
            whether the world gets to sit in.
          </p>
          <a
            href="#scan"
            data-cta="scan"
            data-hover=""
            data-mag=""
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              fontFamily: SORA,
              fontWeight: 700,
              fontSize: '15px',
              color: '#100c14',
              background: '#fff',
              borderRadius: '999px',
              padding: '16px 30px',
              transition: 'background .3s',
            }}
          >
            scan it →
          </a>
        </div>
      </div>
    </section>
  )
}
