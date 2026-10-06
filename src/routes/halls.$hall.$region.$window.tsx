import { createFileRoute, redirect } from '@tanstack/react-router'

// Retired with the venting product. Permanent redirect so old links and
// search results land somewhere useful.
export const Route = createFileRoute('/halls/$hall/$region/$window')({
  beforeLoad: () => {
    throw redirect({ to: '/rooms', statusCode: 301 })
  },
})
