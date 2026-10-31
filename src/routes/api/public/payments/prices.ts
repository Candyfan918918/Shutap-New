// GET: brings Stripe in line with src/lib/pricing.ts and reports what Stripe
// now holds behind each plan's lookup key, in test (sandbox) and live.
// Its only effect is the one checkout would have on first use (create the
// new price at the listed amount, move the lookup key, archive the old),
// so it is safe to call openly; after the first call it only reads.
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/payments/prices')({
  server: {
    handlers: {
      GET: async () => {
        const { PLANS } = await import('@/lib/pricing')
        const { createStripeClient, priceForLookupKey, getStripeErrorMessage } = await import('@/lib/stripe.server')
        const out: Record<string, unknown>[] = []
        for (const env of ['sandbox', 'live'] as const) {
          let stripe
          try {
            stripe = createStripeClient(env)
          } catch (e) {
            out.push({ env, error: e instanceof Error ? e.message : 'not configured' })
            continue
          }
          for (const plan of Object.values(PLANS).filter((p) => p.shown)) {
            try {
              const price = await priceForLookupKey(stripe, plan.priceId, plan)
              out.push({
                env,
                plan: plan.name,
                lookup_key: plan.priceId,
                listed: plan.amount,
                stripe_amount: (price.unit_amount ?? 0) / 100,
                interval: price.recurring?.interval ?? null,
                matches: price.unit_amount === Math.round(plan.amount * 100),
              })
            } catch (e) {
              out.push({ env, plan: plan.name, lookup_key: plan.priceId, error: getStripeErrorMessage(e) })
            }
          }
        }
        return new Response(JSON.stringify(out, null, 2), {
          headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
        })
      },
    },
  },
})
