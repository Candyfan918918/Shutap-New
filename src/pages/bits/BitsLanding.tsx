/* /bits, the Shutap Bits landing (Nov 12 2026 redesign, approved by Candy).
 *
 * Show the output first. Half the visitors come from ChatGPT ads that promise
 * a video and a teleprompter with delivery cues; the old page opened on an
 * empty five-line form and 22 of 35 left inside ten seconds. Now the first
 * screen is the demo bit's four outputs side by side, at the same size: the
 * 5-second video (playing), stand-up (the teleprompter running, with the
 * sketch's delivery cues), the sketch page and the skit shot list. A visitor
 * from a "rehearse" ad (utm_content=rehearse) gets stand-up first.
 *
 * Under it: "Your turn — write yours." The box is one story box; "Make it a
 * bit" cuts what they typed into hook, setup, two tags and button, their
 * words only. A guest makes that one bit and reads it, then signs in to
 * watch, rehearse, keep it or make versions. */
import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { BitSurface } from '@/pages/home/bit/BitSurface'
import { buildSpec, VIDEO_H, VIDEO_W } from '@/lib/bits/video/spec'
import { drawFrame } from '@/lib/bits/video/draw'
import { BIT_CAPS } from '@/lib/bits/plans'
import { KIT_CAPS, TOAST_CAPS } from '@/lib/entitlements'
import { PLANS, usd } from '@/lib/pricing'
import { Footer } from '@/components/feed/Footer'
import type { BitDemo } from '@/lib/bits/demo.functions'
import { trackEvent } from '@/lib/tracking'
import { cuesForLines } from '@/lib/bits/cues'
import '@/components/feed/feed.css'
import './bits.css'

const BANNER = ['Create: one line in, a bit out', 'Your lines, word for word', 'AI fills only the gaps', 'Refine: funnier on any line', 'Lock what’s done', 'Practice: teleprompter with cues', 'Rehearse: sketch page and skit shot list', '5-second video to post']

const LINE_INFO: { s: 'hook' | 'setup' | 'tag0' | 'tag1' | 'button'; k: string; d: string }[] = [
  { s: 'hook', k: 'Hook', d: 'The first 2 seconds. What happened, the way you’d say it first: a reason to listen.' },
  { s: 'setup', k: 'Setup', d: 'The one fact the hook left out. Just enough of the story to follow the turn.' },
  { s: 'tag0', k: 'Tag 1', d: 'A laugh after the turn. A picture that lands on a thing you can point at.' },
  { s: 'tag1', k: 'Tag 2', d: 'Another laugh on the same idea. Don’t restart the story; push it further.' },
  { s: 'button', k: 'Button', d: 'The last line, the one you stop on. A verdict or a reversal, never a moral.' },
]

export const BITS_FAQ: { q: string; a: string }[] = [
  { q: 'Does Shutap write my bit?', a: 'Only the lines you leave empty. You tell it your way in the box; Shutap cuts what you typed into a hook, setup, two tags and a button, and your lines stay word for word. Any line your story didn’t cover, the AI copilot drafts, marked “AI draft” so you can change it or keep it. Every line is optional, and one line of yours is enough to make the bit; write all five and nothing is drafted. Funnier offers other ways to say a line only when you tap it, and nothing changes until you pick. The video, stand-up, sketch and skit lay out your bit; they add no new jokes.' },
  { q: 'Can I rehearse with it?', a: 'Yes. Stand-up is a teleprompter built for practice: your lines scroll at talking pace with delivery cues from your sketch page, like (beat), (hushed) or (his voice), and it holds for a moment at each pause. Tap cues to hide them when you know it cold.' },
  { q: 'Do I have to sign up first?', a: 'No. Tell your story and make your bit without an account, and read it. Signing in (free, with Google, Apple or email) opens the video, the teleprompter, the sketch and the skit, keeps the bit in My creations, and unlocks funnier on every line.' },
  { q: 'Will my material end up somewhere else?', a: 'No. Nobody at Shutap reads your bits, they are never used to train AI, and they are never published unless you post them. Names and details are removed before anything is saved.' },
  { q: 'What is free?', a: `${BIT_CAPS.free} free bits with everything in them: the 5-second video, stand-up, sketch and skit, and funnier and lock on every line. The video and downloads carry the shutap.com mark.` },
]

function tap(name: string, props: Record<string, unknown> = {}) {
  void trackEvent(name, { product: 'bits', page: 'bits', ...props })
}

type Tile = 'video' | 'standup' | 'sketch' | 'skit'

/** Which output leads: an ad's utm_content (rehearse / video / sketch / skit). */
function useLead(): Tile {
  const [lead, setLead] = useState<Tile>('video')
  useEffect(() => {
    try {
      const c = new URLSearchParams(window.location.search).get('utm_content')?.toLowerCase() ?? ''
      const t: Tile | null = /rehears|prompt|cue|standup|stand-up/.test(c) ? 'standup' : /sketch/.test(c) ? 'sketch' : /skit/.test(c) ? 'skit' : /video/.test(c) ? 'video' : null
      if (t) {
        setLead(t)
        tap('bits_lead_tile', { tile: t, utm_content: c.slice(0, 40) })
      }
    } catch { /* noop */ }
  }, [])
  return lead
}

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** The video, drawn by the real video code from the demo's lines (the free
 *  look, with the mark). It plays on its own, on a loop, while it is on
 *  screen; reduced motion gets the last frame. */
function DemoVideo({ d }: { d: BitDemo }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const l = d.lines
    const spec = buildSpec({ id: d.id, hook: l.hook, tags: [...l.tags], button: l.button }, [l.hook, l.setup, ...l.tags, l.button].join(' '))
    const draw = (t: number) => { ctx.setTransform(c.width / VIDEO_W, 0, 0, c.width / VIDEO_W, 0, 0); drawFrame(ctx, t, spec, { watermark: true }) }
    draw(4.6)
    void document.fonts?.ready.then(() => draw(4.6))
    if (reduceMotion()) return
    let raf = 0
    let visible = true
    let t0 = performance.now()
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; if (visible) t0 = performance.now() }) : null
    io?.observe(c)
    const tick = () => {
      if (visible) {
        // 5 seconds of video, then a 1.2s hold on the button, then again
        const t = ((performance.now() - t0) / 1000) % 6.2
        draw(Math.min(t, 4.99))
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); io?.disconnect() }
  }, [d])
  return <canvas ref={ref} className="bo-video" width={360} height={Math.round((360 * VIDEO_H) / VIDEO_W)} aria-label="The 5-second video made from the demo bit" />
}

/** Stand-up: the teleprompter running through the demo's lines, with the
 *  delivery cues the real teleprompter shows (from the demo's sketch page). */
function DemoPrompter({ d }: { d: BitDemo }) {
  const lines = [d.lines.hook, d.lines.setup, d.lines.tags[0], d.lines.tags[1], d.lines.button]
  const cues = cuesForLines(lines, d.sketch)
  const [i, setI] = useState(0)
  const [on, setOn] = useState(true)
  useEffect(() => {
    if (!on || reduceMotion()) return
    const id = window.setInterval(() => setI((x) => (x + 1) % lines.length), 2600)
    return () => window.clearInterval(id)
  }, [on, lines.length])
  return (
    <div className="bo-prompt" aria-label="Stand-up teleprompter running the demo bit">
      <span className="bo-prompt-h">teleprompter · cues on</span>
      <span className="bo-guide" aria-hidden="true" />
      <p className="dim">{i > 0 ? lines[i - 1] : ''}</p>
      {(cues[i] ?? []).map((c, k) => <p key={k} className="cue">{c.text}</p>)}
      <p className="lit">{lines[i]}</p>
      <p className="dim">{i < lines.length - 1 ? lines[i + 1] : ''}</p>
      <button type="button" className="bo-prompt-btn" onClick={() => { setOn((v) => !v); tap('demo_tile_open', { tile: 'standup', action: on ? 'pause' : 'start' }) }}>{on ? 'pause' : 'start'}</button>
    </div>
  )
}

function Outputs({ d, lead }: { d: BitDemo; lead: Tile }) {
  const tiles: { id: Tile; name: string; use: string; foot: string; body: React.ReactNode }[] = [
    { id: 'video', name: '5-second video', use: 'create', foot: 'Made from one story. Post it today.', body: <DemoVideo d={d} /> },
    { id: 'standup', name: 'Stand-up', use: 'practice', foot: 'The teleprompter, with delivery cues.', body: <DemoPrompter d={d} /> },
    {
      id: 'sketch', name: 'Sketch', use: 'rehearse', foot: 'One page to run it on stage.',
      body: <div className="bo-page" tabIndex={0} aria-label="The demo's sketch page">{(d.sketch ?? []).map((e, k) => <p key={k} className={e.type}>{e.text}</p>)}</div>,
    },
    {
      id: 'skit', name: 'Skit', use: 'film it', foot: 'A shot list; you play both parts.',
      body: <ol className="bo-shots" tabIndex={0} aria-label="The demo's skit shot list">{(d.skit ?? []).map((b, k) => <li key={k}><b>{k + 1} · {b.shot}</b><span>{b.speaker}: {b.line}</span></li>)}</ol>,
    },
  ]
  const ordered = [...tiles.filter((t) => t.id === lead), ...tiles.filter((t) => t.id !== lead)]
  return (
    <div className="bo-row">
      {ordered.map((t, n) => (
        <div key={t.id} className={`bo-tile${t.id === lead && lead !== 'video' ? ' lead' : ''}`} onPointerDown={() => tap('demo_tile_open', { tile: t.id })}>
          <div className="bo-tile-h"><b><i className="bo-num">{n + 1}</i>{t.name}</b><span>{t.use}</span></div>
          <div className="bo-body">{t.body}</div>
          <span className="bo-foot">{t.foot}</span>
        </div>
      ))}
    </div>
  )
}

const SLOT_OF = { hook: 'hook', setup: 'setup', tag0: 'tag0', tag1: 'tag1', button: 'button' } as const
function demoLine(d: BitDemo, s: keyof typeof SLOT_OF): string {
  return s === 'tag0' ? d.lines.tags[0] : s === 'tag1' ? d.lines.tags[1] : d.lines[s]
}
/** The demo as it was first typed (a line where funnier was used, as typed). */
function demoStory(d: BitDemo): string {
  return LINE_INFO.map((l) => {
    const f = d.funnier.find((x) => x.slot === l.s)
    const t = (f?.typed || demoLine(d, l.s)).trim()
    return /[.!?]["”’]?$/.test(t) ? t : `${t}.`
  }).join(' ')
}

export function BitsLanding({ demo }: { demo?: BitDemo | null } = {}) {
  const lead = useLead()
  const [phase, setPhase] = useState<'write' | 'result'>('write')
  const toBox = (where: string) => {
    tap('seo_cta_clicked', { kind: where })
    document.getElementById('bits-write')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => (document.getElementById('bit-story') as HTMLTextAreaElement | null)?.focus({ preventScroll: true }), 450)
  }
  const run = BANNER.flatMap((b) => [<span key={b}>{b}</span>, <i key={b + '·'}>●</i>])
  return (
    <div className="fd bl">
      <div className="bl-marq" aria-label={`What Shutap Bits gives you: ${BANNER.join(', ')}`}>
        <div className="bl-marq-run" aria-hidden>{run}{BANNER.flatMap((b) => [<span key={b + '2'}>{b}</span>, <i key={b + '·2'}>●</i>])}</div>
      </div>

      {/* Nov 14 2026 (Candy, designs C + A): the ask on the first screen. The
          headline, then one line to type, then what one story becomes. */}
      {phase === 'write' && (
        <section className="bo-hero bo-top">
          <div className="bo-head">
            <div className="bo-head-l">
              <p className="bl-kick">Shutap Bits · for creators and comedians</p>
              <h1 className="bl-h1">Create your bit. <em>Refine it, practice it, rehearse it.</em></h1>
            </div>
          </div>
        </section>
      )}

      <section className={`bo-write bo-write-top${phase === "result" ? " result" : ""}`} id="bits-write">
        <div className="bl-box" id="bits-top">
          <BitSurface embed={{ page: 'bits', heading: '', bare: true, drive: true, driveFull: 'bits-full', onPhase: setPhase, demoStory: demo ? demoStory(demo) : undefined }} />
        </div>
      </section>

      {phase === 'write' && demo && (
        <section className="bo-hero bo-demo">
          <div className="bo-under">
            <b>What one story becomes ↓</b>
            <span>A realistic demo, typed in-house and made by Shutap{demo.funnier.length ? ` · ${demo.funnier.length === 1 ? 'one line' : `${demo.funnier.length} lines`} used funnier` : ''} · not edited · <a href="#bits-behind" onClick={() => tap('seo_cta_clicked', { kind: 'see_demo_lines' })}>see what they typed ↓</a></span>
          </div>
          <Outputs d={demo} lead={lead} />
          {/* A: the full guided box, always open; it types into the same story as the one line on top */}
          <div id="bits-full" className="bo-full" />
          <ul className="bl-trust">
            <li><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2f6a45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>Your lines stay word for word</li>
            <li><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8e1c4c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>AI drafts only the lines you leave empty</li>
            <li><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8e1c4c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /><path d="M9 12l2 2 4-4" /></svg>Your bits never train AI</li>
          </ul>
        </section>
      )}

      {phase === 'write' && !demo && <section className="bo-hero bo-demo"><div id="bits-full" className="bo-full" /></section>}

      <div className="bl-lower">
        {demo && (
          <div className="bl-block" id="bits-behind">
            <h2>The bit behind the demo</h2>
            <p className="bl-p">Typed in-house the way you would, then cut into a bit. Lines marked funnier show what was typed first.</p>
            <div className="bl-yours">
              {LINE_INFO.map((l) => {
                const f = demo.funnier.find((x) => x.slot === l.s)
                return (
                  <div key={l.s} className="bl-row on">
                    <span className="k">{l.k}</span>
                    <span className="v wrap">{demoLine(demo, l.s)}{f && <small>typed first: “{f.typed}”</small>}</span>
                    {f ? <span className="mine fun">funnier · picked</span> : <span className="mine">their words</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="bl-two">
          <div><p className="t"><span className="pill">funnier</span><b>one line, when you ask</b></p><p>Three other ways to say the line you tapped, built from the rest of your bit. Yours is always the first choice. Nothing changes until you pick.</p></div>
          <div><p className="t"><span className="pill locked">locked</span><b>done with a line</b></p><p>Lock a line when it’s right. It can’t be changed by accident, and funnier skips it until you unlock it.</p></div>
        </div>

        <div className="bl-block" id="price">
          <h2>What you get, and what it costs</h2>
          <p className="bl-p">You pay to make bits, never to use them. Downloads, copies, the prompter, funnier and lock are unlimited on every plan.</p>
          <div className="bl-plans">
            <div className="on"><span>Free</span><b>$0</b><ul><li>{BIT_CAPS.free} free bits</li><li>The video, stand-up, sketch and skit</li><li>Funnier and lock on every line, unlimited</li><li>shutap.com mark on the video and downloads</li></ul></div>
            <div><span>Basic</span><b>{usd(PLANS.basic.amount)}<small>/mo</small></b><ul><li>{BIT_CAPS.basic} bits a day</li><li>No watermark</li><li>Versions on demand: hotter, tighter, storytelling (each counts as a bit)</li><li>{KIT_CAPS.basic} realtor kits and {TOAST_CAPS.basic} toast a month</li></ul></div>
            <div><span>Pro</span><b>{usd(PLANS.pro.amount)}<small>/mo</small></b><ul><li>Unlimited bits</li><li>No watermark</li><li>The Mirror</li><li>Unlimited realtor kits and toasts</li></ul></div>
          </div>
          <p className="bl-note">Paid limits reset at midnight Pacific. The same plan covers realtor kits and toasts. <Link to="/pricing" onClick={() => tap('seo_cta_clicked', { kind: 'pricing' })}>All plans</Link></p>
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
