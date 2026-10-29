import { test } from 'node:test'
import assert from 'node:assert/strict'
import { POLL, pollDate, pollOption, toPercents } from './poll'

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0)

test('nobody voted: all zeros', () => {
  assert.deepEqual(toPercents({ all: 0, caption: 0, bit: 0, none: 0 }), { all: 0, caption: 0, bit: 0, none: 0 })
})

test('first vote: that option is 100%', () => {
  assert.deepEqual(toPercents({ all: 0, caption: 1, bit: 0, none: 0 }), { all: 0, caption: 100, bit: 0, none: 0 })
})

test('thirds still add up to 100', () => {
  const r = toPercents({ all: 1, caption: 1, bit: 1, none: 0 })
  assert.equal(sum(r), 100)
  assert.deepEqual(Object.values(r).sort(), [0, 33, 33, 34])
})

test('uneven split adds up to 100', () => {
  assert.equal(sum(toPercents({ all: 7, caption: 3, bit: 2, none: 1 })), 100)
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
