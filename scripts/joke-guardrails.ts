// The guardrail bench: every card the dispatches name as a failure must be
// rejected, every card they name as approved must survive, and the frozen
// regression spill must fire nothing. Checked against the guardrail code
// itself — no model, no database, no key.
//
//   bun run scripts/joke-guardrails.ts
//
// This is the half of the v2.1 verification that is deterministic, and it is
// the regression cover for the two rules that were narrowed so the approved
// sets could get through: CLINICAL is read outside quoted spans, and
// Guardrail D's substring half is gated on coverage.
//
// One class of approved card does NOT survive, by design: a line the spec
// quotes in the writer's brief is an exemplar, and Guardrail D rejects a
// candidate that reproduces one. Those are asserted as blocked, in their own
// section, so the trade is visible rather than buried.
//
// The other half — that the model writes a good card — needs LOVABLE_API_KEY
// and scripts/joke-eval.ts.
import {
  spillFlags,
  guardrailFailure,
  hardRuleFailure,
  outsideQuotes,
} from '@/lib/jokes/pipeline.server'
import { promptExemplars } from '@/lib/jokes/prompts.server'
import { accusationVerb, SEED_HALL_OF_FAME } from '@/lib/jokes/voices.server'
import type { SlotKey } from '@/lib/jokes/deck'

const HOF = SEED_HALL_OF_FAME.map((h, i) => ({ id: `seed:${i}`, text: h.joke_text }))
const EXEMPLARS = [...HOF, ...promptExemplars()]

let pass = 0
let fail = 0
const failures: string[] = []

function check(label: string, got: string, want: string) {
  const ok = got === want
  if (ok) pass++
  else { fail++; failures.push(`${label}\n      want ${want}\n      got  ${got}`) }
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `  [got ${got}]`}`)
}

function verdict(line: string, slot: SlotKey, situation: string, seriousFact: string | null): string {
  const flags = spillFlags(situation, seriousFact, EXEMPLARS)
  const g = guardrailFailure(line, slot, flags)
  if (g) return `guardrail:${g.rule}(${g.detail}${g.source ? ',' + g.source : ''})`
  const h = hardRuleFailure(line, situation, slot)
  return h ? `hardrule:${h}` : 'pass'
}

/** The rule alone, for the copy checks — the exemplar id is not stable. */
function rule(line: string, slot: SlotKey, situation: string, seriousFact: string | null): string {
  const v = verdict(line, slot, situation, seriousFact)
  return v.startsWith('guardrail:') ? v.slice('guardrail:'.length).replace(/\(.*/, '') : v
}

/* ── spill 4 · "My mother-in-law said I gave her cancer" ───────────────── */
const CANCER = 'My mother-in-law said I gave her cancer'
console.log(`\n[4] ${CANCER}  (serious_fact "cancer")`)
check('live roast "…her throne, you, the footstool." is rejected',
  verdict('the hospital bed just became her throne, you, the footstool.', 'the_roast', CANCER, 'cancer'),
  'guardrail:user_predicate(you, the footstool)')
check('live take "cancer was her invoice…" is rejected',
  verdict('cancer was her invoice. a payment plan, not a get well soon card.', 'the_take', CANCER, 'cancer'),
  'guardrail:serious_fact(cancer,static)')
check('live clapback "…parking pass for the oncology wing?" is rejected',
  verdict('"my presence, her cancer. where is my parking pass for the oncology wing?"', 'the_clapback', CANCER, 'cancer'),
  'guardrail:serious_fact(cancer,static)')
check('approved take (the diagnosis came from a doctor / second opinion since the wedding) survives',
  verdict("the diagnosis came from a doctor. she's been running a second opinion on you since the wedding.", 'the_take', CANCER, 'cancer'),
  'pass')
check('the illness inside a quote of what she said is allowed',
  verdict('"you gave me cancer," she said, and then she asked what was for dinner.', 'the_roast', CANCER, 'cancer'),
  'pass')
check('a fresh card carrying "gave" survives (master check: at least one card says gave)',
  verdict('she said gave, so somewhere there is a receipt with your name in the from field.', 'the_roast', CANCER, 'cancer'),
  'pass')

/* ── spill 5 · autoimmune ─────────────────────────────────────────────── */
const AUTO = 'My mother-in-law said I gave her an autoimmune disease'
console.log(`\n[5] ${AUTO}  (serious_fact "autoimmune disease")`)
check('live roast "the disease became a transferable asset…" is rejected',
  verdict('the disease became a transferable asset in her description.', 'the_roast', AUTO, 'autoimmune disease'),
  'guardrail:serious_fact(disease,static)')
check('"autoimmune" outside quotes is rejected',
  verdict('she has been drafting the autoimmune paperwork since the rehearsal dinner.', 'the_roast', AUTO, 'autoimmune disease'),
  'guardrail:serious_fact(autoimmune,static)')
check('approved take (…not even the cells) survives',
  verdict('her body turned on her. she turned on you. nobody in that house takes the blame, not even the cells.', 'the_take', AUTO, 'autoimmune disease'),
  'pass')
check('approved clapback (mechanism, unnamed, against the accuser) survives',
  verdict('"you must be feeling better now cuz you ain\'t got nothing healthy in you to attack."', 'the_clapback', AUTO, 'autoimmune disease'),
  'pass')
check('approved roast (her own body filed a complaint / she forwarded it) survives',
  verdict('her own body filed a complaint against her. she forwarded it to you.', 'the_roast', AUTO, 'autoimmune disease'),
  'pass')

/* ── spill 3 · self-critical ──────────────────────────────────────────── */
const USELESS = "I feel useless that I'm in my 30s and still need my parents' financial support"
console.log(`\n[3] ${USELESS}  (self-critical, serious_fact null)`)
check('self_critical flag is set', String(spillFlags(USELESS, null, EXEMPLARS).self_critical), 'true')
check('live roast "you, a 30-year-old walking, talking trust fund" is rejected',
  verdict('you, a 30-year-old walking, talking trust fund.', 'the_roast', USELESS, null),
  'guardrail:user_predicate(you, a 30)')
check('"you\'re a permanent atm in your childhood bedroom." is rejected',
  verdict("you're a permanent atm in your childhood bedroom.", 'the_roast', USELESS, null),
  "guardrail:user_predicate(you're a permanent)")
check('"you, the hero" is rejected too — no allowlist on Guardrail A',
  verdict('you, the hero of every sunday dinner, still take the transfer.', 'the_roast', USELESS, null),
  'guardrail:user_predicate(you, the hero)')
check("approved take (the economy's the one still living at home) survives",
  verdict("nothing changed at thirty except the number. the economy's the one still living at home.", 'the_take', USELESS, null),
  'pass')
check('approved roast (investors / series a / memo groceries) survives',
  verdict('your parents aren\'t helping. they\'re investors. fifteen years in, no exit, updates at sunday dinner. series a was college. series b landed this morning. memo: "groceries."', 'the_roast', USELESS, null),
  'pass')

/* ── spill 1 · the frozen regression ──────────────────────────────────── */
const FROZEN = 'Opened a spreadsheet called "Household Budget" and it\'s a log of everything I do that annoys my husband, with a severity scale. He made me coffee this morning like nothing.'
console.log('\n[1] frozen regression — nothing may fire')
const frozenFlags = spillFlags(FROZEN, null, EXEMPLARS)
check('self_critical false', String(frozenFlags.self_critical), 'false')
check('no serious tokens', String(frozenFlags.serious_tokens.length), '0')
for (const [slot, line] of [
  ['the_take', 'the coffee was an item on the spreadsheet. he cleared it from his own action list.'],
  ['the_clapback', '"household budget. was there a line item for the coffee?"'],
  ['the_roast', 'a severity scale. he poured the coffee at a level four and filed it under resolved.'],
] as [SlotKey, string][]) {
  const g = guardrailFailure(line, slot, frozenFlags)
  check(`no guardrail on ${slot}`, g ? `${g.rule}(${g.detail})` : 'none', 'none')
}

/* ── spill 9 · self-directed ──────────────────────────────────────────── */
const LATE = 'Leaving my house at 8:30am hoping I make it to work by 8:00am.'
console.log('\n[9] self-directed — a fresh set in the approved shape must survive')
check('self_critical false', String(spillFlags(LATE, null, EXEMPLARS).self_critical), 'false')
check('the split, fresh', verdict('you left at 8:00 in intention and 8:42 in traffic.', 'the_take', LATE, null), 'pass')
check('the relocation, fresh', verdict('"i keep office hours. the office keeps other ones."', 'the_clapback', LATE, null), 'pass')
check('stage direction + obituary, fresh', verdict('come in holding your keys like you are still arriving. 8:00 left without you.', 'the_roast', LATE, null), 'pass')

/* ── spill 11 · "shit or get off the pot" ─────────────────────────────── */
const POT = 'My ex-MIL said "shit or get off the pot" when I told her I was depressed.'
console.log('\n[11] depressed — the clinical word is the exhibit, not the register')
const potFlags = spillFlags(POT, null, EXEMPLARS)
check('self_critical false', String(potFlags.self_critical), 'false')
check('"depress" is not a serious-fact token', String(potFlags.serious_tokens.length), '0')
check('approved take: you said "depressed." she heard "toilet." — survives',
  verdict('you said "depressed." she heard "toilet."', 'the_take', POT, null), 'pass')
check('the same clinical word unquoted is still out',
  verdict('she answered your depression from a bathroom stall.', 'the_take', POT, null), 'hardrule:clinical vocabulary')

/* ── spill 8 · custody · THE PROCEDURE set ────────────────────────────── */
const CUSTODY = "My MIL said she was gonna file for custody of our daughter because we wouldn't let her see her."
console.log('\n[8] custody — the approved procedure set must survive')
for (const [slot, line] of [
  ['the_take', 'she thinks a court can make us let her in. it can. once. with a bailiff.'],
  ['the_clapback', '"file it. also a restraining order on us all, so we never get close to you."'],
  ['the_roast', "she's going to court to get closer to the baby. court is where we get the number for how far away she stays. fifty feet is standard. we're asking for a hundred."],
] as [SlotKey, string][]) {
  check(`${slot} survives`, verdict(line, slot, CUSTODY, null), 'pass')
}

/* ── Guardrail D · the copies ─────────────────────────────────────────── */
console.log('\n[D] exemplar copy — a line the brief quotes is spent, with or without a tag')
check('the clapback rule\'s "i wish i had that power." verbatim',
  rule('"i wish i had that power."', 'the_clapback', CANCER, 'cancer'), 'exemplar_copy')
check('…plus a tag: "you\'d have a new car." — the live autoimmune leak',
  rule('"i wish i had that power. you\'d have a new car."', 'the_clapback', AUTO, 'autoimmune disease'), 'exemplar_copy')
check('the roast rule\'s "she said gave. like a gift." verbatim',
  rule('she said gave. like a gift.', 'the_roast', CANCER, 'cancer'), 'exemplar_copy')
check('…plus a tag: "like a gift with a card." — the live autoimmune leak',
  rule('she said gave. like a gift with a card.', 'the_roast', AUTO, 'autoimmune disease'), 'exemplar_copy')
check("the brief's self-directed clapback, verbatim",
  rule('"i\'m not late. everyone else is early."', 'the_clapback', LATE, null), 'exemplar_copy')
check("the brief's self-directed roast, verbatim",
  rule("walk in at 8:50 like you're coming from a funeral. you are. 8:00 is dead.", 'the_roast', LATE, null), 'exemplar_copy')
check("the brief's ORDER FOLLOWED clapback, verbatim",
  rule('"i will. shit on you. get off you."', 'the_clapback', POT, null), 'exemplar_copy')
check("the brief's COLLATERAL roast, verbatim",
  rule('her advice is plumbing. look what came out of her.', 'the_roast', POT, null), 'exemplar_copy')
check('a hall-of-fame line, verbatim',
  rule("the budget exists. it's the room.", 'the_take', 'My manager said there is no budget for training.', null), 'exemplar_copy')
check('a short brief phrase used as ONE beat of a longer line is NOT a copy',
  rule('her own body filed a complaint against her. she forwarded it to you.', 'the_roast', AUTO, 'autoimmune disease'), 'pass')

/* ── quoted-span handling ─────────────────────────────────────────────── */
console.log('\n[quotes] the serious fact may appear inside a quote and nowhere else')
check('outsideQuotes strips a quoted span in a roast',
  outsideQuotes('she said "you gave me cancer" and reached for the potatoes.', 'the_roast').includes('cancer') ? 'leaked' : 'stripped',
  'stripped')
check("outsideQuotes keeps a clapback's own wrapper as speech, not as a span",
  outsideQuotes('"i never had cancer to give."', 'the_clapback').includes('cancer') ? 'visible' : 'hidden',
  'visible')
check('a clapback quoting her inside its own speech still hides the token',
  outsideQuotes('"you said “cancer”. i said dinner."', 'the_clapback').includes('cancer') ? 'leaked' : 'stripped',
  'stripped')

/* ── the accusation verb, for the few-shot exclusion ──────────────────── */
console.log('\n[few-shot] the accusation verb the exclusion keys on')
check('cancer spill verb', String(accusationVerb(CANCER)), 'gave')
check('autoimmune spill verb', String(accusationVerb(AUTO)), 'gave')
check('stole-her-son spill verb', String(accusationVerb('My mother-in-law told me I stole her son from her.')), 'stole')
check('frozen spill has no accusation verb', String(accusationVerb(FROZEN)), 'null')
check('custody spill has no accusation verb', String(accusationVerb(CUSTODY)), 'null')

console.log(`\n${pass} passed, ${fail} failed`)
if (fail) {
  console.log('\nFAILURES:')
  for (const f of failures) console.log('  - ' + f)
  process.exitCode = 1
}
