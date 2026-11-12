import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkedSplit, foundIn, sentences, splitBySentence, storyChecks } from './split'

const story = 'My daughter always embarrasses me in public. One day we walk past a homeless lady. My daughter said: is she homeless? I told her to shut up. She said ok, ok I won’t say she is a homeless. So she said homeless twice.'

test('sentences keep their punctuation', () => {
  assert.deepEqual(sentences('Hi. Is it? Yes!'), ['Hi.', 'Is it?', 'Yes!'])
  assert.deepEqual(sentences('no period at the end'), ['no period at the end'])
})

test('six sentences: first three, the middle as tag 2, the last as button', () => {
  const s = splitBySentence(story)
  assert.equal(s.hook, 'My daughter always embarrasses me in public.')
  assert.equal(s.setup, 'One day we walk past a homeless lady.')
  assert.equal(s.tags[0], 'My daughter said: is she homeless?')
  assert.equal(s.tags[1], 'I told her to shut up. She said ok, ok I won’t say she is a homeless.')
  assert.equal(s.button, 'So she said homeless twice.')
})

test('a short story leaves the lines it did not reach empty, button last', () => {
  const s = splitBySentence('My boss called. He said hi. Then he hung up.')
  assert.deepEqual(s, { hook: 'My boss called.', setup: 'He said hi.', tags: ['', ''], button: 'Then he hung up.' })
  assert.deepEqual(splitBySentence('Just one thing'), { hook: 'Just one thing', setup: '', tags: ['', ''], button: '' })
})

test('every line must be found in the story, word for word', () => {
  assert.equal(foundIn('One day we walk past a homeless lady', story), true)
  assert.equal(foundIn('One day we walked past a homeless lady.', story), false)
  assert.equal(foundIn("I won't say she is a homeless.", story), true) // quote style ignored
})

test('a model line with a new word is thrown out; too much lost falls back to sentences', () => {
  const ok = checkedSplit({ hook: 'My daughter always embarrasses me in public.', setup: 'One day we walk past a homeless lady.', tag1: 'My daughter said: is she homeless?', tag2: 'I told her to shut up. She said ok, ok I won’t say she is a homeless.', button: 'So she said homeless twice.' }, story)
  assert.equal(ok.source, 'model')
  const rewritten = checkedSplit({ hook: 'My kid roasts me in public.', setup: 'x', tag1: 'y', tag2: 'z', button: 'Homeless. Homeless.' }, story)
  assert.equal(rewritten.source, 'sentences')
  const dup = checkedSplit({ hook: 'My daughter always embarrasses me in public.', setup: 'My daughter always embarrasses me in public.' }, story)
  assert.equal(dup.source, 'sentences')
  assert.equal(checkedSplit(null, story).source, 'sentences')
})

test('checks fill in as the story grows', () => {
  assert.equal(storyChecks('').filter((c) => c.ok).length, 0)
  assert.equal(storyChecks(story).every((c) => c.ok), true)
})
