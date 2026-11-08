// Shutap Toasts occasion pages (Nov 8 2026 redesign): /toasts/best-man,
// /maid-of-honor, /father-of-the-bride, /mother-of-the-bride, /thanksgiving,
// /christmas, /office-holiday-party, /new-years, /retirement, /birthday, and
// /any-occasion. Server-rendered for search and AI crawlers: the heading, the
// real toast for the occasion (the newest lab toast Candy rated "pick"), the
// four-step form, then the page's guide and FAQ (with FAQPage schema).
// ?prepaid= is the $12.99 return: the toast is written on this same page.
import { createFileRoute, notFound } from '@tanstack/react-router'
import { z } from 'zod'
import { pageMeta } from '@/lib/seo/page-meta'
import { breadcrumbScript } from '@/lib/seo/breadcrumbs'
import { SITE_URL } from '@/lib/site'
import { Footer } from '@/components/feed/Footer'
import { OccasionPage } from '@/pages/toasts/OccasionPage'
import { landingBySlug } from '@/lib/toasts/landings'
import '@/components/feed/feed.css'
import '@/pages/realtors/realtors.css'

export const Route = createFileRoute('/toasts/$slug')({
  validateSearch: (s: Record<string, unknown>) => z.object({ prepaid: z.string().max(200).optional().catch(undefined) }).parse(s),
  loader: async ({ params }) => {
    const l = landingBySlug(params.slug)
    if (!l) throw notFound()
    const { getToastDemo } = await import('@/lib/toasts/demo.functions')
    const demo = await getToastDemo({ data: { occasion: l.occasion === 'other' ? 'other' : l.occasion, ...(l.preset?.demo ? { relation: l.preset.demo } : {}) } }).catch(() => null)
    return { slug: l.slug, demo }
  },
  staleTime: 5 * 60_000,
  head: ({ params }) => {
    const l = landingBySlug(params.slug)
    if (!l) return {}
    const path = `/toasts/${l.slug}`
    return {
      meta: pageMeta(l.title, l.description, path),
      links: [{ rel: 'canonical', href: `${SITE_URL}${path}` }],
      scripts: [
        breadcrumbScript([{ name: 'Toasts', path: '/toasts' }, { name: l.name, path }]),
        { type: 'application/ld+json', children: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: l.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }) },
      ],
    }
  },
  component: LandingPage,
})

function LandingPage() {
  const { slug, demo } = Route.useLoaderData()
  const { prepaid } = Route.useSearch()
  const l = landingBySlug(slug)!
  return (
    <div className="fd">
      <OccasionPage l={l} demo={demo} prepaid={prepaid} />
      <Footer />
    </div>
  )
}
