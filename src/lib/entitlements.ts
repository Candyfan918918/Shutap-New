// What each plan allows. The one place the limits live: the pricing page,
// the paywall copy, the server charges and the usage bar all read from here,
// so a price or limit change is one edit. Safe in the browser (no secrets,
// Pro's fair-use number stays on the server).
//
// Nov 6 2026 (Candy): pay to create, never to use. Only making something new
// is counted: a bit, a realtor kit (a toast when it ships). Everything done
// with what you made is unlimited on every plan: downloads, copies, the PDF,
// the prompter, "funnier" on a line, lock. Free's downloads carry the
// shutap.com mark; Basic, Pro and anything bought one-time are clean.
//
//   kind       what it counts                               guest free   basic     pro
//   bit        a new story, or hotter/tighter/storytelling   0     1/day  3/day     ∞ (server fair-use)
//   kit        a realtor kit written (a rewrite is one too)  0     1 ever 20/month  ∞
//   toast      a toast written ("change a line" is a new one) 0    1 ever 1/month   ∞
//   download   the video, picture, PDF or a copied line      0     ∞ mark ∞         ∞     (never counted)
//   touch      "funnier" on one line (AI on demand)          0     ∞      ∞         ∞
// A kit or a toast bought on its own ($12.99, before or after it's written)
// never counts.
import { BIT_CAPS } from './bits/plans'
import type { BitTier } from './bits/shared'

/** Realtor kits written, by plan (Nov 6 2026): Free 1 ever, Basic 20 a month. */
export const KIT_CAPS = { free: 1, basic: 20 } as const

/** Toasts written, by plan (Nov 6 2026): Free the first one ever, Basic 1 a month, Pro unlimited. */
export const TOAST_CAPS = { free: 1, basic: 1 } as const

export type EntitlementKind = 'bit' | 'download' | 'touch' | 'kit' | 'toast'
export type Period = 'day' | 'month' | 'ever'

export type Limit = { cap: number | null; period: Period }

/** null cap = unlimited (Pro's hidden fair-use cap is applied on the server). */
export function limitFor(kind: EntitlementKind, tier: BitTier): Limit {
  switch (kind) {
    case 'bit':
      return { cap: tier === 'pro' ? null : BIT_CAPS[tier], period: 'day' }
    case 'download':
      // never counted: a signed-in person downloads and copies freely
      return tier === 'guest' ? { cap: 0, period: 'day' } : { cap: null, period: 'month' }
    case 'touch':
      return { cap: tier === 'guest' ? 0 : null, period: 'day' }
    case 'kit':
      return tier === 'pro' ? { cap: null, period: 'month' } : tier === 'guest' ? { cap: 0, period: 'day' } : tier === 'free' ? { cap: KIT_CAPS.free, period: 'ever' } : { cap: KIT_CAPS.basic, period: 'month' }
    case 'toast':
      return tier === 'pro' ? { cap: null, period: 'month' } : tier === 'guest' ? { cap: 0, period: 'day' } : tier === 'free' ? { cap: TOAST_CAPS.free, period: 'ever' } : { cap: TOAST_CAPS.basic, period: 'month' }
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
