import { test } from 'node:test'
import assert from 'node:assert/strict'
import { can, limitFor } from './entitlements'

test('guests are asked to sign in for everything', () => {
  for (const k of ['bit', 'download', 'touch', 'kit'] as const) assert.equal(can(k, 'guest', 0).ok, false)
})
test('today\'s caps are unchanged: free 1/1, basic 3/3, pro unlimited', () => {
  assert.deepEqual(limitFor('bit', 'free'), { cap: 1, period: 'day' })
  assert.deepEqual(limitFor('download', 'basic'), { cap: 3, period: 'day' })
  assert.equal(limitFor('bit', 'pro').cap, null)
  assert.equal(can('download', 'free', 1).ok, false)
  assert.equal(can('download', 'basic', 2).ok, true)
  assert.equal(can('bit', 'pro', 999).ok, true)
})
test('touches: free 3 a day, paid unlimited', () => {
  assert.equal(can('touch', 'free', 3).ok, false)
  assert.equal(can('touch', 'basic', 300).ok, true)
})
