import { test } from 'node:test'
import assert from 'node:assert/strict'
import { topicsFromRow } from './topics.server'

const row = (over: Record<string, unknown> = {}) => ({ day: '2026-11-21', topic: 'Thanksgiving travel', signals: { topics: [
  { topic: 'Thanksgiving travel', direction: 'rising', note: 'record week' },
  { topic: 'The first frost', direction: 'peaking' },
  { topic: 'Last month\u2019s outage', direction: 'cooling' },
  { topic: 'Big game Sunday', note: 'kickoff 1pm' },
] }, ...over })

test('today\u2019s topics: the day\u2019s own first, no repeats, cooling ones left out', () => {
  assert.deepEqual(topicsFromRow(row(), '2026-11-21'), ['Thanksgiving travel', 'The first frost', 'Big game Sunday (kickoff 1pm)'])
})
test('a list up to two days old still counts; an older one does not', () => {
  assert.equal(topicsFromRow(row(), '2026-11-23').length, 3)
  assert.deepEqual(topicsFromRow(row(), '2026-11-24'), [])
  assert.deepEqual(topicsFromRow(row({ day: '2026-11-22' }), '2026-11-21'), [])
})
test('no row, no signals: no topics', () => {
  assert.deepEqual(topicsFromRow(null, '2026-11-21'), [])
  assert.deepEqual(topicsFromRow(row({ topic: '', signals: null }), '2026-11-21'), [])
})
test('at most six', () => {
  const many = { topics: Array.from({ length: 12 }, (_, i) => ({ topic: `Topic ${i}` })) }
  assert.equal(topicsFromRow(row({ signals: many }), '2026-11-21').length, 6)
})
