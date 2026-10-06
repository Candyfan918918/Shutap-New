import { createFileRoute, redirect } from '@tanstack/react-router'

// Retired with the venting product. Permanent redirect so old links and
// search results land somewhere useful.
export const Route = createFileRoute('/career')({
  beforeLoad: () => {
    throw redirect({ to: '/rooms', search: { topic: 'work' }, statusCode: 301 })
  },
})
