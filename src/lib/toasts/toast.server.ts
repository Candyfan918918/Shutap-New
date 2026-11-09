// Shutap Toasts (Nov 6 2026): one form → one speech. Server only.
// Order: the Guard (grief in a toast is not a crisis), the Scrubber (names
// the browser didn't swap become role labels), then two writers race on the
// same prompt, every candidate goes through the checks, a judge from another
// model family picks. The speaker's stories and the true thing are put back
// word for word whatever the writer returned, so they can never drift.
import { callAgent, tryParseJson } from '@/lib/agents/gateway'
import { fill } from '@/lib/jokes/prompts.server'
import { backupWriterModel, bitJudgeModel, bitWriterModel, BIT_BUDGET } from '@/lib/bits/pipeline.server'
import { judgeStandard, standardBlock, standardLines } from '@/lib/bits/taste-bank'
import { TOAST_CUT_PROMPT, TOAST_JUDGE_PROMPT, TOAST_PROMPT, TOAST_RULES, TOAST_TONES, TOAST_TOUCH_PROMPT, TOUCH_KIND_SPEECH, TOUCH_KIND_STORY, TOUCH_KIND_TRUE } from './prompts.server'
import { OCCASION, PLACEHOLDERS, lengthWindow, toastSeconds, WPM, type CueCard, type LineSource, type Toast, type ToastForm, type ToastLine } from './shared'

export type ToastCheck = { rule: string; where: string; line: string; fatal: boolean }
export type ToastDraft = { toast: Toast; model: string; ms: number; checks: ToastCheck[]; seconds: number; cut_seconds: number }
export type ToastResult = { toast: Toast; candidates: ToastDraft[]; winner: number; why: string; ms: number; seconds: number; cut_seconds: number }

const tidy = (v: unknown): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')
const unquote = (s: string) => s.replace(/^["'“”]+|["'“”]+$/g, '').trim()
const norm = (s: string) => s.toLowerCase().replace(/[“”"']/g, '').replace(/[^\p{L}\p{N}{} ]+/gu, ' ').replace(/\s+/g, ' ').trim()
const SOURCES: LineSource[] = ['shutap', 'story', 'true_thing', 'must_say', 'bridge']

/* ───────────────────────── before writing ───────────────────────── */

export type GuardVerdict = { crisis: boolean; category: string }

/** The Guard overrides everything. A toast often remembers someone who has
 *  died ("Mom would have loved this"): that is grief, not a crisis, so the
 *  classifier is told the context. Its hard keyword signals still apply. */
export async function guardForm(form: ToastForm): Promise<GuardVerdict> {
  const { runClassifyCrisis } = await import('@/lib/agents/guard.functions')
  const text = [form.what, form.relation, ...form.stories, form.true_thing].filter(Boolean).join('\n')
  if (!text.trim()) return { crisis: false, category: 'none' }
  const framed = `(Context for the classifier: this is the text of a celebratory toast someone will give at a ${OCCASION[form.occasion].label}. Remembering a person who has died, missing someone, or grief is normal in a toast and is NOT a crisis by itself. Flag only signs that the WRITER or someone else is in danger now.)\n\n${text}`
  const r = await runClassifyCrisis(framed)
  return { crisis: !!r.crisis, category: r.category }
}

const PROTECT: [string, string][] = [['{friend}', '[friend]'], ['{partner}', '[partner]'], ['{me}', '[me]']]

export async function scrubOne(text: string): Promise<string> {
  const t = text.trim()
  if (!t) return ''
  const { runScrub } = await import('@/lib/agents/scrubber.functions')
  let protectedText = t
  for (const [ph, token] of PROTECT) protectedText = protectedText.split(ph).join(token)
  const r = await runScrub(protectedText)
  let out = keepPlaceholders(protectedText, (r.clean_text || '').trim() || protectedText)
  for (const [ph, token] of PROTECT) out = out.split(token).join(ph)
  return out
}

const PRONOUN = /^(he|she|they|him|her|them|his|hers|their|theirs)$/i
const LABEL = /^\[[^\]]+\]$/
const bare = (s: string) => s.replace(/[’']s$/i, '').replace(/^[“"(]+|[.,!?;:”")]+$/g, '').replace(/[’']s$/i, '')

/** Nov 9 2026: the Scrubber sometimes rewrote the names the browser had
 *  already swapped ("[friend]" became "[a friend]") or turned a plain "she"
 *  into "[a friend]", so the speaker's own story reached the speech as
 *  "When [a friend] was seven…". A pronoun or one of our placeholders is never
 *  a name to hide: where the Scrubber replaced only that, put the speaker's
 *  word back. Every other change it made stands. */
export function keepPlaceholders(input: string, output: string): string {
  const a = input.split(/\s+/).filter(Boolean)
  const b = output.split(/\s+/).filter(Boolean)
  const n = a.length, m = b.length
  const L: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i]![j] = a[i] === b[j] ? L[i + 1]![j + 1]! + 1 : Math.max(L[i + 1]![j]!, L[i]![j + 1]!)
  const out: string[] = []
  let i = 0, j = 0
  const ours = (w: string) => PROTECT.some(([, t]) => bare(w) === t) || PRONOUN.test(bare(w))
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { out.push(b[j]!); i++; j++; continue }
    // collect one changed stretch on each side
    const si = i, sj = j
    while ((i < n || j < m) && !(i < n && j < m && a[i] === b[j])) {
      if (j < m && (i >= n || L[i]![j + 1]! >= L[i + 1]![j]!)) j++
      else i++
    }
    const was = a.slice(si, i), now = b.slice(sj, j)
    const label = bare(now.join(' '))
    out.push(...(was.length === 1 && ours(was[0]!) && LABEL.test(label) ? was : now))
  }
  return out.join(' ')
}

/** The Scrubber on every free-text field before a model or a table sees it.
 *  Names the browser already swapped ride through as {friend}/{partner}/{me};
 *  any other name, place or contact detail becomes a role label. Must-say
 *  phrases are the speaker's exact words (a team chant, a toast line): only
 *  contact details are taken out of those. */
export async function scrubForm(form: ToastForm): Promise<ToastForm> {
  const { hasContactDetails } = await import('@/lib/agents/scrubber.functions')
  const [relation, what, true_thing, ...stories] = await Promise.all([scrubOne(form.relation), scrubOne(form.what ?? ''), scrubOne(form.true_thing), ...form.stories.map(scrubOne)])
  return {
    ...form,
    relation: relation || form.relation.replace(/[^\p{L} '-]/gu, '').slice(0, 60),
    what: what || undefined,
    true_thing,
    stories,
    must_say: form.must_say.filter((m) => !hasContactDetails(m)),
  }
}

/* ───────────────────────── the writer ───────────────────────── */

function storiesBlock(form: ToastForm): string {
  const n = OCCASION[form.occasion].stories
  const out: string[] = []
  for (let i = 0; i < Math.max(n, form.stories.length); i++) out.push(`${i + 1}. ${form.stories[i]?.trim() || '(empty)'}`)
  return out.join('\n')
}

function targetWords(seconds: number): number {
  // words at 140 a minute, less the time the pauses and laughs take
  return Math.round(((seconds * 0.82) / 60) * WPM)
}

function rulesFor(form: ToastForm): string {
  const spec = OCCASION[form.occasion]
  return fill(TOAST_RULES, {
    FRIEND_PRONOUN: form.pronouns.friend,
    PARTNER_PRONOUN_LINE: spec.partner ? `; for {partner}: ${form.pronouns.partner ?? 'they'}` : '',
  })
}

function checkLine(form: ToastForm): string {
  const c = OCCASION[form.occasion].check
  return c ? `THE OCCASION'S CHECK: ${c}` : ''
}

function lineIn(raw: any): ToastLine | null {
  const text = unquote(tidy(raw?.text))
  if (!text) return null
  const source = (SOURCES as string[]).includes(raw?.source) ? (raw.source as LineSource) : 'shutap'
  const ref = Number(raw?.ref)
  return {
    section: tidy(raw?.section) || 'line',
    text,
    source,
    ...(source === 'story' && Number.isInteger(ref) && ref >= 1 ? { ref } : {}),
    ...(raw?.pause ? { pause: true } : {}),
    ...(raw?.laugh ? { laugh: true } : {}),
    ...(raw?.glass ? { glass: true } : {}),
    ...(tidy(raw?.note) ? { note: tidy(raw.note).slice(0, 80) } : {}),
  }
}

/** The speaker's words go back in exactly as typed: a story line is matched
 *  by its ref, or by its text if the writer lost the ref. */
function restoreTheirWords(lines: ToastLine[], form: ToastForm): ToastLine[] {
  const stories = form.stories.map((s) => s.trim())
  return lines.map((l) => {
    if (l.source === 'story') {
      let ref = l.ref
      if (!ref || !stories[ref - 1]) {
        const i = stories.findIndex((s) => s && norm(s) === norm(l.text))
        ref = i >= 0 ? i + 1 : undefined
      }
      return ref && stories[ref - 1] ? { ...l, ref, text: stories[ref - 1]! } : { ...l, source: 'shutap' as LineSource, ref: undefined }
    }
    if (l.source === 'true_thing') return { ...l, text: form.true_thing.trim() }
    // a story or the true thing pasted in as a "shutap" line still counts as theirs
    const i = stories.findIndex((s) => s && norm(s) === norm(l.text))
    if (i >= 0) return { ...l, source: 'story' as LineSource, ref: i + 1, text: stories[i]! }
    if (form.true_thing.trim() && norm(form.true_thing) === norm(l.text)) return { ...l, source: 'true_thing' as LineSource, text: form.true_thing.trim() }
    return l
  })
}

/** Glasses up on the last line if the occasion ends with glasses and the writer forgot. */
function glassesUp(lines: ToastLine[], form: ToastForm): ToastLine[] {
  if (!OCCASION[form.occasion].glasses || !lines.length || lines.some((l) => l.glass)) return lines
  return [...lines.slice(0, -1), { ...lines[lines.length - 1]!, glass: true }]
}

export function parseToast(raw: unknown, form: ToastForm): Toast | null {
  const r = (raw ?? {}) as any
  let lines = (Array.isArray(r.lines) ? r.lines : []).map(lineIn).filter(Boolean) as ToastLine[]
  if (lines.length < 3) return null
  lines = restoreTheirWords(lines, form)
  // the 60-second cut is on demand (writeCut60), never written with the speech
  const cut60: ToastLine[] = []
  lines = glassesUp(lines, form)
  const cards: CueCard[] = (Array.isArray(r.cards) ? r.cards : [])
    .map((c: any) => ({ title: tidy(c?.title), keys: (Array.isArray(c?.keys) ? c.keys : []).map(tidy).filter(Boolean).slice(0, 4), land: unquote(tidy(c?.land)) }))
    .filter((c: CueCard) => c.title && c.land)
    .slice(0, 6)
  const flags = (Array.isArray(r.flags) ? r.flags : []).map((f: any) => ({ line: tidy(f?.line), why: tidy(f?.why) })).filter((f: any) => f.why)
  return { lines, cut60, cards, text_after: unquote(tidy(r.text_after)), flags }
}

/* ───────────────────────── the checks ───────────────────────── */

/** Known never-say defaults match their family of words, not one spelling. */
const NEVER_FAMILY: Record<string, RegExp> = {
  'exes': /\b(ex|exes|ex-?(girl|boy)friends?|ex-?wife|ex-?husband|former (girl|boy)friends?)\b/i,
  'the honeymoon': /\bhoneymoon/i,
  'the bachelor party': /\b(bachelor(ette)?|stag|hen) (party|night|weekend)\b|\bvegas\b/i,
  'drinking': /\b(drunk|drinking|wasted|hungover|hangover|beer pong|keg stand|tequila|blackout)/i,
  'bonuses': /\bbonus(es)?\b/i,
  'layoffs': /\b(lay-?offs?|laid off|fired|severance|downsiz)/i,
}
const neverRe = (w: string): RegExp => NEVER_FAMILY[w.toLowerCase()] ?? new RegExp(`\\b${w.replace(/^the\s+/i, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')

const PROFANITY = /\b(fuck\w*|shit\w*|bitch\w*|asshole|dick|pussy|cock|whore|slut|sex(y|ual)?|hooker|stripper|horny|naked)\b/i
const WORKPLACE = /\b(hr|human resources|salary|salaries|pay raise|promotion denied|fired|performance review)\b/i

/** Numbers the speaker gave. A number in the speech they never gave is an
 *  invented fact ("40 minutes", "3 a.m.", "turning 50"). Years are allowed. */
function allowedNumbers(form: ToastForm): Set<string> {
  const s = new Set<string>()
  for (const t of [form.what, form.relation, ...form.stories, form.true_thing, ...form.must_say]) for (const m of String(t ?? '').match(/\d[\d,.]*/g) ?? []) s.add(m.replace(/[,.]$/, '').replace(/,/g, ''))
  return s
}

function linesOf(t: Toast): { where: string; line: ToastLine }[] {
  return [
    ...t.lines.map((l, i) => ({ where: `line ${i + 1} · ${l.section}`, line: l })),
    ...t.cut60.map((l, i) => ({ where: `60s cut · line ${i + 1}`, line: l })),
  ]
}

/** The rules every line Shutap wrote must pass (never the speaker's own). */
function lineFails(text: string, form: ToastForm, nums: Set<string>): string[] {
  const out: string[] = []
  const spec = OCCASION[form.occasion]
  const wedding = spec.check?.startsWith("Grandma's") ?? false
  for (const w of new Set(form.never_say.map((x) => x.trim()).filter(Boolean))) if (neverRe(w).test(text)) out.push(`never say: "${w}"`)
  if ((wedding || form.tone !== 'roast_lite') && PROFANITY.test(text)) out.push(wedding ? "grandma's in the room" : 'language')
  if (form.occasion === 'holiday_party' && WORKPLACE.test(text)) out.push('workplace check')
  for (const m of text.match(/\{[a-z_]+\}/gi) ?? []) if (!(PLACEHOLDERS as readonly string[]).includes(m) || (m === '{partner}' && !spec.partner)) out.push(`unknown name ${m}`)
  for (const m of text.match(/\d[\d,.]*/g) ?? []) {
    const n = m.replace(/[,.]$/, '').replace(/,/g, '')
    if (n.length <= 1 || nums.has(n)) continue
    if (/^(19[5-9]\d|20\d\d|2100)$/.test(n)) continue // a year
    if (form.occasion === 'new_years' && /^(12|00|11|59)$/.test(n)) continue // midnight
    out.push(`invented number: ${m}`)
  }
  return out
}

export function checkToast(t: Toast, form: ToastForm): ToastCheck[] {
  const fails: ToastCheck[] = []
  const spec = OCCASION[form.occasion]
  const nums = allowedNumbers(form)
  const theirs = (l: ToastLine) => l.source === 'story' || l.source === 'true_thing'
  const free: { where: string; text: string; theirs: boolean }[] = [
    ...linesOf(t).map(({ where, line }) => ({ where, text: line.text, theirs: theirs(line) })),
    { where: 'the text after', text: t.text_after, theirs: false },
    ...t.cards.map((c, i) => ({ where: `card ${i + 1}`, text: `${c.title} ${c.keys.join(' ')} ${c.land}`, theirs: false })),
  ]
  for (const { where, text, theirs: mine } of free) {
    // the speaker's own words are theirs to say; the checks are on Shutap's lines
    if (!text || mine) continue
    for (const rule of lineFails(text, form, nums)) fails.push({ rule, where, line: text, fatal: true })
  }
  // their words: every story given, and the true thing, in the speech
  form.stories.forEach((s, i) => {
    if (!s.trim()) return
    if (!t.lines.some((l) => l.source === 'story' && l.ref === i + 1)) fails.push({ rule: `story ${i + 1} missing`, where: 'speech', line: s, fatal: true })
  })
  const tt = t.lines.findIndex((l) => l.source === 'true_thing')
  if (form.true_thing.trim()) {
    if (tt < 0) fails.push({ rule: 'the true thing missing', where: 'speech', line: form.true_thing, fatal: true })
    else {
      const lastStory = t.lines.reduce((m, l, i) => (l.source === 'story' ? i : m), -1)
      if (tt < lastStory) fails.push({ rule: 'the true thing comes before a story', where: `line ${tt + 1}`, line: form.true_thing, fatal: true })
    }
  }
  const speech = t.lines.map((l) => l.text).join(' ').toLowerCase()
  for (const w of form.must_say.map((x) => x.trim()).filter(Boolean)) if (!speech.includes(w.toLowerCase())) fails.push({ rule: `must say missing: "${w}"`, where: 'speech', line: '', fatal: true })
  // the clock
  const [lo, hi] = lengthWindow(form)
  const secs = toastSeconds(t.lines)
  if (secs > hi) fails.push({ rule: `runs long: ${secs}s, target ${form.length}s`, where: 'speech', line: '', fatal: true })
  // well under the target (less than 60% of it) is rewritten; a little under is only noted
  else if (secs < lo) fails.push({ rule: `runs short: ${secs}s, target ${form.length}s`, where: 'speech', line: '', fatal: secs < Math.round(form.length * 0.6) })
  if (!t.text_after) fails.push({ rule: 'no text after', where: 'the text after', line: '', fatal: false })
  if (t.cards.length < 2) fails.push({ rule: 'too few cue cards', where: 'cards', line: '', fatal: false })
  for (const f of t.flags) fails.push({ rule: `writer's flag: ${f.why}`, where: 'flag', line: f.line, fatal: false })
  for (const { where, line } of linesOf(t)) if (line.source === 'shutap' && line.text.split(/\s+/).length > 30) fails.push({ rule: 'line too long to say in one breath', where, line: line.text, fatal: false })
  return fails
}

/* ───────────────────────── write, check, judge ───────────────────────── */

function promptFor(form: ToastForm): string {
  const spec = OCCASION[form.occasion]
  const funny = form.tone !== 'heartfelt'
  return fill(TOAST_PROMPT, {
    OCCASION: spec.label,
    WHAT: form.occasion === 'other' && form.what ? ` (${form.what})` : '',
    STRUCTURE: spec.structure.join(' → '),
    RELATION: form.relation || 'friend',
    PARTNER: spec.partner ? `, and {partner}, who ${form.pronouns.friend === 'they' ? 'they are' : form.pronouns.friend === 'she' ? 'she is' : 'he is'} marrying` : '',
    STORIES: storiesBlock(form),
    TRUE_THING: form.true_thing.trim() || '(none given: end on a plain, sincere line built only from the stories)',
    TONE: TOAST_TONES[form.tone] ?? TOAST_TONES.warm_funny!,
    SECONDS: String(form.length),
    WORDS: String(targetWords(form.length)),
    MIN_WORDS: String(Math.round(targetWords(form.length) * 0.85)),
    MUST_SAY: form.must_say.length ? form.must_say.map((w) => `"${w}"`).join(', ') : '(none)',
    NEVER_SAY: form.never_say.length ? form.never_say.map((w) => `"${w}"`).join(', ') : '(none)',
    CHECK: checkLine(form),
    STANDARD: funny ? standardBlock(standardLines(4)) : '',
    RULES: rulesFor(form),
    GLASS_NOTE: spec.glasses ? (form.occasion === 'new_years' ? '; the last line lands at midnight' : '') : '; this occasion has no glasses: glass is always false',
    ENDING: spec.glasses ? 'The last line is the toast itself: "please raise your glasses… to {friend}" (and {partner} for a wedding), glass true.' : 'The last line is the close: a callback to the opening, said plainly.',
    TEXT_TO: spec.partner ? ' and {partner}' : '',
  })
}

async function writeOnce(model: string, prompt: string, timeoutMs: number): Promise<{ raw: unknown; ms: number } | null> {
  const t0 = Date.now()
  const res = await callAgent({ model, temperature: 1.0, maxTokens: 4096, timeoutMs, messages: [{ role: 'user', content: prompt }], reasoningEffort: /^openai\/gpt-5/.test(model) ? 'minimal' : undefined })
  if (res.error) { console.warn('[toast] gateway error', { model, error: res.error }); return null }
  return { raw: tryParseJson(res.text), ms: Date.now() - t0 }
}

/** Write twice, check, judge. Up to two rounds: the second tells each writer
 *  exactly which lines broke which rule. Returns null if nothing passed. */
export async function writeToast(form: ToastForm): Promise<ToastResult | null> {
  const t0 = Date.now()
  const prompt = promptFor(form)
  const models = [bitWriterModel(), backupWriterModel()]
  // a five-to-seven-minute speech needs more time than a one-minute one
  const budget = Math.round(BIT_BUDGET.write() * (form.length >= 300 ? 1.75 : form.length >= 180 ? 1.3 : 1))
  const candidates: ToastDraft[] = []
  let feedback = ''
  for (let round = 0; round < 2; round++) {
    const results = await Promise.all(models.map((m) => writeOnce(m, prompt + feedback, budget)))
    const fails: string[] = []
    results.forEach((r, i) => {
      if (!r) return
      const toast = parseToast(r.raw, form)
      if (!toast) { console.warn('[toast] unparseable', { model: models[i] }); return }
      const checks = checkToast(toast, form)
      candidates.push({ toast, model: models[i]!, ms: r.ms, checks, seconds: toastSeconds(toast.lines), cut_seconds: toastSeconds(toast.cut60) })
      for (const f of checks.filter((c) => c.fatal)) fails.push(`- ${f.where}: ${f.rule}${f.line ? ` — "${f.line.slice(0, 140)}"` : ''}`)
    })
    if (candidates.some((c) => !c.checks.some((f) => f.fatal))) break
    if (!fails.length) break
    feedback = `\n\nYOUR LAST ATTEMPT BROKE THESE RULES. Fix every one; everything else may stay:\n${[...new Set(fails)].slice(0, 12).join('\n')}\nThe stories and the true thing go in word for word. Never add a number, an event or a fact the speaker did not give. Count the words: about ${targetWords(form.length)}, never fewer than ${Math.round(targetWords(form.length) * 0.85)}.`
  }
  const pool = candidates.filter((c) => !c.checks.some((f) => f.fatal))
  if (!pool.length) return null
  let winner = 0
  let why = pool.length === 1 ? 'only one speech passed' : ''
  if (pool.length > 1) {
    const spec = OCCASION[form.occasion]
    const j = await callAgent({
      model: bitJudgeModel(), temperature: 0.2, maxTokens: 300, timeoutMs: BIT_BUDGET.judge(),
      messages: [{ role: 'user', content: fill(TOAST_JUDGE_PROMPT, {
        OCCASION: spec.label, TONE: TOAST_TONES[form.tone] ?? '', CHECK: spec.check ?? 'nothing the room would wince at.', SECONDS: String(form.length),
        STORIES: form.stories.filter((s) => s.trim()).map((s, i) => `${i + 1}. ${s}`).join(' · '), TRUE_THING: form.true_thing || '(none)',
        STANDARD: form.tone === 'heartfelt' ? '' : judgeStandard(standardLines(4)),
        TOASTS: pool.map((c, i) => `SPEECH ${i + 1} (${c.seconds}s):\n${c.toast.lines.map((l) => l.text).join('\n')}`).join('\n\n'),
      }) }],
      reasoningEffort: /^openai\/gpt-5/.test(bitJudgeModel()) ? 'low' : undefined,
    })
    const r = tryParseJson<{ ranking?: unknown; why?: unknown }>(j.text)
    const first = Array.isArray(r?.ranking) ? Number(r!.ranking[0]) : NaN
    if (Number.isInteger(first) && first >= 1 && first <= pool.length) winner = first - 1
    why = tidy(r?.why) || 'judged'
    const fewest = pool.reduce((b, c, i) => (c.checks.length < pool[b]!.checks.length ? i : b), 0)
    if (pool[winner]!.checks.length > pool[fewest]!.checks.length + 1) winner = fewest
  }
  const w = pool[winner]!
  return { toast: w.toast, candidates, winner: candidates.indexOf(w), why, ms: Date.now() - t0, seconds: w.seconds, cut_seconds: w.cut_seconds }
}

/* ───────────────────────── "funnier" on one line ───────────────────────── */

export type ToastTouchOption = { line: string; move: string }
export type TouchTarget = { kind: 'speech'; index: number; lines: ToastLine[] } | { kind: 'story'; index: number } | { kind: 'true_thing' }

/** One line's checks: never-say, the occasion's check, names, invented numbers. */
/** Numbers a funnier option may use: the form's, plus the line being made
 *  funnier and the lines around it (an edited line can carry its own). */
export function touchNumbers(form: ToastForm, nearby: string): Set<string> {
  const s = allowedNumbers(form)
  for (const m of nearby.match(/\d[\d,.]*/g) ?? []) s.add(m.replace(/[,.]$/, '').replace(/,/g, ''))
  return s
}

/** A funnier option for a toast line: the line rules, with the nearby numbers allowed. */
export function touchOptionFails(text: string, form: ToastForm, nearby: string): string | null {
  return lineFails(text, form, touchNumbers(form, nearby))[0] ?? null
}

export function checkOneLine(text: string, form: ToastForm): string | null {
  return lineFails(text, form, allowedNumbers(form))[0] ?? null
}

export async function touchToastLine(form: ToastForm, target: TouchTarget, avoid: string[] = []): Promise<ToastTouchOption[] | null> {
  const spec = OCCASION[form.occasion]
  const current = target.kind === 'story' ? (form.stories[target.index] ?? '').trim() : target.kind === 'true_thing' ? (form.true_thing ?? '').trim() : (target.lines[target.index]?.text ?? '').trim()
  if (!current) return null
  const context = target.kind === 'story'
    ? form.stories.map((s, i) => (i === target.index ? '' : s.trim() ? `story ${i + 1}: ${s}` : '')).filter(Boolean).join('\n') || '(no other stories)'
    : target.kind === 'true_thing'
    ? form.stories.map((s, i) => (s.trim() ? `story ${i + 1}: ${s}` : '')).filter(Boolean).join('\n') || '(no stories)'
    : target.lines.slice(Math.max(0, target.index - 3), target.index + 3).map((l, i) => `${i + Math.max(0, target.index - 3) === target.index ? '→ ' : ''}${l.text}`).join('\n')
  const prompt = fill(TOAST_TOUCH_PROMPT, {
    OCCASION: spec.label,
    RELATION: form.relation || 'friend',
    PARTNER: spec.partner ? ', and {partner}' : '',
    TONE: TOAST_TONES[form.tone] ?? TOAST_TONES.warm_funny!,
    MUST_SAY: form.must_say.length ? form.must_say.join(' · ') : '(none)',
    NEVER_SAY: form.never_say.length ? form.never_say.join(' · ') : '(none)',
    CHECK: checkLine(form),
    RULES: rulesFor(form),
    KIND: target.kind === 'story' ? TOUCH_KIND_STORY : target.kind === 'true_thing' ? TOUCH_KIND_TRUE : TOUCH_KIND_SPEECH,
    CONTEXT: context.slice(0, 1500),
    LINE: current,
    AVOID: avoid.length ? `ALREADY OFFERED (write different ones):\n${avoid.map((a) => `- ${a}`).join('\n')}\n` : '',
  })
  // a number already in the line or the lines around it is the speaker's, not invented
  const nums = touchNumbers(form, `${current}\n${context}`)
  for (let attempt = 0; attempt < 2; attempt++) {
    const model = attempt === 0 ? bitWriterModel() : backupWriterModel()
    const res = await callAgent({ model, temperature: 1.0, maxTokens: 900, timeoutMs: BIT_BUDGET.vary(), messages: [{ role: 'user', content: prompt }], reasoningEffort: /^openai\/gpt-5/.test(model) ? 'minimal' : undefined })
    if (res.error) { console.warn('[toast-touch] gateway error', res.error); continue }
    const raw = tryParseJson<{ options?: unknown }>(res.text)
    const opts = (Array.isArray(raw?.options) ? raw!.options : [])
      .map((o: any) => ({ line: unquote(tidy(o?.line)), move: tidy(o?.move).slice(0, 60) }))
      .filter((o) => o.line && norm(o.line) !== norm(current) && !avoid.some((a) => norm(a) === norm(o.line)))
      .filter((o) => !lineFails(o.line, form, nums).length)
    if (opts.length >= 2) return opts.slice(0, 3)
    console.warn('[toast-touch] too few options passed', { got: opts.length })
  }
  return null
}

/* ───────────────────────── the 60-second cut, on demand ───────────────────────── */

/** The cut's checks: Shutap's lines pass the line rules; the true thing and
 *  every must-say stay; it lands at a minute (unless the speaker's own words
 *  alone already run past one: then that is only noted). */
export function checkCut(cut: ToastLine[], form: ToastForm): ToastCheck[] {
  const fails: ToastCheck[] = []
  const nums = allowedNumbers(form)
  const theirs = (l: ToastLine) => l.source === 'story' || l.source === 'true_thing'
  cut.forEach((l, i) => { if (!theirs(l)) for (const rule of lineFails(l.text, form, nums)) fails.push({ rule, where: `60s cut · line ${i + 1}`, line: l.text, fatal: true }) })
  if (form.true_thing.trim() && !cut.some((l) => l.source === 'true_thing')) fails.push({ rule: 'the cut drops the true thing', where: '60s cut', line: '', fatal: true })
  const text = cut.map((l) => l.text).join(' ').toLowerCase()
  for (const w of form.must_say.map((x) => x.trim()).filter(Boolean)) if (!text.includes(w.toLowerCase())) fails.push({ rule: `must say missing: "${w}"`, where: '60s cut', line: '', fatal: true })
  form.stories.forEach((s, i) => { if (s.trim() && !cut.some((l) => l.source === 'story' && l.ref === i + 1)) fails.push({ rule: `the cut drops story ${i + 1}`, where: '60s cut', line: s, fatal: false }) })
  const secs = toastSeconds(cut)
  const floor = toastSeconds(cut.filter(theirs))
  if (secs > 64) fails.push({ rule: `the cut runs ${secs}s`, where: '60s cut', line: '', fatal: floor <= 56 })
  return fails
}

export type CutResult = { lines: ToastLine[]; seconds: number; checks: ToastCheck[]; model: string }

/** Nov 9 2026: writers keep too many laugh beats (2.5s each), so a 110-word
 *  cut of a 3-minute wedding speech still ran 65-70s and failed, and the
 *  speaker got nothing. Take out Shutap's lines until it fits: tags first,
 *  latest first. Never the speaker's words, the true thing, a must-say line,
 *  the opener or the glasses line. Only removes; never adds. */
export function trimToMinute(lines: ToastLine[], form: ToastForm): ToastLine[] {
  const must = form.must_say.map((w) => w.trim().toLowerCase()).filter(Boolean)
  const out = [...lines]
  // a must-say is kept once, in its fullest line (not a bare stub); a repeat goes
  const keeper = new Map<string, ToastLine>()
  for (const w of must) { const l = lines.filter((x) => x.text.toLowerCase().includes(w)).sort((x, y) => y.text.length - x.text.length)[0]; if (l) keeper.set(w, l) }
  const fixed = (l: ToastLine, i: number) => l.source === 'story' || l.source === 'true_thing' || l.glass || i === 0 || [...keeper.values()].includes(l)
  const repeat = (l: ToastLine) => !fixed(l, -1) && must.some((w) => l.text.toLowerCase().includes(w))
  const rank = (l: ToastLine) => (repeat(l) ? 0 : /tag/i.test(l.section) ? 1 : 2)
  // a must-say said twice reads as a slip in a minute-long toast: drop the repeat
  for (let i = out.length - 1; i >= 0; i--) if (repeat(out[i]!)) out.splice(i, 1)
  while (toastSeconds(out) > 60) {
    const next = out
      .map((l, i) => ({ l, i }))
      .filter(({ l, i }) => !fixed(l, i))
      .sort((a, b) => rank(a.l) - rank(b.l) || b.i - a.i)[0]
    if (!next) break
    out.splice(next.i, 1)
  }
  return out
}

/** "Make a 60-second version": written only when the speaker taps it. A
 *  speech that is already a minute or less is its own cut. */
export async function writeCut60(form: ToastForm, speech: ToastLine[]): Promise<CutResult | null> {
  if (toastSeconds(speech) <= 60) return { lines: speech, seconds: toastSeconds(speech), checks: [], model: 'none' }
  const prompt = fill(TOAST_CUT_PROMPT, {
    OCCASION: OCCASION[form.occasion].label,
    TONE: TOAST_TONES[form.tone] ?? TOAST_TONES.warm_funny!,
    MUST_SAY: form.must_say.length ? form.must_say.map((w) => `"${w}"`).join(', ') : '(none)',
    NEVER_SAY: form.never_say.length ? form.never_say.map((w) => `"${w}"`).join(', ') : '(none)',
    RULES: rulesFor(form),
    SPEECH: speech.map((l) => `${l.source === 'story' || l.source === 'true_thing' ? '[theirs] ' : ''}${JSON.stringify(l)}`).join('\n'),
  })
  let best: CutResult | null = null
  let feedback = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    const model = attempt === 0 ? bitWriterModel() : backupWriterModel()
    const r = await writeOnce(model, prompt + feedback, BIT_BUDGET.write())
    if (!r) continue
    const raw = (r.raw ?? {}) as any
    let lines = (Array.isArray(raw.lines) ? raw.lines : []).map(lineIn).filter(Boolean) as ToastLine[]
    if (lines.length < 2) continue
    lines = trimToMinute(glassesUp(restoreTheirWords(lines, form), form), form)
    const checks = checkCut(lines, form)
    const cut = { lines, seconds: toastSeconds(lines), checks, model }
    if (!checks.some((c) => c.fatal)) return cut
    best = best ?? cut
    feedback = `\n\nYOUR LAST CUT BROKE THESE RULES. Fix every one:\n${checks.filter((c) => c.fatal).map((c) => `- ${c.rule}`).join('\n')}\nAt most 110 words.`
  }
  return best && !best.checks.some((c) => c.fatal) ? best : null
}
