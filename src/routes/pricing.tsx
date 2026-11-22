import { useSmallBusinessOpen } from '@/hooks/use-smallbusiness-open'
import { SHOP_VIDEO_CAPS } from '@/lib/entitlements'
import { KEEP_DAYS } from '@/lib/shops/shop'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ogImageMeta } from '@/lib/seo/meta'
import { SITE_URL } from '@/lib/site'
import { breadcrumbScript } from '@/lib/seo/breadcrumbs'
import { KIT_ONCE, ONE_TIME_LINE, PLANS, PLAN_SUMMARY, usd } from '@/lib/pricing'
import { Footer } from '@/components/feed/Footer'
import '@/components/feed/feed.css'

const PATH = '/pricing'
const BASIC = PLANS.basic.amount

const TITLE = `Pricing — Shutap, the Humor Amplifier, plans from ${usd(BASIC)}/mo`
const DESCRIPTION = `Free: your first ${SHOP_VIDEO_CAPS.free} small-business videos, 3 bits, your first realtor kit and your first toast. Basic ${usd(BASIC)}/month: ${SHOP_VIDEO_CAPS.basic} new small-business video every day, 3 bits a day with rewrites, 20 kits and 1 toast a month, no watermark. One kit or toast: ${usd(KIT_ONCE.amount)}. Downloads and copies always unlimited.`

const QA = [
  { q: 'Is Shutap free?', a: `Yes. A free account gets your first ${SHOP_VIDEO_CAPS.free} small-business videos, 3 bits, your first realtor kit and your first toast. Bits, kits and toasts are marked "— shutap.com" on Free; small-business videos carry no Shutap mark.` },
  { q: 'What does Basic include for a small business?', a: `${SHOP_VIDEO_CAPS.basic} new video every day for one business, for ${usd(BASIC)} a month. An unused day does not carry over. Each video is kept ${KEEP_DAYS} days to download again.` },
  { q: 'What do I pay for?', a: 'Only for making something new. Downloads, copies, the prompter and "funnier" are always unlimited, and everything you made stays in My creations.' },
  { q: 'Can I buy just one?', a: `Yes: ${usd(KIT_ONCE.amount)} for one realtor kit or one toast, no subscription.` },
  { q: 'Can I cancel anytime?', a: 'Yes. You keep your plan until the end of the period you paid for. Payments are handled by Stripe.' },
]

export const Route = createFileRoute('/pricing')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: `${SITE_URL}${PATH}` },
      ...ogImageMeta(),
      { name: 'twitter:title', content: TITLE },
      { name: 'twitter:description', content: DESCRIPTION },
    ],
    links: [{ rel: 'canonical', href: `${SITE_URL}${PATH}` }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: 'Shutap',
          description: 'The humor amplifier: funny videos about your small business filmed on your phone, bits, realtor kits and toasts.',
          brand: { '@type': 'Brand', name: 'Shutap' },
          url: SITE_URL,
          offers: [
            { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD', url: `${SITE_URL}/` },
            { '@type': 'Offer', name: 'Basic', price: BASIC.toFixed(2), priceCurrency: 'USD', url: `${SITE_URL}/subscribe?plan=basic` },
          ],
        }),
      },
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: QA.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })),
        }),
      },
      breadcrumbScript([{ name: 'Pricing', path: PATH }]),
    ],
  }),
  component: PricingPage,
})

/** Pricing (Nov 6 2026, Candy: "you're overcomplicating, simplify"): one
 *  set of plans for everything (bits, realtor kits, toasts), one line for
 *  buying just one, Enterprise as an inquiry link. Nothing per product. */
function PlanCard({ plan }: { plan: 'free' | 'basic' | 'pro' }) {
  const best = plan === 'pro'
  const paid = plan !== 'free'
  const name = paid ? PLANS[plan].name : 'Free'
  const price = paid ? usd(PLANS[plan].amount) : '$0'
  return (
    <section className="fd-post" style={{ gap: 14, padding: 22, ...(best ? { borderColor: 'var(--rose)', boxShadow: '0 18px 40px -28px rgba(160,50,90,.55)' } : {}) }}>
      <div className="fd-between">
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{name}</h2>
        {best && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--rose-ink)', background: 'var(--surface)', borderRadius: 999, padding: '4px 10px' }}>best deal</span>}
      </div>
      <div>
        <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.04em' }}>{price}</span>
        {paid && <span className="fd-muted"> /month</span>}
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15.5 }}>
        {PLAN_SUMMARY[plan].map((l) => <li key={l}>{l}</li>)}
      </ul>
      {paid ? (
        <a href={`/subscribe?plan=${plan}`} className={`fd-btn block${best ? '' : ' ghost'}`} style={{ marginTop: 'auto' }}>get {name}</a>
      ) : (
        <Link to="/" className="fd-btn ghost block" style={{ marginTop: 'auto' }}>start free</Link>
      )}
    </section>
  )
}

function PricingPage() {
  const sbOpen = useSmallBusinessOpen()
  return (
    <div className="fd">
      <div className="fd-col" style={{ maxWidth: 'var(--page-max)', boxSizing: 'border-box', padding: '36px var(--page-pad) 64px', gap: 22 }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <h1 className="fd-h1" style={{ fontSize: 'clamp(30px,5vw,46px)' }}>One plan for everything</h1>
          <p className="fd-muted" style={{ fontSize: 16, maxWidth: 600, margin: 0 }}>
            Small-business videos, bits, realtor kits and toasts. You pay to make something new; downloads and copies are always unlimited.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, maxWidth: 760, width: '100%', margin: '0 auto' }}>
          {/* Free and Basic only (Candy, Nov 21 2026): Pro is not built for video yet, so it is not offered here. Existing Pro subscribers keep their plan. */}
          <PlanCard plan="free" />
          <PlanCard plan="basic" />
        </div>

        {sbOpen && (
          <section className="fd-post" style={{ padding: '16px 20px', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 15.5 }}><b>For your small business:</b> <span className="fd-muted">say what happened, film three clips on your phone, get one finished video. Kept {KEEP_DAYS} days to download again.</span></span>
            <Link to="/smallbusiness" className="fd-btn ghost">make a video</Link>
          </section>
        )}

        <section className="fd-post" style={{ padding: '16px 20px', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 15.5 }}><b>Just need one?</b> <span className="fd-muted">{ONE_TIME_LINE}</span></span>
          <Link to="/realtors" className="fd-btn ghost">buy one kit · {usd(KIT_ONCE.amount)}</Link>
        </section>

        <p className="fd-muted" style={{ textAlign: 'center', margin: 0 }}>
          For a team or company: <Link to="/business" className="fd-link">Shutap Enterprise, request pricing</Link>
        </p>

        <p className="fd-faint" style={{ textAlign: 'center', margin: 0 }}>
          Prices in USD. Tax may apply. Cancel anytime. Payments by Stripe.
        </p>

        <section style={{ marginTop: 16 }}>
          <h2 className="fd-h1" style={{ fontSize: 22, marginBottom: 10 }}>Pricing questions</h2>
          {QA.map((x) => (
            <details key={x.q} style={{ borderTop: '1px solid var(--line)', padding: '14px 0' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 15, listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
                {x.q}
                <span aria-hidden style={{ color: 'var(--faint)' }}>+</span>
              </summary>
              <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-2)' }}>{x.a}</p>
            </details>
          ))}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
            <Link to="/faq" className="fd-link fd-muted">all questions →</Link>
            <Link to="/terms" className="fd-link fd-muted">terms →</Link>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
