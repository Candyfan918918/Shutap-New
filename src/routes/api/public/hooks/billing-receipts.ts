// Hourly cron: a receipt for every paid invoice, even if Stripe's
// invoice.paid notice never reaches the webhook. Renewal invoices are paid
// about an hour after the period rolls over, after the subscription event has
// already come and gone, so the webhook alone can miss them.
//
// Looks only at subscriptions that changed or renewed in the last 3 days, and
// at their paid invoices from that window. Every receipt is deduped per
// invoice in billing_emails (shared with the webhook), so running this often,
// or after the webhook already sent it, never double-sends.
import { createFileRoute } from '@tanstack/react-router'

const WINDOW_MS = 3 * 24 * 60 * 60 * 1000

export const Route = createFileRoute('/api/public/hooks/billing-receipts')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get('x-cron-secret') ?? ''
        const expected = process.env.CRON_SECRET ?? ''
        if (!expected || provided.length !== expected.length || provided !== expected) {
          return new Response('Unauthorized', { status: 401 })
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const { createStripeClient } = await import('@/lib/stripe.server')
        const { handleInvoicePaid } = await import('@/lib/billing-notices.server')

        const since = new Date(Date.now() - WINDOW_MS).toISOString()
        const { data: subs, error } = await supabaseAdmin
          .from('subscriptions')
          .select('stripe_subscription_id, environment')
          .or(`current_period_start.gte.${since},updated_at.gte.${since}`)
          .limit(1000)
        if (error) return Response.json({ error: error.message }, { status: 500 })

        const sinceSec = Math.floor(Date.parse(since) / 1000)
        let invoices = 0
        let failed = 0
        for (const s of subs ?? []) {
          const env = s.environment === 'live' ? 'live' : 'sandbox'
          try {
            const list = await createStripeClient(env).invoices.list({
              subscription: s.stripe_subscription_id as string,
              status: 'paid',
              created: { gte: sinceSec },
              limit: 10,
            })
            for (const inv of list.data) {
              invoices++
              await handleInvoicePaid(inv, env)
            }
          } catch (e) {
            failed++
            console.error('[billing-receipts] could not read invoices', { sub: s.stripe_subscription_id, env, e })
          }
        }
        return Response.json({ subscriptions: subs?.length ?? 0, invoices, failed })
      },
    },
  },
})
