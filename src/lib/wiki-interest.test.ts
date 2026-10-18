import { expect, test } from 'bun:test'
import { summarizeInterest, wikiWindow } from './wiki-interest.server'

test('reading compares two API weeks without inventing missing days', () => {
  const items = Array.from({ length: 14 }, (_, i) => ({ timestamp: `202610${String(i + 1).padStart(2, '0')}00`, views: i < 7 ? 100 : 138 }))
  expect(summarizeInterest(items)).toMatchObject({ lastWeek: 700, thisWeek: 966, change: 38 })
  expect(summarizeInterest(items.slice(1))).toBeNull()
})
test('UTC window ends yesterday and spans 28 days', () => {
  expect(wikiWindow(new Date('2026-10-18T02:32:00Z'))).toEqual({ start: '20260920', end: '20261017' })
})