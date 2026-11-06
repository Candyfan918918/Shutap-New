import { test } from 'node:test'
import assert from 'node:assert/strict'
import { can, limitFor } from './entitlements'

test('guests are asked to sign in for everything', () => {
  for (const k of ['bit', 'download', 'touch', 'kit'] as const) assert.equal(can(k, 'guest', 0).ok, false)
})
test('creating is counted: free 1 bit a day, basic 3, pro unlimited', () => {
  assert.deepEqual(limitFor('bit', 'free'), { cap: 1, period: 'day' })
  assert.equal(limitFor('bit', 'basic').cap, 3)
  assert.equal(limitFor('bit', 'pro').cap, null)
  assert.equal(can('bit', 'pro', 999).ok, true)
})
test('kits: free 1 ever, basic 20 a month, pro unlimited', () => {
  assert.deepEqual(limitFor('kit', 'free'), { cap: 1, period: 'ever' })
  assert.deepEqual(limitFor('kit', 'basic'), { cap: 20, period: 'month' })
  assert.equal(can('kit', 'basic', 19).ok, true)
  assert.equal(can('kit', 'basic', 20).ok, false)
  assert.equal(limitFor('kit', 'pro').cap, null)
})
test('using is never counted: downloads and touches unlimited for every signed-in plan', () => {
  for (const t of ['free', 'basic', 'pro'] as const) {
    assert.equal(limitFor('download', t).cap, null)
    assert.equal(limitFor('touch', t).cap, null)
    assert.equal(can('download', t, 10_000).ok, true)
    assert.equal(can('touch', t, 10_000).ok, true)
  }
})
