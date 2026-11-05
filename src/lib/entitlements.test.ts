import { test } from 'node:test'
import assert from 'node:assert/strict'
import { can, limitFor } from './entitlements'

test('guests are asked to sign in for everything', () => {
  for (const k of ['bit', 'download', 'touch', 'kit'] as const) assert.equal(can(k, 'guest', 0).ok, false)
})
test('caps: free 1 bit and 1 download a day, basic 3 bits a day and 20 downloads a month, pro unlimited', () => {
  assert.deepEqual(limitFor('bit', 'free'), { cap: 1, period: 'day' })
  assert.deepEqual(limitFor('download', 'free'), { cap: 1, period: 'day' })
  assert.deepEqual(limitFor('download', 'basic'), { cap: 20, period: 'month' })
  assert.equal(limitFor('bit', 'pro').cap, null)
  assert.equal(can('download', 'free', 1).ok, false)
  assert.equal(can('download', 'basic', 19).ok, true)
  assert.equal(can('download', 'basic', 20).ok, false)
  assert.equal(can('bit', 'pro', 999).ok, true)
})
test('touches: free 3 a day, paid unlimited', () => {
  assert.equal(can('touch', 'free', 3).ok, false)
  assert.equal(can('touch', 'basic', 300).ok, true)
})
