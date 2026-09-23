// The founder's joke ledger (src/lib/jokes/jokenet.json, from
// shutap-situations-and-jokes.xlsx) → the two things the pipeline takes
// from it, generated so they can be regenerated:
//
//   · the hall-of-fame seed: every product-mode row whose status is
//     approved, run through the admission check (the hard rules and
//     guardrails A–E against its own situation; a clapback must carry its
//     quotes). Printed as a SQL migration block and a TS seed block.
//   · the frozen eval set: every product-mode situation, in ledger order,
//     with its archetype pinned.
//
//   bun run scripts/jokenet-sync.ts            report: admitted, refused, why
//   bun run scripts/jokenet-sync.ts --sql      the INSERT block
//   bun run scripts/jokenet-sync.ts --ts       the SEED_HALL_OF_FAME block
//   bun run scripts/jokenet-sync.ts --eval     the eval-set block
//
// No model, no database, no key. Two things the ledger does not carry are
// pinned here by hand, because the classifier that answers them at set
// creation needs a key: the serious fact of a situation and whether it is
// self-directed.
import rows from '@/lib/jokes/jokenet.json'
import { classifyArchetype } from '@/lib/jokes/deck.server'
import type { SlotKey } from '@/lib/jokes/deck'
import { guardrailFailure, hardRuleFailure, lengthFailure, literalNounFailure, spillFlags } from '@/lib/jokes/pipeline.server'
import { SEED_HALL_OF_FAME } from '@/lib/jokes/voices.server'

type Row = { id: string; situation: string; joke: string; rating: string; slot: string; archetype: string; notes: string; source: string }
const LEDGER = rows as Row[]

/** The ledger's product-mode situations carry no serious_fact column; these
 *  are what the reader answers on them. */
const SERIOUS_FACT: Record<string, string> = {
  'My mother-in-law said I gave her cancer.': 'cancer',
  'My mother-in-law said I gave her an autoimmune disease.': 'autoimmune disease',
}
/** No other adult, the user is the actor (spec §8). */
const SELF_DIRECTED = new Set<string>([
  'Me leaving my house at 8:30am hoping I make it to work by 8:00am.',
  'I get mad at everyone around me and can\'t explain why to myself or them.',
  'Why am I lactose intolerant?',
  'Why am I sad?',
  'I sent a screenshot of my boss to my boss.',
  'I paid for my boob job with my corporate business card (by accident).',
  'I accidentally revealed the baby\'s gender to the mom by rereading the cake order out loud.',
  'I sent a \'you\'re hired, welcome to the team\' email to all 12 people who interviewed for the one position.',
  'I work in HR, accidentally terminated myself in the system.',
  'Being a mom I feel overstimulated. Hamster wheel going and going.',
  'I get angry with my baby when he won\'t nap. Then I feel bad for being angry at my baby.',
])

/** The reader's metaphor span and emotional flag, pinned for the ledger's
 *  situations that carry one (Guardrails G and H). */
const METAPHOR_SPAN: Record<string, string> = {
  'Being a mom I feel overstimulated. Hamster wheel going and going.': 'Hamster wheel going and going',
}
const EMOTIONAL = new Set<string>([
  'Being a mom I feel overstimulated. Hamster wheel going and going.',
  'I get mad at everyone around me and can\'t explain why to myself or them.',
  'Why am I sad?',
  'I get angry with my baby when he won\'t nap. Then I feel bad for being angry at my baby.',
  'I feel useless that I\'m in my 30s and still need my parents\' financial support.',
])
const SLOT: Record<string, SlotKey> = { take: 'the_take', clapback: 'the_clapback', roast: 'the_roast' }
const isProduct = (r: Row) => !/\(content/.test(r.situation) && !/^Marriage humor|^Founder-fed/.test(r.situation)
const status = (r: Row) => (r.notes ?? '').split('|')[0]!.replace(/^status:\s*/, '').trim()
const approved = (r: Row) => /^approved/.test(status(r))

function admit(r: Row): { ok: true } | { ok: false; why: string } {
  const slot = SLOT[r.slot]
  if (!slot) return { ok: false, why: `slot ${r.slot} is not a card slot` }
  const line = r.joke.trim()
  if (slot === 'the_clapback' && !(/^["“]/.test(line) && /["”]$/.test(line))) return { ok: false, why: 'clapback without its quotation marks' }
  // Guardrail D against the hall of fame the ledger did not write: the
  // admitted rows are themselves in the seed, and a row is not a copy of
  // itself.
  const ledger = new Set(LEDGER.map((x) => x.joke.trim().toLowerCase()))
  const hof = SEED_HALL_OF_FAME.filter((h) => !ledger.has(h.joke_text.trim().toLowerCase())).map((h, i) => ({ id: `seed:${i}`, text: h.joke_text }))
  const flags = spillFlags(r.situation, SERIOUS_FACT[r.situation] ?? null, hof, {
    selfDirected: SELF_DIRECTED.has(r.situation),
    archetype: classifyArchetype(r.situation),
    metaphorSpan: METAPHOR_SPAN[r.situation] ?? null,
    emotional: EMOTIONAL.has(r.situation),
  })
  const g = guardrailFailure(line, slot, flags)
  // Guardrail F applies to new candidates only: an approved row over its
  // ceiling stays seeded, and is listed in the report as over.
  // Guardrail G is reported, not gating, for the same reason: the founder's
  // approved row on the hamster spill ("Someone stop the hamster spinning
  // wheel.") holds no noun from the day and stays seeded; G is for new
  // candidates. The report lists it.
  if (g && g.rule !== 'length' && g.rule !== 'literal_noun') return { ok: false, why: `guardrail: ${g.rule} (${g.detail}${g.domain ? `, ${g.domain}` : ''})` }
  const h = hardRuleFailure(line, r.situation, slot, { ignoreLength: true })
  if (h) return { ok: false, why: `hard rule: ${h}` }
  return { ok: true }
}

const candidates = LEDGER.filter((r) => isProduct(r) && approved(r) && SLOT[r.slot])
const admitted: Row[] = []
const refused: { row: Row; why: string }[] = []
for (const r of candidates) {
  const a = admit(r)
  if (a.ok) admitted.push(r)
  else refused.push({ row: r, why: a.why })
}

const sql = (s: string) => `'${s.replace(/'/g, "''")}'`
const ts = (s: string) => JSON.stringify(s)
const mode = process.argv[2] ?? ''

if (mode === '--sql') {
  console.log('INSERT INTO public.joke_hall_of_fame (slot, voice_key, archetype, situation_clean, joke_text, source)')
  console.log('SELECT v.slot, NULL, NULL, v.situation, v.joke, v.source FROM (VALUES')
  console.log(admitted.map((r) => `  (${sql(SLOT[r.slot]!)}, ${sql(r.situation)}, ${sql(r.joke.trim())}, ${sql(`jokenet:${r.id}`)})`).join(',\n'))
  console.log(') AS v(slot, situation, joke, source)')
  console.log('WHERE NOT EXISTS (SELECT 1 FROM public.joke_hall_of_fame h WHERE h.joke_text = v.joke AND h.situation_clean = v.situation);')
} else if (mode === '--ts') {
  for (const r of admitted) {
    console.log(`  { slot: '${SLOT[r.slot]}', voice_key: null, archetype: null, situation_clean: ${ts(r.situation)}, joke_text: ${ts(r.joke.trim())} },`)
  }
} else if (mode === '--eval') {
  const seen = new Set<string>()
  for (const r of LEDGER) {
    if (!isProduct(r) || seen.has(r.situation)) continue
    seen.add(r.situation)
    console.log(`  { id: 'j${String(r.id).padStart(3, '0')}', archetype: '${classifyArchetype(r.situation)}', situation: ${ts(r.situation)} },`)
  }
} else {
  console.log(`${candidates.length} approved product-mode rows · ${admitted.length} admitted · ${refused.length} refused`)
  for (const r of admitted) console.log(`  ok   #${r.id} ${r.slot.padEnd(8)} ${r.joke.trim()}`)
  const noNoun = admitted.filter((r) => METAPHOR_SPAN[r.situation] && literalNounFailure(r.joke.trim(), spillFlags(r.situation, null, [], { metaphorSpan: METAPHOR_SPAN[r.situation], archetype: classifyArchetype(r.situation) })))
  console.log(`\n${noNoun.length} admitted rows with no literal noun on a metaphor spill (Guardrail G; seeded anyway, G is for new candidates):`)
  for (const r of noNoun) console.log(`  G    #${r.id} ${r.slot.padEnd(8)} ${r.joke.trim()}`)
  const over = admitted.map((r) => ({ r, hit: lengthFailure(r.joke.trim(), SLOT[r.slot]!) })).filter((x) => x.hit)
  console.log(`\n${over.length} admitted rows over their slot ceiling (Guardrail F; seeded anyway, F is for new candidates):`)
  for (const { r, hit } of over) console.log(`  over #${r.id} ${r.slot.padEnd(8)} ${hit!.detail}  ${r.joke.trim()}`)
  for (const { row, why } of refused) console.log(`  OUT  #${row.id} ${row.slot.padEnd(8)} ${row.joke.trim()}\n         ${why}`)
}
