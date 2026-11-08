// Shutap Toasts (Nov 6 2026): what a toast is, shared by the browser and the
// server. No secrets here. One product: the intake form → the speech;
// holidays are occasions inside it. Each occasion is its own speech type
// (structure, lengths, defaults, checks) as Candy specified in the handoff.

export const OCCASIONS = ['best_man', 'maid_of_honor', 'parent', 'thanksgiving', 'christmas', 'holiday_party', 'new_years', 'retirement', 'birthday', 'toastmasters', 'other'] as const
export type Occasion = (typeof OCCASIONS)[number]

export const TONES = ['warm_funny', 'roast_lite', 'dry', 'heartfelt'] as const
export type Tone = (typeof TONES)[number]

export const TONE_LABEL: Record<Tone, string> = { warm_funny: 'warm & funny', roast_lite: 'roast-lite', dry: 'dry', heartfelt: 'heartfelt' }
export const TONE_SUB: Record<Tone, string> = {
  warm_funny: 'laughs, then the lump in the throat',
  roast_lite: 'roasts them, what happened, you and the room',
  dry: 'deadpan, short, lets the room do the work',
  heartfelt: 'one light laugh, mostly the true thing',
}

export type OccasionSpec = {
  id: Occasion
  label: string
  /** the speech's sections, in order (the writer follows them) */
  structure: string[]
  /** length choices in seconds; the first is not the default, `defaultLength` is */
  lengths: number[]
  defaultLength: number
  /** Toastmasters runs 5–7 min: the target is a range */
  range?: [number, number]
  /** story lines the form asks for (an empty one gets a bridge) */
  stories: number
  /** someone the toast is to, besides the main person (a wedding's partner) */
  partner: boolean
  /** never-say defaults, × to drop */
  neverSay: string[]
  /** the occasion's own check, in plain words for the writer and the judge */
  check: string | null
  /** does it end with glasses up */
  glasses: boolean
  keepsake: boolean
  /** words for the form */
  who: string
  relation: string
}

const WEDDING_NEVER = ['exes', 'the honeymoon', 'the bachelor party', 'drinking']
const WEDDING_CHECK = "Grandma's in the room: nothing a grandparent, a pastor or a ten-year-old at the wedding would wince at. No exes, honeymoon, bachelor or bachelorette party, sex, drinking stories or swearing."

export const OCCASION: Record<Occasion, OccasionSpec> = {
  best_man: {
    id: 'best_man', label: 'best man', structure: ['opening laugh', 'his stories', 'the turn', 'the true thing', 'to the partner', 'glasses'],
    lengths: [120, 180, 300], defaultLength: 180, stories: 3, partner: true, neverSay: WEDDING_NEVER, check: WEDDING_CHECK, glasses: true, keepsake: true,
    who: "the groom's first name", relation: 'who he is to you',
  },
  maid_of_honor: {
    id: 'maid_of_honor', label: 'maid of honor', structure: ['a friendship story', 'her qualities', 'the turn', 'wishes', 'glasses'],
    lengths: [120, 180, 300], defaultLength: 180, stories: 3, partner: true, neverSay: WEDDING_NEVER, check: WEDDING_CHECK, glasses: true, keepsake: true,
    who: "the bride's first name", relation: 'who she is to you',
  },
  parent: {
    id: 'parent', label: 'parent of the couple', structure: ['welcome', 'their child', 'welcoming the new family', 'wishes', 'glasses'],
    lengths: [120, 180, 300], defaultLength: 180, stories: 3, partner: true, neverSay: WEDDING_NEVER, check: WEDDING_CHECK, glasses: true, keepsake: true,
    who: "your child's first name", relation: 'you are their',
  },
  thanksgiving: {
    id: 'thanksgiving', label: 'Thanksgiving', structure: ['greeting', 'the stories the whole table knows', 'gratitude', 'glasses'],
    lengths: [60, 120], defaultLength: 120, stories: 3, partner: false, neverSay: [],
    check: 'Half the table: flag any inside joke only part of the table would get, and keep the shared story one everyone at the table can follow.',
    glasses: true, keepsake: false, who: 'who the toast is to (the family, the host, a name)', relation: 'who they are to you',
  },
  // Nov 8 2026 (Candy): Christmas is its own family occasion (the office
  // party stays holiday_party, with its workplace check).
  christmas: {
    id: 'christmas', label: 'Christmas', structure: ['greeting', 'the stories the family tells every year', 'gratitude', 'glasses'],
    lengths: [60, 120], defaultLength: 120, stories: 3, partner: false, neverSay: [],
    check: 'Half the table: flag any inside joke only part of the table would get, and keep the shared story one everyone at the table can follow. Nothing a grandparent or a ten-year-old at the table would wince at.',
    glasses: true, keepsake: false, who: 'who the toast is to (the family, the host, a name)', relation: 'who they are to you',
  },
  holiday_party: {
    id: 'holiday_party', label: 'holiday party', structure: ["the year's wins (shout-outs)", 'a laugh or two the team shared', 'thanks', 'glasses'],
    lengths: [60, 90, 120], defaultLength: 90, stories: 3, partner: false, neverSay: ['drinking', 'bonuses', 'layoffs'],
    check: 'Workplace: no one person singled out or embarrassed, shout-outs go to teams or wins, no drinking, bonus, layoff, HR or salary jokes.',
    glasses: true, keepsake: false, who: 'the team or company', relation: 'you are their',
  },
  new_years: {
    id: 'new_years', label: "New Year's", structure: ['the year in a few lines', 'the turn', 'glasses at midnight'],
    lengths: [60, 120], defaultLength: 60, stories: 3, partner: false, neverSay: [], check: null, glasses: true, keepsake: false,
    who: 'who is in the room (friends, the family, a name)', relation: 'who they are to you',
  },
  retirement: {
    id: 'retirement', label: 'retirement', structure: ['career highlights', 'the turn', 'the next chapter', 'glasses'],
    lengths: [120, 180], defaultLength: 180, stories: 3, partner: false, neverSay: [], check: null, glasses: true, keepsake: true,
    who: "the retiree's first name", relation: 'who they are to you',
  },
  birthday: {
    id: 'birthday', label: 'birthday', structure: ['who they are', 'stories', 'appreciation', 'glasses'],
    lengths: [120, 180], defaultLength: 120, stories: 3, partner: false, neverSay: [], check: null, glasses: true, keepsake: true,
    who: "the birthday person's first name", relation: 'who they are to you',
  },
  toastmasters: {
    id: 'toastmasters', label: 'Toastmasters', structure: ['opening', 'the build', 'callbacks', 'the close'],
    lengths: [360], defaultLength: 360, range: [300, 420], stories: 3, partner: false, neverSay: [], check: null, glasses: false, keepsake: false,
    who: 'what the speech is about (a person, or yourself)', relation: 'who they are to you',
  },
  other: {
    id: 'other', label: 'other', structure: ['free structure: open, the stories, the true thing, glasses'],
    lengths: [60, 120, 180], defaultLength: 120, stories: 3, partner: false, neverSay: [], check: null, glasses: true, keepsake: false,
    who: "who it's for", relation: 'who they are to you',
  },
}

export type Pronoun = 'he' | 'she' | 'they'

/** The form as the server sees it: names already swapped for {friend},
 *  {partner} and {me} by the browser. */
export type ToastForm = {
  occasion: Occasion
  /** for "other": what the occasion is, in their words */
  what?: string
  relation: string
  pronouns: { friend: Pronoun; partner?: Pronoun }
  stories: string[]
  true_thing: string
  tone: Tone
  /** seconds */
  length: number
  must_say: string[]
  never_say: string[]
}

export type LineSource = 'shutap' | 'story' | 'true_thing' | 'must_say' | 'bridge'
export type ToastLine = {
  section: string
  text: string
  source: LineSource
  /** the story's number (1-based) for source story */
  ref?: number
  /** ‖ a pause after the line */
  pause?: boolean
  /** (wait) for the laugh after the line */
  laugh?: boolean
  /** ↑ glasses up on this line */
  glass?: boolean
  /** a delivery note ("look at him") */
  note?: string
}
export type CueCard = { title: string; keys: string[]; land: string }
export type Toast = {
  lines: ToastLine[]
  cut60: ToastLine[]
  cards: CueCard[]
  text_after: string
  /** the writer's own warnings (an inside joke half the table won't get) */
  flags: { line: string; why: string }[]
}

/* ── names never leave the browser ── */
export type Names = { friend: string; partner?: string; me: string }
export const PLACEHOLDERS = ['{friend}', '{partner}', '{me}'] as const

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Browser: the person's text with their names swapped for placeholders. */
export function toPlaceholders(text: string, names: Names): string {
  let out = text
  const pairs: [string | undefined, string][] = [[names.friend, '{friend}'], [names.partner, '{partner}'], [names.me, '{me}']]
  // longest name first so "Ann" doesn't eat "Anna"
  pairs.sort((a, b) => (b[0]?.length ?? 0) - (a[0]?.length ?? 0))
  for (const [name, ph] of pairs) {
    const n = name?.trim()
    if (!n || n.length < 2) continue
    out = out.replace(new RegExp(`\\b${escapeRe(n)}\\b`, 'gi'), ph)
  }
  return out
}

/** Browser: placeholders back to names, for the screen, the prompter, copies and PDFs. */
export function fromPlaceholders(text: string, names: Partial<Names>): string {
  return text
    .replace(/\{friend\}/g, names.friend?.trim() || 'your friend')
    .replace(/\{partner\}/g, names.partner?.trim() || 'their partner')
    .replace(/\{me\}/g, names.me?.trim() || 'me')
}

/* ── the clock: ~140 words a minute, plus the pauses ── */
export const WPM = 140
export const PAUSE_S = 1.2
export const LAUGH_S = 2.5
export const GLASS_S = 2

export function lineSeconds(l: Pick<ToastLine, 'text' | 'pause' | 'laugh' | 'glass'>): number {
  const words = l.text.trim().split(/\s+/).filter(Boolean).length
  const pauses = (l.text.match(/‖/g) ?? []).length
  return (words / WPM) * 60 + (l.pause ? PAUSE_S : 0) + pauses * PAUSE_S + (l.laugh ? LAUGH_S : 0) + (l.glass ? GLASS_S : 0)
}

export function toastSeconds(lines: Pick<ToastLine, 'text' | 'pause' | 'laugh' | 'glass'>[]): number {
  return Math.round(lines.reduce((s, l) => s + lineSeconds(l), 0))
}

export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** The window a speech must land in: a range for Toastmasters, else the
 *  target with a little room under it and almost none over it. */
export function lengthWindow(form: Pick<ToastForm, 'occasion' | 'length'>): [number, number] {
  const spec = OCCASION[form.occasion]
  if (spec.range) return spec.range
  return [Math.round(form.length * 0.65), Math.round(form.length * 1.08)]
}

/** What each story box asks for, and the example shown under it. */
export type StoryPrompt = { sub: string; example: string }
const WEDDING_STORIES = (p: 'he' | 'she', them: string): StoryPrompt[] => [
  { sub: `one thing ${p} did`, example: `“In college ${p} color-coded the fridge.” One thing, one line, the way you’d tell it at the bar.` },
  { sub: `a time ${p} went all in`, example: `“${p === 'he' ? 'He' : 'She'} once drove four hours to return a borrowed drill.”` },
  { sub: `how ${p} met ${them} (optional)`, example: `“The night ${p} met them, ${p} called me to ask if ‘nice to meet you’ was too formal.”` },
]
export const STORY_PROMPTS: Record<Occasion, StoryPrompt[]> = {
  best_man: WEDDING_STORIES('he', '{partner}'),
  maid_of_honor: WEDDING_STORIES('she', '{partner}'),
  parent: [
    { sub: 'them as a kid', example: '“When he was seven he tried to sell our lawn to the neighbors.”' },
    { sub: 'them grown up', example: '“She called home every Sunday in college, mostly to ask how to do laundry.”' },
    { sub: 'the day you knew about their partner (optional)', example: '“The first time he brought her home, he cleaned the car. He has never cleaned the car.”' },
  ],
  // Nov 7 2026 (Candy): never only one story. Story 1 required, 2 and 3
  // optional but recommended, like the wedding toasts.
  thanksgiving: [
    { sub: 'one story the whole table knows', example: '“Last year the turkey caught fire and we ate pizza on the good plates.”' },
    { sub: 'something this family always does', example: '“Every year Grandpa carves, and every year he asks who brought the good knife.”' },
    { sub: 'what you’re thankful for this year', example: '“This is the first year we all fit at one table.”' },
  ],
  christmas: [
    { sub: 'the story your family tells every year', example: '“The year Dad assembled the bike on Christmas Eve and had three screws left over.”' },
    { sub: 'something this family always does', example: '“Every year Mom hides one present so well we find it in March.”' },
    { sub: 'what you’re thankful for this year', example: '“This is the first Christmas the cousins all made it home.”' },
  ],
  holiday_party: [
    { sub: 'the year’s big win', example: '“We shipped the new app in March and the servers stayed up.”' },
    { sub: 'a moment the whole team laughed', example: '“The day the coffee machine broke and we held stand-up in the parking lot.”' },
    { sub: 'what you want to thank them for', example: '“You covered for each other every time someone was out.”' },
  ],
  new_years: [
    { sub: 'the year in one line', example: '“This year half of us moved and one of us learned to make sourdough.”' },
    { sub: 'one thing that went sideways', example: '“We booked the cabin for the wrong weekend and slept in the car.”' },
    { sub: 'what you want next year', example: '“Next year, one trip together. On the right weekend.”' },
  ],
  retirement: [
    { sub: 'what they’re known for at work', example: '“She answered every email within four minutes for fifteen years.”' },
    { sub: 'a small thing everyone noticed', example: '“He kept a drawer of snacks for anyone having a bad day.”' },
    { sub: 'what they did for you (optional)', example: '“She trained half the people in this room, including me.”' },
  ],
  birthday: [
    { sub: 'one habit only they have', example: '“He reads the instructions after he has built the furniture.”' },
    { sub: 'a time they made you laugh', example: '“She once waved back at a stranger for a full block.”' },
    { sub: 'why they matter to you (optional)', example: '“He drove me to every early shift the year my car died.”' },
  ],
  toastmasters: [
    { sub: 'what happened', example: '“I asked my group chat to help me name my dog and got 140 messages and no name.”' },
    { sub: 'how it got worse', example: '“One friend made a poll. Another made a counter-poll.”' },
    { sub: 'how it ended (optional)', example: '“The dog answered to ‘hey’ for six weeks.”' },
  ],
  other: [
    { sub: 'one thing they did', example: '“He made us run laps for being early because early was showing off.”' },
    { sub: 'a time they went all in', example: '“She learned every kid’s middle name and used it when we messed up.”' },
    { sub: 'one more (optional)', example: '“He still has the whistle from 1998.”' },
  ],
}

/** The lengths a person sees, in words. */
export function lengthLabel(o: Occasion, seconds: number): string {
  const r = OCCASION[o].range
  if (r) return `${Math.round(r[0] / 60)}–${Math.round(r[1] / 60)} min`
  return seconds < 60 ? `${seconds}s` : seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds}s`
}
