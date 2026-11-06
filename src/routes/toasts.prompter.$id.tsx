// Shutap Toasts (Nov 6 2026): the phone prompter and rehearse, private and
// client-only (disallowed in robots.txt). ?rehearse=1 runs rehearse;
// ?short=1 runs the 60-second version. Names ride after the #.
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { pageMeta } from '@/lib/seo/page-meta'
import { ToastPrompter } from '@/pages/toasts/ToastPrompter'

export const Route = createFileRoute('/toasts/prompter/$id')({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => z.object({ rehearse: z.string().max(2).optional().catch(undefined), short: z.string().max(2).optional().catch(undefined) }).parse(s),
  head: () => ({ meta: [...pageMeta('Prompter — Shutap Toasts', 'Your toast, one line at a time.', '/toasts'), { name: 'robots', content: 'noindex' }] }),
  component: PrompterRoute,
})

function PrompterRoute() {
  const { id } = Route.useParams()
  const { rehearse, short } = Route.useSearch()
  return <div data-ph-private style={{ display: 'contents' }}><ToastPrompter id={id} rehearse={rehearse === '1'} short={short === '1'} /></div>
}
