// Shutap for small business: what a skit is, and the checks every skit
// passes before an owner sees it (Nov 21 2026). Pure and safe in the browser.
//
// A skit is one short vertical video the owner films in 3 shots. Shutap
// drafts three skits a day from three places: what the owner said happened
// today, something on today's calendar, and the shop itself. The owner picks
// one, makes each line sound like them ("Funnier", edit), films, posts.
//
// The lines the owner approves, in order: the hook, the text on each of the
// 3 shots, and (unless they chose no code word) the code word line.
import { SHOTS, codeWordLine, type Camera, type Length, type Offer } from './shop'

export const SKIT_SOURCES = ['day', 'today', 'shop'] as const
export type SkitSource = (typeof SKIT_SOURCES)[number]

/** What the card says above each option. */
export const SOURCE_LABEL: Record<SkitSource, string> = {
  day: 'FROM YOUR DAY',
  today: 'FROM TODAY',
  shop: 'FROM YOUR SHOP',
}

export type SkitShot = {
  /** the words on screen during this shot */
  text: string
  /** what to film, said to the owner: one action, no dialogue */
  action: string
}

export type Skit = {
  source: SkitSource
  /** a few words; the card's title */
  title: string
  /** one line on what the joke is */
  pitch: string
  /** on screen for the first two seconds */
  hook: string
  shots: SkitShot[]
  /** the code word customers say: one to three plain words from the skit */
  word: string
  /** under 100 characters, for the post */
  caption: string
}

/** How long on-screen text may run, by video length: a 7-second video gives
 *  each shot about two seconds. */
export function textWordCap(length: Length): number {
  return length === 7 ? 7 : length === 15 ? 11 : 15
}
export const HOOK_WORD_CAP = 12
export const CAPTION_CHAR_CAP = 100

const tidy = (v: unknown): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')
export const wordCount = (s: string): number => (s.trim() ? s.trim().split(/\s+/).length : 0)

/** Read one skit out of a model's JSON. Null when a part is missing. */
export function parseSkit(raw: unknown): Skit | null {
  const r = raw as Record<string, unknown> | null
  if (!r || typeof r !== 'object') return null
  const source = tidy(r['source']) as SkitSource
  if (!SKIT_SOURCES.includes(source)) return null
  const shotsIn = Array.isArray(r['shots']) ? (r['shots'] as unknown[]) : []
  const shots = shotsIn.map((s) => ({ text: tidy((s as any)?.text), action: tidy((s as any)?.action) })).filter((s) => s.text && s.action)
  if (shots.length !== SHOTS) return null
  const skit: Skit = { source, title: tidy(r['title']), pitch: tidy(r['pitch']), hook: tidy(r['hook']), shots, word: tidy(r['word']).replace(/^["“'”]+|["“'”.!]+$/g, ''), caption: tidy(r['caption']) }
  if (!skit.title || !skit.pitch || !skit.hook || !skit.word) return null
  return skit
}

/** Read the three skits. Null unless there are exactly three. */
export function parseSkits(raw: unknown): Skit[] | null {
  const list = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.skits) ? (raw as any).skits : null
  if (!list) return null
  const skits = (list as unknown[]).map(parseSkit).filter((s): s is Skit => !!s)
  return skits.length === 3 ? skits : null
}

export type SkitCheck = { rule: string; where: string; line: string }
export type SkitContext = {
  length: Length
  camera: Camera
  /** true when the owner said what happened today */
  hasDay: boolean
  /** words the owner themselves gave (their promotion, their offer): a
   *  price or a percent may appear only if it is in here */
  ownWords: string
}

const EMOJI = /\p{Extended_Pictographic}/u
const PRICE = /(\$\s?\d|\d\s?%|\d+\s?(dollars|bucks|percent)\b|\bfree\b|\bhalf off\b|\bbogo\b)/i
// Promises a shop cannot make in a joke: health, results, guarantees.
const CLAIM = /\b(cure[sd]?|heal(s|ed|ing)?|guarantee[sd]?|clinically|lose weight|weight loss|anti-?aging|detox|doctor recommended|risk[- ]free|100% safe)\b/i
// A person's body, looks, mind or money is never the target.
const AT_A_PERSON = /\b(fat|ugly|stupid|idiot|dumb|moron|broke|poor|crazy|psycho|karen)\b/i
const FACE = /\b(face|faces|smile|smiles|smiling|wink|eye contact|look(s|ing)? (at|into) (the )?camera|selfie|expression|stare[sd]?|staring)\b/i
const TEAM = /\b(teammate|coworker|co-worker|employee|staff|someone else|a friend|another person|your (barista|stylist|mechanic|server))\b/i

/** The fatal checks. A skit that breaks one is rewritten or dropped; it is
 *  never shown. */
export function checkSkit(s: Skit, ctx: SkitContext): SkitCheck[] {
  const out: SkitCheck[] = []
  const cap = textWordCap(ctx.length)
  const screen: [string, string][] = [['hook', s.hook], ...s.shots.map((sh, i) => [`shot ${i + 1} text`, sh.text] as [string, string])]
  if (wordCount(s.hook) > HOOK_WORD_CAP) out.push({ rule: `the hook is at most ${HOOK_WORD_CAP} words`, where: 'hook', line: s.hook })
  s.shots.forEach((sh, i) => { if (wordCount(sh.text) > cap) out.push({ rule: `on-screen text is at most ${cap} words for a ${ctx.length}-second video`, where: `shot ${i + 1} text`, line: sh.text }) })
  for (const [where, line] of screen) {
    if (EMOJI.test(line) || line.includes('#')) out.push({ rule: 'no emojis or hashtags in on-screen text', where, line })
  }
  const own = ctx.ownWords.toLowerCase()
  const everything: [string, string][] = [...screen, ['title', s.title], ['pitch', s.pitch], ['caption', s.caption], ...s.shots.map((sh, i) => [`shot ${i + 1} action`, sh.action] as [string, string])]
  for (const [where, line] of everything) {
    const price = line.match(PRICE)
    if (price && !own.includes(price[0].toLowerCase().trim())) out.push({ rule: 'no price, discount or giveaway the owner did not give', where, line })
    if (CLAIM.test(line)) out.push({ rule: 'no health, results or guarantee claims', where, line })
    if (AT_A_PERSON.test(line)) out.push({ rule: 'the joke is at the situation, never at a person', where, line })
  }
  const words = wordCount(s.word)
  if (words < 1 || words > 3) out.push({ rule: 'the code word is one to three words', where: 'word', line: s.word })
  if (s.caption.length > CAPTION_CHAR_CAP) out.push({ rule: `the caption is under ${CAPTION_CHAR_CAP} characters`, where: 'caption', line: s.caption })
  s.shots.forEach((sh, i) => {
    if (ctx.camera === 'faceless' && FACE.test(sh.action)) out.push({ rule: 'no faces: film hands and products only', where: `shot ${i + 1} action`, line: sh.action })
    if (ctx.camera === 'me' && TEAM.test(sh.action)) out.push({ rule: 'one person films alone: no second person in any shot', where: `shot ${i + 1} action`, line: sh.action })
  })
  if (s.source === 'day' && !ctx.hasDay) out.push({ rule: 'no "from your day" skit when the owner did not say what happened', where: 'source', line: s.title })
  return out
}

/** The three as a set: one from each place it can come from. With a day
 *  story the three are day, today and shop; without one there is no day
 *  skit, and today or shop gives the third. */
export function checkSet(skits: Skit[], ctx: SkitContext): SkitCheck[] {
  const out: SkitCheck[] = []
  const n = (src: SkitSource) => skits.filter((s) => s.source === src).length
  if (ctx.hasDay && n('day') !== 1) out.push({ rule: 'exactly one skit comes from what the owner said happened today', where: 'set', line: '' })
  if (n('today') < 1) out.push({ rule: 'one skit comes from today (the season, the calendar)', where: 'set', line: '' })
  if (n('shop') < 1) out.push({ rule: 'one skit comes from the shop itself', where: 'set', line: '' })
  const titles = new Set(skits.map((s) => s.title.toLowerCase()))
  if (titles.size !== skits.length) out.push({ rule: 'three different skits', where: 'set', line: '' })
  return out
}

/** The lines the owner approves, in order. */
export function skitLines(s: Skit, offer: Offer, gift: string): { key: string; label: string; text: string }[] {
  const lines = [
    { key: 'hook', label: 'The hook', text: s.hook },
    ...s.shots.map((sh, i) => ({ key: `shot${i + 1}`, label: `Shot ${i + 1} text`, text: sh.text })),
  ]
  const code = codeWordLine(offer, s.word, gift)
  if (code) lines.push({ key: 'code', label: 'The code word', text: code })
  return lines
}
export const LINE_KEYS = ['hook', 'shot1', 'shot2', 'shot3', 'code'] as const
export type LineKey = (typeof LINE_KEYS)[number]

/** One edited or "funnier" line, checked the same way as the original. */
export function checkLine(key: LineKey, text: string, ctx: SkitContext): string | null {
  const t = text.trim()
  if (!t) return 'a line cannot be empty'
  if (EMOJI.test(t) || t.includes('#')) return 'no emojis or hashtags in on-screen text'
  if (CLAIM.test(t)) return 'no health, results or guarantee claims'
  if (AT_A_PERSON.test(t)) return 'the joke is at the situation, never at a person'
  const cap = key === 'hook' ? HOOK_WORD_CAP : key === 'code' ? 20 : textWordCap(ctx.length)
  if (wordCount(t) > cap) return `at most ${cap} words`
  return null
}
