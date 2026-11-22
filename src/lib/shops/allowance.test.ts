import { test } from 'node:test'
import assert from 'node:assert/strict'
import { skitAllowance, type ShopUsage } from './allowance'

const u = (over: Partial<ShopUsage> = {}): ShopUsage => ({ tier: 'free', videos: { used: 0, cap: 3, period: 'ever' }, sets_today: 0, sets_cap: 4, ...over })

test('free: skits until the third video is made, then the limit', () => {
  assert.equal(skitAllowance(u({ videos: { used: 2, cap: 3, period: 'ever' } })).ok, true)
  const r = skitAllowance(u({ videos: { used: 3, cap: 3, period: 'ever' } }))
  assert.equal(r.ok === false && r.reason, 'limited')
})
test('basic: no more skits once today’s video is made', () => {
  const r = skitAllowance(u({ tier: 'basic', videos: { used: 1, cap: 1, period: 'day' } }))
  assert.equal(r.ok === false && r.reason, 'limited')
})
test('pro has no video limit', () => {
  assert.equal(skitAllowance(u({ tier: 'pro', videos: { used: 40, cap: null, period: 'day' }, sets_cap: 16 })).ok, true)
})
test('a few skit sets a day, on any plan; the plan limit is named first', () => {
  const r = skitAllowance(u({ sets_today: 4 }))
  assert.equal(r.ok === false && r.reason, 'enough_today')
  const both = skitAllowance(u({ sets_today: 4, videos: { used: 3, cap: 3, period: 'ever' } }))
  assert.equal(both.ok === false && both.reason, 'limited')
})
