import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitBySentence } from './split'

// The one-line box (DriveBox) hands any story to the cut; whatever comes back
// from the server, the browser can always cut it by sentence (cutHere).
test('any typed story gives at least a hook in the browser cut', () => {
  for (const s of ['my boss sang', 'my boss sang happy birthday to himself', 'No punctuation at all and lots of words here', 'Two. Sentences.', '“Is she homeless?” my daughter asked.']) {
    const c = splitBySentence(s)
    assert.ok(c.hook.trim().length > 0, s)
  }
})
