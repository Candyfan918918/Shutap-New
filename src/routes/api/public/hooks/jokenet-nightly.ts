// Nightly cron (3:23am Pacific): the JokeNet writer adds a batch of in-house
// lines for the founder's rating queue. Idempotent per night.
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/hooks/jokenet-nightly')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get('x-cron-secret') ?? ''
        const expected = process.env.CRON_SECRET ?? ''
        if (!expected || provided.length !== expected.length || provided !== expected) {
          return new Response('Unauthorized', { status: 401 })
        }
        const { runJokenetNightly } = await import('@/lib/jokenet-nightly.server')
        try {
          const report = await runJokenetNightly()
          if (report.errors.length) console.warn('[jokenet-nightly]', report.errors)
          return Response.json(report)
        } catch (e) {
          console.error('[jokenet-nightly] failed', e)
          return Response.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 })
        }
      },
    },
  },
})
