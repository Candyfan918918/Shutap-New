import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFlags, NO_FLAGS } from './flags'

test('flags default on (Nov 6 2026: every slice is live)', () => { assert.deepEqual(readFlags({}), NO_FLAGS); assert.deepEqual(NO_FLAGS, { realtors: true, ondemand: true, newnav: true }) })
test('SHUTAP_FLAG_<NAME>=0 is the kill switch; anything else leaves it on', () => {
  assert.deepEqual(readFlags({ SHUTAP_FLAG_REALTORS: '1', SHUTAP_FLAG_ONDEMAND: 'true', SHUTAP_FLAG_NEWNAV: '0' }), { realtors: true, ondemand: true, newnav: false })
})
