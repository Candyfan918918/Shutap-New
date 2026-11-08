/* A Shutap Toasts occasion page (Nov 8 2026 redesign, approved by Candy):
 *   banner · hero (kicker, H1 input → output, the lead, the four-step form,
 *   the trust row | the real toast for this occasion) · three steps · how the
 *   toast is built (mapped to the demo) · the occasion's checks · a mid-page
 *   box that hands its story to the form · what $12.99 buys · plans · FAQ ·
 *   who's behind this · other occasions.
 * Copy lives in lib/toasts/landings.ts; every claim there is true of the code. */
import { useCallback, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { OCCASION, fromPlaceholders, type Names, type ToastLine } from '@/lib/toasts/shared'
import { OCCASION_PAGES, type Landing } from '@/lib/toasts/landings'
import type { ToastDemo } from '@/lib/toasts/demo.functions'
import { PLANS, TOAST_ONCE, usd } from '@/lib/pricing'
import { ToastForm, TOAST_STORY_EVENT } from './ToastForm'
import { DemoTiles } from './DemoTiles'
import { trackEvent } from '@/lib/tracking'
import { phCapture } from '@/lib/posthog'
import '@/pages/realtors/realtors.css'
import './toasts.css'

const track = (name: string, props: Record<string, unknown>) => { void trackEvent(name, { product: 'toasts', ...props }); void phCapture(name, { product: 'toasts', ...props }) }

const Check = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2f6a45" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="rl-ic"><path d="M5 12l5 5 9-10" /></svg>

export function OccasionPage({ l, demo, prepaid }: { l: Landing; demo: ToastDemo | null; prepaid?: string }) {
  const [step, setStep] = useState(1)
  const [mid, setMid] = useState('')
  const spec = OCCASION[l.occasion]
  const page = `toasts/${l.slug}`
  const names: Partial<Names> = { friend: l.roles.friend, partner: l.roles.partner, me: l.roles.me }
  const toForm = useCallback(() => {
    const el = document.getElementById('ts-form')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => (document.getElementById('ts-s1') as HTMLTextAreaElement | null)?.focus(), 450)
  }, [])

  const banner = ['The speech', 'Pause marks', 'Laugh marks', 'Glasses-up cue', 'Cue cards', 'Phone prompter', 'Skip to the toast', '60-second version', 'Rehearse timer', 'The text after', ...(spec.keepsake ? ['Keepsake'] : []), l.checks[0]!.h3, 'Kept word for word']
  const toPractice = 'To practice: the speech, a rehearse timer. To give it: cue cards, a phone prompter, a 60-second version.' + (spec.keepsake ? ' To keep: a one-page keepsake.' : '')

  // "How it's built": the first line of each section of the real toast
  const shape: { k: string; v: string; mine: boolean }[] = []
  if (demo) {
    const seen = new Set<string>()
    for (const ln of demo.toast.lines as ToastLine[]) {
      const k = ln.section.split(' · ')[0]!.trim()
      if (seen.has(k)) continue
      seen.add(k)
      shape.push({ k, v: fromPlaceholders(ln.text, names), mine: ln.source === 'story' || ln.source === 'true_thing' })
    }
  }

  const buys = [
    'The speech PDF with pause and laugh marks',
    'Cue cards to print, 4 to a page',
    'The phone prompter, with “skip to the toast”',
    'The 60-second version, made when you tap it',
    'Rehearse: a timed run-through',
    spec.keepsake ? 'The text to send after, and a one-page keepsake to hand them' : 'The text to send after',
    'No shutap.com watermark. Download again any time, no limit, from profile › My creations',
  ]

  return (
    <div className="rl tp">
      <div className="rl-marq" aria-label="What one toast comes with">
        <div className="rl-marq-run">{[...banner, ...banner].map((b, k) => <span key={k}>{b}<i aria-hidden>  ●</i></span>)}</div>
      </div>

      <section className="rl-hero2 tp-hero">
        <div className="rl-hero2-head">
          <nav aria-label="Breadcrumb" className="tp-crumb"><Link to="/toasts">Toasts</Link> <span aria-hidden>/</span> <span>{l.name}</span></nav>
          <p className="rl-kicker">{l.kicker}</p>
          <h1 className="rl-h1 rl-h1-2">{l.h1[0]}<em>{l.h1[1]}</em></h1>
          <p className="rl-lead2">{l.lead} {toPractice}</p>
        </div>
        <div className="rl-hero2-aside">
          <DemoTiles demo={demo} roles={l.roles} step={step} page={page} onTry={toForm} />
        </div>
        <div className="rl-hero2-box">
          <ToastForm occasionIn={l.occasion} preset={l.preset} prepaidSession={prepaid} otherChoice={l.occasion === 'other'} onStep={setStep} />
          <ul className="rl-trust">
            <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2f6a45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="rl-ic"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>Your stories, word for word</li>
            <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="rl-ic"><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>Names stay on your device</li>
            <li><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="rl-ic"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /><path d="M9 12l2 2 4-4" /></svg>Never trains AI</li>
          </ul>
        </div>
      </section>

      <div className="rl-lower">
        <div className="rl-steps3">
          <div><p className="n">1</p><h3>Type your stories</h3><p>Lock each one. A locked story goes in word for word.</p></div>
          <div><p className="n">2</p><h3>Shutap writes around them</h3><p>Edit any word or tap funnier on a line. Nothing changes until you pick.</p></div>
          <div><p className="n">3</p><h3>Lock it, rehearse, give it</h3><p>Locking makes it final, no more edits. Cue cards, the prompter and the 60-second version open once it’s locked.</p></div>
        </div>

        <section className="tp-sec">
          <h2>{l.built.h2}</h2>
          <p className="tp-intro">{l.built.intro}{shape.length ? ' Here is that shape in the toast above.' : ''}</p>
          {shape.length > 0 ? (
            <ol className="tp-shape">
              {shape.map((s, k) => <li key={k}><span className="h"><b>{k + 1} · {s.k}</b>{s.mine && <span className="dt-chip mine">your words</span>}</span><span className="v">“{s.v}”</span></li>)}
            </ol>
          ) : (
            <ol className="tp-shape">{spec.structure.map((s, k) => <li key={k}><span className="h"><b>{k + 1} · {s}</b></span></li>)}</ol>
          )}
        </section>

        <div className="tp-checks">
          {l.checks.map((c) => <div key={c.h3}><h3>{c.h3}</h3><p>{c.body}</p></div>)}
        </div>

        <form className="tp-mid" onSubmit={(e) => { e.preventDefault(); track('toast_mid_box', { page, typed: !!mid.trim() }); window.dispatchEvent(new CustomEvent(TOAST_STORY_EVENT, { detail: mid })); setMid('') }}>
          <label htmlFor="tp-mid">Try it with your own story.</label>
          <div className="row">
            <textarea id="tp-mid" rows={1} className="tp-mid-in" value={mid} placeholder={`Story 1 · ${STORY_HINT[l.occasion] ?? 'one thing that happened'}…`} onChange={(e) => setMid(e.target.value.replace(/\n/g, ' '))} />
            <button type="submit" className="rl-btn">Continue above ↑</button>
          </div>
          <p className="tp-mid-note">It goes into story 1 of your toast at the top of this page, already typed. Same form, nothing lost.</p>
        </form>

        <section id="price" className="tp-sec">
          <h2>What {usd(TOAST_ONCE.amount)} buys</h2>
          <p className="tp-intro">One toast for one occasion, paid once. Your first toast is free, so you see all of this before you pay anything.</p>
          <div className="tp-receipt">
            <div className="tp-receipt-hd"><b>One toast</b><span><strong>{usd(TOAST_ONCE.amount)}</strong> one time · no subscription</span></div>
            <div className="tp-receipt-cols">
              <div>
                <p className="lbl">1 · Shutap writes it, you edit it</p>
                {['The speech, written around your stories, to the length you pick', 'Edit any word, and tap funnier on any line Shutap wrote, as often as you like until you lock', 'Your stories and your last line stay word for word'].map((x) => <p key={x} className="it"><Check />{x}</p>)}
              </div>
              <div>
                <p className="lbl">2 · You lock it, everything opens</p>
                {buys.map((x) => <p key={x} className="it"><Check />{x}</p>)}
              </div>
            </div>
            <div className="tp-receipt-ft"><p className="lbl">Not in the {usd(TOAST_ONCE.amount)}</p><p>Edits after you lock. Locking makes it the final version; changing a line after that is a new toast, {usd(TOAST_ONCE.amount)} again (free on Pro). A toast for another occasion is another toast.</p></div>
          </div>
          <h3 className="tp-h3">Or on a plan</h3>
          <div className="rl-price4">
            <div className="on"><h3>First toast · free</h3><p>shutap.com watermark on every PDF page.</p></div>
            <div><h3>One toast · {usd(TOAST_ONCE.amount)}</h3><p>No subscription, no watermark.</p></div>
            <div><h3>Basic · {usd(PLANS.basic.amount)}/mo</h3><p>1 toast a month.</p></div>
            <div><h3>Pro · {usd(PLANS.pro.amount)}/mo</h3><p>Unlimited.</p></div>
          </div>
          <p className="rl-note" style={{ fontSize: 13.5 }}>Every toast on every plan comes with everything listed above. <Link to="/pricing" onClick={() => track('pricing_link', { page })}>All plans</Link></p>
        </section>

        <section className="tp-sec">
          <h2>Questions</h2>
          <div className="tp-faq">
            {l.faqs.map((f) => <div key={f.q}><h3>{f.q}</h3><p>{f.a}</p></div>)}
          </div>
        </section>

        <div className="rl-who">
          <div>
            <h2>Who’s behind this</h2>
            <p>Built in Menlo Park, CA by founder Candy Fan. Questions: <a href="mailto:hello@shutap.com">hello@shutap.com</a></p>
          </div>
          <button type="button" className="rl-btn" onClick={() => { track('who_cta', { page }); toForm() }}>Start my toast ↑</button>
        </div>

        <nav aria-label="Other toasts" className="tp-others">
          <p className="rl-kicker" style={{ textAlign: 'left', margin: 0 }}>Other toasts</p>
          <div className="rl-row">
            {OCCASION_PAGES.filter((o) => o.slug !== l.slug).map((o) => <Link key={o.slug} to="/toasts/$slug" params={{ slug: o.slug }} className="rl-chip">{o.name}</Link>)}
            <Link to="/toasts/$slug" params={{ slug: 'any-occasion' }} className="rl-chip">Any occasion</Link>
          </div>
          {l.guide && <a href={l.guide.href} className="tp-guide">{l.guide.label} →</a>}
        </nav>
      </div>
    </div>
  )
}

const STORY_HINT: Partial<Record<string, string>> = {
  best_man: 'a story about the groom',
  maid_of_honor: 'a story about your friendship',
  parent: 'her as a kid',
  thanksgiving: 'the story the whole table knows',
  christmas: 'the story your family tells every year',
  holiday_party: 'the year’s big win',
  new_years: 'the year in one line',
  retirement: 'what they’re known for at work',
  birthday: 'one habit only they have',
  toastmasters: 'what happened',
}
