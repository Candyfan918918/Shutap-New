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
import { BIT_CAPS } from './bits/plans'

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
  basic: { key: 'basic', priceId: 'basic_monthly', name: 'Basic', amount: 1.99, interval: 'month', tier: 'basic', shown: true },
  pro: { key: 'pro', priceId: 'mirror_monthly', name: 'Pro', amount: 7.99, interval: 'month', tier: 'pro', shown: true },
  // Hidden from new buyers for now. Anyone already on it is Pro.
  pro_annual: { key: 'pro_annual', priceId: 'mirror_annual', name: 'Pro annual', amount: 49.99, interval: 'year', tier: 'pro', shown: false },
}

/** What each plan gives, in the same words on every surface. */
export const PLAN_LINES: Record<PaidPlan, string[]> = {
  basic: [`${BIT_CAPS.basic} new bits a day`, '3 downloads a day, no watermark'],
  pro: ['Unlimited bits', 'Unlimited downloads, no watermark', 'The Mirror'],
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
      free: { value: `${BIT_CAPS.free}`, short: `${BIT_CAPS.free}`, on: true },
      basic: { value: `${BIT_CAPS.basic}`, short: `${BIT_CAPS.basic}`, on: true },
      pro: { value: 'Unlimited', short: 'Unlimited', on: true },
    },
  },
  {
    label: 'Downloads a day (the video, and the caption + hashtags, each count as one)',
    short: 'Downloads',
    cells: {
      free: { value: '1, watermarked', short: '1 · mark', on: false },
      basic: { value: '3, no watermark', short: '3 · clean', on: true },
      pro: { value: 'Unlimited, no watermark', short: '∞ · clean', on: true },
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

/** What every plan has, Free included. Listed once, beside the comparison. */
export const EVERY_PLAN = [
  'A full bit: hook, setup, tags and button',
  'A 5-second video of it',
  'Hotter, tighter, escalate (each counts as a bit), mix and tag swap',
  'Teleprompter',
  'Scene and screenplay',
  'Caption and hashtags',
  'Set list of every bit',
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
