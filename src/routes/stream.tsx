import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/stream')({
  beforeLoad: () => {
    throw redirect({ to: '/rooms', replace: true })
  },
})
