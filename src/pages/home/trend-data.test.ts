import { expect, test } from 'bun:test'
import { momentum, rankTopics } from './trend-data'

test('chosen topic precedes rising topics, which precede other directions', () => {
  expect(rankTopics([{ topic: 'steady', direction: 'steady' }, { topic: 'rise', direction: 'rising' }, { topic: 'pick', chosen: true, direction: 'cooling' }]).map((i) => i.topic)).toEqual(['pick', 'rise', 'steady'])
})
test('momentum is proportional, capped at 100, and absent without a reading', () => {
  expect(momentum(38)).toBe(38)
  expect(momentum(-12)).toBe(12)
  expect(momentum(140)).toBe(100)
  expect(momentum(null)).toBe(0)
})