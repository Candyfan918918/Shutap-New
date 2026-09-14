// Voices and the hall of fame — the two tables the candidate pass reads
// from, with the authored seed that the migration also writes.
//
// Both are looked up in the database first (joke_voices, joke_hall_of_fame),
// so the sets can be tuned without a deploy; the constants below are the
// floor. Never block on an empty table: a flip proceeds with these rather
// than failing.
import type { SlotKey } from './deck'

export type JokeVoice = {
  key: string
  /** {{VOICE_NAME}} */
  label: string
  /** {{VOICE_PERSONA}} — a paragraph */
  persona_prompt: string
  /** {{VOICE_REGISTER}} — sentence rules */
  register_notes: string
  /** {{VOICE_BANNED}} — per-voice bans */
  banned_moves: string
  weight: number
}

export const SEED_VOICES: JokeVoice[] = [
  {
    key: 'petty_historian',
    label: 'the petty historian',
    persona_prompt:
      'You keep the record. You remember what was said in march and what was said in june, and you set them next to each other without comment. You do not get angry; you get accurate. Your comedy is the footnote — the one small verifiable detail that makes the whole story fall over. You never raise your voice, because the dates do it for you.',
    register_notes:
      'Flat declaratives. Past tense. Counts, dates and quantities wherever the situation supplies them, and never one it did not. No exclamation marks. A rhetorical question only in the clapback.',
    banned_moves:
      'sarcastic "oh" or "wow" openers, "imagine", "literally", invented numbers, any sentence over twenty words, any sentence that ends by explaining the joke',
    weight: 3,
  },
  {
    key: 'deadpan_friend',
    label: 'the friend who has heard this before',
    persona_prompt:
      'You are the friend across the table who has heard every version of this and stopped being surprised years ago. You are on their side without ever saying so — the loyalty shows in how little needs explaining. You say the thing everyone was tiptoeing around the way you would say it is raining.',
    register_notes:
      'Lowercase, spoken, short. One idea per line. Concrete nouns from the situation, word for word. Commas over conjunctions. A full stop where a lesser writer would put a wink.',
    banned_moves:
      'exclamation marks, questions in the take or the roast, "honestly", "literally", "girl", "babe", anything shaped like a hashtag, listing three things',
    weight: 3,
  },
  {
    key: 'court_stenographer',
    label: 'the court stenographer',
    persona_prompt:
      'You transcribe. You treat the situation as a proceeding in which the other person is the witness, and you read their own testimony back to them. Everything funny is already in the record; your only job is to enter it. You never comment on character — you note the exhibit, the timestamp, the contradiction, and you keep typing.',
    register_notes:
      'Procedural nouns (the record, the exhibit, the statement, the motion, the minutes) applied to domestic facts. Present tense for what is on file, past tense for what was claimed. Dry to the point of clerical.',
    banned_moves:
      'legal jargon beyond plain nouns (no "heretofore", no latin), a verdict on the user, "objection", the word "court" itself, anything a stenographer would not be allowed to say out loud',
    weight: 2,
  },
  {
    key: 'group_chat',
    label: 'the group chat',
    persona_prompt:
      'You are the reply that lands in the group chat forty seconds after the screenshot and collects four crying-laughing reactions. You are fast, fond and merciless about the other person, and you only ever need one line. You have the timing of someone typing with one thumb while walking.',
    register_notes:
      'Lowercase. No trailing full stop unless there are two sentences. Short. Reuse the exact word from the screenshot everyone is staring at. A fragment is allowed if it lands.',
    banned_moves:
      'emoji, "lol", "omg", "not X", "the way that", "i can\'t", "screaming", "this you?", quoting the whole situation back, more than one comma',
    weight: 2,
  },
]

export type HallOfFameEntry = {
  slot: SlotKey
  /** null = works in any voice */
  voice_key: string | null
  /** null = works for any archetype */
  archetype: string | null
  situation_clean: string
  joke_text: string
}

/* Situation and line together, always — a line alone teaches vocabulary,
   not the mapping. These are the first entries; production winners are
   promoted into joke_hall_of_fame by hand once share-rate data exists. */
const S = {
  budget:
    "My manager said there's no budget for training this year. He said it in the boardroom they finished refurbishing last month.",
  repost:
    'My boss reposted my exact job on LinkedIn at fifteen thousand more than I make, and told me I was welcome to apply.',
  kitchen:
    "My mother-in-law reorganised my kitchen while I was at work and left a note on the counter saying 'now you'll be able to find things'.",
  late: 'He turned up two hours late and spent the first twenty minutes explaining why.',
  chores: "My husband says we split the chores fifty-fifty. He counts 'reminding me' as a chore.",
  fridge: 'My flatmate put her name on every item of her food in the fridge. She still eats mine.',
  nights:
    "My mum keeps describing my brother's girlfriend as 'sort of between places'. She has been staying at my mum's for eleven nights.",
  yoga: 'My mother-in-law said me in my yoga pants looks like a clown, at the table, in front of the kids.',
}

export const SEED_HALL_OF_FAME: HallOfFameEntry[] = [
  // the take — name the mechanism in words the situation did not provide
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: S.budget, joke_text: "the budget exists. it's the room." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: S.repost, joke_text: 'the job was priced correctly the moment it was hypothetically vacant.' },
  { slot: 'the_take', voice_key: null, archetype: 'uninvited_visitor', situation_clean: S.kitchen, joke_text: "she didn't tidy a kitchen. she filed a complaint in cupboards." },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: S.late, joke_text: 'he built twenty minutes of infrastructure to explain two hours.' },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: S.chores, joke_text: 'the split is fifty-fifty the way a seesaw with one person on it is level.' },
  { slot: 'the_take', voice_key: null, archetype: null, situation_clean: S.fridge, joke_text: "she didn't label her food. she labelled the exception." },

  // the clapback — first person, ends where they have to answer
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: S.nights, joke_text: '"eleven nights. at what point do i start introducing her?"' },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: S.fridge, joke_text: '"you\'ve got a system for your food. what\'s the system for mine?"' },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: S.fridge, joke_text: '"label mine too. same pen. let\'s see if it works both ways."' },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: S.budget, joke_text: '"understood. i\'ll do the course in the new room, then."' },
  { slot: 'the_clapback', voice_key: null, archetype: null, situation_clean: S.late, joke_text: '"you had two hours to think of that. which part took the longest?"' },
  { slot: 'the_clapback', voice_key: null, archetype: 'backhanded_grandma', situation_clean: S.yoga, joke_text: '"noted. is that one going in the christmas letter, or just the group chat?"' },

  // the roast — arrives somewhere the retelling could not reach
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: S.late, joke_text: 'he arrived with exhibits.' },
  { slot: 'the_roast', voice_key: null, archetype: 'uninvited_visitor', situation_clean: S.kitchen, joke_text: 'she broke in, ran an audit, and left the findings in the cutlery drawer.' },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: S.repost, joke_text: "he's headhunting for the role of you, and you didn't make the shortlist." },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: S.nights, joke_text: "eleven nights isn't between places. that's a tenancy with a nicer name." },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: S.chores, joke_text: 'he does half the chores the way a foreman does half the building.' },
  { slot: 'the_roast', voice_key: null, archetype: null, situation_clean: S.fridge, joke_text: "she labelled her food so she'd know which half of the fridge was the buffet." },
]

/* ───────────────────────────── lookups ───────────────────────────── */

type Admin = {
  from: (table: string) => any
}

/** Every active voice, from the table if it has any, else the seed. */
export async function loadVoices(admin: Admin | null): Promise<JokeVoice[]> {
  if (admin) {
    try {
      const { data } = await admin
        .from('joke_voices')
        .select('key, label, persona_prompt, register_notes, banned_moves, weight')
        .eq('is_active', true)
      if (Array.isArray(data) && data.length) {
        return data.map((v: any) => ({
          key: String(v.key),
          label: String(v.label),
          persona_prompt: String(v.persona_prompt),
          register_notes: String(v.register_notes),
          banned_moves: String(v.banned_moves),
          weight: Math.max(1, Number(v.weight) || 1),
        }))
      }
    } catch (err) {
      console.error('[joke-voices] load failed; using seed', err)
    }
  }
  return SEED_VOICES
}

function hash(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h || 1
}

/** One voice for the whole set, weighted, seeded off the set id so all
 *  three cards — and any reroll — speak in the same voice. */
export function pickVoice(voices: JokeVoice[], seed: string): JokeVoice {
  const pool = voices.length ? voices : SEED_VOICES
  const total = pool.reduce((n, v) => n + v.weight, 0)
  let at = hash(seed) % total
  for (const v of pool) {
    if (at < v.weight) return v
    at -= v.weight
  }
  return pool[0]!
}

export function voiceByKey(voices: JokeVoice[], key: string | null | undefined): JokeVoice | null {
  if (!key) return null
  return voices.find((v) => v.key === key) ?? SEED_VOICES.find((v) => v.key === key) ?? null
}

/* ───────────────────────── few-shot exclusion ─────────────────────────
   A hall-of-fame row that is the same situation again teaches the model
   to copy, not to write. Before a row can be an example it must be far
   enough from this spill — cosine similarity under 0.80 — and must not
   share both the archetype and the accusation verb. Fewer than two
   survivors means none: none is better than a copy. */
export const EXAMPLE_SIMILARITY_CUTOFF = 0.8

const ACCUSATION_VERBS = ['gave', 'ruined', 'made', 'caused', 'destroyed', 'broke', 'wrecked', 'killed', 'cost', 'stole', 'took', 'ended', 'poisoned', 'infected']

/** The accuser's verb in a spill, when the other party accused the user
 *  of something ("said I gave her", "told me you ruined"). */
export function accusationVerb(text: string): string | null {
  const t = text.toLowerCase()
  const m = /\b(?:said|says|saying|told|tells|claims?|claimed|accused|accuses|blamed|blames)\b[^.!?]{0,60}?\b(?:i|you|i'd|i've)\s+(?:had\s+)?(\w+)/.exec(t)
  if (m && ACCUSATION_VERBS.includes(m[1]!)) return m[1]!
  return null
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) { dot += a[i]! * b[i]!; na += a[i]! * a[i]!; nb += b[i]! * b[i]! }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0
}

/** pgvector comes back through REST as its text form '[0.1,0.2,…]'. */
function parseVector(v: unknown): number[] | null {
  if (Array.isArray(v)) return v.map(Number)
  if (typeof v === 'string' && v.startsWith('[')) {
    try { const arr = JSON.parse(v) as unknown; return Array.isArray(arr) ? arr.map(Number) : null } catch { return null }
  }
  return null
}

export type ExampleSelection = {
  examples: { situation: string; line: string }[]
  examples_excluded: number
  reasons: string[]
}

/** Up to `limit` situation→line pairs for a card, after exclusion.
 *  Selection order: (slot, voice, archetype) → (slot, voice) → (slot, any
 *  voice) → none. Never block on empty. */
export async function loadExamples(
  admin: Admin | null,
  args: {
    slot: SlotKey
    voiceKey: string
    archetype: string
    limit?: number
    situation?: string
    /** the spill's embedding, when one could be made */
    spillEmbedding?: number[] | null
    trace?: { set_id?: string; position?: number }
  },
): Promise<ExampleSelection> {
  const limit = args.limit ?? 5
  let rows: (HallOfFameEntry & { id?: string; embedding?: number[] | null })[] = []
  if (admin) {
    try {
      const { data } = await admin
        .from('joke_hall_of_fame')
        .select('id, slot, voice_key, archetype, situation_clean, joke_text, embedding')
        .eq('slot', args.slot)
        .eq('is_active', true)
        .limit(200)
      if (Array.isArray(data)) rows = data.map((r: any) => ({ ...r, embedding: parseVector(r.embedding) }))
    } catch (err) {
      console.error('[joke-hof] load failed; using seed', err)
    }
  }
  if (rows.length === 0) rows = SEED_HALL_OF_FAME.filter((h) => h.slot === args.slot)

  // A row without an embedding gets one now, once, and keeps it.
  if (admin && args.spillEmbedding) {
    const { embedText, toVectorLiteral } = await import('@/lib/agents/embeddings.server')
    for (const r of rows) {
      if (r.embedding || !r.id) continue
      const vec = await embedText(r.situation_clean)
      if (!vec) continue
      r.embedding = vec
      try {
        await admin.from('joke_hall_of_fame').update({ embedding: toVectorLiteral(vec) } as never).eq('id', r.id)
      } catch (err) {
        console.error('[joke-hof] could not store an embedding', { id: r.id, err })
      }
    }
  }

  const verb = args.situation ? accusationVerb(args.situation) : null
  const reasons: string[] = []
  const kept = rows.filter((r) => {
    if (args.spillEmbedding && r.embedding) {
      const sim = cosine(args.spillEmbedding, r.embedding)
      if (sim >= EXAMPLE_SIMILARITY_CUTOFF) {
        reasons.push(`similarity ${sim.toFixed(2)} (${r.id ?? 'seed'})`)
        return false
      }
    }
    if (verb && r.archetype === args.archetype && accusationVerb(r.situation_clean) === verb) {
      reasons.push(`archetype+verb "${verb}" (${r.id ?? 'seed'})`)
      return false
    }
    return true
  })
  let examples = selectExamples(kept, args.voiceKey, args.archetype, limit)
  if (examples.length < 2) {
    if (examples.length) reasons.push('fewer than two survive; proceeding with none')
    examples = []
  }
  const out = { examples, examples_excluded: rows.length - kept.length, reasons }
  console.log('[joke-examples]', {
    ...(args.trace ?? {}),
    slot: args.slot,
    examples: examples.length,
    examples_excluded: out.examples_excluded,
    reason: reasons,
  })
  return out
}

/** Every active hall-of-fame line, all slots, for the exemplar-copy
 *  guardrail. The seed stands in when the table is empty or unreachable. */
export async function loadHallOfFameLines(admin: Admin | null): Promise<{ id: string; text: string }[]> {
  if (admin) {
    try {
      const { data } = await admin.from('joke_hall_of_fame').select('id, joke_text').eq('is_active', true).limit(1000)
      if (Array.isArray(data) && data.length) return data.map((r: any) => ({ id: `hof:${r.id}`, text: String(r.joke_text) }))
    } catch (err) {
      console.error('[joke-hof] lines load failed; using seed', err)
    }
  }
  return SEED_HALL_OF_FAME.map((h, i) => ({ id: `seed:${i}`, text: h.joke_text }))
}

export function selectExamples(
  rows: HallOfFameEntry[],
  voiceKey: string,
  archetype: string,
  limit: number,
): { situation: string; line: string }[] {
  const voiceMatches = (h: HallOfFameEntry) => h.voice_key === voiceKey || h.voice_key === null
  const tiers = [
    rows.filter((h) => voiceMatches(h) && h.archetype === archetype),
    rows.filter((h) => voiceMatches(h)),
    rows,
  ]
  const out: { situation: string; line: string }[] = []
  const seen = new Set<string>()
  for (const tier of tiers) {
    for (const h of tier) {
      if (out.length >= limit) return out
      if (seen.has(h.joke_text)) continue
      seen.add(h.joke_text)
      out.push({ situation: h.situation_clean, line: h.joke_text })
    }
  }
  return out
}
