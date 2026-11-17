// Reddit leads, the daily run (pg_cron, about 7am Pacific).
//
// GET: the cron. Public on purpose, like /api/public/bit-health, so the cron
// needs no secret; it is cheap to hit because a day that already ran returns
// at once (one run per Pacific day).
// POST with x-cron-secret: a manual run. {"force": true} runs again even if
// today already ran (the daily draft caps still hold).
//
// It only reads Google results and writes drafts for Candy to post by hand;
// see src/lib/reddit-leads/run.server.ts.
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/hooks/reddit-leads')({
  server: {
    handlers: {
      GET: async () => {
        const { runRedditLeads } = await import('@/lib/reddit-leads/run.server')
        const summary = await runRedditLeads()
        return Response.json(summary, { status: summary.ok ? 200 : 500 })
      },
      POST: async ({ request }) => {
        const provided = request.headers.get('x-cron-secret') ?? ''
        const expected = process.env.CRON_SECRET ?? ''
        if (!expected || provided.length !== expected.length || provided !== expected) {
          return new Response('Unauthorized', { status: 401 })
        }
        const body = (await request.json().catch(() => ({}))) as { force?: unknown }
        const { runRedditLeads } = await import('@/lib/reddit-leads/run.server')
        const summary = await runRedditLeads({ force: body.force === true })
        return Response.json(summary, { status: summary.ok ? 200 : 500 })
      },
    },
  },
})
