// The technique bank for the bit writer (bit-1.3).
//
// Distilled from the /funniest series (src/lib/seo/funniest/*.ts): each entry
// there breaks a famously funny person's habit down into a named technique
// with an original Shutap example. Only the operation travels here — no
// person's name, no quoted material. The examples are Shutap's own lines from
// those pages, shown to the writer as the SHAPE, never to be reused.
//
// Why a bank, dealt by code: with a list of moves in the prompt, the model
// picks the same default every time ("He is a [job title] of [noun]" — a
// finding in a costume). Code deals one technique per bit, from different
// families, so the four bits are four different operations, and the model
// executes an operation instead of choosing one. Same principle as the card
// voices: sampled by code, never by the model.

export type TechniqueFit = 'any' | 'other' | 'self'

export interface Technique {
  id: string
  /** Techniques in one family are too alike to sit in the same deal. */
  family: string
  /** 'other': needs another person in the story. 'self': the teller is the
   *  subject. 'any': works on both. */
  fit: TechniqueFit
  name: string
  /** What the line does, as an instruction. */
  op: string
  /** One original line showing the shape, from the /funniest pages. */
  example: string
}

export const TECHNIQUES: Technique[] = [
  {
    id: 'fake-precision',
    family: 'number',
    fit: 'any',
    name: 'FAKE PRECISION',
    op: 'Swap every vague amount for a number one notch too specific: a clock time, a count, a day number. Say it like evidence. Keep it believable; slightly too exact reads as true.',
    example: 'Day 41 of my feud with the self-checkout. Today the unexpected item in the bagging area was my own elbow.',
  },
  {
    id: 'break-the-math',
    family: 'number',
    fit: 'any',
    name: 'BREAK THE MATH',
    op: 'State confident figures that cannot be right — percentages past 100, a cost converted into an absurd unit — in the flat voice of a stat on a broadcast. Never point out the error.',
    example: 'My morning routine is 60 percent coffee and the other 70 percent looking for my keys.',
  },
  {
    id: 'paper-trail',
    family: 'artifact',
    fit: 'any',
    name: 'THE PAPER TRAIL',
    op: 'Show the note, label, sign or receipt left at the scene, quoted word for word, written in the most official voice possible. The paperwork is the joke, not the act.',
    example: 'I ate the last slice at 2 a.m. and left the box in the fridge with a note: "Slice No. 8 has been removed for testing. Management."',
  },
  {
    id: 'follow-their-rule',
    family: 'logic',
    fit: 'other',
    name: 'FOLLOW THEIR RULE EXACTLY',
    op: 'Take the rule, excuse or deal the other person gave and follow it to the letter, so the worst part of the outcome lands back on them. Report it with no commentary.',
    example: 'He said we split all credit 50/50, so I forwarded him exactly half of the client\'s complaint email. He got the paragraphs in all caps.',
  },
  {
    id: 'act-out-their-logic',
    family: 'logic',
    fit: 'other',
    name: 'ACT OUT THEIR LOGIC',
    op: 'Apply the other person\'s own excuse to something the teller does, literally, and report the result flat. The excuse cannot be argued with without arguing with itself.',
    example: 'My landlord says the radiator works if you hold your hand on it for a full minute. This month I\'m paying rent by holding the check near his mailbox.',
  },
  {
    id: 'win-on-a-technicality',
    family: 'logic',
    fit: 'any',
    name: 'WIN ON A TECHNICALITY',
    op: 'Answer the challenge ("how do you know", "where did you get that", "what is wrong with you") with a literal place, time or object, completely sincere.',
    example: 'My boss asked where I got the idea I\'m underpaid. From my banking app, mostly, around the 26th of every month.',
  },
  {
    id: 'test-nobody-passes',
    family: 'logic',
    fit: 'other',
    name: 'THE TEST NOBODY PASSES',
    op: 'Turn the other person\'s rule into a prize for anyone who has never broken it, then show who does not qualify.',
    example: 'The group chat banned complaining about the wedding, so I offered $20 to anyone who has never complained about a wedding. The bride still hasn\'t claimed it.',
  },
  {
    id: 'size-gap',
    family: 'scale',
    fit: 'other',
    name: 'THE SIZE GAP',
    op: 'Put the size of someone\'s response right next to the size of the problem. Give only the two sizes, in concrete detail. Skip the verdict.',
    example: 'My HOA sent a certified letter, four pages, double-sided, about a pumpkin that was on my step for three days.',
  },
  {
    id: 'mock-epic',
    family: 'scale',
    fit: 'any',
    name: 'MOCK-EPIC',
    op: 'Announce the small win or the petty fight in world-historic terms: a treaty, a title fight, a heist, a moon landing. Commit to it fully, no wink.',
    example: 'My landlord fixed the dryer in under three weeks. If he can do it, I believe the UN can do anything.',
  },
  {
    id: 'name-what-it-isnt',
    family: 'scale',
    fit: 'any',
    name: 'NAME WHAT IT ISN\'T',
    op: 'Instead of saying it is not a big deal, name two specific, enormous emergencies it is not. Keep the voice flat.',
    example: 'I burned the rolls. It\'s rolls. Nobody\'s calling the Coast Guard. The smoke detector and I have already moved on.',
  },
  {
    id: 'smaller-worry',
    family: 'scale',
    fit: 'any',
    name: 'THE SMALLER WORRY',
    op: 'At the worst moment of the story, have the teller worry out loud about something far too small for it.',
    example: 'The fire alarm went off in the middle of my cooking video, which I\'m counting as my first standing ovation.',
  },
  {
    id: 'object-with-a-motive',
    family: 'object',
    fit: 'any',
    name: 'THE OBJECT WITH A MOTIVE',
    op: 'The object in the story wants something, waits for its moment, picks a side, or gets one line of its own. Keep it in character for the whole tag.',
    example: 'This avocado was rock-hard for six days and turned to soup in the eleven minutes I spent at the gym.',
  },
  {
    id: 'underreaction',
    family: 'calm',
    fit: 'any',
    name: 'THE UNDERREACTION',
    op: 'Narrate the disaster as if the teller has fully settled into it, with one domestic detail. Totally calm. The audience fills the gap.',
    example: 'My flight\'s been delayed nine hours, so I\'ve unpacked. I have a side of the gate now. The guy at B14 and I wave.',
  },
  {
    id: 'sales-pitch',
    family: 'reframe',
    fit: 'other',
    name: 'THE SALES PITCH',
    op: 'Describe the bad deal the way the other side would sell it: the perks first, in loving detail, the catch slipped in last.',
    example: 'The airline made it right with a $9 food voucher, valid in the terminal I now live in.',
  },
  {
    id: 'comic-triple',
    family: 'format',
    fit: 'any',
    name: 'THE TRIPLE THAT SWERVES',
    op: 'Two plain items of the same shape, then a third that looks like it belongs and gives the game away. Keep the first two boring on purpose. Nothing after the third.',
    example: 'I labeled the three leftover containers in the fridge Monday, Tuesday and Evidence.',
  },
  {
    id: 'flipped-ratio',
    family: 'measure',
    fit: 'other',
    name: 'THE FLIPPED RATIO',
    op: 'Describe what the other person did as a flipped ratio: the most of the part that doesn\'t matter in the least of the part that does.',
    example: 'He can fit the most Google Docs comments into the fewest finished paragraphs of anyone I have ever met.',
  },
  {
    id: 'one-word-answer',
    family: 'brevity',
    fit: 'any',
    name: 'THE ONE-WORD ANSWER',
    op: 'Give someone\'s long question or long speech in full, every clause, then the teller\'s one-word answer and nothing after it.',
    example: 'My aunt asked whether I\'m still "doing the internet thing," whether it pays, whether I\'ve thought about nursing, and whether I\'m eating. I said, "Yes."',
  },
  {
    id: 'flat-reintroduction',
    family: 'brevity',
    fit: 'other',
    name: 'THE FLAT REINTRODUCTION',
    op: 'When someone gets it wrong again and again, answer with a calm, formal one-line introduction, as if meeting for the first time. Nothing else.',
    example: 'The courier left my parcel at 14B for the third Tuesday running, so I taped a note to my door: "Hello. I\'m 14A. We\'ve met."',
  },
  {
    id: 'three-witnesses',
    family: 'pov',
    fit: 'any',
    name: 'THREE WITNESSES',
    op: 'Tell the same moment from three points of view, ending with the smallest or strangest witness in the room.',
    example: 'From my side, $34 a month back. From the gym\'s side, they lost a guy who filled his water bottle and left. From the water fountain\'s side, it lost its most loyal customer.',
  },
  {
    id: 'last-word',
    family: 'grave',
    fit: 'any',
    name: 'THE LAST WORD',
    op: 'Give the thing that finally broke, or the side that was right all along, one last line that settles an old complaint.',
    example: 'When my houseplant finally gives up, the label on the pot is going to read: "I did mention the sunlight."',
  },
  {
    id: 'ride-the-comparison',
    family: 'world',
    fit: 'any',
    name: 'RIDE THE COMPARISON',
    op: 'Take one comparison from the story\'s own world (or a word someone in the story used) and stay inside it for three beats, each with a detail only that world has.',
    example: 'My check-engine light has been on so long it\'s a tenant now. It gets mail. I\'m fairly sure it voted in the last HOA election.',
  },
  {
    id: 'wrong-object',
    family: 'artifact',
    fit: 'any',
    name: 'THE WRONG OBJECT',
    op: 'At the normal or happy occasion, put one object that quietly contradicts it. Say the normal thing. Never explain the object.',
    example: 'Birthday party Saturday. Cake, balloons, a bounce house, and a Venmo QR code taped to the bounce house.',
  },
  {
    id: 'promote-the-flaw',
    family: 'self',
    fit: 'self',
    name: 'PROMOTE THE FLAW',
    op: 'The thing people tease the teller about turns out to be what saved them. Name the specific trouble it kept them out of.',
    example: 'My car is so ugly that in six years not one person has asked to borrow it.',
  },
  {
    id: 'shrink-the-category',
    family: 'self',
    fit: 'self',
    name: 'SHRINK THE CATEGORY',
    op: 'The teller claims a skill, then keeps adding conditions until the category is tiny. Stop on the most visual condition.',
    example: 'I\'m not a fast runner. I\'m a fast runner for a guy holding two bags of groceries and a cat carrier.',
  },
  {
    id: 'confess-then-blame',
    family: 'self',
    fit: 'self',
    name: 'CONFESS, THEN BLAME THE MATERIAL',
    op: 'Admit the embarrassing thing outright, then give one precise detail that makes it the other side\'s fault.',
    example: 'Yes, I fell asleep during my cousin\'s wedding video. In my defense, the drone shot of the parking lot ran eleven minutes.',
  },
]

/** Self-only techniques are dealt less often: most stories are about
 *  someone else, and the writer can always fall back to the backup. A
 *  technique from the /funniest bank (family starts with "funniest:") is
 *  dealt at half the weight of a hand-tuned one. */
const WEIGHT: Record<TechniqueFit, number> = { any: 3, other: 3, self: 1 }
const weightOf = (t: Technique) => (t.family.startsWith('funniest:') ? Math.max(1, WEIGHT[t.fit] / 2) : WEIGHT[t.fit])

export type Dealt = { primary: Technique; backup: Technique }

/**
 * Deals `n` techniques for `n` bits: every primary from a different family,
 * and each bit's backup an 'any' technique from yet another family, so a
 * primary that does not fit the story (it needs another person and there is
 * none) still has somewhere to go. `rand` is injectable for tests.
 */
export function dealTechniques(
  n = 4,
  rand: () => number = Math.random,
  extra: Technique[] = [],
  /** per-technique multipliers learned from the founder's daily ratings */
  learned: Record<string, number> = {},
): Dealt[] {
  const pool = extra.length ? [...TECHNIQUES, ...extra] : TECHNIQUES
  const used = new Set<string>()
  const w = (t: Technique) => weightOf(t) * (learned[t.id] ?? 1)
  const draw = (pool: Technique[]): Technique => {
    const open = pool.filter((t) => !used.has(t.family))
    const from = open.length ? open : pool
    const total = from.reduce((s, t) => s + w(t), 0)
    let r = rand() * total
    for (const t of from) {
      r -= w(t)
      if (r < 0) {
        used.add(t.family)
        return t
      }
    }
    const last = from[from.length - 1]!
    used.add(last.family)
    return last
  }
  const primaries = Array.from({ length: n }, () => draw(pool))
  const anyFit = pool.filter((t) => t.fit === 'any')
  return primaries.map((primary) => ({ primary, backup: draw(anyFit) }))
}

/** The {{TECHNIQUES}} block of the bit prompt. */
export function formatTechniques(dealt: Dealt[]): string {
  return dealt
    .map(
      ({ primary: p, backup: b }, i) =>
        `BIT ${i + 1} — ${p.name}: ${p.op}\n  shape: ${p.example}\n  backup if it cannot fit this story honestly — ${b.name}: ${b.op}\n  shape: ${b.example}`,
    )
    .join('\n\n')
}

/* ── the deterministic craft checks (bit-1.3) ──
   Both are CRAFT failures: they reorder, never block. A bit that fails one
   is shown only when no bit passes everything. */

/** Institution vocabulary the model reaches for when it has no picture: the
 *  costume. Matched on whole words (a `~` suffix is a stem). A token the
 *  story itself used is the story's vocabulary and is skipped. */
export const COSTUME_TOKENS = [
  'audit~', 'auditor', 'consultant', 'consulting', 'department', 'protocol', 'forensic', 'magistrate',
  'indictment', 'defendant', 'tribunal', 'bureaucra~', 'compliance', 'ceo', 'coo', 'cfo', 'chief operations',
  'chief executive', 'officer', 'corporate', 'corporation', 'human resources', 'legal instrument', 'quality control',
  'committee', 'press office', 'regulator', 'inspector', 'hazardous', 'biohazard', 'crime scene', 'philanthropist',
  'jurisdiction', 'litigation', 'subpoena', 'affidavit', 'verdict', 'presiding', 'clerk', 'branch office',
  'shareholder', 'stakeholder', 'firing squad', 'high-security', 'bunker', 'suspension', 'eviction notice',
  // bit-1.5: the costumes the Oct 29 blind eval was full of
  'inventor~', 'merger', 'acquisition', 'liquidat~', 'notari~', 'chain of custody', 'evidence', 'case file',
  'itemi~', 'municipal', 'transaction', 'purchase agreement', 'actuar~', 'defense attorney', 'jury',
  'administrative', 'formal', 'officially', 'unauthorized', 'terminate', 'lease', 'paperwork', 'receipt',
  'filing', 'logged', 'spreadsheet entry', 'annual review', 'performance review',
]

function hasWord(text: string, token: string): boolean {
  if (token.endsWith('~')) return new RegExp(`\\b${token.slice(0, -1)}`, 'i').test(text)
  return new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)
}

/** The costume token a line wears that the story never used, or null. */
export function costumeToken(line: string, story: string): string | null {
  for (const tk of COSTUME_TOKENS) if (hasWord(line, tk) && !hasWord(story, tk)) return tk
  return null
}

/** "He's a philanthropist of the silverware drawer." A line that says what
 *  someone or something IS: a label, not an act. Time and quantity phrases
 *  ("a lot", "a week") do not count. */
const LABEL = /\b(?:is|are|am|was|were|'s|'m|'re)\s+(?:(?:not|just|now|basically|officially|no longer|essentially|literally|really|actually|currently|like|clearly|simply)\s+)*(?:a|an)\s+(?!(?:lot|bit|little|few|couple|week|day|month|year|minute|second|hour|while|time)\b)[a-z]/i

export function isLabelLine(line: string): boolean {
  return LABEL.test(line)
}

/** A run of `n` words shared with any technique example: the writer copied
 *  the shape's words instead of the shape. */
export function copiesExample(line: string, n = 5, pool: Technique[] = TECHNIQUES): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean)
  const w = norm(line)
  if (w.length < n) return false
  const grams = new Set<string>()
  for (const t of pool) {
    const e = norm(t.example)
    for (let i = 0; i + n <= e.length; i++) grams.add(e.slice(i, i + n).join(' '))
  }
  for (let i = 0; i + n <= w.length; i++) if (grams.has(w.slice(i, i + n).join(' '))) return true
  return false
}

/** The bit-level craft rule: at most one label line and at most one costume
 *  line among the tags and the button, and no copied example. */
export function techniqueCraftFailure(lines: string[], story: string): string | null {
  for (const l of lines) if (copiesExample(l)) return 'copied a technique example'
  const labels = lines.filter(isLabelLine).length
  if (labels >= 2) return `labels, not acts (${labels} lines say what someone is)`
  const costumes = lines.map((l) => costumeToken(l, story)).filter((t): t is string => !!t)
  if (costumes.length >= 2) return `costume vocabulary: ${costumes.join(', ')}`
  return null
}

/* ── the /funniest bank ──
   Every technique on the /funniest pages, split by whether it can be done
   in a written line (dealt to the writer) or needs a camera, a prop, a
   sound or a performance (kept for the video and scene layouts). The
   pages are the source of truth: a new daily page feeds the bank on the
   next build. Pure function: the caller passes the entries. */

export interface FunniestTechniqueIn {
  slug: string
  name: string
  whyItWorks: string
  example: string
  tryIt: string
}

const PERFORMANCE = /\b(film|camera|cut to|prop|sound|voice|sing|tune|hold up|on screen|screen|video|pin a|record|perform|act out|shot|montage|footage|reaction shot|open your next|opens? (a|your) video|viewers|comments? (section|to the screen)|rhyme|ballad|music)\b/i

export function bankFromFunniest(entries: FunniestTechniqueIn[]): { line: Technique[]; performance: Technique[] } {
  const line: Technique[] = []
  const performance: Technique[] = []
  const seen = new Set<string>()
  for (const t of entries) {
    const id = `${t.slug}:${t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
    if (seen.has(id)) continue
    seen.add(id)
    const out: Technique = {
      id,
      family: `funniest:${t.slug}`,
      fit: /\b(you|your own|yourself|the teller)\b/i.test(t.tryIt) && !/\b(someone|other person|they|their|them)\b/i.test(t.tryIt) ? 'self' : 'any',
      name: t.name.toUpperCase(),
      op: t.tryIt.trim(),
      example: t.example.trim(),
    }
    ;(PERFORMANCE.test(t.tryIt) || PERFORMANCE.test(t.name) ? performance : line).push(out)
  }
  return { line, performance }
}
