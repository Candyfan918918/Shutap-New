import { test } from 'node:test'
import assert from 'node:assert/strict'
import { groundedChips } from './known'

const src = 'Japanese restaurant. The bento boxes are great and the matcha latte is the best in Palo Alto. Chicken katsu was crispy. Long line on weekends.'

test('a suggestion must be in the listing or its reviews', () => {
  assert.deepEqual(groundedChips(['bento box', 'Matcha latte', 'chicken katsu', 'weekend line', 'sushi rolls', 'free wifi'], src), ['bento box', 'Matcha latte', 'chicken katsu', 'weekend line'])
})
test('no prices, no long phrases, no repeats, nothing that is only praise', () => {
  assert.deepEqual(groundedChips(['$12 bento', 'the best matcha latte in all of Palo Alto', 'matcha latte', 'Matcha Latte.', 'great', 42, null], src), ['matcha latte'])
  assert.deepEqual(groundedChips('bento', src), [])
})
