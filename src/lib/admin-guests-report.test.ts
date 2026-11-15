import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aggregateGuests, sourceOf, type GuestEventRow } from './admin-guests-report'

let t = Date.parse('2026-11-14T08:00:00Z')
const ev = (name: string, session_id: string | null, user_id: string | null = null, properties: Record<string, unknown> = {}): GuestEventRow => ({
  name, session_id, user_id, properties, ts: new Date((t += 1000)).toISOString(),
})

const base = { accountIds: new Set(['acct1', 'admin1', 'acct2']), adminIds: new Set(['admin1']), emails: new Map([['acct1', 'a@x.com'], ['acct2', 'b@x.com']]), subs: [] }

test('guest funnel, sign-up driver and exclusions', () => {
  const events = [
    // s1: guest makes a bit, asked to sign up for a second, signs up
    ev('page_view', 's1', 'anon1', { path: '/bits' }),
    ev('line_typed', 's1', 'anon1'),
    ev('lined_make', 's1', 'anon1', { tier: 'guest' }),
    ev('bit_written', 's1', 'anon1', { tier: 'guest' }),
    ev('signin_prompt_seen', 's1', 'anon1', { where: 'bit_2' }),
    ev('sign_in_started', 's1', 'anon1'),
    ev('sign_up_completed', 's1', 'acct1'),
    ev('lined_make', 's1', 'acct1', { tier: 'free' }), // after sign-up: not a guest step
    // s2: one page, nothing
    ev('page_view', 's2', null, { path: '/' }),
    // s3: starts sign-in and never comes back
    ev('page_view', 's3', null, { path: '/' }),
    ev('home_cta', 's3'),
    ev('sign_in_started', 's3'),
    // s4: admin's browser — dropped, guest part too
    ev('page_view', 's4', 'anon9', { path: '/' }),
    ev('sign_up_completed', 's4', 'admin1'),
    // s5: a bot
    ev('page_view', 's5', null, { path: '/' }),
  ]
  const r = aggregateGuests({ ...base, events, visits: [{ session_id: 's5', is_bot: true, utm_source: null, referrer: null }, { session_id: 's1', is_bot: false, utm_source: 'chatgpt.com', referrer: null }] })
  const f = Object.fromEntries(r.funnel.map((x) => [x.key, x.n]))
  assert.deepEqual(f, { landed: 3, acted: 2, typed: 1, make: 1, bit: 1, asked: 1, started: 2, signed_up: 1 })
  assert.equal(r.bounced, 1)
  assert.equal(r.signup.total, 1)
  assert.equal(r.signup.drivers.find((d) => d.key === 'bit_2')?.signups, 1)
  assert.equal(r.signup.sources[0].label, 'ChatGPT')
  assert.equal(r.signup.abandoned_signin, 1)
  assert.ok(r.last_step.some((s) => s.label === 'started sign-up, never came back'))
})

test('paywall steps by where, and payment problems (live only)', () => {
  const events = [
    ev('paywall_seen', 'p1', 'acct1', { where: 'bit_3' }),
    ev('paywall_seen', 'p1', 'acct1', { where: 'bit_3' }),
    ev('plan_chosen', 'p1', 'acct1', { plan: 'basic', where: 'bit_3' }),
    ev('checkout_started', 'p1', 'acct1', { plan: 'basic', where: 'bit_3' }),
    ev('paywall_seen', 'p2', 'acct2', { where: 'rewrite' }),
    ev('paywall_closed', 'p2', 'acct2', { where: 'rewrite' }),
    ev('page_view', 'p2', 'acct2', { path: '/pricing' }),
    ev('paywall_seen', 'p3', 'admin1', { where: 'bit_3' }),
    ev('payment_problem', null, 'acct2', { kind: 'renewal_failed', env: 'live', amount: 7.99, reason: 'insufficient_funds' }),
    ev('payment_problem', null, 'acct2', { kind: 'card_declined', env: 'sandbox' }),
  ]
  const r = aggregateGuests({ ...base, events, visits: [] })
  const bit3 = r.paywall.rows.find((x) => x.where === 'bit_3')!
  assert.deepEqual([bit3.seen, bit3.chose, bit3.checkout, bit3.paid], [1, 1, 1, 0])
  assert.equal(r.paywall.rows.find((x) => x.where === 'rewrite')!.closed, 1)
  assert.equal(r.paywall.total.seen, 2)
  assert.equal(r.paywall.to_pricing, 1)
  assert.equal(r.payments.abandoned_checkout.length, 1)
  assert.equal(r.payments.abandoned_checkout[0].who, 'a@x.com')
  assert.equal(r.payments.problems.find((p) => p.kind === 'renewal_failed')!.n, 1)
  assert.equal(r.payments.problems.find((p) => p.kind === 'card_declined')!.n, 0)
})

test('sources', () => {
  assert.equal(sourceOf({ utm_source: 'chatgpt', referrer: null }), 'ChatGPT')
  assert.equal(sourceOf({ utm_source: null, referrer: 'https://www.google.com/' }), 'Google')
  assert.equal(sourceOf({ utm_source: 'hello_shutap', referrer: null }), 'Shutap email')
  assert.equal(sourceOf(undefined), 'no source (direct, typed in)')
})

test('realtors and toasts funnels', () => {
  const events = [
    ev('page_view', 'r1', null, { path: '/realtors' }),
    ev('paste_box_submit', 'r1', null, { product: 'realtors' }),
    ev('listing_read', 'r1', null, { product: 'realtors' }),
    ev('sign_up_completed', 'r1', 'acct1'),
    ev('kit_buy_clicked', 'r1', 'acct1', { product: 'realtors' }),
    ev('page_view', 'r2', null, { path: '/realtors/sample' }),
    ev('page_view', 't1', null, { path: '/toasts/maid-of-honor' }),
    ev('toast_form_viewed', 't1', null, { product: 'toasts' }),
    ev('page_view', 't2', 'admin1', { path: '/toasts' }),
  ]
  const r = aggregateGuests({
    ...base, events, visits: [],
    kits: [{ user_id: 'acct1', created_at: '2026-11-14T09:00:00Z', paid: true }, { user_id: 'admin1', created_at: '2026-11-14T09:00:00Z', paid: true }],
    toasts: [],
  })
  const rl = Object.fromEntries(r.lines.realtors.map((x) => [x.key, x.n]))
  assert.deepEqual([rl.visited, rl.acted, rl.pasted, rl.read, rl.signed_up, rl.made, rl.buy, rl.paid], [2, 1, 1, 1, 1, 1, 1, 1])
  const tl = Object.fromEntries(r.lines.toasts.map((x) => [x.key, x.n]))
  assert.deepEqual([tl.visited, tl.form, tl.acted, tl.made], [1, 1, 0, 0])
})
