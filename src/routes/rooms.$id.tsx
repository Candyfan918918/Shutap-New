import { pageMeta } from '@/lib/seo/page-meta'
import { createFileRoute } from '@tanstack/react-router'
import { PostPage } from '@/pages/feed/PostPage'

export const Route = createFileRoute('/rooms/$id')({
  head: ({ params }) => ({ meta: [...pageMeta('Post — Shutap', 'Read a published Shutap post and its comments.', `/rooms/${params.id}`), { name: 'robots', content: 'noindex, follow' }] }),
  component: PostRoute,
})

function PostRoute() {
  const { id } = Route.useParams()
  return <PostPage id={id} />
}
