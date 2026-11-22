// Shutap for small business (Nov 21 2026): writing the three skits and
// "funnier" on one line. Server only.
//
// Before writing: the Guard reads what the owner said happened (a crisis
// never sees a skit or a paywall). The day story is then kept as typed,
// names included (Candy, Nov 21 2026, the same as her Nov 16 rule for bits,
// toasts and kits); the writer is told never to name a customer in a skit.
// THE STANDARD the writer sees is the founder's rated JokeNet lines nearest
// this owner's day and business.
import { callAgent, tryParseJson } from '@/lib/agents/gateway'
import { fill } from '@/lib/jokes/prompts.server'
import { backupWriterModel, bitJudgeModel, bitWriterModel, BIT_BUDGET } from '@/lib/bits/pipeline.server'
import { standardBlock, standardLines, type TasteLine } from '@/lib/bits/taste-bank'
import { BUSINESS_TYPES, COUNTRIES, type BusinessType, type Camera, type Country, type Length, type Offer, type Voice } from './shop'
import { HOOK_WORD_CAP, checkLine, checkSet, checkSkit, parseSkits, textWordCap, type LineKey, type Skit, type SkitCheck, type SkitContext } from './skit'
import { SKIT_CAMERAS, SKIT_JUDGE_PROMPT, SKIT_PROMPT, SKIT_TOUCH_PROMPT, SKIT_VOICES, SOURCE_DAY, SOURCE_SHOP, SOURCE_SHOP_2, SOURCE_TODAY } from './prompts.server'

/** What the writer needs to know about the shop. */
export type SkitShop = { name: string; city: string; country: Country; business_type: BusinessType; known_for: string[]; voice: Voice; length: Length; camera: Camera; offer: Offer; offer_text: string }
/** What the owner said today. `day` is as typed. */
/** `topics` is what people are talking about today (news, politics, trends),
 *  from the site's own daily list; the writer never recalls news by itself. */
export type SkitAsk = { day: string; promote: string; idea: string; date: string; avoid: string[]; topics?: string[] }

export type GuardVerdict = { crisis: boolean; category: string }

/** The Guard overrides everything. A shop's bad day ("a customer screamed
 *  at me", "I could kill for a coffee") is ordinary; the classifier is told
 *  the setting. Its hard keyword signals still apply. */
export async function guardDay(day: string): Promise<GuardVerdict> {
  const text = day.trim()
  if (!text) return { crisis: false, category: 'none' }
  const { runClassifyCrisis } = await import('@/lib/agents/guard.functions')
  const framed = `(Context for the classifier: a shop owner is describing something that happened at their business today, to make a funny video about it. A rude customer, a stressful rush or an exaggerated complaint is normal and is NOT a crisis by itself. Flag only signs that the WRITER or someone else is in danger now.)\n\n${text}`
  const r = await runClassifyCrisis(framed)
  return { crisis: !!r.crisis, category: r.category }
}

/** The owner's day story as it is stored and written from: as typed. */
export function keepDay(day: string): string {
  return day.replace(/\s+/g, ' ').trim().slice(0, 600)
}

/** THE STANDARD for this ask: the founder's rated JokeNet lines nearest the
 *  owner's day and business, or the static bank when JokeNet does not answer
 *  (no key, no table, a slow gateway). Never throws. */
export async function standardFor(shop: SkitShop, ask: Pick<SkitAsk, 'day'>): Promise<{ lines: TasteLine[]; from: 'jokenet' | 'static' }> {
  const seed = [ask.day.trim(), `a ${businessName(shop.business_type)}`, shop.known_for.join(', ')].filter(Boolean).join('. ')
  try {
    const { liveStandard } = await import('@/lib/bits/jokenet.server')
    return await liveStandard(seed, 4)
  } catch {
    return { lines: standardLines(4), from: 'static' }
  }
}

const businessName = (t: BusinessType): string => (t === 'other' ? 'small business' : (BUSINESS_TYPES.find((b) => b.key === t)?.name ?? 'small business').toLowerCase())
const countryName = (c: Country): string => (c === 'other' ? 'their country' : COUNTRIES.find((x) => x.key === c)?.name ?? 'their country')

export function contextFor(shop: SkitShop, ask: Pick<SkitAsk, 'day' | 'promote'>): SkitContext {
  const offer = shop.offer === 'none' ? '' : shop.offer_text
  return { length: shop.length, camera: shop.camera, hasDay: !!ask.day.trim(), ownWords: `${ask.promote} ${offer}`, offer }
}

export function promptFor(shop: SkitShop, ask: SkitAsk, standard: TasteLine[] = standardLines(4)): string {
  const hasDay = !!ask.day.trim()
  const vars = { BUSINESS: businessName(shop.business_type), COUNTRY: countryName(shop.country) }
  const sources = (hasDay ? [SOURCE_DAY, SOURCE_TODAY, SOURCE_SHOP] : [SOURCE_TODAY, SOURCE_SHOP, SOURCE_SHOP_2]).map((s) => fill(s, vars)).join('\n')
  return fill(SKIT_PROMPT, {
    NAME: shop.name, CITY: shop.city, ...vars,
    KNOWN_FOR: shop.known_for.length ? shop.known_for.map((k) => `- ${k}`).join('\n') : '(the owner listed nothing: stay with the everyday truth of this kind of business)',
    VOICE: SKIT_VOICES[shop.voice] ?? SKIT_VOICES['warm']!,
    CAMERA: SKIT_CAMERAS[shop.camera] ?? SKIT_CAMERAS['me']!,
    LENGTH: String(shop.length),
    TEXT_WORDS: String(textWordCap(shop.length)),
    DAY: hasDay ? ask.day : '(the owner did not say: write no "day" skit)',
    PROMOTE: ask.promote.trim() || '(nothing today: promote nothing)',
    OFFER: shop.offer === 'none' || !shop.offer_text.trim() ? '(none: mention no offer)' : shop.offer_text,
    DATE: ask.date,
    IDEA: ask.idea.trim() ? `The owner tapped this idea for today: ${ask.idea.trim()}. Use it for the "today" skit.` : '',
    TOPICS: ask.topics?.length ? ask.topics.slice(0, 6).map((t) => `- ${t}`).join('\n') : '(none listed today)',
    SOURCES: sources,
    STANDARD: standardBlock(standard),
    AVOID: ask.avoid.length ? `\nTHE OWNER ALREADY SAW THESE AND ASKED FOR DIFFERENT ONES. Do not reuse their premise:\n${ask.avoid.map((a) => `- ${a}`).join('\n')}\n` : '',
  })
}

export type SkitDraft = { skits: Skit[]; model: string; ms: number; checks: SkitCheck[] }
/** How the shown set was chosen. `from` is the candidate each of the three
 *  skits came from; `judge` is null when there was nothing to choose between
 *  or the judge did not answer (then the first writer's clean set is shown). */
export type SkitPick = { skits: Skit[]; from: number[]; judge: string | null; why: string | null; clean: number }
export type SkitRun = { candidates: SkitDraft[]; winner: number; ms: number; standard: 'jokenet' | 'static'; pick: SkitPick | null; /** writers that gave nothing usable, and why */ lost: string[] }
export type SkitResult = { skits: Skit[]; candidates: SkitDraft[]; winner: number; ms: number; standard: 'jokenet' | 'static'; pick: SkitPick; lost: string[] }

/** Who writes the skits. The first is the site's main writer. The second is
 *  a strong model from another family (SKIT_SECOND_MODEL to change it), not
 *  the cheap backup the bits race with: on Nov 21 2026 the cheap one wrote
 *  every skit the founder saw. */
export function skitWriterModels(): string[] {
  const first = bitWriterModel()
  const wanted = (process.env['SKIT_SECOND_MODEL'] ?? '').trim() || 'google/gemini-3-flash-preview'
  const second = wanted === first ? backupWriterModel() : wanted
  return [first, second]
}
/** The judge is never one of the writers: it would pick its own draft. */
function skitJudgeModel(writers: string[]): string {
  const j = bitJudgeModel()
  if (!writers.includes(j)) return j
  return ['openai/gpt-5-mini', 'google/gemini-2.5-flash'].find((m) => !writers.includes(m) && m.split('/')[0] !== j.split('/')[0]) ?? 'openai/gpt-5-mini'
}

async function writeOnce(model: string, prompt: string, timeoutMs: number): Promise<{ raw: unknown; ms: number } | { error: string }> {
  const t0 = Date.now()
  const thinks = /^openai\/(gpt-5|o[1-9])/i.test(model)
  // a reasoning model spends part of its answer thinking: it gets more room,
  // or the three skits come back cut off and cannot be read
  const res = await callAgent({ model, temperature: 1.0, maxTokens: thinks ? 6000 : 3000, timeoutMs, messages: [{ role: 'user', content: prompt }], reasoningEffort: thinks ? 'low' : undefined })
  if (res.error) { console.warn('[skit] gateway error', { model, error: res.error }); return { error: String(res.error).slice(0, 80) } }
  return { raw: tryParseJson(res.text), ms: Date.now() - t0 }
}

/** Two writers, the checks, up to two rounds: the second tells each writer
 *  which lines broke which rule. The set with no broken rule wins (the first
 *  writer's when both pass). Null when nothing passed: the owner is never
 *  shown a skit that broke a rule. */
export async function writeSkits(shop: SkitShop, ask: SkitAsk): Promise<SkitResult | null> {
  const r = await writeSkitsLab(shop, ask)
  return r.winner < 0 || !r.pick ? null : { skits: r.pick.skits, candidates: r.candidates, winner: r.winner, ms: r.ms, standard: r.standard, pick: r.pick, lost: r.lost }
}

/** The same run with nothing hidden: every candidate and what the checks
 *  flagged, and winner -1 when none passed. The lab shows it all. */
export async function writeSkitsLab(shop: SkitShop, ask: SkitAsk): Promise<SkitRun> {
  const t0 = Date.now()
  const standard = await standardFor(shop, ask)
  const prompt = promptFor(shop, ask, standard.lines)
  const ctx = contextFor(shop, ask)
  const models = skitWriterModels()
  const lost: string[] = []
  const candidates: SkitDraft[] = []
  let feedback = ''
  for (let round = 0; round < 2; round++) {
    const results = await Promise.all(models.map((m) => writeOnce(m, prompt + feedback, BIT_BUDGET.write())))
    const fails: string[] = []
    results.forEach((r, i) => {
      if ('error' in r) { lost.push(`${models[i]}: ${r.error}`); return }
      const skits = parseSkits(r.raw)
      if (!skits) { console.warn('[skit] unparseable', { model: models[i] }); lost.push(`${models[i]}: unreadable`); return }
      const checks = [...checkSet(skits, ctx), ...skits.flatMap((s) => checkSkit(s, ctx).map((c) => ({ ...c, where: `"${s.title}" ${c.where}` })))]
      candidates.push({ skits, model: models[i]!, ms: r.ms, checks })
      for (const c of checks) fails.push(`- ${c.where}: ${c.rule}${c.line ? ` — "${c.line.slice(0, 140)}"` : ''}`)
    })
    // stop when the first writer has a clean set (the backup alone is not
    // enough to stop on: its sets are the weaker ones), or nothing broke
    if (candidates.some((c) => !c.checks.length && c.model === models[0])) break
    if (!fails.length) break
    feedback = `\n\nYOUR LAST ATTEMPT BROKE THESE RULES. Fix every one; everything else may stay:\n${[...new Set(fails)].slice(0, 12).join('\n')}`
  }
  const pick = await pickSkits(shop, ask, candidates, ctx, skitJudgeModel(models))
  const winner = pick ? (pick.from.every((f) => f === pick.from[0]) ? pick.from[0]! : candidates.findIndex((c) => !c.checks.length)) : -1
  return { candidates, winner, ms: Date.now() - t0, standard: standard.from, pick, lost }
}

/** Choose what the owner sees from the clean sets. One clean set: that one.
 *  More: the judge picks the funnier skit for each place; the mix is shown
 *  only if it passes the set checks, else the judge's best whole set. */
async function pickSkits(shop: SkitShop, ask: SkitAsk, candidates: SkitDraft[], ctx: SkitContext, model: string): Promise<SkitPick | null> {
  const clean = candidates.map((c, i) => ({ c, i })).filter((x) => !x.c.checks.length && x.c.skits.length === 3)
  if (!clean.length) return null
  const first = clean[0]!
  const plain: SkitPick = { skits: first.c.skits, from: [first.i, first.i, first.i], judge: null, why: null, clean: clean.length }
  if (clean.length < 2) return plain
  const drafts = clean.map((x, n) => `DRAFT ${n + 1}\n` + x.c.skits.map((k, p) => `  place ${p + 1}: hook "${k.hook}" | 1 "${k.shots[0]?.text}" | 2 "${k.shots[1]?.text}" | 3 "${k.shots[2]?.text}"`).join('\n')).join('\n\n')
  const res = await callAgent({
    model, temperature: 0, maxTokens: 1200, timeoutMs: BIT_BUDGET.judge(), reasoningEffort: /^openai\/(gpt-5|o[1-9])/i.test(model) ? 'low' : undefined,
    messages: [{ role: 'user', content: fill(SKIT_JUDGE_PROMPT, { BUSINESS: businessName(shop.business_type), LENGTH: String(shop.length), DAY: ask.day.trim() || '(nothing)', VOICE: SKIT_VOICES[shop.voice] ?? SKIT_VOICES['warm']!, N: String(clean.length), DRAFTS: drafts }) }],
  })
  if (res.error) { console.warn('[skit] judge error', { model, error: res.error }); return plain }
  const v = tryParseJson(res.text) as { places?: unknown; best?: unknown; why?: unknown } | null
  const at = (x: unknown) => (Number.isInteger(x) && (x as number) >= 1 && (x as number) <= clean.length ? clean[(x as number) - 1]! : null)
  const places = Array.isArray(v?.places) && v.places.length === 3 ? v.places.map(at) : null
  const why = typeof v?.why === 'string' ? v.why.slice(0, 200) : null
  if (places && places.every(Boolean)) {
    const skits = places.map((x, p) => x!.c.skits[p]!)
    const mixed = new Set(places.map((x) => x!.i)).size > 1
    if (!mixed || !checkSet(skits, ctx).length) return { skits, from: places.map((x) => x!.i), judge: model, why, clean: clean.length }
  }
  const best = at(v?.best)
  return best ? { skits: best.c.skits, from: [best.i, best.i, best.i], judge: model, why, clean: clean.length } : plain
}

const unquote = (s: string): string => s.replace(/\s+/g, ' ').trim().replace(/^["'“”]+|["'“”]+$/g, '').trim()

/** "Funnier" on one line: up to three other versions that pass the same
 *  checks, none the same as the line or as one already tried. The code word
 *  line is built from the owner's own offer and is not rewritten here. */
export async function touchSkitLine(shop: SkitShop, skit: Skit, key: Exclude<LineKey, 'code'>, current: string, tried: string[], ctx: SkitContext): Promise<string[] | null> {
  const where = key === 'hook' ? 'the hook, on screen first' : `the text on shot ${key.slice(-1)}`
  const prompt = fill(SKIT_TOUCH_PROMPT, {
    NAME: shop.name, BUSINESS: businessName(shop.business_type), VOICE: SKIT_VOICES[shop.voice] ?? SKIT_VOICES['warm']!,
    SKIT: [skit.hook, ...skit.shots.map((s) => s.text)].map((l, i) => `${i === 0 ? 'hook' : `shot ${i}`}: ${l}`).join('\n'),
    WHERE: where, LINE: current, AVOID: tried.length ? tried.map((t) => `"${t}"`).join(' · ') : '(nothing yet)',
    TEXT_WORDS: String(key === 'hook' ? HOOK_WORD_CAP : textWordCap(shop.length)),
  })
  const res = await callAgent({ model: bitWriterModel(), temperature: 1.0, maxTokens: 400, timeoutMs: BIT_BUDGET.write(), messages: [{ role: 'user', content: prompt }], reasoningEffort: /^openai\/gpt-5/.test(bitWriterModel()) ? 'minimal' : undefined })
  if (res.error) { console.warn('[skit] touch gateway error', res.error); return null }
  const parsed = tryParseJson<{ options?: unknown }>(res.text)
  const seen = new Set([current, ...tried].map((t) => t.toLowerCase().trim()))
  const out: string[] = []
  for (const o of Array.isArray(parsed?.options) ? parsed!.options : []) {
    const line = typeof o === 'string' ? unquote(o) : ''
    if (!line || seen.has(line.toLowerCase())) continue
    if (checkLine(key, line, ctx)) continue
    seen.add(line.toLowerCase())
    out.push(line)
  }
  return out.length ? out.slice(0, 3) : null
}
