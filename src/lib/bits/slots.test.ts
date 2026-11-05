import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readSlot, slotLabel, writeSlot } from './shared'

const d = { hook: 'H', setup: 'S', tags: ['t1', 't2'], button: 'B' }
test('slots read and write every part of a bit', () => {
  assert.equal(readSlot(d, 'hook'), 'H'); assert.equal(readSlot(d, 'tag1'), 't2'); assert.equal(readSlot(d, 'tag2'), '')
  assert.deepEqual(writeSlot(d, 'tag0', 'x').tags, ['x', 't2']); assert.equal(writeSlot(d, 'button', 'y').button, 'y')
  assert.equal(slotLabel('tag0'), 'tag 1'); assert.equal(slotLabel('setup'), 'setup')
})
