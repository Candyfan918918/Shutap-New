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
  lengthFailure,
  literalNounFailure,
  blameFailure,
  pronounAntecedentFailure,
  spillFigureFailure,
  spokenLine,
  cleanLine,
  cardWordCount,
  fallbackCard,
  exemplarCopyByEmbedding,
  EXEMPLAR_EMBED_THRESHOLD,
  outsideQuotes,
} from '@/lib/jokes/pipeline.server'
import { promptExemplars } from '@/lib/jokes/prompts.server'
import { accusationVerb, SEED_HALL_OF_FAME } from '@/lib/jokes/voices.server'
import ledger from '@/lib/jokes/jokenet.json'
import type { SlotKey } from '@/lib/jokes/deck'

// The founder's approved lines are in the hall of fame now, so against the
// full seed every one of them is — correctly — an exemplar copy. The
// direction checks below ask a different question (does A, B, E or a hard
// rule refuse an approved line?), so they run against the seed the ledger
// did not write; the D section asserts the copies.
const LEDGER = new Set((ledger as { joke: string }[]).map((r) => r.joke.trim().toLowerCase()))
const HOF = SEED_HALL_OF_FAME.filter((h) => !LEDGER.has(h.joke_text.trim().toLowerCase())).map((h, i) => ({ id: `seed:${i}`, text: h.joke_text }))
const FULL_HOF = SEED_HALL_OF_FAME.map((h, i) => ({ id: `seed:${i}`, text: h.joke_text }))
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

/** The direction verdict: A–E and the hard rules, with length set aside.
 *  Guardrail F is for new candidates; the approved lines these checks ask
 *  about include seeded rows over their ceiling, and F has its own section. */
function verdict(line: string, slot: SlotKey, situation: string, seriousFact: string | null): string {
  const flags = spillFlags(situation, seriousFact, EXEMPLARS)
  const g = guardrailFailure(line, slot, flags)
  if (g && g.rule !== 'length') return `guardrail:${g.rule}(${g.detail}${g.source ? ',' + g.source : ''})`
  const h = hardRuleFailure(line, situation, slot, { ignoreLength: true })
  return h ? `hardrule:${h}` : 'pass'
}
const lengthOf = (line: string, slot: SlotKey) => { const f = lengthFailure(line, slot); return f ? `length(${f.detail})` : 'pass' }
const words = (n: number, quoted = false) => { const w = Array.from({ length: n }, (_, i) => (i === n - 1 ? 'fork.' : `w${i}`)).join(' '); return quoted ? `"${w}"` : w }

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
const fullFlags = spillFlags(CUSTODY, null, FULL_HOF)
check('an admitted ledger line is spent once it is in the hall of fame (the custody take, verbatim)',
  guardrailFailure('she thinks a court can make us let her in. it can. once. with a bailiff.', 'the_take', fullFlags)?.rule ?? 'pass', 'exemplar_copy')
check('…and with a tag added',
  guardrailFailure('she thinks a court can make us let her in. it can. once. with a bailiff, and a form.', 'the_take', fullFlags)?.rule ?? 'pass', 'exemplar_copy')
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

/* ── Guardrail E · the borrowed domain ────────────────────────────────── */
const SURPRISE = 'The surprise I get is never the surprise for me as a mom or a wife.'
console.log('\n[E] borrowed domain — the costume is out, the spill\'s own world and their word are in')
check('the live surprise card "it\'s a six sigma event…" is rejected',
  verdict("it's a six sigma event. your reaction is the key performance indicator.", 'the_take', SURPRISE, null),
  "guardrail:borrowed_domain(six sigma)")
check('the approved surprise take survives',
  verdict('even your surprise party needs you to bake the cake.', 'the_take', SURPRISE, null), 'pass')
check('the approved surprise roast survives',
  verdict('every surprise in that house is a chore wearing a bow.', 'the_roast', SURPRISE, null), 'pass')
check('a finance costume on the cancer spill is rejected (a stored production candidate)',
  verdict('she made it a debt, not a sympathy card. a ledger, two entries deep.', 'the_roast', CANCER, 'cancer'),
  'guardrail:borrowed_domain(ledger)')
check('THEIR WORD MADE A WORLD — a quoted span from the spill opens the domain',
  verdict('"table it." fine. next item on the agenda: the stakeholders. minutes to follow.', 'the_roast',
    "Found out my husband's been a sperm donor for a couple at his gym. He asked if we could \"table it\" till after his trip.", null),
  'pass')
check('the same corporate token without their word is out',
  verdict('fine. next item on the agenda: the stakeholders. minutes to follow.', 'the_roast',
    "Found out my husband's been a sperm donor for a couple at his gym. He asked if we could hold off till after his trip.", null),
  'guardrail:borrowed_domain(stakeholders)')
check('THE CLEAN LINE on a spill that said "corporate card" survives (Team Building)',
  verdict('finance has a category for that. it\'s called "team building."', 'the_take',
    'I paid for my boob job with my corporate business card (by accident).', null), 'pass')
check('THE PROCEDURE on a spill that invoked the court survives (bailiff)',
  verdict('she thinks a court can make us let her in. it can. once. with a bailiff.', 'the_take', CUSTODY, null), 'pass')
check('the same bailiff on a spill with no court is out',
  verdict('she thinks she can make us let her in. she can. once. with a bailiff.', 'the_take', 'My mother-in-law calling my baby "her baby".', null),
  'guardrail:borrowed_domain(bailiff)')
check('the investors roast on the financial-support spill survives (finance is the spill\'s own world)',
  verdict("your parents aren't helping. they're investors. series a was college.", 'the_roast', USELESS, null), 'pass')
check('engine-5 vocabulary is not a costume (compliance did)',
  verdict("he didn't make you coffee. compliance did. every quiet evening was a row.", 'the_roast', FROZEN, null), 'pass')

/* ── Guardrail A on a self-directed spill ─────────────────────────────── */
console.log('\n[A·self-directed] the verdict-noun list only; total everywhere else')
const HR = 'I work in HR, accidentally terminated myself in the system.'
const sd = (line: string, slot: SlotKey, situation: string, selfDirected: boolean) => {
  const g = guardrailFailure(line, slot, spillFlags(situation, null, EXEMPLARS, { selfDirected }))
  return g ? `guardrail:${g.rule}(${g.detail})${g.narrowed ? '[narrowed]' : ''}` : 'pass'
}
check('the approved HR take survives when the reader marks the spill self-directed',
  sd("you're the first person hr ever fired who deserved it.", 'the_take', HR, true), 'pass')
check('the same line is out when the reader does not (fail-safe: A stays total)',
  sd("you're the first person hr ever fired who deserved it.", 'the_take', HR, false), "guardrail:user_predicate(you're the first)")
check('a verdict noun is still out on a self-directed spill',
  sd("you're a failure with a badge.", 'the_take', HR, true), "guardrail:user_predicate(you're a failure)[narrowed]")
check('THE ANIMAL WITH A BILL, fresh, survives on its self-directed spill (the brief\'s own hamster is a spent exemplar)',
  sd("you're a goldfish with a car payment.", 'the_take', 'Being a mom I feel overstimulated. Hamster wheel going and going.', true), 'pass')
check('the trust-fund line stays out: the parents are in the spill, so A is total',
  sd('you, a 30-year-old walking, talking trust fund.', 'the_roast', USELESS, false), 'guardrail:user_predicate(you, a 30)')

/* ── the one-word clapback ────────────────────────────────────────────── */
console.log('\n[clapback] THE SCAPEGOAT and THE INSTITUTION\'S ALIBI are one word')
check('"Rent." passes', verdict('"rent."', 'the_clapback', 'Why am I sad?', null), 'pass')
check('"Client-facing." passes', verdict('"client-facing."', 'the_clapback', 'I paid for my boob job with my corporate business card (by accident).', null), 'pass')
check('a one-word take is still too short', verdict('rent.', 'the_take', 'Why am I sad?', null), 'hardrule:too short')

/* ── Guardrail F · length ─────────────────────────────────────────────── */
console.log('\n[F] length — over the slot ceiling is out before the judge; quotes do not count')
check('a 17-word take is out', lengthOf(words(17), 'the_take'), 'length(17 > 16)')
check('a 16-word take passes the ceiling', lengthOf(words(16), 'the_take'), 'pass')
check('an 11-word clapback is out', lengthOf(words(11, true), 'the_clapback'), 'length(11 > 10)')
check('the quotation marks are not words (10 inside quotes passes)', lengthOf(words(10, true), 'the_clapback'), 'pass')
check('a 26-word roast is out', lengthOf(words(26), 'the_roast'), 'length(26 > 25)')
check('a 25-word roast passes', lengthOf(words(25), 'the_roast'), 'pass')
check('F is in guardrailFailure, after E', guardrailFailure(words(17), 'the_take', frozenFlags)?.rule ?? 'pass', 'length')
check('the approved custody roast (32 words) would be out as a NEW candidate', lengthOf("she's going to court to get closer to the baby. court is where we get the number for how far away she stays. fifty feet is standard. we're asking for a hundred.", 'the_roast'), 'length(32 > 25)')
check('the approved custody take (14) passes', lengthOf('she thinks a court can make us let her in. it can. once. with a bailiff.', 'the_take'), 'pass')
const overSeed = SEED_HALL_OF_FAME.filter((h) => lengthFailure(h.joke_text, h.slot))
console.log(`  seed hall-of-fame rows over their ceiling (left seeded): ${overSeed.length}`)
for (const h of overSeed) console.log(`    ${h.slot.padEnd(12)} ${lengthFailure(h.joke_text, h.slot)!.detail.padEnd(8)} ${h.joke_text}`)

/* ── Guardrails G and H · the user's metaphor, and blame ─────────────── */
const HAMSTER = 'I feel like a hamster in a non-stop spinning wheel as a stay at home mom'
const hamsterFlags = spillFlags(HAMSTER, null, EXEMPLARS, { selfDirected: true, emotional: true, metaphorSpan: 'a hamster in a non-stop spinning wheel', archetype: 'general' })
const gh = (line: string, slot: SlotKey) => {
  const G = literalNounFailure(line, hamsterFlags); const H = blameFailure(line, slot, hamsterFlags)
  return `${G ? 'G' : '-'}${H ? 'H' : '-'}`
}
console.log('\n[G·H] the user spoke in a metaphor — a noun from the day, and no blame')
check('"You\'re a hamster with a mortgage." passes G (mortgage is on the stay-at-home-mom list)', gh("you're a hamster with a mortgage.", 'the_take'), '--')
check('"the wheel is a treadmill with a nameplate" fails G', gh('the hamster is a specialist. the wheel is a treadmill with a nameplate.', 'the_roast'), 'G-')
check('"you chose the animal" fails H', gh('you built the wheel, then you chose the animal.', 'the_roast'), 'GH')
check('"God closed the oven door, and opened the washer door." passes both', gh('god closed the oven door, and opened the washer door.', 'the_roast'), '--')
check('the live clapback "my contract doesn\'t include breaks." fails G', gh('"my contract doesn\'t include breaks."', 'the_clapback'), 'G-')
check('a noun from the spill outside the metaphor passes G (home)', gh('the wheel stops at 9:40. home does not.', 'the_take'), '--')
check('blame inside a quote may stand', gh('"you chose this," she said, and handed you the laundry.', 'the_roast'), '--')
check('G is off when the reader found no metaphor', literalNounFailure('the wheel is a treadmill with a nameplate.', spillFlags(HAMSTER, null, EXEMPLARS, { selfDirected: true, emotional: true, archetype: 'general' }))?.rule ?? 'pass', 'pass')
check('H is off when the spill is not emotional', blameFailure('you built the wheel.', 'the_roast', spillFlags(HAMSTER, null, EXEMPLARS, { selfDirected: true, emotional: false }))?.rule ?? 'pass', 'pass')
check('H is off when the spill has another adult', blameFailure('you built the wheel.', 'the_roast', spillFlags(HAMSTER, null, EXEMPLARS, { selfDirected: false, emotional: true }))?.rule ?? 'pass', 'pass')
check('G and H are in guardrailFailure, after F', guardrailFailure('you built the wheel, then you chose the animal.', 'the_roast', hamsterFlags)?.rule ?? 'pass', 'literal_noun')
check('the seeded ledger clapback "Someone stop the hamster spinning wheel." under G on its own spill',
  literalNounFailure('"someone stop the hamster spinning wheel."', spillFlags('Being a mom I feel overstimulated. Hamster wheel going and going.', null, EXEMPLARS, { selfDirected: true, emotional: true, metaphorSpan: 'Hamster wheel going and going' }))?.rule ?? 'pass', 'literal_noun')

/* ── the 3.3 hamster set: the wrapper quotes, Guardrail I, the floor ──── */
const HAM2 = 'I feel like a hamster in spinning wheel as a stay at home mom'
const ham2 = spillFlags(HAM2, null, EXEMPLARS, { selfDirected: true, emotional: true, metaphorSpan: 'a hamster in spinning wheel', archetype: 'general' })
console.log('\n[quotes] a clapback\'s own wrapper is not a quoted span')
check('"that was a choice, and you made it." → H rejects', blameFailure('"that was a choice, and you made it."', 'the_clapback', ham2)?.rule ?? 'pass', 'blame')
check('the same line, curly wrapper → H rejects', blameFailure('“that was a choice, and you made it.”', 'the_clapback', ham2)?.rule ?? 'pass', 'blame')
check('a serious token inside a clapback wrapper is still seen by B',
  guardrailFailure('"cancer is not a gift."', 'the_clapback', spillFlags(CANCER, 'cancer', EXEMPLARS))?.rule ?? 'pass', 'serious_fact')
console.log('\n[I] a pronoun without an antecedent on a self-directed set')
check('the live take "she did the thing…" fails I', pronounAntecedentFailure('she did the thing, on purpose, with her whole chest, and then filed it as normal.', ham2)?.rule ?? 'pass', 'pronoun_antecedent')
check('"The baby skipped a nap. He\'s fine." passes', pronounAntecedentFailure("the baby skipped a nap. he's fine.", ham2)?.rule ?? 'pass', 'pass')
check('"God closed the oven door" passes (no pronoun)', pronounAntecedentFailure('god closed the oven door, and opened the washer door.', ham2)?.rule ?? 'pass', 'pass')
check('a pronoun before the person-noun fails', pronounAntecedentFailure("he's fine. the baby skipped a nap.", ham2)?.rule ?? 'pass', 'pronoun_antecedent')
check('a capitalised role from the situation counts as a person-noun',
  pronounAntecedentFailure('hr fired you. she processed it herself.', spillFlags('I work in HR, accidentally terminated myself in the system.', null, EXEMPLARS, { selfDirected: true }))?.rule ?? 'pass', 'pass')
check('I is off when the spill has another adult', pronounAntecedentFailure('she said gave. like a gift.', spillFlags(CANCER, 'cancer', EXEMPLARS, { selfDirected: false }))?.rule ?? 'pass', 'pass')
check('I sits in guardrailFailure', guardrailFailure('she filed it as normal. the laundry is still there.', 'the_take', ham2)?.rule ?? 'pass', 'pronoun_antecedent')
console.log('\n[floor] the authored pool goes through the guardrails')
const floorTake = fallbackCard('the_take', null, [], { situation: HAM2, flags: ham2 })
check('the floor take on this spill is not "she did the thing…"', floorTake.text.startsWith('she did the thing') ? 'pool line served' : 'screened', 'screened')
check('the floor take fails nothing worse than G (the pool cannot know the day\'s nouns)', guardrailFailure(floorTake.text, 'the_take', ham2)?.rule ?? 'pass', 'literal_noun')
const floorClap = fallbackCard('the_clapback', null, [], { situation: HAM2, flags: ham2 })
check('the floor clapback is not "that was a choice, and you made it."', floorClap.text.includes('you made it') ? 'pool line served' : 'screened', 'screened')
check('the floor clapback fails nothing worse than G', guardrailFailure(floorClap.text, 'the_clapback', ham2)?.rule ?? 'pass', 'literal_noun')
check('the floor on a spill with no metaphor passes A–I outright',
  guardrailFailure(fallbackCard('the_take', null, [], { situation: LATE, flags: spillFlags(LATE, null, EXEMPLARS, { selfDirected: true }) }).text, 'the_take', spillFlags(LATE, null, EXEMPLARS, { selfDirected: true }))?.rule ?? 'pass', 'pass')
console.log('\n[D·embedding] the paraphrase half')
check('the same vector is a copy at the threshold', exemplarCopyByEmbedding([1, 0, 0], [{ id: 'x', norm: 'x', tokens: new Set(), embedding: [1, 0, 0] }] as never)?.id ?? 'pass', 'x')
check('an orthogonal vector is not', exemplarCopyByEmbedding([1, 0, 0], [{ id: 'x', norm: 'x', tokens: new Set(), embedding: [0, 1, 0] }] as never)?.id ?? 'pass', 'pass')
if (process.env['LOVABLE_API_KEY']) {
  const { embedTexts, cosineSimilarity } = await import('@/lib/agents/embeddings.server')
  const [a, b, c] = await embedTexts(['the hamster has the mortgage. not the feed, not the bedding. the mortgage.', "You're a hamster with a mortgage.", 'God closed the oven door, and opened the washer door.'])
  if (a && b && c) {
    check(`"the hamster has the mortgage…" vs "You're a hamster with a mortgage." rejects (${cosineSimilarity(a, b).toFixed(3)})`, String(cosineSimilarity(a, b) >= EXEMPLAR_EMBED_THRESHOLD), 'true')
    check(`"God closed the oven door…" vs the same passes (${cosineSimilarity(c, b).toFixed(3)})`, String(cosineSimilarity(c, b) >= EXEMPLAR_EMBED_THRESHOLD), 'false')
  } else console.log('  skip embedding cases: the gateway returned no vectors')
} else console.log('  skip the two live embedding cases: LOVABLE_API_KEY is not set (scripts/joke-hof-similarity.ts runs them with the threshold sweep)')

/* ── Guardrail J · the spill's figure; the clapback stage direction ─────── */
const TANK = 'I filled up my tank today and it cost me $120.'
const tank = spillFlags(TANK, null, EXEMPLARS, { selfDirected: true, emotional: false })
console.log('\n[J] the spill\'s figure never ships back')
check('the spill\'s figures are read', tank.figures.join(','), '$120')
check('"$120 for a tank" is out', spillFigureFailure('$120 for a tank. the car ate first.', tank)?.rule ?? 'pass', 'spill_figure')
check('"120 dollars" is out too (the figure without its sign)', spillFigureFailure('120 dollars of gas and a receipt.', tank)?.rule ?? 'pass', 'spill_figure')
check('fake precision passes ($121.40)', spillFigureFailure('$121.40, and the pump asked if you wanted a car wash.', tank)?.rule ?? 'pass', 'pass')
check('"1200" is not "120"', spillFigureFailure('1200 miles of this.', tank)?.rule ?? 'pass', 'pass')
check('the approved take passes (no figure)', spillFigureFailure('your car ate better today than you will all week.', tank)?.rule ?? 'pass', 'pass')
check('the approved roast passes', spillFigureFailure('you work monday to pay for the gas that gets you to work tuesday.', tank)?.rule ?? 'pass', 'pass')
check('clock times are not figures: the 8:30 spill has none', spillFlags(LATE, null, EXEMPLARS).figures.join(','), '')
check('the approved 8:30 take passes J', spillFigureFailure('you left at 8:00 in spirit and 8:30 in honda.', spillFlags(LATE, null, EXEMPLARS))?.rule ?? 'pass', 'pass')
check('"12 people" spill: "12" back is out', spillFigureFailure('12 people, one desk.', spillFlags("I sent a 'you're hired' email to all 12 people who interviewed for the one position.", null, EXEMPLARS))?.rule ?? 'pass', 'spill_figure')
check('…but "twelve" as a word passes', spillFigureFailure('let the twelve sort out the desk.', spillFlags("I sent a 'you're hired' email to all 12 people who interviewed for the one position.", null, EXEMPLARS))?.rule ?? 'pass', 'pass')
check('J sits in guardrailFailure', guardrailFailure('$120 and a receipt.', 'the_take', tank)?.rule ?? 'pass', 'spill_figure')
console.log('\n[stage direction] Pump screen: "Receipt?" / "No. I know what I did."')
const CONFESSION = 'Pump screen: "Receipt?"\n"No. I know what I did."'
check('the spoken line is the last line', spokenLine(CONFESSION, 'the_clapback'), '"No. I know what I did."')
check('cleanLine keeps the direction on its own line', cleanLine(CONFESSION, 'the_clapback'), 'pump screen: "receipt?"\n"no. i know what i did."')
check('the direction\'s quote is a span; the spoken wrapper is speech', outsideQuotes(CONFESSION, 'the_clapback'), 'Pump screen:  No. I know what I did.')
check('the confession passes A–J on the tank spill (it is itself a spent exemplar, so D is set aside here)',
  guardrailFailure(cleanLine(CONFESSION, 'the_clapback'), 'the_clapback', spillFlags(TANK, null, [], { selfDirected: true }))?.rule ?? 'pass', 'pass')
check('…and a fresh confession-shaped line passes with D on',
  guardrailFailure(cleanLine('Pump screen: "Car wash?"\n"No. It knows."', 'the_clapback'), 'the_clapback', tank)?.rule ?? 'pass', 'pass')
check('nine words, under the clapback ceiling', String(cardWordCount(CONFESSION)), '9')
check('a one-line clapback is unchanged by the parts reader', cleanLine('"Rent."', 'the_clapback'), '"rent."')

console.log(`\n${pass} passed, ${fail} failed`)
if (fail) {
  console.log('\nFAILURES:')
  for (const f of failures) console.log('  - ' + f)
  process.exitCode = 1
}
