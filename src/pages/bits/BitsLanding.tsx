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

const BANNER = ['Tell it your way', 'Your lines, word for word', 'AI fills only the gaps', 'Funnier on any line', 'Lock what’s done', '5-second video', 'Stand-up teleprompter', 'Delivery cues', 'Rehearse the timing', 'Sketch page', 'Skit shot list', 'No new jokes added']

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
    { id: 'video', name: '5-second video', use: 'to post', foot: 'Plays on its own. Cast and place from the story.', body: <DemoVideo d={d} /> },
    { id: 'standup', name: 'Stand-up', use: 'to rehearse', foot: 'Scrolls at talking pace with delivery cues.', body: <DemoPrompter d={d} /> },
    {
      id: 'sketch', name: 'Sketch', use: 'to stage', foot: 'One screenplay page, a PDF.',
      body: <div className="bo-page" tabIndex={0} aria-label="The demo's sketch page">{(d.sketch ?? []).map((e, k) => <p key={k} className={e.type}>{e.text}</p>)}</div>,
    },
    {
      id: 'skit', name: 'Skit', use: 'to film alone', foot: 'A shot list for your phone; you play both parts.',
      body: <ol className="bo-shots" tabIndex={0} aria-label="The demo's skit shot list">{(d.skit ?? []).map((b, k) => <li key={k}><b>{k + 1} · {b.shot}</b><span>{b.speaker}: {b.line}</span></li>)}</ol>,
    },
  ]
  const ordered = [...tiles.filter((t) => t.id === lead), ...tiles.filter((t) => t.id !== lead)]
  return (
    <div className="bo-row">
      {ordered.map((t) => (
        <div key={t.id} className={`bo-tile${t.id === lead && lead !== 'video' ? ' lead' : ''}`} onPointerDown={() => tap('demo_tile_open', { tile: t.id })}>
          <div className="bo-tile-h"><b>{t.name}</b><span>{t.use}</span></div>
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
    document.getElementById('bits-write')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const run = BANNER.flatMap((b) => [<span key={b}>{b}</span>, <i key={b + '·'}>●</i>])
  return (
    <div className="fd bl">
      <div className="bl-marq" aria-label={`What Shutap Bits gives you: ${BANNER.join(', ')}`}>
        <div className="bl-marq-run" aria-hidden>{run}{BANNER.flatMap((b) => [<span key={b + '2'}>{b}</span>, <i key={b + '·2'}>●</i>])}</div>
      </div>

      {phase === 'write' && (
        <section className="bo-hero">
          <div className="bo-head">
            <div className="bo-head-l">
              <p className="bl-kick">{lead === 'standup' ? 'Shutap Bits · stand-up teleprompter' : 'Shutap Bits · for creators and comedians'}</p>
              {lead === 'standup' ? (
                <h1 className="bl-h1">Rehearse your bit <em>with delivery cues. Then post it, stage it or film it.</em></h1>
              ) : (
                <h1 className="bl-h1">Tell it your way. <em>Get a video, a teleprompter with cues, a sketch and a skit.</em></h1>
              )}
            </div>
            <p className="bl-lead">{demo ? 'This story was typed in-house, the way you would. Everything below it is what Shutap made from it. No new jokes added.' : 'Tell your story in the box. Shutap cuts it into a bit, your words word for word, the AI copilot drafts any line your story didn’t cover, and Shutap lays it out as a 5-second video, stand-up with delivery cues, a sketch and a skit.'}</p>
          </div>
          {demo && <Outputs d={demo} lead={lead} />}
          {demo && (
            <p className="bo-under">
              <span>All four made from the same story{demo.funnier.length ? ` · ${demo.funnier.length === 1 ? 'one line' : `${demo.funnier.length} lines`} used funnier, picked by the writer` : ''} · real output, not edited</span>
              <a href="#bits-behind" onClick={() => tap('seo_cta_clicked', { kind: 'see_demo_lines' })}>see what they typed ↓</a>
            </p>
          )}
        </section>
      )}

      <section className={`bo-write${phase === "result" ? " result" : ""}`} id="bits-write">
        {phase === 'write' && (
          <div className="bo-write-h">
            <h2>Your turn — write yours.</h2>
            <span>free · no sign-in to start · your lines stay word for word</span>
          </div>
        )}
        <div className="bl-box" id="bits-top">
          <BitSurface embed={{ page: 'bits', heading: '', bare: true, onPhase: setPhase, demoStory: demo ? demoStory(demo) : undefined }} />
        </div>
        {phase === 'write' && (
          <ul className="bl-trust">
            <li><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2f6a45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>Every word is yours</li>
            <li><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8e1c4c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>AI drafts only the lines you leave empty</li>
            <li><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8e1c4c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /><path d="M9 12l2 2 4-4" /></svg>Your bits never train AI</li>
          </ul>
        )}
      </section>

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

        <div className="bl-steps3">
          <div><p className="n">1</p><h3>Tell it your way</h3><p>Who was there, what they said, what you did, how it ended. Checks show what makes a bit land; nothing is blocked.</p></div>
          <div><p className="n">2</p><h3>Get your bit</h3><p>Your story, cut into a hook, setup, two tags and a button. Your words only. Tap funnier on a line where you’re stuck; lock what’s done.</p></div>
          <div><p className="n">3</p><h3>Post it or perform it</h3><p>The 5-second video, stand-up with delivery cues to rehearse with, a sketch page or a skit, laid out from your bit.</p></div>
        </div>

        <div className="bl-block">
          <h2>The shape of a bit</h2>
          <p className="bl-p">What each part of your bit does. Your story is cut into these, in your words.</p>
          <ol className="bl-shape">
            {LINE_INFO.map((l, i) => <li key={l.s}><b>{i + 1} · {l.k}</b><span>{l.d}</span></li>)}
          </ol>
        </div>

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
