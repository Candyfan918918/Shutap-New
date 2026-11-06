// The plans and their list prices, in one place.
//
// Every screen that shows a price — /pricing, /subscribe, /subscribe/return,
// the paywall and upgrade sheets on the writer — reads it from here, so a
// price change is one edit and never drifts between surfaces. Amounts are
// pre-tax list prices; Stripe adds location-based tax inside the embedded
// checkout.
//
// `priceId` is the Stripe lookup key. mirror_monthly / mirror_annual never
// change name (they are Pro). basic_monthly is the Basic plan.
import type { BitTier } from './bits/shared'
import { BIT_CAPS, DOWNLOAD_CAPS } from './bits/plans'

/** Prices changed Nov 5 2026: Basic $7.99 → $19.99 (20 downloads a month,
 *  AI on demand unlimited). Pro unchanged. Lookup keys never change. */

/** One realtor kit, bought on its own (Nov 6 2026): a one-time Stripe price
 *  behind the lookup key kit_once. The kit is then never counted or marked. */
export const KIT_ONCE = { priceId: 'kit_once', amount: 12.99, name: 'Shutap for Realtors · one kit', description: 'One listing kit: the walkthrough, voiceover, hooks, open-house kit, posts and straight copy, in one tone. Yours to copy and download without limits or marks.' } as const

export type PlanKey = 'basic' | 'pro' | 'pro_annual'
export type PaidPlan = 'basic' | 'pro'

export type PlanEntry = {
  key: PlanKey
  priceId: string
  name: string
  amount: number
  interval: 'month' | 'year'
  tier: Extract<BitTier, 'basic' | 'pro'>
  /** offered to new buyers */
  shown: boolean
}

export const PLANS: Record<PlanKey, PlanEntry> = {
  basic: { key: 'basic', priceId: 'basic_monthly', name: 'Basic', amount: 19.99, interval: 'month', tier: 'basic', shown: true },
  pro: { key: 'pro', priceId: 'mirror_monthly', name: 'Pro', amount: 49.99, interval: 'month', tier: 'pro', shown: true },
  // Hidden from new buyers for now. Anyone already on it is Pro.
  pro_annual: { key: 'pro_annual', priceId: 'mirror_annual', name: 'Pro annual', amount: 49.99, interval: 'year', tier: 'pro', shown: false },
}

/** The product name Stripe shows at checkout, receipts and invoices. The Pro
 *  product was first made as "The Mirror"; the lookup keys never change,
 *  only these labels. Kept in step by /api/public/payments/prices. */
export const STRIPE_NAMES: Record<PaidPlan, string> = {
  basic: 'Shutap Basic',
  pro: 'Shutap Pro',
}

/** The product description Stripe shows at checkout, kept in step with
 *  the plans by /api/public/payments/prices. */
export const STRIPE_DESCRIPTIONS: Record<PaidPlan, string> = {
  basic: `Shutap Basic: ${BIT_CAPS.basic} new bits a day (a rewrite counts as one), AI on demand on every line, 3 realtor kits a day, and ${DOWNLOAD_CAPS.basic} downloads a month with no watermark.`,
  pro: 'Shutap Pro: unlimited bits, rewrites, realtor kits and downloads with no watermark, plus the Mirror.',
}

/** What each plan gives, in the same words on every surface. */
export const PLAN_LINES: Record<PaidPlan, string[]> = {
  basic: [`${BIT_CAPS.basic} new bits a day (a rewrite counts as one)`, 'Rewrites, crowd-work swaps and mix your own', `${DOWNLOAD_CAPS.basic} downloads a month, no watermark`, 'AI on demand: funnier, line by line, unlimited', '3 realtor kits a day'],
  pro: ['Unlimited bits and rewrites', 'Unlimited downloads, no watermark', 'Unlimited realtor kits', 'The Mirror'],
}

/** The plans side by side: the same rows on every surface that compares
 *  them (pricing page, paywall, upgrade sheet, account page), so Free never
 *  reads as the biggest plan. `short` fits a narrow table cell. */
export type CompareTier = 'free' | 'basic' | 'pro'
export type CompareCell = { value: string; short: string; on: boolean }
export type CompareRow = { label: string; short: string; cells: Record<CompareTier, CompareCell> }
export const PLAN_COMPARE: CompareRow[] = [
  {
    label: 'New bits a day',
    short: 'Bits a day',
    cells: {
      free: { value: `${BIT_CAPS.free} a day, as written`, short: `${BIT_CAPS.free}/day`, on: true },
      basic: { value: `${BIT_CAPS.basic} a day`, short: `${BIT_CAPS.basic}/day`, on: true },
      pro: { value: 'Unlimited', short: 'Unlimited', on: true },
    },
  },
  {
    label: 'Rewrites (hotter, tighter, storytelling), crowd-work swaps, mix your own',
    short: 'Rewrites',
    cells: {
      free: { value: 'Not included', short: '—', on: false },
      basic: { value: 'Included (a rewrite counts as a bit)', short: '✓', on: true },
      pro: { value: 'Included', short: '✓', on: true },
    },
  },
  {
    label: 'Downloads (the video, the picture, a copied line)',
    short: 'Downloads',
    cells: {
      free: { value: `${DOWNLOAD_CAPS.free} a day, watermarked`, short: `${DOWNLOAD_CAPS.free}/day · mark`, on: false },
      basic: { value: `${DOWNLOAD_CAPS.basic} a month, no watermark`, short: `${DOWNLOAD_CAPS.basic}/mo · clean`, on: true },
      pro: { value: 'Unlimited, no watermark', short: '∞ · clean', on: true },
    },
  },
  {
    label: 'AI on demand: "funnier" on any one line, lock a line, keep your edits',
    short: 'Line by line',
    cells: {
      free: { value: '3 touches a day', short: '3/day', on: true },
      basic: { value: 'Unlimited', short: '∞', on: true },
      pro: { value: 'Unlimited', short: '∞', on: true },
    },
  },
  {
    label: 'Realtor kits (paste a listing, get the shoot kit)',
    short: 'Realtor kits',
    cells: {
      free: { value: 'First kit free, outputs marked', short: '1 · mark', on: true },
      basic: { value: '3 a day; copies from the download pool', short: '3/day', on: true },
      pro: { value: 'Unlimited', short: '∞', on: true },
    },
  },
  {
    label: 'The Mirror',
    short: 'The Mirror',
    cells: {
      free: { value: 'Not included', short: '—', on: false },
      basic: { value: 'Not included', short: '—', on: false },
      pro: { value: 'Included', short: '✓', on: true },
    },
  },
]

/** Free in one line (Nov 6 2026, Candy: "free is 1 bit daily with a watermarked download"):
 *  every surface that sums up Free uses these words. */
export const FREE_LINE = `${BIT_CAPS.free} bit a day + ${DOWNLOAD_CAPS.free} watermarked download a day`

/** What every plan has, Free included (with a free account). Listed once,
 *  beside the comparison. Rewrites are Basic and Pro since Nov 1 2026. */
export const EVERY_PLAN = [
  'A full bit: hook, setup, tags and button',
  'A 5-second video of it',
  'Stand-up on the teleprompter',
  'Sketch and skit',
  'My creations: every bit and kit in one place',
] as const

const BY_PRICE: Record<string, PlanEntry> = Object.fromEntries(Object.values(PLANS).map((p) => [p.priceId, p]))

export function planByPriceId(priceId: string | null | undefined): PlanEntry | null {
  return priceId ? (BY_PRICE[priceId] ?? null) : null
}

/** The paid tier a subscription's price buys. An unknown price on an active
 *  subscription is still a paid plan, but never unlocks the Mirror by
 *  accident: it maps to Basic (and is logged where it's read). */
export function planFromPriceId(priceId: string | null | undefined): PaidPlan | null {
  if (!priceId) return null
  return planByPriceId(priceId)?.tier ?? 'basic'
}

/** The product a subscription row records for a price: Pro prices are
 *  'mirror' (the Mirror and has_active_mirror key on it), everything else
 *  'basic' — so an unknown price can never unlock the Mirror. */
export function productIdForPrice(priceId: string | null | undefined): 'mirror' | 'basic' {
  return planFromPriceId(priceId) === 'pro' ? 'mirror' : 'basic'
}

/** Lookup keys a new checkout may use. */
export function isCheckoutPriceId(priceId: string): boolean {
  const p = planByPriceId(priceId)
  return !!p && p.shown
}

/** ?plan= on /subscribe, including old links: monthly → Pro, annual → Pro
 *  annual while it's offered, else Pro. */
export function planKeyFromParam(raw: string | null | undefined): PlanKey {
  const v = (raw ?? '').toLowerCase()
  if (v === 'basic') return 'basic'
  if (v === 'pro_annual' || v === 'annual') return PLANS.pro_annual.shown ? 'pro_annual' : 'pro'
  return 'pro'
}

export const usd = (n: number) => `$${n.toFixed(2)}`
