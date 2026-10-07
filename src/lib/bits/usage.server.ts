// The daily story budget for bits. Shares joke_flips with the card surface,
// so a story is a story whichever screen wrote it: five a day at every tier
// (DAILY_SETS), tunable with JOKE_DAILY_SETS. A bit costs one story.
import { DAILY_SETS } from '@/lib/jokes/deck'
import { ipFlipLimit, ipSubjectKey } from '@/lib/jokes/session.server'
import type { BitTier, BitUsage } from './shared'

type FlipRow = {
  subject_key: string
  day: string
  flips_used: number
  sets_flipped: number
  set_ids: string[]
}

export function storiesCap(tier: BitTier): number {
  const env = Number(process.env['JOKE_DAILY_SETS'] ?? '')
  return Number.isFinite(env) && env > 0 ? Math.floor(env) : DAILY_SETS[tier]
}

export async function readCounter(admin: any, subjectKey: string, day: string): Promise<FlipRow> {
  const { data } = await admin
    .from('joke_flips')
    .select('subject_key, day, flips_used, sets_flipped, set_ids')
    .eq('subject_key', subjectKey)
    .eq('day', day)
    .maybeSingle()
  return (data as FlipRow | null) ?? { subject_key: subjectKey, day, flips_used: 0, sets_flipped: 0, set_ids: [] }
}

export function usageFrom(tier: BitTier, counter: FlipRow, resetsAt: string): BitUsage {
  return { used: counter.sets_flipped, cap: storiesCap(tier), resets_at: resetsAt }
}

/** Charge one story BEFORE any model runs, so a crash cannot refund itself. */
export async function chargeStory(admin: any, counter: FlipRow, bitId: string): Promise<void> {
  await admin.from('joke_flips').upsert(
    {
      subject_key: counter.subject_key,
      day: counter.day,
      flips_used: counter.flips_used + 1,
      sets_flipped: counter.sets_flipped + 1,
      set_ids: [...counter.set_ids, bitId],
    } as never,
    { onConflict: 'subject_key,day' },
  )
}

/** Give the story back when nothing could be written for it. */
export async function refundStory(admin: any, subjectKey: string, day: string, bitId: string): Promise<void> {
  const row = await readCounter(admin, subjectKey, day)
  if (!row.set_ids.includes(bitId)) return
  await admin.from('joke_flips').upsert(
    {
      subject_key: subjectKey,
      day,
      flips_used: Math.max(0, row.flips_used - 1),
      sets_flipped: Math.max(0, row.sets_flipped - 1),
      set_ids: row.set_ids.filter((x) => x !== bitId),
    } as never,
    { onConflict: 'subject_key,day' },
  )
}

/** The coarse per-network layer: spends one unit per model run. */
export async function chargeNetwork(admin: any, day: string, cost = 1): Promise<'ok' | 'limited'> {
  if (!Number.isFinite(ipFlipLimit())) return 'ok'
  const ipKey = ipSubjectKey()
  if (!ipKey) return 'ok'
  const row = await readCounter(admin, ipKey, day)
  if (row.flips_used >= ipFlipLimit()) return 'limited'
  await admin.from('joke_flips').upsert(
    { subject_key: ipKey, day, flips_used: row.flips_used + cost, sets_flipped: 0, set_ids: [] } as never,
    { onConflict: 'subject_key,day' },
  )
  return 'ok'
}
