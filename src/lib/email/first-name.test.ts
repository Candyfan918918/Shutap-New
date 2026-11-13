// Every email greets by the real first name, cased properly, or by no name.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { firstNameFor, nameVars } from './first-name.ts'

const auto = { emotion: 'Quiet', nation: 'Welsh', creature: 'Bear' }

test('sign-in names', () => {
  assert.equal(firstNameFor({ metaName: 'Rosa Vale' }), 'Rosa')
  assert.equal(firstNameFor({ metaName: 'MARGOT ELLIS' }), 'Margot')
  assert.equal(firstNameFor({ metaName: 'DESMOND KAY' }), 'Desmond')
  assert.equal(firstNameFor({ metaName: 'tobias lund' }), 'Tobias')
  assert.equal(firstNameFor({ metaName: 'jean-luc picard' }), 'Jean-Luc')
  assert.equal(firstNameFor({ metaName: 'McKenzie Ray' }), 'McKenzie')
  assert.equal(firstNameFor({ metaName: 'Zoë Brandt' }), 'Zoë')
  assert.equal(firstNameFor({ metaName: '李小龙' }), '李小龙')
  assert.equal(firstNameFor({ metaName: 'jo bloggs' }), 'jo bloggs')
  assert.equal(firstNameFor({ metaName: 'Ivy K' }), 'Ivy')
})

test('business names are not first names', () => {
  assert.equal(firstNameFor({ metaName: 'ACME TELECOM LLC' }), null)
  assert.equal(firstNameFor({ metaName: 'Pies & Pints' }), null)
  assert.equal(firstNameFor({ alias: { display_name: 'Hello Shutap' } }), null)
})

test('typed profile first name wins; aliases only when set by the person', () => {
  assert.equal(firstNameFor({ profileFirstName: 'Ted', metaName: 'Edward Moss' }), 'Ted')
  assert.equal(firstNameFor({ metaName: 'Sam Ortiz', alias: { display_name: 'Curious Argentinian Hare', emotion: 'Curious', nation: 'Argentinian', creature: 'Hare' } }), 'Sam')
  assert.equal(firstNameFor({ alias: { display_name: 'Quiet Welsh Bear', ...auto } }), null)
  assert.equal(firstNameFor({ alias: { display_name: 'Shutap user' } }), null)
  assert.equal(firstNameFor({ alias: { display_name: 'Janedoe' }, email: 'jane.doe1@example.com' }), null)
  assert.equal(firstNameFor({ alias: { display_name: 'Mo Diaz' }, email: 'x9@gmail.com' }), 'Mo Diaz')
  assert.equal(firstNameFor({}), null)
})

test('greeting vars', () => {
  assert.equal(nameVars('Rosa').name_lead, 'Rosa, ')
  assert.equal(nameVars('<b>').first_name, '&lt;b&gt;')
  assert.equal(nameVars(null).name_comma, '')
})

test('no design still greets by alias', () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), 'designs')
  for (const f of ['welcome', 're-engagement', 'digest', 'popular-today', 'hall-updates', 'new-follower', 'spill-followup']) {
    const html = readFileSync(join(dir, `${f}.html`), 'utf8')
    assert.ok(!html.includes('first_alias'), `${f} still uses first_alias`)
  }
})
