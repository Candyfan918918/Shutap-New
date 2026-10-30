// Joke battle: ranks, humor type, streaks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RANKS, humorLabel, humorType, nextStreak, rankFor, rankUp, styleOf } from './battle'

test('the ladder is 1, 3, 10, 50, 100, 500', () => {
  assert.deepEqual(RANKS.map((r) => r.at), [1, 3, 10, 50, 100, 500])
})

test('rank, next and progress', () => {
  assert.equal(rankFor(0).rank, null)
  assert.equal(rankFor(0).next?.name, 'Jester')
  assert.equal(rankFor(1).rank?.name, 'Jester')
  assert.equal(rankFor(9).rank?.name, 'Wit')
  assert.equal(rankFor(10).rank?.name, 'Wise Fool')
  assert.equal(rankFor(499).rank?.name, 'Oracle')
  assert.equal(rankFor(500).rank?.name, 'Legend')
  assert.equal(rankFor(500).next, null)
  assert.equal(rankFor(500).progress, 1)
  assert.equal(Math.round(rankFor(30).progress * 100), 50) // 10 → 50
})

test('rank up only when crossing a line', () => {
  assert.equal(rankUp(0, 1)?.name, 'Jester')
  assert.equal(rankUp(1, 2), null)
  assert.equal(rankUp(9, 10)?.name, 'Wise Fool')
  assert.equal(rankUp(499, 500)?.name, 'Legend')
})

test('humor type from picks', () => {
  assert.equal(humorLabel({}), null)
  assert.equal(humorLabel({ deadpan: 1 }), 'so far: deadpan')
  assert.equal(humorLabel({ deadpan: 5, dry: 2, roast: 1 }), 'mostly deadpan')
  assert.equal(humorLabel({ deadpan: 3, dry: 3, roast: 2, dark: 2 }), 'deadpan and dry')
  assert.deepEqual(humorType({ a: 0, b: 2, c: 5 }).map((x) => x.style), ['c', 'b'])
  assert.equal(styleOf('deadpan-humor'), 'deadpan')
  assert.equal(styleOf(null), 'mixed')
})

test('streak counts Pacific days', () => {
  assert.equal(nextStreak(null, 0, '2026-10-30', '2026-10-29'), 1)
  assert.equal(nextStreak('2026-10-29', 4, '2026-10-30', '2026-10-29'), 5)
  assert.equal(nextStreak('2026-10-30', 5, '2026-10-30', '2026-10-29'), 5)
  assert.equal(nextStreak('2026-10-20', 9, '2026-10-30', '2026-10-29'), 1)
})
