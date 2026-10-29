// The bit-1.3 technique deal and craft checks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  TECHNIQUES,
  costumeToken,
  copiesExample,
  dealTechniques,
  formatTechniques,
  isLabelLine,
  techniqueCraftFailure,
} from './techniques'

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

test('ids are unique and every technique has an op and an example', () => {
  const ids = new Set(TECHNIQUES.map((t) => t.id))
  assert.equal(ids.size, TECHNIQUES.length)
  for (const t of TECHNIQUES) assert.ok(t.op.length > 20 && t.example.length > 20, t.id)
})

test('a deal gives four primaries from four families, backups from others, all any-fit', () => {
  for (let seed = 1; seed < 300; seed++) {
    const dealt = dealTechniques(4, seeded(seed))
    assert.equal(dealt.length, 4)
    const fams = dealt.flatMap((d) => [d.primary.family, d.backup.family])
    assert.equal(new Set(fams).size, 8, `seed ${seed}: ${fams.join(',')}`)
    for (const d of dealt) assert.equal(d.backup.fit, 'any')
  }
})

test('deals vary', () => {
  const firsts = new Set(Array.from({ length: 200 }, () => dealTechniques(4)[0]!.primary.id))
  assert.ok(firsts.size >= 10)
})

test('the prompt block names each bit and its backup', () => {
  const block = formatTechniques(dealTechniques(4, seeded(7)))
  for (const n of [1, 2, 3, 4]) assert.match(block, new RegExp(`BIT ${n} — `))
  assert.equal(block.match(/backup if it cannot fit/g)?.length, 4)
})

test('label lines are caught; quantities and acts are not', () => {
  assert.ok(isLabelLine('He is a philanthropist of the silverware drawer.'))
  assert.ok(isLabelLine("I'm just a defendant wearing my own indictment."))
  assert.ok(isLabelLine("He's not a dishwasher; he's an auditor."))
  assert.ok(!isLabelLine('It took a week.'))
  assert.ok(!isLabelLine("That's a lot of forks."))
  assert.ok(!isLabelLine('So I taped a note to the pan: "Soaking since Tuesday."'))
})

test('costume vocabulary counts only when the story never used it', () => {
  assert.equal(costumeToken('He conducted an audit of the plates.', 'my husband washes dishes'), 'audit~')
  assert.equal(costumeToken('The auditor came back.', 'our office got audited by an auditor'), null)
  assert.equal(costumeToken('The pan has been soaking since Tuesday.', 'dishes'), null)
})

test('copying a shape example verbatim is caught', () => {
  assert.ok(copiesExample('I labeled the three leftover containers in the fridge Monday, Tuesday and Evidence.'))
  assert.ok(!copiesExample('I labeled the three pans Monday, Tuesday and Next Year.'))
})

test('the baseline bit fails; a bit made of acts passes', () => {
  const story = 'when my husband does dishes, he only cleans the dishes, not the pot, not the pan'
  const baseline = [
    'He is a philanthropist of the silverware drawer.',
    "He's donating his time to the cups while the stove remains a grease-field.",
    'He is an auditor performing a limited scope review of the dinner plate.',
  ]
  assert.match(techniqueCraftFailure(baseline, story) ?? '', /labels, not acts/)
  const acts = [
    'He washed eleven forks and one lid. The lid was for a pot he did not wash.',
    'So I left the pan on his pillow with a note: "Still dinner."',
    'The pan has been soaking since Tuesday. It has its own bathwater now.',
  ]
  assert.equal(techniqueCraftFailure(acts, story), null)
})
