// The house signal: founder ratings → deal weights and writer examples.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { examplesFrom, weightsFrom } from './house.server'
import { dealTechniques, TECHNIQUES } from './techniques'

const bit = { hook: 'I followed his rule exactly', setup: 'He counts "reminding me" as a chore.', tags: ['So I reminded the trash to go out.'], button: 'He got the smell. I got the points.', why: '' }

test('no ratings, no change', () => {
  assert.deepEqual(weightsFrom([]), {})
  assert.equal(examplesFrom([]), '')
})

test('kept techniques go up, cut ones go down, within 0.25x–2x', () => {
  const w = weightsFrom([
    ...Array(6).fill({ technique_id: 'a', verdict: 'keep' }),
    ...Array(6).fill({ technique_id: 'b', verdict: 'cut' }),
    { technique_id: 'c', verdict: null },
  ])
  assert.ok(w.a! > 1.5 && w.a! <= 2)
  assert.ok(w.b! >= 0.25 && w.b! < 0.5)
  assert.equal(w.c, undefined)
})

test('a rewrite counts as half a keep', () => {
  const w = weightsFrom([{ technique_id: 'r', verdict: 'rewrite' }, { technique_id: 'r', verdict: 'rewrite' }])
  assert.equal(w.r, 1)
})

test('examples: rewrites first, cuts never, best line shown', () => {
  const out = examplesFrom([
    { story: 'kept story', technique_id: 'a', bit, verdict: 'keep', rewrite: null, best_line: 'He got the smell. I got the points.', rated_at: 'x' },
    { story: 'cut story', technique_id: 'b', bit, verdict: 'cut', rewrite: null, best_line: null, rated_at: 'x' },
    { story: 'rewritten story', technique_id: 'c', bit, verdict: 'rewrite', rewrite: 'my own line one\nmy own line two', best_line: null, rated_at: 'x' },
  ])
  assert.ok(out.indexOf('rewritten story') < out.indexOf('kept story'))
  assert.ok(!out.includes('cut story'))
  assert.ok(out.includes('my own line two'))
  assert.ok(out.includes('the line she marked funniest'))
})

test('a learned weight of zero-ish still deals; a heavy one is dealt more', () => {
  const heavy = TECHNIQUES[0]!.id
  let hits = 0
  let s = 7
  const rand = () => ((s = (s * 1664525 + 1013904223) % 4294967296), s / 4294967296)
  for (let i = 0; i < 400; i++) if (dealTechniques(4, rand, [], { [heavy]: 2 }).some((d) => d.primary.id === heavy)) hits++
  let base = 0
  s = 7
  for (let i = 0; i < 400; i++) if (dealTechniques(4, rand, []).some((d) => d.primary.id === heavy)) base++
  assert.ok(hits > base, `${hits} vs ${base}`)
})
