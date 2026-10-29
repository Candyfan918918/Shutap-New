import { createFileRoute, Link } from '@tanstack/react-router'
import { ogImageMeta } from '@/lib/seo/meta'
import { SITE_URL } from '@/lib/site'
import { breadcrumbScript } from '@/lib/seo/breadcrumbs'
import { EVERY_PLAN, PLANS, PLAN_COMPARE, usd, type CompareTier } from '@/lib/pricing'
import { Footer } from '@/components/feed/Footer'
import '@/components/feed/feed.css'

const PATH = '/pricing'
const BASIC = PLANS.basic.amount
const PRO = PLANS.pro.amount

const TITLE = `Pricing — Shutap, the Humor Amplifier, plans from ${usd(BASIC)}/mo`
const DESCRIPTION = `Shutap is a free humor amplifier: a bit, a 5-second video, caption and hashtags from your story, with teleprompter, scene and screenplay views. Free: one download a day with a watermark. Basic is ${usd(BASIC)}/month: 5 new bits and 3 clean downloads a day. Pro is ${usd(PRO)}/month: unlimited bits and downloads, no watermark, and the Mirror. Cancel anytime.`

const QA = [
  { q: 'Is Shutap really free?', a: 'Yes. Your first bit needs no account to read, and you can watch its video here. Signing in is free: it lets you rewrite it, and gives you one download a day: the video, or the caption and hashtags, or the picture (video and picture carry a shutap.com watermark), and gives you 2 new bits a day. A rewrite (hotter, tighter, escalate) is written again and its video is rendered again, so it counts as a new bit; tag swap and mix your own are free.' },
  { q: 'What do Basic and Pro cost?', a: `Basic is ${usd(BASIC)} a month: 5 new bits a day and 3 downloads a day with no watermark. Pro is ${usd(PRO)} a month: unlimited bits, unlimited downloads with no watermark, and the Mirror. Prices are in US dollars; tax may be added at checkout.` },
  { q: 'What counts toward the daily limit?', a: 'New bits, rewrites and downloads. A rewrite (hotter, tighter, escalate) is a new bit: written again, video rendered again. The video is one download; copying the caption and hashtags is another; the picture or script PDF another; a rewrite\'s downloads count again. Tag swap and mix your own are free. Limits reset at midnight Pacific.' },
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
          description: 'The humor amplifier: a bit, a 5-second video, caption and hashtags from your own story, with teleprompter, scene and screenplay views.',
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

function Rows({ tier }: { tier: CompareTier }) {
  const rows = PLAN_COMPARE.map((r) => ({ label: r.label, ...r.cells[tier] }))
  return (
    <dl style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
      {rows.map((r, i) => (
        <div
          key={r.label}
          className="fd-between"
          style={{ padding: '11px 0', borderTop: i ? '1px solid var(--line)' : 'none', alignItems: 'baseline' }}
        >
          <dt style={{ fontSize: 14, color: 'var(--muted)' }}>{r.label}</dt>
          <dd
            style={{
              margin: 0,
              fontSize: r.on ? 15.5 : 14,
              fontWeight: r.on ? 800 : 500,
              color: r.on ? 'var(--ink)' : 'var(--faint)',
              textAlign: 'right',
            }}
          >
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function PlanCard({ plan }: { plan: 'free' | 'basic' | 'pro' }) {
  const best = plan === 'pro'
  const paid = plan !== 'free'
  const name = paid ? PLANS[plan].name : 'Free'
  const price = paid ? usd(PLANS[plan].amount) : '$0'
  return (
    <section
      className="fd-post"
      style={{
        gap: 14,
        padding: 22,
        ...(best ? { borderColor: 'var(--rose)', boxShadow: '0 18px 40px -28px rgba(160,50,90,.55)' } : {}),
        ...(plan === 'free' ? { background: 'transparent', boxShadow: 'none' } : {}),
      }}
    >
      <div className="fd-between">
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{name}</h2>
        {best && (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--rose-ink)', background: 'var(--surface)', borderRadius: 999, padding: '4px 10px' }}>
            best deal
          </span>
        )}
      </div>
      <div>
        <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-.04em' }}>{price}</span>
        <span className="fd-muted"> {paid ? '/month' : 'forever'}</span>
      </div>
      <Rows tier={plan} />
      {paid ? (
        <a href={`/subscribe?plan=${plan}`} className={`fd-btn block${best ? '' : ' ghost'}`} style={{ marginTop: 'auto' }}>
          get {name} · {price}
        </a>
      ) : (
        <Link to="/" className="fd-btn ghost block" style={{ marginTop: 'auto' }}>
          start free
        </Link>
      )}
    </section>
  )
}

function PricingPage() {
  return (
    <div className="fd">
      <div className="fd-col" style={{ maxWidth: 980, gap: 22, paddingTop: 36 }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <h1 className="fd-h1" style={{ fontSize: 'clamp(30px,5vw,46px)' }}>
            Free to use. {usd(BASIC)} to download clean.
          </h1>
          <p className="fd-muted" style={{ fontSize: 16, maxWidth: 560, margin: 0 }}>
            Every bit comes with a 5-second video, a caption and hashtags. Free downloads one a day with a watermark. Basic removes it. Pro downloads as much as you want and adds the Mirror.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
          <PlanCard plan="free" />
          <PlanCard plan="basic" />
          <PlanCard plan="pro" />
        </div>

        <section aria-label="Every plan includes" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Every plan, Free included</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {EVERY_PLAN.map((f) => (
              <li key={f} className="fd-chip" style={{ height: 'auto', padding: '6px 12px', cursor: 'default' }}>
                {f}
              </li>
            ))}
          </ul>
          <p className="fd-faint" style={{ margin: 0 }}>
            Your first bit needs no account. Sign in free to rewrite it and download the video.
          </p>
        </section>

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
