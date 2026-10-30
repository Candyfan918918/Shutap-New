// Joke battle: shared, pure pieces (client and server).
//
// A battle round is one in-house setup and three of its four versions, each
// written with a different technique from the /guides pages. The player
// picks the funniest, "none of these", or skips. Results (pick shares) are
// admin-only; players see only their own rank, streak and humor type.

export const BATTLE = {
  /** versions written per setup */
  versions: 4,
  /** versions shown per round */
  shown: 3,
  /** the bank target */
  setups: 200,
  /** a pick faster than this did not read three jokes */
  fastMs: 1500,
  /** every Nth round is a test round: two real versions and one flat control line */
  testEvery: 10,
  /** sign-in prompt after this many picks, for guests */
  signInAt: 10,
  /** a setup stops being served after this many counted picks */
  retireAfter: 100,
  /** words per joke line */
  maxWords: 18,
} as const

export type RankKey = 'jester' | 'wit' | 'wise-fool' | 'sage' | 'oracle' | 'legend'
export type Rank = { key: RankKey; name: string; at: number; line: string }

/** The humor wisdom ladder. */
export const RANKS: Rank[] = [
  { key: 'jester', name: 'Jester', at: 1, line: 'You laughed and said so. Every sage started here.' },
  { key: 'wit', name: 'Wit', at: 3, line: 'You can tell a line from a punchline.' },
  { key: 'wise-fool', name: 'Wise Fool', at: 10, line: 'You know the funniest line is usually the true one.' },
  { key: 'sage', name: 'Humor Sage', at: 50, line: "You know why it's funny, not just that it is." },
  { key: 'oracle', name: 'Oracle', at: 100, line: 'You call the funniest line before you finish reading.' },
  { key: 'legend', name: 'Legend', at: 500, line: 'Your picks taught Shutap how to write. Literally.' },
]

/** Current rank (null before the first pick) and the next one (null at the top). */
export function rankFor(picks: number): { rank: Rank | null; next: Rank | null; progress: number } {
  let rank: Rank | null = null
  for (const r of RANKS) if (picks >= r.at) rank = r
  const next = RANKS.find((r) => r.at > picks) ?? null
  const from = rank?.at ?? 0
  const progress = next ? Math.max(0, Math.min(1, (picks - from) / (next.at - from))) : 1
  return { rank, next, progress }
}

/** The rank reached by going from `before` to `after` picks, if a new one. */
export function rankUp(before: number, after: number): Rank | null {
  const a = rankFor(before).rank
  const b = rankFor(after).rank
  return b && b.key !== a?.key ? b : null
}

/** Each /guides page is a humor style; a player's picks add up to a type. */
export const GUIDE_STYLE: Record<string, string> = {
  'dry-humor': 'dry',
  'deadpan-humor': 'deadpan',
  'self-deprecating-humor': 'self-deprecating',
  'dark-humor': 'dark',
  'roast-lines': 'roast',
  'rule-of-three': 'rule of three',
  'funny-captions': 'caption',
  'what-is-a-joke': 'classic',
  'turn-a-bad-experience-into-comedy': 'storyteller',
}

export function styleOf(guideSlug: string | null | undefined): string {
  return (guideSlug && GUIDE_STYLE[guideSlug]) || 'mixed'
}

/** Top styles from a player's counts, largest first. */
export function humorType(counts: Record<string, number> | null | undefined): { style: string; n: number }[] {
  return Object.entries(counts ?? {})
    .filter(([, n]) => n > 0)
    .map(([style, n]) => ({ style, n }))
    .sort((a, b) => b.n - a.n)
}

/** "mostly deadpan", or null until there is something to say. */
export function humorLabel(counts: Record<string, number> | null | undefined): string | null {
  const top = humorType(counts)
  if (!top.length) return null
  const total = top.reduce((s, t) => s + t.n, 0)
  if (total < 3) return `so far: ${top[0]!.style}`
  return top[0]!.n / total >= 0.4 ? `mostly ${top[0]!.style}` : `${top[0]!.style} and ${top[1]?.style ?? 'more'}`
}

/** Flat control lines for test rounds: a reader who picks one over two real
 *  jokes is tapping, not reading. Shown with an honest label afterwards. */
export const CONTROL_LINES = [
  'That was annoying.',
  'Some people are like that.',
  'I did not enjoy that.',
  'That happened to me.',
  'It was not a good time.',
  'I was not happy about it.',
]

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

/** Pacific day arithmetic for the play streak. */
export function nextStreak(prevDay: string | null, prevStreak: number, today: string, yesterday: string): number {
  if (prevDay === today) return Math.max(1, prevStreak)
  if (prevDay === yesterday) return prevStreak + 1
  return 1
}

/** Each rank unlocks a profile picture (static art in /public/rank-avatars).
 *  Signed-in players collect the rank's badge on their profile and can use
 *  its picture as their profile picture. */
export const RANK_AVATAR_DIR = '/rank-avatars/'
export function rankAvatarPath(key: RankKey): string {
  return `${RANK_AVATAR_DIR}${key}.svg`
}
/** The rank a profile picture URL belongs to, if it is one of ours. */
export function rankOfAvatar(url: string | null | undefined): RankKey | null {
  const m = url ? /\/rank-avatars\/([a-z-]+)\.svg$/.exec(url) : null
  const key = m?.[1]
  return key && RANKS.some((r) => r.key === key) ? (key as RankKey) : null
}
