// Server-side entitlement checks. The client NEVER decides Mirror access —
// it asks this endpoint. The Mirror is Pro only: a signed-in user needs an
// active/trialing/past_due Pro row (or a cancelled one still inside its paid
// period). Basic never opens it. Anonymous users are never entitled. No
// account is special-cased.
//
// IMPORTANT: reads MUST filter by `environment` — sandbox and live rows
// coexist in the same table and default to 'sandbox'. Without the filter,
// a sandbox subscriber appears entitled in live and vice versa.
import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { rowIsActive, rowPlan } from './plan.server'

export type MirrorEntitlement = {
  entitled: boolean
  demoAccount: boolean
  // 'demo' is retained in the union for type compatibility with existing
  // consumers but is never returned by this handler.
  reason: 'demo' | 'active_subscription' | 'grace_period' | 'past_due' | 'no_subscription' | 'anonymous'
}

export const getMirrorEntitlement = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: 'sandbox' | 'live' }) => {
    if (data?.environment !== 'sandbox' && data?.environment !== 'live') {
      throw new Error('Invalid environment')
    }
    return data
  })
  .handler(async ({ data, context }): Promise<MirrorEntitlement> => {
    const claims = context.claims as { is_anonymous?: boolean; email?: string } | undefined
    if (claims?.is_anonymous) {
      return { entitled: false, demoAccount: false, reason: 'anonymous' }
    }
    const { data: rows } = await context.supabase
      .from('subscriptions')
      .select('status,current_period_end,price_id,product_id')
      .eq('user_id', context.userId)
      .eq('environment', data.environment)
      .in('status', ['active', 'trialing', 'past_due', 'canceled'])
      .order('current_period_end', { ascending: false })
      .limit(20)
    // Pro rows only, latest period first.
    const row = (rows ?? []).find((r) => rowPlan(r) === 'pro' && rowIsActive(r))
    if (!row) return { entitled: false, demoAccount: false, reason: 'no_subscription' }
    if (row.status === 'active' || row.status === 'trialing') {
      return { entitled: true, demoAccount: false, reason: 'active_subscription' }
    }
    // Dunning: Stripe is still retrying. Access stays while it retries; the
    // subscription.deleted webhook downgrades to canceled at final failure.
    if (row.status === 'past_due') {
      return { entitled: true, demoAccount: false, reason: 'past_due' }
    }
    // Cancel-at-period-end: access until the period actually ends.
    return { entitled: true, demoAccount: false, reason: 'grace_period' }
  })
