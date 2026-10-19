import { pageMeta } from '@/lib/seo/page-meta'
import { createFileRoute } from '@tanstack/react-router'
import { ActivityPage } from '@/pages/feed/ActivityPage'

export const Route = createFileRoute('/activity')({
  ssr: false,
  head: () => ({ meta: [...pageMeta("Activity — Shutap", "See likes, comments and follows on your Shutap posts.", "/activity"), { name: 'robots', content: 'noindex' }] }),
  component: ActivityPage,
})
