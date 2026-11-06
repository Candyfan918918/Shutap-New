// Product waitlists (Nov 6 2026): Toasts is "soon"; this is the list. Stored
// in product_waitlist (one row per email per product), hello@ told by mail.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const In = z.object({
  product: z.enum(['toasts']),
  email: z.string().trim().email().max(200),
  occasion: z.enum(['best_man', 'maid_of_honor', 'parent', 'retirement', 'birthday', 'toastmasters', 'other']).optional(),
  website: z.string().max(200).optional().default(''), // honeypot
})

export const joinWaitlist = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => In.parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; already?: boolean }> => {
    if (data.website) return { ok: true }
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { error } = await (supabaseAdmin as any).from('product_waitlist').insert({ product: data.product, email: data.email, occasion: data.occasion ?? null })
    if (error && String(error.code) === '23505') return { ok: true, already: true }
    if (error) { console.error('[waitlist]', error.message); return { ok: false } }
    await (supabaseAdmin as any).from('events').insert({ user_id: null, session_id: null, name: 'waitlist_joined', properties: { product: data.product, occasion: data.occasion ?? null } as never } as never).then(() => {}, () => {})
    try {
      const { sendResendEmail } = await import('@/lib/resend.server')
      const { IDENTITIES, formatFrom } = await import('@/lib/email/identities')
      await sendResendEmail({ to: IDENTITIES.hello.fromAddress, from: formatFrom(IDENTITIES.hello), replyTo: data.email, subject: `toasts waitlist · ${data.occasion ?? 'no occasion'}`, html: `<p>${data.email} joined the Toasts list (${data.occasion ?? 'no occasion given'}).</p>`, text: `${data.email} joined the Toasts list (${data.occasion ?? 'no occasion given'}).` })
    } catch { /* the row is what matters */ }
    return { ok: true }
  })
