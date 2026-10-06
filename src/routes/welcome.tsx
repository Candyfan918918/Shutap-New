import { createFileRoute } from '@tanstack/react-router'
import { WelcomeNativePage } from '@/pages/WelcomeNative'

export const Route = createFileRoute('/welcome')({
  ssr: false,
  head: () => ({
    meta: [{ title: 'Sign in — Shutap' }, { name: 'robots', content: 'noindex' }],
    styles: [
      { children: 'html,body{background:#100c14}' },
    ],
  }),
  headers: () => ({
    'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
  }),
  component: WelcomeNativePage,
})
