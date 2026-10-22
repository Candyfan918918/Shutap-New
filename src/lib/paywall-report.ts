// The paywall section of the admin daily report, from rows of the `events`
// table. Each number is unique people (an account, or a guest's browser
// session) who did that thing that day — someone who saw the paywall twice
// counts once. Kept apart from the report so it can be tested on its own.

export const PAYWALL_EVENTS = ['signin_prompt_seen', 'paywall_seen', 'plan_chosen', 'checkout_started', 'paid'] as const

export type PaywallEventRow = {
  name: string
  user_id: string | null
  session_id: string | null
  properties: Record<string, unknown> | null
}

export type PaywallReport = {
  signin_prompt_seen: number
  seen: { bit_3: number; daily_limit: number; download: number; total: number }
  plan_chosen: { basic: number; pro: number }
  /** opened checkout coming from the paywall (a direct visit to /subscribe
   *  isn't counted here) */
  checkout_started: { basic: number; pro: number }
  /** new plans paid for, by plan */
  paid: { basic: number; pro: number }
  /** Basic → Pro upgrades paid for (they skip checkout) */
  upgrades: number
  /** started checkout from the paywall ÷ saw the paywall, in percent */
  checkout_rate_pct: number | null
  /** of the people who started checkout from the paywall, the share who
   *  paid for a new plan the same day, in percent */
  paid_rate_pct: number | null
}

const PAYWALL_WHERE = new Set(['bit_3', 'daily_limit', 'download'])

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null)

/** `include(userId)` decides whether an account counts (admins and accounts
 *  with no email are left out of every count). Guests always count. */
export function aggregatePaywall(rows: PaywallEventRow[], include: (userId: string) => boolean): PaywallReport {
  const sets = new Map<string, Set<string>>()
  const add = (bucket: string, who: string) => {
    let s = sets.get(bucket)
    if (!s) sets.set(bucket, (s = new Set()))
    s.add(who)
  }
  for (const r of rows) {
    if (r.user_id && !include(r.user_id)) continue
    const who = r.user_id ?? (r.session_id ? `s:${r.session_id}` : null)
    if (!who) continue
    const p = r.properties ?? {}
    const where = String(p['where'] ?? '')
    const plan = String(p['plan'] ?? '')
    switch (r.name) {
      case 'signin_prompt_seen':
        add('signin', who)
        break
      case 'paywall_seen':
        add('seen', who)
        if (where === 'bit_3' || where === 'daily_limit' || where === 'download') add(`seen:${where}`, who)
        break
      case 'plan_chosen':
        if (plan === 'basic' || plan === 'pro') add(`plan_chosen:${plan}`, who)
        break
      case 'checkout_started':
        // Only checkouts opened from the paywall are part of this funnel.
        if ((plan === 'basic' || plan === 'pro') && PAYWALL_WHERE.has(where)) {
          add(`checkout_started:${plan}`, who)
          add('checkout_started', who)
        }
        break
      case 'paid':
        // Only the server writes these (from Stripe): no browser session,
        // and every one carries its invoice.
        if (r.session_id || !p['invoice_id']) break
        if (p['kind'] === 'upgrade') add('upgrade', who)
        else if (plan === 'basic' || plan === 'pro') {
          add(`paid:${plan}`, who)
          add('paid', who)
        }
        break
    }
  }
  const n = (k: string) => sets.get(k)?.size ?? 0
  const seenTotal = n('seen')
  const started = n('checkout_started')
  const startedSet = sets.get('checkout_started') ?? new Set<string>()
  const paidAfterCheckout = [...(sets.get('paid') ?? [])].filter((w) => startedSet.has(w)).length
  return {
    signin_prompt_seen: n('signin'),
    seen: { bit_3: n('seen:bit_3'), daily_limit: n('seen:daily_limit'), download: n('seen:download'), total: seenTotal },
    plan_chosen: { basic: n('plan_chosen:basic'), pro: n('plan_chosen:pro') },
    checkout_started: { basic: n('checkout_started:basic'), pro: n('checkout_started:pro') },
    paid: { basic: n('paid:basic'), pro: n('paid:pro') },
    upgrades: n('upgrade'),
    checkout_rate_pct: pct(started, seenTotal),
    paid_rate_pct: pct(paidAfterCheckout, started),
  }
}
