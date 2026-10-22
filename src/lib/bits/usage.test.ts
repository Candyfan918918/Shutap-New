// Daily caps per tier, and what the browser is told. The locking itself is
// tested in SQL (supabase/tests/bit_usage_test.sql).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { capFor, chargeBit, chargeNetwork, mergeGuestUsage, proCap, refundBit, today, usageView } from './usage.server'
import { atCap, isPaidTier } from './shared'

test('caps: guest 1, free 2, basic 5, pro 50 by default', () => {
  delete process.env['BIT_PRO_DAILY_CAP']
  assert.equal(capFor('guest'), 1)
  assert.equal(capFor('free'), 2)
  assert.equal(capFor('basic'), 5)
  assert.equal(capFor('pro'), 50)
})

test('pro cap reads BIT_PRO_DAILY_CAP and ignores junk', () => {
  process.env['BIT_PRO_DAILY_CAP'] = '80'
  assert.equal(proCap(), 80)
  process.env['BIT_PRO_DAILY_CAP'] = 'lots'
  assert.equal(proCap(), 50)
  process.env['BIT_PRO_DAILY_CAP'] = '0'
  assert.equal(proCap(), 50)
  delete process.env['BIT_PRO_DAILY_CAP']
})

test('the old one-number override does not flatten the tiers', () => {
  process.env['JOKE_DAILY_SETS'] = '5'
  assert.equal(capFor('guest'), 1)
  assert.equal(capFor('free'), 2)
  delete process.env['JOKE_DAILY_SETS']
})

test('the browser never sees the pro cap', () => {
  const u = usageView('pro', 12, '2026-10-23T07:00:00.000Z')
  assert.equal(u.cap, null)
  assert.equal(atCap(u), false)
  assert.deepEqual(usageView('free', 2, 'x'), { used: 2, cap: 2, resets_at: 'x' })
  assert.equal(atCap(usageView('free', 2, 'x')), true)
  assert.equal(atCap(usageView('free', 1, 'x')), false)
  assert.equal(atCap(usageView('guest', 1, 'x')), true)
  assert.equal(atCap(null), false)
})

test('watermark-free tiers', () => {
  assert.equal(isPaidTier('guest'), false)
  assert.equal(isPaidTier('free'), false)
  assert.equal(isPaidTier('basic'), true)
  assert.equal(isPaidTier('pro'), true)
})

test('today() resets at Pacific midnight', () => {
  const t = today(Date.parse('2026-10-22T18:00:00Z'))
  assert.deepEqual(t, { day: '2026-10-22', resetsAt: '2026-10-23T07:00:00.000Z' })
})

// A stand-in for the service-role client: records rpc calls.
function fakeDb(rpcResult: { data?: unknown; error?: { message: string } | null }) {
  const calls: { fn: string; args: Record<string, unknown> }[] = []
  return {
    calls,
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args })
      return { data: rpcResult.data ?? null, error: rpcResult.error ?? null }
    },
  }
}

test('chargeBit passes the cap and bit id, returns the count', async () => {
  const db = fakeDb({ data: 2 })
  const n = await chargeBit(db, 'user:u1', '2026-10-22', 2, 'b1')
  assert.equal(n, 2)
  assert.deepEqual(db.calls[0], { fn: 'bit_charge', args: { p_subject: 'user:u1', p_day: '2026-10-22', p_cap: 2, p_bit: 'b1' } })
})

test('chargeBit throws when the database refuses, so the write is refused', async () => {
  const db = fakeDb({ error: { message: 'function bit_charge does not exist' } })
  await assert.rejects(() => chargeBit(db, 'user:u1', '2026-10-22', 2, 'b1'), /bit_charge/)
})

test('refundBit never throws', async () => {
  const db = fakeDb({ error: { message: 'down' } })
  await refundBit(db, 'user:u1', '2026-10-22', 'b1')
  const broken = { rpc: async () => { throw new Error('network') } }
  await refundBit(broken, 'user:u1', '2026-10-22', 'b1')
})

test('mergeGuestUsage keys the account and the browser', async () => {
  const db = fakeDb({ data: 2 })
  assert.equal(await mergeGuestUsage(db, 'u1', 'browser-1234', '2026-10-22'), 2)
  assert.deepEqual(db.calls[0]!.args, { p_user: 'user:u1', p_guest: 'anon:browser-1234', p_day: '2026-10-22' })
})

test('the network layer never limits an account', async () => {
  const db = { from: () => { throw new Error('should not be read') } }
  for (const t of ['free', 'basic', 'pro'] as const) assert.equal(await chargeNetwork(db, t, '2026-10-22', 3), 'ok')
})
