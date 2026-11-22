import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coverCrop, fitText, lineAt, shotLengths, shotSeconds, wrapLines } from './layout'

const perChar = (px: number) => (s: string) => s.length * px

test('15 and 30 seconds share the length equally; 7 seconds is 2, 3, 2', () => {
  assert.deepEqual(shotLengths(15), [5, 5, 5])
  assert.deepEqual(shotLengths(30), [10, 10, 10])
  assert.deepEqual(shotLengths(7), [2, 3, 2])
  assert.equal(shotLengths(7).reduce((a, b) => a + b, 0), 7)
  assert.equal(shotSeconds(7, 1), 3)
  assert.equal(shotSeconds(7, 2), 2)
  assert.equal(shotSeconds(15, 2), 5)
  assert.deepEqual(shotLengths(3), [2, 2, 2]) // never under two seconds
})
test('the hook opens the first clip, then each clip carries its own line', () => {
  const texts = { hook: 'HOOK', shots: ['one', 'two', 'three'] }
  assert.equal(lineAt(0, 0, 5, texts), 'HOOK')
  assert.equal(lineAt(0, 2.1, 5, texts), 'HOOK')
  assert.equal(lineAt(0, 2.3, 5, texts), 'one')
  assert.equal(lineAt(0, 1.2, 2, texts), 'one') // a two-second clip: the hook gets half
  assert.equal(lineAt(1, 0, 5, texts), 'two')
  assert.equal(lineAt(2, 4, 5, texts), 'three')
})
test('lines wrap at the width; a long word keeps its own row', () => {
  assert.deepEqual(wrapLines('one small drip please', 100, perChar(10)), ['one small', 'drip', 'please'])
  assert.deepEqual(wrapLines('supercalifragilistic day', 100, perChar(10)), ['supercalifragilistic', 'day'])
  assert.deepEqual(wrapLines('   ', 100, perChar(10)), [])
})
test('text shrinks until it fits the rows allowed', () => {
  const at = (size: number) => perChar(size / 2)
  assert.equal(fitText('one small drip', 300, 3, [64, 52, 40], at).size, 64)
  assert.equal(fitText('twelve thirty pm still on the very same sip of coffee', 300, 3, [64, 52, 40], at).size, 40)
})
test('a clip is cropped to fill the tall frame', () => {
  assert.deepEqual(coverCrop(1920, 1080), { sx: (1920 - 607.5) / 2, sy: 0, sw: 607.5, sh: 1080 })
  assert.deepEqual(coverCrop(720, 1280), { sx: 0, sy: 0, sw: 720, sh: 1280 })
  assert.deepEqual(coverCrop(720, 1600), { sx: 0, sy: 160, sw: 720, sh: 1280 })
})
