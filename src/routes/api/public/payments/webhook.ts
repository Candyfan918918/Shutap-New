import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import { type StripeEnv, createStripeClient, verifyWebhook } from '@/lib/stripe.server';
import { formatEmailDate, formatStripeAmount, sendBillingEmail } from '@/lib/email/billing.server';
import { planByPriceId, planFromPriceId, productIdForPrice } from '@/lib/pricing';

const APP_ORIGIN = 'https://shutap.com';

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _supabase;
}

function priceIdFrom(item: any): string {
  return item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id;
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

/** The plan's name for billing emails. Every billing email carries it. */
function planNameFor(priceId: string | null | undefined): string {
  return planFromPriceId(priceId) === 'pro' ? 'Pro' : 'Basic';
}

const PAID_PRODUCTS = ['mirror', 'basic'];

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
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
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


// Cancellation confirmation email when cancel_at_period_end flips
// false → true (covers cancels made in the Stripe billing portal too).
// Idempotent via billing_emails (dedupe on subscription id + period end),
// so resuming and re-cancelling in a later period sends a fresh one.
async function maybeSendCancellationEmail(
  sub: any,
  env: StripeEnv,
  prev: { user_id?: string; product_id?: string; price_id?: string | null; cancel_at_period_end?: boolean; current_period_end?: string | null } | null,
  periodEndIso: string | null,
) {
  if (!prev || !PAID_PRODUCTS.includes(prev.product_id ?? '')) return;
  const userId = (sub.metadata?.userId as string | undefined) ?? prev.user_id;
  if (!userId) return;
  // Normalize to a canonical ISO string — Postgres returns "+00:00" offsets
  // while toISOString() yields "Z", and the dedupe key must match across both.
  const raw = periodEndIso ?? prev.current_period_end ?? null;
  const accessUntilIso = raw ? new Date(raw).toISOString() : null;
  const accessUntil = accessUntilIso ? formatEmailDate(accessUntilIso) : 'the end of your billing period';
  await sendBillingEmail({
    kind: 'mirror_cancelled',
    dedupeKey: `${sub.id}:${accessUntilIso ?? 'unknown-period-end'}`,
    userId,
    vars: {
      plan_name: planNameFor(prev.price_id ?? priceIdFrom(sub.items?.data?.[0])),
      access_until: accessUntil,
      resume_url: `${APP_ORIGIN}/subscribe`,
      deep_link: `${APP_ORIGIN}/subscribe`,
    },
  });
}

// Payment receipt on invoice.paid — only for real charges (the $0
// trial-start invoice must NOT send a receipt) on mirror subscriptions.
// Idempotent via billing_emails (dedupe on invoice id), so Stripe webhook
// retries and event replays never double-send.
/** The subscription an invoice belongs to, across Stripe API versions
 *  (dahlia moved it under invoice.parent). */
function subscriptionIdOf(invoice: any): string | null {
  const line = invoice?.lines?.data?.[0];
  return (
    invoice?.subscription ||
    invoice?.parent?.subscription_details?.subscription ||
    line?.parent?.subscription_item_details?.subscription ||
    line?.subscription ||
    null
  );
}

/** Stripe doesn't promise event order, so an older subscription.updated can
 *  arrive after a newer one (e.g. right after an upgrade to Pro). Read the
 *  subscription as it is now and record that; fall back to the event's copy
 *  if Stripe can't be reached. */
async function latest(sub: any, env: StripeEnv): Promise<any> {
  try {
    const fresh = await createStripeClient(env).subscriptions.retrieve(sub.id);
    return { ...fresh, metadata: { ...(sub.metadata ?? {}), ...(fresh.metadata ?? {}) } };
  } catch (e) {
    console.error('[stripe webhook] could not re-read subscription; using event copy', { id: sub?.id, e });
    return sub;
  }
}

async function handleInvoicePaid(invoice: any, env: StripeEnv) {
  if (!invoice?.id || !(invoice.amount_paid > 0)) return;
  const line = invoice.lines?.data?.[0];
  const subId =
    invoice.subscription ||
    invoice.parent?.subscription_details?.subscription ||
    line?.parent?.subscription_item_details?.subscription ||
    line?.subscription;
  if (!subId) return; // not a subscription invoice
  const { data: row } = await getSupabase()
    .from('subscriptions')
    .select('user_id, product_id, price_id')
    .eq('stripe_subscription_id', subId)
    .eq('environment', env)
    .maybeSingle();
  await recordPaid(invoice, env, subId, row);
  if (!row || !PAID_PRODUCTS.includes(row.product_id)) return;

  const interval: string =
    line?.price?.recurring?.interval ?? line?.plan?.interval ??
    (String(row.price_id).includes('annual') ? 'year' : 'month');
  const periodStart = line?.period?.start ?? invoice.period_start;
  const periodEnd = line?.period?.end ?? invoice.period_end;
  const periodRange = periodStart && periodEnd
    ? `${formatEmailDate(periodStart * 1000)} – ${formatEmailDate(periodEnd * 1000)}`
    : 'the current billing period';
  const amount = formatStripeAmount(invoice.amount_paid, invoice.currency);
  const invoiceUrl = invoice.hosted_invoice_url || invoice.invoice_pdf || `${APP_ORIGIN}/profile`;

  await sendBillingEmail({
    kind: 'mirror_receipt',
    dedupeKey: invoice.id,
    userId: row.user_id,
    vars: {
      // An upgrade invoice can land before the row says Pro: the only
      // upgrade on offer is Basic → Pro.
      plan_name: invoice.billing_reason === 'subscription_update' ? 'Pro' : planNameFor(row.price_id),
      amount,
      plan_interval: interval === 'year' ? 'annual' : 'monthly',
      period_range: periodRange,
      invoice_url: invoiceUrl,
      deep_link: invoiceUrl,
    },
  });
}

// The 'paid' step of the paywall funnel, for the admin daily report: a new
// plan (the first paid invoice) or an upgrade to Pro (the prorated invoice).
// Renewals are not conversions and are not recorded. Live payments only —
// sandbox test payments would inflate the report. Recorded once per invoice
// (Stripe retries webhooks).
async function recordPaid(
  invoice: any,
  env: StripeEnv,
  subId: string,
  row: { user_id?: string; price_id?: string | null } | null,
) {
  try {
    if (env !== 'live') return;
    const reason = invoice.billing_reason;
    if (reason !== 'subscription_create' && reason !== 'subscription_update') return;
    const userId =
      row?.user_id ??
      invoice.parent?.subscription_details?.metadata?.userId ??
      invoice.subscription_details?.metadata?.userId ??
      null;
    if (!userId) {
      console.error('[stripe webhook] paid event skipped: no user for invoice', { invoice: invoice.id });
      return;
    }
    const { data: already } = await getSupabase()
      .from('events')
      .select('id')
      .eq('name', 'paid')
      .eq('properties->>invoice_id', invoice.id)
      .limit(1);
    if (already && already.length) return;
    // The only upgrade on offer is Basic → Pro. For a new plan, the row may
    // not exist yet (Stripe doesn't promise event order) and invoice lines
    // carry no lookup key under the current API, so ask Stripe for the
    // subscription's price.
    let priceKey: string | null = row?.price_id ?? null;
    if (reason === 'subscription_create' && !priceKey) {
      try {
        const sub = await createStripeClient(env).subscriptions.retrieve(subId);
        const p = sub.items.data[0]?.price;
        priceKey = p?.lookup_key || (p?.metadata as Record<string, string> | undefined)?.lovable_external_id || p?.id || null;
      } catch (e) {
        console.error('[stripe webhook] paid event: could not read the subscription price', e);
      }
    }
    const plan = reason === 'subscription_update' ? 'pro' : planFromPriceId(priceKey) ?? 'basic';
    const { error } = await getSupabase().from('events').insert({
      user_id: userId,
      session_id: null,
      name: 'paid',
      properties: {
        plan,
        kind: reason === 'subscription_update' ? 'upgrade' : 'new',
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        subscription_id: subId,
        invoice_id: invoice.id,
        price: priceKey,
      },
    });
    // 23505: a concurrent retry recorded it first (unique per invoice).
    if (error && (error as { code?: string }).code !== '23505') console.error('[stripe webhook] paid event insert failed', error.message);
  } catch (e) {
    // Never fail the webhook over the report.
    console.error('[stripe webhook] paid event threw', e);
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
  if (prevRow && !prevRow.cancel_at_period_end && (sub.cancel_at_period_end ?? false)) {
    await maybeSendCancellationEmail(
      sub, env, prevRow,
      periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    );
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
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
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
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
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

  const { error, count } = await getSupabase().from('subscriptions').update({
    status: 'canceled',
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
            case 'customer.subscription.created':
              await handleCreated(await latest(event.data.object, env), env); break;
            case 'customer.subscription.updated':
              await handleUpdated(await latest(event.data.object, env), env); break;
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
