import { createFileRoute, Link } from '@tanstack/react-router'
import { ogImageMeta } from '@/lib/seo/meta'
import { SITE_URL } from '@/lib/site'
import { breadcrumbScript } from '@/lib/seo/breadcrumbs'
import { PLANS, PLAN_LINES, usd } from '@/lib/pricing'
import { Footer } from '@/components/feed/Footer'
import '@/components/feed/feed.css'

const PATH = '/pricing'
const BASIC = PLANS.basic.amount
const PRO = PLANS.pro.amount

const TITLE = `Pricing — Free AI Joke Generator for Creators, plans from ${usd(BASIC)}/mo`
const DESCRIPTION = `Shutap is a free AI joke generator for creators, with teleprompter, scene and screenplay views. Basic is ${usd(BASIC)}/month: 5 new bits a day, no watermark. Pro is ${usd(PRO)}/month: unlimited bits, no watermark and the Mirror. Cancel anytime.`

const FREE = [
  'Your first bit with no account',
  '2 new bits a day when you sign in',
  'A full bit: hook, setup, tags and button',
  'Hotter, tighter, mix and tag swap on your bits',
  'Teleprompter, scene and screenplay page',
  'Set list of every bit you keep',
  'Downloads with a Shutap watermark',
]
const QA = [
  { q: 'Is the AI joke generator really free?', a: 'Yes. Your first bit needs no account, and signing in gives you 2 new bits a day. Rewrites (hotter, tighter, mix, tag swap) on your own bits never count against the limit.' },
  { q: 'What do Basic and Pro cost?', a: `Basic is ${usd(BASIC)} a month: 5 new bits a day and no watermark. Pro is ${usd(PRO)} a month: unlimited bits, no watermark and the Mirror. Prices are in US dollars; tax may be added at checkout.` },
  { q: 'What counts toward the daily limit?', a: 'Only new bits. Rewriting a bit you already have is free. Limits reset at midnight Pacific.' },
  { q: 'Can I move from Basic to Pro?', a: 'Yes, any time. You pay the difference for the rest of the month, and Pro starts right away.' },
  { q: 'Is there a free trial?', a: 'No trial. The free plan is the trial: write your bits before you decide.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your account; you keep your plan until the end of the period you paid for. Payments are handled by Stripe.' },
  { q: 'Can I use the bits commercially?', a: 'You can use the bits Shutap writes for you in your own videos and sets, on any plan. See the terms for details.' },
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
          description: 'AI bit and joke generator for content creators and comedians, with teleprompter, scene and screenplay views.',
          brand: { '@type': 'Brand', name: 'Shutap' },
          url: SITE_URL,
          offers: [
            { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD', url: `${SITE_URL}/` },
            { '@type': 'Offer', name: 'Basic', price: BASIC.toFixed(2), priceCurrency: 'USD', url: `${SITE_URL}/subscribe?plan=basic` },
            { '@type': 'Offer', name: 'Pro', price: PRO.toFixed(2), priceCurrency: 'USD', url: `${SITE_URL}/subscribe?plan=pro` },
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

function Check() {
  return (
    <span aria-hidden style={{ color: 'var(--rose)', fontWeight: 800, flex: 'none' }}>
      ✓
    </span>
  )
}

function PlanColumn({ plan, best }: { plan: 'basic' | 'pro'; best?: boolean }) {
  const p = PLANS[plan]
  return (
    <section
      className="fd-post"
      style={{ gap: 14, padding: 22, ...(best ? { borderColor: 'var(--rose)', boxShadow: '0 18px 40px -28px rgba(160,50,90,.55)' } : {}) }}
    >
      <div className="fd-between">
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{p.name}</h2>
        {best && (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--rose-ink)', background: 'var(--surface)', borderRadius: 999, padding: '4px 10px' }}>
            best deal
          </span>
        )}
      </div>
      <div>
        <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.04em' }}>{usd(p.amount)}</span>
        <span className="fd-muted"> /month</span>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9, fontSize: 14.5 }}>
        {['Everything in Free', ...PLAN_LINES[plan]].map((f) => (
          <li key={f} style={{ display: 'flex', gap: 9 }}>
            <Check />
            {f}
          </li>
        ))}
      </ul>
      <a href={`/subscribe?plan=${plan}`} className={`fd-btn block${best ? '' : ' ghost'}`} style={{ marginTop: 'auto' }}>
        get {p.name} · {usd(p.amount)}
      </a>
    </section>
  )
}

function PricingPage() {
  return (
    <div className="fd">
      <div className="fd-col" style={{ maxWidth: 980, gap: 22, paddingTop: 36 }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <h1 className="fd-h1" style={{ fontSize: 'clamp(30px,5vw,46px)' }}>
            Free to write. {usd(BASIC)} to go clean.
          </h1>
          <p className="fd-muted" style={{ fontSize: 16, maxWidth: 560, margin: 0 }}>
            Shutap is a free AI joke generator for creators. Basic removes the watermark. Pro writes as many as you want and adds the Mirror.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
          <section className="fd-post" style={{ gap: 14, padding: 22 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Free</h2>
            <div>
              <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.04em' }}>$0</span>
              <span className="fd-muted"> forever</span>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9, fontSize: 14.5 }}>
              {FREE.map((f) => (
                <li key={f} style={{ display: 'flex', gap: 9 }}>
                  <Check />
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/" className="fd-btn ghost block" style={{ marginTop: 'auto' }}>
              write jokes free
            </Link>
          </section>
          <PlanColumn plan="basic" />
          <PlanColumn plan="pro" best />
        </div>

        <p className="fd-faint" style={{ textAlign: 'center', margin: 0 }}>
          Prices in USD. Tax may apply. No free trial. Cancel anytime. Limits reset at midnight Pacific. Payments by Stripe.
        </p>

        <section style={{ marginTop: 16 }}>
          <h2 className="fd-h1" style={{ fontSize: 22, marginBottom: 10 }}>
            Pricing questions
          </h2>
          {QA.map((x) => (
            <details key={x.q} style={{ borderTop: '1px solid var(--line)', padding: '14px 0' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 15, listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
                {x.q}
                <span aria-hidden style={{ color: 'var(--faint)' }}>
                  +
                </span>
              </summary>
              <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, color: 'var(--ink-2)' }}>{x.a}</p>
            </details>
          ))}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
            <Link to="/faq" className="fd-link fd-muted">all questions →</Link>
            <Link to="/how-it-works" className="fd-link fd-muted">how it works →</Link>
            <Link to="/terms" className="fd-link fd-muted">terms →</Link>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
