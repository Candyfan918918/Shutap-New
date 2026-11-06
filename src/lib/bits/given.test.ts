import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyGiven, givenBlock } from './pipeline.server'

const draft = { hook: 'writer hook', setup: 'writer setup', tags: ['writer tag 1', 'writer tag 2', 'writer tag 3'], button: 'writer button', why: '' }

test('the lines the person wrote come back word for word; the writer fills the rest', () => {
  const out = applyGiven(draft, { hook: 'My daughter introduced the homeless lady', tags: ['', 'She wanted references. Plural.'], button: undefined })
  assert.equal(out.hook, 'My daughter introduced the homeless lady')
  assert.equal(out.setup, 'writer setup')
  assert.deepEqual(out.tags, ['writer tag 1', 'She wanted references. Plural.', 'writer tag 3'])
  assert.equal(out.button, 'writer button')
})

test('a given tag beyond what the writer wrote is added, never dropped', () => {
  const out = applyGiven({ ...draft, tags: [] }, { tags: ['', 'mine'] })
  assert.deepEqual(out.tags, ['mine'])
})

test('the writer is told which lines are fixed, and nothing when none are', () => {
  assert.equal(givenBlock({}), '')
  const b = givenBlock({ setup: 'We were waiting for the bus.', tags: ['', 'tag two'] })
  assert.match(b, /WORD FOR WORD/)
  assert.match(b, /SETUP: We were waiting for the bus\./)
  assert.match(b, /TAG 2: tag two/)
  assert.doesNotMatch(b, /HOOK:/)
})
