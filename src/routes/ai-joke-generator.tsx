// The old URL of the humor amplifier page. Kept as a redirect for links and
// search results that still point here.
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/ai-joke-generator')({
  beforeLoad: () => {
    throw redirect({ to: '/humor-amplifier', statusCode: 301 })
  },
})
