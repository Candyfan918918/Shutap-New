import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSpec, castFor, cutWords, roleFor, sceneFor, seedFrom, splitButton, splitHook } from './spec'

test('seed is stable and in range', () => {
  const a = seedFrom('abc-123')
  assert.equal(a, seedFrom('abc-123'))
  assert.ok(a >= 0 && a < 1)
  assert.notEqual(a, seedFrom('abc-124'))
})

test('hook splits at the most even word boundary', () => {
  assert.deepEqual(splitHook('He washes the forks and leaves the pan.'), ['He washes the forks', 'and leaves the pan.'])
  assert.deepEqual(splitHook('My pan'), ['My pan', ''])
})

test('tags are cut to ten words', () => {
  assert.equal(cutWords('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone twentytwo twentythree', 22), "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone twentytwo…")
  assert.equal(cutWords("short line", 22), 'short line')
})

test('button splits lead and accent at the quote', () => {
  const b = splitButton('So I left a note on the pan: "Still dinner."')
  assert.equal(b.lead, 'So I left a note on the pan:')
  assert.equal(b.accent, '"Still dinner."')
  const c = splitButton('Rent.')
  assert.equal(c.lead, '')
  assert.equal(c.accent, 'Rent.')
})

test('scene and role come from the story', () => {
  const story = 'when my husband does dishes, he only cleans the dishes, not the pot, not the pan'
  assert.equal(sceneFor(story), 'kitchen')
  assert.equal(roleFor(story), 'partner')
  assert.equal(sceneFor('my boss scheduled a quick sync'), 'office')
  assert.equal(roleFor('a stranger on the train'), 'stranger')
  assert.equal(sceneFor('nothing in particular'), 'generic')
})

test('spec carries two tags, cues in order, a palette', () => {
  const s = buildSpec({ id: 'v1', hook: 'He washes the forks and leaves the pan.', tags: ['a b', 'c d', 'e f'], button: 'Still dinner.' }, 'my husband and the pan')
  assert.equal(s.tags.length, 2)
  assert.ok(s.cues.pill < s.cues.hook && s.cues.hook < s.cues.tag1 && s.cues.tag1 < s.cues.tag2 && s.cues.tag2 < s.cues.button && s.cues.button < s.cues.tagline)
  assert.ok(s.cues.tagline < 5)
  assert.ok(s.palette.stage.length === 3)
})

test('the cast follows the story: who, in order, drawn as the words say', () => {
  const bus = castFor('my daughter called a homeless lady "homeless" in front of her at the bus stop')
  assert.deepEqual(bus, [
    { role: 'kid', gender: 'f', kid: true },
    { role: 'stranger', gender: 'f', kid: false },
  ])
  assert.equal(sceneFor('my daughter called a homeless lady "homeless" at the bus stop'), 'street')
  assert.equal(sceneFor('the daycare teacher said my son bit a kid'), 'school')
  assert.deepEqual(castFor('the daycare teacher said my son bit a kid'), [
    { role: 'stranger', gender: 'n', kid: false },
    { role: 'kid', gender: 'm', kid: true },
  ])
  // a gendered word for the same role refines it, and a role repeats as one person
  assert.deepEqual(castFor('my kid, my daughter, asked my daughter\'s teacher'), [
    { role: 'kid', gender: 'f', kid: true },
    { role: 'stranger', gender: 'n', kid: false },
  ])
  assert.equal(castFor('nothing in particular').length, 0)
  // 'called' is a verb, not a phone
  assert.equal(sceneFor('she called me at the restaurant'), 'restaurant')
})
