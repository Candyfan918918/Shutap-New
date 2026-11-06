// Server-only tier and download-count helpers shared by bits and realtor functions.
import type { JokeIdentity } from '../jokes/session.server'
import { activePlan } from '../plan.server'
import { limitFor } from '../entitlements'
import { today } from './usage.server'
import type { BitTier } from './shared'

export { today }

/** The caller's tier for bits, from their subscription rows: Basic or Pro
 *  by the price they pay. A read error counts as free, never as paid. */
export async function resolveTier(admin: any, id: JokeIdentity): Promise<BitTier> {
  if (!id.userId) return 'guest'
  return (await activePlan(admin, id.userId)) ?? 'free'
}

/** How many downloads this account has taken in the plan's period: today for
 *  Free, the calendar month (Pacific) for Basic (Nov 5 2026). */
export async function downloadsUsed(admin: any, userId: string, tier: BitTier): Promise<number> {
  const { period } = limitFor('download', tier)
  const day = today().day
  let q = admin.from('bit_downloads').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  q = period === 'month' ? q.gte('day', `${day.slice(0, 7)}-01`) : q.eq('day', day)
  const { count, error } = await q
  if (error) throw new Error(error.message)
  // the realtor kit's copies and PDFs share the pool (Nov 6 2026)
  let kitUnits = 0
  try {
    let k = admin.from('kit_downloads').select('units').eq('user_id', userId).eq('watermarked', false)
    k = period === 'month' ? k.gte('day', `${day.slice(0, 7)}-01`) : k.eq('day', day)
    const { data: rows } = await k
    kitUnits = (rows ?? []).reduce((n: number, r: any) => n + (Number(r.units) || 0), 0)
  } catch { /* the kit ledger may not exist yet */ }
  return (count ?? 0) + kitUnits
}

/** The tier by user id alone (the realtor functions carry no guest identity). */
export async function kitTier(admin: any, userId: string): Promise<BitTier> {
  return (await activePlan(admin, userId)) ?? 'free'
}
