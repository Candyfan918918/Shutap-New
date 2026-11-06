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

/** How many downloads this account has taken this month (Pacific). Nothing
 *  is capped any more (Nov 6 2026: pay to create, never to use); the count is
 *  bookkeeping for the admin views. */
export async function downloadsUsed(admin: any, userId: string, tier: BitTier): Promise<number> {
  const { period } = limitFor('download', tier)
  const day = today().day
  let q = admin.from('bit_downloads').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  q = period === 'month' ? q.gte('day', `${day.slice(0, 7)}-01`) : q.eq('day', day)
  const { count, error } = await q
  if (error) throw new Error(error.message)
  return count ?? 0
}

/** The tier by user id alone (the realtor functions carry no guest identity). */
export async function kitTier(admin: any, userId: string): Promise<BitTier> {
  return (await activePlan(admin, userId)) ?? 'free'
}
