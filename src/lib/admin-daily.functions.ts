// Admin daily report: one Pacific calendar day at a glance — users, returning
// people, visits, sign-in rate, bits, and who made the most. Admin-only; every
// number comes from real rows. Admin accounts and accounts with no email are
// left out of every count.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { PACIFIC_TZ, pacificDay, pacificMidnight, shiftDay } from './pacific-day'
import { PAYWALL_EVENTS, aggregatePaywall, type PaywallEventRow, type PaywallReport } from './paywall-report'

const TZ = PACIFIC_TZ
const DAY = 24 * 3600 * 1000

async function assertAdmin(ctx: unknown): Promise<void> {
  const c = ctx as { supabase: { rpc: (fn: 'has_role', args: { _user_id: string; _role: 'admin' }) => PromiseLike<{ data: unknown; error: unknown }> }; userId: string }
  const { data, error } = await c.supabase.rpc('has_role', { _user_id: c.userId, _role: 'admin' })
  if (error || !data) throw new Error('Forbidden')
}

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  const size = 1000
  for (let from = 0; from < 200_000; from += size) {
    const { data, error } = await build(from, from + size - 1)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as T[]
    out.push(...rows)
    if (rows.length < size) break
  }
  return out
}

// Shared with the daily bit limits, so the report and the limits agree on
// where a day starts and ends.
const dayKey = (ms: number) => pacificDay(ms)
const laMidnight = pacificMidnight
const shiftKey = shiftDay

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null)

export interface TopMaker {
  user_id: string | null
  name: string | null
  email: string | null
  bits_day: number
  bits_total: number
}

export interface DailyReport {
  day: string
  prev_day: string
  next_day: string | null
  is_today: boolean
  timezone: string
  generated_at: string
  users: { total: number; new_today: number; dau: number; mau: number; returning: number }
  visits: { sessions: number; unique: number; returning: number; new: number }
  rates: { signed_in_pct: number | null; signup_pct: number | null; signed_in_people: number }
  bits: { day: number; day_signed_in: number; day_guest: number; rewrites_day: number; total: number }
  top_makers: TopMaker[]
  guests: { bits_day: number; bits_total: number }
  hidden: { admins: number; no_email: number }
  /** sign-in prompt → paywall → plan → checkout → paid, unique people */
  paywall: PaywallReport
}

export const adminDailyReport = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }): Promise<DailyReport> => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const db = supabaseAdmin as any
    const now = Date.now()
    const todayKey = dayKey(now)
    const day = data.day && data.day <= todayKey ? data.day : todayKey
    const start = laMidnight(day)
    const end = laMidnight(shiftKey(day, 1))
    const mauStart = laMidnight(shiftKey(day, -29))
    const iso = (ms: number) => new Date(ms).toISOString()
    const ts = (s: string) => new Date(s).getTime()
    const inDay = (s: string) => { const t = ts(s); return t >= start && t < end }

    type Profile = { user_id: string; email: string | null; full_name: string | null; first_name: string | null; last_name: string | null; signup_at: string | null }
    type Bit = { id: string; user_id: string | null; created_at: string }
    type Visit = { user_id: string | null; session_id: string | null; started_at: string }

    const [profiles, roles, noEmail, bits, rewritesDay, visitsDay, paywallRows] = await Promise.all([
      fetchAll<Profile>((f, t) => db.from('profiles')
        .select('user_id, email, full_name, first_name, last_name, signup_at')
        .eq('is_anonymous', false).not('email', 'is', null).neq('email', '').order('user_id').range(f, t)),
      fetchAll<{ user_id: string }>((f, t) => db.from('user_roles').select('user_id').eq('role', 'admin').order('user_id').range(f, t)),
      fetchAll<{ user_id: string }>((f, t) => db.from('profiles').select('user_id').eq('is_anonymous', false).or('email.is.null,email.eq.').order('user_id').range(f, t)),
      fetchAll<Bit>((f, t) => db.from('bits').select('id, user_id, created_at').lt('created_at', iso(end)).order('created_at').range(f, t)),
      fetchAll<{ bit_id: string }>((f, t) => db.from('bit_versions').select('bit_id').neq('kind', 'original')
        .gte('created_at', iso(start)).lt('created_at', iso(end)).order('created_at').range(f, t)),
      fetchAll<Visit>((f, t) => db.from('visits_classified').select('user_id, session_id, started_at').eq('is_bot', false)
        .gte('started_at', iso(start)).lt('started_at', iso(end)).order('started_at').range(f, t)),
      fetchAll<PaywallEventRow>((f, t) => db.from('events').select('name, user_id, session_id, properties')
        .in('name', [...PAYWALL_EVENTS]).gte('ts', iso(start)).lt('ts', iso(end)).order('ts').range(f, t)),
    ])

    const admins = new Set(roles.map((r) => r.user_id))
    const noEmailIds = new Set(noEmail.map((r) => r.user_id))
    const people = profiles.filter((p) => !admins.has(p.user_id) && p.signup_at && ts(p.signup_at) < end)
    const personById = new Map(people.map((p) => [p.user_id, p]))
    const isPerson = (uid: string | null | undefined): uid is string => !!uid && personById.has(uid)
    const notAdmin = (uid: string | null | undefined) => !uid || !admins.has(uid)

    // ---- visits: sessions, unique people, returning (seen before this day) ----
    const vDay = visitsDay.filter((v) => notAdmin(v.user_id))
    const keyOf = (v: Visit) => v.user_id ?? (v.session_id ? `s:${v.session_id}` : null)
    const dayKeys = new Set(vDay.map(keyOf).filter((k): k is string => !!k))
    const userKeys = [...dayKeys].filter((k) => !k.startsWith('s:'))
    const sessionKeys = [...dayKeys].filter((k) => k.startsWith('s:')).map((k) => k.slice(2))
    const seenBefore = new Set<string>()
    const chunk = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n))
    await Promise.all([
      ...chunk(userKeys, 100).map(async (ids) => {
        const rows = await fetchAll<{ user_id: string }>((f, t) => db.from('visits').select('user_id').in('user_id', ids).lt('started_at', iso(start)).order('user_id').range(f, t))
        for (const r of rows) seenBefore.add(r.user_id)
      }),
      ...chunk(sessionKeys, 100).map(async (ids) => {
        const rows = await fetchAll<{ session_id: string }>((f, t) => db.from('visits').select('session_id').in('session_id', ids).lt('started_at', iso(start)).order('session_id').range(f, t))
        for (const r of rows) seenBefore.add(`s:${r.session_id}`)
      }),
    ])

    // ---- signed-in activity: the day (DAU) and the 30 days ending on it (MAU) ----
    const ids = people.map((p) => p.user_id)
    const [evRows, visitRows] = await Promise.all([
      Promise.all(chunk(ids, 100).map((c) => fetchAll<{ user_id: string; ts: string }>((f, t) => db.from('events').select('user_id, ts').in('user_id', c)
        .gte('ts', iso(mauStart)).lt('ts', iso(end)).order('ts').range(f, t)))).then((r) => r.flat()),
      Promise.all(chunk(ids, 100).map((c) => fetchAll<{ user_id: string; started_at: string }>((f, t) => db.from('visits').select('user_id, started_at').in('user_id', c)
        .gte('started_at', iso(mauStart)).lt('started_at', iso(end)).order('started_at').range(f, t)))).then((r) => r.flat()),
    ])
    const bitOwner = new Map(bits.map((b) => [b.id, b.user_id]))
    const activeDay = new Set<string>()
    const activeMonth = new Set<string>()
    const touch = (uid: string | null | undefined, when: string) => {
      if (!isPerson(uid)) return
      const t = ts(when)
      if (t < mauStart || t >= end) return
      activeMonth.add(uid)
      if (t >= start) activeDay.add(uid)
    }
    for (const b of bits) touch(b.user_id, b.created_at)
    for (const e of evRows) touch(e.user_id, e.ts)
    for (const v of visitRows) touch(v.user_id, v.started_at)
    for (const r of rewritesDay) {
      const o = bitOwner.get(r.bit_id)
      if (isPerson(o)) { activeDay.add(o); activeMonth.add(o) }
    }

    const newToday = people.filter((p) => inDay(p.signup_at!)).length
    const returningUsers = [...activeDay].filter((uid) => ts(personById.get(uid)!.signup_at!) < start).length

    // ---- bits and who made them ----
    const bitsCounted = bits.filter((b) => notAdmin(b.user_id))
    const bitsDay = bitsCounted.filter((b) => inDay(b.created_at))
    const perUser = new Map<string, { day: number; total: number }>()
    let guestDay = 0, guestTotal = 0
    for (const b of bitsCounted) {
      const today = inDay(b.created_at)
      if (isPerson(b.user_id)) {
        const cur = perUser.get(b.user_id) ?? { day: 0, total: 0 }
        cur.total++
        if (today) cur.day++
        perUser.set(b.user_id, cur)
      } else {
        guestTotal++
        if (today) guestDay++
      }
    }
    const topMakers: TopMaker[] = [...perUser.entries()]
      .map(([uid, c]) => {
        const p = personById.get(uid)!
        return {
          user_id: uid,
          name: p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || null,
          email: p.email,
          bits_day: c.day,
          bits_total: c.total,
        }
      })
      .sort((a, b) => b.bits_day - a.bits_day || b.bits_total - a.bits_total)
      .slice(0, 10)

    const unique = dayKeys.size
    const returningVisitors = [...dayKeys].filter((k) => seenBefore.has(k)).length

    return {
      day,
      prev_day: shiftKey(day, -1),
      next_day: day < todayKey ? shiftKey(day, 1) : null,
      is_today: day === todayKey,
      timezone: TZ,
      generated_at: iso(now),
      users: { total: people.length, new_today: newToday, dau: activeDay.size, mau: activeMonth.size, returning: returningUsers },
      visits: { sessions: vDay.length, unique, returning: returningVisitors, new: unique - returningVisitors },
      rates: { signed_in_people: activeDay.size, signed_in_pct: pct(activeDay.size, unique), signup_pct: pct(newToday, unique) },
      bits: {
        day: bitsDay.length,
        day_signed_in: bitsDay.filter((b) => isPerson(b.user_id)).length,
        day_guest: bitsDay.filter((b) => !isPerson(b.user_id)).length,
        rewrites_day: rewritesDay.filter((r) => notAdmin(bitOwner.get(r.bit_id))).length,
        total: bitsCounted.length,
      },
      top_makers: topMakers,
      guests: { bits_day: guestDay, bits_total: guestTotal },
      hidden: { admins: admins.size, no_email: noEmailIds.size },
      // Leave out admins and real accounts with no email. Guests carry a
      // hidden guest id of their own, so they must not be filtered as if
      // they were accounts.
      paywall: aggregatePaywall(paywallRows, (uid) => !admins.has(uid) && !noEmailIds.has(uid)),
    }
  })
