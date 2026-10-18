import { createFileRoute, redirect } from '@tanstack/react-router'

// Retired with the venting product. Permanent redirect so old links and
// search results land somewhere useful.
export const Route = createFileRoute('/family')({
  beforeLoad: () => {
    throw redirect({ to: '/guides', statusCode: 301 })
  },
})
