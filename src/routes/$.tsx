import { createFileRoute, redirect } from '@tanstack/react-router'

// Catch-all: unknown paths land on the rooms feed.
export const Route = createFileRoute('/$')({
  beforeLoad: () => { throw redirect({ to: '/rooms' }) },
})
