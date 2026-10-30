// Bank v2 code checks: names, off-limits topics, templates.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bankLineFailure, nameIn } from './battle.functions'

const setup = 'My boss said "quick question" and then talked for 40 minutes on Friday.'

test('a name mid-sentence is caught; sentence starts, weekdays and the setup\'s own words are not', () => {
  assert.equal(nameIn('So I asked Dave for a quick answer.', setup), 'Dave')
  assert.equal(nameIn('It ran until Friday. Then Monday.', setup), null)
  assert.equal(nameIn('I said "Quick question" back.', setup), null)
})

test('off-limits topics and templates are cut', () => {
  assert.equal(bankLineFailure('He is already planning his own funeral.', setup), 'off-limits topic')
  assert.equal(bankLineFailure('Things I planned: lunch. Things I did: listen.', setup), 'template')
  assert.equal(bankLineFailure('Minute 38, he said "one last thing."', setup), null)
})
