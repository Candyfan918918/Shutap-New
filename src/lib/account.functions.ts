// Self-serve account deletion. Cancels any active Stripe subscription in the
// requested environment, then deletes the auth user via the Admin API.
// Supabase RLS ON DELETE CASCADE wipes all owned rows (aliases, situations,
// mirror_*, subscriptions, etc.). Irreversible.
import { createServerFn } from '@tanstack/react-start'
import { requireRealUser } from './require-real-user'
import { createStripeClient, getStripeErrorMessage, type StripeEnv } from '@/lib/stripe.server'

type DeleteResult = { ok: true } | { error: string }

export const deleteMyAccount = createServerFn({ method: 'POST' })
  .middleware([requireRealUser])
  .inputValidator((data: { environment: StripeEnv; confirm: string }) => {
    if (data?.confirm !== 'delete my account') {
      throw new Error('Confirmation text does not match')
    }
    if (data?.environment !== 'sandbox' && data?.environment !== 'live') {
      throw new Error('Invalid environment')
    }
    return data
  })
  .handler(async ({ data, context }): Promise<DeleteResult> => {
    const { supabase, userId } = context
    try {
      // Best-effort: cancel any active/trialing/past_due Stripe subscription
      // for this user across BOTH environments before removing the auth row.
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('stripe_subscription_id,status,environment')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing', 'past_due'])
      if (subs && subs.length) {
        for (const s of subs) {
          try {
            const env = s.environment as StripeEnv
            const stripe = createStripeClient(env)
            await stripe.subscriptions.cancel(s.stripe_subscription_id as string)
          } catch (err) {
            console.error('[deleteMyAccount] cancel failed', getStripeErrorMessage(err))
          }
        }
      }
      // Uploaded profile pictures are files, not rows: remove them first.
      const { removeAvatarFiles } = await import('./avatar-files.server')
      await removeAvatarFiles(userId)
      // Auth Admin delete cascades to every user-owned row through FKs.
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) return { error: error.message }
      return { ok: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed'
      return { error: msg }
    }
  })
