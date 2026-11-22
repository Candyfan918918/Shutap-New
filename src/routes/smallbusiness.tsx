import { pageMeta } from '@/lib/seo/page-meta'
// Shutap for small business. Opened to everyone on Nov 21 2026 (Candy:
// "open it"): server-rendered, in the sitemap, with its search title,
// description and the questions marked up. SHUTAP_FLAG_SMALLBUSINESS=0
// hides it again: then it opens only for an admin, client-only and noindex
// (and public/robots.txt should get its "Disallow: /smallbusiness" back).
import { createFileRoute, notFound } from '@tanstack/react-router'
import { amIAdmin } from '@/lib/admin.functions'
import { getFlags } from '@/lib/flags.functions'
import { readFlags } from '@/lib/flags'
import { breadcrumbScript } from '@/lib/seo/breadcrumbs'
import { SITE_URL } from '@/lib/site'
import { SB_DESCRIPTION, SB_FAQ, SB_PATH, SB_TITLE } from '@/lib/shops/page-copy'
import { SmallBusinessPage } from '@/pages/smallbusiness/Page'

export const Route = createFileRoute('/smallbusiness')({
  // server-rendered only once it is open to everyone (this runs on the server)
  ssr: () => !!readFlags().smallbusiness,
  beforeLoad: async () => {
    const flags = await getFlags().catch(() => null)
    if (flags?.smallbusiness) return
    try {
      if (!(await amIAdmin())) throw notFound()
    } catch {
      throw notFound()
    }
  },
  loader: async () => ({ open: !!(await getFlags().catch(() => null))?.smallbusiness }),
  head: ({ loaderData }) => {
    if (!loaderData?.open) return { meta: [...pageMeta('Shutap for small business', SB_DESCRIPTION, SB_PATH), { name: 'robots', content: 'noindex' }] }
    return {
      meta: pageMeta(SB_TITLE, SB_DESCRIPTION, SB_PATH),
      links: [{ rel: 'canonical', href: `${SITE_URL}${SB_PATH}` }],
      scripts: [
        { type: 'application/ld+json', children: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: SB_FAQ.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) }) },
        breadcrumbScript([{ name: 'Small business', path: SB_PATH }]),
      ],
    }
  },
  component: SmallBusinessPage,
})
