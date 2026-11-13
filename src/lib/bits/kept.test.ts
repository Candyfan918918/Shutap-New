import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allLinesGiven, anyLineGiven, keptAsWritten } from './kept'

const all = { hook: 'My building turned the dryer into a reservation.', setup: 'There is a sign-up sheet. It is laminated.', tags: ['Fifteen-minute slots, booked like a wedding venue.', 'I wash one sock at a time now.'], button: 'The dryer has a waitlist. I have socks.' }

test('five written lines skip the writer; four do not', () => {
  assert.equal(allLinesGiven(all), true)
  assert.equal(allLinesGiven({ ...all, button: undefined }), false)
  assert.equal(allLinesGiven({ ...all, tags: [all.tags[0]!, ' '] }), false)
  assert.equal(allLinesGiven(undefined), false)
})

test('the bit is the five lines, word for word, and nothing else', () => {
  const w = keptAsWritten(all, 'test')
  assert.equal(w.ranked.length, 1)
  assert.deepEqual({ ...w.ranked[0], why: '' }, { ...all, why: '' })
  assert.deepEqual(w.crowdWork, [])
  assert.equal(w.writerModel, 'kept-as-written')
})

test('one written line is enough to make a bit (the writer drafts the rest)', () => {
  assert.equal(anyLineGiven({ hook: '', setup: '', tags: ['', ''], button: 'Last line.' }), true)
  assert.equal(anyLineGiven({ hook: ' ', setup: '', tags: ['', ''], button: '' }), false)
  assert.equal(anyLineGiven(undefined), false)
})
