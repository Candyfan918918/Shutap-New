import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkLine, checkSet, checkSkit, parseSkit, parseSkits, repeatsOffer, skitLines, textWordCap, type Skit, type SkitContext } from './skit'

const CTX: SkitContext = { length: 15, camera: 'team', hasDay: true, ownWords: '' }
const skit = (over: Partial<Skit> = {}): Skit => ({
  source: 'day', title: 'The 4-hour latte', pitch: 'One small drip. Four hours.', hook: 'POV: he ordered one small drip at 8am',
  shots: [
    { text: '8:00am: “just one small drip please”', action: 'A teammate sits down with a laptop and one small coffee.' },
    { text: '12:30pm: still on the same sip', action: 'You wipe the table around him. Same cup.' },
    { text: '3:00pm: new Wi-Fi password just dropped', action: 'You slide a little sign onto the table and walk away.' },
  ],
  word: 'new password', caption: 'He’s basically paying rent in drip coffee.', ...over,
})

test('a full skit parses; a skit missing a shot does not', () => {
  assert.deepEqual(parseSkit(JSON.parse(JSON.stringify(skit()))), skit())
  assert.equal(parseSkit({ ...skit(), shots: skit().shots.slice(0, 2) }), null)
  assert.equal(parseSkit({ ...skit(), source: 'news' }), null)
  assert.equal(parseSkit({ ...skit(), hook: '  ' }), null)
  assert.equal(parseSkit(null), null)
})
test('the code word loses its quotes and full stop', () => {
  assert.equal(parseSkit({ ...skit(), word: '“new password.”' })!.word, 'new password')
})
test('exactly three skits, as a list or under "skits"', () => {
  const three = [skit(), skit({ source: 'today', title: 'Pie panic' }), skit({ source: 'shop', title: 'The shop dog' })]
  assert.equal(parseSkits(three)!.length, 3)
  assert.equal(parseSkits({ skits: three })!.length, 3)
  assert.equal(parseSkits(three.slice(0, 2)), null)
  assert.equal(parseSkits('nope'), null)
})
test('a clean skit passes', () => {
  assert.deepEqual(checkSkit(skit(), CTX), [])
})
test('on-screen text is held to the video length', () => {
  assert.equal(textWordCap(7), 7)
  const long = skit({ shots: [{ ...skit().shots[0]!, text: 'one two three four five six seven eight' }, skit().shots[1]!, skit().shots[2]!] })
  assert.equal(checkSkit(long, { ...CTX, length: 7 }).some((c) => c.where === 'shot 1 text'), true)
  assert.deepEqual(checkSkit(long, CTX), [])
})
test('no emojis or hashtags on screen', () => {
  assert.equal(checkSkit(skit({ hook: 'POV: one small drip ☕' }), CTX).length, 1)
  assert.equal(checkSkit(skit({ hook: 'POV: one small drip #coffee' }), CTX).length, 1)
})
test('a price or giveaway only if the owner gave it', () => {
  const s = skit({ caption: 'Come in for 10% off any pastry.' })
  assert.equal(checkSkit(s, CTX).some((c) => /price/.test(c.rule)), true)
  assert.deepEqual(checkSkit(s, { ...CTX, ownWords: '10% off any pastry' }), [])
  assert.equal(checkSkit(skit({ pitch: 'A free cookie for everyone.' }), CTX).length, 1)
})
test('no health or guarantee claims, and never at a person', () => {
  assert.equal(checkSkit(skit({ pitch: 'Our tea cures a cold, guaranteed.' }), CTX).some((c) => /claims/.test(c.rule)), true)
  assert.equal(checkSkit(skit({ hook: 'POV: the stupid customer is back' }), CTX).some((c) => /never at a person/.test(c.rule)), true)
})
test('"No faces" keeps faces out of every shot; "Me" keeps other people out', () => {
  const face = skit({ shots: [{ text: 'a', action: 'You smile at the camera.' }, skit().shots[1]!, skit().shots[2]!] })
  assert.equal(checkSkit(face, { ...CTX, camera: 'faceless' }).some((c) => /no faces/.test(c.rule)), true)
  assert.equal(checkSkit(skit(), { ...CTX, camera: 'me' }).some((c) => /films alone/.test(c.rule)), true)
  const solo = skit({ shots: skit().shots.map((s) => ({ ...s, action: 'You set one small cup on the table.' })) })
  assert.deepEqual(checkSkit(solo, { ...CTX, camera: 'me' }), [])
})
test('the code word is one to three words; the caption stays short', () => {
  assert.equal(checkSkit(skit({ word: 'the brand new wifi password' }), CTX).length, 1)
  assert.equal(checkSkit(skit({ caption: 'x'.repeat(101) }), CTX).length, 1)
})
test('no "from your day" skit without a day story', () => {
  assert.equal(checkSkit(skit(), { ...CTX, hasDay: false }).some((c) => c.where === 'source'), true)
})
test('the set: one from each place, three different skits', () => {
  const good = [skit(), skit({ source: 'today', title: 'Pie panic' }), skit({ source: 'shop', title: 'The shop dog' })]
  assert.deepEqual(checkSet(good, CTX), [])
  assert.equal(checkSet([skit(), skit({ title: 'Again' }), skit({ source: 'shop', title: 'Dog' })], CTX).length >= 1, true)
  assert.equal(checkSet([good[1]!, good[2]!, skit({ source: 'shop', title: 'Third' })], { ...CTX, hasDay: false }).length, 0)
  assert.equal(checkSet([good[0]!, good[1]!, skit({ source: 'shop', title: 'Pie panic' })], CTX).some((c) => /different/.test(c.rule)), true)
})
test('the lines to approve: four without a code word, five with one', () => {
  assert.deepEqual(skitLines(skit(), 'none', '').map((l) => l.key), ['hook', 'shot1', 'shot2', 'shot3'])
  const five = skitLines(skit(), 'freebie', 'a free cookie')
  assert.equal(five.length, 5)
  assert.equal(five[4]!.text, 'Say “new password” when you come in for a free cookie.')
})
test('an edited line is checked like the original', () => {
  assert.equal(checkLine('hook', 'POV: one small drip', CTX), null)
  assert.equal(checkLine('hook', '   ', CTX), 'a line cannot be empty')
  assert.match(checkLine('shot1', 'one two three four five six seven eight', { ...CTX, length: 7 })!, /at most 7 words/)
  assert.match(checkLine('shot2', 'guaranteed to cure it', CTX)!, /claims/)
})
test('the code word is never the offer said back', () => {
  assert.equal(repeatsOffer('free cookie', 'a free cookie'), true)
  assert.equal(repeatsOffer('cookie time', 'a free cookie'), true)
  assert.equal(repeatsOffer('ten percent off', ''), true)
  assert.equal(repeatsOffer('new password', 'a free cookie'), false)
  assert.equal(repeatsOffer('last pie', '10% off any pastry'), false)
  const ctx = { ...CTX, ownWords: 'a free cookie', offer: 'a free cookie' }
  assert.equal(checkSkit(skit({ word: 'free cookie' }), ctx).some((c) => /inside joke/.test(c.rule)), true)
  assert.deepEqual(checkSkit(skit(), ctx), [])
})
