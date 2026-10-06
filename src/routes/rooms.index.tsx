import { createFileRoute } from '@tanstack/react-router'
import { SITE_URL } from '@/lib/site'
import { TOPICS, type Topic } from '@/lib/feed-shared'
import { FeedPage } from '@/pages/feed/FeedPage'

type Search = { tab?: 'new' | 'following' | 'saved'; topic?: Topic }

export const Route = createFileRoute('/rooms/')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: s.tab === 'following' || s.tab === 'saved' ? s.tab : undefined,
    topic: TOPICS.includes(s.topic as Topic) ? (s.topic as Topic) : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Rooms — Shutap' },
      { name: 'description', content: 'Jokes people wrote about their own day. Office, work, family, school, live, social.' },
    ],
    links: [{ rel: 'canonical', href: `${SITE_URL}/rooms` }],
  }),
  component: FeedRoute,
})

function FeedRoute() {
  const s = Route.useSearch()
  return <FeedPage tab={s.tab ?? 'new'} topic={s.topic ?? null} />
}
