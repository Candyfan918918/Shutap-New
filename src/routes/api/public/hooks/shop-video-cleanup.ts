// Daily cron (about 1:41am Pacific): delete small-business videos that are
// past their 30 days. It only ever deletes what is already due, so anyone
// calling it, or a repeat fire, changes nothing that was not going anyway.
import { createFileRoute } from '@tanstack/react-router'

async function run() {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { cleanUpVideos } = await import('@/lib/shops/creations.server')
    const report = await cleanUpVideos(supabaseAdmin)
    if (report.errors.length) console.warn('[shop-video-cleanup]', report.errors)
    return Response.json({ due: report.due, removed: report.removed, ok: !report.errors.length })
  } catch (e) {
    console.error('[shop-video-cleanup] failed', e)
    return Response.json({ ok: false }, { status: 500 })
  }
}

export const Route = createFileRoute('/api/public/hooks/shop-video-cleanup')({
  server: { handlers: { GET: run, POST: run } },
})
