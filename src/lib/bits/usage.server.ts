// The daily budget of NEW bits, per person (or guest browser) per Pacific day.
//
//   guest 1 · free 2 (counting that day's guest bit) · basic 5 · pro fair-use
//
// Every change goes through the bit_usage functions (migration
// 20261022190000_bit-usage.sql): one locked write each, keyed by bit id, so
// two taps at once can't both pass the cap and a retried bit is never counted
// twice. Rewrites never touch this budget.
//
// JOKE_DAILY_SETS (the old card surface's one-number-for-every-tier override)
// is deliberately ignored here: it would flatten the tier caps.
import { nextPacificMidnight, pacificDay } from '@/lib/pacific-day'
import { ipFlipLimit, ipSubjectKey } from '@/lib/jokes/session.server'
import { BIT_CAPS } from './plans'
import type { BitTier, BitUsage } from './shared'

const PRO_DEFAULT_CAP = 50

/** Pro's hidden fair-use cap: BIT_PRO_DAILY_CAP, else 50. */
export function proCap(): number {
  const n = Number(process.env['BIT_PRO_DAILY_CAP'] ?? '')
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : PRO_DEFAULT_CAP
}

export function capFor(tier: BitTier): number {
  return tier === 'pro' ? proCap() : BIT_CAPS[tier]
}

/** Today's key and when it resets, both in Los Angeles time. */
export function today(now = Date.now()): { day: string; resetsAt: string } {
  return { day: pacificDay(now), resetsAt: nextPacificMidnight(now) }
}

/** What the browser is told. Pro's cap is never sent. */
export function usageView(tier: BitTier, used: number, resetsAt: string): BitUsage {
  return { used, cap: tier === 'pro' ? null : capFor(tier), resets_at: resetsAt }
}

export async function readUsed(admin: any, subjectKey: string, day: string): Promise<number> {
  const { data, error } = await admin
    .from('bit_usage')
    .select('used')
    .eq('subject_key', subjectKey)
    .eq('day', day)
    .maybeSingle()
  if (error) throw new Error(`bit_usage read: ${error.message}`)
  return (data?.used as number | undefined) ?? 0
}

/** Charge one new bit. Returns today's new count, or -1 at the cap. A bit id
 *  that was already charged returns the count without charging again.
 *  Throws if the database can't be reached — callers then refuse the write
 *  rather than write uncounted. */
export async function chargeBit(admin: any, subjectKey: string, day: string, cap: number, bitId: string): Promise<number> {
  const { data, error } = await admin.rpc('bit_charge', { p_subject: subjectKey, p_day: day, p_cap: cap, p_bit: bitId })
  if (error) throw new Error(`bit_charge: ${error.message}`)
  return Number(data)
}

/** Give one bit back (nothing was written, or the Guard fired). Never throws:
 *  a failed refund costs the person one bit, it must not lose their result. */
export async function refundBit(admin: any, subjectKey: string, day: string, bitId: string): Promise<void> {
  try {
    const { error } = await admin.rpc('bit_refund', { p_subject: subjectKey, p_day: day, p_bit: bitId })
    if (error) console.error('[bits] refund failed', error.message)
  } catch (e) {
    console.error('[bits] refund threw', e instanceof Error ? e.message : e)
  }
}

/** After sign-in: this browser's guest bits today count toward the account.
 *  Safe to repeat. Returns the account's count for today. */
export async function mergeGuestUsage(admin: any, userId: string, anonId: string, day: string): Promise<number> {
  const { data, error } = await admin.rpc('bit_merge_guest', {
    p_user: 'user:' + userId,
    p_guest: 'anon:' + anonId,
    p_day: day,
  })
  if (error) throw new Error(`bit_merge_guest: ${error.message}`)
  return Number(data)
}

type NetRow = { subject_key: string; day: string; flips_used: number }

/** The coarse per-network layer against scripted guest use: spends `cost`
 *  units per model run on the caller's network. Guests only — an account is
 *  already held to its own daily cap, and a shared office network must not
 *  block a paying writer. */
export async function chargeNetwork(admin: any, tier: BitTier, day: string, cost = 1): Promise<'ok' | 'limited'> {
  if (tier !== 'guest') return 'ok'
  if (!Number.isFinite(ipFlipLimit())) return 'ok'
  const ipKey = ipSubjectKey()
  if (!ipKey) return 'ok'
  const { data } = await admin
    .from('joke_flips')
    .select('subject_key, day, flips_used')
    .eq('subject_key', ipKey)
    .eq('day', day)
    .maybeSingle()
  const row = (data as NetRow | null) ?? { subject_key: ipKey, day, flips_used: 0 }
  if (row.flips_used >= ipFlipLimit()) return 'limited'
  await admin.from('joke_flips').upsert(
    { subject_key: ipKey, day, flips_used: row.flips_used + cost, sets_flipped: 0, set_ids: [] } as never,
    { onConflict: 'subject_key,day' },
  )
  return 'ok'
}
