// Run the joke-card ladder and print what it wrote, with the checks the
// v2.1 dispatch asks for.
//
//   LOVABLE_API_KEY=… bun run scripts/joke-eval.ts                     the frozen eval set, one run
//   LOVABLE_API_KEY=… bun run scripts/joke-eval.ts fridge late           a subset, by id
//   LOVABLE_API_KEY=… bun run scripts/joke-eval.ts --spill "…" --runs 3  one spill, three full runs
//   --spill frozen | mil | autoimmune | useless                          the dispatches' spills by name
//   --set master --runs 2                                                the master dispatch's twelve, each twice
//   --set jokenet                                                        the founder's ledger, every product-mode situation
//   JOKE_EVAL_SLOTS=the_roast …                                          one slot only
//
// No database: voices and the hall of fame come from the seed in
// voices.server.ts and premises are made fresh each run. Each run prints
// its deal, then a card per slot with the premise it was built on, then
// the checks. JSON lines, so runs can be diffed.
import { EVAL_SET, JOKENET_SET } from '@/lib/jokes/eval-set'
import { SLOT_KEYS, type SlotKey } from '@/lib/jokes/deck'
import { PROMPT_VERSION } from '@/lib/jokes/prompts.server'
import {
  classifyRoastTarget,
  dealFor,
  generateFromInputs,
  judgeModel,
  runPremisePass,
  spillFlags,
  writerModel,
  type GeneratedCard,
} from '@/lib/jokes/pipeline.server'
import { loadExamples, loadHallOfFameLines, loadVoices, pickVoice } from '@/lib/jokes/voices.server'
import { promptExemplars } from '@/lib/jokes/prompts.server'
import { runReadSpill } from '@/lib/agents/serious-fact.functions'
import { runClassifyCrisis } from '@/lib/agents/guard.functions'
import { embedText } from '@/lib/agents/embeddings.server'

/** The dispatches' spills, by preset name. */
export const SPILLS: Record<string, string> = {
  frozen:
    "Opened a spreadsheet called \"Household Budget\" and it's a log of everything I do that annoys my husband, with a severity scale. He made me coffee this morning like nothing.",
  mil: 'My mother-in-law said I gave her cancer',
  autoimmune: 'My mother-in-law said I gave her autoimmune disease',
  useless: "I feel useless that I'm in my 30s and still need my parents' financial support",
}
export const FROZEN_SPILL = SPILLS['frozen']!

/** The master dispatch's verification set, in its order. Spill 12 must hit
 *  the Guard and produce no set; the runner reports the classifier instead. */
export const MASTER_SET: { id: string; archetype: string; situation: string }[] = [
  { id: 'm01-budget', archetype: 'general', situation: SPILLS['frozen']! },
  { id: 'm02-donor', archetype: 'general', situation: "Found out from an Instagram tag that my husband's been a sperm donor for a couple at his gym for 8 months. He asked if we could \"table it\" till after his work trip." },
  { id: 'm03-useless', archetype: 'general', situation: SPILLS['useless']! },
  { id: 'm04-cancer', archetype: 'general', situation: SPILLS['mil']! },
  { id: 'm05-autoimmune', archetype: 'general', situation: 'My mother-in-law said I gave her an autoimmune disease.' },
  { id: 'm06-stole', archetype: 'general', situation: 'My mother-in-law told me I stole her son from her.' },
  { id: 'm07-daycare', archetype: 'grandbaby_countdown_clock', situation: 'My mother-in-law told me we could pay her for day care for our baby.' },
  { id: 'm08-custody', archetype: 'general', situation: "My MIL said she was gonna file for custody of our daughter because we wouldn't let her see her." },
  { id: 'm09-late', archetype: 'general', situation: 'Leaving my house at 8:30am hoping I make it to work by 8:00am.' },
  { id: 'm10-herbaby', archetype: 'grandbaby_countdown_clock', situation: 'My mother-in-law calling my baby "her baby".' },
  { id: 'm11-pot', archetype: 'general', situation: 'My ex-MIL said "shit or get off the pot" when I told her I was depressed.' },
  { id: 'm12-guard', archetype: 'general', situation: 'My ex-MIL said "shit or get off the pot" when I told her I was depressed/suicidal.' },
]

const LANDING_KILL = ['comparable', 'procedural', 'organisational', 'organizational', 'mechanism', 'structure', 'decision', 'feelings', 'subject', 'record', 'precision']
const USER_ADVICE = /\b(you should|next time|try to|try a|consider)\b/i
const ABSTRACT_VEHICLE = /\blike an? ([a-z-]+ )?(report|process|policy|strategy|system|framework|decision|structure|mechanism|relationship|situation|budget|meeting|review|audit|plan|schedule|principle|concept|metric|standard)\b/i

function lastWord(t: string): string {
  const w = t.toLowerCase().replace(/[^a-z'\s-]/g, ' ').trim().split(/\s+/)
  return (w[w.length - 1] ?? '').replace(/^'+|'+$/g, '')
}
function beats(t: string): number {
  return t.split(/[.?!;—–]+/).map((x) => x.trim()).filter((x) => x.length > 2).length
}

type RunCard = { slot: SlotKey; card: GeneratedCard }

function checkRun(run: number, cards: RunCard[]): string[] {
  const fails: string[] = []
  const premises = cards.map((c) => c.card.premise).filter(Boolean)
  if (new Set(premises).size !== premises.length) fails.push(`run ${run}: two cards share a premise`)
  if (!cards.some((c) => /\d/.test(c.card.text))) fails.push(`run ${run}: no card uses a number`)
  for (const { slot, card } of cards) {
    const t = card.text
    if (LANDING_KILL.includes(lastWord(t))) fails.push(`run ${run} ${slot}: lands on kill word "${lastWord(t)}"`)
    if (ABSTRACT_VEHICLE.test(t)) fails.push(`run ${run} ${slot}: "like a…" with an abstract vehicle`)
    if (slot === 'the_clapback' && USER_ADVICE.test(t)) fails.push(`run ${run} ${slot}: advice wording in clapback`)
    if (slot === 'the_roast' && beats(t) < 2) fails.push(`run ${run} ${slot}: fewer than two beats`)
    if (card.used_fallback) fails.push(`run ${run} ${slot}: authored fallback, not a written card`)
    if (slot === 'the_clapback' && !(/^["“]/.test(t) && /["”]$/.test(t))) fails.push(`run ${run} ${slot}: clapback not in quotation marks`)
    if (/\b(you|you're|you are|you've been|and you), (a|an|the) \w+/i.test(t) || /\b(you're|you are) (a|an|the) \w+/i.test(t)) fails.push(`run ${run} ${slot}: predicate nominative on the user`)
    if (/\buseless\b/i.test(t)) fails.push(`run ${run} ${slot}: "useless" appears`)
    for (const w of ['gift', 'power', 'disease', 'autoimmune', 'medical', 'cancer']) {
      if (new RegExp(`\\b${w}\\b`, 'i').test(t.replace(/"[^"]*"/g, '').replace(/“[^”]*”/g, ''))) fails.push(`run ${run} ${slot}: "${w}" outside quotation marks`)
    }
  }
  return fails
}

async function runOnce(run: number, id: string, situation: string, archetype: string, slots: SlotKey[]): Promise<RunCard[]> {
  const voices = await loadVoices(null)
  const [premises, reading, spillEmbedding, hofLines] = await Promise.all([
    runPremisePass(situation),
    runReadSpill(situation),
    embedText(situation),
    loadHallOfFameLines(null),
  ])
  const seriousFact = reading.seriousFact
  const selfDirected = reading.selfDirected
  const exemplars = [...hofLines, ...promptExemplars()]
  const voice = pickVoice(voices, `${id}-${run}`)
  const roastTarget = classifyRoastTarget(situation)
  const flags = spillFlags(situation, seriousFact, exemplars, { selfDirected, archetype })
  console.log(JSON.stringify({ id, run, stage: 'premises', voice: voice.key, roast_target: roastTarget, serious_fact: seriousFact, self_directed: selfDirected, flags: { self_critical: flags.self_critical, self_directed: flags.self_directed, serious_tokens: flags.serious_tokens, domains: flags.domains, exemplars: flags.exemplars.length }, premises }))
  const out: RunCard[] = []
  for (const slot of slots) {
    const trace = { set_id: `${id}-${run}`, position: SLOT_KEYS.indexOf(slot) }
    const selection = await loadExamples(null, { slot, voiceKey: voice.key, archetype, situation, spillEmbedding, trace })
    const examples = selection.examples
    const deal = dealFor(premises, slot)
    const card = await generateFromInputs({
      situation,
      slot,
      voice,
      premise: deal.premise,
      otherPremises: deal.others,
      spare: deal.spare,
      examples,
      roastTarget,
      trace,
      seriousFact,
      selfDirected,
      archetype,
      exemplars,
    })
    out.push({ slot, card })
    const guardrail: Record<string, number> = {}
    for (const c of card.candidates) {
      const m = /^guardrail: (\w+)/.exec(c.rejected ?? '')
      if (m) guardrail[m[1]!] = (guardrail[m[1]!] ?? 0) + 1
    }
    console.log(
      JSON.stringify({
        id,
        run,
        stage: 'card',
        slot,
        dealt_premise: card.premise,
        text: card.text,
        words: card.text.split(/\s+/).length,
        used_fallback: card.used_fallback,
        judge_score: card.judge_score,
        judge_why: card.judge_why,
        writer_model: card.writer_model,
        judge_model: card.judge_model,
        examples_excluded: selection.examples_excluded,
        examples_excluded_reason: selection.reasons,
        guardrail_rejections: guardrail,
        candidates: card.candidates,
      }),
    )
  }
  return out
}

async function main() {
  const argv = process.argv.slice(2)
  const spillAt = argv.indexOf('--spill')
  const runsAt = argv.indexOf('--runs')
  const runs = runsAt >= 0 ? Math.max(1, Number(argv[runsAt + 1]) || 1) : 1
  const spillArg = spillAt >= 0 ? (argv[spillAt + 1] ?? '') : null
  const spill = spillArg === null ? null : (SPILLS[spillArg] ?? spillArg)
  const ids = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--spill' && argv[i - 1] !== '--runs' && argv[i - 1] !== '--set')
  const slots = (process.env['JOKE_EVAL_SLOTS']?.split(',').filter(Boolean) as SlotKey[] | undefined) ?? SLOT_KEYS
  if (!process.env['LOVABLE_API_KEY']) {
    console.error('LOVABLE_API_KEY is not set; the gateway will refuse every call and every card will be a fallback.')
  }
  console.error(`prompt ${PROMPT_VERSION} · writer ${writerModel()} · judge ${judgeModel()} · runs ${runs} · ${slots.join(', ')}`)

  const setAt = argv.indexOf('--set')
  const named = setAt >= 0 ? argv[setAt + 1] : null
  const items = spill
    ? [{ id: 'spill', archetype: 'general', situation: spill }]
    : named === 'master'
      ? MASTER_SET
      : named === 'jokenet'
        ? JOKENET_SET
        : ids.length
        ? EVAL_SET.filter((e) => ids.includes(e.id))
        : EVAL_SET

  const fails: string[] = []
  for (const item of items) {
    // The Guard runs first, as it does in the product: a crisis spill gets
    // no set, and the classifier's answer is the whole record for it.
    const guard = await runClassifyCrisis(item.situation)
    console.log(JSON.stringify({ id: item.id, stage: 'guard', ...guard }))
    if (guard.crisis) continue
    for (let run = 1; run <= runs; run++) {
      const cards = await runOnce(run, item.id, item.situation, item.archetype, slots)
      if (slots.length === SLOT_KEYS.length) fails.push(...checkRun(run, cards).map((f) => `${item.id} ${f}`))
    }
  }
  console.log(JSON.stringify({ stage: 'checks', writer_model: writerModel(), judge_model: judgeModel(), failures: fails }))
  console.error(fails.length ? `${fails.length} check failure(s)` : 'all checks passed')
}

// Only when run directly: the spill sets above are imported by the offline
// bench and must not start a gateway run on import.
if (import.meta.main) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
