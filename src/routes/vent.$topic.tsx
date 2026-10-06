import { createFileRoute, redirect } from '@tanstack/react-router'

// Retired with the venting product. Topics that match a room go to that
// room; the rest go to the write box. Permanent redirects.
const ROOM: Record<string, 'family' | 'work' | 'school' | 'social'> = {
  family: 'family',
  parenting: 'family',
  work: 'work',
  money: 'work',
  friendship: 'social',
  romance: 'social',
  roommates: 'social',
  stranger: 'social',
}

export const Route = createFileRoute('/vent/$topic')({
  beforeLoad: ({ params }) => {
    const topic = ROOM[params.topic]
    if (topic) throw redirect({ to: '/rooms', search: { topic }, statusCode: 301 })
    throw redirect({ to: '/', statusCode: 301 })
  },
})
