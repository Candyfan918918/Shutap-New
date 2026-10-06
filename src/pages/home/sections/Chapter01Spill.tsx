/* Section: Chapter01Spill — text column unchanged; demo card is a scripted,
 * self-playing React sample of the real Spill interview → preview flow.
 * No AI, no DB. Pauses off-screen; prefers-reduced-motion shows preview static. */
import { useEffect, useRef, useState } from 'react'

const SORA = "'Sora',sans-serif"
const NEWS = "'Newsreader',serif"

const turns = [
  {
    dots: 2,
    reaction: 'a month of carrying that alone — god.',
    question: 'what did it feel like the second she said it?',
    answer: 'like the floor moved. i just went quiet.',
  },
  {
    dots: 4,
    reaction: "and you still haven't said it out loud.",
    question: 'who in your life could you even tell?',
    answer: "no one who knows us. that's the whole problem.",
  },
] as const

type S = { phase: 'A' | 'B'; turn: 0 | 1; typed: number; dots: number }

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
    const io = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { threshold },
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [threshold])
  return { ref, inView }
}

function SpillCard({ alias, pillar }: { alias?: string; pillar?: string }) {
  const reduced = usePrefersReducedMotion()
  const { ref, inView } = useInView<HTMLDivElement>(0.15)
  const [s, setS] = useState<S>({ phase: 'A', turn: 0, typed: 0, dots: 0 })

  useEffect(() => {
    if (reduced) {
      setS({ phase: 'B', turn: 1, typed: turns[1].answer.length, dots: 8 })
      return
    }
    if (!inView) return
    let cancelled = false
    const timers: number[] = []
    const wait = (ms: number) =>
      new Promise<void>((r) => {
        const id = window.setTimeout(() => r(), ms)
        timers.push(id)
      })
    const run = async () => {
      while (!cancelled) {
        for (let i = 0 as 0 | 1; i < turns.length; i = (i + 1) as 0 | 1) {
          if (cancelled) return
          setS({ phase: 'A', turn: i, typed: 0, dots: turns[i].dots })
          await wait(190)
          const ans = turns[i].answer
          for (let n = 1; n <= ans.length; n++) {
            if (cancelled) return
            setS((p) => ({ ...p, typed: n }))
            await wait(5)
          }
          await wait(180 + ans.length * 5 + 200)
        }
        if (cancelled) return
        setS((p) => ({ ...p, phase: 'B', dots: 8 }))
        await wait(3200)
      }
    }
    void run()
    return () => {
      cancelled = true
      timers.forEach((id) => clearTimeout(id))
    }
  }, [inView, reduced])

  const cur = turns[s.turn]
  const typedText = cur.answer.slice(0, s.typed)

  return (
    <div
      ref={ref}
      data-tilt=""
      style={{
        width: 'min(384px,100%)',
        background: 'linear-gradient(160deg,#1c1024,#100c14)',
        border: '1px solid rgba(255,255,255,.09)',
        borderRadius: '28px',
        padding: '22px 22px 20px',
        boxShadow: '0 40px 90px -40px rgba(20,16,22,.65)',
        willChange: 'transform',
      }}
    >
      {/* progress dots + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', flex: 1, gap: '4px' }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              style={{
                height: '3px',
                flex: 1,
                borderRadius: '2px',
                background: i < s.dots ? '#2b2630' : 'rgba(255,255,255,.12)',
                transition: 'background .07s',
              }}
            />
          ))}
        </div>
        <span style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: '12px', color: '#6f666c', flex: 'none' }}>
          the spill · sample
        </span>
      </div>

      {/* stage */}
      <div style={{ position: 'relative', height: '584px' }}>
        {/* Phase A — interview */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            opacity: s.phase === 'A' ? 1 : 0,
            transition: 'opacity .1s',
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg viewBox="0 0 56 56" fill="none" style={{ width: '26px', height: '26px', flex: 'none' }}>
              <rect x="15.25" y="16" width="11.5" height="24" rx="5.75" fill="url(#eyeG2)" />
              <rect x="29.25" y="16" width="11.5" height="24" rx="5.75" fill="url(#eyeG2)" />
              <ellipse cx="21" cy="29" rx="4" ry="5" fill="url(#pupG2)" />
              <ellipse cx="35" cy="29" rx="4" ry="5" fill="url(#pupG2)" />
            </svg>
            <span
              style={{
                fontFamily: SORA,
                fontWeight: 600,
                fontSize: '10px',
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                color: '#2b2630',
              }}
            >
              spill
            </span>
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '14px',
            }}
          >
            <div style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: '15.5px', color: '#bdb8bb' }}>
              {cur.reaction}
            </div>
            <div
              style={{
                fontFamily: NEWS,
                fontStyle: 'italic',
                fontWeight: 500,
                fontSize: 'clamp(23px,5.4vw,32px)',
                lineHeight: 1.22,
                color: '#e2dde0',
              }}
            >
              {cur.question}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.14)',
              borderRadius: '16px',
              padding: '13px 15px',
            }}
          >
            <span
              style={{
                flex: 1,
                fontFamily: NEWS,
                fontStyle: 'italic',
                fontSize: '18px',
                color: '#fdfbf9',
                minHeight: '1.4em',
              }}
            >
              {typedText}
            </span>
            <span style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: '14px', color: '#2b2630', flex: 'none' }}>
              send →
            </span>
          </div>
        </div>

        {/* Phase B — preview */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            opacity: s.phase === 'B' ? 1 : 0,
            transition: 'opacity .1s',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontFamily: SORA,
              fontWeight: 600,
              fontSize: '10px',
              letterSpacing: '.16em',
              textTransform: 'uppercase',
              color: '#2b2630',
            }}
          >
            preview · in your words
          </div>
          <div style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: '14px', color: '#bdb8bb', lineHeight: 1.5 }}>
            here's your story — cleaned up a little, but still yours. type right over anything to fix it, or tell me
            what to change below — then pick where it lives.
          </div>

          {/* story card */}
          <div
            style={{
              background: 'rgba(255,255,255,.035)',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: '18px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 500, fontSize: '12.5px', color: '#6f666c' }}>
              {alias ?? '🦉 Quiet Indonesian Owl'} <span style={{ opacity: 0.6 }}>· {pillar ?? 'family'}</span>
            </div>
            <div style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: '20px', color: '#fdfbf9', lineHeight: 1.3 }}>
              the sister i'd protect from anyone was scared of me.
            </div>
            <div style={{ fontFamily: NEWS, fontSize: '15px', color: '#e6e3e4', lineHeight: 1.6 }}>
              she told me tuesday, out of nowhere — she's been scared of me since we were kids. i went quiet, and i
              still haven't said it to anyone who knows us.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
              {['#family', '#siblings', '#guilt'].map((t) => (
                <span
                  key={t}
                  style={{
                    fontFamily: SORA,
                    fontWeight: 600,
                    fontSize: '10.5px',
                    color: '#2b2630',
                    background: 'rgba(23,19,26,.13)',
                    borderRadius: '999px',
                    padding: '3px 10px',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: '12.5px', color: '#6f666c' }}>
            🔒 every edit gets re-checked by the privacy shield before it saves.
          </div>

          <div
            style={{
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.14)',
              borderRadius: '16px',
              padding: '11px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span style={{ flex: 1, fontFamily: NEWS, fontStyle: 'italic', fontSize: '13px', color: '#707070' }}>
              or tell me: "make it shorter", "add the part about the rent"…
            </span>
            <span style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: '13px', color: '#2b2630', flex: 'none' }}>
              edit →
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px' }}>
            <div
              style={{
                background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(255,255,255,.08)',
                borderRadius: '14px',
                padding: '14px',
              }}
            >
              <div
                style={{
                  fontFamily: SORA,
                  fontWeight: 700,
                  fontSize: '11px',
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: '#fdfbf9',
                }}
              >
                keep as journal
              </div>
              <div style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: '12.5px', color: '#6f666c', marginTop: '4px' }}>
                private draft. only you.
              </div>
            </div>
            <div style={{ background: '#2b2630', borderRadius: '14px', padding: '14px' }}>
              <div
                style={{
                  fontFamily: SORA,
                  fontWeight: 700,
                  fontSize: '11px',
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: '#fff',
                }}
              >
                post to a room →
              </div>
              <div style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: '12.5px', color: 'rgba(255,255,255,.85)', marginTop: '4px' }}>
                others who lived it sit with you.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Chapter01Spill({ alias, pillar }: { alias?: string; pillar?: string } = {}) {
  return (
    <section
      data-screen-label="01 Spill"
      className="chsec"
      style={{
        position: 'relative',
        minHeight: '96vh',
        scrollSnapAlign: 'start',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <div className="chgrid">
        <div data-rv="swipe-l">
          <div
            style={{
              fontFamily: SORA,
              fontWeight: 700,
              fontSize: '12px',
              letterSpacing: '.24em',
              textTransform: 'uppercase',
              color: '#2b2630',
              marginBottom: '22px',
            }}
          >
            chapter 02 — spill it
          </div>
          <h2
            data-words=""
            style={{
              fontFamily: SORA,
              fontWeight: 800,
              fontSize: 'clamp(30px,3.8vw,54px)',
              lineHeight: 1.08,
              letterSpacing: '-.04em',
              margin: '0 0 24px',
              color: '#0b080f',
            }}
          >
            say the thing you can't say{' '}
            <em style={{ fontFamily: NEWS, fontStyle: 'italic', fontWeight: 400, color: '#17131a' }}>
              anywhere else.
            </em>
          </h2>
          <p
            style={{
              fontFamily: NEWS,
              fontStyle: 'italic',
              fontSize: 'clamp(16px,1.4vw,20px)',
              lineHeight: 1.6,
              color: '#383136',
              maxWidth: '44ch',
              margin: '0 0 32px',
            }}
          >
            tell your story — it opens a room the world can sit in. people who've lived your exact thing show up,
            relate, and tell you what actually happened next.
          </p>
          <a
            href="#spill"
            data-cta="spill"
            data-hover=""
            data-mag=""
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              fontFamily: SORA,
              fontWeight: 700,
              fontSize: '15px',
              color: '#fff',
              background: '#0b080f',
              borderRadius: '999px',
              padding: '16px 30px',
              transition: 'background .3s',
            }}
          >
            open a room →
          </a>
        </div>

        <div data-rv="pop" style={{ display: 'flex', justifyContent: 'center' }}>
          <SpillCard alias={alias} pillar={pillar} />
        </div>
      </div>
    </section>
  )
}
