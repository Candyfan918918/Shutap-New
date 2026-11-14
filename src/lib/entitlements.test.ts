import { test } from 'node:test'
import assert from 'node:assert/strict'
import { can, limitFor } from './entitlements'

test('guests are asked to sign in for everything', () => {
  for (const k of ['bit', 'download', 'touch', 'kit'] as const) assert.equal(can(k, 'guest', 0).ok, false)
})
test('creating is counted: free 3 bits in total, basic 3 a day, pro unlimited', () => {
  assert.deepEqual(limitFor('bit', 'free'), { cap: 3, period: 'ever' })
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
test('toasts: free the first one ever, basic 1 a month, pro unlimited', () => {
  assert.deepEqual(limitFor('toast', 'free'), { cap: 1, period: 'ever' })
  assert.deepEqual(limitFor('toast', 'basic'), { cap: 1, period: 'month' })
  assert.equal(can('toast', 'free', 0).ok, true)
  assert.equal(can('toast', 'free', 1).ok, false)
  assert.equal(can('toast', 'basic', 1).ok, false)
  assert.equal(limitFor('toast', 'pro').cap, null)
  assert.equal(can('toast', 'pro', 999).ok, true)
  assert.equal(can('toast', 'guest', 0).ok, false)
})
test('using is never counted: downloads and touches unlimited for every signed-in plan', () => {
  for (const t of ['free', 'basic', 'pro'] as const) {
    assert.equal(limitFor('download', t).cap, null)
    assert.equal(limitFor('touch', t).cap, null)
    assert.equal(can('download', t, 10_000).ok, true)
    assert.equal(can('touch', t, 10_000).ok, true)
  }
})
