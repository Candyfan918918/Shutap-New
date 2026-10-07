import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '@/pages/Profile'

export const Route = createFileRoute('/_authenticated/profile')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Account — Shutap' },
      { name: 'description', content: 'Your Shutap name, plan and account.' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ProfilePage,
})
