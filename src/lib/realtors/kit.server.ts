// Shutap for Realtors (Nov 5 2026): one listing → one kit, in one tone.
// Server only. Two writers race on the same prompt, the judge (another model
// family) picks, and every line passes the checks before anyone sees it:
// fair housing, nothing added, must-say present, never-say absent.
import { callAgent, tryParseJson } from '@/lib/agents/gateway'
import { fill } from '@/lib/jokes/prompts.server'
import { backupWriterModel, bitJudgeModel, bitWriterModel, BIT_BUDGET } from '@/lib/bits/pipeline.server'
import { judgeStandard, standardBlock, standardLines } from '@/lib/bits/taste-bank'
import { KIT_JUDGE_PROMPT, KIT_PROMPT, KIT_RULES, KIT_TONES, KIT_TOUCH_PROMPT } from './prompts.server'
import { fairHousingHit, listingFacts, type Kit, type Labeled, type Listing, type ListingControls, type Shot } from './listing'

export type KitCheck = { rule: string; where: string; line: string }
export type KitDraft = { kit: Kit; skipped: { where: string; what: string }[]; model: string; ms: number; checks: KitCheck[] }
export type KitResult = { kit: Kit; skipped: { where: string; what: string }[]; candidates: KitDraft[]; winner: number; why: string; ms: number }

const tidy = (v: unknown): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')
const labeled = (v: unknown): Labeled[] => (Array.isArray(v) ? v : []).map((x: any) => ({ label: tidy(x?.label), text: tidy(x?.text) })).filter((x) => x.label && x.text)

export function listingBlock(l: Listing): string {
  const lines = listingFacts(l)
  if (l.description) lines.push(`description: ${l.description.slice(0, 1500)}`)
  if (l.photos.length) lines.push(`photos: ${l.photos.join(' · ')}`)
  return lines.join('\n')
}

function parseKit(raw: unknown): { kit: Kit; skipped: { where: string; what: string }[] } | null {
  const r = (raw ?? {}) as any
  const shots: Shot[] = (Array.isArray(r.walkthrough?.shots) ? r.walkthrough.shots : [])
    .map((s: any) => ({ where: tidy(s?.where), action: tidy(s?.action), line: tidy(s?.line).replace(/^["']|["']$/g, ''), seconds: tidy(s?.seconds), fact: tidy(s?.fact) || undefined }))
    .filter((s: Shot) => s.where && s.line)
  const hooks = (Array.isArray(r.hooks) ? r.hooks : []).map((h: any) => ({ line: tidy(h?.line).replace(/^["']|["']$/g, ''), move: tidy(h?.move) })).filter((h: any) => h.line)
  const kit: Kit = {
    walkthrough: { shots, cut15: tidy(r.walkthrough?.cut15), cut60: tidy(r.walkthrough?.cut60) },
    voiceover: labeled(r.voiceover),
    hooks,
    open_house: labeled(r.open_house),
    posts: labeled(r.posts),
    straight: tidy(r.straight),
  }
  if (shots.length < 5 || hooks.length < 2 || kit.posts.length < 4 || kit.open_house.length < 3 || !kit.straight) return null
  const skipped = (Array.isArray(r.skipped) ? r.skipped : []).map((s: any) => ({ where: tidy(s?.where), what: tidy(s?.what) })).filter((s: any) => s.where)
  return { kit, skipped }
}

/** Every line of a kit, with where it lives, for the checks. */
export function kitLines(kit: Kit): { where: string; line: string }[] {
  const out: { where: string; line: string }[] = []
  kit.walkthrough.shots.forEach((s, i) => out.push({ where: `walkthrough · shot ${i + 1}`, line: `${s.action} ${s.line}` }))
  kit.voiceover.forEach((v) => out.push({ where: `voiceover · ${v.label}`, line: v.text }))
  kit.hooks.forEach((h, i) => out.push({ where: `hook ${i + 1}`, line: h.line }))
  kit.open_house.forEach((v) => out.push({ where: `open house · ${v.label}`, line: v.text }))
  kit.posts.forEach((v) => out.push({ where: `posts · ${v.label}`, line: v.text }))
  out.push({ where: 'straight copy', line: kit.straight })
  return out
}

/** Numbers the listing gives (price digits, beds, baths, sqft, year). A
 *  number in the kit that the listing never gave is "added". Small numbers
 *  (shot counts, seconds, 1–4) are allowed. */
function allowedNumbers(l: Listing, c: ListingControls): Set<string> {
  const s = new Set<string>()
  const add = (t: string | null | undefined) => { for (const m of String(t ?? '').match(/\d[\d,]*/g) ?? []) s.add(m.replace(/,/g, '')) }
  add(l.price); add(l.address); add(l.description); add(l.note); add(l.hoa); add(l.taxes); add(l.mls); l.photos.forEach(add); (l.open_houses ?? []).forEach(add); c.must_say.forEach(add)
  for (const n of [l.beds, l.baths, l.sqft, l.year_built, l.lot_sqft]) if (n !== null && n !== undefined) s.add(String(n))
  return s
}

/** The checks. Returns what failed; an empty list is a pass. */
export function checkKit(kit: Kit, l: Listing, c: ListingControls): KitCheck[] {
  const fails: KitCheck[] = []
  const nums = allowedNumbers(l, c)
  const never = c.never_say.map((w) => w.toLowerCase()).filter(Boolean)
  for (const { where, line } of kitLines(kit)) {
    const fh = fairHousingHit(line)
    if (fh) fails.push({ rule: `fair housing: "${fh}"`, where, line })
    const lower = line.toLowerCase()
    for (const w of never) if (lower.includes(w)) fails.push({ rule: `never say: "${w}"`, where, line })
    for (const m of line.match(/\d[\d,]*/g) ?? []) {
      const n = m.replace(/,/g, '')
      if (n.length <= 1 || nums.has(n)) continue
      if (/^\d{1,2}$/.test(n) && Number(n) <= 60) continue // seconds, counts, hours
      if (/^(1[5-9]|20)\d{2}$/.test(n) && nums.size === 0) continue
      // a dollar figure or a square-footage that is not the listing's is a changed number
      const at = line.indexOf(m)
      const before = line.slice(Math.max(0, at - 3), at)
      const after = line.slice(at + m.length, at + m.length + 16).toLowerCase()
      const listingLike = /\$\s?$/.test(before) || /^\s*(?:k|m)\b/i.test(after) || /^\s*(?:sq|square|sqft|bed|bath|lot)/.test(after) || n.length >= 5
      fails.push({ rule: `${listingLike ? 'changed' : 'added'} number: ${m}`, where, line })
    }
  }
  // must-say words: present somewhere in each output that can carry them
  const outputs: [string, string][] = [
    ['walkthrough', kit.walkthrough.shots.map((s) => s.line).join(' ')],
    ['voiceover', kit.voiceover.map((v) => v.text).join(' ')],
    ['hooks', kit.hooks.map((h) => h.line).join(' ')],
    ['open house', kit.open_house.map((v) => v.text).join(' ')],
    ['posts', kit.posts.map((v) => v.text).join(' ')],
    ['straight copy', kit.straight],
  ]
  for (const w of c.must_say.filter(Boolean)) {
    const lw = w.toLowerCase()
    for (const [name, text] of outputs) if (name !== 'hooks' && !text.toLowerCase().includes(lw)) fails.push({ rule: `must say missing: "${w}"`, where: name, line: '' })
  }
  return fails
}

async function writeOnce(model: string, prompt: string, timeoutMs: number): Promise<{ raw: unknown; ms: number } | null> {
  const t0 = Date.now()
  const res = await callAgent({ model, temperature: 1.0, maxTokens: 4500, timeoutMs, messages: [{ role: 'user', content: prompt }], reasoningEffort: /^openai\/gpt-5/.test(model) ? 'minimal' : undefined })
  if (res.error) { console.warn('[kit] gateway error', { model, error: res.error }); return null }
  return { raw: tryParseJson(res.text), ms: Date.now() - t0 }
}

/** The whole thing: write twice, check, judge. `lab` returns every candidate. */
export async function writeKit(l: Listing, c: ListingControls): Promise<KitResult | null> {
  const t0 = Date.now()
  const prompt = fill(KIT_PROMPT, {
    LISTING: listingBlock(l),
    NOTE: l.note || '(none)',
    TONE: KIT_TONES[c.tone] ?? KIT_TONES.funny,
    ROAST_HOUSE: c.roast_house ? 'on' : 'off: never a joke at the property itself',
    ROAST_NEIGHBORHOOD: c.roast_neighborhood ? 'on' : 'off: never a joke at the area',
    MENTION_PRICE: c.mention_price ? 'on' : 'off: the price may appear only as a fact, never inside a joke',
    MUST_SAY: c.must_say.length ? c.must_say.map((w) => `"${w}"`).join(', ') : '(none)',
    NEVER_SAY: c.never_say.length ? c.never_say.map((w) => `"${w}"`).join(', ') : '(none)',
    STANDARD: c.tone === 'professional' || c.tone === 'luxury' ? '' : standardBlock(standardLines(5)),
    RULES: KIT_RULES,
  })
  const models = [bitWriterModel(), backupWriterModel()]
  const candidates: KitDraft[] = []
  const fatal = (f: KitCheck) => f.rule.startsWith('fair housing') || f.rule.startsWith('never say') || f.rule.startsWith('added number') || f.rule.startsWith('changed number')
  // Up to two rounds: the second tells each writer exactly which lines broke
  // which rule, so a changed number or a fair-housing word is corrected,
  // not merely scored. A realtor's numbers must match the listing exactly.
  let feedback = ''
  for (let round = 0; round < 2; round++) {
    const results = await Promise.all(models.map((m) => writeOnce(m, prompt + feedback, BIT_BUDGET.write())))
    const roundFails: string[] = []
    results.forEach((r, i) => {
      if (!r) return
      const parsed = parseKit(r.raw)
      if (!parsed) { console.warn('[kit] unparseable', { model: models[i] }); return }
      const checks = checkKit(parsed.kit, l, c)
      candidates.push({ kit: parsed.kit, skipped: parsed.skipped, model: models[i]!, ms: r.ms, checks })
      for (const f of checks.filter(fatal)) roundFails.push(`- ${f.where}: ${f.rule}${f.line ? ` — "${f.line.slice(0, 140)}"` : ''}`)
    })
    if (candidates.some((k) => !k.checks.some(fatal))) break
    if (!roundFails.length) break
    feedback = `\n\nYOUR LAST ATTEMPT BROKE THESE RULES. Fix every one; everything else may stay:\n${[...new Set(roundFails)].slice(0, 12).join('\n')}\nEvery number must be exactly as THE LISTING states it (price, beds, baths, square feet, lot, year, HOA, taxes). Never round, convert, estimate or add a number.`
  }
  if (!candidates.length) return null
  const pool = candidates.filter((k) => !k.checks.some(fatal))
  if (!pool.length) return null
  let winner = 0
  let why = pool.length === 1 ? 'only one kit passed' : ''
  if (pool.length > 1) {
    const j = await callAgent({
      model: bitJudgeModel(), temperature: 0.2, maxTokens: 300, timeoutMs: BIT_BUDGET.judge(),
      messages: [{ role: 'user', content: fill(KIT_JUDGE_PROMPT, { LISTING: listingBlock(l), TONE: KIT_TONES[c.tone] ?? '', STANDARD: judgeStandard(standardLines(4)), KITS: pool.map((k, i) => `KIT ${i + 1}:\n${JSON.stringify(k.kit)}`).join('\n\n') }) }],
      reasoningEffort: /^openai\/gpt-5/.test(bitJudgeModel()) ? 'low' : undefined,
    })
    const r = tryParseJson<{ ranking?: unknown; why?: unknown }>(j.text)
    const first = Array.isArray(r?.ranking) ? Number(r!.ranking[0]) : NaN
    if (Number.isInteger(first) && first >= 1 && first <= pool.length) winner = first - 1
    why = tidy(r?.why) || 'judged'
    // the judge may not pick a kit with more check failures than another
    const fewest = pool.reduce((b, k, i) => (k.checks.length < pool[b]!.checks.length ? i : b), 0)
    if (pool[winner]!.checks.length > pool[fewest]!.checks.length + 1) winner = fewest
  }
  const w = pool[winner]!
  return { kit: w.kit, skipped: w.skipped, candidates, winner: candidates.indexOf(w), why, ms: Date.now() - t0 }
}

/* ── AI on demand inside a kit: one line, three ways ── */
export type KitTouchOption = { line: string; move: string }

/** The one-line checks: fair housing, never-say, numbers not the listing's. */
export function checkLine(line: string, l: Listing, c: ListingControls, nearby = ''): string | null {
  const fh = fairHousingHit(line)
  if (fh) return `fair housing: "${fh}"`
  const lower = line.toLowerCase()
  for (const w of c.never_say.map((x) => x.toLowerCase()).filter(Boolean)) if (lower.includes(w)) return `never say: "${w}"`
  const nums = allowedNumbers(l, c)
  // a number already in the line being made funnier (or around it) is the agent's
  for (const m of nearby.match(/\d[\d,]*/g) ?? []) nums.add(m.replace(/,/g, ''))
  for (const m of line.match(/\d[\d,]*/g) ?? []) {
    const n = m.replace(/,/g, '')
    if (n.length <= 1 || nums.has(n)) continue
    if (/^\d{1,2}$/.test(n) && Number(n) <= 60) continue
    return `number not on the listing: ${m}`
  }
  return null
}

export async function touchKitLine(l: Listing, c: ListingControls, where: string, context: string, current: string, avoid: string[] = []): Promise<KitTouchOption[] | null> {
  const prompt = fill(KIT_TOUCH_PROMPT, {
    LISTING: listingBlock(l),
    NOTE: l.note || '(none)',
    TONE: KIT_TONES[c.tone] ?? KIT_TONES.funny,
    ROAST_HOUSE: c.roast_house ? 'on' : 'off: never a joke at the property itself',
    ROAST_NEIGHBORHOOD: c.roast_neighborhood ? 'on' : 'off: nothing against the area',
    MENTION_PRICE: c.mention_price ? 'on' : 'off: the price is never the joke',
    MUST_SAY: c.must_say.length ? c.must_say.join(' · ') : '(none)',
    NEVER_SAY: c.never_say.length ? c.never_say.join(' · ') : '(none)',
    RULES: KIT_RULES,
    WHERE: where,
    CONTEXT: context.slice(0, 1500),
    LINE: current || '(empty: write it fresh)',
    AVOID: avoid.length ? `ALREADY OFFERED (write different ones):\n${avoid.map((a) => `- ${a}`).join('\n')}\n` : '',
  })
  for (let attempt = 0; attempt < 2; attempt++) {
    const model = attempt === 0 ? bitWriterModel() : backupWriterModel()
    const res = await callAgent({ model, temperature: 1.0, maxTokens: 900, timeoutMs: BIT_BUDGET.vary(), messages: [{ role: 'user', content: prompt }], reasoningEffort: /^openai\/gpt-5/.test(model) ? 'minimal' : undefined })
    if (res.error) { console.warn('[kit-touch] gateway error', res.error); continue }
    const raw = tryParseJson<{ options?: unknown }>(res.text)
    const opts = (Array.isArray(raw?.options) ? raw!.options : [])
      .map((o: any) => ({ line: tidy(o?.line).replace(/^["'“]|["'”]$/g, ''), move: tidy(o?.move).slice(0, 60) }))
      .filter((o) => o.line && o.line.toLowerCase() !== current.toLowerCase() && !avoid.some((a) => a.toLowerCase() === o.line.toLowerCase()))
      .filter((o) => !checkLine(o.line, l, c, `${current}\n${context}`))
    if (opts.length >= 2) return opts.slice(0, 3)
    console.warn('[kit-touch] too few options passed', { got: opts.length })
  }
  return null
}
