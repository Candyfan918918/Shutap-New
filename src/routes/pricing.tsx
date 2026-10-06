import { createFileRoute, Link } from '@tanstack/react-router'
import { ogImageMeta } from '@/lib/seo/meta'
import { SITE_URL } from '@/lib/site'
import { breadcrumbScript } from '@/lib/seo/breadcrumbs'
import { PLAN_TO_PRICE, usd } from '@/lib/pricing'
import { Footer } from '@/components/feed/Footer'
import '@/components/feed/feed.css'

const PATH = '/pricing'
const MONTHLY = PLAN_TO_PRICE.monthly.amount
const ANNUAL = PLAN_TO_PRICE.annual.amount
const PER_MONTH = ANNUAL / 12
const SAVE_PCT = Math.round((1 - ANNUAL / (MONTHLY * 12)) * 100)

const TITLE = 'Pricing — Free AI Bit & Joke Generator, Shutap+ from $4.17/mo'
const DESCRIPTION = `Shutap is a free AI bit generator for content creators and comedians, with teleprompter, scene and screenplay views. Shutap+ is ${usd(MONTHLY)}/month or ${usd(ANNUAL)}/year: no watermark on downloads, plus the Mirror. Cancel anytime.`

const FREE = [
  'A full bit per story: hook, setup, tags and button',
  'Teleprompter, scene and screenplay page',
  'Five stories a day',
  'First bit with no account',
  'Set list of every bit you keep',
  'Post to rooms, like, comment, follow',
  'Downloads with a Shutap watermark',
]
const PLUS = [
  'Everything in Free',
  'No watermark on any download',
  'The Mirror: what keeps coming up in your stories',
  'Same five stories a day — Shutap+ never sells more bits',
  'Cancel anytime; access runs to the end of the period',
]
const QA = [
  { q: 'Is the AI bit generator really free?', a: 'Yes. Writing bits, the teleprompter, scene and screenplay views, keeping bits, posting to rooms, following and commenting are free. Shutap+ only removes the watermark and adds the Mirror.' },
  { q: 'What does Shutap+ cost?', a: `${usd(MONTHLY)} a month, or ${usd(ANNUAL)} a year (about ${usd(PER_MONTH)} a month, ${SAVE_PCT}% less than monthly). Prices are in US dollars; tax may be added at checkout.` },
  { q: 'Is there a free trial?', a: 'No trial. The free plan is the trial: write as many sets as the daily limit allows before you decide.' },
  { q: 'Do paid members get more bits?', a: 'No. Everyone gets five stories a day. Shutap+ is about clean downloads and the Mirror, not volume.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your account; you keep Shutap+ until the end of the period you paid for. Payments are handled by Stripe.' },
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
            { '@type': 'Offer', name: 'Shutap+ monthly', price: MONTHLY.toFixed(2), priceCurrency: 'USD', url: `${SITE_URL}/subscribe?plan=monthly` },
            { '@type': 'Offer', name: 'Shutap+ annual', price: ANNUAL.toFixed(2), priceCurrency: 'USD', url: `${SITE_URL}/subscribe?plan=annual` },
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

function PricingPage() {
  return (
    <div className="fd">
      <div className="fd-col" style={{ maxWidth: 880, gap: 22, paddingTop: 36 }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <h1 className="fd-h1" style={{ fontSize: 'clamp(30px,5vw,46px)' }}>
            Free to write. {usd(MONTHLY)} to go clean.
          </h1>
          <p className="fd-muted" style={{ fontSize: 16, maxWidth: 560, margin: 0 }}>
            Shutap is a free AI bit generator for content creators and comedians. Shutap+ removes the watermark and adds the Mirror.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
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

          <section className="fd-post" style={{ gap: 14, padding: 22, borderColor: 'var(--rose)', boxShadow: '0 18px 40px -28px rgba(160,50,90,.55)' }}>
            <div className="fd-between">
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Shutap+</h2>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--rose-ink)', background: 'var(--surface)', borderRadius: 999, padding: '4px 10px' }}>
                annual saves {SAVE_PCT}%
              </span>
            </div>
            <div>
              <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.04em' }}>{usd(MONTHLY)}</span>
              <span className="fd-muted"> /month</span>
              <div className="fd-muted" style={{ marginTop: 2 }}>
                or {usd(ANNUAL)}/year — {usd(PER_MONTH)}/month
              </div>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9, fontSize: 14.5 }}>
              {PLUS.map((f) => (
                <li key={f} style={{ display: 'flex', gap: 9 }}>
                  <Check />
                  {f}
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
              <a href="/subscribe?plan=annual" className="fd-btn block">
                get annual · {usd(ANNUAL)}
              </a>
              <a href="/subscribe?plan=monthly" className="fd-btn ghost block">
                get monthly · {usd(MONTHLY)}
              </a>
            </div>
          </section>
        </div>

        <p className="fd-faint" style={{ textAlign: 'center', margin: 0 }}>
          Prices in USD. Tax may apply. No free trial. Cancel anytime. Payments by Stripe.
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
