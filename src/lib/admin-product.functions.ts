// Admin product metrics for the bit generator: bits, sign-ins, DAU/MAU,
// repeat use, free vs paying, engagement. Admin-only; every number is
// computed from real rows (no estimates, no demo data).
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const TZ = 'America/Los_Angeles'
const DAY = 24 * 3600 * 1000
const PAYING_STATUSES = new Set(['active', 'trialing', 'past_due'])

async function assertAdmin(ctx: unknown): Promise<void> {
  const c = ctx as { supabase: { rpc: (fn: 'has_role', args: { _user_id: string; _role: 'admin' }) => PromiseLike<{ data: unknown; error: unknown }> }; userId: string }
  const { data, error } = await c.supabase.rpc('has_role', { _user_id: c.userId, _role: 'admin' })
  if (error || !data) throw new Error('Forbidden')
}

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const dayKey = (ms: number) => dayFmt.format(new Date(ms))

// PostgREST caps a response at ~1000 rows; page through with range().
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

export type PlanLabel = 'paying' | 'trialing' | 'free'

export interface ProductUserRow {
  user_id: string
  name: string | null
  email: string | null
  provider: string | null
  first_sign_in: string | null
  last_sign_in: string | null
  sign_ins: number
  bits: number
  rewrites: number
  last_bit_at: string | null
  active_days_30d: number
  runs_today: number
  runs_total: number
  plan: PlanLabel
  is_admin: boolean
}

export interface RetentionPoint {
  retained: number
  eligible: number
  pct: number | null
  retained_or_later: number
  pct_or_later: number | null
}
export interface RetentionCohort {
  week_start: string
  size: number
  cells: Array<{ retained: number; pct: number } | null>
}
export interface RetentionBlock {
  d1: RetentionPoint
  d7: RetentionPoint
  d30: RetentionPoint
  cohorts: RetentionCohort[]
}

export interface ProductMetrics {
  generated_at: string
  timezone: string
  excluded_admins: number
  hidden_no_email: number
  runs: {
    today: number
    total: number
    users_today: number
    today_split: { bits: number; rewrites: number; failed: number; signed_in: number; guest: number }
    total_split: { bits: number; rewrites: number; failed: number; signed_in: number; guest: number }
  }
  bits: {
    total: number
    d1: number
    d7: number
    d30: number
    signed_in_30d: number
    guest_30d: number
    rewrites_total: number
    rewrites_30d: number
    rewrites_per_bit: number | null
    pct_bits_reworked: number | null
    posted_total: number
    failures_7d: number
    success_rate_7d: number | null
    series30d: Array<{ date: string; n: number }>
  }
  users: {
    signed_in_total: number
    new_7d: number
    new_30d: number
    paying: number
    trialing: number
    cancelling: number
    free: number
    sandbox_subs: number
  }
  activity: {
    dau: number
    wau: number
    mau: number
    stickiness_pct: number | null
    makers_dau: number
    makers_wau: number
    makers_mau: number
    series30d: Array<{ date: string; n: number }>
  }
  repeat: {
    active_2plus_days_30d: number
    pct_of_mau: number | null
    makers_2plus_bits: number
    signed_in_2plus_times: number
    came_back_after_signup: number
  }
  engagement: {
    activated: number
    activation_pct: number | null
    bits_per_active_user_30d: number | null
    median_bits_per_maker: number | null
  }
  retention: { any: RetentionBlock; made_a_bit: RetentionBlock }
  user_rows: ProductUserRow[]
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null)
const ratio = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) / 100 : null)

export const adminProductMetrics = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ include_admins: z.boolean().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }): Promise<ProductMetrics> => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const db = supabaseAdmin as any
    const now = Date.now()
    const iso = (ms: number) => new Date(ms).toISOString()
    const t1 = now - DAY
    const t7 = now - 7 * DAY
    const t30 = now - 30 * DAY

    type Profile = { user_id: string; email: string | null; full_name: string | null; first_name: string | null; last_name: string | null; provider: string | null; signup_at: string | null; last_login_at: string | null; login_count: number | null }
    type Bit = { id: string; user_id: string | null; created_at: string }
    type Version = { bit_id: string; kind: string; created_at: string }
    type Ev = { user_id: string | null; ts: string }
    type Visit = { user_id: string | null; started_at: string }
    type Fail = { user_id: string | null; created_at: string }
    type Sub = { user_id: string; status: string; environment: string; cancel_at_period_end: boolean | null }

    const [profiles, bits, versions, subs, roles, failures7, posted, fails] = await Promise.all([
      fetchAll<Profile>((f, t) => db.from('profiles')
        .select('user_id, email, full_name, first_name, last_name, provider, signup_at, last_login_at, login_count')
        .eq('is_anonymous', false).not('email', 'is', null).neq('email', '').order('user_id').range(f, t)),
      fetchAll<Bit>((f, t) => db.from('bits').select('id, user_id, created_at').order('created_at').range(f, t)),
      fetchAll<Version>((f, t) => db.from('bit_versions').select('bit_id, kind, created_at').order('created_at').range(f, t)),
      fetchAll<Sub>((f, t) => db.from('subscriptions').select('user_id, status, environment, cancel_at_period_end').order('user_id').range(f, t)),
      fetchAll<{ user_id: string }>((f, t) => db.from('user_roles').select('user_id').eq('role', 'admin').order('user_id').range(f, t)),
      db.from('bit_failures').select('id', { count: 'exact', head: true }).gte('created_at', iso(t7)),
      db.from('rooms').select('id', { count: 'exact', head: true }).not('bit_version_id', 'is', null).eq('hidden', false),
      fetchAll<Fail>((f, t) => db.from('bit_failures').select('user_id, created_at').eq('lab', false).order('created_at').range(f, t)),
    ])

    // Events and visits, all time, for signed-in accounts only (anonymous traffic is far larger and irrelevant here).
    const personIds = profiles.map((p) => p.user_id)
    const chunks: string[][] = []
    for (let i = 0; i < personIds.length; i += 100) chunks.push(personIds.slice(i, i + 100))
    const [evChunks, visitChunks] = await Promise.all([
      Promise.all(chunks.map((ids) => fetchAll<Ev>((f, t) => db.from('events').select('user_id, ts').in('user_id', ids).order('ts').range(f, t)))),
      Promise.all(chunks.map((ids) => fetchAll<Visit>((f, t) => db.from('visits').select('user_id, started_at').in('user_id', ids).order('started_at').range(f, t)))),
    ])
    const events = evChunks.flat()
    const visits = visitChunks.flat()

    // Accounts with no email are hidden from every number and list.
    const { count: noEmailCount } = await db.from('profiles').select('user_id', { count: 'exact', head: true })
      .eq('is_anonymous', false).or('email.is.null,email.eq.')

    const adminIds = new Set(roles.map((r) => r.user_id))
    const excludeAdmins = !data.include_admins
    const counted = (uid: string | null | undefined) => !!uid && !(excludeAdmins && adminIds.has(uid))

    const people = profiles.filter((p) => counted(p.user_id))
    const signedIn = new Set(people.map((p) => p.user_id))
    const bitOwner = new Map(bits.map((b) => [b.id, b.user_id]))
    const isPerson = (uid: string | null | undefined): uid is string => !!uid && signedIn.has(uid)

    // A bit is "signed-in" if its owner is a counted account; guests have no user_id.
    // Bits by admins are dropped entirely when admins are excluded.
    const bitsCounted = bits.filter((b) => !b.user_id || counted(b.user_id))
    const ts = (s: string) => new Date(s).getTime()
    const inWin = (s: string, from: number) => ts(s) >= from

    const rewrites = versions.filter((v) => v.kind !== 'original')
    const rewritesCounted = rewrites.filter((v) => {
      const owner = bitOwner.get(v.bit_id)
      return !owner || counted(owner)
    })
    const reworkedBits = new Set(rewritesCounted.map((v) => v.bit_id))

    // ---- activity: (user, day) pairs from bits, rewrites, events, visits ----
    const activeDays = new Map<string, Set<string>>() // user -> days (30d)
    const lastActive = new Map<string, number>()
    const touch = (uid: string | null | undefined, when: string) => {
      if (!uid || !signedIn.has(uid)) return
      const ms = ts(when)
      if (ms < t30) return
      let s = activeDays.get(uid)
      if (!s) { s = new Set(); activeDays.set(uid, s) }
      s.add(dayKey(ms))
      if (ms > (lastActive.get(uid) ?? 0)) lastActive.set(uid, ms)
    }
    for (const b of bitsCounted) touch(b.user_id, b.created_at)
    for (const v of rewritesCounted) touch(bitOwner.get(v.bit_id), v.created_at)
    for (const e of events) touch(e.user_id, e.ts)
    for (const v of visits) touch(v.user_id, v.started_at)

    const activeSince = (from: number) => {
      let n = 0
      for (const ms of lastActive.values()) if (ms >= from) n++
      return n
    }
    const makersSince = (from: number) => new Set(bitsCounted.filter((b) => isPerson(b.user_id) && inWin(b.created_at, from)).map((b) => b.user_id!)).size

    const days: string[] = []
    for (let i = 29; i >= 0; i--) days.push(dayKey(now - i * DAY))
    const dauByDay: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]))
    for (const set of activeDays.values()) for (const d of set) if (d in dauByDay) dauByDay[d]++
    const bitsByDay: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]))
    for (const b of bitsCounted) { const d = dayKey(ts(b.created_at)); if (d in bitsByDay) bitsByDay[d]++ }

    // ---- retention: signup-day cohorts, Pacific calendar days ----
    const idx = (key: string) => Math.round(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)) / DAY)
    const keyOfIdx = (i: number) => new Date(i * DAY).toISOString().slice(0, 10)
    const todayIdx = idx(dayKey(now))
    const anyDays = new Map<string, Set<number>>()
    const madeDays = new Map<string, Set<number>>()
    const mark = (m: Map<string, Set<number>>, uid: string | null | undefined, when: string) => {
      if (!isPerson(uid)) return
      let set = m.get(uid)
      if (!set) { set = new Set(); m.set(uid, set) }
      set.add(idx(dayKey(ts(when))))
    }
    for (const b of bitsCounted) { mark(anyDays, b.user_id, b.created_at); mark(madeDays, b.user_id, b.created_at) }
    for (const v of rewritesCounted) { const o = bitOwner.get(v.bit_id); mark(anyDays, o, v.created_at); mark(madeDays, o, v.created_at) }
    for (const e of events) mark(anyDays, e.user_id, e.ts)
    for (const v of visits) mark(anyDays, v.user_id, v.started_at)

    const signupIdx = new Map<string, number>()
    for (const p of people) if (p.signup_at) signupIdx.set(p.user_id, idx(dayKey(ts(p.signup_at))))
    // Monday-start weeks.
    const weekOf = (i: number) => i - ((new Date(i * DAY).getUTCDay() + 6) % 7)
    const WEEKS = 9

    const retentionFor = (days: Map<string, Set<number>>): RetentionBlock => {
      const point = (n: number): RetentionPoint => {
        let eligible = 0, retained = 0, later = 0
        for (const [uid, s0] of signupIdx) {
          if (s0 + n > todayIdx) continue
          eligible++
          const set = days.get(uid)
          if (!set) continue
          if (set.has(s0 + n)) retained++
          for (const d of set) if (d >= s0 + n) { later++; break }
        }
        return { retained, eligible, pct: pct(retained, eligible), retained_or_later: later, pct_or_later: pct(later, eligible) }
      }
      const byWeek = new Map<number, string[]>()
      for (const [uid, s0] of signupIdx) {
        const w = weekOf(s0)
        byWeek.set(w, [...(byWeek.get(w) ?? []), uid])
      }
      const thisWeek = weekOf(todayIdx)
      const cohorts: RetentionCohort[] = [...byWeek.entries()]
        .sort((a, b) => b[0] - a[0])
        .slice(0, 12)
        .map(([w, uids]) => ({
          week_start: keyOfIdx(w),
          size: uids.length,
          cells: Array.from({ length: WEEKS }, (_, k) => {
            const start = w + k * 7
            if (start > thisWeek) return null
            let r = 0
            for (const uid of uids) {
              const set = days.get(uid)
              if (!set) continue
              for (const d of set) if (d >= start && d < start + 7) { r++; break }
            }
            return { retained: r, pct: pct(r, uids.length) ?? 0 }
          }),
        }))
      return { d1: point(1), d7: point(7), d30: point(30), cohorts }
    }
    const retention = { any: retentionFor(anyDays), made_a_bit: retentionFor(madeDays) }

    // ---- runs: every press of write or rewrite (new bit, rewrite, or a failed attempt) ----
    const today = dayKey(now)
    const isToday = (s: string) => dayKey(ts(s)) === today
    const failsCounted = fails.filter((f) => !f.user_id || counted(f.user_id))
    type Run = { uid: string | null; at: string; kind: 'bits' | 'rewrites' | 'failed' }
    const runs: Run[] = [
      ...bitsCounted.map((b) => ({ uid: b.user_id, at: b.created_at, kind: 'bits' as const })),
      ...rewritesCounted.map((v) => ({ uid: bitOwner.get(v.bit_id) ?? null, at: v.created_at, kind: 'rewrites' as const })),
      ...failsCounted.map((f) => ({ uid: f.user_id, at: f.created_at, kind: 'failed' as const })),
    ]
    const split = (rs: Run[]) => {
      const o = { bits: 0, rewrites: 0, failed: 0, signed_in: 0, guest: 0 }
      for (const r of rs) { o[r.kind]++; if (isPerson(r.uid)) o.signed_in++; else o.guest++ }
      return o
    }
    const runsToday = runs.filter((r) => isToday(r.at))
    const runsPerUser = new Map<string, { today: number; total: number }>()
    for (const r of runs) {
      if (!isPerson(r.uid)) continue
      const cur = runsPerUser.get(r.uid) ?? { today: 0, total: 0 }
      cur.total++
      if (isToday(r.at)) cur.today++
      runsPerUser.set(r.uid, cur)
    }

    // ---- per-user ----
    const bitsPerUser = new Map<string, { n: number; last: string | null }>()
    for (const b of bitsCounted) {
      if (!isPerson(b.user_id)) continue
      const cur = bitsPerUser.get(b.user_id) ?? { n: 0, last: null }
      cur.n++
      if (!cur.last || b.created_at > cur.last) cur.last = b.created_at
      bitsPerUser.set(b.user_id, cur)
    }
    const rewritesPerUser = new Map<string, number>()
    for (const v of rewritesCounted) {
      const o = bitOwner.get(v.bit_id)
      if (o) rewritesPerUser.set(o, (rewritesPerUser.get(o) ?? 0) + 1)
    }

    const liveSubs = subs.filter((s) => s.environment === 'live' && counted(s.user_id))
    const planOf = new Map<string, PlanLabel>()
    let cancelling = 0
    for (const s of liveSubs) {
      if (!PAYING_STATUSES.has(s.status)) continue
      const label: PlanLabel = s.status === 'trialing' ? 'trialing' : 'paying'
      if (planOf.get(s.user_id) !== 'paying') planOf.set(s.user_id, label)
      if (s.cancel_at_period_end) cancelling++
    }
    const paying = [...planOf.values()].filter((p) => p === 'paying').length
    const trialing = [...planOf.values()].filter((p) => p === 'trialing').length

    // Came back: active on some day after the day they signed up.
    let cameBack = 0
    for (const p of people) {
      const set = activeDays.get(p.user_id)
      if (!set || !p.signup_at) continue
      const sd = dayKey(ts(p.signup_at))
      for (const d of set) if (d > sd) { cameBack++; break }
    }

    const makerCounts = [...bitsPerUser.values()].map((v) => v.n).sort((a, b) => a - b)
    const median = makerCounts.length
      ? (makerCounts.length % 2 ? makerCounts[(makerCounts.length - 1) / 2]! : (makerCounts[makerCounts.length / 2 - 1]! + makerCounts[makerCounts.length / 2]!) / 2)
      : null

    const mau = activeSince(t30)
    const dau = activeSince(t1)
    const active2 = [...activeDays.values()].filter((s) => s.size >= 2).length
    const bits30Signed = bitsCounted.filter((b) => isPerson(b.user_id) && inWin(b.created_at, t30)).length
    const bits7 = bitsCounted.filter((b) => inWin(b.created_at, t7)).length
    const failures = failures7.count ?? 0

    const userRows: ProductUserRow[] = profiles
      .filter((p) => data.include_admins || !adminIds.has(p.user_id))
      .map((p) => ({
        user_id: p.user_id,
        name: p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || null,
        email: p.email,
        provider: p.provider,
        first_sign_in: p.signup_at,
        last_sign_in: p.last_login_at,
        sign_ins: Number(p.login_count ?? 0),
        bits: bitsPerUser.get(p.user_id)?.n ?? 0,
        rewrites: rewritesPerUser.get(p.user_id) ?? 0,
        last_bit_at: bitsPerUser.get(p.user_id)?.last ?? null,
        active_days_30d: activeDays.get(p.user_id)?.size ?? 0,
        runs_today: runsPerUser.get(p.user_id)?.today ?? 0,
        runs_total: runsPerUser.get(p.user_id)?.total ?? 0,
        plan: planOf.get(p.user_id) ?? 'free',
        is_admin: adminIds.has(p.user_id),
      }))
      .sort((a, b) => (b.first_sign_in ?? '').localeCompare(a.first_sign_in ?? ''))

    return {
      generated_at: iso(now),
      timezone: TZ,
      excluded_admins: excludeAdmins ? adminIds.size : 0,
      hidden_no_email: noEmailCount ?? 0,
      runs: {
        today: runsToday.length,
        total: runs.length,
        users_today: new Set(runsToday.filter((r) => isPerson(r.uid)).map((r) => r.uid)).size,
        today_split: split(runsToday),
        total_split: split(runs),
      },
      bits: {
        total: bitsCounted.length,
        d1: bitsCounted.filter((b) => inWin(b.created_at, t1)).length,
        d7: bits7,
        d30: bitsCounted.filter((b) => inWin(b.created_at, t30)).length,
        signed_in_30d: bits30Signed,
        guest_30d: bitsCounted.filter((b) => !isPerson(b.user_id) && inWin(b.created_at, t30)).length,
        rewrites_total: rewritesCounted.length,
        rewrites_30d: rewritesCounted.filter((v) => inWin(v.created_at, t30)).length,
        rewrites_per_bit: ratio(rewritesCounted.length, bitsCounted.length),
        pct_bits_reworked: pct(bitsCounted.filter((b) => reworkedBits.has(b.id)).length, bitsCounted.length),
        posted_total: posted.count ?? 0,
        failures_7d: failures,
        success_rate_7d: pct(bits7, bits7 + failures),
        series30d: days.map((d) => ({ date: d, n: bitsByDay[d] ?? 0 })),
      },
      users: {
        signed_in_total: people.length,
        new_7d: people.filter((p) => p.signup_at && inWin(p.signup_at, t7)).length,
        new_30d: people.filter((p) => p.signup_at && inWin(p.signup_at, t30)).length,
        paying,
        trialing,
        cancelling,
        free: Math.max(0, people.length - paying - trialing),
        sandbox_subs: subs.filter((s) => s.environment !== 'live' && PAYING_STATUSES.has(s.status)).length,
      },
      activity: {
        dau,
        wau: activeSince(t7),
        mau,
        stickiness_pct: pct(dau, mau),
        makers_dau: makersSince(t1),
        makers_wau: makersSince(t7),
        makers_mau: makersSince(t30),
        series30d: days.map((d) => ({ date: d, n: dauByDay[d] ?? 0 })),
      },
      repeat: {
        active_2plus_days_30d: active2,
        pct_of_mau: pct(active2, mau),
        makers_2plus_bits: makerCounts.filter((n) => n >= 2).length,
        signed_in_2plus_times: people.filter((p) => Number(p.login_count ?? 0) >= 2).length,
        came_back_after_signup: cameBack,
      },
      engagement: {
        activated: bitsPerUser.size,
        activation_pct: pct(bitsPerUser.size, people.length),
        bits_per_active_user_30d: ratio(bits30Signed, mau),
        median_bits_per_maker: median,
      },
      retention,
      user_rows: userRows,
    }
  })
