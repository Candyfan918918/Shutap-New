// The old set list (until Nov 6 2026). Everything a person makes now lives
// in My creations, under the profile; old links land there.
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/set-list')({
  beforeLoad: () => {
    throw redirect({ to: '/creations', statusCode: 301 })
  },
})
