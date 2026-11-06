// Nov 6 2026: the kit tool lives on /realtors itself; kits are in My
// creations. Old links (emails, guides, Stripe returns) land on /realtors
// with the same search (kit, url, text, session_id, prepaid).
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/realtors/kit/')({
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/realtors', search: search as never, statusCode: 301 })
  },
})
