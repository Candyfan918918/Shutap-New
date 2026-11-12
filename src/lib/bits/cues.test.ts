import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cuesForLines, isPauseCue } from './cues'
import type { SketchElement } from './shared'

const lines = [
  'My boss booked a "quick sync" for 4:55 on a Friday.',
  'Nothing quick has ever happened at 4:55 on a Friday.',
  'He opened with, "This won\'t take long." Which is what the dentist says too.',
  'Then, "Let\'s circle back Monday." Sir, we were already in the circle.',
  "I'm not syncing anymore. I'm sinking.",
]

const sketch: SketchElement[] = [
  { type: 'scene_heading', text: 'INT. OFFICE - DAY' },
  { type: 'character', text: 'ME' },
  { type: 'parenthetical', text: '(flat, to camera)' },
  { type: 'dialogue', text: 'My boss booked a "quick sync" for 4:55 on a Friday. Nothing quick has ever happened at 4:55 on a Friday.' },
  { type: 'character', text: 'MY BOSS' },
  { type: 'parenthetical', text: '(cheerful)' },
  { type: 'dialogue', text: 'This won\'t take long.' },
  { type: 'character', text: 'ME' },
  { type: 'parenthetical', text: 'his voice' },
  { type: 'dialogue', text: 'He opened with, "This won\'t take long." Which is what the dentist says too.' },
  { type: 'character', text: 'ME' },
  { type: 'parenthetical', text: '(beat)' },
  { type: 'dialogue', text: 'Then, "Let\'s circle back Monday." Sir, we were already in the circle.' },
  { type: 'character', text: 'ME' },
  { type: 'parenthetical', text: '(slower)' },
  { type: 'dialogue', text: "I'm not syncing anymore. I'm sinking." },
  { type: 'transition', text: 'CUT TO BLACK.' },
]

test('sketch parentheticals land on the bit line ME says next', () => {
  const c = cuesForLines(lines, sketch)
  assert.deepEqual(c[0], [{ text: '(flat, to camera)', voice: false, hold: false }])
  assert.deepEqual(c[1], [])
  assert.deepEqual(c[2], [{ text: '(his voice)', voice: true, hold: false }])
  assert.deepEqual(c[3], [{ text: '(beat)', voice: false, hold: true }])
  assert.deepEqual(c[4], [{ text: '(slower)', voice: false, hold: false }])
})

test('another speaker’s parenthetical never reaches the teleprompter', () => {
  const c = cuesForLines(lines, sketch)
  assert.ok(c.flat().every((x) => x.text !== '(cheerful)'))
})

test('no sketch, or an edited line the sketch never said: no cue, no crash', () => {
  assert.deepEqual(cuesForLines(lines, null), [[], [], [], [], []])
  const edited = [...lines]
  edited[3] = 'Totally different words now.'
  const c = cuesForLines(edited, sketch)
  assert.deepEqual(c[3], [])
  assert.deepEqual(c[4], [{ text: '(slower)', voice: false, hold: false }])
})

test('pause words', () => {
  for (const t of ['(beat)', '(pause for the laugh)', '(hold it)', '(let it land)']) assert.ok(isPauseCue(t), t)
  for (const t of ['(slower)', '(deadpan)', '(his voice)']) assert.ok(!isPauseCue(t), t)
})
