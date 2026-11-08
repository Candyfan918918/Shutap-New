// The /bits demo (Nov 8 2026, Candy): five lines typed in-house in /bit-lab,
// "funnier" used where it helped, picked by Candy with "Use as the /bits
// demo". The newest pick is the demo on shutap.com/bits, so she picks in the
// lab and the page updates. Never a user's bit. No pick yet: the page shows
// the visitor's own lines instead, and never a made-up bit.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import type { BitControls, SketchElement, SkitBeat } from '@/lib/bits/shared'

export type DemoLines = { hook: string; setup: string; tags: [string, string]; button: string }
/** a line where funnier was used: what was typed, and the option picked */
export type DemoFunnier = { slot: 'hook' | 'setup' | 'tag0' | 'tag1' | 'button'; typed: string; picked: string; move: string }
export type BitDemo = {
  id: string
  lines: DemoLines
  funnier: DemoFunnier[]
  controls: BitControls | null
  sketch: SketchElement[] | null
  skit: SkitBeat[] | null
}

async function adminDb(): Promise<any> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}

async function assertAdmin(ctx: unknown): Promise<void> {
  const c = ctx as { supabase: { rpc: (fn: 'has_role', args: { _user_id: string; _role: 'admin' }) => PromiseLike<{ data: unknown; error: unknown }> }; userId: string }
  const { data, error } = await c.supabase.rpc('has_role', { _user_id: c.userId, _role: 'admin' })
  if (error || !data) throw new Error('Forbidden')
}

const line = z.string().trim().min(1).max(400)
const SLOT = z.enum(['hook', 'setup', 'tag0', 'tag1', 'button'])

/** The newest picked demo, for /bits. Public; null when there is none. */
export const getBitDemo = createServerFn({ method: 'GET' }).handler(async (): Promise<BitDemo | null> => {
  try {
    const db = await adminDb()
    const { data } = await db.from('bit_demos').select('id, lines, funnier, controls, sketch, skit').order('created_at', { ascending: false }).limit(1)
    const r = (data ?? [])[0]
    if (!r?.lines?.hook) return null
    return { id: r.id, lines: r.lines, funnier: Array.isArray(r.funnier) ? r.funnier : [], controls: r.controls ?? null, sketch: r.sketch ?? null, skit: r.skit ?? null }
  } catch (e) {
    console.warn('[bit-demo] read failed', e)
    return null
  }
})

/** /bit-lab: make these five lines the /bits demo. The sketch and the skit are
 *  laid out once here (no new jokes, per their prompts) and kept with it. */
export const saveBitDemo = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        lines: z.object({ hook: line, setup: line, tags: z.tuple([line, line]), button: line }),
        funnier: z.array(z.object({ slot: SLOT, typed: z.string().max(400), picked: z.string().max(400), move: z.string().max(200) })).max(10),
        controls: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
    await assertAdmin(context)
    const { writeSketch, writeSkit } = await import('@/lib/bits/pipeline.server')
    const l = data.lines
    const story = [l.hook, l.setup, ...l.tags, l.button].join(' ')
    const bit = { hook: l.hook, setup: l.setup, tags: [...l.tags], button: l.button }
    const [sketch, skit] = await Promise.all([writeSketch(story, bit).catch(() => null), writeSkit(story, bit).catch(() => null)])
    const db = await adminDb()
    const { data: row, error } = await db.from('bit_demos').insert({ lines: l, funnier: data.funnier, controls: data.controls ?? null, sketch, skit } as never).select('id').single()
    if (error) return { ok: false, error: error.message }
    return { ok: true, id: row.id as string }
  })
