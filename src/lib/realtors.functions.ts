// Shutap for Realtors (Nov 5 2026): the server functions. Dark until the
// realtors flag is on; the lab functions are admin-only and work regardless
// so the founder can rate kits before anyone sees the product.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { readFlags } from './flags'
import { DEFAULT_LISTING_CONTROLS, OUTPUTS, TONES, type Kit, type Listing, type ListingControls } from './realtors/listing'
import type { KitResult } from './realtors/kit.server'

const ControlsIn = z.object({
  tone: z.enum(TONES).optional(),
  roast_house: z.boolean().optional(),
  roast_neighborhood: z.boolean().optional(),
  mention_price: z.boolean().optional(),
  must_say: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
  never_say: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
})

async function requireAdmin(context: unknown): Promise<void> {
  const c = context as { supabase: any; userId: string }
  const { data } = await c.supabase.rpc('has_role', { _user_id: c.userId, _role: 'admin' })
  if (!data) throw new Error('Forbidden')
}

export type ReadListingResult =
  | { ok: true; listing: Listing; how: 'jsonld' | 'og' | 'text'; seen?: string }
  | { ok: false; reason: 'bad_url' | 'blocked' | 'fetch_failed' | 'nothing_found' | 'not_a_listing' | 'off'; host?: string; seen?: string }

/** Read a listing from a link or pasted text. Anyone signed in, once the
 *  flag is on; admins always (for the lab). */
export const readListing = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ url: z.string().url().max(2000).optional(), text: z.string().max(12000).optional() }).parse(d))
  .handler(async ({ data, context }): Promise<ReadListingResult> => {
    if (!readFlags().realtors) {
      try { await requireAdmin(context) } catch { return { ok: false, reason: 'off' } }
    }
    const { readListingText, readListingUrl } = await import('./realtors/read.server')
    if (data.text && data.text.trim().length >= 40) return readListingText(data.text)
    if (data.url) return readListingUrl(data.url)
    return { ok: false, reason: 'nothing_found' }
  })

const ListingIn = z.object({
  source: z.string().max(120),
  url: z.string().max(2000).nullable(),
  address: z.string().max(200).nullable(),
  city: z.string().max(80).nullable(),
  price: z.string().max(30).nullable(),
  beds: z.number().nullable(),
  baths: z.number().nullable(),
  sqft: z.number().nullable(),
  year_built: z.number().nullable(),
  description: z.string().max(4000),
  photos: z.array(z.string().max(200)).max(30),
  note: z.string().max(600),
})

export type LabKitResult = { ok: true; result: KitResult; eval_id: string | null; prompt_version: string } | { ok: false; reason: 'failed' }

/** Admin only: write a kit from a listing, every candidate shown, nothing
 *  charged, stored in kit_evals for rating. */
export const labWriteKit = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ listing: ListingIn, controls: ControlsIn }).parse(d))
  .handler(async ({ data, context }): Promise<LabKitResult> => {
    await requireAdmin(context)
    const { writeKit } = await import('./realtors/kit.server')
    const { KIT_PROMPT_VERSION } = await import('./realtors/prompts.server')
    const controls: ListingControls = { ...DEFAULT_LISTING_CONTROLS, ...data.controls }
    const result = await writeKit(data.listing as Listing, controls)
    if (!result) return { ok: false, reason: 'failed' }
    let evalId: string | null = null
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
      const { data: row } = await (supabaseAdmin as any)
        .from('kit_evals')
        .insert({ listing: data.listing, controls, result: { kit: result.kit, skipped: result.skipped, winner: result.winner, why: result.why, ms: result.ms, candidates: result.candidates.map((c) => ({ model: c.model, ms: c.ms, checks: c.checks })) }, prompt_version: KIT_PROMPT_VERSION })
        .select('id')
        .single()
      evalId = row?.id ?? null
    } catch (e) {
      console.warn('[kit-lab] eval not stored (table missing?)', e instanceof Error ? e.message : e)
    }
    return { ok: true, result, eval_id: evalId, prompt_version: KIT_PROMPT_VERSION }
  })

/** Admin only: rate a lab kit. */
export const rateLabKit = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ eval_id: z.string().uuid(), rating: z.enum(['pick', 'cut', 'rewrite']), notes: z.string().max(1000).optional() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    await requireAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { error } = await (supabaseAdmin as any).from('kit_evals').update({ rating: data.rating, notes: data.notes ?? null }).eq('id', data.eval_id)
    return { ok: !error }
  })

/** Admin only: the lab's ledger. */
export const labKitEvals = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }): Promise<{ total: number; pick: number; cut: number; rewrite: number; unrated: number; by_version: Record<string, { pick: number; cut: number; rewrite: number }> }> => {
    await requireAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data } = await (supabaseAdmin as any).from('kit_evals').select('rating, prompt_version')
    const rows: { rating: string | null; prompt_version: string }[] = data ?? []
    const by: Record<string, { pick: number; cut: number; rewrite: number }> = {}
    let pick = 0, cut = 0, rewrite = 0, unrated = 0
    for (const r of rows) {
      by[r.prompt_version] ??= { pick: 0, cut: 0, rewrite: 0 }
      if (r.rating === 'pick') { pick++; by[r.prompt_version]!.pick++ }
      else if (r.rating === 'cut') { cut++; by[r.prompt_version]!.cut++ }
      else if (r.rating === 'rewrite') { rewrite++; by[r.prompt_version]!.rewrite++ }
      else unrated++
    }
    return { total: rows.length, pick, cut, rewrite, unrated, by_version: by }
  })

export { OUTPUTS, type Kit }
