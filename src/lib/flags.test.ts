import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFlags, NO_FLAGS } from './flags'

test('flags default off', () => { assert.deepEqual(readFlags({}), NO_FLAGS) })
test('flags read SHUTAP_FLAG_<NAME>=1 only', () => {
  assert.deepEqual(readFlags({ SHUTAP_FLAG_REALTORS: '1', SHUTAP_FLAG_ONDEMAND: 'true', SHUTAP_FLAG_NEWNAV: '0' }), { realtors: true, ondemand: false, newnav: false })
})
