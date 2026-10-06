import { createFileRoute } from '@tanstack/react-router'
import { PostPage } from '@/pages/feed/PostPage'

export const Route = createFileRoute('/rooms/$id')({
  head: () => ({ meta: [{ title: 'Post — Shutap' }] }),
  component: PostRoute,
})

function PostRoute() {
  const { id } = Route.useParams()
  return <PostPage id={id} />
}
