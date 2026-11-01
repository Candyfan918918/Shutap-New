import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TASTE_BANK, judgeStandard, standardBlock, standardLines } from './taste-bank'
import { jobBlock } from './jobs'
import { _test as person } from './person.server'

test('the standard: six lines, six different situations, founder lines first, never the same twice in a row', () => {
  assert.ok(TASTE_BANK.length >= 80)
  let i = 0
  const rand = () => ((i += 7919) % 1000) / 1000
  const a = standardLines(6, rand)
  assert.equal(a.length, 6)
  assert.equal(new Set(a.map((t) => t.s)).size, 6)
  assert.ok(a.filter((t) => t.f).length >= 3, 'founder lines lead')
  const block = standardBlock(a)
  assert.match(block, /THE STANDARD/)
  assert.match(block, /Never reuse their words/)
  assert.match(judgeStandard(a.slice(0, 4)), /THE BAR/)
  assert.equal(standardBlock([]), '')
})

test('every line in the bank is short and has a situation', () => {
  for (const t of TASTE_BANK) {
    assert.ok(t.s.length > 10, t.l)
    assert.ok(t.l.split(' ').length <= 45, t.l)
  }
})

test('the job follows audience and length', () => {
  assert.match(jobBlock({ audience: 'live', length: '2m' }), /SPEECH OR A TOAST/)
  assert.match(jobBlock({ audience: 'live', length: '30s' }), /A SET/)
  assert.match(jobBlock({ audience: 'office', length: '30s' }), /SLIDE LINE/)
  assert.match(jobBlock({ audience: 'social', length: '15s' }), /A POST/)
  assert.match(jobBlock({ audience: 'social', length: '2m' }), /STORYTIME/)
})

test('this person: nothing on a first bit, kept lines and a steering note after a few', () => {
  assert.equal(person.personBlockFrom({ bits: [{ id: 'a', controls: null }], versions: [], keptVersionIds: new Set() }), '')
  const bits = [
    { id: 'a', controls: { heat: 4, voice: 'roast' } },
    { id: 'b', controls: { heat: 5, voice: 'roast' } },
    { id: 'c', controls: { heat: 4, voice: 'deadpan' } },
  ]
  const versions = [
    { id: 'v1', bit_id: 'a', kind: 'original', hook: 'He washes the forks.', button: 'Still dinner.', heat: 4 },
    { id: 'v2', bit_id: 'a', kind: 'hotter', hook: 'x', button: 'y', heat: 5 },
    { id: 'v3', bit_id: 'b', kind: 'hotter', hook: 'x', button: 'y', heat: 5 },
    { id: 'v4', bit_id: 'c', kind: 'hotter', hook: 'x', button: 'y', heat: 5 },
  ]
  const block = person.personBlockFrom({ bits, versions, keptVersionIds: new Set(['v1']) })
  assert.match(block, /THIS PERSON/)
  assert.match(block, /hook: He washes the forks\./)
  assert.match(block, /rewrote hotter 3 times/)
  assert.match(block, /wild 4\.3, roast/)
})
