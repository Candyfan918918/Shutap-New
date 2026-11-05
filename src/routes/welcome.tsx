import { createFileRoute } from '@tanstack/react-router'
import { WelcomeNativePage } from '@/pages/WelcomeNative'
import { pageMeta } from '@/lib/seo/page-meta'

export const Route = createFileRoute('/welcome')({
  ssr: false,
  head: () => ({
    meta: [
      ...pageMeta(
        'Sign in — Shutap',
        'Sign in to Shutap to write your bit: a free account gets one a day with its 5-second video, kept in your set list.',
        '/welcome',
      ),
      { name: 'robots', content: 'noindex' },
    ],
    styles: [
      { children: 'html,body{background:#100c14}' },
    ],
  }),
  headers: () => ({
    'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
  }),
  component: WelcomeNativePage,
})
