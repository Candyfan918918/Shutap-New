// Plans: which price buys which tier, what the webhook records, and who gets
// the Mirror. A Basic subscriber must never be read as Pro.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PLANS, isCheckoutPriceId, planFromPriceId, planKeyFromParam, productIdForPrice } from './pricing'
import { bestPlan, rowIsActive, rowPlan } from './plan.server'

test('prices map to plans; unknown is Basic, never Pro', () => {
  assert.equal(planFromPriceId('basic_monthly'), 'basic')
  assert.equal(planFromPriceId('mirror_monthly'), 'pro')
  assert.equal(planFromPriceId('mirror_annual'), 'pro')
  assert.equal(planFromPriceId('price_1Xyz'), 'basic')
  assert.equal(planFromPriceId(null), null)
})

test('the webhook records Basic as basic and Pro as mirror', () => {
  assert.equal(productIdForPrice('basic_monthly'), 'basic')
  assert.equal(productIdForPrice('mirror_monthly'), 'mirror')
  assert.equal(productIdForPrice('mirror_annual'), 'mirror')
  assert.equal(productIdForPrice('price_unknown'), 'basic')
})

test('checkout only sells the plans on offer', () => {
  assert.equal(isCheckoutPriceId('basic_monthly'), true)
  assert.equal(isCheckoutPriceId('mirror_monthly'), true)
  assert.equal(isCheckoutPriceId('mirror_annual'), PLANS.pro_annual.shown)
  assert.equal(isCheckoutPriceId('anything_else'), false)
})

test('old /subscribe links still land on a plan', () => {
  assert.equal(planKeyFromParam('basic'), 'basic')
  assert.equal(planKeyFromParam('pro'), 'pro')
  assert.equal(planKeyFromParam('monthly'), 'pro')
  assert.equal(planKeyFromParam('annual'), PLANS.pro_annual.shown ? 'pro_annual' : 'pro')
  assert.equal(planKeyFromParam(null), 'pro')
})

const NOW = Date.parse('2026-10-22T18:00:00Z')
const future = '2026-11-22T18:00:00Z'
const past = '2026-10-01T18:00:00Z'

test('active rows', () => {
  assert.equal(rowIsActive({ status: 'active', current_period_end: future }, NOW), true)
  assert.equal(rowIsActive({ status: 'active', current_period_end: past }, NOW), false)
  assert.equal(rowIsActive({ status: 'past_due', current_period_end: past }, NOW), true)
  assert.equal(rowIsActive({ status: 'canceled', current_period_end: future }, NOW), true)
  assert.equal(rowIsActive({ status: 'canceled', current_period_end: past }, NOW), false)
  assert.equal(rowIsActive({ status: 'incomplete', current_period_end: future }, NOW), false)
})

test('Pro needs the Pro price and the mirror product', () => {
  assert.equal(rowPlan({ price_id: 'mirror_monthly', product_id: 'mirror' }), 'pro')
  assert.equal(rowPlan({ price_id: 'mirror_monthly', product_id: 'basic' }), 'basic')
  assert.equal(rowPlan({ price_id: 'basic_monthly', product_id: 'mirror' }), 'basic')
  assert.equal(rowPlan({ price_id: 'basic_monthly', product_id: 'basic' }), 'basic')
})

test('best plan: Pro wins, expired rows count for nothing', () => {
  const basic = { status: 'active', current_period_end: future, price_id: 'basic_monthly', product_id: 'basic' }
  const pro = { status: 'active', current_period_end: future, price_id: 'mirror_monthly', product_id: 'mirror' }
  const oldPro = { ...pro, status: 'canceled', current_period_end: past }
  assert.equal(bestPlan([], NOW), null)
  assert.equal(bestPlan([basic], NOW), 'basic')
  assert.equal(bestPlan([basic, pro], NOW), 'pro')
  assert.equal(bestPlan([oldPro], NOW), null)
  assert.equal(bestPlan([oldPro, basic], NOW), 'basic')
})
