import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allLinesGiven, keptAsWritten } from './kept'

const all = { hook: 'My building turned the dryer into a reservation.', setup: 'There is a sign-up sheet. It is laminated.', tags: ['Fifteen-minute slots, booked like a wedding venue.', 'I wash one sock at a time now.'], button: 'The dryer has a waitlist. I have socks.' }

test('hook, setup, a tag and button skip the writer; the second tag is optional', () => {
  assert.equal(allLinesGiven(all), true)
  assert.equal(allLinesGiven({ ...all, button: undefined }), false)
  assert.equal(allLinesGiven({ ...all, tags: [all.tags[0]!, ' '] }), true)
  assert.deepEqual(keptAsWritten({ ...all, tags: [all.tags[0]!, ' '] }, 't').ranked[0]!.tags, [all.tags[0]])
  assert.equal(allLinesGiven({ ...all, tags: [' ', ''] }), false)
  assert.equal(allLinesGiven({ ...all, setup: '' }), false)
  assert.equal(allLinesGiven(undefined), false)
})

test('the bit is the five lines, word for word, and nothing else', () => {
  const w = keptAsWritten(all, 'test')
  assert.equal(w.ranked.length, 1)
  assert.deepEqual({ ...w.ranked[0], why: '' }, { ...all, why: '' })
  assert.deepEqual(w.crowdWork, [])
  assert.equal(w.writerModel, 'kept-as-written')
})
