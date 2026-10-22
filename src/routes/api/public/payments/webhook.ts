import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { type StripeEnv, createStripeClient, verifyWebhook } from '@/lib/stripe.server';
import { planByPriceId, productIdForPrice } from '@/lib/pricing';
import { accessEndSec, handleInvoicePaid, isCancelling, maybeSendCancellationEmail, priceIdFrom, subscriptionIdOf } from '@/lib/billing-notices.server';


let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _supabase;
}

/** What the row records as the product, decided by the plan the price buys:
 *  Pro prices (mirror_monthly / mirror_annual) are 'mirror' — the Mirror and
 *  has_active_mirror key on that — and Basic is 'basic'. An unknown price is
 *  treated as Basic so it can never unlock the Mirror by accident. */
function productIdFor(item: any): 'mirror' | 'basic' {
  const priceId = priceIdFrom(item);
  if (!planByPriceId(priceId)) {
    console.error('[stripe webhook] unknown price on a subscription; recorded as basic', { price: priceId });
  }
  return productIdForPrice(priceId);
}


/** Receipt (and the report's 'paid' event) for the subscription's latest
 *  invoice once it's paid. Deduped per invoice with invoice.paid and the
 *  hourly sweep, so whichever arrives first sends it. */
async function receiptForLatestInvoice(sub: any, env: StripeEnv) {
  const inv = sub?.latest_invoice;
  if (!inv || typeof inv !== 'object' || inv.status !== 'paid') return;
  try {
    await handleInvoicePaid(inv, env);
  } catch (e) {
    console.error('[stripe webhook] receipt from latest_invoice failed', { sub: sub.id, e });
  }
}

async function handleCreated(sub: any, env: StripeEnv) {
  const userId = sub.metadata?.userId;
  if (!userId) {
    // No userId in metadata means this subscription was created outside our
    // checkout flow (e.g. Stripe dashboard). We can't associate it with a
    // user, so log loudly and skip — dashboard-created subs need to be
    // reconciled manually.
    console.error('[stripe webhook] subscription missing metadata.userId', {
      subscription_id: sub.id,
      customer: sub.customer,
      env,
    });
    return;
  }
  const item = sub.items?.data?.[0];
  const periodStart = item?.current_period_start ?? sub.current_period_start;
  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  await getSupabase().from('subscriptions').upsert({
    user_id: userId,
    stripe_subscription_id: sub.id,
    stripe_customer_id: sub.customer,
    product_id: productIdFor(item),
    price_id: priceIdFrom(item),
    status: sub.status,
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: isCancelling(sub),
    environment: env,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_subscription_id' });

  // Seed Mirror onboarding flag on first trial/active subscription.
  // ON CONFLICT DO NOTHING preserves the original onboarded_at across cancel/resubscribe.
  if (sub.status === 'trialing' || sub.status === 'active') {
    const { error } = await getSupabase()
      .from('mirror_onboarding')
      .upsert(
        { user_id: userId, source: 'subscription' },
        { onConflict: 'user_id', ignoreDuplicates: true },
      );
    if (error) console.error('mirror_onboarding upsert failed:', error);
  }
}


/** Stripe doesn't promise event order, so an older subscription.updated can
 *  arrive after a newer one (e.g. right after an upgrade to Pro). Read the
 *  subscription as it is now and record that; fall back to the event's copy
 *  if Stripe can't be reached. */
async function latest(sub: any, env: StripeEnv): Promise<any> {
  try {
    // latest_invoice expanded so a paid first invoice or upgrade gets its
    // receipt from this event too, not only from invoice.paid.
    const fresh = await createStripeClient(env).subscriptions.retrieve(sub.id, { expand: ['latest_invoice'] });
    return { ...fresh, metadata: { ...(sub.metadata ?? {}), ...(fresh.metadata ?? {}) } };
  } catch (e) {
    console.error('[stripe webhook] could not re-read subscription; using event copy', { id: sub?.id, e });
    return sub;
  }
}


async function handleUpdated(sub: any, env: StripeEnv) {
  const item = sub.items?.data?.[0];
  const periodStart = item?.current_period_start ?? sub.current_period_start;
  const periodEnd = item?.current_period_end ?? sub.current_period_end;
  const userId = sub.metadata?.userId;

  // Read the existing row before upserting so a cancel_at_period_end
  // false → true transition can be detected (portal cancels included).
  const { data: prevRow } = await getSupabase()
    .from('subscriptions')
    .select('user_id, product_id, price_id, cancel_at_period_end, current_period_end')
    .eq('stripe_subscription_id', sub.id)
    .eq('environment', env)
    .maybeSingle();
  if (prevRow && !prevRow.cancel_at_period_end && isCancelling(sub)) {
    const endSec = accessEndSec(sub);
    await maybeSendCancellationEmail(sub, env, prevRow, endSec ? new Date(endSec * 1000).toISOString() : null);
  }


  // Stripe does NOT guarantee `.created` arrives before `.updated`. If we
  // only UPDATE, an out-of-order `.updated` matches zero rows and is lost,
  // leaving the paying user without an entitlement row. Upsert on
  // stripe_subscription_id so this event self-heals either way. If userId
  // is missing on the update event (metadata not always echoed), fall
  // back to a plain UPDATE so we don't null out user_id on an existing row.
  if (userId) {
    const { error } = await getSupabase().from('subscriptions').upsert({
      user_id: userId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: sub.customer,
      product_id: productIdFor(item),
      price_id: priceIdFrom(item),
      status: sub.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: isCancelling(sub),
      environment: env,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'stripe_subscription_id' });
    if (error) console.error('[stripe webhook] subscriptions upsert failed on updated:', error, { subscription_id: sub.id, env });
    return;
  }

  const { error, count } = await getSupabase().from('subscriptions').update({
    status: sub.status,
    price_id: priceIdFrom(item),
    product_id: productIdFor(item),
    current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: isCancelling(sub),
    updated_at: new Date().toISOString(),
  }, { count: 'exact' }).eq('stripe_subscription_id', sub.id).eq('environment', env);
  if (error) console.error('[stripe webhook] subscriptions update failed on updated:', error, { subscription_id: sub.id, env });
  else if (!count) console.error(`[stripe webhook] no subscription row for ${sub.id} — event out of order?`, { env });
}

async function handleDeleted(sub: any, env: StripeEnv) {
  const { data: prevRow } = await getSupabase()
    .from('subscriptions')
    .select('user_id, product_id, price_id, cancel_at_period_end, current_period_end')
    .eq('stripe_subscription_id', sub.id)
    .eq('environment', env)
    .maybeSingle();

  // Access ends when the subscription ended (an immediate cancel ends it
  // now, not at the old renewal date).
  const endedIso = sub.ended_at ? new Date(sub.ended_at * 1000).toISOString() : null
  const { error, count } = await getSupabase().from('subscriptions').update({
    status: 'canceled',
    ...(endedIso ? { current_period_end: endedIso } : {}),
    updated_at: new Date().toISOString(),
  }, { count: 'exact' }).eq('stripe_subscription_id', sub.id).eq('environment', env);
  if (error) console.error('[stripe webhook] subscriptions update failed on deleted:', error, { subscription_id: sub.id, env });
  else if (!count) console.error(`[stripe webhook] no subscription row for ${sub.id} — event out of order?`, { env });

  // If the subscription ended without a prior cancellation confirmation
  // (e.g. immediate cancel), send it now — the dedupe key (subscription id +
  // period end) makes this a no-op when handleUpdated already confirmed.
  const endedAtIso = sub.ended_at
    ? new Date(sub.ended_at * 1000).toISOString()
    : (prevRow?.current_period_end ?? null);
  await maybeSendCancellationEmail(sub, env, prevRow, endedAtIso);
}

async function handleInvoicePaymentFailed(invoice: any, env: StripeEnv) {
  // Dunning: reflect payment failure promptly so the UI can warn the user
  // instead of waiting for the downstream customer.subscription.updated event.
  const subId = subscriptionIdOf(invoice);
  if (!subId) return;
  const { error, count } = await getSupabase().from('subscriptions').update({
    status: 'past_due',
    updated_at: new Date().toISOString(),
  }, { count: 'exact' }).eq('stripe_subscription_id', subId).eq('environment', env);
  if (error) console.error('[stripe webhook] subscriptions update failed on invoice.payment_failed:', error, { subscription_id: subId, env });
  else if (!count) console.error(`[stripe webhook] no subscription row for ${subId} — event out of order?`, { env });
}

export const Route = createFileRoute('/api/public/payments/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get('env');
        if (rawEnv !== 'sandbox' && rawEnv !== 'live') {
          return Response.json({ received: true, ignored: 'invalid env' });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.type) {
            case 'customer.subscription.created': {
              const sub = await latest(event.data.object, env);
              await handleCreated(sub, env);
              await receiptForLatestInvoice(sub, env);
              break;
            }
            case 'customer.subscription.updated': {
              const sub = await latest(event.data.object, env);
              await handleUpdated(sub, env);
              await receiptForLatestInvoice(sub, env);
              break;
            }
            case 'customer.subscription.deleted':
              await handleDeleted(event.data.object, env); break;
            case 'invoice.paid':
              await handleInvoicePaid(event.data.object, env); break;
            case 'invoice.payment_failed':
              await handleInvoicePaymentFailed(event.data.object, env); break;
            default:
              console.log('Unhandled:', event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error('Webhook error:', e);
          return new Response('Webhook error', { status: 400 });
        }
      },
    },
  },
});
