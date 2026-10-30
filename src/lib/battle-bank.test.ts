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

import { isInternalRequest } from './battle.functions'

test('only shutap.com in a real browser counts', () => {
  const chrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
  assert.equal(isInternalRequest('https://shutap.com', chrome), false)
  assert.equal(isInternalRequest('https://www.shutap.com/', chrome), false)
  assert.equal(isInternalRequest('https://id-preview--621a43a7.lovable.app', chrome), true)
  assert.equal(isInternalRequest('http://localhost:5173', chrome), true)
  assert.equal(isInternalRequest('', chrome), true)
  assert.equal(isInternalRequest('https://shutap.com', 'Mozilla/5.0 HeadlessChrome/130.0'), true)
  assert.equal(isInternalRequest('https://shutap.com', 'Googlebot/2.1'), true)
})
