// GET /api/public/bit-health — writes a real test bit through the same path
// a visitor uses (Scrubber → Guard → writer) and reports whether it worked.
//
// Run every 30 minutes by pg_cron, and after every deploy. A failure emails
// the founder (alert.server). Nothing is stored except the result row in
// bit_health; the test stories are fixed, so no user text ever passes here.
//
// Public on purpose (the cron and a post-deploy check can both call it), so
// it is cheap to hit: a run younger than 10 minutes is returned from the log
// instead of re-running; ?fresh=1 forces a run, but not more than once per
// 2 minutes.
import { createFileRoute } from '@tanstack/react-router'
import { AUDIENCES, LENGTHS, VOICES, type BitControls } from '@/lib/bits/shared'

const TEST_STORIES = [
  'My neighbor borrowed my ladder in March and returned it in October with a note that said "thanks for the loan," like it was a bank transaction.',
  'My boss scheduled a meeting called "quick sync" that lasted ninety minutes and ended with him asking if anyone had questions.',
  'My sister reorganized my kitchen while I was at work and now I cannot find the forks, but the spices are alphabetized.',
]

const CACHE_MS = 10 * 60 * 1000
const FRESH_FLOOR_MS = 2 * 60 * 1000

function pick<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)]!
}

export const Route = createFileRoute('/api/public/bit-health')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const fresh = new URL(request.url).searchParams.get('fresh') === '1'
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const db = supabaseAdmin as any

        const { data: last } = await db
          .from('bit_health')
          .select('created_at, source, ok, ms, model, detail')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        const age = last ? Date.now() - new Date(last.created_at).getTime() : Infinity
        if (last && (age < FRESH_FLOOR_MS || (!fresh && age < CACHE_MS))) {
          return Response.json({ cached: true, ...last }, { status: last.ok ? 200 : 503 })
        }

        const { runScrub } = await import('@/lib/agents/scrubber.functions')
        const { runClassifyCrisis } = await import('@/lib/agents/guard.functions')
        const { writeBitFromStory } = await import('@/lib/bits/pipeline.server')
        const { alertBitFailure } = await import('@/lib/bits/alert.server')

        const story = pick(TEST_STORIES)
        const controls: BitControls = {
          audience: pick(AUDIENCES),
          voice: pick(VOICES),
          length: pick(LENGTHS),
          heat: pick([1, 2, 3, 4, 5] as const),
        }
        const t0 = Date.now()
        let ok = false
        let model: string | null = null
        const detail: Record<string, unknown> = { controls }
        try {
          const scrubbed = await runScrub(story)
          detail.scrub_ms = Date.now() - t0
          if (!scrubbed.clean_text.trim()) throw new Error('scrubber returned empty text')
          const t1 = Date.now()
          const crisis = await runClassifyCrisis(scrubbed.clean_text)
          detail.guard_ms = Date.now() - t1
          if (crisis.crisis) throw new Error('guard flagged a harmless test story as crisis')
          const sink: { failure?: { error: string | null; rejected: { rule: string }[] } } = {}
          const written = await writeBitFromStory(scrubbed.clean_text, controls, undefined, sink as never)
          if (!written || !written.ranked.length) {
            detail.error = sink.failure?.error ?? 'no bit'
            detail.rejected = sink.failure?.rejected?.map((r) => r.rule) ?? []
          } else {
            ok = true
            model = written.writerModel
            detail.hook = written.ranked[0]!.hook
            detail.attempts = written.attempts
          }
        } catch (e) {
          detail.error = e instanceof Error ? e.message : String(e)
        }
        const ms = Date.now() - t0
        await db.from('bit_health').insert({ source: fresh ? 'manual' : 'scheduled', ok, ms, model, detail })
        if (!ok) await alertBitFailure('health_check_failed', { ms, ...detail })
        return Response.json({ cached: false, ok, ms, model, detail }, { status: ok ? 200 : 503 })
      },
    },
  },
})
