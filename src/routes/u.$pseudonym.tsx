import { createFileRoute } from '@tanstack/react-router'
import { SITE_URL } from '@/lib/site'
import { ProfilePage } from '@/pages/feed/ProfilePage'

export const Route = createFileRoute('/u/$pseudonym')({
  head: ({ params }) => ({
    meta: [
      { title: `${params.pseudonym.replace(/-/g, ' ')} — Shutap` },
      { name: 'robots', content: 'noindex, follow' },
    ],
    links: [{ rel: 'canonical', href: `${SITE_URL}/u/${params.pseudonym}` }],
  }),
  component: ProfileRoute,
})

function ProfileRoute() {
  const { pseudonym } = Route.useParams()
  return <ProfilePage slug={pseudonym} />
}
