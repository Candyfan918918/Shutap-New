import { test } from 'node:test'
import assert from 'node:assert/strict'
import { POLL, pollDate, pollOption, toPercents } from './poll'

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0)

test('nobody voted: all zeros', () => {
  assert.deepEqual(toPercents({ video: 0, perform: 0, lines: 0, none: 0 }), { video: 0, perform: 0, lines: 0, none: 0 })
})

test('first vote: that option is 100%', () => {
  assert.deepEqual(toPercents({ video: 0, perform: 1, lines: 0, none: 0 }), { video: 0, perform: 100, lines: 0, none: 0 })
})

test('thirds still add up to 100', () => {
  const r = toPercents({ video: 1, perform: 1, lines: 1, none: 0 })
  assert.equal(sum(r), 100)
  assert.deepEqual(Object.values(r).sort(), [0, 33, 33, 34])
})

test('uneven split adds up to 100', () => {
  assert.equal(sum(toPercents({ video: 7, perform: 3, lines: 2, none: 1 })), 100)
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
