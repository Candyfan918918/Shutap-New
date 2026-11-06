import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { pageMeta } from '@/lib/seo/page-meta'
import { KitPage } from '@/pages/realtors/KitPage'
import '@/components/feed/feed.css'

export const Route = createFileRoute('/realtors/kit/')({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => z.object({ kit: z.string().uuid().optional() }).parse(s),
  head: () => ({ meta: [...pageMeta('Write the kit — Shutap for Realtors', 'Paste the listing link; get the walkthrough, voiceover, hooks, open-house kit, posts and straight copy in your tone.', '/realtors/kit'), { name: 'robots', content: 'noindex' }] }),
  component: () => {
    const { kit } = Route.useSearch()
    return <div className="fd" data-ph-private style={{ display: 'contents' }}><KitPage kitId={kit} /></div>
  },
})
