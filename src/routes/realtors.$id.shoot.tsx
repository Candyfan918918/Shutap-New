import { createFileRoute } from '@tanstack/react-router'
import { pageMeta } from '@/lib/seo/page-meta'
import { Prompter } from '@/pages/realtors/Prompter'
import '@/pages/realtors/realtors.css'

export const Route = createFileRoute('/realtors/$id/shoot')({
  ssr: false,
  head: () => ({ meta: [...pageMeta('Shoot mode — Shutap for Realtors', 'The walkthrough as a teleprompter on your phone.', '/realtors'), { name: 'robots', content: 'noindex' }] }),
  component: () => {
    const { id } = Route.useParams()
    return <div data-ph-private style={{ display: 'contents' }}><Prompter kitId={id} /></div>
  },
})
