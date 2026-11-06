import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFlags, NO_FLAGS } from './flags'

test('every flag defaults on (Nov 6 2026: Toasts launched)', () => { assert.deepEqual(readFlags({}), NO_FLAGS); assert.deepEqual(NO_FLAGS, { realtors: true, ondemand: true, newnav: true, toasts: true }) })
test('SHUTAP_FLAG_<NAME>=0 is the kill switch; anything else leaves it on', () => {
  assert.deepEqual(readFlags({ SHUTAP_FLAG_REALTORS: '1', SHUTAP_FLAG_ONDEMAND: 'true', SHUTAP_FLAG_NEWNAV: '0' }), { realtors: true, ondemand: true, newnav: false, toasts: true })
})
test('SHUTAP_FLAG_TOASTS=0 switches Toasts off again', () => {
  assert.equal(readFlags({ SHUTAP_FLAG_TOASTS: '0' }).toasts, false)
  assert.equal(readFlags({ SHUTAP_FLAG_TOASTS: '1' }).toasts, true)
})
