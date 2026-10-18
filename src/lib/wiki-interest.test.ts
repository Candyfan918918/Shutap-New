import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarizeInterest, wikiWindow } from './wiki-interest.server'

test('reading compares two API weeks without inventing missing days', () => {
  const items = Array.from({ length: 14 }, (_, i) => ({ timestamp: `202610${String(i + 1).padStart(2, '0')}00`, views: i < 7 ? 100 : 138 }))
  assert.equal(summarizeInterest(items)?.lastWeek, 700)
  assert.equal(summarizeInterest(items)?.thisWeek, 966)
  assert.equal(summarizeInterest(items)?.change, 38)
  assert.equal(summarizeInterest(items.slice(1)), null)
})
test('UTC window ends yesterday and spans 28 days', () => {
  assert.deepEqual(wikiWindow(new Date('2026-10-18T02:32:00Z')), { start: '20260920', end: '20261017' })
})