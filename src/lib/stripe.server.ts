import Stripe from 'stripe';

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = 'sandbox' | 'live';

const GATEWAY_STRIPE_BASE = 'https://connector-gateway.lovable.dev/stripe';

export function getConnectionApiKey(env: StripeEnv): string {
  return env === 'sandbox'
    ? getEnv('STRIPE_SANDBOX_API_KEY')
    : getEnv('STRIPE_LIVE_API_KEY');
}

export function createStripeClient(env: StripeEnv): Stripe {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv('LOVABLE_API_KEY');
  return new Stripe(connectionApiKey, {
    apiVersion: '2026-03-25.dahlia' as any,
    httpClient: Stripe.createFetchHttpClient((input, init) => {
      const stripeUrl = input instanceof Request ? input.url : input.toString();
      const gatewayUrl = stripeUrl.replace('https://api.stripe.com', GATEWAY_STRIPE_BASE);
      return fetch(gatewayUrl, {
        ...init,
        headers: {
          ...Object.fromEntries(
            new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)).entries(),
          ),
          'X-Connection-Api-Key': connectionApiKey,
          'Lovable-API-Key': lovableApiKey,
        },
      });
    }),
  });
}

export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as any;
    const message = e.raw?.message ?? e.message;
    if (message) {
      const details = [e.raw?.type ?? e.type, e.raw?.code ?? e.code, e.raw?.requestId ?? e.requestId].filter(Boolean);
      return details.length ? `${message} (${details.join(', ')})` : message;
    }
  }
  return 'Stripe request failed';
}

export async function verifyWebhook(req: Request, env: StripeEnv): Promise<{ type: string; data: { object: any } }> {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();
  const secret = env === 'sandbox'
    ? getEnv('PAYMENTS_SANDBOX_WEBHOOK_SECRET')
    : getEnv('PAYMENTS_LIVE_WEBHOOK_SECRET');
  if (!signature || !body) throw new Error('Missing signature or body');

  let timestamp: string | undefined;
  const v1: string[] = [];
  for (const part of signature.split(',')) {
    const [k, v] = part.split('=', 2);
    if (k === 't') timestamp = v;
    if (k === 'v1') v1.push(v);
  }
  if (!timestamp || v1.length === 0) throw new Error('Invalid signature format');
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) throw new Error('Webhook timestamp too old');

  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`));
  const expected = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, '0')).join('');
  if (!v1.includes(expected)) throw new Error('Invalid webhook signature');
  return JSON.parse(body);
}

/** The Stripe price for a lookup key, at the amount the code lists.
 *
 *  src/lib/pricing.ts is the source of truth for list prices. Stripe prices
 *  are immutable, so when the price behind a lookup key no longer matches
 *  (a price change), a new price is created on the same product, the lookup
 *  key moves to it (transfer_lookup_key), and the old price is archived.
 *  Existing subscribers stay on the old price object until they change
 *  plan; the old price keeps metadata.lovable_external_id = the lookup key,
 *  so the webhook still maps them to the right plan (see priceIdFrom). */
export async function priceForLookupKey(
  stripe: Stripe,
  lookupKey: string,
  expected: { amount: number; interval: 'month' | 'year' },
): Promise<Stripe.Price> {
  const cents = Math.round(expected.amount * 100);
  const found = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  const current = found.data[0];
  if (!current) throw new Error('Price not found');
  if (current.unit_amount === cents && current.recurring?.interval === expected.interval) return current;

  const productId = typeof current.product === 'string' ? current.product : current.product.id;
  const metadata = { ...(current.metadata ?? {}), lovable_external_id: lookupKey };
  const next = await stripe.prices.create({
    product: productId,
    currency: current.currency,
    unit_amount: cents,
    recurring: { interval: expected.interval },
    tax_behavior: current.tax_behavior ?? undefined,
    nickname: current.nickname ?? undefined,
    lookup_key: lookupKey,
    transfer_lookup_key: true,
    metadata,
  });
  console.log('[stripe] price updated to match pricing.ts', { lookupKey, from: current.unit_amount, to: cents, old: current.id, new: next.id });
  try {
    await stripe.prices.update(current.id, { active: false, metadata });
  } catch (e) {
    console.error('[stripe] could not archive old price', { id: current.id, error: getStripeErrorMessage(e) });
  }
  return next;
}
