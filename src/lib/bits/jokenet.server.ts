// JokeNet → THE STANDARD (Nov 16 2026). The writer and the judge used to see
// six random lines from a list frozen on Nov 1 (taste-bank.ts). Now they see
// the founder's highest-rated JokeNet lines whose situations are closest in
// meaning to the story being written, so every row she rates in
// /admin/jokenet reaches the next bit.
//
// Fail-soft everywhere: no key, no table, no vectors, a slow gateway → the
// static bank, exactly as before. Bounded so it never holds a bit open.
//
// Fairness and copying: a JokeNet situation that is (near) the same story as
// the one being written is skipped, and so are the blind eval's stories, so
// the writer never sees a rated answer to the story in front of it.
import { EVAL_SET, JOKENET_SET } from '@/lib/jokes/eval-set'
import { standardLines, type TasteLine } from './taste-bank'

const EMBED_MS = 2500
/** at or above this, the JokeNet situation is the same story */
const SAME_STORY = 0.9
const MIN_RATING = 4

const EVAL_STORIES = new Set([...EVAL_SET, ...JOKENET_SET].map((s) => norm(s.situation)))

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export type JokenetMatch = {
  id: number
  situation: string
  joke: string
  rating: number
  move: string | null
  mechanism: string | null
  founder: boolean
  source: string
  similarity: number
}

/** Pick `n` lines, one per situation: the nearest first, founder lines
 *  winning ties, the last two slots kept for top-rated lines from anywhere
 *  so the writer still sees range. Pure, for tests. */
export function pickStandard(matches: JokenetMatch[], n: number, rand: () => number = Math.random): TasteLine[] {
  const usable = matches.filter(
    (m) =>
      m.similarity < SAME_STORY &&
      !EVAL_STORIES.has(norm(m.situation)) &&
      // style catalogs imitating a named comedian are reference, not the bar
      m.source !== 'dataset' &&
      // a whole kept bit is data, not a one-line bar
      m.joke.trim().split(/\s+/).length <= 45,
  )
  const near = Math.max(1, n - 2)
  const out: TasteLine[] = []
  const used = new Set<string>()
  const take = (m: JokenetMatch) => {
    const key = norm(m.situation)
    if (used.has(key) || out.length >= n) return
    used.add(key)
    out.push({ s: m.situation, l: m.joke, m: [m.move, m.mechanism].filter(Boolean).join('; '), ...(m.founder ? { f: true } : {}) })
  }
  // nearest first; within the nearest window, 5s and founder lines lead
  const window = usable.slice(0, near * 3)
  window.sort((a, b) => b.rating - a.rating || Number(b.founder) - Number(a.founder) || b.similarity - a.similarity)
  for (const m of window) if (out.length < near) take(m)
  // range: random 5-rated lines from the rest
  const rest = usable.filter((m) => m.rating >= 5 && !used.has(norm(m.situation)))
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j]!, rest[i]!]
  }
  for (const m of rest) take(m)
  for (const m of usable) take(m)
  return out
}

async function matches(story: string): Promise<JokenetMatch[] | null> {
  if (!story.trim() || !process.env.LOVABLE_API_KEY) return null
  try {
    const { embedText, toVectorLiteral } = await import('@/lib/agents/embeddings.server')
    const vec = await Promise.race([embedText(story), new Promise<null>((r) => setTimeout(() => r(null), EMBED_MS))])
    if (!vec) return null
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data, error } = await (supabaseAdmin as any).rpc('jokenet_match', { q: toVectorLiteral(vec), match_count: 40, min_rating: MIN_RATING })
    if (error || !Array.isArray(data)) return null
    return data as JokenetMatch[]
  } catch {
    return null
  }
}

export type LiveStandard = { lines: TasteLine[]; from: 'jokenet' | 'static' }

/** `n` lines for THE STANDARD on this story: JokeNet when it answers with
 *  enough lines, the static bank otherwise. */
export async function liveStandard(story: string, n: number): Promise<LiveStandard> {
  const m = await matches(story)
  if (m) {
    const lines = pickStandard(m, n)
    if (lines.length >= Math.min(n, 3)) return { lines, from: 'jokenet' }
  }
  return { lines: standardLines(n), from: 'static' }
}
