import { test } from 'node:test'
import assert from 'node:assert/strict'
import { momentum, rankTopics } from './trend-data'

test('chosen topic precedes rising topics, which precede other directions', () => {
  assert.deepEqual(rankTopics([{ topic: 'steady', direction: 'steady' }, { topic: 'rise', direction: 'rising' }, { topic: 'pick', chosen: true, direction: 'cooling' }]).map((i) => i.topic), ['pick', 'rise', 'steady'])
})
test('momentum is proportional, capped at 100, and absent without a reading', () => {
  assert.equal(momentum(38), 38)
  assert.equal(momentum(-12), 12)
  assert.equal(momentum(140), 100)
  assert.equal(momentum(null), 0)
})