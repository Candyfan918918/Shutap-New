import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { pageMeta } from '@/lib/seo/page-meta'
import { KitPage } from '@/pages/realtors/KitPage'
import '@/components/feed/feed.css'

export const Route = createFileRoute('/realtors/kit/')({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => z.object({ kit: z.string().uuid().optional(), session_id: z.string().max(200).optional(), prepaid: z.string().max(200).optional(), url: z.string().max(2000).optional(), text: z.string().max(2).optional() }).parse(s),
  head: () => ({ meta: [...pageMeta('Write the kit — Shutap for Realtors', 'Paste the listing link; get the walkthrough, voiceover, hooks, open-house kit, posts and straight copy in your tone.', '/realtors/kit'), { name: 'robots', content: 'noindex' }] }),
  component: () => {
    const { kit, session_id, prepaid, url, text } = Route.useSearch()
    return <div className="fd" data-ph-private style={{ display: 'contents' }}><KitPage kitId={kit} sessionId={session_id} prepaidSession={prepaid} urlIn={url} textIn={text === '1'} /></div>
  },
})
