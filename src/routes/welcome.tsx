import { createFileRoute } from '@tanstack/react-router'
import { WelcomeNativePage } from '@/pages/WelcomeNative'
import { pageMeta } from '@/lib/seo/page-meta'

export const Route = createFileRoute('/welcome')({
  ssr: false,
  head: () => ({
    meta: [
      ...pageMeta(
        'Sign in — Shutap',
        'Sign in to Shutap to keep your bits, save joke cards and post to rooms under your own alias.',
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
