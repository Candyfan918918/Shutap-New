/* /bits, the Shutap Bits landing (Nov 8 2026 redesign, approved by Candy).
 * Bits helps creators and comedians write their own bit; it never writes one
 * for them. Everything that sells it is in the first screen: what it does,
 * the five-line box (every line theirs, funnier and lock on demand), the
 * trust row, and beside the box what those lines become: the box's own
 * lines, live, and the video's first beat drawn by the real video code.
 * Lower: three steps, the five lines, funnier and lock, the same box again
 * (one draft with the top one), plans, questions, who's behind it. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { BitSurface } from '@/pages/home/bit/BitSurface'
import { EMPTY_LINES } from '@/pages/home/bit/LinedBox'
import type { Draft } from '@/pages/home/bit/EditableBit'
import { readSlot } from '@/lib/bits/shared'
import { buildSpec, VIDEO_H, VIDEO_W } from '@/lib/bits/video/spec'
import { drawFrame } from '@/lib/bits/video/draw'
import { BIT_CAPS } from '@/lib/bits/plans'
import { KIT_CAPS, TOAST_CAPS } from '@/lib/entitlements'
import { PLANS, usd } from '@/lib/pricing'
import { Footer } from '@/components/feed/Footer'
import { trackEvent } from '@/lib/tracking'
import '@/components/feed/feed.css'
import './bits.css'

const BANNER = ['Hook', 'Setup', 'Two tags', 'Button', 'Funnier on any line', 'Lock what’s done', '5-second video', 'Stand-up prompter', 'Sketch page', 'Skit', 'Your words, word for word', 'No new jokes added']

export const LINE_INFO: { s: 'hook' | 'setup' | 'tag0' | 'tag1' | 'button'; k: string; d: string }[] = [
  { s: 'hook', k: 'Hook', d: 'The first 2 seconds. What happened, the way you’d say it first: a reason to listen.' },
  { s: 'setup', k: 'Setup', d: 'The one fact the hook left out. Just enough of the story to follow the turn.' },
  { s: 'tag0', k: 'Tag 1', d: 'A laugh after the turn. A picture that lands on a thing you can point at.' },
  { s: 'tag1', k: 'Tag 2', d: 'Another laugh on the same idea. Don’t restart the story; push it further.' },
  { s: 'button', k: 'Button', d: 'The last line, the one you stop on. A verdict or a reversal, never a moral.' },
]

export const BITS_FAQ: { q: string; a: string }[] = [
  { q: 'Does Shutap write my bit?', a: 'No. You write all five lines: hook, setup, two tags and the button. Funnier offers other ways to say a line only when you tap it, and nothing changes until you pick. The video, stand-up, sketch and skit lay out your lines; they add no new jokes.' },
  { q: 'Will my material end up somewhere else?', a: 'No. Nobody at Shutap reads your bits, they are never used to train AI, and they are never published unless you post them. Names and details are removed before anything is saved.' },
  { q: 'What if I’m stuck on a line?', a: 'Write a rough version, even a plain sentence, and tap funnier. You get three other ways to say it, built from your other lines, with yours first. Keep yours or pick one.' },
  { q: 'What is free?', a: `${BIT_CAPS.free} bit a day with everything in it: the 5-second video, stand-up, sketch and skit, and funnier and lock on every line. The video and downloads carry the shutap.com mark.` },
]

function tap(name: string, props: Record<string, unknown> = {}) {
  void trackEvent(name, { product: 'bits', page: 'bits', ...props })
}

/** the box's lines, live (the boxes share them on shutap:bit-lines) */
function useBoxLines(): Draft {
  const [lines, setLines] = useState<Draft>(EMPTY_LINES)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('shutap_bit_lines')
      const p = raw ? (JSON.parse(raw) as { lines?: Draft }) : null
      if (p?.lines && typeof p.lines.hook === 'string') setLines({ ...EMPTY_LINES, ...p.lines })
    } catch { /* noop */ }
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ lines: Draft }>).detail
      if (d?.lines) setLines(d.lines)
    }
    window.addEventListener('shutap:bit-lines', on)
    return () => window.removeEventListener('shutap:bit-lines', on)
  }, [])
  return lines
}

/** The video's first beat, drawn by the same code as the real video, from the
 *  visitor's own lines (the free look, with the mark). Only the first beat:
 *  the whole video is for signed-in visitors. */
function VideoBeat({ lines }: { lines: Draft }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const hook = lines.hook.trim()
  useEffect(() => {
    const c = ref.current
    if (!c || !hook) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const scale = c.width / VIDEO_W
    const story = [lines.hook, lines.setup, ...lines.tags, lines.button].join(' ')
    const spec = buildSpec({ id: 'bits-preview', hook, tags: lines.tags.filter((t) => t.trim()), button: lines.button.trim() || ' ' }, story)
    const draw = () => { ctx.setTransform(scale, 0, 0, scale, 0, 0); drawFrame(ctx, 0.8, spec, { watermark: true }) }
    draw()
    // the face may still be loading on first paint
    void document.fonts?.ready.then(draw)
  }, [hook, lines])
  return (
    <span className="bl-phone">
      {hook ? <canvas ref={ref} width={360} height={Math.round((360 * VIDEO_H) / VIDEO_W)} aria-label="The first beat of your 5-second video, drawn from your hook" /> : (
        <span className="bl-phone-empty"><b>the bit</b><span>your hook</span><i>draws here as you write</i></span>
      )}
    </span>
  )
}

function Preview({ lines }: { lines: Draft }) {
  const hook = lines.hook.trim()
  return (
    <aside className="bl-side" aria-label="What your five lines become">
      <div className="bl-side-h"><p className="bl-kick">What your five lines become</p><p className="bl-meta">yours, word for word</p></div>
      <div className="bl-yours">
        <p className="bl-lbl">Your bit</p>
        {LINE_INFO.map((l) => {
          const v = readSlot(lines, l.s).trim()
          return (
            <div key={l.s} className={`bl-row${v ? ' on' : ''}`}>
              <span className="k">{l.k}</span>
              <span className="v">{v || `your ${l.k.toLowerCase()}`}</span>
              {v && <span className="mine">your words</span>}
            </div>
          )
        })}
      </div>
      <p className="bl-arrow" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16M6 14l6 6 6-6" /></svg>Laid out from your lines, no new jokes added</p>
      <div className="bl-tiles">
        <div className="bl-tile video">
          <b>5-second video</b>
          <VideoBeat lines={lines} />
          <span className="d">To post. Cast and room from your lines. Free shows the shutap.com mark.</span>
        </div>
        <div className="bl-tile">
          <b>Stand-up</b>
          <span className="bl-prompt"><i>0:00</i><span className={hook ? 'on' : undefined}>{hook || 'your hook, lit'}</span></span>
          <span className="d">Teleprompter, one line lit at a time</span>
        </div>
        <div className="bl-tile">
          <b>Sketch</b>
          <span className="bl-page"><span className="sh">INT. — DAY</span><span className="ch">ME</span><span className={`dl${hook ? ' on' : ''}`}>{hook || 'your lines…'}</span></span>
          <span className="d">One screenplay page, a PDF</span>
        </div>
        <div className="bl-tile wide">
          <b>Skit</b>
          <span className="d">A shot list to film alone on your phone. You play both parts; every line you say is from your bit.</span>
        </div>
      </div>
    </aside>
  )
}

export function BitsLanding() {
  const lines = useBoxLines()
  const [phase, setPhase] = useState<'write' | 'result'>('write')
  const onPhase = useCallback((p: 'write' | 'result') => setPhase(p), [])
  const toBox = (where: string) => {
    tap('seo_cta_clicked', { kind: where })
    const el = document.getElementById('bits-top')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const run = BANNER.flatMap((b) => [<span key={b}>{b}</span>, <i key={b + '·'}>●</i>])
  return (
    <div className="fd bl">
      <div className="bl-marq" aria-label={`What Shutap Bits gives you: ${BANNER.join(', ')}`}>
        <div className="bl-marq-run" aria-hidden>{run}{BANNER.flatMap((b) => [<span key={b + '2'}>{b}</span>, <i key={b + '·2'}>●</i>])}</div>
      </div>

      <section className={`bl-hero${phase === 'result' ? ' result' : ''}`} id="bits-top">
        {phase === 'write' && (
          <div className="bl-head">
            <p className="bl-kick">Shutap Bits · for creators and comedians</p>
            <h1 className="bl-h1">Write your bit line by line. <em>Funnier only where you ask.</em></h1>
            <p className="bl-lead">You write the hook, setup, two tags and button. Stuck on one? Tap funnier for three other ways to say it. Then post it as a 5-second video, or perform it as stand-up, a sketch or a skit.</p>
          </div>
        )}
        <div className="bl-box">
          <BitSurface embed={{ page: 'bits', heading: '', bare: true, onPhase }} />
        </div>
        {phase === 'write' && (
          <ul className="bl-trust">
            <li><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2f6a45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>Every line is yours, word for word</li>
            <li><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8e1c4c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>AI writes only when you tap funnier</li>
            <li><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8e1c4c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /><path d="M9 12l2 2 4-4" /></svg>Your bits never train AI</li>
          </ul>
        )}
        {phase === 'write' && <Preview lines={lines} />}
      </section>

      <div className="bl-lower">
        <div className="bl-steps3">
          <div><p className="n">1</p><h3>Write five lines</h3><p>Hook, setup, two tags, button. All five are yours to write.</p></div>
          <div><p className="n">2</p><h3>Funnier where you’re stuck</h3><p>Tap it on one line for three other ways to say it. Yours stays first. Lock what’s done.</p></div>
          <div><p className="n">3</p><h3>Post it or perform it</h3><p>The 5-second video, stand-up, a sketch page or a skit, laid out from your lines.</p></div>
        </div>

        <div className="bl-block">
          <h2>The five lines of a bit</h2>
          <p className="bl-p">The shape a comic builds on. Each line in the box asks for one of these.</p>
          <ol className="bl-shape">
            {LINE_INFO.map((l, i) => <li key={l.s}><b>{i + 1} · {l.k}</b><span>{l.d}</span></li>)}
          </ol>
        </div>

        <div className="bl-two">
          <div><p className="t"><span className="pill">funnier</span><b>one line, when you ask</b></p><p>Three other ways to say the line you tapped, built from the lines you wrote. Yours is always the first choice. Nothing changes until you pick.</p></div>
          <div><p className="t"><span className="pill locked">locked</span><b>done with a line</b></p><p>Lock a line when it’s right. It can’t be changed by accident, and funnier skips it until you unlock it.</p></div>
        </div>

        {phase === 'write' && (
          <div className="bl-mid">
            <h2>Write yours.</h2>
            <p className="bl-p">The same box as the top of the page. Whatever you type here is there too: one draft, one sign-up, nothing lost.</p>
            <BitSurface embed={{ page: 'bits', heading: '', bare: true, mirror: true }} />
          </div>
        )}

        <div className="bl-block" id="price">
          <h2>What you get, and what it costs</h2>
          <p className="bl-p">You pay to make bits, never to use them. Downloads, copies, the prompter, funnier and lock are unlimited on every plan.</p>
          <div className="bl-plans">
            <div className="on"><span>Free</span><b>$0</b><ul><li>{BIT_CAPS.free} bit a day</li><li>The video, stand-up, sketch and skit</li><li>Funnier and lock on every line, unlimited</li><li>shutap.com mark on the video and downloads</li></ul></div>
            <div><span>Basic</span><b>{usd(PLANS.basic.amount)}<small>/mo</small></b><ul><li>{BIT_CAPS.basic} bits a day</li><li>No watermark</li><li>Versions on demand: hotter, tighter, storytelling (each counts as a bit)</li><li>{KIT_CAPS.basic} realtor kits and {TOAST_CAPS.basic} toast a month</li></ul></div>
            <div><span>Pro</span><b>{usd(PLANS.pro.amount)}<small>/mo</small></b><ul><li>Unlimited bits</li><li>No watermark</li><li>The Mirror</li><li>Unlimited realtor kits and toasts</li></ul></div>
          </div>
          <p className="bl-note">Limits reset at midnight Pacific. The same plan covers realtor kits and toasts. <Link to="/pricing" onClick={() => tap('seo_cta_clicked', { kind: 'pricing' })}>All plans</Link></p>
        </div>

        <div className="bl-block bl-faq">
          <h2>Questions</h2>
          {BITS_FAQ.map((f) => <div key={f.q}><h3>{f.q}</h3><p>{f.a}</p></div>)}
        </div>

        <div className="bl-who">
          <div><p className="bl-kick">Who’s behind this</p><p>Built in Menlo Park, CA by founder Candy Fan. Questions: <a href="mailto:hello@shutap.com">hello@shutap.com</a></p></div>
          <button type="button" className="bl-btn" onClick={() => toBox('who_block')}>Write my bit ↑</button>
        </div>

        <nav className="bl-others" aria-label="More from Shutap">
          <Link to="/realtors">Shutap for Realtors</Link><Link to="/toasts">Shutap Toasts</Link><Link to="/business">Shutap Enterprise</Link><Link to="/how-it-works">How Shutap works</Link><Link to="/pricing">Pricing</Link>
        </nav>
      </div>
      <Footer />
    </div>
  )
}
