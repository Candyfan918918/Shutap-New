import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getFlags } from '@/lib/flags.functions'
import { NO_FLAGS, type Flags } from '@/lib/flags'
import { ogImageMeta } from '@/lib/seo/meta'
import { SITE_URL } from '@/lib/site'
import { breadcrumbScript } from '@/lib/seo/breadcrumbs'
import { EVERY_PLAN, KIT_ONCE, PLANS, PLAN_COMPARE, usd, type CompareTier, FREE_LINE } from '@/lib/pricing'
import { Footer } from '@/components/feed/Footer'
import '@/components/feed/feed.css'

const PATH = '/pricing'
const BASIC = PLANS.basic.amount
const PRO = PLANS.pro.amount

const TITLE = `Pricing — Shutap, the Humor Amplifier, plans from ${usd(BASIC)}/mo`
const DESCRIPTION = `Shutap is a free humor amplifier: a bit, a 5-second video from your story, with stand-up, sketch and skit formats. You pay to make something new, never to use it: downloads, copies and "funnier" are unlimited on every plan. Free with an account: one bit a day, downloads watermarked. Basic is ${usd(BASIC)}/month: 3 new bits a day with rewrites, 20 realtor kits a month and 1 toast a month, no watermark. Pro is ${usd(PRO)}/month: unlimited bits, rewrites, kits and toasts, and the Mirror. One kit or one toast on its own is ${usd(KIT_ONCE.amount)}. Cancel anytime.`

const QA = [
  { q: 'Is Shutap really free?', a: 'Yes, with a free account. Sign in first (one tap with Google or Apple), then you get one new bit a day, as written, with its 5-second video, and stand-up, sketch and skit. Download and copy as often as you like (with a shutap.com watermark), and "funnier" on any line. Rewrites (hotter, tighter, storytelling), crowd-work swaps and mix your own come with Basic and Pro.' },
  { q: 'What do Basic and Pro cost?', a: `Basic is ${usd(BASIC)} a month: 3 new bits a day (a rewrite counts as one), crowd-work swaps and mix your own, 20 realtor kits a month and 1 toast a month, with unlimited clean downloads. Pro is ${usd(PRO)} a month: unlimited bits, rewrites, kits and toasts, no watermark, and the Mirror. One kit or toast on its own is ${usd(KIT_ONCE.amount)}. Prices are in US dollars; tax may be added at checkout.` },
  { q: 'What counts toward the limit?', a: 'Only making something new: a new bit, a rewrite (hotter, tighter, storytelling, written again with a new video), a new realtor kit (a rewrite in a new tone is a new kit). Using what you made never counts: downloads, copies, the PDF, the prompter, "funnier" and lock are unlimited, and everything stays in My creations to download again any time. Bits reset at midnight Pacific; kits on the 1st of the month.' },
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
          description: 'The humor amplifier: a bit, a 5-second video from your own story, with stand-up, sketch and skit formats.',
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
        <span className="fd-muted"> {paid ? '/month' : 'with a free account'}</span>
        {!paid && <div style={{ fontWeight: 700, marginTop: 6 }}>{FREE_LINE}</div>}
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

/** One pricing page for every product (Nov 6 2026, behind newnav): a tab
 *  row jumps to the product; every product's plans stay on the page. */
const PRODUCT_TABS = [['bits', 'Bits'], ['realtors', 'Realtors'], ['toasts', 'Toasts'], ['enterprise', 'Enterprise']] as const
function ProductTabs({ active, onPick }: { active: string; onPick: (k: string) => void }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
      {PRODUCT_TABS.map(([k, l]) => (
        <a key={k} role="tab" href={`#${k}`} aria-selected={active === k} className="fd-chip" onClick={() => onPick(k)} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', ...(active === k ? { background: 'var(--rose)', color: '#fff', borderColor: 'var(--rose)' } : {}) }}>{l}</a>
      ))}
    </div>
  )
}
function Tile({ name, price, per, lines, cta, href, best }: { name: string; price: string; per?: string; lines: string[]; cta: string; href: string; best?: boolean }) {
  return (
    <section className="fd-post" style={{ gap: 12, padding: 20, ...(best ? { borderColor: 'var(--rose)' } : {}) }}>
      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{name}</h3>
      <div><span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.04em' }}>{price}</span>{per && <span className="fd-muted"> {per}</span>}</div>
      <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 14, lineHeight: 1.5, color: 'var(--ink-2)' }}>{lines.map((l) => <li key={l}>{l}</li>)}</ul>
      <a href={href} className={`fd-btn block${best ? '' : ' ghost'}`} style={{ marginTop: 'auto' }}>{cta}</a>
    </section>
  )
}
function OtherProducts() {
  return (
    <>
      <section id="realtors" style={{ display: 'flex', flexDirection: 'column', gap: 12, scrollMarginTop: 90 }}>
        <div>
          <h2 className="fd-h1" style={{ fontSize: 24, marginBottom: 4 }}>Shutap for Realtors</h2>
          <p className="fd-muted" style={{ margin: 0, fontSize: 15 }}>Paste the listing link; get the walkthrough to shoot, the voiceover, the hooks, the open-house kit, the posts and the straight copy, in your tone. One account with Bits: Basic and Pro cover both.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
          <Tile name="First kit" price="free" lines={['one listing, all six outputs, every tone to try', 'each output ends with "— shutap.com"', 'sign in with Google or Apple']} cta="paste a listing" href="/realtors/kit" />
          <Tile name="One kit" price={usd(KIT_ONCE.amount)} per="once" lines={['one listing, no subscription', 'paid before it\'s written, or to take the mark off your free kit', 'copy, download and shoot without limits or marks, forever']} cta="buy from the kit page" href="/realtors/kit" />
          <Tile name="Basic" price={usd(PLANS.basic.amount)} per="/month" lines={['20 kits a month (a rewrite is one)', 'copies, the PDF and shoot mode: unlimited, nothing marked', 'funnier on any line, unlimited', 'everything in Bits Basic']} cta={`get Basic · ${usd(PLANS.basic.amount)}`} href="/subscribe?plan=basic&from=pricing_realtors" best />
          <Tile name="Pro" price={usd(PLANS.pro.amount)} per="/month" lines={['unlimited kits and rewrites', 'copies and downloads unlimited, nothing marked', 'everything in Bits Pro']} cta={`get Pro · ${usd(PLANS.pro.amount)}`} href="/subscribe?plan=pro&from=pricing_realtors" />
        </div>
      </section>
      <section id="toasts" style={{ display: 'flex', flexDirection: 'column', gap: 12, scrollMarginTop: 90 }}>
        <div>
          <h2 className="fd-h1" style={{ fontSize: 24, marginBottom: 4 }}>Shutap Toasts <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--rose-ink)', background: 'var(--surface)', borderRadius: 999, padding: '3px 8px', verticalAlign: 'middle' }}>soon</span></h2>
          <p className="fd-muted" style={{ margin: 0, fontSize: 15 }}>Best man, maid of honor, parents, retirement, birthday: your stories about them, said funnier, with a teleprompter and a clock. Same rule as everything here: you pay to write a toast, never to use it. Free: your first toast (marked). Basic: 1 toast a month. Pro: unlimited. Any toast on its own: {usd(KIT_ONCE.amount)}. Edit it until you lock it; once locked, the speech, cue cards, keepsake and prompter download as often as you like, forever, from My creations.</p>
        </div>
        <div><Link to="/toasts" className="fd-btn ghost">join the list</Link></div>
      </section>
      <section id="enterprise" style={{ display: 'flex', flexDirection: 'column', gap: 12, scrollMarginTop: 90 }}>
        <div>
          <h2 className="fd-h1" style={{ fontSize: 24, marginBottom: 4 }}>Shutap Enterprise</h2>
          <p className="fd-muted" style={{ margin: 0, fontSize: 15 }}>Say it funnier in the deck, the all-hands and the sales call; the Shutap dataset and techniques for your team. Name, title, company, and we reply within a day.</p>
        </div>
        <div><Link to="/business" className="fd-btn ghost">request pricing</Link></div>
      </section>
      <section aria-label="What counts" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 className="fd-h1" style={{ fontSize: 20 }}>What counts</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead><tr style={{ textAlign: 'left', color: 'var(--muted)' }}><th style={{ padding: '8px 6px' }}>Product</th><th style={{ padding: '8px 6px' }}>What's metered</th><th style={{ padding: '8px 6px' }}>Free</th><th style={{ padding: '8px 6px' }}>Basic</th><th style={{ padding: '8px 6px' }}>Pro</th></tr></thead>
            <tbody>
              {[
                ['Bits', 'new bits (a rewrite is one)', '1 bit a day', '3 bits a day', 'unlimited'],
                ['Realtors', 'new kits (a rewrite in a new tone is one)', '1 kit, outputs marked', '20 kits a month', 'unlimited'],
                ['One kit', `${usd(KIT_ONCE.amount)} once, before or after it\'s written`, 'any time', 'past the 20', '—'],
                ['Downloads, copies, prompter, funnier', 'never metered', 'unlimited · marked', 'unlimited · clean', 'unlimited · clean'],
                ['Toasts', 'new toasts · soon', 'first toast, marked', '1 toast a month', 'unlimited'],
                ['One toast', `${usd(KIT_ONCE.amount)} once · soon`, 'any time', 'past the 1', '—'],
                ['Enterprise', 'seats and decks', '—', '—', 'quoted'],
              ].map((r) => <tr key={r[0]} style={{ borderTop: '1px solid var(--line)' }}>{r.map((c, i) => <td key={i} style={{ padding: '8px 6px', verticalAlign: 'top', fontWeight: i === 0 ? 700 : 400 }}>{c}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
        <p className="fd-faint" style={{ margin: 0 }}>You pay to make something new, never to use it. Bits reset at midnight Pacific; realtor kits on the 1st of the month. Everything you made stays in My creations, to download again any time.</p>
      </section>
    </>
  )
}

function PricingPage() {
  const [flags, setFlags] = useState<Flags>(NO_FLAGS)
  const [tab, setTab] = useState('bits')
  useEffect(() => { getFlags().then(setFlags).catch(() => {}) }, [])
  useEffect(() => { const h = window.location.hash.replace('#', ''); if (PRODUCT_TABS.some(([k]) => k === h)) setTab(h) }, [])
  return (
    <div className="fd">
      <div className="fd-col" style={{ maxWidth: 980, gap: 22, paddingTop: 36 }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <h1 className="fd-h1" style={{ fontSize: 'clamp(30px,5vw,46px)' }}>
            {flags.newnav ? <>One account. Every product.</> : <>Free to use. {usd(BASIC)} to download clean.</>}
          </h1>
          <p className="fd-muted" style={{ fontSize: 16, maxWidth: 560, margin: 0 }}>
            {flags.newnav ? 'Pick what you need to be funny for. One plan covers Bits and Realtors; Toasts is next. Prices in US dollars, limits reset at midnight Pacific, cancel anytime.' : 'Every bit comes with a 5-second video. Download it as often as you like: Free with a watermark, Basic and Pro clean. Pro adds unlimited bits and the Mirror.'}
          </p>
          {flags.newnav && <ProductTabs active={tab} onPick={setTab} />}
        </div>
        {flags.newnav && <h2 id="bits" className="fd-h1" style={{ fontSize: 24, margin: '6px 0 -8px', scrollMarginTop: 90 }}>Shutap Bits</h2>}

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
            Sign in free for your first bit. Rewrites, swaps and your own mix come with Basic and Pro.
          </p>
        </section>

        <p className="fd-faint" style={{ textAlign: 'center', margin: 0 }}>
          Prices in USD. Tax may apply. No free trial. Cancel anytime. Limits reset at midnight Pacific. Payments by Stripe.
        </p>
        {flags.newnav && <OtherProducts />}

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
