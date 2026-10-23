import { test } from 'node:test'
import assert from 'node:assert/strict'
import { POLL, pollDate, pollOption, toPercents } from './poll'

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0)

test('nobody voted: all zeros', () => {
  assert.deepEqual(toPercents({ love: 0, lines: 0, better: 0, trash: 0 }), { love: 0, lines: 0, better: 0, trash: 0 })
})

test('first vote: that option is 100%', () => {
  assert.deepEqual(toPercents({ love: 0, lines: 1, better: 0, trash: 0 }), { love: 0, lines: 100, better: 0, trash: 0 })
})

test('thirds still add up to 100', () => {
  const r = toPercents({ love: 1, lines: 1, better: 1, trash: 0 })
  assert.equal(sum(r), 100)
  assert.deepEqual(Object.values(r).sort(), [0, 33, 33, 34])
})

test('uneven split adds up to 100', () => {
  assert.equal(sum(toPercents({ love: 7, lines: 3, better: 2, trash: 1 })), 100)
})

test('every option has a follow-up, chips or typed', () => {
  for (const o of POLL.options) {
    assert.ok(o.followUp.question.length > 0)
    assert.ok(o.followUp.chips.length > 0 || o.followUp.placeholder)
    assert.equal(pollOption(o.key), o)
  }
  assert.equal(pollOption('nope'), null)
})

test('dates read in English, Pacific', () => {
  assert.equal(pollDate('2026-10-23T17:00:00Z'), 'oct 23, 2026')
  assert.equal(pollDate('2026-10-24T03:00:00Z'), 'oct 23, 2026')
})
