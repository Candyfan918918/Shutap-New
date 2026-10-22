// Which paid plan a person is on, read from their subscription rows.
// Server only. active and trialing count while the period runs; past_due
// keeps access while Stripe retries (the subscription.deleted webhook ends it
// at final failure). A plan cancelled to end at the period end stays
// 'active' (cancel_at_period_end) until then; Stripe only marks it 'canceled'
// once it has actually ended, so 'canceled' never counts — including an
// immediate cancel whose old period end is still in the future.
import { planFromPriceId, type PaidPlan } from './pricing'

export type PlanEnv = 'sandbox' | 'live'

/** The Stripe environment the server is running against. */
export function serverPlanEnv(): PlanEnv {
  return process.env['STRIPE_LIVE_API_KEY'] ? 'live' : 'sandbox'
}

type SubRow = { status: string; current_period_end: string | null; price_id: string | null; product_id: string | null }

export function rowIsActive(r: Pick<SubRow, 'status' | 'current_period_end'>, now = Date.now()): boolean {
  const end = r.current_period_end ? Date.parse(r.current_period_end) : null
  if (r.status === 'past_due') return true
  if (r.status === 'active' || r.status === 'trialing') return end === null || end > now
  return false
}

/** The plan a row buys. Pro needs both the Pro price and the 'mirror'
 *  product, so a mislabelled row can't unlock the Mirror. */
export function rowPlan(r: Pick<SubRow, 'price_id' | 'product_id'>): PaidPlan {
  const byPrice = planFromPriceId(r.price_id) ?? 'basic'
  return byPrice === 'pro' && r.product_id === 'mirror' ? 'pro' : 'basic'
}

/** The best active plan among the rows: Pro wins over Basic. */
export function bestPlan(rows: SubRow[], now = Date.now()): PaidPlan | null {
  let best: PaidPlan | null = null
  for (const r of rows) {
    if (!rowIsActive(r, now)) continue
    const p = rowPlan(r)
    if (p === 'pro') return 'pro'
    best = 'basic'
  }
  return best
}

export async function activePlan(admin: any, userId: string, env: PlanEnv = serverPlanEnv()): Promise<PaidPlan | null> {
  const { data, error } = await admin
    .from('subscriptions')
    .select('status, current_period_end, price_id, product_id')
    .eq('user_id', userId)
    .eq('environment', env)
    .in('status', ['active', 'trialing', 'past_due', 'canceled'])
    .order('current_period_end', { ascending: false })
    .limit(20)
  if (error) {
    // Fail closed to "free": a read error must never hand out a paid plan.
    console.error('[plan] subscriptions read failed', error.message)
    return null
  }
  return bestPlan((data ?? []) as SubRow[])
}
