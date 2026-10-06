/* Section: Hero — v3 hero: live exchange demo, mood line, spill pill,
 * jump chips, live count, rooms ticker. Preserves the H1 exactly. */
import { useEffect, useRef, useState } from 'react'
import type { NewestRoom } from '@/lib/newest-rooms.functions'
import { SHUTAP_SEED } from '@/data/seed'

const SORA = "'Sora',sans-serif"
const NEWS = "'Newsreader',serif"

const LX_PAIRS: Array<[string, string]> = [
  ["i told my sister the truth and she hasn't called since", "i lived this. give her a week — mine came back."],
  ["i'm the only one holding this family together", "someone finally said it. you're allowed to put it down."],
  ["my boss takes credit for everything i do", "same job, two years ago. it gets better — i'll tell you how."],
]

const PLACEHOLDERS = [
  "type the thing you can't say out loud…",
  "my boss takes credit for everything i do…",
  "my mom keeps reading my texts…",
  "i don't want kids and he does…",
  "i think my best friend outgrew me…",
]

type TickerItem = {
  key: string
  href?: string
  emoji: string
  alias: string
  title: string
  sitting: number
  fresh: boolean // pulsing "just opened"
  live: boolean // from DB (vs seed pad)
}

function fmtTime(d: Date): string {
  const h = d.getHours(); const m = d.getMinutes()
  const hh = ((h + 11) % 12) + 1
  return hh + ':' + String(m).padStart(2, '0') + (h >= 12 ? 'pm' : 'am')
}

export function Hero({ openRoomsCount = 0, newestRooms = [] }: { openRoomsCount?: number; newestRooms?: NewestRoom[] } = {}) {
  const showLive = openRoomsCount > 0

  // ── live exchange demo (client-only) ──
  const [lxQ, setLxQ] = useState('')
  const [lxAVisible, setLxAVisible] = useState(false)
  const lxIdxRef = useRef(0)
  useEffect(() => {
    let alive = true
    const timers: Array<ReturnType<typeof setTimeout>> = []
    const cycle = () => {
      if (!alive) return
      setLxAVisible(false)
      const [q] = LX_PAIRS[lxIdxRef.current % LX_PAIRS.length]
      setLxQ('')
      let i = 0
      const step = () => {
        if (!alive) return
        i++
        setLxQ(q.slice(0, i))
        if (i < q.length) timers.push(setTimeout(step, 26))
        else {
          timers.push(setTimeout(() => {
            if (!alive) return
            setLxAVisible(true)
            timers.push(setTimeout(() => { lxIdxRef.current++; cycle() }, 4200))
          }, 700))
        }
      }
      step()
    }
    cycle()
    return () => { alive = false; timers.forEach(clearTimeout) }
  }, [])
  const lxA = LX_PAIRS[lxIdxRef.current % LX_PAIRS.length][1]

  // ── mood line: client-only clock ──
  const [mood, setMood] = useState<string>('')
  useEffect(() => {
    const tick = () => {
      const d = new Date(); const h = d.getHours(); const ts = fmtTime(d)
      setMood((h >= 22 || h < 5)
        ? `it's ${ts}. exactly the right time to say it.`
        : `it's ${ts} — somewhere it's 2am, and the rooms are awake.`)
    }
    tick()
    const iv = setInterval(tick, 30000)
    return () => clearInterval(iv)
  }, [])

  // ── spill pill ──
  const inputRef = useRef<HTMLInputElement | null>(null)
  const btnRef = useRef<HTMLAnchorElement | null>(null)
  const [hint, setHint] = useState('')
  const [phIdx, setPhIdx] = useState(0)
  // Rotating placeholder — React-controlled so parent re-renders (typing demo,
  // mood clock) can't reconcile the DOM attribute back to index 0.
  useEffect(() => {
    const iv = setInterval(() => {
      const el = inputRef.current
      if (!el) return
      if (el.value || document.activeElement === el) return
      setPhIdx((k) => (k + 1) % PLACEHOLDERS.length)
    }, 2200)
    return () => clearInterval(iv)
  }, [])


  const stashPrefill = () => {
    const v = (inputRef.current?.value || '').trim()
    try { if (v) sessionStorage.setItem('shutap_spill_prefill', v) } catch { /* noop */ }
  }
  const onSpillClick = () => { stashPrefill() /* bubbles to data-cta="spill" delegator */ }
  const onSpillKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); stashPrefill()
      btnRef.current?.click()
    }
  }
  const onSpillInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = e.target.value.trim().length
    setHint(n === 0 ? '' : n < 30 ? "i'm listening. no one here knows your name."
      : n < 70 ? 'keep going — say it how it actually felt.'
      : "that's it. ready when you are.")
  }

  // ── ticker: newest rooms + seed pad ──
  const seedPad = (SHUTAP_SEED.rooms || []).slice(0, 8)
  const now = Date.now()
  const TWO_H = 2 * 60 * 60 * 1000
  const liveItems: TickerItem[] = newestRooms.slice(0, 8).map((r, i) => {
    const age = now - new Date(r.created_at).getTime()
    return {
      key: `live-${r.id}`,
      href: `/stream#room-${r.id}`,
      emoji: r.emoji, alias: r.alias, title: (r.title || '').toLowerCase(),
      sitting: r.sitting, fresh: age < TWO_H, live: true,
    }
  }).filter((_, i) => i < 8)
  const padCount = Math.max(0, 8 - liveItems.length)
  const padItems: TickerItem[] = seedPad.slice(0, padCount).map((r, i) => ({
    key: `seed-${i}`,
    href: '/stream',
    emoji: r.emoji, alias: r.alias, title: (r.title || '').toLowerCase(),
    sitting: (r as unknown as { sitting?: number }).sitting ?? 1,
    fresh: false, live: false,
  }))
  const eight = [...liveItems, ...padItems]
  const ticker = eight.concat(eight) // doubled for seamless wrap

  return (
    <section data-screen-label="Hero" style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', padding: 'clamp(76px,10vh,110px) clamp(18px,4vw,30px) 0', scrollSnapAlign: 'start' }}>
      <div style={{ position: 'absolute', inset: '-30% -10% auto', height: '90vh', background: 'radial-gradient(ellipse at 50% 40%,rgba(23,19,26,.13),transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%' }}>
        <div data-heroinner="" style={{ maxWidth: '1560px', margin: '0 auto', width: '100%', position: 'relative', willChange: 'transform,opacity' }}>

          {/* Live exchange demo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, marginBottom: 'clamp(16px,3vh,30px)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: SORA, fontWeight: 600, fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: '#6f666c' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5DCAA5', animation: 'breathe 2.8s ease-in-out infinite', display: 'block' }} />
              happening in a room right now
            </div>
            <div style={{ width: 'min(520px,100%)', minHeight: 104, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ alignSelf: 'flex-start', maxWidth: '88%', background: '#fff', border: '1px solid rgba(11,8,15,.08)', borderRadius: '16px 16px 16px 5px', padding: '10px 15px', boxShadow: '0 10px 26px -18px rgba(20,16,22,.35)', opacity: lxQ ? 1 : 0, transform: lxQ ? 'none' : 'translateY(6px)', transition: 'opacity .4s, transform .4s' }}>
                <span style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 15, lineHeight: 1.5, color: '#100c14', minHeight: 22, display: 'block', textAlign: 'left' }}>
                  {lxQ}
                  {!lxAVisible && lxQ ? (
                    <span aria-hidden="true" style={{ display: 'inline-block', width: 2, height: '0.95em', marginLeft: 2, background: '#17131a', verticalAlign: '-2px', animation: 'blinkdot 1s steps(2) infinite' }} />
                  ) : null}
                </span>
              </div>
              <div style={{ alignSelf: 'flex-end', maxWidth: '88%', background: 'linear-gradient(155deg,#d6d0d4,#2b2630 60%,#17131a)', borderRadius: '16px 16px 5px 16px', padding: '10px 15px', opacity: lxAVisible ? 1 : 0, transform: lxAVisible ? 'none' : 'translateY(6px)', transition: 'opacity .5s, transform .5s', boxShadow: '0 12px 26px -16px rgba(23,19,26,.5)' }}>
                <span style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 15, lineHeight: 1.5, color: '#fff', display: 'block', textAlign: 'left' }}>{lxA}</span>
              </div>
            </div>

          </div>

          {/* Mood line */}
          <div style={{ textAlign: 'center', fontFamily: NEWS, fontStyle: 'italic', fontSize: 14.5, color: '#6f666c', marginBottom: 12, minHeight: 22 }}>{mood}</div>

          {/* H1 (unchanged) */}
          <h1 data-heroh1="" style={{ fontFamily: SORA, fontWeight: 800, fontSize: 'clamp(36px,min(7vw,9.5vh),96px)', lineHeight: 1, letterSpacing: '-.045em', margin: 0, color: '#0b080f', textAlign: 'center', willChange: 'transform' }}>
            <span style={{ display: 'block' }}>
              <span style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top' }}><span data-wr="" style={{ display: 'inline-block' }}>finally,</span></span>{' '}
              <span style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top' }}><span data-wr="" style={{ display: 'inline-block' }}>somewhere</span></span>{' '}
              <span style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top' }}><span data-wr="" style={{ display: 'inline-block' }}>to</span></span>
            </span>
            <span style={{ display: 'block', overflow: 'hidden' }}>
              <span data-wr="" style={{ display: 'inline-block', fontFamily: NEWS, fontStyle: 'italic', fontWeight: 400, letterSpacing: '-.02em', background: 'linear-gradient(92deg,#2b2630,#2b2630 70%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', padding: '0 .06em .08em' }}>not shut up.</span>
            </span>
          </h1>

          <div data-rv="zoom" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(14px,2.6vh,26px)', marginTop: 'clamp(18px,3.4vh,44px)' }}>
            <p style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 'clamp(17px,1.6vw,21px)', lineHeight: 1.55, color: '#383136', maxWidth: '46ch', margin: 0, textAlign: 'center' }}>
              like texting your smartest friend at 2am — except everyone in the room has lived your exact thing. pseudonymous rooms for relationships, family, and work.
            </p>

            {/* Spill pill + scan button */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1.5px solid rgba(23,19,26,.4)', borderRadius: 999, padding: '6px 6px 6px 24px', boxShadow: '0 16px 36px -18px rgba(23,19,26,.45)', width: 'min(560px,100%)' }}>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={PLACEHOLDERS[phIdx]}
                  onKeyDown={onSpillKey}
                  onChange={onSpillInput}
                  style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: NEWS, fontStyle: 'italic', fontSize: 16.5, color: '#100c14', padding: '10px 0' }}
                />
                <a
                  ref={btnRef}
                  href="#spill"
                  data-cta="spill"
                  data-hover=""
                  data-mag=""
                  onClick={onSpillClick}
                  style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: SORA, fontWeight: 700, fontSize: 15, color: '#fff', background: 'linear-gradient(155deg,#d6d0d4,#2b2630 55%,#17131a)', borderRadius: 999, padding: '12px 24px', cursor: 'pointer' }}
                >spill it <span style={{ fontWeight: 400 }}>→</span></a>
              </div>
              <a href="#scan" data-cta="scan" data-hover="" data-mag="" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: SORA, fontWeight: 700, fontSize: 15, color: '#17131a', background: 'rgba(255,255,255,.7)', border: '1.5px solid rgba(23,19,26,.35)', borderRadius: 999, padding: '15px 26px', transition: 'border-color .3s' }}>or scan how heavy it is</a>
            </div>
            <div style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 14, color: '#17131a', minHeight: 20, opacity: hint ? 1 : 0, transition: 'opacity .3s' }}>{hint || '\u00A0'}</div>

            {/* Jump chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <a href="#spill" data-hover="" style={{ fontFamily: SORA, fontWeight: 600, fontSize: 12.5, color: '#443c42', background: 'rgba(255,255,255,.6)', border: '.5px solid rgba(11,8,15,.12)', borderRadius: 999, padding: '8px 16px' }}>spill it — open a room</a>
              <a href="#scan" data-hover="" style={{ fontFamily: SORA, fontWeight: 600, fontSize: 12.5, color: '#443c42', background: 'rgba(255,255,255,.6)', border: '.5px solid rgba(11,8,15,.12)', borderRadius: 999, padding: '8px 16px' }}>scan it — a 60-second read</a>
              <a href="#mirror" data-hover="" style={{ fontFamily: SORA, fontWeight: 600, fontSize: 12.5, color: '#443c42', background: 'rgba(255,255,255,.6)', border: '.5px solid rgba(11,8,15,.12)', borderRadius: 999, padding: '8px 16px' }}>the mirror — your patterns over time</a>
            </div>

            {showLive ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: SORA, fontWeight: 600, fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: '#2b2630' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2b2630', animation: 'breathe 2.8s ease-in-out infinite', display: 'block' }} />
                <span data-livecount="">{openRoomsCount}</span>&nbsp;rooms open now
              </div>
            ) : null}

            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: SORA, fontWeight: 600, fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6f666c' }}>
              <span>pseudonymous</span><span style={{ color: '#2b2630' }}>·</span>
              <span>no algorithm</span><span style={{ color: '#2b2630' }}>·</span>
              <span>free to read</span>
            </div>
          </div>

          {/* Rooms ticker */}
          <div style={{ display: 'block', marginTop: 'clamp(24px,4.5vh,50px)', position: 'relative', left: '50%', transform: 'translateX(-50%)', width: '100vw', overflow: 'hidden', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)', maskImage: 'linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <span style={{ fontFamily: SORA, fontWeight: 600, fontSize: 10, letterSpacing: '.24em', textTransform: 'uppercase', color: '#6f666c' }}>rooms open right now · tap one to peek inside</span>
            </div>
            <div className="home-hero-ticker" style={{ display: 'flex', width: 'max-content', animation: 'mq 80s linear infinite', padding: '8px 0 14px' }}>
              {ticker.map((t, i) => (
                <span key={`${t.key}-${i}`} style={{ display: 'inline-flex', paddingRight: 16 }}>
                  <a
                    href={t.href || '/stream'}
                    data-hover=""
                    draggable={false}
                    style={{ width: 280, flex: 'none', display: 'flex', flexDirection: 'column', gap: 8, background: '#fff', border: '1px solid rgba(11,8,15,.08)', borderRadius: 18, padding: '15px 17px', textAlign: 'left', boxShadow: '0 18px 40px -28px rgba(20,16,22,.35)', transition: 'transform .3s, border-color .3s', color: 'inherit', textDecoration: 'none' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#fdfbf9', display: 'grid', placeItems: 'center', fontSize: 13, flex: 'none' }}>{t.emoji}</span>
                      <span style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 12, color: '#6f666c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.alias}</span>
                      {t.fresh ? <span data-fresh="">just opened</span> : null}
                    </span>
                    <span style={{ fontFamily: SORA, fontWeight: 700, fontSize: 13.5, lineHeight: 1.35, color: '#0b080f', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.title}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: NEWS, fontStyle: 'italic', fontSize: 11.5, color: '#443c42' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5DCAA5', animation: 'breathe 2.8s ease-in-out infinite', display: 'block' }} />
                      {t.sitting} sitting in · tap to peek
                    </span>
                  </a>
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>
      <div className="home-hero-scrollcue" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#443c42', paddingBottom: 'clamp(26px,4vh,40px)', marginTop: 'clamp(40px,6vh,80px)' }}>
        <span style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 13 }}>scroll</span>
        <span style={{ display: 'block', width: 1.5, height: 34, background: 'linear-gradient(#2b2630,transparent)', animation: 'scrollHint 1.8s ease-in-out infinite' }} />
      </div>
    </section>
  )
}
