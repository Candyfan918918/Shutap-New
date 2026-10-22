// Read the current user's subscription row for UI display (Profile billing card,
// Subscribe duplicate-guard). Env-filtered. Anonymous users get `null`.
import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export type BillingStatus = {
  status: string
  priceId: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  hasCustomer: boolean
  isActive: boolean
} | null

export const getMyBillingStatus = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: 'sandbox' | 'live' }) => {
    if (data?.environment !== 'sandbox' && data?.environment !== 'live') {
      throw new Error('Invalid environment')
    }
    return data
  })
  .handler(async ({ data, context }): Promise<BillingStatus> => {
    const claims = context.claims as { is_anonymous?: boolean } | undefined
    if (claims?.is_anonymous) return null
    const { data: row } = await context.supabase
      .from('subscriptions')
      .select('status,price_id,current_period_end,cancel_at_period_end,stripe_customer_id')
      .eq('user_id', context.userId)
      .eq('environment', data.environment)
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!row) return null
    const now = Date.now()
    const endMs = row.current_period_end ? new Date(row.current_period_end as string).getTime() : null
    const withinPeriod = !endMs || endMs > now
    const s = row.status as string
    // 'canceled' means the plan has ended (Stripe keeps a cancel-at-period-
    // end plan 'active' until then), whatever the old period end says.
    const isActive = (s === 'active' || s === 'trialing' || s === 'past_due') && withinPeriod
    return {
      status: s,
      priceId: (row.price_id as string) ?? null,
      currentPeriodEnd: (row.current_period_end as string) ?? null,
      cancelAtPeriodEnd: !!row.cancel_at_period_end,
      hasCustomer: !!row.stripe_customer_id,
      isActive,
    }
  })
