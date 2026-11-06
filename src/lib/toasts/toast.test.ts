import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OCCASION, OCCASIONS, clock, fromPlaceholders, lengthWindow, toPlaceholders, toastSeconds, type ToastForm } from './shared'
import { checkCut, checkOneLine, checkToast, parseToast } from './toast.server'

const form: ToastForm = {
  occasion: 'best_man',
  relation: 'college roommate',
  pronouns: { friend: 'he', partner: 'she' },
  stories: ['In college {friend} color-coded his fridge.', 'He once spent 40 minutes parallel parking outside my place, then took the bus.', ''],
  true_thing: "He's the guy who shows up. Every time.",
  tone: 'warm_funny',
  length: 60,
  must_say: ['Go Bruins'],
  never_say: ['exes', 'drinking'],
}

const good = {
  lines: [
    { section: 'opener', text: "I'm {me}, {friend}'s best man.", source: 'shutap', pause: true },
    { section: 'story 1', text: 'In college he colour coded his fridge', source: 'story', ref: 1 },
    { section: 'story 1 · tag', text: 'The ketchup had an assigned seat.', source: 'shutap', laugh: true },
    { section: 'story 2', text: 'He once spent 40 minutes parallel parking outside my place, then took the bus.', source: 'story', ref: 2 },
    { section: 'the true thing', text: 'something else', source: 'true_thing' },
    { section: 'the toast', text: 'To {friend} and {partner}. Go Bruins.', source: 'shutap', glass: true },
  ],
  cut60: [],
  cards: [{ title: 'open', keys: ['best man'], land: "I'm {me}." }, { title: 'toast', keys: ['shows up'], land: 'To {friend} and {partner}. Go Bruins.' }],
  text_after: 'Meant every word.',
  flags: [],
}

test('names: swapped out in the browser and back, longest first, whole words only', () => {
  const names = { friend: 'Ann', partner: 'Anna', me: 'Sam' }
  assert.equal(toPlaceholders('Anna met Ann at Samantha’s; Sam drove.', names), '{partner} met {friend} at Samantha’s; {me} drove.')
  assert.equal(fromPlaceholders('{partner} met {friend}; {me} drove.', names), 'Anna met Ann; Sam drove.')
})

test('the clock: 140 words a minute plus pauses, laughs and the glass', () => {
  const words = Array(140).fill('word').join(' ')
  assert.equal(toastSeconds([{ text: words }]), 60)
  assert.equal(toastSeconds([{ text: words, laugh: true, glass: true }]), 65)
  assert.equal(clock(168), '2:48')
  assert.deepEqual(lengthWindow({ occasion: 'toastmasters', length: 360 }), [300, 420])
})

test('every occasion is fully specified', () => {
  for (const o of OCCASIONS) {
    const s = OCCASION[o]
    assert.ok(s.structure.length && s.lengths.includes(s.defaultLength) && s.stories >= 1, o)
  }
  assert.deepEqual(OCCASION.best_man.neverSay, ['exes', 'the honeymoon', 'the bachelor party', 'drinking'])
})

test('their words go back in exactly as typed, whatever the writer returned', () => {
  const t = parseToast(good, form)!
  assert.equal(t.lines[1]!.text, 'In college {friend} color-coded his fridge.')
  assert.equal(t.lines[4]!.text, "He's the guy who shows up. Every time.")
  // the 60-second cut is on demand: never written with the speech
  assert.equal(t.cut60.length, 0)
})

test('a story pasted as a Shutap line is still recognised as theirs', () => {
  const raw = { ...good, lines: good.lines.map((l, i) => (i === 3 ? { ...l, source: 'shutap', ref: undefined } : l)) }
  const t = parseToast(raw, form)!
  assert.equal(t.lines[3]!.source, 'story')
  assert.equal(t.lines[3]!.ref, 2)
})

test('a clean toast passes every fatal check', () => {
  const t = parseToast(good, form)!
  assert.deepEqual(checkToast(t, form).filter((c) => c.fatal), [])
})

test('invented numbers, never-say families, unknown names and missing must-says are rejected', () => {
  const bad = { ...good, lines: [...good.lines.slice(0, 5), { section: 'tag', text: 'At 3 a.m. after 12 beers he got drunk and called his ex. {grandma} cried.', source: 'shutap' }, { section: 'the toast', text: 'To {friend}.', source: 'shutap', glass: true }] }
  const rules = checkToast(parseToast(bad, form)!, form).filter((c) => c.fatal).map((c) => c.rule)
  assert.ok(rules.includes('invented number: 12'))
  assert.ok(rules.includes('never say: "drinking"'))
  assert.ok(rules.includes('never say: "exes"'))
  assert.ok(rules.includes('unknown name {grandma}'))
  assert.ok(rules.includes('must say missing: "Go Bruins"'))
  assert.ok(rules.includes("grandma's in the room") === false) // no profanity here
})

test('the speaker’s own numbers may come back in a tag; a dropped story is caught', () => {
  assert.equal(checkOneLine('Forty minutes. 40. Then the bus.', form), null)
  const missing = { ...good, lines: good.lines.filter((l) => l.ref !== 2) }
  assert.ok(checkToast(parseToast(missing, form)!, form).some((c) => c.fatal && c.rule === 'story 2 missing'))
})

test('a toast that runs long is rejected; "raise your glasses" is not a workplace problem', () => {
  const long = { ...good, lines: [...good.lines, { section: 'more', text: Array(200).fill('and').join(' '), source: 'shutap' }] }
  assert.ok(checkToast(parseToast(long, form)!, form).some((c) => c.fatal && c.rule.startsWith('runs long')))
  const office: ToastForm = { ...form, occasion: 'holiday_party', never_say: [], must_say: [] }
  assert.equal(checkOneLine('So please raise your glasses to the team.', office), null)
  assert.equal(checkOneLine('Even HR laughed.', office), 'workplace check')
})

test('the on-demand cut keeps the true thing and the must-says, and lands at a minute', () => {
  const full: ToastForm = { ...form, length: 180 }
  const t = parseToast(good, full)!
  assert.deepEqual(checkCut(t.lines, full).filter((c) => c.fatal), [])
  const dropped = t.lines.filter((l) => l.source !== 'true_thing')
  assert.ok(checkCut(dropped, full).some((c) => c.fatal && c.rule === 'the cut drops the true thing'))
  const long = [...t.lines, { section: 'more', text: Array(160).fill('and').join(' '), source: 'shutap' as const }]
  assert.ok(checkCut(long, full).some((c) => c.fatal && c.rule.startsWith('the cut runs')))
})
