import { pageMeta } from '@/lib/seo/page-meta'
import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '@/pages/Profile'

export const Route = createFileRoute('/_authenticated/profile')({
  ssr: false,
  head: () => ({
    meta: [
      ...pageMeta("Account — Shutap", "Your Shutap name, plan and account.", "/profile"),
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ProfilePage,
})
