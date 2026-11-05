// What each plan allows (Nov 5 2026). The one place the limits live: the
// pricing page, the paywall copy, the server charges and the usage bar all
// read from here, so a price or limit change is one edit. Safe in the
// browser (no secrets, Pro's fair-use number stays on the server).
//
//   kind       what it counts                               guest free basic pro
//   bit        a new story, or hotter/tighter/storytelling   0     1    3     ∞ (server fair-use)
//   download   the video, picture, PDF or a copied line      0     1/day 20/month ∞
//   touch      "funnier" on one line (AI on demand)          0     3    ∞     ∞
//   kit        a realtor kit (6 downloads)                   0     1    —     ∞
// The usage pool and the monthly realtor counts land with the pricing slice;
// the shape here is what they'll fill in.
import { BIT_CAPS, DOWNLOAD_CAPS, DOWNLOAD_PERIOD } from './bits/plans'
import type { BitTier } from './bits/shared'

export type EntitlementKind = 'bit' | 'download' | 'touch' | 'kit'
export type Period = 'day' | 'month' | 'ever'

export type Limit = { cap: number | null; period: Period }

/** null cap = unlimited (Pro's hidden fair-use cap is applied on the server). */
export function limitFor(kind: EntitlementKind, tier: BitTier): Limit {
  switch (kind) {
    case 'bit':
      return { cap: tier === 'pro' ? null : BIT_CAPS[tier], period: 'day' }
    case 'download':
      return tier === 'pro' ? { cap: null, period: 'month' } : tier === 'guest' ? { cap: 0, period: 'day' } : { cap: DOWNLOAD_CAPS[tier], period: DOWNLOAD_PERIOD[tier] }
    case 'touch':
      return { cap: tier === 'guest' ? 0 : tier === 'free' ? 3 : null, period: 'day' }
    case 'kit':
      return { cap: tier === 'pro' ? null : tier === 'guest' ? 0 : 1, period: tier === 'free' ? 'ever' : 'month' }
  }
}

export type Decision = { ok: true; cap: number | null; used: number } | { ok: false; reason: 'sign_in' | 'limited'; cap: number; used: number }

/** The decision, given what's been used already. The server reads `used`
 *  from the ledger; the browser uses it only to label buttons. */
export function can(kind: EntitlementKind, tier: BitTier, used: number): Decision {
  if (tier === 'guest') return { ok: false, reason: 'sign_in', cap: 0, used }
  const { cap } = limitFor(kind, tier)
  if (cap !== null && used >= cap) return { ok: false, reason: 'limited', cap, used }
  return { ok: true, cap, used }
}

/** The number shown to the person for a capped kind, never Pro's. */
export function capShown(kind: EntitlementKind, tier: BitTier): number | null {
  return limitFor(kind, tier).cap
}
