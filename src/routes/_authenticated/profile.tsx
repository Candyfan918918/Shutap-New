import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '@/pages/Profile'

export const Route = createFileRoute('/_authenticated/profile')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'your set list — shutap' },
      { name: 'description', content: 'your saved jokes and account.' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ProfilePage,
})
