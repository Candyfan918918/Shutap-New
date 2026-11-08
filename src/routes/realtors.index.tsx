import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { KitPage } from '@/pages/realtors/KitPage'
import { SampleTiles } from '@/pages/realtors/SampleTiles'
import { pageMeta } from '@/lib/seo/page-meta'
import { KIT_ONCE, PLANS, usd } from '@/lib/pricing'
import { Footer } from '@/components/feed/Footer'
import { trackEvent } from '@/lib/tracking'
import '@/components/feed/feed.css'
import '@/pages/realtors/realtors.css'

// Shutap for Realtors, the landing (Nov 8 2026 redesign, approved by Candy):
// everything a visitor needs is in the first screen: what it does, the paste
// box, the trust row and a real kit (six tiles + shoot mode). Public and
// indexed; the kit page behind the box is dark until the realtors flag is on.
const TITLE = 'Shutap for Realtors — paste a listing, get a video script and every post to go with it'
const DESC = 'Paste your listing link. Get the walkthrough to film, the voiceover, hooks, open-house kit, social posts and MLS copy, in your tone, in about 30 seconds. Fair-housing checked, nothing made up. First kit free.'

export const Route = createFileRoute('/realtors/')({
  // Nov 6 2026: /realtors is the tool; /realtors/kit is gone.
  validateSearch: (s: Record<string, unknown>) => z.object({ kit: z.string().uuid().optional(), session_id: z.string().max(200).optional(), prepaid: z.string().max(200).optional(), url: z.string().max(2000).optional(), text: z.string().max(2).optional() }).parse(s),
  head: () => ({ meta: pageMeta(TITLE, DESC, '/realtors') }),
  component: Landing,
})

/** what one kit covers, scrolling right to left under the header */
const BANNER = ['Just listed', 'Open-house invite', '3-frame story', 'Sign line', 'Day-before reminder', 'Thank-you text', 'Price improvement', 'Pending', 'Sold', 'Instagram', 'TikTok', 'Facebook', 'LinkedIn', 'MLS description', 'Shoot mode']

function Banner() {
  const run = BANNER.flatMap((b) => [<span key={b}>{b}</span>, <i key={b + '·'} aria-hidden>●</i>])
  return (
    <div className="rl-marq" aria-label={`Everything one kit covers: ${BANNER.join(', ')}`}>
      <div className="rl-marq-run" aria-hidden>{run}{BANNER.flatMap((b) => [<span key={b + '2'}>{b}</span>, <i key={b + '·2'}>●</i>])}</div>
    </div>
  )
}

/** the second paste box, mid-page: it hands the link to the top box, which
 *  reads it (one flow: same sign-in, same draft kept) */
function MidPaste() {
  const [u, setU] = useState('')
  const [err, setErr] = useState('')
  const go = () => {
    const v = u.trim()
    if (!/^https?:\/\//i.test(v)) { setErr(v ? "that doesn't look like a web address · it starts with https://" : 'paste your listing link first · it starts with https://'); void trackEvent('paste_box_submit', { product: 'realtors', box: 'mid', how: 'url', invalid: true }); return }
    setErr('')
    window.dispatchEvent(new CustomEvent('rl-paste', { detail: v }))
  }
  return (
    <form className="rl-mid" onSubmit={(e) => { e.preventDefault(); go() }} data-ph-private>
      <label htmlFor="rl-url-2">Try it on yours.</label>
      <div className="row">
        <input id="rl-url-2" className="rl-input" placeholder="https://… your listing link" value={u} onChange={(e) => { setU(e.target.value); if (err) setErr('') }} inputMode="url" autoComplete="off" />
        <button type="submit" className="rl-btn">Get my free kit →</button>
        {err && <p className="err" role="alert">{err}</p>}
      </div>
    </form>
  )
}

function Landing() {
  const { kit, session_id, prepaid, url, text } = Route.useSearch()
  return (
    <div className="fd rl">
      {!kit && <Banner />}
      <KitPage kitId={kit} sessionId={session_id} prepaidSession={prepaid} urlIn={url} textIn={text === '1'} aside={<SampleTiles />}>
        <div className="rl-lower">
          <div className="rl-steps3">
            <div><p className="n">1</p><h3>Paste</h3><p>Check the facts Shutap read back.</p></div>
            <div><p className="n">2</p><h3>Pick a tone</h3><p>Professional, funny, luxury or young.</p></div>
            <div><p className="n">3</p><h3>Copy, shoot, post</h3><p>Copy from your phone or film in shoot mode.</p></div>
          </div>

          <MidPaste />

          <div>
            <p className="rl-kicker" style={{ textAlign: 'left', margin: '0 0 10px' }}>Pricing</p>
            <div className="rl-price4">
              <div className="on"><h3>First kit · free</h3><p>Marked “— shutap.com”.</p></div>
              <div><h3>One kit · {usd(KIT_ONCE.amount)}</h3><p>No subscription, no marks.</p></div>
              <div><h3>Basic · {usd(PLANS.basic.amount)}/mo</h3><p>20 kits a month.</p></div>
              <div><h3>Pro · {usd(PLANS.pro.amount)}/mo</h3><p>Unlimited.</p></div>
            </div>
            <p className="rl-note" style={{ marginTop: 8 }}>Copies, the PDF and shoot mode are unlimited on every kit. <Link to="/pricing" className="rl-note" style={{ textDecoration: 'underline' }}>All plans</Link></p>
          </div>

          <div className="rl-who">
            <div style={{ flex: '1 1 480px', minWidth: 0 }}>
              <h2>Who’s behind this</h2>
              <p>Built in Menlo Park, CA by founder Candy Fan. Questions: <a href="mailto:hello@shutap.com">hello@shutap.com</a></p>
            </div>
            <button type="button" className="rl-btn rl-btn-lg" onClick={() => { void trackEvent('seo_cta_clicked', { page: 'realtors', product: 'realtors', kind: 'who_block' }); const el = document.getElementById('rl-url') ?? document.getElementById('rl-text'); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); window.setTimeout(() => (el as HTMLElement | null)?.focus(), 400) }}>Get my free kit ↑</button>
          </div>
        </div>
      </KitPage>
      <Footer />
    </div>
  )
}
