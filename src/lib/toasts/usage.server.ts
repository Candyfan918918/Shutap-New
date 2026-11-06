// Server only. Toasts counted by plan (Nov 6 2026, pay to create): Free the
// first toast ever, Basic 1 a month (Pacific), Pro unlimited. A toast bought
// on its own ($12.99, before it's written) is stored paid and never counts.
// A bought-ahead toast is one credit: event toast_prepaid (keyed by the
// Stripe session), spent by the next toast written past the plan's limit
// (event toast_prepay_used). Same shape as the realtor kit credits.
import { limitFor } from '../entitlements'
import { today } from '../bits/tier.server'
import type { BitTier } from '../bits/shared'

export type ToastUsage = { tier: BitTier; toasts: { used: number; cap: number | null; period: 'month' | 'ever' }; credits: number }

export async function toastsUsed(admin: any, userId: string, tier: BitTier): Promise<number> {
  const { period } = limitFor('toast', tier)
  let q = admin.from('toasts').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('paid', false)
  if (period === 'month') q = q.gte('day', `${today().day.slice(0, 7)}-01`)
  const { count, error } = await q
  if (error) throw new Error(error.message)
  return count ?? 0
}

/** Stripe sessions of toasts bought ahead and not yet written. */
export async function toastCredits(admin: any, userId: string): Promise<string[]> {
  const [{ data: paid }, { data: used }] = await Promise.all([
    admin.from('events').select('properties').eq('user_id', userId).eq('name', 'toast_prepaid').limit(200),
    admin.from('events').select('properties').eq('user_id', userId).eq('name', 'toast_prepay_used').limit(200),
  ])
  const spent = new Set((used ?? []).map((r: any) => r.properties?.stripe_session).filter(Boolean))
  return [...new Set((paid ?? []).map((r: any) => r.properties?.stripe_session).filter(Boolean) as string[])].filter((s) => !spent.has(s))
}

export async function toastUsage(admin: any, userId: string, tier: BitTier): Promise<ToastUsage> {
  const t = limitFor('toast', tier)
  const [used, credits] = await Promise.all([toastsUsed(admin, userId, tier).catch(() => 0), toastCredits(admin, userId).catch(() => [] as string[])])
  return { tier, toasts: { used, cap: t.cap, period: t.period === 'ever' ? 'ever' : 'month' }, credits: credits.length }
}

/** Before writing a toast: may this one be written, and does it spend a
 *  credit? Past the plan's limit with no credit, the paywall shows. */
export async function toastAllowance(admin: any, userId: string, tier: BitTier): Promise<{ ok: true; credit: string | null; usage: ToastUsage } | { ok: false; usage: ToastUsage }> {
  const usage = await toastUsage(admin, userId, tier)
  if (tier === 'guest') return { ok: false, usage }
  if (usage.toasts.cap === null || usage.toasts.used < usage.toasts.cap) return { ok: true, credit: null, usage }
  const credit = (await toastCredits(admin, userId).catch(() => [] as string[]))[0] ?? null
  return credit ? { ok: true, credit, usage } : { ok: false, usage }
}

/** The mark: only the free plan's own toast carries "— shutap.com". */
export function toastMarked(tier: BitTier, paid: boolean): boolean {
  return tier === 'free' && !paid
}
