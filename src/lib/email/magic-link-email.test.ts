// The sign-in email must carry the code and never the one-time link: the two
// share a token, so an opened link used the code up ("expired or invalid").
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

test('sign-in email shows the code and no sign-in link', () => {
  const html = readFileSync(join(here, 'designs/magic-link.html'), 'utf8')
  assert.ok(html.includes('{{code}}'), 'design shows the code')
  assert.ok(!html.includes('{{magic_link}}'), 'design must not carry the one-time link')
  assert.ok(!/\{\{\{?\s*(magic_link|action_link|confirmationUrl)/.test(html), 'no token-bearing link placeholder')
})

test('sign-in email text version carries no link', () => {
  const src = readFileSync(join(here, 'templates.ts'), 'utf8')
  const block = src.slice(src.indexOf('magic_link: {'), src.indexOf('new_reply: {'))
  assert.ok(block.length > 0)
  assert.ok(!block.includes('v.magic_link'), 'text body must not include the one-time link')
  assert.ok(block.includes('v.code'), 'text body includes the code')
})

test('server never mails the action link', () => {
  const src = readFileSync(join(here, '../magic-link.functions.ts'), 'utf8')
  assert.ok(!/magic_link:\s*link\.properties\.action_link/.test(src))
})
