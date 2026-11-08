import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { pageMeta } from '@/lib/seo/page-meta'
import { Footer } from '@/components/feed/Footer'
import { OCCASIONS } from '@/lib/toasts/shared'
import { OCCASION_PAGES, landingFor } from '@/lib/toasts/landings'
import { PLANS, TOAST_ONCE, usd } from '@/lib/pricing'
import { trackEvent } from '@/lib/tracking'
import '@/components/feed/feed.css'
import '@/pages/realtors/realtors.css'
import '@/pages/toasts/toasts.css'

// Shutap Toasts hub (Nov 8 2026 redesign, approved by Candy). No form here:
// visitors who landed on a form at /toasts were confused. Each occasion page
// opens on a real toast for that occasion and carries the form itself.
// Old links keep working: ?occasion= goes to that occasion's page, and a
// $12.99 return (?prepaid=) goes to the any-occasion page, which writes it.
const TITLE = 'Shutap Toasts: your stories in, the toast, cue cards and prompter out'
const DESC = 'Pick your occasion and see a real toast first. Type your stories, in your words; Shutap builds the toast around them, with pause marks, cue cards, a phone prompter and a 60-second version. Best man, maid of honor, father and mother of the bride, Thanksgiving, Christmas, office holiday party, New Year’s, retirement and birthday.'

export const Route = createFileRoute('/toasts/')({
  validateSearch: (s: Record<string, unknown>) => z.object({ occasion: z.enum(OCCASIONS).optional().catch(undefined), prepaid: z.string().max(200).optional().catch(undefined) }).parse(s),
  beforeLoad: ({ search }) => {
    if (search.prepaid) throw redirect({ to: '/toasts/$slug', params: { slug: 'any-occasion' }, search: { prepaid: search.prepaid } as never, replace: true })
    if (search.occasion) throw redirect({ to: '/toasts/$slug', params: { slug: landingFor(search.occasion).slug }, replace: true })
  },
  head: () => ({ meta: pageMeta(TITLE, DESC, '/toasts') }),
  component: ToastsHub,
})

const GROUPS = ['Weddings', 'Holidays', 'Life and work'] as const

function ToastsHub() {
  const go = (slug: string) => () => { void trackEvent('toast_hub_pick', { product: 'toasts', slug }) }
  return (
    <div className="fd">
      <div className="rl tp">
        <section className="tp-hub">
          <div className="tp-hub-hd">
            <p className="rl-kicker" style={{ textAlign: 'left', margin: 0 }}>Shutap Toasts</p>
            <h1 className="rl-h1 rl-h1-2">Type your stories. <em>Get the toast, the cue cards and the prompter.</em></h1>
            <p className="rl-lead2">Pick your occasion. Each one shows what you get before you type a word, and the form is right there on the page.</p>
          </div>
          {GROUPS.map((g) => (
            <div key={g} className="tp-hub-g">
              <h2>{g}</h2>
              <div className="tp-hub-grid">
                {OCCASION_PAGES.filter((o) => o.hub.group === g).map((o) => (
                  <Link key={o.slug} to="/toasts/$slug" params={{ slug: o.slug }} className="tp-hub-card" onClick={go(o.slug)}>
                    <span className="t"><b>{o.name} {['best_man', 'maid_of_honor', 'parent', 'retirement'].includes(o.occasion) ? 'speech' : 'toast'}</b><span>{o.hub.lengths}</span></span>
                    <span className="k">You type</span><span className="q">{o.hub.type}</span>
                    <span className="k mu">The shape</span><span className="s">{o.hub.shape}</span>
                    <span className="go">Start here →</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <Link to="/toasts/$slug" params={{ slug: 'any-occasion' }} className="tp-hub-else" onClick={go('any-occasion')}>
            <span><b>Something else?</b><span>Toastmasters, a team dinner, a graduation, an anniversary. Same stories, any occasion.</span></span>
            <span className="go">Write a toast for any occasion →</span>
          </Link>
          <div className="tp-hub-g">
            <h2>Every toast comes with</h2>
            <div className="tp-gets">
              {[
                ['The speech', 'Pause marks, “(wait)” laugh marks, a running clock, the glasses-up cue.'],
                ['Cue cards', 'Print, cut, hold. The line to land in bold.'],
                ['The prompter', 'On your phone, one line at a time, with “skip to the toast”.'],
                ['60-second version', 'One tap, made when the room wants it short.'],
                ['Rehearse', 'A timed run-through. Nothing recorded.'],
                ['Keepsake + the text after', 'A one-page copy for weddings, retirements and birthdays, and the text to send that night.'],
              ].map(([t, p]) => <div key={t}><b>{t}</b><p>{p}</p></div>)}
            </div>
          </div>
          <div className="tp-hub-g">
            <h2>What it costs</h2>
            <div className="rl-price4">
              <div className="on"><h3>First toast · free</h3><p>shutap.com watermark on every PDF page.</p></div>
              <div><h3>One toast · {usd(TOAST_ONCE.amount)}</h3><p>No subscription, no watermark.</p></div>
              <div><h3>Basic · {usd(PLANS.basic.amount)}/mo</h3><p>1 toast a month.</p></div>
              <div><h3>Pro · {usd(PLANS.pro.amount)}/mo</h3><p>Unlimited.</p></div>
            </div>
            <p className="rl-note" style={{ fontSize: 14 }}>{usd(TOAST_ONCE.amount)} is one toast for one occasion: everything above, no watermark, downloads with no limit from profile › My creations. Edit until you lock; a change after the lock is a new toast.</p>
          </div>
          <div className="rl-who"><div><h2>Who’s behind this</h2><p>Built in Menlo Park, CA by founder Candy Fan. Questions: <a href="mailto:hello@shutap.com">hello@shutap.com</a></p></div></div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
