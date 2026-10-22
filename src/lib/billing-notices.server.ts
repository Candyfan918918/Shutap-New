// Billing emails and the 'paid' report event, shared by the Stripe webhook,
// the hourly billing-receipts sweep, and cancelling from the profile. Every
// send is deduped in billing_emails (receipts per invoice id, cancellations
// per subscription id + access end), so whichever path gets there first
// sends it and the others are no-ops. Nothing here throws.
import { createClient } from '@supabase/supabase-js';
import { type StripeEnv, createStripeClient } from '@/lib/stripe.server';
import { formatEmailDate, formatStripeAmount, sendBillingEmail } from '@/lib/email/billing.server';
import { planFromPriceId } from '@/lib/pricing';

export const APP_ORIGIN = 'https://shutap.com';

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _supabase;
}

export function priceIdFrom(item: any): string {
  return item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id;
}

/** The plan's name for billing emails. Every billing email carries it. */
export function planNameFor(priceId: string | null | undefined): string {
  return planFromPriceId(priceId) === 'pro' ? 'Pro' : 'Basic';
}

export const PAID_PRODUCTS = ['mirror', 'basic'];

// Cancellation confirmation email when cancel_at_period_end flips
// false → true (covers cancels made in the Stripe billing portal too).
// Idempotent via billing_emails (dedupe on subscription id + period end),
// so resuming and re-cancelling in a later period sends a fresh one.
export async function maybeSendCancellationEmail(
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
export function subscriptionIdOf(invoice: any): string | null {
  const line = invoice?.lines?.data?.[0];
  return (
    invoice?.subscription ||
    invoice?.parent?.subscription_details?.subscription ||
    line?.parent?.subscription_item_details?.subscription ||
    line?.subscription ||
    null
  );
}


export async function handleInvoicePaid(invoice: any, env: StripeEnv) {
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
