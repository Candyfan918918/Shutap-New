// Shutap for small business: may this account ask for skits now? Pure, so
// the rule is tested on its own; the counts come from usage.server.ts.
import type { BitTier } from '../bits/shared'

/** Skit sets one account may ask for in a Pacific day: the first three and
 *  "Show 3 different ones" three more times. Pro gets room for a batch day. */
export const SKIT_SETS_A_DAY: Record<Exclude<BitTier, 'guest'>, number> = { free: 4, basic: 4, pro: 16 }

export type ShopUsage = { tier: BitTier; videos: { used: number; cap: number | null; period: 'day' | 'ever' }; sets_today: number; sets_cap: number }

export type SkitAllowance = { ok: true; usage: ShopUsage } | { ok: false; reason: 'limited' | 'enough_today'; usage: ShopUsage }

/** May this account ask for skits now? 'limited' is the plan (the free 3 are
 *  used, or today's Basic video is made): the limit screen shows.
 *  'enough_today' is fair use: the screen says to pick from what is there.
 *  A count that cannot be read throws; the caller refuses rather than guess. */
export function skitAllowance(usage: ShopUsage): SkitAllowance {
  if (usage.videos.cap !== null && usage.videos.used >= usage.videos.cap) return { ok: false, reason: 'limited', usage }
  if (usage.sets_today >= usage.sets_cap) return { ok: false, reason: 'enough_today', usage }
  return { ok: true, usage }
}
