// The house signal: what the founder's daily ratings (/bit-daily) teach the
// writer. Two things, both fail-soft (no table, no rows, no database in the
// unit tests → the writer runs exactly as before):
//
//   examples — the most recent bits she kept or rewrote, shown to the writer
//              as "her taste" on OTHER stories. Rewrites first: they are her
//              own voice. The eval's thirty stories never come from here, so
//              the blind eval stays a fair test.
//   weights  — per technique, how often its bits were kept. A technique she
//              keeps is dealt more; one she keeps cutting is dealt less, never
//              dropped (floor 0.25×, ceiling 2×, 1× before any rating).
import type { BitDraft } from './shared'

export type HouseSignal = { examples: string; weights: Record<string, number> }

const EMPTY: HouseSignal = { examples: '', weights: {} }
const TTL_MS = 10 * 60_000
const MAX_EXAMPLES = 4

let cache: { at: number; value: HouseSignal } | null = null

type Row = {
  story: string
  technique_id: string
  bit: BitDraft | null
  verdict: 'keep' | 'cut' | 'rewrite' | null
  rewrite: string | null
  best_line: string | null
  rated_at: string | null
}

export function bitText(b: Pick<BitDraft, 'hook' | 'setup' | 'tags' | 'button'>): string {
  return [b.hook, b.setup, ...b.tags, b.button].join('\n')
}

/** Kept share → deal multiplier. A rewrite counts as half a keep: close, not there. */
export function weightsFrom(rows: Pick<Row, 'technique_id' | 'verdict'>[]): Record<string, number> {
  const tally = new Map<string, { kept: number; rated: number }>()
  for (const r of rows) {
    if (!r.verdict) continue
    const t = tally.get(r.technique_id) ?? { kept: 0, rated: 0 }
    t.rated++
    t.kept += r.verdict === 'keep' ? 1 : r.verdict === 'rewrite' ? 0.5 : 0
    tally.set(r.technique_id, t)
  }
  const out: Record<string, number> = {}
  for (const [id, { kept, rated }] of tally) out[id] = Math.min(2, Math.max(0.25, ((kept + 1) / (rated + 2)) * 2))
  return out
}

/** The {{HOUSE}} block, or '' when nothing has been kept yet. */
export function examplesFrom(rows: Row[]): string {
  const kept = rows
    .filter((r) => (r.verdict === 'rewrite' && r.rewrite?.trim()) || (r.verdict === 'keep' && r.bit))
    .sort((a, b) => (a.verdict === b.verdict ? 0 : a.verdict === 'rewrite' ? -1 : 1))
    .slice(0, MAX_EXAMPLES)
  if (!kept.length) return ''
  const shown = kept.map((r, i) => {
    const text = r.verdict === 'rewrite' ? r.rewrite!.trim() : bitText(r.bit!)
    const best = r.best_line?.trim() ? `\n  (the line she marked funniest: ${r.best_line.trim()})` : ''
    return `${i + 1}. story: ${r.story.trim()}\n${text
      .split('\n')
      .map((l) => `  ${l}`)
      .join('\n')}${best}`
  })
  return `
WHAT THE PERFORMER KEPT — bits she rated and kept (or rewrote in her own
  words) on OTHER stories. This is her taste: how plain and human they
  sound, how small and physical the picture is, how little they explain.
  Match that register. Never reuse their words, nouns, numbers or premise.

${shown.join('\n\n')}
`
}

export async function houseSignal(): Promise<HouseSignal> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value
  let value = EMPTY
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const since = new Date(Date.now() - 60 * 86_400_000).toISOString()
    const { data, error } = await (supabaseAdmin as any)
      .from('bit_daily')
      .select('story, technique_id, bit, verdict, rewrite, best_line, rated_at')
      .not('rated_at', 'is', null)
      .gte('rated_at', since)
      .order('rated_at', { ascending: false })
      .limit(400)
    if (!error && Array.isArray(data)) value = { examples: examplesFrom(data as Row[]), weights: weightsFrom(data as Row[]) }
  } catch {
    value = EMPTY
  }
  cache = { at: Date.now(), value }
  return value
}

/** After a rating, the next bit should see it. */
export function forgetHouseSignal(): void {
  cache = null
}
