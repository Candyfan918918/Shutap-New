// The demo toast on each /toasts occasion page (Nov 8 2026, design approved
// by Candy): real product output only, the newest lab toast she rated "pick"
// for that occasion in /toast-lab. Never hand-written, never edited. Lab
// toasts are written in-house from invented samples (toast_evals), never from
// a user's story. Names are already placeholders ({friend}, {partner}, {me});
// the page shows them as [roles]. No pick yet for an occasion: no demo, and
// the page says what a toast comes with instead.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { OCCASIONS, type Occasion, type Toast, type ToastForm } from './shared'

export type ToastDemo = {
  id: string
  form: Pick<ToastForm, 'occasion' | 'stories' | 'true_thing' | 'tone' | 'length' | 'relation'>
  toast: Toast
  /** seconds, as the lab measured them */
  seconds: number
  cut_seconds: number | null
}

/** "dad" / "mom" pick the father- or mother-of-the-bride sample when there is one. */
export const getToastDemo = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => z.object({ occasion: z.enum(OCCASIONS), relation: z.enum(['dad', 'mom']).optional() }).parse(d))
  .handler(async ({ data }): Promise<ToastDemo | null> => {
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
      const { data: rows } = await (supabaseAdmin as any)
        .from('toast_evals')
        .select('id, form, result, created_at')
        .eq('rating', 'pick')
        .eq('form->>occasion', data.occasion)
        .order('created_at', { ascending: false })
        .limit(12)
      const list: any[] = (rows ?? []).filter((r: any) => r?.result?.toast?.lines?.length)
      if (!list.length) return null
      const rel = (r: any) => String(r.form?.relation ?? '').toLowerCase()
      const want = data.relation === 'dad' ? /dad|father/ : data.relation === 'mom' ? /mom|mother/ : null
      const row = (want && list.find((r) => want.test(rel(r)))) || list[0]
      const f = row.form as ToastForm
      return {
        id: row.id as string,
        form: { occasion: f.occasion as Occasion, stories: (f.stories ?? []).filter((s: string) => s?.trim()), true_thing: f.true_thing ?? '', tone: f.tone, length: Number(f.length), relation: f.relation ?? '' },
        toast: row.result.toast as Toast,
        seconds: Number(row.result.seconds ?? 0),
        cut_seconds: row.result.toast?.cut60?.length ? Number(row.result.cut_seconds ?? 0) : null,
      }
    } catch (e) {
      console.warn('[toast-demo] failed', e)
      return null
    }
  })
