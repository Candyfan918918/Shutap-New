import { createFileRoute, redirect } from '@tanstack/react-router'
import { SITE_URL } from '@/lib/site'
import { TOPICS, type Topic } from '@/lib/feed-shared'
import { FeedPage } from '@/pages/feed/FeedPage'

type Search = { tab?: 'new' | 'following' | 'saved'; topic?: Topic }

export const Route = createFileRoute('/rooms/')({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: s.tab === 'following' || s.tab === 'saved' ? s.tab : undefined,
    topic: TOPICS.includes(s.topic as Topic) ? (s.topic as Topic) : undefined,
  }),
  // Bare /rooms has no content to show, so it sends people to the guides hub.
  // The feed stays reachable with an explicit tab or topic (saved, following).
  beforeLoad: ({ search }) => {
    if (!search.tab && !search.topic) throw redirect({ to: '/guides', statusCode: 301 })
  },
  head: () => ({
    meta: [
      { title: 'Rooms — Shutap' },
      { name: 'description', content: 'Jokes people wrote about their own day. Office, work, family, school, live, social.' },
      { name: 'robots', content: 'noindex, follow' },
      { property: 'og:title', content: 'Rooms — Shutap' },
      { property: 'og:url', content: `${SITE_URL}/rooms` },
    ],
    links: [{ rel: 'canonical', href: `${SITE_URL}/rooms` }],
  }),
  component: FeedRoute,
})

function FeedRoute() {
  const s = Route.useSearch()
  return <FeedPage tab={s.tab ?? 'new'} topic={s.topic ?? null} />
}
