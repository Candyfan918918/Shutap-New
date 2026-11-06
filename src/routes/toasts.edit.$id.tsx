// Shutap Toasts (Nov 6 2026): one toast, private: the editor until it's
// locked, then the locked page with the deliverables. Signed in only;
// client-only, so it is disallowed in robots.txt. ?session_id= is the
// "remove the mark" return; ?changed= is the "change a line" return.
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { pageMeta } from '@/lib/seo/page-meta'
import { Footer } from '@/components/feed/Footer'
import { ToastPage } from '@/pages/toasts/ToastPage'
import '@/components/feed/feed.css'

export const Route = createFileRoute('/toasts/edit/$id')({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => z.object({ session_id: z.string().max(200).optional().catch(undefined), changed: z.string().max(200).optional().catch(undefined) }).parse(s),
  head: () => ({ meta: [...pageMeta('Your toast — Shutap Toasts', 'Your toast.', '/toasts'), { name: 'robots', content: 'noindex' }] }),
  component: EditRoute,
})

function EditRoute() {
  const { id } = Route.useParams()
  const { session_id, changed } = Route.useSearch()
  return (
    <div className="fd" data-ph-private>
      <ToastPage id={id} sessionId={session_id} changedSession={changed} />
      <Footer />
    </div>
  )
}
