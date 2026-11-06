// Shutap Toasts (Nov 6 2026): the server functions. Slice 1 is the lab only:
// admin-only, nothing charged, every candidate shown, each run stored in
// toast_evals for the founder to rate before anyone sees the product. The
// product functions (write, edit, lock) arrive behind the toasts flag.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { OCCASIONS, TONES, type Toast, type ToastForm, type ToastLine } from './toasts/shared'
import type { CutResult, ToastResult, ToastTouchOption } from './toasts/toast.server'

async function requireAdmin(context: unknown): Promise<void> {
  const c = context as { supabase: any; userId: string }
  const { data } = await c.supabase.rpc('has_role', { _user_id: c.userId, _role: 'admin' })
  if (!data) throw new Error('Forbidden')
}

const Pronoun = z.enum(['he', 'she', 'they'])
const line = z.string().trim().max(400)
/** The form as the browser sends it: names already swapped for {friend},
 *  {partner}, {me}. A real name never travels in these fields. */
export const ToastFormIn = z.object({
  occasion: z.enum(OCCASIONS),
  what: z.string().trim().max(120).optional(),
  relation: z.string().trim().max(80),
  pronouns: z.object({ friend: Pronoun, partner: Pronoun.optional() }),
  stories: z.array(line).max(3),
  true_thing: line,
  tone: z.enum(TONES),
  length: z.number().int().min(20).max(480),
  must_say: z.array(z.string().trim().min(1).max(80)).max(8),
  never_say: z.array(z.string().trim().min(1).max(60)).max(12),
})

const LineIn = z.object({
  section: z.string().max(60),
  text: z.string().max(600),
  source: z.enum(['shutap', 'story', 'true_thing', 'must_say', 'bridge']),
  ref: z.number().int().optional(),
  pause: z.boolean().optional(),
  laugh: z.boolean().optional(),
  glass: z.boolean().optional(),
  note: z.string().max(80).optional(),
})

export type LabToastResult =
  | { ok: true; result: ToastResult; form: ToastForm; eval_id: string | null; prompt_version: string }
  | { ok: false; reason: 'failed' | 'crisis'; form?: ToastForm }

/** Admin only: the real pipeline (Guard, Scrubber, two writers, checks,
 *  judge) on a lab form. The scrubbed form is what's stored and returned. */
export const labWriteToast = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ form: ToastFormIn }).parse(d))
  .handler(async ({ data, context }): Promise<LabToastResult> => {
    await requireAdmin(context)
    const { guardForm, scrubForm, writeToast } = await import('./toasts/toast.server')
    const { TOAST_PROMPT_VERSION } = await import('./toasts/prompts.server')
    const guard = await guardForm(data.form as ToastForm)
    if (guard.crisis) return { ok: false, reason: 'crisis' }
    const form = await scrubForm(data.form as ToastForm)
    const result = await writeToast(form)
    if (!result) return { ok: false, reason: 'failed', form }
    let evalId: string | null = null
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
      const { data: row } = await (supabaseAdmin as any)
        .from('toast_evals')
        .insert({ form, result: { toast: result.toast, winner: result.winner, why: result.why, ms: result.ms, seconds: result.seconds, cut_seconds: result.cut_seconds, candidates: result.candidates.map((c) => ({ model: c.model, ms: c.ms, seconds: c.seconds, checks: c.checks })) }, prompt_version: TOAST_PROMPT_VERSION })
        .select('id')
        .single()
      evalId = row?.id ?? null
    } catch (e) {
      console.warn('[toast-lab] eval not stored', e instanceof Error ? e.message : e)
    }
    return { ok: true, result, form, eval_id: evalId, prompt_version: TOAST_PROMPT_VERSION }
  })

/** Admin only: "funnier" on a line of a lab toast, or on a story line of the form. */
export const labTouchToast = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ form: ToastFormIn, kind: z.enum(['speech', 'story']), index: z.number().int().min(0).max(80), lines: z.array(LineIn).max(80).optional(), avoid: z.array(z.string().max(400)).max(9).optional() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; options: ToastTouchOption[] } | { ok: false }> => {
    await requireAdmin(context)
    const { touchToastLine } = await import('./toasts/toast.server')
    const form = data.form as ToastForm
    const options = await touchToastLine(form, data.kind === 'story' ? { kind: 'story', index: data.index } : { kind: 'speech', index: data.index, lines: (data.lines ?? []) as ToastLine[] }, data.avoid ?? [])
    return options ? { ok: true, options } : { ok: false }
  })

/** Admin only: "make a 60-second version" of a lab toast (on demand). */
export const labCutToast = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ form: ToastFormIn, lines: z.array(LineIn).min(1).max(80) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; cut: CutResult } | { ok: false }> => {
    await requireAdmin(context)
    const { writeCut60 } = await import('./toasts/toast.server')
    const cut = await writeCut60(data.form as ToastForm, data.lines as ToastLine[])
    return cut ? { ok: true, cut } : { ok: false }
  })

/** Admin only: rate a lab toast. */
export const rateLabToast = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ eval_id: z.string().uuid(), rating: z.enum(['pick', 'cut', 'rewrite']), notes: z.string().max(1000).optional() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    await requireAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { error } = await (supabaseAdmin as any).from('toast_evals').update({ rating: data.rating, notes: data.notes ?? null }).eq('id', data.eval_id)
    return { ok: !error }
  })

export type ToastLedger = { total: number; pick: number; cut: number; rewrite: number; unrated: number; by_occasion: Record<string, { pick: number; cut: number; rewrite: number; unrated: number }> }

/** Admin only: the lab's ledger, by occasion (every occasion needs a pick before launch). */
export const labToastEvals = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }): Promise<ToastLedger> => {
    await requireAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data } = await (supabaseAdmin as any).from('toast_evals').select('rating, form')
    const rows: { rating: string | null; form: { occasion?: string } }[] = data ?? []
    const out: ToastLedger = { total: rows.length, pick: 0, cut: 0, rewrite: 0, unrated: 0, by_occasion: {} }
    for (const r of rows) {
      const o = r.form?.occasion ?? '?'
      const b = (out.by_occasion[o] ??= { pick: 0, cut: 0, rewrite: 0, unrated: 0 })
      const k = r.rating === 'pick' || r.rating === 'cut' || r.rating === 'rewrite' ? r.rating : 'unrated'
      out[k]++
      b[k]++
    }
    return out
  })

export type { Toast, ToastForm }
