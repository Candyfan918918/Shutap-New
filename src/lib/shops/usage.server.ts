// Server only. Small-business videos counted by plan (Nov 21 2026, pay to
// create): Free the first 3 ever, Basic 1 new video every Pacific day (an
// unused day does not carry over), Pro unlimited. What is counted is a
// finished video, never a skit: writing and rewriting lines is free.
//
// Skit sets are held to a few a day so "Show 3 different ones" cannot run a
// bill: the number is fair use, not a plan limit, and no screen sells it.
import { limitFor } from '../entitlements'
import { today } from '../bits/tier.server'
import type { BitTier } from '../bits/shared'

import { SKIT_SETS_A_DAY, type ShopUsage } from './allowance'

export { skitAllowance, SKIT_SETS_A_DAY, type ShopUsage, type SkitAllowance } from './allowance'

export async function videosUsed(admin: any, userId: string, tier: BitTier): Promise<number> {
  const { period } = limitFor('shopvideo', tier)
  let q = admin.from('shop_videos').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  if (period === 'day') q = q.eq('day', today().day)
  const { count, error } = await q
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function setsToday(admin: any, userId: string): Promise<number> {
  const { count, error } = await admin.from('shop_skit_sets').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('day', today().day)
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function shopUsage(admin: any, userId: string, tier: BitTier): Promise<ShopUsage> {
  const v = limitFor('shopvideo', tier)
  const [used, sets] = await Promise.all([videosUsed(admin, userId, tier), setsToday(admin, userId)])
  return { tier, videos: { used, cap: v.cap, period: v.period === 'ever' ? 'ever' : 'day' }, sets_today: sets, sets_cap: tier === 'guest' ? 0 : SKIT_SETS_A_DAY[tier] }
}

