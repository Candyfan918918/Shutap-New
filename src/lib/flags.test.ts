import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFlags, NO_FLAGS } from './flags'

test('live flags default on, toasts defaults off (Nov 6 2026)', () => { assert.deepEqual(readFlags({}), NO_FLAGS); assert.deepEqual(NO_FLAGS, { realtors: true, ondemand: true, newnav: true, toasts: false }) })
test('SHUTAP_FLAG_<NAME>=0 is the kill switch; anything else leaves it on', () => {
  assert.deepEqual(readFlags({ SHUTAP_FLAG_REALTORS: '1', SHUTAP_FLAG_ONDEMAND: 'true', SHUTAP_FLAG_NEWNAV: '0' }), { realtors: true, ondemand: true, newnav: false, toasts: false })
})
test('toasts turns on only with SHUTAP_FLAG_TOASTS=1 or true', () => {
  assert.equal(readFlags({ SHUTAP_FLAG_TOASTS: '1' }).toasts, true)
  assert.equal(readFlags({ SHUTAP_FLAG_TOASTS: 'true' }).toasts, true)
  assert.equal(readFlags({ SHUTAP_FLAG_TOASTS: '0' }).toasts, false)
  assert.equal(readFlags({ SHUTAP_FLAG_TOASTS: 'yes' }).toasts, false)
})
