// The homepage poll: question, options and one follow-up per option.
// Shared by the poll section, its server functions and the admin page, so
// the words a person tapped and the words the admin reads never drift.

export const POLL_KEY = 'ai-joke-generators'

export type PollOptionKey = 'love' | 'lines' | 'better' | 'trash'

export interface PollFollowUp {
  question: string
  /** Tap-to-pick answers. Empty means a short typed answer instead. */
  chips: string[]
  placeholder?: string
}

export interface PollOption {
  key: PollOptionKey
  label: string
  followUp: PollFollowUp
}

export const POLL = {
  title: 'AI joke generators: funny or trash?',
  description: 'we built one, so tell us straight. sign in to vote and see the split.',
  privacy: 'your vote is linked to your account, never shown publicly. we may email you about your answer.',
  options: [
    {
      key: 'love',
      label: 'love it — gets me unstuck',
      followUp: { question: 'what are you making with it?', chips: ['stand-up', 'social posts', 'scripts', 'just messing around'] },
    },
    {
      key: 'lines',
      label: 'good ideas, but the lines need work',
      followUp: { question: "what's off?", chips: ['too generic', 'not my voice', 'too long', 'not that funny'] },
    },
    {
      key: 'better',
      label: 'I use something better',
      followUp: { question: 'which one?', chips: [], placeholder: 'the name of it' },
    },
    {
      key: 'trash',
      label: "AI can't be funny — this is trash",
      followUp: {
        question: "what's the dealbreaker?",
        chips: ['no timing', 'sounds like a robot', "feels like it's stealing from comedians", 'just no'],
      },
    },
  ] as PollOption[],
} as const

export const POLL_OPTION_KEYS = POLL.options.map((o) => o.key) as [PollOptionKey, ...PollOptionKey[]]

export function pollOption(key: string | null | undefined): PollOption | null {
  return POLL.options.find((o) => o.key === key) ?? null
}

export const FOLLOW_UP_MAX = 80

/** Whole-number percentages that add up to exactly 100 (largest remainder).
 *  All zeros when nobody has voted. */
export function toPercents(counts: Record<PollOptionKey, number>): Record<PollOptionKey, number> {
  const keys = POLL_OPTION_KEYS
  const total = keys.reduce((n, k) => n + (counts[k] ?? 0), 0)
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<PollOptionKey, number>
  if (total === 0) return out
  const raw = keys.map((k) => ({ k, exact: ((counts[k] ?? 0) / total) * 100 }))
  let used = 0
  for (const r of raw) { out[r.k] = Math.floor(r.exact); used += out[r.k] }
  const byRemainder = [...raw].sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)))
  for (let i = 0; used < 100 && i < byRemainder.length; i++, used++) out[byRemainder[i].k] += 1
  return out
}

/** "oct 23, 2026", always English, Pacific. */
export function pollDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' })
    .toLowerCase()
}
