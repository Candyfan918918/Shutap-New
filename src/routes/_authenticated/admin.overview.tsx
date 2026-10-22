import { createFileRoute, redirect } from '@tanstack/react-router'

// Spill/Scan-era page, retired. Product metrics live on /admin.
export const Route = createFileRoute('/_authenticated/admin/overview')({
  beforeLoad: () => {
    throw redirect({ to: '/admin' })
  },
  component: () => null,
})
