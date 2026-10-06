import { createFileRoute } from '@tanstack/react-router'
import { ActivityPage } from '@/pages/feed/ActivityPage'

export const Route = createFileRoute('/activity')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Activity — Shutap' }, { name: 'robots', content: 'noindex' }] }),
  component: ActivityPage,
})
