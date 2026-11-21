import { pageMeta } from '@/lib/seo/page-meta'
// Shutap for small business (Nov 21 2026). DARK: the page opens only when
// the smallbusiness flag is on, or for an admin (the founder tests end to
// end first). While it is dark it is client-only, noindex and disallowed in
// robots.txt. At launch: make it server-rendered, drop the noindex and the
// robots line, and add it to the sitemap.
import { createFileRoute, notFound } from '@tanstack/react-router'
import { amIAdmin } from '@/lib/admin.functions'
import { getFlags } from '@/lib/flags.functions'
import { SmallBusinessFlow } from '@/pages/smallbusiness/Flow'

export const Route = createFileRoute('/smallbusiness')({
  ssr: false,
  head: () => ({ meta: [...pageMeta('Shutap for small business', 'Tell us one thing that happened today. Get a funny video about your own business, ready to post.', '/smallbusiness'), { name: 'robots', content: 'noindex' }] }),
  beforeLoad: async () => {
    const flags = await getFlags().catch(() => null)
    if (flags?.smallbusiness) return
    try {
      if (!(await amIAdmin())) throw notFound()
    } catch {
      throw notFound()
    }
  },
  component: SmallBusinessFlow,
})
