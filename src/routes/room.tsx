import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/room')({
  beforeLoad: ({ search }) => {
    const id = (search as { id?: string }).id
    if (id && /^[0-9a-f-]{36}$/i.test(id)) throw redirect({ to: '/rooms/$id', params: { id }, replace: true })
    throw redirect({ to: '/rooms', replace: true })
  },
})
