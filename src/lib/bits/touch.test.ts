import { test } from 'node:test'
import assert from 'node:assert/strict'
import { touchOptionsOk } from './pipeline.server'

// The five lines Candy typed in /bit-lab (Nov 8 2026) when every funnier failed.
const story = "We've always ask our kids to not call out homeless people and not stare at them My daughter and I walked pass a homeless lady, my daughter called the lady homeless I have told her many times do not call out them homeless my Daughter said ok next time I will say she is not homeless"

test('a hook or setup may restate the situation; options are checked on their own line', () => {
  const opts = [
    { line: 'My daughter called a homeless lady homeless', move: 'tighter' },
    { line: 'We taught our kids not to stare at homeless people', move: 'plain' },
  ]
  assert.equal(touchOptionsOk(opts, 'hook', story).length, 2)
  assert.equal(touchOptionsOk(opts, 'setup', story).length, 2)
})

test('a tag or button still has to add something new', () => {
  const restated = { line: 'My daughter called the homeless lady homeless', move: 'x' }
  const fresh = { line: 'Now she introduces them by their LinkedIn headline', move: 'x' }
  assert.deepEqual(touchOptionsOk([restated, fresh], 'button', story), [fresh])
})
