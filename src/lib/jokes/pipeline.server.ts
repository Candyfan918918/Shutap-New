// The joke-card generator: three model stages and a floor.
//
//   1 · PREMISE PASS   once per set, cached on joke_sets.premises. Twelve
//                      observations about the situation, four marked used.
//   2 · CANDIDATE PASS once per flip. Ten lines in one call, in the set's
//                      voice, for this card's slot, written from the premises.
//   3 · JUDGE          a DIFFERENT MODEL FAMILY ranks the survivors of the
//                      deterministic hard-rule filter and names a winner.
//   floor              the authored pool for the slot. A card never resolves
//                      empty: if the gateway is down or every candidate fails,
//                      the pool carries the card and used_fallback says so.
//
// Every stage's prompt lives in prompts.server.ts and nowhere else; the
// PROMPT_VERSION there is stamped on every card so a quality change can be
// attributed to a cause.
import { callAgent, modelFamily, tryParseJson, DEFAULT_MODEL } from '@/lib/agents/gateway'
import type { SlotKey } from './deck'
import { SLOT_KEYS } from './deck'
import { FALLBACKS } from './deck.server'
import {
  CANDIDATE_PROMPT,
  HOUSE_VOICE,
  JUDGE_PROMPT,
  PREMISE_PROMPT,
  PROMPT_VERSION,
  SLOT_NAMES,
  SLOT_RULES,
  SLOT_CEILINGS,
  SLOT_WORDS,
  fill,
  formatCandidates,
  formatExamples,
  formatOtherPremises,
  formatPremise,
} from './prompts.server'
import {
  loadExamples,
  loadHallOfFameLines,
  loadVoices,
  pickVoice,
  voiceByKey,
  type JokeVoice,
} from './voices.server'
import { promptExemplars, type PromptExemplar } from './prompts.server'
import { embedText, toVectorLiteral, cosineSimilarity } from '@/lib/agents/embeddings.server'

/* ───────────────────────────── models ─────────────────────────────
   The writer and the judge must be different families — same-model judging
   measures self-preference. Both are env-tunable; the defaults are the two
   families the Lovable gateway serves. */
export function writerModel(): string {
  return process.env['JOKE_WRITER_MODEL'] || process.env['LOVABLE_AI_MODEL'] || DEFAULT_MODEL
}
export function judgeModel(): string {
  const wanted = process.env['JOKE_JUDGE_MODEL'] || 'openai/gpt-5-mini'
  if (modelFamily(wanted) === modelFamily(writerModel())) {
    console.warn('[joke-judge] judge shares the writer\'s model family; self-preference will leak', {
      writer: writerModel(),
      judge: wanted,
    })
  }
  return wanted
}

/* ───────────────────────────── budgets ─────────────────────────────
   The flip is the latency budget, and a held card is a card the reader
   thinks has vanished. Every call gets a wall-clock cap; past it the ladder
   moves on — the writer without premises, the judge replaced by the first
   line the hard rules let through, and at the bottom the authored floor.
   Tunable per stage with JOKE_*_MS. */
function budgetMs(name: string, fallback: number): number {
  const n = Number(process.env[name] ?? '')
  return Number.isFinite(n) && n > 0 ? n : fallback
}
export const BUDGET = {
  premises: () => budgetMs('JOKE_PREMISE_MS', 12_000),
  candidates: () => budgetMs('JOKE_CANDIDATE_MS', 20_000),
  judge: () => budgetMs('JOKE_JUDGE_MS', 12_000),
}

/* ───────────────────────────── shapes ───────────────────────────── */

/** Where stage 1 dealt a used premise. `spare` is held for regeneration. */
export type PremiseSlot = 'take' | 'clapback' | 'roast' | 'spare'
export const PREMISE_SLOTS: PremiseSlot[] = ['take', 'clapback', 'roast', 'spare']

export type Premise = { t: string; used: boolean; slot?: PremiseSlot }

export type CandidateRecord = {
  text: string
  /** the hard rule the deterministic filter or the judge threw it out on */
  rejected?: string
  /** 0 = the judge's winner */
  rank?: number
}

export type GeneratedCard = {
  text: string
  /** the premise this card was built on, for the record */
  premise: string | null
  used_fallback: boolean
  judge_score: number | null
  judge_why: string | null
  prompt_version: string
  voice_key: string | null
  writer_model: string | null
  judge_model: string | null
  candidates: CandidateRecord[]
}

/* ───────────────────────── roast targets ─────────────────────────
   {{TARGET}} on the roast card. Chosen once per set from the situation's
   own wording, cheaply and deterministically; the label is what the prompt
   reads. The order is the order the engines tend to fire in. */
export const ROAST_TARGETS: { key: string; label: string; re: RegExp }[] = [
  { key: 'the_process_language', label: 'the process language — the administrative phrasing doing the laundering', re: /\b(welcome to apply|no budget|budget|policy|hr|going forward|circle back|quick(ly)? look|no bandwidth|per my|headcount|restructur\w*|at this time|feedback|performance review)\b/i },
  { key: 'the_self_appointment', label: 'the self-appointment — what they have quietly made themselves into', re: /\b(reorgani[sz]\w*|rearrang\w*|took it upon|without asking|in charge|correct(ed|ing|s) me|inspect\w*|rules? for my|let (her|him|them)self in|decided for|reorder\w*|tidied my|sorted my)\b/i },
  { key: 'the_double_standard', label: 'the double standard — the rule with one reader', re: /\b(but when (she|he|they)|when (she|he|they) do(es)?|except (her|him|them)|allowed to|rules? (don'?t|doesn'?t) apply|fine when|for (her|him|them)self|double standard|still eats? mine|but (she|he|they) can)\b/i },
  { key: 'the_guilt_trip', label: 'the guilt trip — the sacrifice invoiced', re: /\b(guilt\w*|sigh\w*|after everything|ungrateful|sacrific\w*|how could you|disappoint\w*|hurt (her|his|their) feelings|selfish|for you)\b/i },
  { key: 'the_timing', label: 'the timing — when they chose to do it', re: /\b(in front of|at (the )?(dinner|table|wedding|party|funeral|christmas)|right (before|after|when)|the moment|just as|11 ?pm|midnight|on my birthday|anniversary)\b/i },
  { key: 'the_excuse', label: 'the excuse — the alibi and its construction', re: /\b(late|excuse\w*|explain\w*|reason\w*|because|forgot|busy|traffic|meant to|was going to)\b/i },
]
export const DEFAULT_ROAST_TARGET = { key: 'the_behaviour', label: "the behaviour itself — the move they made, not who they are" }

export function classifyRoastTarget(situation: string): string {
  for (const t of ROAST_TARGETS) if (t.re.test(situation)) return t.key
  return DEFAULT_ROAST_TARGET.key
}

export function roastTargetLabel(key: string | null | undefined): string {
  return ROAST_TARGETS.find((t) => t.key === key)?.label ?? DEFAULT_ROAST_TARGET.label
}

/* ───────────────────────── hard rules, in code ─────────────────────────
   The judge applies the hard rules too, but the deterministic ones are
   applied here first so a banned construction never reaches it, and so a
   card is still safe when the judge is down. These are the rules from the
   writer's brief that a regex can catch. The list should only ever grow. */
/** The slot rules state a word budget; a candidate a fifth over it is
 *  still judged, further over it is out. Characters follow at roughly seven
 *  a word, which is also what the card faces can set. */
export function maxWordsFor(slot: SlotKey): number {
  return Math.ceil(SLOT_WORDS[slot] * 1.2)
}
export function maxCharsFor(slot: SlotKey): number {
  return maxWordsFor(slot) * 7
}

/* Advice is an instruction to the USER. The take and the roast speak about
   the other person, so a "you should" in them is aimed at the reader; the
   clapback speaks TO the other person, where "you should have" is the
   point, so it is exempt here and the judge decides. Reassurance is out on
   every card. */
const ADVICE = /\b(you should|you could|you need to|you have to|you deserve|try to|try a|try telling|consider|i'?d recommend|i would recommend|next time|going forward|from now on)\b/i
const REASSURANCE = /\b(you'?re not crazy|you are not crazy|you'?re not wrong|you are not wrong|it'?s okay to|it'?s ok to|you did nothing wrong|you'?re allowed to)\b/i
/* Therapy vocabulary, and only outside a quoted span: the card is allowed to
   quote the word the other party used, or the one the user typed. The
   approved take for the "shit or get off the pot" spill is `you said
   "depressed." she heard "toilet."` — the clinical word is the exhibit, not
   the register. `diagnos*` is not here: a diagnosis is a fact, and a fact in
   the spill is Guardrail B's, which blocks it outside quotes on the spills
   that have one. The approved take for the cancer spill names the diagnosis
   to hand it to the doctor ("the diagnosis came from a doctor"). */
const CLINICAL = /\b(boundar(y|ies)|toxic|gaslight\w*|narcissis\w*|therap\w*|trauma\w*|trigger(ed|ing)?|heal(ing|ed)?|self[- ]care|red flags?|emotional (labou?r|abuse)|manipulat\w*|abus(e|ive|er)|disorder|anxiety|depress\w*|codependen\w*|enabl(er|ing)|validat\w*|closure|safe space|inner child|love[- ]bomb\w*)\b/i
const BANNED: { rule: string; re: RegExp }[] = [
  { rule: 'welcome to X, population: you', re: /welcome to [^,.]{1,40},? population:? you/i },
  { rule: "congratulations, you've unlocked", re: /congratulations,? you'?ve unlocked/i },
  // "that's not X, that's Y" is deliberately NOT here: it is permitted when
  // the second half is a genuine picture, and only the judge can tell a
  // picture from a rename. A regex would throw out the good ones too.
  { rule: "and somehow I'm the villain", re: /and somehow i'?m the villain/i },
  { rule: 'plot twist:', re: /\bplot twist\b/i },
  { rule: 'main character energy', re: /main character (energy|moment|syndrome|behaviou?r)/i },
  { rule: 'starts "Ah, yes,"', re: /^\s*["“'‘]?ah,? yes\b/i },
  { rule: 'pet name for the user', re: /\b(oh,? )?(honey|darling|dummy|sweetie|sweetheart|hun|babe|babes|hon)\b/i },
]

/* The landing-word kill list from the writer's brief. A line that ends on
   one of these has landed on the mechanism, not on a thing you can see.
   Grows the way the ban list grows: every time a card lands on an
   abstraction in production, add the word. */
const LANDING_KILL = new Set([
  'comparable', 'procedural', 'organisational', 'organizational', 'structure', 'mechanism',
  'decision', 'decisions', 'feelings', 'subject', 'record', 'precision', 'average', 'gap',
  'question', 'dynamic', 'dynamics', 'pattern', 'behaviour', 'behavior', 'situation',
  'relationship', 'process', 'priority', 'priorities', 'boundary', 'control', 'respect',
  'accountability', 'responsibility', 'reality', 'truth', 'point', 'issue', 'problem',
])

function landingWord(line: string): string {
  const words = line
    .toLowerCase()
    .replace(/[^a-z'\s-]/g, ' ')
    .trim()
    .split(/\s+/)
  return (words[words.length - 1] ?? '').replace(/^'+|'+$/g, '')
}

/** Words of the situation the naming test compares against. */
function contentWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9'\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3),
  )
}

/** The reason a line fails a hard rule, or null when it passes. */
export function hardRuleFailure(
  line: string,
  situation: string,
  slot: SlotKey = 'the_roast',
  opts: { ignoreLength?: boolean } = {},
): string | null {
  const t = line.trim()
  if (!t) return 'empty'
  const words = t.split(/\s+/).length
  // A clapback may be one word — THE SCAPEGOAT ("Rent.") and THE
  // INSTITUTION'S ALIBI ("Client-facing.") are approved product cards.
  if (words < (slot === 'the_clapback' ? 1 : 2)) return 'too short'
  // Length is Guardrail F's; this is the older backstop at a fifth over.
  // The hall-of-fame admission skips it: an approved row over its ceiling
  // stays seeded, and F is for new candidates.
  if (!opts.ignoreLength && (t.length > maxCharsFor(slot) || words > maxWordsFor(slot))) return 'over length'
  if (slot !== 'the_clapback' && ADVICE.test(t)) return 'advice'
  if (REASSURANCE.test(t)) return 'reassurance'
  if (CLINICAL.test(outsideQuotes(t, slot))) return 'clinical vocabulary'
  for (const b of BANNED) if (b.re.test(t)) return `banned construction: ${b.rule}`
  if (LANDING_KILL.has(landingWord(t))) return `abstract landing: ${landingWord(t)}`
  // The naming test, conservatively: a line whose EVERY content word was
  // typed by the user is a rearrangement. One new word passes it here; the
  // judge holds the higher bar.
  const own = Array.from(contentWords(t))
  if (own.length >= 4) {
    const given = contentWords(situation)
    if (own.every((w) => given.has(w))) return 'restatement'
  }
  return null
}

export function passesGuardrails(line: string, situation = '', slot: SlotKey = 'the_roast'): boolean {
  return hardRuleFailure(line, situation, slot) === null
}

/* ───────────────────────── cleaning a line ───────────────────────── */

function isSpokenLine(slot: SlotKey): boolean {
  return slot === 'the_clapback'
}

/** House register: lowercase, one paragraph. The clapback's quotation
 *  marks are the model's — the prompt asks for them and nothing here adds
 *  or removes them. A take or roast the model wrapped whole in quotes is
 *  unwrapped; quotes inside a line are left alone. */
export function cleanLine(raw: string, slot: SlotKey): string {
  let t = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\d+[.)]\s*/, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim()
  if (!t) return ''
  if (!isSpokenLine(slot) && isWhollyQuoted(t)) t = t.slice(1, -1).trim()
  return t.toLowerCase()
}

/** One pair of double quotes around the whole line and none inside. */
export function isWhollyQuoted(t: string): boolean {
  return t.length > 2 && t.startsWith('"') && t.endsWith('"') && !t.slice(1, -1).includes('"')
}

/* ───────────────────────── the guardrails ─────────────────────────
   Deterministic, in code, before the judge: a prompt is a request and
   these are the refusal. Each list is exported so it can grow. */

/** Guardrail C's trigger: the user has passed a verdict on themselves. */
export const SELF_CRITICAL_TOKENS = [
  'useless', 'pathetic', 'failure', 'behind', 'embarrassing', 'loser', 'worthless', 'should be by now',
]

/** Guardrail B's tokens: a serious fact in the spill that may appear in a
 *  card only inside a quote of what the other party said. */
export const SERIOUS_FACT_TOKENS = [
  'cancer', 'tumor', 'tumour', 'chemo', 'oncolog', 'hospital', 'hospice', 'icu', 'diagnos',
  'terminal', 'died', 'death', 'dead', 'funeral', 'miscarr', 'stillb', 'stroke', 'surgery',
  'overdose', 'laid off', 'fired', 'evicted', 'bankrupt',
  'disease', 'illness', 'autoimmune', 'condition', 'chronic', 'medical', 'symptom', 'flare', 'sick',
]

/** Guardrail D's comparison set: a hall-of-fame line or one of the prompt's
 *  own example lines, normalised for comparison. */
export type Exemplar = { id: string; text: string; embedding?: number[] | null }
type ExemplarNorm = { id: string; norm: string; tokens: Set<string>; embedding: number[] | null }

export function normalizeForCopy(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim()
}
function normExemplar(e: Exemplar): ExemplarNorm {
  const norm = normalizeForCopy(e.text)
  return { id: e.id, norm, tokens: new Set(norm.split(' ').filter(Boolean)), embedding: e.embedding ?? null }
}

/** Guardrail D's paraphrase half: a candidate whose embedding sits within
 *  EXEMPLAR_EMBED_THRESHOLD of a hall-of-fame line's is the line rewritten
 *  ("the hamster has the mortgage. not the feed, not the bedding. the
 *  mortgage." against "You're a hamster with a mortgage."). The threshold
 *  is tuned on the seeded rows against each other by
 *  scripts/joke-hof-similarity.ts, which needs a key. */
export const EXEMPLAR_EMBED_THRESHOLD = 0.86
export type EmbeddingCopy = { id: string; similarity: number }
export function exemplarCopyByEmbedding(vec: number[], exemplars: ExemplarNorm[], threshold = EXEMPLAR_EMBED_THRESHOLD): EmbeddingCopy | null {
  let best: EmbeddingCopy | null = null
  for (const e of exemplars) {
    if (!e.embedding) continue
    const s = cosineSimilarity(vec, e.embedding)
    if (s >= threshold && (!best || s > best.similarity)) best = { id: e.id, similarity: s }
  }
  return best
}
export function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0
  for (const t of a) if (b.has(t)) inter++
  const union = a.size + b.size - inter
  return union ? inter / union : 0
}

/** Guardrail A: a predicate nominative on the user, on any spill, no
 *  allowlist. The two forms the spec gives (§8). */
export const USER_PREDICATE_RES: RegExp[] = [
  /\b(you|you're|you are|you've been|and you), (a|an|the) \w+/i,
  /\b(you're|you are) (a|an|the) \w+/i,
]

/** Guardrail C: on a self-critical spill, the user as subject with a noun
 *  of dependence or verdict as predicate (§8). */
export const SELF_CRITICAL_PREDICATE_RE =
  /\b(you|you're|you are|you've)\b.{0,20}\b(a|an|the)\b [^.]{0,40}\b(fund|atm|customer|dependent|charity case|burden|liability|expense|line item|failure|loser)\b/i

export type SeriousToken = { token: string; source: 'static' | 'dynamic' }
export type SpillFlags = {
  self_critical: boolean
  /** the phrase where the user describes themselves as something they are
   *  not ("a hamster in a non-stop spinning wheel"); Guardrail G applies */
  metaphor_span: string | null
  /** the user reports a feeling about themselves; with self_directed,
   *  Guardrail H applies */
  emotional: boolean
  /** the literal nouns a card may hold on to when the spill is a metaphor:
   *  the spill's own content words outside the metaphor, plus the noun
   *  lists its archetype opens */
  literal_nouns: string[]
  /** the people a pronoun may refer to on a self-directed spill (Guardrail I) */
  person_nouns: string[]
  /** the classifier found no other adult and the user is the actor: Guardrail
   *  A narrows to the verdict-noun list (spec §8, round U) */
  self_directed: boolean
  serious_tokens: SeriousToken[]
  /** the domains the spill's own text or archetype opened (Guardrail E) */
  domains: Domain[]
  /** the spill's text, normalised, for the quoted-span exemption of E */
  spill_norm: string
  exemplars: ExemplarNorm[]
}

/* ── Guardrail E · the borrowed domain (spec §2 LANDING, §7d round Y) ──
   "it's a six sigma event. your reaction is the key performance
   indicator" — with no picture, the model borrows a domain's vocabulary
   and wears it. A picture's vocabulary comes from the spill's world or
   the other party's word. Each lexicon has two tiers: `spill` are the
   everyday words that mark the domain as the spill's own (a spill with
   "boss" in it is at work; a card may talk shop); `card` are the jargon
   tokens that, on a spill that never entered the domain, are the costume.
   A candidate wearing a domain the spill did not open is rejected unless
   it contains a quoted span from the spill — their word made a world.
   Engine-5 vocabulary (auditor, committee, compliance) is deliberately
   not jargon here: the premise pass is told to name the institution the
   other party turned themselves into. */
export type Domain = 'corporate' | 'finance' | 'legal' | 'medical' | 'military' | 'sports'
/** A token matches as a whole word (phrases included); a token ending in
 *  `~` is a stem and matches as a prefix ("diagnos~" takes diagnosis and
 *  diagnosed). Whole-word by default so "race" never fires on "grace". */
export const DOMAIN_LEXICONS: Record<Domain, { spill: string[]; card: string[] }> = {
  corporate: {
    spill: [
      'work', 'job', 'boss', 'manager', 'office', 'hr', 'corporate', 'company', 'meeting', 'email', 'hired',
      'hiring', 'interview', 'interviewed', 'coworker', 'co-worker', 'colleague', 'client', 'linkedin', 'salary',
      'promotion', 'workflow', 'position', 'desk', 'shift', 'career', 'resign~', 'quit', 'terminated',
      'employee', 'intern', 'deadline', 'zoom', 'slack', 'business', 'team', 'payroll', 'recruiter',
    ],
    card: [
      'six sigma', 'key performance indicator', 'kpi', 'kpis', 'ecosystem', 'synergy', 'synergies',
      'stakeholder', 'stakeholders', 'deliverable', 'deliverables', 'bandwidth', 'action item', 'org chart',
      'roadmap', 'onboarding', 'offboarding', 'circle back', 'touch base', 'value add', 'core competenc~',
      'best practice', 'best practices', 'scalab~', 'headcount', 'middle management', 'process improvement',
      'quarterly report', 'quarterly review', 'okr', 'okrs', 'thought leader', 'low-hanging fruit',
      'move the needle', 'paradigm', 'key stakeholder', 'brand alignment',
    ],
  },
  finance: {
    spill: [
      'financial', 'finance', 'money', 'budget', 'rent', 'loan', 'mortgage', 'invoice', 'bill', 'bills', 'bank',
      'paid', 'pay', 'paying', 'card', 'venmo', 'spreadsheet', 'tuition', 'debt', 'savings', 'tax', 'taxes',
      'price', 'cost', 'afford', '$', 'dollar', 'dollars', 'cash', 'wallet', 'fee', 'owe', 'allowance',
      'expensive', 'cheap', 'broke', 'paycheck', 'salary',
    ],
    card: [
      'trust fund', 'transferable asset', 'liquid asset', 'asset', 'assets', 'portfolio', 'equity', 'dividend',
      'dividends', 'liquidity', 'balance sheet', 'ledger', 'capital gains', 'return on investment', 'roi',
      'depreciat~', 'amortis~', 'amortiz~', 'line item', 'shareholder', 'shareholders', 'hedge fund',
      'compound interest', 'net worth', 'cash flow', 'fiscal', 'series a', 'series b', 'venture capital',
      'valuation', 'ipo', 'escrow',
    ],
  },
  legal: {
    spill: [
      'lawyer', 'attorney', 'court', 'custody', 'sue', 'sued', 'suing', 'lawsuit', 'police', 'restraining order',
      'divorce', 'lease', 'contract', 'judge', 'legal', 'file for', 'filed', 'filing', 'arrest~', 'stole',
      'stolen', 'steal', 'theft', 'thief', 'evict~', 'warrant', 'hoa', 'landlord', 'tenant', 'prenup',
      'alimony', 'inherit~', 'trespass~', 'cops', 'crime', 'illegal',
    ],
    card: [
      'subpoena', 'deposition', 'plaintiff', 'defendant', 'litigation', 'jurisdiction', 'felony',
      'misdemeanor', 'misdemeanour', 'indictment', 'affidavit', 'pro bono', 'class action',
      'statute of limitations', 'due process', 'perjury', 'cross-examin~', 'habeas', 'garnish~', 'bailiff',
      'restraining order', 'court order', 'parole', 'probation', 'exhibit a', 'exhibit b', 'your honor',
      'your honour', 'the prosecution', 'the defense rests', 'the defence rests', 'plea deal',
    ],
  },
  medical: {
    spill: [
      'doctor', 'hospital', 'cancer', 'disease', 'sick', 'surgery', 'diagnos~', 'nurse', 'clinic', 'medical',
      'pregnan~', 'autoimmune', 'illness', 'injur~', 'icu', 'pill', 'pills', 'prescription', 'allerg~',
      'intolerant', 'symptom', 'symptoms', 'flare', 'chemo', 'chemotherapy', 'tumor', 'tumour', 'therapist',
      'dentist', 'ambulance', 'stroke', 'condition', 'chronic', 'miscarr~', 'ivf', 'fertility', 'donor', 'blood',
      'medication', 'meds', 'hospice',
    ],
    card: [
      'hospital bed', 'hospital', 'oncolog~', 'chemo', 'chemotherapy', 'prognosis', 'clinical trial', 'icu',
      'intensive care', 'surgeon', 'triage', 'malignant', 'benign', 'biopsy', 'flatline', 'life support',
      'diagnos~', 'prescription', 'side effect', 'side effects', 'dosage', 'hospice', 'pathology',
      'anesthesia', 'anaesthesia', 'code blue',
    ],
  },
  military: {
    spill: ['army', 'navy', 'marine', 'marines', 'military', 'soldier', 'veteran', 'deployed', 'deployment', 'enlist~', 'war'],
    card: [
      'battalion', 'platoon', 'sergeant', 'barracks', 'reconnaissance', 'recon mission', 'chain of command',
      'collateral damage', 'friendly fire', 'boots on the ground', 'court-martial', 'court martial',
      'rules of engagement', 'shock and awe', 'scorched earth', 'defcon', 'artillery', 'trench warfare',
      'special ops', 'black ops', 'air strike', 'airstrike', 'grenade', 'the front line', 'front lines',
      'battlefield', 'foxhole', 'hostage negotiat~',
    ],
  },
  sports: {
    spill: [
      'game', 'coach', 'gym', 'football', 'soccer', 'basketball', 'baseball', 'golf', 'marathon', 'race',
      'practice', 'league', 'match', 'tennis', 'hockey', 'workout', 'trainer', 'stadium', 'season ticket',
      'fantasy', 'olympic', 'olympics', 'playoff', 'playoffs', 'super bowl', 'team',
    ],
    card: [
      'touchdown', 'home run', 'hail mary', 'end zone', 'penalty box', 'offside', 'full-court press',
      'slam dunk', 'hat trick', 'playoffs', 'free agent', 'benched', 'scoreboard', 'referee', 'red card',
      'yellow card', 'sudden death', 'grand slam', 'strike three', 'batting average', 'power play',
      'final whistle', 'own goal', 'mvp', 'draft pick', 'starting lineup', 'photo finish', 'first round pick',
      'halftime', 'personal best', 'olympic',
    ],
  },
}
export const DOMAINS = Object.keys(DOMAIN_LEXICONS) as Domain[]

/** Corporate and finance are one institution in these spills — "Finance
 *  has a category for that. It's called 'Team Building.'" was approved on
 *  a spill that said "corporate card" — so each opens the other. */
const DOMAIN_KIN: Partial<Record<Domain, Domain[]>> = { corporate: ['finance'], finance: ['corporate'] }

/** The domains an archetype opens on its own. classifyArchetype's own
 *  labels are all family rooms; the jokenet taxonomy's are listed so a
 *  set that arrives with one of those is read the same way. */
export const ARCHETYPE_DOMAINS: Record<string, Domain[]> = {
  work: ['corporate', 'finance'],
  money: ['finance', 'corporate'],
  'customer service': ['corporate'],
  'health system': ['medical'],
}

function hasToken(text: string, token: string): boolean {
  if (token.endsWith('~')) return text.includes(token.slice(0, -1))
  return matchesWholeWord(text, token)
}

/** Which domains the spill's own text and archetype opened. */
export function spillDomains(situation: string, archetype?: string | null): Domain[] {
  const s = situation.toLowerCase()
  const open = new Set<Domain>(ARCHETYPE_DOMAINS[String(archetype ?? '').toLowerCase()] ?? [])
  for (const d of DOMAINS) {
    const lex = DOMAIN_LEXICONS[d]
    if (lex.spill.some((tk) => hasToken(s, tk)) || lex.card.some((tk) => hasToken(s, tk))) open.add(d)
  }
  for (const d of Array.from(open)) for (const kin of DOMAIN_KIN[d] ?? []) open.add(kin)
  return DOMAINS.filter((d) => open.has(d))
}

/** The quoted spans of a line — a clapback's own wrapper unwrapped first —
 *  normalised, so E can tell their word made a world from a costume. */
export function quotedSpans(line: string, slot: SlotKey): string[] {
  let t = line.trim()
  if (isSpokenLine(slot) && t.length > 1 && /^["“]/.test(t) && /["”]$/.test(t)) t = t.slice(1, -1)
  const out: string[] = []
  for (const m of t.matchAll(/["“]([^"“”]{2,})["”]/g)) {
    const n = normalizeForCopy(m[1]!)
    if (n.length >= 3) out.push(n)
  }
  return out
}

export type BorrowedDomain = { domain: Domain; token: string }

/** Guardrail E: the first domain the line wears that the spill never
 *  opened, or null. A line that quotes the spill's own words is exempt:
 *  their word made a world. */
export function borrowedDomain(line: string, slot: SlotKey, flags: Pick<SpillFlags, 'domains' | 'spill_norm'>): BorrowedDomain | null {
  const t = line.toLowerCase()
  const open = new Set(flags.domains)
  for (const d of DOMAINS) {
    if (open.has(d)) continue
    const token = DOMAIN_LEXICONS[d].card.find((tk) => hasToken(t, tk))
    if (!token) continue
    if (flags.spill_norm && quotedSpans(line, slot).some((q) => flags.spill_norm.includes(q))) return null
    return { domain: d, token }
  }
  return null
}

/** Words too common to ban on their own: banning them throws away good
 *  lines that never touch the serious fact ("off" kills "office"). */
const SERIOUS_TOKEN_STOPWORDS = new Set([
  'off', 'out', 'new', 'her', 'his', 'the', 'and', 'was', 'were', 'has', 'had',
  'been', 'from', 'with', 'that', 'this', 'they', 'them', 'their', 'very',
  'just', 'about', 'into', 'over', 'made', 'make', 'said', 'told', 'laid',
  'lost', 'gone', 'went', 'took', 'more', 'some', 'have', 'else', 'than',
])

/** The tokens of a serious-fact phrase Guardrail B blocks: every word of
 *  four letters or more that is not an everyday word. Dynamic tokens are
 *  matched on word boundaries, so no head-noun fragment is needed. */
export function dynamicSeriousTokens(seriousFact: string | null | undefined): string[] {
  if (!seriousFact) return []
  const words = seriousFact.toLowerCase().replace(/[^a-z'\s-]/g, ' ').split(/\s+/).filter(Boolean)
  const out = new Set<string>()
  for (const w of words) if (w.length >= 4 && !SERIOUS_TOKEN_STOPWORDS.has(w)) out.add(w)
  return Array.from(out)
}

const WORD_BOUNDARY_CACHE = new Map<string, RegExp>()

/** A dynamic token only counts as a hit on a whole word: "car" must not
 *  fire on "career" or "scared". */
function matchesWholeWord(text: string, token: string): boolean {
  let re = WORD_BOUNDARY_CACHE.get(token)
  if (!re) {
    re = new RegExp(`(?:^|[^a-z])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^a-z]|$)`, 'i')
    WORD_BOUNDARY_CACHE.set(token, re)
  }
  return re.test(text)
}

export type SpillShape = {
  /** the classifier's answer: no other adult, the user is the actor */
  selfDirected?: boolean | null
  /** the set's archetype, for Guardrail E's domain check and G's noun lists */
  archetype?: string | null
  /** the reader's metaphor span, or null */
  metaphorSpan?: string | null
  /** the reader's answer: the user reports a feeling about themselves */
  emotional?: boolean | null
}

/* ── Guardrail G · the literal noun (spec §1 THE USER SPOKE IN A METAPHOR,
   §7d round Z) ──
   "the hamster is a specialist. the wheel is a treadmill with a
   nameplate." Every card lived inside the user's metaphor and touched
   nothing from her day. When the reader finds a metaphor span, a
   candidate must hold at least one concrete noun from the spill outside
   that span, or from the noun lists its archetype opens. The lists are
   seeded from the ledger's approved cards and grow the way the other
   lists do. */
export const ARCHETYPE_NOUNS: Record<string, string[]> = {
  stay_at_home_mom: [
    'kids', 'kid', 'nap', 'naps', 'dishes', 'laundry', 'school run', '4 p.m.', '4pm', 'the car', 'car', 'the oven',
    'oven', 'the washer', 'washer', 'dryer', 'bedtime', 'mortgage', 'rent', 'toddler', 'baby', 'bottle', 'stroller',
    'snack', 'snacks', 'crayons', 'pickup', 'drop-off', 'carpool', 'van', 'phones', 'phone', 'sippy cup', 'daycare',
    'preschool', 'playground', 'lunchbox', 'lunch', 'dinner', 'bath', 'pajamas', 'pyjamas', 'the couch', 'couch',
    'the driveway', 'driveway', 'grocery', 'groceries', 'target', 'costco', 'the sink', 'sink', 'the dishwasher',
    'dishwasher', 'load', 'third load', 'the door', 'a sentence', 'water', 'juice', 'cheerios', 'the wheel',
  ],
  work: [
    'badge', 'desk', 'linkedin', 'email', 'screenshot', 'conference room', 'ceiling', 'position', 'department',
    'exit interview', 'calls', 'finance', 'category', 'monday', 'parking lot', 'boss', 'hr', 'meeting', 'inbox',
    'slack', 'calendar', 'laptop', 'badge', 'timesheet', 'invoice', 'payroll', 'workflow', 'team', 'office',
    'coffee', 'break room', 'the printer', 'printer', 'headset', 'zoom', 'shift', 'schedule', 'clock',
  ],
  family: [
    'kitchen', 'wedding', 'basement', 'laundry', 'mini fridge', 'bailiff', 'court', 'cookies', 'lawyer', 'photos',
    'rate', 'doctor', 'gift', 'widow', 'baby', 'feed', '3 a.m.', 'dna test', 'walgreens', 'toilet', 'plumbing',
    'christmas', 'thanksgiving', 'sunday dinner', 'sunday', 'loan', 'groceries', 'coffee', 'spreadsheet', 'row',
    'column', 'tab', 'severity', 'gym', 'agenda', 'trip', 'the bell', 'door', 'cake', 'casserole', 'the drawer',
    'drawer', 'the fridge', 'fridge', 'group chat', 'the car', 'car', 'house', 'the couch', 'couch', 'phone',
  ],
  self: [
    'coffee', 'syrup', 'rent', 'wall', 'milk', 'calf', 'farmers', 'keys', 'coat', 'traffic', 'honda', 'funeral',
    '8:00', 'cake', 'bakery', 'order', 'boy', 'party', 'desk', 'linkedin', 'badge', 'the car', 'car', 'window',
    'alarm', 'the clock', 'clock', 'shift', 'parking lot', 'bed', 'the couch', 'couch', 'phone', 'brunch', 'latte',
  ],
}
/** Which noun lists a spill opens: by its own words, and by the matcher's
 *  archetype. A spill with none open falls back to `self`. */
export const ARCHETYPE_NOUN_MARKERS: Record<string, RegExp> = {
  stay_at_home_mom: /\b(mom|mum|mother|mama|kids?|baby|toddler|newborn|infant|stay[- ]at[- ]home|nap|naps|sahm|daughter|son|school run|bedtime)\b/i,
  work: /\b(boss|work|job|hr|office|email|desk|manager|coworker|co-worker|colleague|meeting|company|corporate|hired|interview|position|linkedin|shift|client)\b/i,
  family: /\b(mother-in-law|mil|in-law|in-laws|husband|wife|wedding|grandma|grandmother|father-in-law|sister|brother|parents|dad|family|ex-mil|marriage|married)\b/i,
}
const ARCHETYPE_NOUN_LISTS: Record<string, string[]> = {
  grandbaby_countdown_clock: ['family', 'stay_at_home_mom'],
  uninvited_visitor: ['family'],
  backhanded_grandma: ['family'],
  silent_treatment_strategist: ['family'],
  favoritism_broadcaster: ['family'],
  boundary_bulldozer: ['family'],
}
const LITERAL_NOUN_STOPWORDS = new Set([
  'feel', 'feels', 'feeling', 'like', 'being', 'going', 'just', 'really', 'every', 'always', 'never', 'when',
  'then', 'that', 'this', 'with', 'from', 'have', 'been', 'they', 'them', 'into', 'over', 'about', 'because',
  'still', 'while', 'there', 'their', 'what', 'where', 'which', 'will', 'would', 'could', 'should', 'some',
  'more', 'than', 'very', 'also', 'even', 'only', 'much', 'many', 'stop', 'non-stop', 'nonstop', 'constantly',
  'literally', 'anymore', 'again', 'myself', 'yourself', 'himself', 'herself', 'everyone', 'everything',
  'nothing', 'something', 'someone', 'nobody', 'somebody', 'anything', 'around', 'other', 'another', 'without',
  'through', 'though', 'since', 'until', 'these', 'those', 'does', 'doing', 'done', 'make', 'made', 'makes',
  'thing', 'things', 'time', 'times', 'people', 'person', 'want', 'wants', 'wanted', 'need', 'needs', 'know',
  'think', 'told', 'said', 'says', 'asked', 'wish', 'hate', 'love', 'tired', 'exhausted', 'overstimulated',
  'overwhelmed', 'useless', 'pathetic', 'stuck', 'trapped', 'behind', 'life', 'whole', 'entire', 'kind', 'sort',
])

export function literalNouns(situation: string, metaphorSpan: string | null | undefined, archetype?: string | null): string[] {
  if (!metaphorSpan) return []
  const span = contentWords(metaphorSpan)
  const out = new Set<string>()
  for (const w of contentWords(situation)) if (!span.has(w) && !LITERAL_NOUN_STOPWORDS.has(w)) out.add(w)
  const lists = new Set<string>(ARCHETYPE_NOUN_LISTS[String(archetype ?? '')] ?? [])
  for (const [key, re] of Object.entries(ARCHETYPE_NOUN_MARKERS)) if (re.test(situation)) lists.add(key)
  if (lists.size === 0) lists.add('self')
  const spanNorm = normalizeForCopy(metaphorSpan)
  for (const key of lists) {
    for (const noun of ARCHETYPE_NOUNS[key] ?? []) {
      const n = normalizeForCopy(noun)
      // a noun that is part of the metaphor phrase is the metaphor, not the day
      if (n && !matchesWholeWord(spanNorm, n.replace(/^the /, ''))) out.add(noun)
    }
  }
  return Array.from(out)
}

/** Guardrail G: on a metaphor spill, the first literal noun the line holds,
 *  or the rejection. */
export function literalNounFailure(line: string, flags: Pick<SpillFlags, 'metaphor_span' | 'literal_nouns'>): GuardrailHit | null {
  if (!flags.metaphor_span) return null
  const t = normalizeForCopy(line)
  for (const noun of flags.literal_nouns) {
    const n = normalizeForCopy(noun).replace(/^the /, '')
    if (n && matchesWholeWord(t, n)) return null
  }
  return { rule: 'literal_noun', detail: `no noun from the day (metaphor: ${flags.metaphor_span})` }
}

/* ── Guardrail H · blame (spec judge, ON A SELF-DIRECTED EMOTIONAL SPILL) ──
   "you built the wheel, then you chose the animal." On a spill where the
   user is the actor and reports a feeling about themselves, a line that
   assigns them the fault is out. Inside quotes it may stand: the card may
   quote what someone said. */
export const BLAME_RE = /\byou (chose|built|made|let|did this|picked|caused|wanted)\b/i
export function blameFailure(line: string, slot: SlotKey, flags: Pick<SpillFlags, 'self_directed' | 'emotional'>): GuardrailHit | null {
  if (!(flags.self_directed && flags.emotional)) return null
  const m = BLAME_RE.exec(outsideQuotes(line, slot))
  return m ? { rule: 'blame', detail: m[0] } : null
}

/** What the spill itself says about which guardrails apply. */
export function spillFlags(
  situation: string,
  seriousFact?: string | null,
  exemplars: Exemplar[] = [],
  shape: SpillShape = {},
): SpillFlags {
  const s = situation.toLowerCase()
  const serious: SeriousToken[] = SERIOUS_FACT_TOKENS.filter((t) => s.includes(t)).map((token) => ({ token, source: 'static' as const }))
  const have = new Set(serious.map((t) => t.token))
  for (const token of dynamicSeriousTokens(seriousFact)) {
    if (!have.has(token) && !SERIOUS_FACT_TOKENS.some((st) => token.includes(st))) serious.push({ token, source: 'dynamic' })
  }
  return {
    self_critical: SELF_CRITICAL_TOKENS.some((t) => s.includes(t)),
    // Fail-safe: no answer from the classifier keeps Guardrail A total.
    self_directed: shape.selfDirected === true,
    metaphor_span: shape.metaphorSpan?.trim() || null,
    emotional: shape.emotional === true,
    literal_nouns: literalNouns(situation, shape.metaphorSpan, shape.archetype),
    person_nouns: Array.from(new Set([...PERSON_NOUNS, ...capitalisedRoles(situation)])),
    serious_tokens: serious,
    domains: spillDomains(situation, shape.archetype),
    spill_norm: normalizeForCopy(situation),
    exemplars: exemplars.map(normExemplar),
  }
}

/** The text of a line with every quoted span removed. Straight or curly
 *  double quotes open a span; a clapback's own enclosing pair is not a
 *  span (the whole card is speech) and is unwrapped first. */
export function outsideQuotes(line: string, slot: SlotKey): string {
  let t = line.trim()
  if (isSpokenLine(slot) && t.length > 1 && /^["“]/.test(t) && /["”]$/.test(t)) t = t.slice(1, -1)
  let out = ''
  let open: '"' | '“' | null = null
  for (const ch of t) {
    if (open === null) {
      if (ch === '"' || ch === '“') open = ch
      else out += ch
    } else if ((open === '"' && ch === '"') || (open === '“' && ch === '”')) {
      open = null
    }
  }
  return out
}

export type GuardrailHit = {
  rule: 'user_predicate' | 'serious_fact' | 'self_critical_predicate' | 'exemplar_copy' | 'borrowed_domain' | 'length' | 'literal_noun' | 'blame' | 'pronoun_antecedent'
  detail: string
  /** D: how the copy was found */
  method?: 'text' | 'embedding'
  similarity?: number
  /** F: the words counted and the slot's ceiling */
  count?: number
  ceiling?: number
  source?: 'static' | 'dynamic'
  /** E: the domain the line borrowed */
  domain?: Domain
  /** A on a self-directed spill: only the verdict-noun list applied */
  narrowed?: 'self_directed'
}
export const GUARDRAIL_RULES: GuardrailHit['rule'][] = ['user_predicate', 'serious_fact', 'self_critical_predicate', 'exemplar_copy', 'borrowed_domain', 'length', 'literal_noun', 'blame', 'pronoun_antecedent']

/* ── Guardrail I · a pronoun without an antecedent ──
   "she did the thing, on purpose, with her whole chest" served on a spill
   with nobody else in it. On a self-directed set a third-person singular
   pronoun that arrives before any person-noun in the line is a person the
   reader never typed. Person-nouns: the people entries of the archetype
   noun lists plus any capitalised role in the situation. */
export const PERSON_NOUNS = [
  'mom', 'mum', 'mother', 'mama', 'kid', 'kids', 'baby', 'husband', 'wife', 'toddler', 'boss', 'coworker',
  'co-worker', 'colleague', 'father', 'dad', 'friend', 'son', 'daughter', 'sister', 'brother', 'grandma',
  'grandmother', 'grandpa', 'grandfather', 'mother-in-law', 'father-in-law', 'nurse', 'doctor', 'neighbor',
  'neighbour', 'teacher', 'partner', 'boyfriend', 'girlfriend', 'ex', 'manager', 'roommate', 'flatmate',
  'stranger', 'mover', 'movers', 'lawyer', 'judge', 'bailiff', 'cashier', 'barista', 'driver', 'landlord',
  'client', 'customer', 'recruiter', 'intern', 'employee', 'parent', 'parents', 'child', 'children', 'infant',
  'newborn', 'god', 'sitter', 'babysitter', 'nanny', 'pediatrician', 'hr',
]
const PRONOUN_RE = /\b(she|he|her|him|his|hers)\b/i
export function capitalisedRoles(situation: string): string[] {
  const out: string[] = []
  const words = situation.split(/\s+/)
  words.forEach((w, i) => {
    const bare = w.replace(/[^A-Za-z'-]/g, '')
    if (!bare || bare.length < 2) return
    if (i === 0 || /^[A-Z][a-z]/.test(bare) === false && !/^[A-Z]{2,}$/.test(bare)) return
    if (/^[A-Z][a-z]+$/.test(bare) || /^[A-Z]{2,}$/.test(bare)) out.push(bare.toLowerCase())
  })
  return Array.from(new Set(out.filter((w) => w !== 'i')))
}
export function pronounAntecedentFailure(line: string, flags: Pick<SpillFlags, 'self_directed' | 'person_nouns'>): GuardrailHit | null {
  if (!flags.self_directed) return null
  const t = line.toLowerCase()
  const pm = PRONOUN_RE.exec(t)
  if (!pm) return null
  let firstPerson = -1
  for (const n of flags.person_nouns) {
    const re = new RegExp(`(?:^|[^a-z])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^a-z]|$)`, 'i')
    const m = re.exec(t)
    if (m) {
      const at = m.index + (m[0].length - m[0].trimStart().length)
      if (firstPerson < 0 || at < firstPerson) firstPerson = at
    }
  }
  if (firstPerson >= 0 && firstPerson < pm.index) return null
  return { rule: 'pronoun_antecedent', detail: pm[0] }
}

/* ── Guardrail F · length ──
   Measured over the 72 approved ledger cards: take median 11.5 words,
   clapback 6, roast 15. The slot rules said "up to 25 / 30 / 50" and the
   model spent the budget. The rules now give targets and hard ceilings
   (SLOT_CEILINGS); a candidate over its ceiling is out before the judge.
   Words are whitespace tokens with the quotation marks stripped, so a
   clapback's own quotes never count. Applies to new candidates only: a
   seeded hall-of-fame row over a ceiling stays seeded. */
export function cardWordCount(line: string): number {
  return line.replace(/["“”]/g, ' ').trim().split(/\s+/).filter(Boolean).length
}
export function lengthFailure(line: string, slot: SlotKey): GuardrailHit | null {
  const count = cardWordCount(line)
  const ceiling = SLOT_CEILINGS[slot]
  return count > ceiling ? { rule: 'length', detail: `${count} > ${ceiling}`, count, ceiling } : null
}

/** Guardrail D: a candidate that is a hall-of-fame line or a prompt
 *  exemplar with a tag added. Token-set Jaccard at or above 0.5, or the
 *  exemplar as a contiguous substring that is also most of the candidate.
 *
 *  The substring half is gated on coverage because the brief quotes short
 *  approved fragments as the register to hit, not as lines to retire: the
 *  approved autoimmune take ends "not even the cells" and the approved
 *  custody roast ends "we're asking for a hundred", both of them phrases the
 *  brief holds up two paragraphs earlier. A bare `includes` banned every one
 *  of them. What the guardrail is for is the copy — the exemplar reproduced
 *  as the line, with or without a tag ("i wish i had that power. you'd have
 *  a new car.") — and a copy is an exemplar that fills its candidate. */
export const EXEMPLAR_COVERAGE = 0.5

export function exemplarCopy(line: string, exemplars: ExemplarNorm[]): ExemplarNorm | null {
  const norm = normalizeForCopy(line)
  if (!norm) return null
  const tokens = new Set(norm.split(' ').filter(Boolean))
  for (const e of exemplars) {
    if (!e.norm) continue
    if (norm.includes(e.norm) && e.tokens.size >= tokens.size * EXEMPLAR_COVERAGE) return e
    if (jaccard(tokens, e.tokens) >= 0.5) return e
  }
  return null
}

/** The first guardrail a candidate trips, or null. Order: A, B, C, D, E, F, G, H, I. D's embedding half runs in screenedPass, after these. */
export function guardrailFailure(line: string, slot: SlotKey, flags: SpillFlags): GuardrailHit | null {
  if (flags.self_directed) {
    // Spec §8: on a self-directed spill the user IS the subject and the
    // alibi register uses predicate nominatives ("you're the first person
    // HR ever fired who deserved it"), so A is limited to the verdict-noun
    // list. On every other spill it stays total, no allowlist.
    const m = SELF_CRITICAL_PREDICATE_RE.exec(line)
    if (m) return { rule: 'user_predicate', detail: m[0], narrowed: 'self_directed' }
  } else {
    for (const re of USER_PREDICATE_RES) {
      const m = re.exec(line)
      if (m) return { rule: 'user_predicate', detail: m[0] }
    }
  }
  if (flags.serious_tokens.length) {
    const bare = outsideQuotes(line, slot).toLowerCase()
    for (const { token, source } of flags.serious_tokens) {
      const hit = source === 'dynamic' ? matchesWholeWord(bare, token) : bare.includes(token)
      if (hit) return { rule: 'serious_fact', detail: token, source }
    }
  }
  if (flags.self_critical) {
    const m = SELF_CRITICAL_PREDICATE_RE.exec(line)
    if (m) return { rule: 'self_critical_predicate', detail: m[0] }
  }
  const copy = exemplarCopy(line, flags.exemplars)
  if (copy) return { rule: 'exemplar_copy', detail: copy.id, method: 'text' }
  const borrowed = borrowedDomain(line, slot, flags)
  if (borrowed) return { rule: 'borrowed_domain', detail: borrowed.token, domain: borrowed.domain }
  const long = lengthFailure(line, slot)
  if (long) return long
  // v3: G is take and roast only; the clapback is the user's own voice and
  // may stay inside their image.
  const noun = slot === 'the_clapback' ? null : literalNounFailure(line, flags)
  if (noun) return noun
  const blame = blameFailure(line, slot, flags)
  if (blame) return blame
  const pronoun = pronounAntecedentFailure(line, flags)
  if (pronoun) return pronoun
  return null
}

/* ───────────────────────── stage 1 · premises ───────────────────────── */

/** What the premise cache is keyed on: the prompt version, and a hash of
 *  the premise prompt's text — a changed premise pass under the same
 *  version label must not serve observations the old one made. */
export function premiseCacheKey(): string {
  let h = 0x811c9dc5
  for (let i = 0; i < PREMISE_PROMPT.length; i++) {
    h ^= PREMISE_PROMPT.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return `${PROMPT_VERSION}+${h.toString(16)}`
}

/** Exactly four used, one per slot value — what stage 1 is asked for. */
export function premisesAreDealt(premises: Premise[] | null | undefined): boolean {
  if (!Array.isArray(premises)) return false
  const used = premises.filter((p) => p && p.used)
  if (used.length !== 4) return false
  const slots = new Set(used.map((p) => p.slot))
  return PREMISE_SLOTS.every((sl) => slots.has(sl))
}

/** The positional deal, when the model would not deal: the used premises
 *  in order (then the rest, if fewer than four were marked) go
 *  [0]→take, [1]→clapback, [2]→roast, [3]→spare. */
export function dealPositionally(premises: Premise[]): Premise[] {
  const out = premises.map((p) => ({ t: p.t, used: false as boolean, slot: undefined as PremiseSlot | undefined }))
  const order = [...out.filter((_, i) => premises[i]!.used), ...out.filter((_, i) => !premises[i]!.used)]
  order.slice(0, 4).forEach((p, i) => {
    p.used = true
    p.slot = PREMISE_SLOTS[i]
  })
  return out
}

async function askForPremises(situation: string): Promise<Premise[] | null> {
  const res = await callAgent({
    model: writerModel(),
    temperature: 1.0,
    maxTokens: 2200,
    timeoutMs: BUDGET.premises(),
    messages: [{ role: 'user', content: fill(PREMISE_PROMPT, { SITUATION: situation.slice(0, 1500) }) }],
  })
  if (res.error) {
    console.error('[joke-premises] gateway error', res.error)
    return null
  }
  const parsed = tryParseJson<{ premises?: unknown }>(res.text)
  const list = Array.isArray(parsed?.premises) ? parsed!.premises : []
  const premises: Premise[] = []
  const seen = new Set<string>()
  for (const p of list as any[]) {
    const t = String(p?.t ?? p?.text ?? '').replace(/\s+/g, ' ').trim()
    if (!t || seen.has(t.toLowerCase())) continue
    seen.add(t.toLowerCase())
    const slot = String(p?.slot ?? '').toLowerCase()
    premises.push({
      t,
      used: p?.used === true,
      ...((PREMISE_SLOTS as string[]).includes(slot) ? { slot: slot as PremiseSlot } : {}),
    })
  }
  return premises.slice(0, 12)
}

/** Stage 1. Twelve observations, four of them dealt to cards. A deal the
 *  model got wrong (not four, or not one per slot) is asked for once more;
 *  a second wrong deal is dealt positionally and logged. Persisted as-is. */
export async function runPremisePass(situation: string): Promise<Premise[]> {
  let last: Premise[] | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    const got = await askForPremises(situation)
    if (got === null) {
      // The gateway itself failed: a second attempt is a second timeout.
      break
    }
    if (premisesAreDealt(got)) return got
    console.warn('[joke-premises] deal invalid', {
      attempt,
      used: got.filter((p) => p.used).length,
      slots: got.filter((p) => p.used).map((p) => p.slot ?? null),
    })
    last = got
  }
  if (!last || last.length === 0) return []
  console.warn('[joke-premises] dealing positionally')
  return dealPositionally(last)
}

export type Deal = {
  /** this card's premise, or null when nothing was dealt to it */
  premise: string | null
  /** the two dealt to the other cards */
  others: string[]
  /** held for regeneration; never shown to stage 2 or 3 on the first pass */
  spare: string | null
}

/** What a card sees of the set's premises: its own, the other two, and the
 *  spare. Premises without a deal (an older cache, a bare set) are dealt
 *  positionally here rather than refused. */
export function dealFor(premises: Premise[] | null | undefined, slot: SlotKey): Deal {
  const list = Array.isArray(premises) ? premises.filter((p) => p && p.t) : []
  const dealt = premisesAreDealt(list) ? list : dealPositionally(list)
  const mine = SLOT_NAMES[slot] as PremiseSlot
  const bySlot = (sl: PremiseSlot) => dealt.find((p) => p.used && p.slot === sl)?.t ?? null
  return {
    premise: bySlot(mine),
    others: PREMISE_SLOTS.filter((sl) => sl !== mine && sl !== 'spare')
      .map(bySlot)
      .filter((t): t is string => !!t),
    spare: bySlot('spare'),
  }
}

/* ───────────────────────── stage 2 · candidates ───────────────────────── */

export type CandidateInput = {
  situation: string
  slot: SlotKey
  voice: JokeVoice
  /** this card's dealt premise */
  premise: string | null
  /** the two dealt to the other cards — taken, not to be built on */
  otherPremises: string[]
  examples: { situation: string; line: string }[]
  roastTarget: string
}

/** The voice, with the house filling any field a voice left empty. A run
 *  with nobody talking is the flat register; there is no voiceless mode. */
function voiced(v: JokeVoice): JokeVoice {
  return {
    ...v,
    label: v.label?.trim() || HOUSE_VOICE.label,
    persona_prompt: v.persona_prompt?.trim() || HOUSE_VOICE.persona_prompt,
    register_notes: v.register_notes?.trim() || HOUSE_VOICE.register_notes,
    banned_moves: v.banned_moves?.trim() || HOUSE_VOICE.banned_moves,
  }
}

function slotRule(slot: SlotKey, roastTarget: string): string {
  return fill(SLOT_RULES[slot], { TARGET: roastTargetLabel(roastTarget) })
}

export async function runCandidatePass(
  input: CandidateInput,
): Promise<{ candidates: string[]; model: string; error?: string }> {
  const voice = voiced(input.voice)
  const prompt = fill(CANDIDATE_PROMPT, {
    VOICE_NAME: voice.label,
    VOICE_PERSONA: voice.persona_prompt,
    VOICE_REGISTER: voice.register_notes,
    VOICE_BANNED: voice.banned_moves,
    SLOT: SLOT_NAMES[input.slot],
    SLOT_RULE: slotRule(input.slot, input.roastTarget),
    SITUATION: input.situation.slice(0, 1500),
    PREMISE: formatPremise(input.premise),
    OTHER_PREMISES: formatOtherPremises(input.otherPremises),
    EXAMPLES: formatExamples(input.examples),
  })
  const res = await callAgent({
    model: writerModel(),
    temperature: 1.0,
    maxTokens: 2500,
    timeoutMs: BUDGET.candidates(),
    messages: [{ role: 'user', content: prompt }],
  })
  if (res.error) return { candidates: [], model: res.model, error: res.error }
  const parsed = tryParseJson<{ candidates?: unknown }>(res.text)
  const list = Array.isArray(parsed?.candidates) ? parsed!.candidates : []
  const out: string[] = []
  const seen = new Set<string>()
  for (const c of list as unknown[]) {
    const line = cleanLine(typeof c === 'string' ? c : String((c as any)?.text ?? ''), input.slot)
    if (!line || seen.has(line)) continue
    seen.add(line)
    out.push(line)
  }
  return { candidates: out.slice(0, 10), model: res.model }
}

/* ───────────────────────── stage 3 · judge ───────────────────────── */

export type Verdict = {
  winner: number | null
  why: string | null
  ranking: number[]
  rejected: { i: number; rule: string }[]
  model: string
  error?: string
}

export async function runJudge(args: {
  situation: string
  slot: SlotKey
  roastTarget: string
  premise: string | null
  otherPremises: string[]
  candidates: string[]
}): Promise<Verdict> {
  const model = judgeModel()
  const n = args.candidates.length
  const prompt = fill(JUDGE_PROMPT, {
    SITUATION: args.situation.slice(0, 1500),
    SLOT: SLOT_NAMES[args.slot],
    SLOT_RULE: slotRule(args.slot, args.roastTarget),
    PREMISE: formatPremise(args.premise),
    OTHER_PREMISES: formatOtherPremises(args.otherPremises),
    CANDIDATES: formatCandidates(args.candidates),
  })
  const res = await callAgent({
    model,
    temperature: 0,
    // A judge that thinks for a minute is a judge nobody waited for.
    reasoningEffort: 'low',
    maxTokens: 4000,
    timeoutMs: BUDGET.judge(),
    messages: [{ role: 'user', content: prompt }],
  })
  const empty: Verdict = { winner: null, why: null, ranking: [], rejected: [], model }
  if (res.error) return { ...empty, error: res.error }
  const parsed = tryParseJson<{
    winner?: unknown
    why?: unknown
    ranking?: unknown
    rejected?: unknown
  }>(res.text)
  if (!parsed) return { ...empty, error: 'unparseable verdict' }
  const inRange = (i: unknown): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < n
  const rejected = (Array.isArray(parsed.rejected) ? parsed.rejected : [])
    .map((r: any) => ({ i: Number(r?.i), rule: String(r?.rule ?? 'hard rule') }))
    .filter((r) => inRange(r.i))
  const rejectedSet = new Set(rejected.map((r) => r.i))
  const ranking = (Array.isArray(parsed.ranking) ? parsed.ranking : []).filter(inRange) as number[]
  let winner: number | null = inRange(parsed.winner) ? parsed.winner : null
  // A winner the judge also rejected is a contradiction; trust the rejection
  // and take the best-ranked survivor instead.
  if (winner !== null && rejectedSet.has(winner)) {
    winner = ranking.find((i) => !rejectedSet.has(i)) ?? null
  }
  return {
    winner,
    why: typeof parsed.why === 'string' ? parsed.why.trim().slice(0, 300) : null,
    ranking,
    rejected,
    model,
  }
}

/* ───────────────────────── the floor ───────────────────────── */

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

/** The floor. The pool is archetype-agnostic and was written for in-law
 *  spills, so on any other spill a pool line can say what no candidate is
 *  allowed to: "she did the thing…" on a set with nobody else in it, "that
 *  was a choice, and you made it" on an emotional self-directed one. Every
 *  pool line now goes through the same guardrails and hard rules as a
 *  candidate; the first that passes is dealt. If none passes the card is
 *  still never blank — a line is dealt and the miss is logged loudly. */
export function fallbackCard(
  slot: SlotKey,
  voiceKey: string | null,
  avoid: string[] = [],
  screen?: { situation: string; flags: SpillFlags; trace?: Trace },
): GeneratedCard {
  const pool = FALLBACKS[slot] ?? FALLBACKS['deadpan_understatement']!
  const fresh = pool.filter((t) => !avoid.includes(t))
  let candidates = fresh.length ? fresh : pool
  if (screen) {
    // Three tiers: a line that passes everything; a line whose only miss
    // is Guardrail G (an authored line cannot know the day's nouns on a
    // metaphor spill, and G is the one guardrail about that); a line that
    // says something a candidate could not (A, H, I, D, E…). The lowest
    // tier with a line in it is dealt from; the third tier is logged.
    const why = (line: string) => guardrailFailure(line, slot, screen.flags)?.rule ?? hardRuleFailure(line, screen.situation, slot, { ignoreLength: true }) ?? null
    // G sits before H and I in guardrailFailure, so "only G" is checked
    // with G switched off: a line that also blames or invents a person is
    // in the third tier whatever it tripped first.
    const withoutG: SpillFlags = { ...screen.flags, metaphor_span: null }
    const whyWithoutG = (line: string) => guardrailFailure(line, slot, withoutG)?.rule ?? hardRuleFailure(line, screen.situation, slot, { ignoreLength: true }) ?? null
    const tier = (line: string) => { const w = why(line); return w === null ? 0 : w === 'literal_noun' && whyWithoutG(line) === null ? 1 : 2 }
    const best = Math.min(...candidates.map(tier))
    if (best === 2) {
      console.error('[joke-fallback] no pool line passes the guardrails for this spill; dealing one anyway', {
        ...(screen.trace ?? {}), slot, rejected: candidates.map((line) => ({ text: line, why: why(line) })),
      })
    } else {
      candidates = candidates.filter((line) => tier(line) === best)
    }
  }
  return {
    text: pick(candidates),
    premise: null,
    used_fallback: true,
    judge_score: null,
    judge_why: null,
    prompt_version: PROMPT_VERSION,
    voice_key: voiceKey,
    writer_model: null,
    judge_model: null,
    candidates: [],
  }
}

/* ───────────────────────── the whole ladder ─────────────────────────
   candidates → guardrails and hard rules on all ten → (fewer than three
   survive? one more candidate pass, same premise) → judge → (no winner?
   one regeneration on the spare) → floor. Pure of the database: the
   caller supplies premises, voice and examples so the eval script can
   run the identical ladder. `trace` is only for the logs. */

export type Trace = { set_id?: string; position?: number }

type Screened = {
  records: CandidateRecord[]
  survivors: { text: string; at: number }[]
  /** rejections per guardrail on this pass */
  guardrail: Record<GuardrailHit['rule'], number>
}

/** One candidate pass, screened. Every rejection is written on the
 *  record and every guardrail rejection is logged as
 *  `[joke-guardrail] { rule, set_id, position, index, slot, span|token }`. */
async function screenedPass(
  input: CandidateInput,
  premise: string | null,
  flags: SpillFlags,
  avoid: Set<string>,
  trace: Trace,
): Promise<(Screened & { model: string }) | { error: string; model: string }> {
  const pass = await runCandidatePass({ ...input, premise })
  if (pass.error) return { error: pass.error, model: pass.model }
  const records: CandidateRecord[] = pass.candidates.map((text) => ({ text }))
  const survivors: { text: string; at: number }[] = []
  const guardrail: Screened['guardrail'] = { user_predicate: 0, serious_fact: 0, self_critical_predicate: 0, exemplar_copy: 0, borrowed_domain: 0, length: 0, literal_noun: 0, blame: 0, pronoun_antecedent: 0 }
  const textPassed: number[] = []
  records.forEach((r, at) => {
    const hit = guardrailFailure(r.text, input.slot, flags)
    if (!hit) textPassed.push(at)
    if (hit) {
      r.rejected = `guardrail: ${hit.rule} (${hit.detail}${hit.source ? `, ${hit.source}` : ''})`
      guardrail[hit.rule] += 1
      console.warn('[joke-guardrail]', {
        rule: hit.rule,
        set_id: trace.set_id ?? null,
        position: trace.position ?? null,
        index: at,
        slot: input.slot,
        ...(hit.rule === 'serious_fact'
          ? { token: hit.detail, source: hit.source }
          : hit.rule === 'exemplar_copy'
            ? { hall_of_fame_id: hit.detail }
            : hit.rule === 'borrowed_domain'
              ? { domain: hit.domain, token: hit.detail }
              : hit.rule === 'length'
                ? { count: hit.count, ceiling: hit.ceiling }
                : { span: hit.detail, ...(hit.narrowed ? { narrowed: hit.narrowed } : {}) }),
      })
      return
    }
  })
  // Guardrail D, the paraphrase half: one embedding call for every line the
  // text guardrails passed, compared against the hall-of-fame lines that
  // carry an embedding. Fail-soft: no vectors, no rejection.
  const embedded = new Set<number>()
  if (textPassed.length && flags.exemplars.some((e) => e.embedding)) {
    try {
      const { embedTexts } = await import('@/lib/agents/embeddings.server')
      const vecs = await embedTexts(textPassed.map((at) => records[at]!.text))
      textPassed.forEach((at, i) => {
        const vec = vecs[i]
        if (!vec) return
        const copy = exemplarCopyByEmbedding(vec, flags.exemplars)
        if (!copy) return
        embedded.add(at)
        const r = records[at]!
        r.rejected = `guardrail: exemplar_copy (${copy.id}, embedding ${copy.similarity.toFixed(3)})`
        guardrail.exemplar_copy += 1
        console.warn('[joke-guardrail]', {
          rule: 'exemplar_copy', method: 'embedding', similarity: Number(copy.similarity.toFixed(3)),
          set_id: trace.set_id ?? null, position: trace.position ?? null, index: at, slot: input.slot, hall_of_fame_id: copy.id,
        })
      })
    } catch (err) {
      console.error('[joke-guardrail] embedding check failed; text half only', { ...trace, slot: input.slot, err })
    }
  }
  for (const at of textPassed) {
    if (embedded.has(at)) continue
    const r = records[at]!
    const fail = hardRuleFailure(r.text, input.situation, input.slot) ?? (avoid.has(r.text.toLowerCase()) ? 'repeat of the last card' : null)
    if (fail) r.rejected = fail
    else survivors.push({ text: r.text, at })
  }
  if (isSpokenLine(input.slot)) {
    for (const r of records) {
      if (!r.rejected && !(/^["“]/.test(r.text) && /["”]$/.test(r.text))) {
        console.warn('[joke-candidates] clapback returned without its quotation marks', { ...trace, slot: input.slot, text: r.text })
      }
    }
  }
  return { records, survivors, guardrail, model: pass.model }
}

export async function generateFromInputs(
  input: CandidateInput & {
    avoid?: string[]
    spare?: string | null
    trace?: Trace
    /** the exact phrase in the spill naming an illness, death or loss */
    seriousFact?: string | null
    /** hall-of-fame lines and the prompt's own examples, for Guardrail D */
    exemplars?: Exemplar[]
    /** the classifier's shape of the spill (self-directed) and the set's archetype */
    selfDirected?: boolean | null
    archetype?: string | null
    /** the reader's metaphor span and emotional flag (Guardrails G and H) */
    metaphorSpan?: string | null
    emotional?: boolean | null
  },
): Promise<GeneratedCard> {
  const avoid = new Set((input.avoid ?? []).map((t) => t.toLowerCase()))
  const trace = input.trace ?? {}
  const flags = spillFlags(input.situation, input.seriousFact, input.exemplars ?? promptExemplars(), {
    selfDirected: input.selfDirected,
    archetype: input.archetype,
    metaphorSpan: input.metaphorSpan,
    emotional: input.emotional,
  })
  console.log('[joke-flip]', {
    set_id: trace.set_id ?? null,
    position: trace.position ?? null,
    slot: input.slot,
    self_critical: flags.self_critical,
    self_directed: flags.self_directed,
    emotional: flags.emotional,
    metaphor_span: flags.metaphor_span,
    literal_nouns: flags.literal_nouns.length,
    serious_fact: input.seriousFact ?? null,
    serious_tokens: flags.serious_tokens,
    domains: flags.domains,
    exemplars: flags.exemplars.length,
  })

  const base = (records: CandidateRecord[], writer: string | null, judge: string | null, premise: string | null) => ({
    premise,
    prompt_version: PROMPT_VERSION,
    voice_key: input.voice.key,
    writer_model: writer,
    judge_model: judge,
    candidates: records,
  })

  // One judged attempt on a premise: screen, top up once if thin, judge.
  const attempt = async (premise: string | null, label: string): Promise<GeneratedCard | 'no_winner' | 'down'> => {
    const first = await screenedPass(input, premise, flags, avoid, trace)
    if ('error' in first) {
      // The gateway itself is down: a second attempt is a second timeout.
      console.error('[joke-candidates] gateway error', { slot: input.slot, attempt: label, error: first.error })
      return 'down'
    }
    let records = first.records
    let survivors = first.survivors
    let writer: string = first.model
    if (survivors.length < 3) {
      console.warn('[joke-candidates] fewer than three survive; one more pass on the same premise', {
        ...trace, slot: input.slot, attempt: label, survivors: survivors.length, guardrail: first.guardrail,
      })
      const second = await screenedPass(input, premise, flags, avoid, trace)
      if (!('error' in second)) {
        const offset = records.length
        const seen = new Set(records.map((r) => r.text))
        const fresh = second.records.filter((r) => !seen.has(r.text))
        const keep = new Set(fresh)
        records = [...records, ...fresh]
        survivors = [
          ...survivors,
          ...second.survivors
            .filter((sv) => keep.has(second.records[sv.at]!))
            .map((sv) => ({ text: sv.text, at: offset + fresh.indexOf(second.records[sv.at]!) })),
        ]
        writer = second.model
      }
    }
    if (survivors.length === 0) {
      console.warn('[joke-candidates] no survivors', { ...trace, slot: input.slot, attempt: label, rejected: records.map((r) => r.rejected) })
      return 'no_winner'
    }

    const verdict = await runJudge({
      situation: input.situation,
      slot: input.slot,
      roastTarget: input.roastTarget,
      premise,
      otherPremises: input.otherPremises,
      candidates: survivors.map((sv) => sv.text),
    })
    for (const r of verdict.rejected) records[survivors[r.i]!.at]!.rejected = `judge: ${r.rule}`
    verdict.ranking.forEach((i, rank) => {
      const rec = records[survivors[i]!.at]!
      if (rec.rank === undefined) rec.rank = rank
    })

    if (verdict.winner !== null) {
      const win = survivors[verdict.winner]!
      records[win.at]!.rank = 0
      return { ...base(records, writer, verdict.model, premise), text: win.text, used_fallback: false, judge_score: label === 'dealt' ? 0.9 : 0.8, judge_why: verdict.why }
    }
    if (verdict.error) {
      // The judge is down, not the candidates. The first line the rules let
      // through is a real card; a judged one was only going to be better.
      console.error('[joke-judge] gateway error', { ...trace, slot: input.slot, error: verdict.error })
      const first = survivors[0]!
      records[first.at]!.rank = 0
      return { ...base(records, writer, verdict.model, premise), text: first.text, used_fallback: false, judge_score: 0.6, judge_why: 'unjudged: ' + verdict.error }
    }
    return 'no_winner'
  }

  const dealt = await attempt(input.premise, 'dealt')
  if (dealt === 'down') return fallbackCard(input.slot, input.voice.key, input.avoid, { situation: input.situation, flags, trace })
  if (dealt !== 'no_winner') return dealt

  // The dealt premise produced nothing the judge would pass: the spare is
  // dealt in its place, once. It is never shown to stage 2 or 3 otherwise.
  if (input.spare) {
    console.warn('[joke-candidates] regenerating on the spare', { ...trace, slot: input.slot })
    const spare = await attempt(input.spare, 'spare')
    if (spare !== 'no_winner' && spare !== 'down') return spare
  }
  return fallbackCard(input.slot, input.voice.key, input.avoid, { situation: input.situation, flags, trace })
}

/* ───────────────────────── with the database ─────────────────────────
   The set carries what stage 1 produced and what was chosen for it:
   premises, voice, roast target. `prepareSet` fills whatever is missing —
   it is run once at the deal, and again by any card that finds the set
   still bare, so a deal that failed half-way never leaves the cards
   without their observations. */

type Admin = { from: (table: string) => any }

export type SetRow = {
  id: string
  clean_text: string
  archetype: string | null
}

type StoredPrep = {
  premises: Premise[] | null
  premises_version: string | null
  voice_key: string | null
  roast_target: string | null
  serious_fact: string | null
  self_directed: boolean | null
  metaphor_span: string | null
  emotional: boolean | null
  embedding: number[] | null
}

export type PreparedSet = {
  premises: Premise[]
  voice: JokeVoice
  roastTarget: string
  seriousFact: string | null
  /** the classifier's answer at set creation; null before the column exists */
  selfDirected: boolean | null
  metaphorSpan: string | null
  emotional: boolean | null
  /** the spill's embedding, for few-shot exclusion; null when none could be made */
  embedding: number[] | null
}

/** What the set already carries. Read in its own query, and an error here
 *  is a bare set, not a failed deal: before the generator's migration has
 *  landed these columns do not exist, and the cards must still write. */
async function readStoredPrep(admin: Admin, setId: string): Promise<StoredPrep> {
  const bare: StoredPrep = { premises: null, premises_version: null, voice_key: null, roast_target: null, serious_fact: null, self_directed: null, metaphor_span: null, emotional: null, embedding: null }
  try {
    const { data, error } = await admin
      .from('joke_sets')
      .select('premises, premises_version, voice_key, roast_target, serious_fact, self_directed, metaphor_span, emotional, embedding')
      .eq('id', setId)
      .maybeSingle()
    if (error || !data) return bare
    const emb = data.embedding
    let embedding: number[] | null = null
    if (Array.isArray(emb)) embedding = emb.map(Number)
    else if (typeof emb === 'string' && emb.startsWith('[')) {
      try { embedding = (JSON.parse(emb) as number[]).map(Number) } catch { embedding = null }
    }
    return {
      premises: Array.isArray(data.premises) ? (data.premises as Premise[]) : null,
      premises_version: (data.premises_version as string | null) ?? null,
      voice_key: (data.voice_key as string | null) ?? null,
      roast_target: (data.roast_target as string | null) ?? null,
      serious_fact: (data.serious_fact as string | null) ?? null,
      self_directed: typeof data.self_directed === 'boolean' ? data.self_directed : null,
      metaphor_span: (data.metaphor_span as string | null) ?? null,
      emotional: typeof data.emotional === 'boolean' ? data.emotional : null,
      embedding,
    }
  } catch {
    return bare
  }
}

export async function prepareSet(admin: Admin, set: SetRow): Promise<PreparedSet> {
  const situation = String(set.clean_text ?? '')
  const stored = await readStoredPrep(admin, set.id)
  const patch: Record<string, unknown> = {}

  const voices = await loadVoices(admin)
  let voice = voiceByKey(voices, stored.voice_key)
  if (!voice) {
    // Seeded off the set id, so three cards preparing at once — or a set
    // whose columns cannot be written yet — still agree on the voice.
    voice = pickVoice(voices, set.id)
    patch['voice_key'] = voice.key
  }

  let roastTarget = stored.roast_target
  if (!roastTarget) {
    roastTarget = classifyRoastTarget(situation)
    patch['roast_target'] = roastTarget
  }

  // The cache is keyed on the prompt version: observations an older premise
  // prompt made are not the observations this one would make.
  // Cached premises count only if this prompt version made them AND they
  // carry the deal — an earlier 2.1 cache has the observations but not the
  // slots, and stage 2 needs the slots.
  let premises =
    stored.premises_version === premiseCacheKey() && premisesAreDealt(stored.premises) ? stored.premises! : null
  if (!premises) {
    premises = await runPremisePass(situation)
    // An empty pass is not cached: the gateway may have been down, and the
    // next card should get to try. A real answer is stored once.
    if (premises.length) {
      patch['premises'] = premises
      patch['premises_version'] = premiseCacheKey()
    }
  }

  // The spill's embedding, once, for the few-shot's similarity exclusion.
  // Fail-soft: no embedding means no similarity check, never no card.
  let embedding = stored.embedding
  if (!embedding) {
    embedding = await embedText(situation)
    if (embedding) patch['embedding'] = toVectorLiteral(embedding)
  }

  if (Object.keys(patch).length) {
    try {
      const { error } = await admin.from('joke_sets').update(patch as never).eq('id', set.id)
      if (error) console.error('[joke-set] could not store the prepared set', { set_id: set.id, error: error.message })
    } catch (err) {
      console.error('[joke-set] could not store the prepared set', { set_id: set.id, err })
    }
  }
  return { premises, voice, roastTarget, seriousFact: stored.serious_fact, selfDirected: stored.self_directed, metaphorSpan: stored.metaphor_span, emotional: stored.emotional, embedding }
}

/** One card, end to end, for a set the caller has already loaded. */
export async function generateCard(
  admin: Admin,
  set: SetRow,
  args: { slot: string; avoid?: string[]; position?: number },
): Promise<GeneratedCard> {
  const slot = (SLOT_KEYS as string[]).includes(args.slot) ? (args.slot as SlotKey) : 'the_roast'
  const situation = String(set.clean_text ?? '')
  let prepared: PreparedSet
  try {
    prepared = await prepareSet(admin, set)
  } catch (err) {
    console.error('[joke-set] prepare failed; writing from the situation alone', { set_id: set.id, err })
    const voices = await loadVoices(null)
    prepared = { premises: [], voice: pickVoice(voices, set.id), roastTarget: classifyRoastTarget(situation), seriousFact: null, selfDirected: null, metaphorSpan: null, emotional: null, embedding: null }
  }
  const trace = { set_id: set.id, position: args.position }
  const [selection, hofLines] = await Promise.all([
    loadExamples(admin, {
      slot,
      voiceKey: prepared.voice.key,
      archetype: String(set.archetype ?? 'general'),
      situation,
      spillEmbedding: prepared.embedding,
      trace,
    }),
    loadHallOfFameLines(admin),
  ])
  const examples = selection.examples
  const exemplars: Exemplar[] = [...hofLines, ...promptExemplars()]
  const deal = dealFor(prepared.premises, slot)
  return generateFromInputs({
    situation,
    slot,
    voice: prepared.voice,
    premise: deal.premise,
    otherPremises: deal.others,
    spare: deal.spare,
    examples,
    roastTarget: prepared.roastTarget,
    avoid: args.avoid,
    trace,
    seriousFact: prepared.seriousFact,
    selfDirected: prepared.selfDirected,
    archetype: set.archetype,
    metaphorSpan: prepared.metaphorSpan,
    emotional: prepared.emotional,
    exemplars,
  })
}
