// Chapter 01 — labeled sample: "the interview · sample". A scripted chat
// timeline that loops while on screen and pauses off-screen. Zero real user
// data. Timings match the spec.
import { useEffect, useRef, useState } from 'react'
import { useOnScreen, usePrefersReducedMotion } from '../hero/Mascot'
import { useReactiveCard, useMagnetic } from '@/components/motion'
import { EyeMark } from '@/components/EyeMark'

const SORA = "'Sora',system-ui,sans-serif"
const NEWS = "'Newsreader',Georgia,serif"

type Step =
  | { kind: 'companion'; text: string; at: number }
  | { kind: 'user'; text: string; at: number }
  | { kind: 'chip'; text: string; at: number }

function buildTimeline(): Step[] {
  // durations mirror the spec: companion +1250ms, user (typed) +(600 + 26·chars + 650)
  const steps: Step[] = []
  let t = 700
  const push = (s: Step) => {
    steps.push(s)
  }
  const companion = (text: string) => {
    push({ kind: 'companion', text, at: t })
    t += 1250
  }
  const user = (text: string) => {
    push({ kind: 'user', text, at: t })
    t += 600 + 26 * text.length + 650
  }
  companion("i'm listening. what happened?")
  user("my sister told me she's been scared of me since we were kids. i had no idea.")
  companion('that\u2019s heavy. how long has it been sitting on you?')
  user("since tuesday. i can't say this to anyone who knows us.")
  companion("you don't have to. i can open a room — pseudonymous, full of people who've lived this exact thing.")
  push({ kind: 'chip', text: 'room opened · 31 sitting in', at: t })
  return steps
}

export function Chapter01Interview({ onCtaSpill }: { onCtaSpill: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const onScreen = useOnScreen(ref, 0.15)
  const reduce = usePrefersReducedMotion()
  const [timeline] = useState(buildTimeline)
  const [shown, setShown] = useState<number>(reduce ? timeline.length : 0)
  const card = useReactiveCard({ glow: 'rgba(23,19,26,.55)' })
  const magneticCta = useMagnetic<HTMLButtonElement>()


  useEffect(() => {
    if (reduce) return
    if (!onScreen) return
    setShown(0)
    const timers: number[] = []
    // Reveal each step at its scheduled time; loop after final + 3400ms hold.
    for (let i = 0; i < timeline.length; i++) {
      const s = timeline[i]
      timers.push(window.setTimeout(() => setShown(i + 1), s.at))
    }
    const lastAt = timeline[timeline.length - 1].at
    const loop = window.setTimeout(() => setShown(0), lastAt + 3400)
    timers.push(loop)
    // schedule next loop start after hold + reset
    const nextStart = window.setTimeout(() => {
      // by resetting shown to 0 and re-triggering effect... easier: rely on onScreen retriggering.
      // For continuous looping while on screen we just reset shown; the effect below will re-run because shown changed but effect deps only include onScreen. Use interval instead.
    }, lastAt + 3400 + 50)
    timers.push(nextStart)
    // Continuous loop: interval that restarts sequence
    const iv = window.setInterval(() => {
      setShown(0)
      for (let i = 0; i < timeline.length; i++) {
        const s = timeline[i]
        timers.push(window.setTimeout(() => setShown(i + 1), s.at))
      }
    }, lastAt + 3400)
    timers.push(iv)
    return () => {
      timers.forEach((h) => {
        window.clearTimeout(h)
        window.clearInterval(h)
      })
    }
  }, [onScreen, reduce, timeline])

  return (
    <section
      ref={ref}
      className="home-chapter"
      style={{ position: 'relative', background: '#ffffff', minHeight: '96vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr',
          gap: 'clamp(34px,6vw,90px)',
          padding: 'clamp(90px,12vh,150px) clamp(20px,4vw,32px)',
          alignItems: 'center',
        }}
        className="home-grid-2"
      >
        <div>
          <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 12, letterSpacing: '.24em', textTransform: 'uppercase', color: '#2b2630', marginBottom: 22 }}>
            chapter 01 — spill it
          </div>
          <h2 style={{ fontFamily: SORA, fontWeight: 800, fontSize: 'clamp(30px,3.8vw,54px)', lineHeight: 1.08, letterSpacing: '-.04em', margin: '0 0 24px', color: '#0b080f' }}>
            say the thing you can't say <em style={{ fontFamily: NEWS, fontStyle: 'italic', color: '#17131a', fontWeight: 400 }}>anywhere else.</em>
          </h2>
          <p style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 'clamp(16px,1.4vw,20px)', lineHeight: 1.6, color: '#383136', maxWidth: '44ch', margin: '0 0 32px' }}>
            tell your story — it opens a room the world can sit in. people who've lived your exact thing show up, relate, and tell you what actually happened next.
          </p>
          <button
            type="button"
            ref={magneticCta}
            onClick={onCtaSpill}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: '#0b080f',
              color: '#fff',
              border: 0,
              padding: '16px 30px',
              borderRadius: 999,
              fontFamily: SORA,
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            open a room →
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            ref={card.ref}
            style={{
              width: 'min(380px, 100%)',
              background: 'linear-gradient(160deg, #100c14, #100c14)',
              borderRadius: 24,
              padding: 24,
              color: '#fdfbf9',
              boxShadow: '0 40px 90px -40px rgba(20,16,22,.65)',
              border: '1px solid rgba(255,255,255,.1)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', flex: 'none' }}>
                <EyeMark size={24} />
              </span>
              <span style={{ fontFamily: SORA, fontWeight: 700, fontSize: 13, color: '#fff' }}>
                spilling it
              </span>
              <span style={{ marginLeft: 'auto', fontFamily: NEWS, fontStyle: 'italic', fontSize: 12, color: '#6f666c' }}>
                the interview · sample
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 340 }}>
              {timeline.slice(0, shown).map((s, i) => {
                if (s.kind === 'chip') {
                  return (
                    <div key={i} className="home-bubble-in" style={{ alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(93,202,165,.12)', color: '#5DCAA5', border: '.5px solid rgba(93,202,165,.4)', borderRadius: 999, padding: '7px 15px', fontFamily: SORA, fontWeight: 700, fontSize: 12, marginTop: 4 }}>
                      <span className="home-breathe-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#5DCAA5' }} />
                      {s.text}
                    </div>
                  )
                }
                if (s.kind === 'companion') {
                  return (
                    <div key={i} className="home-bubble-in" style={{ alignSelf: 'flex-start', maxWidth: '88%', background: 'rgba(255,255,255,.07)', color: '#e1e1e1', borderRadius: '16px 16px 16px 5px', padding: '10px 14px', fontFamily: NEWS, fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.5 }}>
                      {s.text}
                    </div>
                  )
                }
                return (
                  <div key={i} className="home-bubble-in" style={{ alignSelf: 'flex-end', maxWidth: '88%', background: '#2b2630', color: '#fff', borderRadius: '16px 16px 5px 16px', padding: '10px 14px', fontFamily: NEWS, fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.5 }}>
                    {s.text}
                  </div>
                )
              })}
            </div>
            {card.decor}
          </div>
        </div>
      </div>
    </section>
  )
}
