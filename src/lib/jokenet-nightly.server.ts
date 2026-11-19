// JokeNet nightly writer (Nov 17 2026). Fills JokeNet without anyone typing:
// every night it writes in-house situations, a batch of one-line jokes on
// each (every line built on a different technique from the Lab's bank, with
// THE STANDARD from JokeNet as the bar), has a judge from another model family
// score them 1–10, and keeps the ones that clear the floor, unrated, for the
// founder's rating queue. ai_score orders the queue; it never feeds the writer.
//
// In-house only: the situations are written here, never taken from users.
import { pacificDay } from '@/lib/pacific-day'

export const NIGHTLY = {
  situations: 10,
  linesPerSituation: 6,
  /** judge score (1–10) a line needs to be kept */
  floor: 6,
  /** a night that already holds this many rows is not written again */
  enough: 25,
}

const SITUATION_PROMPT = `Write {{N}} short situations that real people would type into a comedy app
about something that annoyed or embarrassed them recently. Each one:
- first person, past tense, one or two sentences, plain words, like a text to a friend
- one concrete detail a joke can grab: a clock time, a number, an object, or the exact words someone said (in quotes)
- no names, no places, nothing tragic, no illness, no bodies, nobody's age, looks, race, religion or sexuality
- small and everyday: ruins twenty minutes, not a life
Spread them across: family, work, dating or partner, roommate or neighbor, money, customer service,
transit, the internet, a friend, school or a group chat.{{TOPIC}}
Never repeat these, or anything close to them:
{{AVOID}}
Return only JSON: {"situations":["..."]}`

const LINE_PROMPT = `You write one-line jokes for a comedy dataset. The situation:
"{{SITUATION}}"

Write {{N}} different jokes about it, one per technique below, in order. Each joke:
- one to three short sentences, under 35 words, said out loud by the person it happened to
- aims at the situation, never at the teller's or anyone's body, race, religion, sexuality or age
- a picture you can see, an act not a label; the last word is the funniest word
- never restates the situation; never explains the joke

Techniques:
{{TECHNIQUES}}
{{STANDARD}}
Return only JSON: {"lines":[{"technique":"<technique name>","joke":"..."}]}`

const JUDGE_PROMPT = `You are a hard-to-please comedy editor. Score each joke on the situation 1–10:
10 = you would screenshot it and send it to a friend; 7 = a real laugh; 5 = a smile; 3 = flat;
1 = not a joke, explains itself, restates the situation, or is mean about who someone is.
Score 1 for anything aimed at a body, race, religion, sexuality, age or a real named person.
Most jokes are 3–6. Be stingy with 8+.

{{ITEMS}}

Return only JSON: {"scores":[{"i":<number>,"score":<1-10>}]}`

type Line = { situation: string; joke: string; technique: string }

export type NightlyReport = { day: string; skipped?: string; situations: number; written: number; kept: number; indexed: number; errors: string[] }

function words(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

/** Index every row still missing a vector (imports, /bit-daily rows, tonight's
 *  batch). Runs on every call, even when the writer produced nothing. */
async function indexMissing(db: any, errors: string[]): Promise<number> {
  let indexed = 0
  try {
    const { embedTexts, toVectorLiteral } = await import('@/lib/agents/embeddings.server')
    const { data: todo } = await db.from('jokenet').select('id, situation').is('embedding', null).is('archived_at', null).order('rating', { ascending: false, nullsFirst: false }).limit(768)
    for (let i = 0; i < (todo ?? []).length; i += 64) {
      const chunk = todo.slice(i, i + 64)
      const vecs = await embedTexts(chunk.map((r: any) => r.situation))
      await Promise.all(
        chunk.map(async (r: any, j: number) => {
          if (!vecs[j]) return
          const { error } = await db.from('jokenet').update({ embedding: toVectorLiteral(vecs[j]!) }).eq('id', r.id)
          if (!error) indexed++
        }),
      )
    }
  } catch (e) {
    errors.push(`index: ${e instanceof Error ? e.message : String(e)}`)
  }
  return indexed
}

export async function runJokenetNightly(opts: { force?: boolean } = {}): Promise<NightlyReport> {
  const day = pacificDay()
  const origin = `nightly:${day}`
  const errors: string[] = []
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const db = supabaseAdmin as any

  if (!opts.force) {
    const { count } = await db.from('jokenet').select('id', { count: 'exact', head: true }).like('origin', `${origin}:%`)
    if ((count ?? 0) >= NIGHTLY.enough) return { day, skipped: 'already written tonight', situations: 0, written: 0, kept: 0, indexed: await indexMissing(db, errors), errors }
  }

  const { callAgent, tryParseJson, DEFAULT_MODEL } = await import('@/lib/agents/gateway')
  const pipe = await import('@/lib/bits/pipeline.server')
  const { dealTechniques } = await import('@/lib/bits/techniques')
  const { liveStandard } = await import('@/lib/bits/jokenet.server')
  const { standardBlock } = await import('@/lib/bits/taste-bank')

  // 1. situations, steered away from the newest ones already in JokeNet
  const { data: recent } = await db.from('jokenet').select('situation').order('id', { ascending: false }).limit(60)
  const avoid = [...new Set((recent ?? []).map((r: any) => String(r.situation)))].slice(0, 30)
  let topic = ''
  try {
    const { FUNNIEST } = await import('@/lib/seo/funniest')
    const top = [...FUNNIEST].sort((a, b) => b.published.localeCompare(a.published))[0]
    if (top) topic = `\nMake two of them about ${top.category.toLowerCase()}.`
  } catch {
    // no topic tonight
  }
  const sitPrompt = SITUATION_PROMPT.replace('{{N}}', String(NIGHTLY.situations)).replace('{{TOPIC}}', topic).replace('{{AVOID}}', avoid.map((s) => `- ${s}`).join('\n') || '- (none)')
  const readSituations = (text: string) =>
    ((tryParseJson<{ situations?: unknown[] }>(text)?.situations ?? []) as unknown[])
      .map((s) => String(s ?? '').replace(/\s+/g, ' ').trim())
      .filter((s) => s.length > 20 && s.length < 300)
      .slice(0, NIGHTLY.situations)
  // Flash can spend its budget thinking and cut the JSON short: give it room,
  // and ask the bit writer's backup model if it still comes back empty.
  let situations: string[] = []
  for (const model of [DEFAULT_MODEL, pipe.backupWriterModel(), pipe.bitWriterModel()]) {
    const sit = await callAgent({ model, temperature: model.startsWith('openai/') ? undefined : 1.0, reasoningEffort: model.startsWith('openai/gpt-5') ? 'low' : undefined, maxTokens: 4000, timeoutMs: 45_000, messages: [{ role: 'user', content: sitPrompt }] })
    situations = readSituations(sit.text)
    if (situations.length) break
    errors.push(`situations (${model}): ${sit.error ?? `unreadable answer, ${sit.text.length} chars`}`)
  }
  if (!situations.length) return { day, situations: 0, written: 0, kept: 0, indexed: await indexMissing(db, errors), errors }

  // 2. lines: one writer call per situation, in parallel
  const bank = (await pipe.funniestBank()).line
  const writer = pipe.bitWriterModel()
  const batches = await Promise.all(
    situations.map(async (situation): Promise<Line[]> => {
      const dealt = dealTechniques(NIGHTLY.linesPerSituation, Math.random, bank)
      const techniques = dealt.map((d, i) => `${i + 1}. ${d.primary.name}: ${d.primary.op}\n   shape: ${d.primary.example}`).join('\n')
      const standard = standardBlock((await liveStandard(situation, 4)).lines)
      const res = await callAgent({
        model: writer,
        temperature: writer.startsWith('openai/') ? undefined : 1.0,
        reasoningEffort: writer.startsWith('openai/gpt-5') ? 'low' : undefined,
        maxTokens: 2500,
        timeoutMs: 90_000,
        messages: [{ role: 'user', content: LINE_PROMPT.replace('{{SITUATION}}', situation).replace('{{N}}', String(dealt.length)).replace('{{TECHNIQUES}}', techniques).replace('{{STANDARD}}', standard) }],
      })
      if (res.error) {
        errors.push(`writer: ${res.error}`)
        return []
      }
      const lines = (tryParseJson<{ lines?: any[] }>(res.text)?.lines ?? []) as any[]
      return lines
        .map((l, i) => ({ situation, joke: String(l?.joke ?? '').trim(), technique: String(l?.technique ?? dealt[i]?.primary.name ?? '').slice(0, 80) }))
        .filter((l) => l.joke && words(l.joke) <= 45)
    }),
  )
  const lines = batches.flat()
  if (!lines.length) return { day, situations: situations.length, written: 0, kept: 0, indexed: await indexMissing(db, errors), errors }

  // 3. the judge: another family, scores every line
  const judge = pipe.bitJudgeModel()
  const scores = new Map<number, number>()
  const items = lines.map((l, i) => `${i}. situation: ${l.situation}\n   joke: ${l.joke}`)
  for (let i = 0; i < items.length; i += 30) {
    const res = await callAgent({
      model: judge,
      temperature: 0,
      reasoningEffort: judge.startsWith('openai/gpt-5') ? 'low' : undefined,
      maxTokens: 2000,
      timeoutMs: 60_000,
      messages: [{ role: 'user', content: JUDGE_PROMPT.replace('{{ITEMS}}', items.slice(i, i + 30).join('\n')) }],
    })
    if (res.error) errors.push(`judge: ${res.error}`)
    for (const s of tryParseJson<{ scores?: any[] }>(res.text)?.scores ?? []) {
      const n = Math.round(Number(s?.score))
      if (Number.isInteger(s?.i) && n >= 1 && n <= 10) scores.set(s.i, n)
    }
  }

  // 4. keep what clears the floor (a line the judge skipped is kept, unscored)
  const { data: dupes } = await db.from('jokenet').select('joke').in('joke', lines.map((l) => l.joke))
  const seen = new Set((dupes ?? []).map((r: any) => r.joke))
  const rows = lines
    .map((l, i) => ({ l, i, score: scores.get(i) ?? null }))
    .filter(({ l, score }) => (score == null || score >= NIGHTLY.floor) && !seen.has(l.joke))
    .map(({ l, i, score }) => ({
      situation: l.situation,
      joke: l.joke,
      move: l.technique || null,
      source: 'shutap',
      license: 'own',
      voice: 'house',
      ai_score: score,
      origin: `${origin}:${i}`,
      notes: `nightly ${day} · ${writer} · judge ${judge}`,
    }))
  let kept = 0
  if (rows.length) {
    const { data: ins, error } = await db.from('jokenet').upsert(rows, { onConflict: 'origin', ignoreDuplicates: true }).select('id')
    if (error) errors.push(`insert: ${error.message}`)
    kept = ins?.length ?? 0
  }

  const indexed = await indexMissing(db, errors)

  return { day, situations: situations.length, written: lines.length, kept, indexed, errors }
}
