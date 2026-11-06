// Shutap Toasts landing pages (Nov 6 2026): /toasts/thanksgiving,
// /toasts/office-holiday-party, /toasts/new-years, /toasts/best-man,
// /toasts/maid-of-honor. Server-rendered for search and AI crawlers: the
// heading, the form already set to the occasion, then the page's own guide
// and FAQ (with FAQPage schema). The guides link here.
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { pageMeta } from '@/lib/seo/page-meta'
import { breadcrumbScript } from '@/lib/seo/breadcrumbs'
import { SITE_URL } from '@/lib/site'
import { Footer } from '@/components/feed/Footer'
import { ToastForm } from '@/pages/toasts/ToastForm'
import { LANDINGS, landingBySlug } from '@/lib/toasts/landings'
import '@/components/feed/feed.css'
import '@/pages/realtors/realtors.css'

export const Route = createFileRoute('/toasts/$slug')({
  loader: ({ params }) => {
    const l = landingBySlug(params.slug)
    if (!l) throw notFound()
    return { slug: l.slug }
  },
  head: ({ params }) => {
    const l = landingBySlug(params.slug)
    if (!l) return {}
    const path = `/toasts/${l.slug}`
    return {
      meta: pageMeta(l.title, l.description, path),
      links: [{ rel: 'canonical', href: `${SITE_URL}${path}` }],
      scripts: [
        breadcrumbScript([{ name: 'Toasts', path: '/toasts' }, { name: l.kicker.replace(/^shutap toasts · /, ''), path }]),
        { type: 'application/ld+json', children: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: l.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }) },
      ],
    }
  },
  component: LandingPage,
})

function LandingPage() {
  const { slug } = Route.useLoaderData()
  const l = landingBySlug(slug)!
  const others = LANDINGS.filter((x) => x.slug !== l.slug)
  return (
    <div className="fd">
      <ToastForm occasionIn={l.occasion} kicker={l.kicker} h1={l.h1} lead={l.lead} />
      <div className="rl">
        <article className="rl-col" style={{ maxWidth: 760, gap: 20, paddingTop: 0 }}>
          {l.sections.map((s) => (
            <section key={s.h2} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h2 style={{ margin: 0, font: '800 24px/1.2 var(--sora)', letterSpacing: '-0.02em', color: 'var(--wine)' }}>{s.h2}</h2>
              {s.body.map((p) => <p key={p} style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: 'var(--ink-2)' }}>{p}</p>)}
              {s.list && <ol style={{ margin: 0, paddingLeft: 22, fontSize: 16, lineHeight: 1.7, color: 'var(--ink-2)' }}>{s.list.map((x) => <li key={x}>{x}</li>)}</ol>}
            </section>
          ))}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={{ margin: 0, font: '800 24px/1.2 var(--sora)', letterSpacing: '-0.02em', color: 'var(--wine)' }}>Questions</h2>
            {l.faqs.map((f) => (
              <div key={f.q}>
                <h3 style={{ margin: '0 0 4px', font: '700 16px var(--sora)', color: 'var(--ink)' }}>{f.q}</h3>
                <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: 'var(--ink-2)' }}>{f.a}</p>
              </div>
            ))}
          </section>
          <nav aria-label="More toasts" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {l.guide && <a href={l.guide.href} className="rl-note" style={{ fontSize: 15, color: 'var(--rose-ink)' }}>{l.guide.label} →</a>}
            <div className="rl-row">
              <Link to="/toasts" className="rl-chip">all occasions</Link>
              {others.map((o) => <Link key={o.slug} to="/toasts/$slug" params={{ slug: o.slug }} className="rl-chip">{o.kicker.replace(/^shutap toasts · /, '')}</Link>)}
            </div>
          </nav>
        </article>
      </div>
      <Footer />
    </div>
  )
}
