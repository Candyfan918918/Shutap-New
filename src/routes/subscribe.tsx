import { pageMeta } from '@/lib/seo/page-meta'
import { createFileRoute } from '@tanstack/react-router'
import { SubscribePage } from '@/pages/Subscribe'

export const Route = createFileRoute('/subscribe')({
  ssr: false,
  head: () => ({ meta: [...pageMeta("Subscribe — Shutap", "Choose Basic or Pro and continue to checkout.", "/subscribe")] }),
  component: SubscribePage,
})
