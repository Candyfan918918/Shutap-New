// Client-safe joke-card vocabulary. No authored content, no prompts here —
// those live in deck.server.ts so the fallback pools never ship to a browser.

/* ─────────────────────────── the three slots ───────────────────────────
   Three cards, always, in this order: the take, the clapback, the roast.
   Everybody gets the same three — what changes between tiers is what you
   are allowed to DO with them, never how many you may read. */

export type SlotKey = 'the_take' | 'the_clapback' | 'the_roast'

/* `subtitle` is what the card BACK shows under the label, and it is permanent
   rather than a tooltip: a guest makes their single most important choice on
   their first visit, so they cannot be required to discover what "the take"
   means. `brief` is for the model; `subtitle` is for the reader. */
export const SLOTS: { key: SlotKey; label: string; subtitle: string; brief: string; accent: string }[] = [
  {
    key: 'the_take',
    label: 'the take',
    subtitle: 'what actually happened here',
    brief: 'name what actually happened, drily, the way a friend would say it back to her',
    accent: '#e7548a',
  },
  {
    key: 'the_clapback',
    label: 'the clapback',
    subtitle: "what you wish you'd said",
    brief: 'the line she wishes she had said in the moment — one sentence, in quotes',
    accent: '#c1216b',
  },
  {
    key: 'the_roast',
    label: 'the roast',
    subtitle: 'the joke',
    brief: 'roast the object or the move itself — the chart, the sigh, the rule — never the person',
    accent: '#7F77DD',
  },
]

export const SLOT_KEYS: SlotKey[] = SLOTS.map((s) => s.key)

/** A thin spill: fewer words than a premise pass can find four observations
 *  in. The set still runs — a four-word spill has produced approved cards —
 *  but the row is flagged and the surface nudges the writer to the scan,
 *  which asks the questions the spill left out. */
export const THIN_INPUT_WORDS = 8
export function isThinInput(clean: string): boolean {
  return clean.trim().split(/\s+/).filter(Boolean).length < THIN_INPUT_WORDS
}

/* ── legacy vocabulary ──
   Cards written before the deck settled on three slots carry one of these
   seven angles. Nothing generates them any more, but stored rows still read
   back through the label/accent lookups below. */
export const ANGLES: [slug: string, label: string, brief: string][] = [
  ['target_the_behavior', 'the behaviour', 'roast the specific thing they did'],
  ['target_the_guilt_trip', 'the guilt trip', 'roast the manipulation move'],
  ['target_the_double_standard', 'the double standard', 'roast the rule that applies to her and not to them'],
  ['target_the_timing', 'the timing', 'roast when they chose to do it'],
  ['absurdist_escalation', 'the escalation', 'extrapolate the behaviour to something ridiculous'],
  ['deadpan_understatement', 'the deadpan', 'the flattest possible statement of the absurdity'],
  ['the_comeback', 'the comeback', 'the line she wishes she had said in the moment'],
]

export const ANGLE_LABEL: Record<string, string> = {
  ...Object.fromEntries(ANGLES.map((a) => [a[0], a[1]])),
  ...Object.fromEntries(SLOTS.map((s) => [s.key, s.label])),
}

const ACCENTS: Record<string, string> = {
  ...Object.fromEntries(SLOTS.map((s) => [s.key, s.accent])),
  target_the_behavior: '#e7548a',
  target_the_guilt_trip: '#c87c4a',
  target_the_double_standard: '#c1216b',
  target_the_timing: '#c87c4a',
  absurdist_escalation: '#7F77DD',
  deadpan_understatement: '#7F77DD',
  the_comeback: '#c1216b',
}

export function angleLabel(angle: string): string {
  return ANGLE_LABEL[angle] ?? angle
}

const SUBTITLES: Record<string, string> = Object.fromEntries(
  SLOTS.map((s) => [s.key, s.subtitle]),
)

/** The permanent line under a back's label. Empty for the legacy angles,
 *  which predate the labelled backs and are only ever read back revealed. */
export function angleSubtitle(angle: string): string {
  return SUBTITLES[angle] ?? ''
}

/* ─────────────────────── the shuffle ───────────────────────
   Position is randomised per set. The label carries the identity, so position
   doesn't need to — and randomising is what keeps `first_flip_slot` free of a
   positional confound, which is the one number this deck exists to measure.

   Seeded off the set id rather than Math.random so a re-render, a remount or
   a second tab all deal the same set in the same order. */

function hash(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h || 1
}

export function shuffleSlots<T>(items: readonly T[], seed: string): T[] {
  const out = items.slice()
  let state = hash(seed)
  for (let i = out.length - 1; i > 0; i--) {
    // xorshift32, so successive draws in one pass don't correlate
    state ^= state << 13; state >>>= 0
    state ^= state >>> 17
    state ^= state << 5; state >>>= 0
    const j = state % (i + 1)
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

export function angleAccent(angle: string): string {
  return ACCENTS[angle] ?? '#e7548a'
}

export const ARCHETYPE_LABEL: Record<string, string> = {
  uninvited_visitor: 'Uninvited Visitor',
  backhanded_grandma: 'Backhanded Grandma',
  boundary_bulldozer: 'Boundary Bulldozer',
  favoritism_broadcaster: 'Favoritism Broadcaster',
  grandbaby_countdown_clock: 'Grandbaby Countdown Clock',
  silent_treatment_strategist: 'Silent Treatment Strategist',
  general: 'general',
}

export type JokeCard = {
  id: string | null
  position: number
  angle: string
  angleLabel: string
  text: string
  used_fallback: boolean
  judge_score: number | null
  saved: boolean
  room_id?: string | null
  day?: string
  /** The set list groups by these: a card is read back under the situation
   *  it was written for, never as a loose line. */
  set_id?: string | null
  situation?: string
  /** Which face the card turns over to. The writer sets it per card; a card
   *  without one — every row written before the two faces — is a headline. */
  layout?: CardLayout
  /** headline: the phrase inside `text` lit in plum — the turn the judge
   *  marked. Ignored unless it appears in `text` verbatim. */
  lit?: string
  /** stack: the setup, in the voice, above the punchline. */
  setup?: string
  /** stack: two to four words, set one to a line. */
  punchline?: string
}

export type CardLayout = 'headline' | 'stack'

/** What a card's face actually draws, with the fallbacks settled once so the
 *  screen and the export can never disagree.
 *
 *  The writer's own fields win when it sets them. A card without them — which
 *  today is every card — is read from its text: a short closing sentence
 *  after a setup turns over as a stack, and anything else is a headline with
 *  its turn lit (see deriveLit). A `lit` that isn't in the text lights
 *  nothing. */
export type ResolvedFace =
  | { layout: 'headline'; text: string; lit: string }
  | { layout: 'stack'; setup: string; punchline: string }

export function resolveFace(
  card: Pick<JokeCard, 'text' | 'layout' | 'lit' | 'setup' | 'punchline'>,
): ResolvedFace {
  const punchline = card.punchline?.trim() ?? ''
  if (card.layout === 'stack' && punchline) {
    return { layout: 'stack', setup: card.setup?.trim() ?? '', punchline }
  }
  if (!card.layout) {
    const stack = deriveStack(card.text)
    if (stack) return { layout: 'stack', ...stack }
  }
  const lit = card.lit ?? deriveLit(card.text)
  return { layout: 'headline', text: card.text, lit: lit && card.text.includes(lit) ? lit : '' }
}

/** The text as sentences, each keeping its closing punctuation and quotes. */
function sentences(text: string): string[] {
  return (text.match(/[^.!?…]+(?:[.!?…]+["”’)]*|$)/g) ?? []).map((s) => s.trim()).filter(Boolean)
}

const words = (s: string) => s.split(/\s+/).filter(Boolean)

/** A stack wants a setup and a two-to-four-word closing sentence — "i was.
 *  past tense." A card with a stage direction on its own line stays a
 *  headline: the line break is the clapback's, not the stack's. */
function deriveStack(text: string): { setup: string; punchline: string } | null {
  const t = text.trim()
  if (/\n/.test(t)) return null
  const parts = sentences(t)
  if (parts.length < 2) return null
  // Walk back from the end: the punchline is the closing run of short
  // sentences ("i was. past tense." is two), as long as it stays 2–4 words.
  let k = parts.length
  let n = 0
  while (k > 1) {
    const w = words(parts[k - 1]!).length
    if (n + w > 4) break
    n += w
    k--
  }
  if (n < 2) return null
  const setup = parts.slice(0, k).join(' ')
  if (words(setup).length < 3) return null
  return { setup, punchline: parts.slice(k).join(' ') }
}

/** The turn to light in plum, read from the text: the closing sentence, else
 *  a quoted phrase that isn't the whole card, else the clause after the last
 *  comma or dash. Empty when none of those is a real part of the joke. */
export function deriveLit(text: string): string {
  const t = text.trim()
  const parts = sentences(t)
  const last = parts[parts.length - 1] ?? ''
  if (parts.length >= 2 && last.length < t.length * 0.7) return balanced(last)
  const quoted = t.match(/“[^”]{2,}”|"[^"]{2,}"/)
  if (quoted && quoted[0].length < t.length * 0.7) return quoted[0]
  const clause = t.match(/(?:,|—|–|;)\s*([^,—–;]{8,})$/)
  if (clause && clause[1]!.length < t.length * 0.6) return balanced(clause[1]!.trim())
  return ''
}

/** Drop a closing quote whose opening one fell outside the phrase, so a lit
 *  tail of a quoted line doesn't end on a dangling mark. */
function balanced(s: string): string {
  if (s.endsWith('”') && !s.includes('“')) return s.slice(0, -1)
  if (s.endsWith('"') && (s.match(/"/g) ?? []).length % 2 === 1) return s.slice(0, -1)
  return s
}

export type JokeTier = 'guest' | 'free' | 'paying'

/* ─────────────────────────── the ladder ───────────────────────────
   One place for the numbers every sheet, page and policy quotes. The server
   enforces them (jokes.functions.ts reads DAILY_SETS; useDeck reads
   FLIPS_PER_SET); the copy below only describes them. */

/** situations a day — the same five at every tier. Money buys the clean
 *  card and the mirror, never more jokes. */
export const DAILY_SETS: Record<JokeTier, number> = { guest: 5, free: 5, paying: 5 }
/** cards turned over per situation (of three). A guest turns over one; the
 *  other two stay face-down behind the alias — that is the sign-up wall, and
 *  it is a strong one because they can see the two labelled backs they
 *  cannot turn. An alias turns over all three. */
export const FLIPS_PER_SET: Record<JokeTier, number> = { guest: 1, free: 3, paying: 3 }

/** What a membership buys, stated as behaviour. */
export const MEMBER_BENEFITS: { line: string; detail: string }[] = [
  { line: 'every card with no shutap mark', detail: 'guest and free cards carry the mark; yours are clean, on screen and in every export.' },
  { line: 'the mirror reading — what your situations keep saying', detail: 'everything you keep goes into a private record it reads patterns back from.' },
]


/** What never costs anything, at any tier. */
export const ALWAYS_FREE = [
  'typing what happened, with identifying details scrubbed first',
  'five situations a day, at every tier — flip one card as a guest, all three with an alias',
  'reading the cards you flipped, for as long as you like',
  'sharing or saving the card you flipped, with the shutap mark',
]

/* ─────────────────────────── the two asks ───────────────────────────
   Every button and every offer line on this surface says one of these two
   things, in these words. A guest is asked for an alias, and what the alias
   buys is FLIPPING ALL THREE. An alias is asked for a membership, and what
   the membership buys is THE MIRROR READING — with the joke-card room and
   pixels named alongside it, so the offer is never only the mirror. */

export const ALIAS_OFFER = {
  cta: 'flip all three — free',
  /** "an alias flips all three, and keeps them." */
  line: 'an alias flips all three, and keeps them.',
}

export const MEMBER_OFFER = {
  cta: 'open the mirror reading',
  /** what a membership buys, in one breath — cards first, then the mirror */
  line: 'every set kept clean — no mark — and the mirror reading the patterns across all of it.',
}

/* ─────────────────────── the daily budget, as the client sees it ───────────────────────
   Resolved and enforced on the server; the browser only carries a copy so it
   can say "that's today's lot" the moment someone presses enter, instead of
   sending a spill off to be scrubbed, classified and written for nothing. */

export type JokeUsage = {
  /** cards written today — a deal costs three */
  cards_used: number
  cards_cap: number
  /** situations opened today */
  sets_used: number
  sets_cap: number
  /** ISO instant the counter rolls over, in the caller's own day */
  resets_at: string
}

export type LimitReason = 'daily_sets' | 'daily_cards'

/** Why the next deal would be refused, or null while there is room for one. */
export function usageBlock(u: JokeUsage | null | undefined): LimitReason | null {
  if (!u) return null
  if (u.sets_used >= u.sets_cap) return 'daily_sets'
  if (u.cards_used + 3 > u.cards_cap) return 'daily_cards'
  return null
}

/** A copy of the counter is only worth consulting before it rolls over. */
export function usageIsCurrent(u: JokeUsage | null | undefined, now = Date.now()): boolean {
  if (!u) return false
  const t = Date.parse(u.resets_at)
  return Number.isFinite(t) && now < t
}

/* ─────────────────────────── what money buys ───────────────────────────
   The clean card, and room. Reading, sharing and saving the cards you flipped
   are free at every tier, guests included — a guest exports at the free spec,
   marked. Every export is the same phone-screen picture, 1080×1920; the paid
   difference is the absent mark, never the size. The alias gate stands in
   front of the other two cards, not the export. */

export type ExportSpec = {
  width: number
  height: number
  mark: boolean
  /** "1080×1920 · includes the shutap mark" — shown under the save button. */
  note: string
}

export const EXPORT: Record<Exclude<JokeTier, 'guest'>, ExportSpec> = {
  free: {
    width: 1080,
    height: 1920,
    mark: true,
    note: '1080×1920 · includes the shutap mark',
  },
  paying: {
    width: 1080,
    height: 1920,
    mark: false,
    note: 'clean · 1080×1920 · no mark on any of them',
  },
}

export function exportSpec(tier: JokeTier): ExportSpec {
  return tier === 'paying' ? EXPORT.paying : EXPORT.free
}
