// Run the joke-card ladder and print what it wrote, with the checks the
// v2.1 dispatch asks for.
//
//   LOVABLE_API_KEY=… bun run scripts/joke-eval.ts                     the frozen eval set, one run
//   LOVABLE_API_KEY=… bun run scripts/joke-eval.ts fridge late           a subset, by id
//   LOVABLE_API_KEY=… bun run scripts/joke-eval.ts --spill "…" --runs 3  one spill, three full runs
//   JOKE_EVAL_SLOTS=the_roast …                                          one slot only
//
// No database: voices and the hall of fame come from the seed in
// voices.server.ts and premises are made fresh each run. Each run prints
// its deal, then a card per slot with the premise it was built on, then
// the checks. JSON lines, so runs can be diffed.
import { EVAL_SET } from '@/lib/jokes/eval-set'
import { SLOT_KEYS, type SlotKey } from '@/lib/jokes/deck'
import { PROMPT_VERSION } from '@/lib/jokes/prompts.server'
import {
  classifyRoastTarget,
  dealFor,
  generateFromInputs,
  judgeModel,
  runPremisePass,
  writerModel,
  type GeneratedCard,
} from '@/lib/jokes/pipeline.server'
import { loadExamples, loadVoices, pickVoice } from '@/lib/jokes/voices.server'

/** The dispatch's frozen spill. */
export const FROZEN_SPILL =
  "Opened a spreadsheet called \"Household Budget\" and it's a log of everything I do that annoys my husband, with a severity scale. He made me coffee this morning like nothing."

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
  }
  return fails
}

async function runOnce(run: number, id: string, situation: string, archetype: string, slots: SlotKey[]): Promise<RunCard[]> {
  const voices = await loadVoices(null)
  const premises = await runPremisePass(situation)
  const voice = pickVoice(voices, `${id}-${run}`)
  const roastTarget = classifyRoastTarget(situation)
  console.log(JSON.stringify({ id, run, stage: 'premises', voice: voice.key, roast_target: roastTarget, premises }))
  const out: RunCard[] = []
  for (const slot of slots) {
    const examples = await loadExamples(null, { slot, voiceKey: voice.key, archetype })
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
    })
    out.push({ slot, card })
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
  const spill = spillAt >= 0 ? (argv[spillAt + 1] === 'frozen' ? FROZEN_SPILL : argv[spillAt + 1] ?? '') : null
  const ids = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--spill' && argv[i - 1] !== '--runs')
  const slots = (process.env['JOKE_EVAL_SLOTS']?.split(',').filter(Boolean) as SlotKey[] | undefined) ?? SLOT_KEYS
  if (!process.env['LOVABLE_API_KEY']) {
    console.error('LOVABLE_API_KEY is not set; the gateway will refuse every call and every card will be a fallback.')
  }
  console.error(`prompt ${PROMPT_VERSION} · writer ${writerModel()} · judge ${judgeModel()} · runs ${runs} · ${slots.join(', ')}`)

  const items = spill
    ? [{ id: 'spill', archetype: 'general', situation: spill }]
    : ids.length
      ? EVAL_SET.filter((e) => ids.includes(e.id))
      : EVAL_SET

  const fails: string[] = []
  for (const item of items) {
    for (let run = 1; run <= runs; run++) {
      const cards = await runOnce(run, item.id, item.situation, item.archetype, slots)
      if (slots.length === SLOT_KEYS.length) fails.push(...checkRun(run, cards).map((f) => `${item.id} ${f}`))
    }
  }
  console.log(JSON.stringify({ stage: 'checks', writer_model: writerModel(), judge_model: judgeModel(), failures: fails }))
  console.error(fails.length ? `${fails.length} check failure(s)` : 'all checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
