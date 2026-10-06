import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { ogImageMeta } from "@/lib/seo/meta";
import { SeoPage } from '@/components/seo/SeoPage'
import { SITE_URL } from '@/lib/site'

// Legacy URL. The old leaderboard feature is retired; /halls now renders a
// short noindex page pointing to rooms and the joke generator.
const PATH = '/halls'
const TITLE = 'The best jokes now live in rooms — Shutap'
const DESCRIPTION =
  'Shutap is an AI joke generator. The jokes people post live in rooms: office, work, family, school, live and social.'

function HallsPage() {
  return (
    <SeoPage>
      <article style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 'clamp(26px,5vw,36px)', margin: 0, color: '#0b080f', letterSpacing: '-.01em', lineHeight: 1.15 }}>
          The best jokes now live in rooms.
        </h1>
        <p style={{ fontFamily: "'Newsreader',serif", fontSize: 16, lineHeight: 1.55, color: '#443c42', margin: 0, maxWidth: '46ch' }}>
          Rooms are public topic feeds: office, work, family, school, live and social. Like, comment, save and follow.
        </p>
        <p style={{ margin: 0 }}>
          <a href="/rooms" style={{ color: '#17131a', borderBottom: '1px solid rgba(23,19,26,.3)', textDecoration: 'none', fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 16 }}>
            See rooms →
          </a>
        </p>
        <p style={{ margin: 0 }}>
          <Link to="/" style={{ color: '#17131a', borderBottom: '1px solid rgba(23,19,26,.3)', textDecoration: 'none', fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 16 }}>
            Turn yours into a joke →
          </Link>
        </p>
      </article>
    </SeoPage>
  )
}

function HallsRoot() {
  const { pathname } = useLocation()
  // Flat-file routing makes /halls/$hall/$region/$window a child of this
  // route. Render the short page only on the exact /halls path; otherwise
  // defer to the child route via <Outlet />.
  const normalized = pathname.replace(/\/+$/, '')
  if (normalized === '/halls' || normalized === '') return <HallsPage />
  return <Outlet />
}

export const Route = createFileRoute('/halls')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      { name: 'robots', content: 'noindex, follow' },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: `${SITE_URL}${PATH}` },
      ...ogImageMeta(),
      { name: 'twitter:title', content: TITLE },
      { name: 'twitter:description', content: DESCRIPTION },
    ],
    links: [{ rel: 'canonical', href: `${SITE_URL}${PATH}` }],
  }),
  component: HallsRoot,
})
