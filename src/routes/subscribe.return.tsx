import { pageMeta } from '@/lib/seo/page-meta'
import { createFileRoute } from '@tanstack/react-router'
import { SubscribeReturnPage } from '@/pages/Subscribe'

export const Route = createFileRoute('/subscribe/return')({
  ssr: false,
  head: () => ({ meta: [...pageMeta("Checkout — Shutap", "Check the result of your checkout and return to writing.", "/subscribe/return")] }),
  component: SubscribeReturnPage,
})
