import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aggregatePaywall, type PaywallEventRow } from './paywall-report'
import { pacificDay } from './pacific-day'

const ev = (name: string, who: { user_id?: string; session_id?: string }, properties: Record<string, unknown> = {}): PaywallEventRow => ({
  name,
  user_id: who.user_id ?? null,
  session_id: who.session_id ?? null,
  properties,
})

const ADMIN = 'admin-1'
const NO_EMAIL = 'no-email-1'
const include = (uid: string) => uid !== ADMIN && uid !== NO_EMAIL

test('unique people per step; admins and no-email accounts left out', () => {
  const paid = (uid: string, plan: string, kind = 'new', inv = 'in_' + uid + plan + kind) =>
    ev('paid', { user_id: uid }, { plan, kind, invoice_id: inv })
  const rows = [
    ev('paywall_seen', { user_id: 'u1' }, { where: 'bit_3' }),
    ev('paywall_seen', { user_id: 'u1' }, { where: 'bit_3' }), // same person twice
    ev('paywall_seen', { user_id: 'u2' }, { where: 'download' }),
    ev('paywall_seen', { session_id: 'guest-s' }, { where: 'download' }),
    ev('paywall_seen', { user_id: ADMIN }, { where: 'bit_3' }),
    ev('paywall_seen', { user_id: NO_EMAIL }, { where: 'bit_3' }),
    ev('paywall_seen', { user_id: 'u3' }, { where: 'daily_limit' }),
    ev('plan_chosen', { user_id: 'u1' }, { plan: 'pro', where: 'bit_3' }),
    ev('plan_chosen', { user_id: 'u2' }, { plan: 'basic', where: 'download' }),
    ev('checkout_started', { user_id: 'u1' }, { plan: 'pro', where: 'bit_3' }),
    ev('checkout_started', { user_id: 'u1' }, { plan: 'pro', where: 'bit_3' }),
    ev('checkout_started', { user_id: 'u2' }, { plan: 'basic', where: 'download' }),
    ev('checkout_started', { user_id: 'u9' }, { plan: 'pro', where: null }), // direct visit: not the funnel
    paid('u1', 'pro'),
    paid('u9', 'basic'), // paid without the paywall: counted, not in the rate
    paid('u3', 'pro', 'upgrade'),
    paid(ADMIN, 'pro'),
    ev('paid', { user_id: 'u5', session_id: 'faked' }, { plan: 'pro', invoice_id: 'x' }), // from a browser
    ev('paid', { user_id: 'u6' }, { plan: 'pro' }), // no invoice
    ev('signin_prompt_seen', { session_id: 'guest-s' }, { where: 'bit_2' }),
    ev('signin_prompt_seen', { session_id: 'guest-s' }, { where: 'bit_2' }),
    // a guest with a hidden guest id: counts, once, in each bucket they hit
    ev('signin_prompt_seen', { user_id: 'anon-g2', session_id: 's2' }, { where: 'rewrite' }),
    ev('signin_prompt_seen', { user_id: 'anon-g2', session_id: 's2' }, { where: 'swap' }),
    ev('signin_prompt_seen', { user_id: 'anon-g2', session_id: 's2' }, { where: 'download' }),
    ev('signin_prompt_seen', { user_id: 'anon-g2', session_id: 's2' }, { where: 'scene' }),
    ev('signin_prompt_seen', { user_id: ADMIN }, { where: 'save' }),
  ]
  const r = aggregatePaywall(rows, include)
  assert.deepEqual(r.seen, { bit_3: 1, daily_limit: 1, download: 2, total: 4 })
  assert.deepEqual(r.plan_chosen, { basic: 1, pro: 1 })
  assert.deepEqual(r.checkout_started, { basic: 1, pro: 1 })
  assert.deepEqual(r.paid, { basic: 1, pro: 1 })
  assert.equal(r.upgrades, 1)
  assert.equal(r.signin_prompt_seen, 2)
  assert.deepEqual(r.signin_by_where, { bit_2: 1, rewrite: 1, download: 1, keep: 0, other: 1 })
  assert.equal(r.checkout_rate_pct, 50)
  assert.equal(r.paid_rate_pct, 50) // u1 of {u1, u2}
})

test('no paywall views: rates are empty, not zero', () => {
  const r = aggregatePaywall([], include)
  assert.equal(r.checkout_rate_pct, null)
  assert.equal(r.paid_rate_pct, null)
})

test('23:59 and 00:01 Pacific land on different days', () => {
  assert.equal(pacificDay(Date.parse('2026-10-23T06:59:00Z')), '2026-10-22')
  assert.equal(pacificDay(Date.parse('2026-10-23T07:01:00Z')), '2026-10-23')
})
