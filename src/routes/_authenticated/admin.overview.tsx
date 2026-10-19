import { pageMeta } from '@/lib/seo/page-meta'
import { createFileRoute } from '@tanstack/react-router'
import { AdminPage } from '@/pages/Admin'

export const Route = createFileRoute('/_authenticated/admin/overview')({
  head: () => ({ meta: [...pageMeta("Admin · Overview — Shutap", "Review account and activity totals in the private Shutap overview.", "/admin/overview"), { name: 'robots', content: 'noindex' }] }),
  component: AdminPage,
})
