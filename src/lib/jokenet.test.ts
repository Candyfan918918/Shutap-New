import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseSheet, toCsv } from './jokenet-sheet'
import { pickStandard, type JokenetMatch } from './bits/jokenet.server'
import { EVAL_SET } from './jokes/eval-set'

test('paste from Excel: header row, tabs, quoted line breaks, none cells', () => {
  const text = 'id\tsituation\tjoke\trating\tmove\n12\tBoss booked a meeting\t"Line one\nline two"\t5\tnone\n\tNo joke here\t\t3\n'
  const r = parseSheet(text)
  assert.equal(r.rows.length, 1)
  assert.equal(r.dropped, 1)
  assert.deepEqual(r.rows[0], { id: 12, situation: 'Boss booked a meeting', joke: 'Line one\nline two', rating: 5 })
})

test('no header: situation, joke, rating; CSV round trip', () => {
  const r = parseSheet('My sister,"She said ""fine.""",4\n')
  assert.equal(r.rows[0]!.joke, 'She said "fine."')
  assert.equal(r.rows[0]!.rating, 4)
  const back = parseSheet(toCsv([{ id: 3, situation: 'a, b', joke: 'c "d"', rating: 2, sent: false }]))
  assert.equal(back.rows[0]!.situation, 'a, b')
  assert.equal(back.rows[0]!.joke, 'c "d"')
  assert.equal(back.rows[0]!.sent, false)
})

const m = (id: number, situation: string, rating: number, similarity: number, extra: Partial<JokenetMatch> = {}): JokenetMatch => ({ id, situation, joke: `joke ${id}`, rating, move: null, mechanism: null, founder: false, source: 'shutap', similarity, ...extra })

test('the writer’s standard: nearest first, one per situation, same story / eval / style catalog left out', () => {
  const matches = [
    m(1, 'the very same story', 5, 0.95),
    m(2, EVAL_SET[0]!.situation, 5, 0.8),
    m(3, 'near A', 4, 0.8),
    m(4, 'near A', 5, 0.79),
    m(5, 'near B', 4, 0.7, { founder: true }),
    m(6, 'catalog', 5, 0.69, { source: 'dataset' }),
    m(7, 'near C', 4, 0.6),
    m(8, 'near D', 4, 0.55),
    m(9, 'far E', 5, 0.3),
    m(10, 'far F', 5, 0.2),
  ]
  const out = pickStandard(matches, 6, () => 0)
  const s = out.map((t) => t.s)
  assert.equal(out.length, 6)
  assert.equal(new Set(s).size, 6)
  for (const bad of ['the very same story', EVAL_SET[0]!.situation, 'catalog']) assert.ok(!s.includes(bad), bad)
  assert.equal(out.find((t) => t.s === 'near A')!.l, 'joke 4', 'the 5 wins on the same situation')
  assert.ok(s.includes('far E') && s.includes('far F'), 'two slots for range')
  assert.ok(out.find((t) => t.s === 'near B')!.f)
})
