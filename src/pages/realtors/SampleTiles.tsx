/* The sample kit in the /realtors first screen (Nov 8 2026, design approved by
 * Candy): six small tiles, each drawn in the form of its own output, beside
 * the paste box. Hover (desktop) or tap (phone) opens the whole output; the
 * dark bar under them opens shoot mode, the teleprompter, playing the sample
 * walkthrough. Real product output (sample-kit.ts), address and price hidden.
 * Every open is tracked (admin + PostHog). */
import { useEffect, useRef, useState } from 'react'
import { SAMPLE_KIT, SAMPLE_LISTING } from '@/lib/realtors/sample-kit'
import { TONE_LABEL } from '@/lib/realtors/listing'
import { SAMPLE_CONTROLS } from '@/lib/realtors/sample-kit'
import { trackEvent } from '@/lib/tracking'
import { PAUSE_MS, isPauseCue } from '@/lib/bits/cues'

type Id = 'walkthrough' | 'voiceover' | 'hooks' | 'open_house' | 'posts' | 'straight' | 'shoot'
type Row = { k?: string; sub?: string; v: string }

const K = SAMPLE_KIT
const room = (where: string) => where.split('·')[0]!.trim()

const TILES: { id: Exclude<Id, 'shoot'>; n: number; title: string; meta: string; use: string; rows: Row[] }[] = [
  { id: 'walkthrough', n: 1, title: 'Walkthrough to film', meta: `${K.walkthrough.shots.length} shots`, use: 'Where to stand, what to do, the line to say.', rows: K.walkthrough.shots.map((s) => ({ k: `${room(s.where)} · ${s.seconds}s`, sub: s.action, v: s.line })) },
  { id: 'voiceover', n: 2, title: 'Voiceover', meta: `${K.voiceover.length} lines`, use: 'Read it on camera or paste it into text-to-voice.', rows: K.voiceover.map((v) => ({ k: v.label, v: v.text })) },
  { id: 'hooks', n: 3, title: 'Hooks', meta: 'first 2 seconds', use: 'Three openers, on screen and spoken.', rows: K.hooks.map((h) => ({ k: h.move, v: h.line })) },
  { id: 'open_house', n: 4, title: 'Open-house kit', meta: `${K.open_house.length} pieces`, use: 'Invite, story, sign line, reminder, thank-you text.', rows: K.open_house.map((o) => ({ k: o.label, v: o.text })) },
  { id: 'posts', n: 5, title: 'Social posts', meta: `${K.posts.length} posts`, use: 'Just listed for each platform, price improvement, pending, sold.', rows: K.posts.map((p) => ({ k: p.label, v: p.text })) },
  { id: 'straight', n: 6, title: 'MLS copy', meta: 'no jokes', use: 'The straight description, ready for the MLS.', rows: [{ v: K.straight }] },
]

const by = <T extends { label: string }>(xs: T[], label: string) => xs.find((x) => x.label.startsWith(label)) ?? xs[0]!
const WAVE = [3, 6, 9, 5, 11, 7, 12, 4, 8, 10, 6, 13, 5, 9, 7, 11, 4, 8, 12, 6, 9, 3, 7, 10, 5, 8, 11, 4, 6, 9, 5, 7]

/** the little picture inside each tile: the output's own form */
function TileBody({ id }: { id: Exclude<Id, 'shoot'> }) {
  if (id === 'walkthrough') {
    const pick = [0, 2, 6].map((i) => K.walkthrough.shots[i]).filter(Boolean)
    return (
      <>
        {pick.map((s, i) => <span key={i} className="st-shot"><span className="tc">{s!.seconds}s</span><span className="tx"><b>{room(s!.where)}</b> · {s!.action}</span></span>)}
        <span className="st-foot">+ 15s and 60s cuts</span>
      </>
    )
  }
  if (id === 'voiceover') {
    return (
      <>
        <span className="st-wave" aria-hidden>
          <span className="play"><svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M7 4l13 8-13 8z" /></svg></span>
          <svg width="150" height="28" viewBox="0 0 192 28" className="bars">{WAVE.map((h, i) => <rect key={i} x={i * 6} y={14 - h} width="3" height={h * 2} rx="1.5" fill={i < 17 ? '#b8456b' : '#e7c6d3'} />)}</svg>
        </span>
        <span className="st-quote">{K.voiceover[2]?.text ?? K.voiceover[0]?.text}</span>
      </>
    )
  }
  if (id === 'hooks') {
    return (
      <span className="st-hooks">
        <span className="st-phone" aria-hidden><span>{K.hooks[0]?.line}</span></span>
        <span className="st-list">{K.hooks.map((h, i) => <span key={i} className="st-li"><span className="n">{i + 1}</span><span>{h.line}</span></span>)}</span>
      </span>
    )
  }
  if (id === 'open_house') {
    const sign = by(K.open_house, 'sign line').text
    return (
      <span className="st-oh">
        <span className="st-sign" aria-hidden><span className="top">OPEN HOUSE</span><span className="txt">{sign}</span><span className="legs" /></span>
        <span className="st-list">{K.open_house.map((o) => <span key={o.label} className="st-li chk"><svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#b8456b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg><span>{o.label}</span></span>)}</span>
      </span>
    )
  }
  if (id === 'posts') {
    return (
      <>
        <span className="st-post">
          <span className="hd"><span className="av" aria-hidden /><span className="h">your.handle</span><span className="pill">JUST LISTED</span></span>
          <span className="bd">{by(K.posts, 'just listed · tiktok').text}</span>
        </span>
        <span className="st-foot">Just listed to sold · every platform</span>
      </>
    )
  }
  return <span className="st-mls"><span>{K.straight}</span></span>
}

export function SampleTiles() {
  const [open, setOpen] = useState<Id | null>(null)
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const hoverable = useRef(false)
  const last = useRef<Id | null>(null)
  const shots = K.walkthrough.shots

  useEffect(() => {
    try { hoverable.current = window.matchMedia('(hover: hover) and (min-width: 900px)').matches } catch { /* noop */ }
  }, [])

  // the teleprompter plays at reading pace while it is open
  useEffect(() => {
    if (open !== 'shoot' || paused) return
    const words = shots[i]!.line.split(/\s+/).length
    const say = shots[i]!.delivery
    const t = window.setTimeout(() => setI((x) => (x + 1) % shots.length), Math.max(2200, (words / 2.4) * 1000 + 700) + (say && isPauseCue(say) ? PAUSE_MS : 0))
    return () => window.clearTimeout(t)
  }, [open, paused, i, shots])

  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null) }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open])

  const show = (id: Id, how: 'hover' | 'tap' | 'focus') => {
    if (how === 'hover' && !hoverable.current) return
    if (id === 'shoot') { setI(0); setPaused(false) }
    setOpen(id)
    if (last.current !== id) { last.current = id; void trackEvent(id === 'shoot' ? 'sample_prompter_open' : 'sample_tile_open', { product: 'realtors', output: id, how }) }
  }
  const close = () => { setOpen(null); last.current = null }
  const tryYours = () => {
    void trackEvent('seo_cta_clicked', { page: 'realtors', product: 'realtors', kind: 'sample_tile', output: open })
    close()
    const el = document.getElementById('rl-url') ?? document.getElementById('rl-text')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => (el as HTMLElement | null)?.focus(), 400)
  }
  const cur = TILES.find((t) => t.id === open)
  const s = shots[i]!

  return (
    <section className="st" aria-label="A real kit Shutap wrote">
      <div className="st-head">
        <p className="rl-kicker" style={{ textAlign: 'left', margin: 0 }}>A real kit</p>
        <p className="rl-note">{SAMPLE_LISTING.beds}-bed, {SAMPLE_LISTING.city} · {TONE_LABEL[SAMPLE_CONTROLS.tone].split(' ')[0]!.toLowerCase()} · <span className="rl-only-wide">hover to open</span><span className="rl-only-narrow">tap one</span></p>
      </div>
      <div className="st-wrap">
        <div className="st-grid">
          {TILES.map((t) => (
            <button key={t.id} type="button" className="st-tile" onMouseEnter={() => show(t.id, 'hover')} onFocus={() => show(t.id, 'focus')} onClick={() => show(t.id, 'tap')} aria-label={`${t.title}: open the whole output`}>
              <span className="st-t"><span className="ti">{t.n} · {t.title}</span><span className="me">{t.meta}</span></span>
              <TileBody id={t.id} />
            </button>
          ))}
          <button type="button" className="st-shoot" onMouseEnter={() => show('shoot', 'hover')} onFocus={() => show('shoot', 'focus')} onClick={() => show('shoot', 'tap')}>
            <span className="pl" aria-hidden><svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M7 4l13 8-13 8z" /></svg></span>
            <span className="tx"><b>Shoot mode</b><span>A teleprompter with delivery cues, to rehearse and film</span></span>
            <span className="go">watch ›</span>
          </button>
        </div>

        {open && <div className="st-scrim" onClick={close} aria-hidden />}

        {cur && (
          <div className="st-pop" role="dialog" aria-label={cur.title} onMouseLeave={() => { if (hoverable.current) close() }}>
            <div className="st-pop-hd">
              <div><p className="ti">{cur.n} · {cur.title}</p><p className="rl-note">{cur.use}</p></div>
              <button type="button" className="st-x" onClick={close} aria-label="Close">×</button>
            </div>
            <div className="st-pop-bd">
              {cur.rows.map((r, j) => (
                <div key={j} className="st-row">
                  {cur.rows.length > 1 && <span className="n">{j + 1}</span>}
                  <div>
                    {r.k && <p className="k">{r.k}</p>}
                    {r.sub && <p className="sub">{r.sub}</p>}
                    <p className="v">{r.v}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="st-pop-ft"><span>Address and price hidden.</span><button type="button" className="rl-linkbtn" onClick={tryYours}>Try yours ↑</button></div>
          </div>
        )}

        {open === 'shoot' && (
          <div className="st-pop st-pr" role="dialog" aria-label="Shoot mode" onMouseLeave={() => { if (hoverable.current) close() }}>
            <div className="st-pr-hd">
              <span>shoot mode · {i + 1} of {shots.length}</span>
              <span className="b">
                <button type="button" onClick={() => setPaused((p) => !p)}>{paused ? 'play' : 'pause'}</button>
                <button type="button" className="st-x dark" onClick={close} aria-label="Close">×</button>
              </span>
            </div>
            <div className="st-pr-bd" onClick={() => setPaused((p) => !p)}>
              <p className="dim">{i > 0 ? shots[i - 1]!.line : ' '}</p>
              <div>
                <p className="cue">{room(s.where)} · {s.seconds}s</p>
                <p className="act">{s.action}</p>
                {s.delivery && <p className="say">{s.delivery}</p>}
                <p className="line">{s.line}</p>
              </div>
              <p className="dim">{i < shots.length - 1 ? shots[i + 1]!.line : ' '}</p>
            </div>
            <div className="st-pr-ft">
              <span>Big text, auto-scroll · tap to pause · film with a second phone</span>
              <button type="button" className="rl-btn" onClick={tryYours}>Try yours</button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
