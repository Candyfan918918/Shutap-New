import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { requireRealUser } from './require-real-user';
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from '@/lib/stripe.server';
import { PLANS, isCheckoutPriceId, planFromPriceId } from '@/lib/pricing';
import { bestPlan, rowIsActive } from '@/lib/plan.server';

type CheckoutResult = { clientSecret: string } | { error: string };
export type ChangePlanResult = { ok: true } | { ok: false; error: string };
type PortalResult = { url: string } | { error: string };

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error('Invalid userId');
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

export const createMirrorCheckout = createServerFn({ method: 'POST' })
  .middleware([requireRealUser])
  .inputValidator((data: { priceId: string; returnUrl: string; environment: StripeEnv }) => {
    if (!/^[a-zA-Z0-9_-]+$/.test(data.priceId)) throw new Error('Invalid priceId');
    // Only the plans on offer: Basic and Pro monthly (annual is hidden).
    if (!isCheckoutPriceId(data.priceId)) throw new Error('Invalid priceId');
    if (data.environment !== 'sandbox' && data.environment !== 'live') throw new Error('Invalid environment');
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      const { userId, supabase } = context;
      // One subscription per person. A second checkout would bill twice;
      // Basic moves to Pro through changePlanToPro instead.
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', userId)
        .eq('environment', data.environment)
        .in('status', ['active', 'trialing', 'past_due']);
      if ((existing ?? []).some((r) => rowIsActive(r))) return { error: 'already_subscribed' };
      const { data: { user } } = await supabase.auth.getUser();
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) throw new Error('Price not found');
      const stripePrice = prices.data[0];
      const customerId = await resolveOrCreateCustomer(stripe, { email: user?.email ?? undefined, userId });
      // The database learns about a subscription from the webhook, a moment
      // after payment. Ask Stripe too, so a second tab (or coming straight
      // back to /subscribe) can't start a second subscription.
      const live = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
      if (live.data.some((x) => ['active', 'trialing', 'past_due', 'incomplete', 'unpaid'].includes(x.status))) {
        return { error: 'already_subscribed' };
      }

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: 'subscription',
        ui_mode: 'embedded_page',
        // Always English, whatever the browser's language.
        locale: 'en',
        return_url: data.returnUrl,
        customer: customerId,
        // Tax on every checkout, test and live alike, so a test purchase runs
        // the same path a real one does. Needs a head office address in
        // Stripe's tax settings (set for test on Oct 22 2026).
        automatic_tax: { enabled: true },
        customer_update: { name: 'auto', address: 'auto' },
        payment_method_collection: 'always',
        // No free trial: the first period is charged at checkout.
        subscription_data: {
          metadata: { userId },
        },
        metadata: { userId },
      });
      return { clientSecret: session.client_secret ?? '' };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createMirrorPortal = createServerFn({ method: 'POST' })
  .middleware([requireRealUser])
  .inputValidator((data: { returnUrl: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<PortalResult> => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .eq('environment', data.environment)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.stripe_customer_id) return { error: 'No subscription found' };
    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id as string,
        return_url: data.returnUrl,
        locale: 'en',
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export type CancelResult = { ok: true; cancelAtPeriodEnd: boolean; currentPeriodEnd: string | null } | { ok: false; error: string };

/** Cancel (or undo cancelling) the person's plan from the site, no Stripe
 *  page needed. Cancelling stops renewal: the plan runs to the end of the
 *  period already paid for, then they're on free. No refund is issued here. */
export const setPlanCancellation = createServerFn({ method: 'POST' })
  .middleware([requireRealUser])
  .inputValidator((data: { environment: StripeEnv; cancel: boolean }) => {
    if (data?.environment !== 'sandbox' && data?.environment !== 'live') throw new Error('Invalid environment');
    if (typeof data.cancel !== 'boolean') throw new Error('Invalid request');
    return data;
  })
  .handler(async ({ data, context }): Promise<CancelResult> => {
    const { userId, supabase } = context;
    const { data: rows } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, status, current_period_end')
      .eq('user_id', userId)
      .eq('environment', data.environment)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('current_period_end', { ascending: false });
    const live = ((rows ?? []) as { stripe_subscription_id: string; status: string; current_period_end: string | null }[]).filter((r) => rowIsActive(r));
    if (!live.length) return { ok: false, error: 'no_plan' };
    try {
      const stripe = createStripeClient(data.environment);
      let last: { cancel_at_period_end: boolean; end: string | null } | null = null;
      // Normally one plan; if there were ever two, each gets the same answer.
      for (const r of live) {
        const updated = await stripe.subscriptions.update(r.stripe_subscription_id, { cancel_at_period_end: data.cancel });
        const item = updated.items.data[0] as (typeof updated.items.data)[number] & { current_period_end?: number };
        const periodEnd = item?.current_period_end ?? (updated as unknown as { current_period_end?: number }).current_period_end;
        const end = periodEnd ? new Date(periodEnd * 1000).toISOString() : r.current_period_end;
        // Record it now so the profile is right on reload; the webhook writes
        // the same fields again.
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lack this table
        const { error: upErr } = await (supabaseAdmin as any)
          .from('subscriptions')
          .update({ cancel_at_period_end: updated.cancel_at_period_end ?? data.cancel, status: updated.status, current_period_end: end, updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', updated.id)
          .eq('environment', data.environment);
        if (upErr) console.error('[setPlanCancellation] row update failed; the webhook will record it', upErr.message);
        last = { cancel_at_period_end: updated.cancel_at_period_end ?? data.cancel, end };
      }
      return { ok: true, cancelAtPeriodEnd: last!.cancel_at_period_end, currentPeriodEnd: last!.end };
    } catch (error) {
      return { ok: false, error: getStripeErrorMessage(error) };
    }
  });

/** Basic → Pro on the same subscription: the price is swapped and the
 *  prorated difference is charged now. If the payment fails, nothing changes
 *  and the person stays on Basic. */
export const changePlanToPro = createServerFn({ method: 'POST' })
  .middleware([requireRealUser])
  .inputValidator((data: { environment: StripeEnv }) => {
    if (data?.environment !== 'sandbox' && data?.environment !== 'live') throw new Error('Invalid environment');
    return data;
  })
  .handler(async ({ data, context }): Promise<ChangePlanResult> => {
    const { userId, supabase } = context;
    const { data: rows } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, status, current_period_end, price_id, product_id')
      .eq('user_id', userId)
      .eq('environment', data.environment)
      .in('status', ['active', 'trialing', 'past_due', 'canceled'])
      .order('current_period_end', { ascending: false });
    const all = (rows ?? []) as { stripe_subscription_id: string; status: string; current_period_end: string | null; price_id: string | null; product_id: string | null }[];
    if (bestPlan(all) === 'pro') return { ok: true };
    const basic = all.find((r) => r.status !== 'canceled' && rowIsActive(r) && planFromPriceId(r.price_id) === 'basic');
    if (!basic) return { ok: false, error: 'no_basic_plan' };
    try {
      const stripe = createStripeClient(data.environment);
      const sub = await stripe.subscriptions.retrieve(basic.stripe_subscription_id);
      if (sub.cancel_at_period_end) return { ok: false, error: 'plan_cancelling' };
      const item = sub.items.data[0];
      if (!item) return { ok: false, error: 'no_subscription_item' };
      const prices = await stripe.prices.list({ lookup_keys: [PLANS.pro.priceId] });
      const proPrice = prices.data[0];
      if (!proPrice) return { ok: false, error: 'Price not found' };
      const updated = await stripe.subscriptions.update(sub.id, {
        items: [{ id: item.id, price: proPrice.id }],
        proration_behavior: 'always_invoice',
        payment_behavior: 'error_if_incomplete',
        metadata: { ...(sub.metadata ?? {}), userId },
      });
      // Record it now, so Pro is on before the webhook lands. The webhook
      // writes the same row again (upsert on the subscription id).
      const newItem = updated.items.data[0] as (typeof updated.items.data)[number] & { current_period_start?: number; current_period_end?: number };
      const periodStart = newItem?.current_period_start ?? (updated as unknown as { current_period_start?: number }).current_period_start;
      const periodEnd = newItem?.current_period_end ?? (updated as unknown as { current_period_end?: number }).current_period_end;
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const { error: upErr } = await (supabaseAdmin as any).from('subscriptions').upsert({
        user_id: userId,
        stripe_subscription_id: updated.id,
        stripe_customer_id: typeof updated.customer === 'string' ? updated.customer : updated.customer.id,
        product_id: 'mirror',
        price_id: PLANS.pro.priceId,
        status: updated.status,
        current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: updated.cancel_at_period_end ?? false,
        environment: data.environment,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'stripe_subscription_id' });
      if (upErr) console.error('[changePlanToPro] row upsert failed; the webhook will record it', upErr.message);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: getStripeErrorMessage(error) };
    }
  });
