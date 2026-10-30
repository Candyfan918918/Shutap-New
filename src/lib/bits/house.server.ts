// The house signal: what the founder's daily ratings (/bit-daily) and the
// homepage joke battle teach the writer. Two things, both fail-soft (no table, no rows, no database in the
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

/* ── the joke battle (homepage) ──
   Each battle version is a line written with a /guides technique; players
   pick the funniest of three. With three on screen, a fair share is 1/3.
   A technique picked more than that is dealt more (up to 2x), less is dealt
   less (down to 0.5x), once it has been shown 30+ times. The most-picked
   lines (20+ showings) are shown to the writer as what the room picked. */
export type BattleVersionRow = { text: string; technique_id: string; shown: number; picked: number; setup: string }

export function battleWeightsFrom(rows: Pick<BattleVersionRow, 'technique_id' | 'shown' | 'picked'>[]): Record<string, number> {
  const t = new Map<string, { shown: number; picked: number }>()
  for (const r of rows) {
    const x = t.get(r.technique_id) ?? { shown: 0, picked: 0 }
    x.shown += r.shown ?? 0
    x.picked += r.picked ?? 0
    t.set(r.technique_id, x)
  }
  const out: Record<string, number> = {}
  for (const [id, { shown, picked }] of t) if (shown >= 30) out[id] = Math.min(2, Math.max(0.5, (picked / shown) * 3))
  return out
}

export function battleExamplesFrom(rows: BattleVersionRow[]): string {
  const top = rows
    .filter((r) => (r.shown ?? 0) >= 20)
    .map((r) => ({ ...r, share: r.picked / r.shown }))
    .filter((r) => r.share > 0.45)
    .sort((a, b) => b.share - a.share)
    .slice(0, 3)
  if (!top.length) return ''
  return `
WHAT THE ROOM PICKED — one-liners that won the homepage joke battle on OTHER
  setups. Match how short and concrete they are. Never reuse their words.

${top.map((r, i) => `${i + 1}. setup: ${r.setup.trim()}\n   line: ${r.text.trim()}`).join('\n')}
`
}

export async function houseSignal(): Promise<HouseSignal> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value
  let value = EMPTY
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const admin = supabaseAdmin as any
    const since = new Date(Date.now() - 60 * 86_400_000).toISOString()
    const [daily, battle] = await Promise.all([
      admin
        .from('bit_daily')
        .select('story, technique_id, bit, verdict, rewrite, best_line, rated_at')
        .not('rated_at', 'is', null)
        .gte('rated_at', since)
        .order('rated_at', { ascending: false })
        .limit(400),
      admin.from('battle_versions').select('text, technique_id, shown, picked, battle_setups(setup)').eq('active', true).gt('shown', 0).limit(2000),
    ])
    const dRows: Row[] = !daily.error && Array.isArray(daily.data) ? daily.data : []
    const bRows: BattleVersionRow[] =
      !battle.error && Array.isArray(battle.data)
        ? battle.data.map((r: any) => ({ text: r.text, technique_id: r.technique_id, shown: r.shown ?? 0, picked: r.picked ?? 0, setup: r.battle_setups?.setup ?? '' }))
        : []
    // Both signals multiply: a technique she keeps AND the room picks rises fastest.
    const weights: Record<string, number> = { ...weightsFrom(dRows) }
    for (const [id, w] of Object.entries(battleWeightsFrom(bRows))) weights[id] = Math.min(2, Math.max(0.25, (weights[id] ?? 1) * w))
    value = { examples: examplesFrom(dRows) + battleExamplesFrom(bRows), weights }
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
