// Admin-only server functions. Every handler verifies has_role('admin') on
// the caller before touching data. Unauthorized calls throw.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

async function assertAdmin(ctx: unknown): Promise<void> {
  const c = ctx as { supabase: { rpc: (fn: 'has_role', args: { _user_id: string; _role: 'admin' }) => PromiseLike<{ data: unknown; error: unknown }> }; userId: string }
  const { data, error } = await c.supabase.rpc('has_role', { _user_id: c.userId, _role: 'admin' })
  if (error || !data) throw new Error('Forbidden')
}

// Lightweight boolean gate for the /admin route beforeLoad — never throws.
export const amIAdmin = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<boolean> => {
    const c = context as { supabase: { rpc: (fn: 'has_role', args: { _user_id: string; _role: 'admin' }) => PromiseLike<{ data: unknown }> }; userId: string }
    try {
      const { data } = await c.supabase.rpc('has_role', { _user_id: c.userId, _role: 'admin' })
      return Boolean(data)
    } catch { return false }
  })

// Count of companion comments on the caller's rooms since they last opened
// the bubble. Used to light the pink dot for unseen AI replies.
export const getUnseenCompanionCount = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<number> => {
    const c = context as { userId: string }
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: prof } = await supabaseAdmin
      .from('profiles')
      .select('companion_seen_at')
      .eq('user_id', c.userId)
      .maybeSingle()
    const seenAt = (prof as { companion_seen_at: string | null } | null)?.companion_seen_at ?? '1970-01-01T00:00:00Z'
    // Rooms owned by this user
    const { data: myRooms } = await supabaseAdmin
      .from('situations')
      .select('room_id')
      .eq('alias_id', c.userId)
      .not('room_id', 'is', null)
      .limit(500)
    const roomIds = ((myRooms ?? []) as Array<{ room_id: string | null }>).map((r) => r.room_id).filter(Boolean) as string[]
    if (roomIds.length === 0) return 0
    const { count } = await supabaseAdmin
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .in('room_id', roomIds)
      .eq('is_companion', true)
      .gt('created_at', seenAt)
    void c
    return count ?? 0
  })

export const markCompanionSeen = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const c = context as { userId: string }
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    await supabaseAdmin
      .from('profiles')
      .update({ companion_seen_at: new Date().toISOString() } as never)
      .eq('user_id', c.userId)
    return { ok: true }
  })

const SORT_COLUMNS = ['last_visit_at', 'last_login_at', 'signup_at', 'visit_count', 'login_count', 'email'] as const
type SortCol = typeof SORT_COLUMNS[number]

export const adminListUsers = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      q: z.string().max(120).optional(),
      limit: z.number().int().min(1).max(500).optional(),
      include_anonymous: z.boolean().optional(),
      sort: z.enum(SORT_COLUMNS).optional(),
      dir: z.enum(['asc', 'desc']).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const limit = data.limit ?? 200
    const sort: SortCol = data.sort ?? 'last_visit_at'
    const ascending = data.dir === 'asc'
    let query = supabaseAdmin
      .from('profiles')
      .select('user_id, email, first_name, last_name, full_name, avatar_url, provider, is_anonymous, signup_at, first_visit_at, last_visit_at, last_login_at, login_count, visit_count, last_country, last_city')
      .order(sort, { ascending, nullsFirst: false })
      .limit(limit)
    if (!data.include_anonymous) query = query.eq('is_anonymous', false).not('email', 'is', null).neq('email', '')
    if (data.q?.trim()) {
      const q = data.q.trim().replace(/[,%]/g, '')
      query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
    }
    const { data: rows, error } = await query
    if (error) throw new Error(error.message)
    const profiles = (rows ?? []) as Array<Record<string, unknown> & { user_id: string }>
    const ids = profiles.map((p) => p.user_id)
    const [aliasRes, bitRes, subRes] = await Promise.all([
      ids.length
        ? supabaseAdmin.from('aliases').select('user_id, display_name, emoji').in('user_id', ids)
        : Promise.resolve({ data: [] as Array<{ user_id: string; display_name: string; emoji: string }> }),
      ids.length
        ? supabaseAdmin.from('bits').select('id, user_id, bit_versions(kind)').in('user_id', ids).limit(1000)
        : Promise.resolve({ data: [] as unknown[] }),
      ids.length
        ? supabaseAdmin.from('subscriptions').select('user_id, status').eq('environment', 'live').in('user_id', ids)
        : Promise.resolve({ data: [] as unknown[] }),
    ])
    const aliasMap: Record<string, { display_name: string; emoji: string }> = {}
    for (const r of (aliasRes.data ?? []) as Array<{ user_id: string; display_name: string; emoji: string }>) {
      aliasMap[r.user_id] = { display_name: r.display_name, emoji: r.emoji }
    }
    const statsMap: Record<string, { bits: number; rewrites: number; plan: 'paying' | 'trialing' | 'free' }> = {}
    const stat = (id: string) => (statsMap[id] ??= { bits: 0, rewrites: 0, plan: 'free' })
    for (const b of (bitRes.data ?? []) as Array<{ user_id: string; bit_versions: Array<{ kind: string }> | null }>) {
      const st = stat(b.user_id)
      st.bits++
      st.rewrites += (b.bit_versions ?? []).filter((v) => v.kind !== 'original').length
    }
    for (const sub of (subRes.data ?? []) as Array<{ user_id: string; status: string }>) {
      const st = stat(sub.user_id)
      if (sub.status === 'active' || sub.status === 'past_due') st.plan = 'paying'
      else if (sub.status === 'trialing' && st.plan === 'free') st.plan = 'trialing'
    }
    const live = profiles.map((p) => ({
      ...p,
      deleted_at: null as string | null,
      alias: aliasMap[p.user_id] ?? null,
      stats: statsMap[p.user_id] ?? { bits: 0, rewrites: 0, plan: 'free' as const },
    }))
    // Accounts people deleted stay on the list (no email or name: the privacy
    // page promises those are removed). Hidden while searching by email/name.
    const q = data.q?.trim().toLowerCase() ?? ''
    if (q && !'deleted by themselves'.includes(q)) return live
    const { data: gone } = await supabaseAdmin
      .from('deleted_accounts' as never)
      .select('user_id, provider, signup_at, deleted_at, last_country, last_city, visit_count, login_count')
      .limit(limit)
    const deleted = ((gone ?? []) as Array<{ user_id: string; provider: string | null; signup_at: string | null; deleted_at: string; last_country: string | null; last_city: string | null; visit_count: number | null; login_count: number | null }>).map((d) => ({
      user_id: d.user_id, email: null, first_name: null, last_name: null, full_name: null, avatar_url: null,
      provider: d.provider, is_anonymous: false, signup_at: d.signup_at, first_visit_at: d.signup_at,
      last_visit_at: d.deleted_at, last_login_at: null, login_count: d.login_count ?? 0, visit_count: d.visit_count ?? 0,
      last_country: d.last_country, last_city: d.last_city, deleted_at: d.deleted_at, alias: null,
      stats: { bits: 0, rewrites: 0, plan: 'free' as const },
    }))
    const merged = [...live, ...deleted] as Array<Record<string, unknown>>
    const val = (r: Record<string, unknown>) => r[sort] as string | number | null | undefined
    merged.sort((a, b) => {
      const x = val(a), y = val(b)
      if (x == null && y == null) return 0
      if (x == null) return 1
      if (y == null) return -1
      const c = x < y ? -1 : x > y ? 1 : 0
      return ascending ? c : -c
    })
    return merged.slice(0, limit) as typeof live
  })

// ---------- analytics ----------

export const adminAnalytics = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }) => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const now = Date.now()
    const iso = (ms: number) => new Date(ms).toISOString()
    const d1 = iso(now - 24 * 3600 * 1000)
    const d7 = iso(now - 7 * 24 * 3600 * 1000)
    const d30 = iso(now - 30 * 24 * 3600 * 1000)

    const [
      totalReal, newSignups7, newSignups30,
      totalVisits, visits7, visits30, revisits30,
      totalVisitsHuman, visits7Human, visits30Human, revisitsHuman30,
      totalVisitsBot, visits7Bot, visits30Bot,
      convertedGuests, recentSignins,
      activeUsersRes, providerRowsRes, countryRowsRes, countryRowsHumanRes, eventRowsRes,
      uniqueVisitorRowsRes,
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('user_id', { count: 'exact', head: true }).eq('is_anonymous', false),
      supabaseAdmin.from('profiles').select('user_id', { count: 'exact', head: true }).eq('is_anonymous', false).gte('signup_at', d7),
      supabaseAdmin.from('profiles').select('user_id', { count: 'exact', head: true }).eq('is_anonymous', false).gte('signup_at', d30),
      supabaseAdmin.from('visits').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('visits').select('id', { count: 'exact', head: true }).gte('started_at', d7),
      supabaseAdmin.from('visits').select('id', { count: 'exact', head: true }).gte('started_at', d30),
      supabaseAdmin.from('visits').select('id', { count: 'exact', head: true }).gte('started_at', d30).eq('is_revisit', true),
      // Human buckets — is_bot = false in the classified view
      supabaseAdmin.from('visits_classified').select('id', { count: 'exact', head: true }).eq('is_bot', false),
      supabaseAdmin.from('visits_classified').select('id', { count: 'exact', head: true }).eq('is_bot', false).gte('started_at', d7),
      supabaseAdmin.from('visits_classified').select('id', { count: 'exact', head: true }).eq('is_bot', false).gte('started_at', d30),
      supabaseAdmin.from('visits_classified').select('id', { count: 'exact', head: true }).eq('is_bot', false).gte('started_at', d30).eq('is_revisit', true),
      // Bot buckets
      supabaseAdmin.from('visits_classified').select('id', { count: 'exact', head: true }).eq('is_bot', true),
      supabaseAdmin.from('visits_classified').select('id', { count: 'exact', head: true }).eq('is_bot', true).gte('started_at', d7),
      supabaseAdmin.from('visits_classified').select('id', { count: 'exact', head: true }).eq('is_bot', true).gte('started_at', d30),
      supabaseAdmin.from('events').select('user_id', { count: 'exact', head: true }).eq('name', 'sign_up'),
      supabaseAdmin.from('profiles').select('user_id, email, full_name, first_name, last_name, provider, last_login_at').eq('is_anonymous', false).not('last_login_at', 'is', null).order('last_login_at', { ascending: false }).limit(20),
      supabaseAdmin.rpc('admin_active_users' as never),
      supabaseAdmin.rpc('admin_provider_counts' as never),
      supabaseAdmin.rpc('admin_country_counts' as never),
      // Human-only top countries · 30d
      supabaseAdmin
        .from('visits_classified')
        .select('country')
        .eq('is_bot', false)
        .not('country', 'is', null)
        .gte('started_at', d30)
        .limit(50000),
      supabaseAdmin.rpc('admin_event_counts' as never),
      // Rows for unique-visitor dedupe (all buckets, all-time — dedupe in JS)
      supabaseAdmin
        .from('visits_classified')
        .select('user_id, session_id, started_at, is_bot')
        .limit(200000),
    ])


    const activeRow = (Array.isArray(activeUsersRes.data) ? activeUsersRes.data[0] : activeUsersRes.data) as
      | { dau?: number | string; wau?: number | string; mau?: number | string } | null
    const dau = Number(activeRow?.dau ?? 0)
    const wau = Number(activeRow?.wau ?? 0)
    const mau = Number(activeRow?.mau ?? 0)

    const providers: Record<string, number> = {}
    for (const r of ((providerRowsRes.data ?? []) as Array<{ provider: string | null; cnt: number | string }>)) {
      providers[r.provider ?? '—'] = Number(r.cnt)
    }

    const countryRows = ((countryRowsRes.data ?? []) as Array<{ country: string; cnt: number | string }>)
    const topCountries: Array<[string, number]> = countryRows.slice(0, 10).map((r) => [r.country, Number(r.cnt)])

    // Aggregate human-only country counts client-side (30d window)
    const humanCountryCounts: Record<string, number> = {}
    for (const r of ((countryRowsHumanRes.data ?? []) as Array<{ country: string | null }>)) {
      const c = r.country
      if (!c) continue
      humanCountryCounts[c] = (humanCountryCounts[c] ?? 0) + 1
    }
    const topCountriesHuman: Array<[string, number]> = Object.entries(humanCountryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const eventTable = ((eventRowsRes.data ?? []) as Array<{ name: string; d7: number | string; d30: number | string }>)
      .map((r) => ({ name: r.name, d7: Number(r.d7), d30: Number(r.d30) }))
      .sort((a, b) => a.name.localeCompare(b.name))

    const visits30Total = visits30.count ?? 0
    const revisits = revisits30.count ?? 0
    const newVisits = Math.max(0, visits30Total - revisits)

    const visits30HumanTotal = visits30Human.count ?? 0
    const revisitsHuman = revisitsHuman30.count ?? 0
    const newVisitsHuman = Math.max(0, visits30HumanTotal - revisitsHuman)

    // Unique visitors — dedupe on user_id (fallback to session_id)
    type UvRow = { user_id: string | null; session_id: string | null; started_at: string | null; is_bot: boolean | null }
    const uvRows = (uniqueVisitorRowsRes.data ?? []) as UvRow[]
    const keyOf = (r: UvRow): string | null => r.user_id ?? r.session_id ?? null
    const nowMs = now
    const ms7 = nowMs - 7 * 24 * 3600 * 1000
    const ms30 = nowMs - 30 * 24 * 3600 * 1000
    const bucketUnique = (predicate: (r: UvRow) => boolean) => {
      const total = new Set<string>()
      const s7 = new Set<string>()
      const s30 = new Set<string>()
      for (const r of uvRows) {
        if (!predicate(r)) continue
        const k = keyOf(r); if (!k) continue
        total.add(k)
        const ts = r.started_at ? new Date(r.started_at).getTime() : 0
        if (ts >= ms7) s7.add(k)
        if (ts >= ms30) s30.add(k)
      }
      return { total: total.size, d7: s7.size, d30: s30.size }
    }
    const uniqueAll = bucketUnique(() => true)
    const uniqueHuman = bucketUnique((r) => r.is_bot === false)
    const uniqueBot = bucketUnique((r) => r.is_bot === true)

    return {
      generated_at: iso(now),
      users: {
        total_real: totalReal.count ?? 0,
        new_7d: newSignups7.count ?? 0,
        new_30d: newSignups30.count ?? 0,
        guest_converted: convertedGuests.count ?? 0,
      },
      activity: { dau, wau, mau },
      visits: {
        total: totalVisits.count ?? 0,
        d7: visits7.count ?? 0,
        d30: visits30Total,
        new_30d: newVisits,
        returning_30d: revisits,
      },
      visits_human: {
        total: totalVisitsHuman.count ?? 0,
        d7: visits7Human.count ?? 0,
        d30: visits30HumanTotal,
        new_30d: newVisitsHuman,
        returning_30d: revisitsHuman,
      },
      visits_bot: {
        total: totalVisitsBot.count ?? 0,
        d7: visits7Bot.count ?? 0,
        d30: visits30Bot.count ?? 0,
      },
      unique_visitors: uniqueAll,
      unique_visitors_human: uniqueHuman,
      unique_visitors_bot: uniqueBot,
      providers,
      top_countries: topCountries,
      top_countries_human: topCountriesHuman,
      events: eventTable,
      recent_signins: (recentSignins.data ?? []) as Array<{
        user_id: string; email: string | null; full_name: string | null;
        first_name: string | null; last_name: string | null;
        provider: string | null; last_login_at: string | null;
      }>,
    }
  })




export const adminListEvents = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      name: z.string().max(80).optional(),
      user_id: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    let query = supabaseAdmin
      .from('events')
      .select('id, user_id, session_id, ts, name, properties')
      .order('ts', { ascending: false })
      .limit(data.limit ?? 200)
    if (data.name) query = query.eq('name', data.name)
    if (data.user_id) query = query.eq('user_id', data.user_id)
    const { data: rows, error } = await query
    if (error) throw new Error(error.message)
    return rows ?? []
  })

// ---------- response floor console ----------


type RoomListItem = {
  room_id: string
  situation_id: string
  title: string
  clean_text: string
  pillar: string | null
  initial_scan: number | null
  scan_band: string | null
  created_at: string
  age_hours: number
  human_relates: number
  human_comments: number
  companion_comments: number
}

async function decorateRooms(
  situations: Array<{ id: string; room_id: string | null; title: string | null; clean_text: string; pillar: string | null; initial_scan: number | null; scan_band: string | null; created_at: string; alias_id: string }>,
): Promise<RoomListItem[]> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const rows = situations.filter((s) => !!s.room_id)
  const roomIds = rows.map((s) => s.room_id!) 
  if (roomIds.length === 0) return []
  const [relatesRes, commentsRes] = await Promise.all([
    supabaseAdmin.from('room_relates').select('room_id').in('room_id', roomIds),
    supabaseAdmin.from('comments').select('room_id, alias_id, is_companion').in('room_id', roomIds).is('deleted_at', null),
  ])
  const relateCount: Record<string, number> = {}
  for (const r of (relatesRes.data ?? []) as Array<{ room_id: string }>) {
    relateCount[r.room_id] = (relateCount[r.room_id] ?? 0) + 1
  }
  const humanCmt: Record<string, number> = {}
  const compCmt: Record<string, number> = {}
  for (const c of (commentsRes.data ?? []) as Array<{ room_id: string; alias_id: string; is_companion: boolean }>) {
    if (c.is_companion) compCmt[c.room_id] = (compCmt[c.room_id] ?? 0) + 1
    else humanCmt[c.room_id] = (humanCmt[c.room_id] ?? 0) + 1
  }
  const now = Date.now()
  return rows.map((s) => ({
    room_id: s.room_id!,
    situation_id: s.id,
    title: s.title || (s.clean_text || '').split(/[.\n!?]/)[0]?.slice(0, 80) || 'untitled',
    clean_text: (s.clean_text || '').slice(0, 220),
    pillar: s.pillar,
    initial_scan: s.initial_scan,
    scan_band: s.scan_band,
    created_at: s.created_at,
    age_hours: Math.max(0, Math.round((now - new Date(s.created_at).getTime()) / 3600000)),
    human_relates: relateCount[s.room_id!] ?? 0,
    human_comments: humanCmt[s.room_id!] ?? 0,
    companion_comments: compCmt[s.room_id!] ?? 0,
  }))
}

export const adminNewRooms = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(200).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: rows } = await supabaseAdmin
      .from('situations')
      .select('id, alias_id, room_id, title, clean_text, pillar, initial_scan, scan_band, created_at')
      .eq('is_public', true)
      .eq('is_seed', false)
      .eq('crisis_flag', false)
      .is('deleted_at', null)
      .not('room_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(data.limit ?? 50)
    return decorateRooms((rows ?? []) as never)
  })

export const adminNeedsResponse = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(200).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: rows } = await supabaseAdmin
      .from('situations')
      .select('id, alias_id, room_id, title, clean_text, pillar, initial_scan, scan_band, created_at, human_response_at')
      .eq('is_public', true)
      .eq('is_seed', false)
      .eq('crisis_flag', false)
      .is('deleted_at', null)
      .is('human_response_at', null)
      .not('room_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit((data.limit ?? 50) * 3)
    const decorated = await decorateRooms((rows ?? []) as never)
    return decorated
      .filter((r) => r.human_relates === 0 && r.human_comments === 0)
      .slice(0, data.limit ?? 50)
  })

export const adminLiquidityStats = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }) => {
    await assertAdmin(context)
    await context
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const now = Date.now()
    const iso = (ms: number) => new Date(ms).toISOString()
    const d1 = iso(now - 24 * 3600 * 1000)
    const d3 = iso(now - 72 * 3600 * 1000)

    // Base pool: real public rooms
    const { data: allRooms } = await supabaseAdmin
      .from('situations')
      .select('id, room_id, created_at, human_response_at')
      .eq('is_public', true)
      .eq('is_seed', false)
      .eq('crisis_flag', false)
      .is('deleted_at', null)
      .not('room_id', 'is', null)
      .limit(5000)
    const pool = (allRooms ?? []) as Array<{ id: string; room_id: string; created_at: string; human_response_at: string | null }>
    const total = pool.length
    const responded = pool.filter((r) => !!r.human_response_at).length
    const coverage = total > 0 ? Math.round((responded / total) * 100) : 0
    const cold = pool.filter((r) => !r.human_response_at && new Date(r.created_at).getTime() < now - 72 * 3600 * 1000).length

    // 24h coverage: rooms created in last 24h
    const last24 = pool.filter((r) => new Date(r.created_at).getTime() >= now - 24 * 3600 * 1000)
    const last24Responded = last24.filter((r) => !!r.human_response_at).length
    const coverage24 = last24.length > 0 ? Math.round((last24Responded / last24.length) * 100) : 0

    // Median TTFR (hours) — for rooms that have a response
    const ttfr: number[] = []
    for (const r of pool) {
      if (r.human_response_at) {
        const h = (new Date(r.human_response_at).getTime() - new Date(r.created_at).getTime()) / 3600000
        if (h >= 0) ttfr.push(h)
      }
    }
    ttfr.sort((a, b) => a - b)
    const medianTtfrHours = ttfr.length > 0 ? Number(ttfr[Math.floor(ttfr.length / 2)].toFixed(1)) : null

    void d1; void d3
    return {
      total_public_rooms: total,
      response_coverage_pct: coverage,
      coverage_24h_pct: coverage24,
      new_rooms_24h: last24.length,
      cold_rooms_over_72h: cold,
      median_ttfr_hours: medianTtfrHours,
    }
  })

// ---------- growth (rolling 24h / 7d / 30d) ----------

export type GrowthDelta = { curr: number; prev: number; delta_pct: number | null }
export type GrowthSeriesPoint = { date: string; n: number }
export type GrowthBlock = { day: GrowthDelta; week: GrowthDelta; month: GrowthDelta; series30d: GrowthSeriesPoint[] }
export interface GrowthPayload {
  signups: GrowthBlock
  visits: GrowthBlock
  unique_visitors: GrowthBlock
  generated_at: string
}

function bucketByDay(timestamps: string[], now: number, days: number): GrowthSeriesPoint[] {
  const dayMs = 24 * 3600 * 1000
  const start = now - days * dayMs
  const buckets: Record<string, number> = {}
  for (let i = 0; i < days; i++) {
    const d = new Date(start + i * dayMs).toISOString().slice(0, 10)
    buckets[d] = 0
  }
  for (const t of timestamps) {
    const ms = new Date(t).getTime()
    if (ms < start) continue
    const key = new Date(ms).toISOString().slice(0, 10)
    if (buckets[key] !== undefined) buckets[key]++
  }
  return Object.entries(buckets).map(([date, n]) => ({ date, n }))
}

function deltaWindow(timestamps: string[], now: number, windowMs: number): GrowthDelta {
  const currStart = now - windowMs
  const prevStart = now - 2 * windowMs
  let curr = 0
  let prev = 0
  for (const t of timestamps) {
    const ms = new Date(t).getTime()
    if (ms >= currStart) curr++
    else if (ms >= prevStart) prev++
  }
  const delta_pct = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : (curr > 0 ? null : 0)
  return { curr, prev, delta_pct }
}

type KeyedTs = { t: string; k: string }

function bucketByDayDistinct(items: KeyedTs[], now: number, days: number): GrowthSeriesPoint[] {
  const dayMs = 24 * 3600 * 1000
  const start = now - days * dayMs
  const dates: string[] = []
  const sets: Record<string, Set<string>> = {}
  for (let i = 0; i < days; i++) {
    const d = new Date(start + i * dayMs).toISOString().slice(0, 10)
    dates.push(d)
    sets[d] = new Set()
  }
  for (const { t, k } of items) {
    const ms = new Date(t).getTime()
    if (ms < start) continue
    const key = new Date(ms).toISOString().slice(0, 10)
    if (sets[key]) sets[key].add(k)
  }
  return dates.map((d) => ({ date: d, n: sets[d].size }))
}

function deltaWindowDistinct(items: KeyedTs[], now: number, windowMs: number): GrowthDelta {
  const currStart = now - windowMs
  const prevStart = now - 2 * windowMs
  const curr = new Set<string>()
  const prev = new Set<string>()
  for (const { t, k } of items) {
    const ms = new Date(t).getTime()
    if (ms >= currStart) curr.add(k)
    else if (ms >= prevStart) prev.add(k)
  }
  const c = curr.size
  const p = prev.size
  const delta_pct = p > 0 ? Math.round(((c - p) / p) * 100) : (c > 0 ? null : 0)
  return { curr: c, prev: p, delta_pct }
}

export const adminGrowth = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }): Promise<GrowthPayload> => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const now = Date.now()
    const since = new Date(now - 60 * 24 * 3600 * 1000).toISOString()

    const [signupsRes, visitsRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('signup_at')
        .eq('is_anonymous', false)
        .gte('signup_at', since)
        .limit(100000),
      supabaseAdmin
        .from('visits_classified')
        .select('started_at, user_id, session_id')
        .eq('is_bot', false)
        .gte('started_at', since)
        .limit(200000),
    ])

    const signupTs = ((signupsRes.data ?? []) as Array<{ signup_at: string | null }>)
      .map((r) => r.signup_at).filter((v): v is string => !!v)
    const visitRows = ((visitsRes.data ?? []) as Array<{ started_at: string | null; user_id: string | null; session_id: string | null }>)
    const visitTs = visitRows.map((r) => r.started_at).filter((v): v is string => !!v)
    const uniqueItems: KeyedTs[] = visitRows
      .map((r) => ({ t: r.started_at, k: r.user_id ?? r.session_id }))
      .filter((x): x is KeyedTs => !!x.t && !!x.k)

    const dayMs = 24 * 3600 * 1000
    const build = (ts: string[]): GrowthBlock => ({
      day: deltaWindow(ts, now, dayMs),
      week: deltaWindow(ts, now, 7 * dayMs),
      month: deltaWindow(ts, now, 30 * dayMs),
      series30d: bucketByDay(ts, now, 30),
    })
    const buildDistinct = (items: KeyedTs[]): GrowthBlock => ({
      day: deltaWindowDistinct(items, now, dayMs),
      week: deltaWindowDistinct(items, now, 7 * dayMs),
      month: deltaWindowDistinct(items, now, 30 * dayMs),
      series30d: bucketByDayDistinct(items, now, 30),
    })

    return {
      signups: build(signupTs),
      visits: build(visitTs),
      unique_visitors: buildDistinct(uniqueItems),
      generated_at: new Date(now).toISOString(),
    }
  })


// ---------- acquisition (30d, humans only) ----------

const SEARCH_HOSTS = /(google|bing|duckduckgo|yahoo|yandex|baidu|ecosia|brave|qwant|kagi)\./i
const SOCIAL_HOSTS = /(twitter|x\.com|reddit|facebook|instagram|tiktok|linkedin|pinterest|threads\.net|bsky\.app|mastodon|youtube|discord|whatsapp|t\.me|telegram|snapchat)/i

function hostnameOf(url: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '')
  } catch { return null }
}

type Channel = 'direct' | 'search' | 'social' | 'referral' | 'utm'

function classifyChannel(referrer: string | null, utmSource: string | null, siteHost: string): Channel {
  if (utmSource) return 'utm'
  const host = hostnameOf(referrer)
  if (!host) return 'direct'
  if (host === siteHost || host.endsWith('.' + siteHost)) return 'direct'
  if (SEARCH_HOSTS.test(host)) return 'search'
  if (SOCIAL_HOSTS.test(host)) return 'social'
  return 'referral'
}

export interface AcquisitionPayload {
  window_days: number
  total_visits: number
  channels: Record<Channel, number>
  top_referrers: Array<[string, number]>
  top_utm_sources: Array<[string, number]>
  top_utm_campaigns: Array<[string, number]>
  top_landing_paths: Array<[string, number]>
  captured_utm_count: number
}

export const adminAcquisition = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }): Promise<AcquisitionPayload> => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

    const { data: rows } = await supabaseAdmin
      .from('visits_classified')
      .select('referrer, utm_source, utm_campaign, landing_path')
      .eq('is_bot', false)
      .gte('started_at', since)
      .limit(200000)

    const list = (rows ?? []) as Array<{
      referrer: string | null; utm_source: string | null;
      utm_campaign: string | null; landing_path: string | null;
    }>

    const channels: Record<Channel, number> = { direct: 0, search: 0, social: 0, referral: 0, utm: 0 }
    const refCounts: Record<string, number> = {}
    const utmSrcCounts: Record<string, number> = {}
    const utmCampCounts: Record<string, number> = {}
    const landingCounts: Record<string, number> = {}
    let capturedUtm = 0

    const siteHost = (process.env.SITE_HOST ?? 'shutap.com').replace(/^www\./, '')

    for (const r of list) {
      channels[classifyChannel(r.referrer, r.utm_source, siteHost)]++
      const host = hostnameOf(r.referrer)
      if (host && host !== siteHost && !host.endsWith('.' + siteHost)) {
        refCounts[host] = (refCounts[host] ?? 0) + 1
      }
      if (r.utm_source) {
        capturedUtm++
        utmSrcCounts[r.utm_source] = (utmSrcCounts[r.utm_source] ?? 0) + 1
      }
      if (r.utm_campaign) utmCampCounts[r.utm_campaign] = (utmCampCounts[r.utm_campaign] ?? 0) + 1
      if (r.landing_path) landingCounts[r.landing_path] = (landingCounts[r.landing_path] ?? 0) + 1
    }

    const rank = (m: Record<string, number>, n = 10): Array<[string, number]> =>
      Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n)

    return {
      window_days: 30,
      total_visits: list.length,
      channels,
      top_referrers: rank(refCounts),
      top_utm_sources: rank(utmSrcCounts),
      top_utm_campaigns: rank(utmCampCounts),
      top_landing_paths: rank(landingCounts),
      captured_utm_count: capturedUtm,
    }
  })

/* ───────────────────────── downloads ───────────────────────── */

export type DownloadsPayload = {
  by_kind: { kind: string; d1: number; d7: number; d30: number; all: number }[]
  by_tier_30: { tier: string; n: number }[]
  watermarked_30: number
  clean_30: number
  users_30: number
  recent: { created_at: string; kind: string; tier: string; watermarked: boolean; user_id: string }[]
}

/** The download ledger (bit_downloads): caption + hashtags, picture, PDF,
 *  video — each its own download. Counts by kind and tier, and the last 30. */
export const adminDownloads = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }): Promise<DownloadsPayload> => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const db = supabaseAdmin as any
    const now = Date.now()
    const iso = (ms: number) => new Date(ms).toISOString()
    const d30 = iso(now - 30 * 24 * 3600 * 1000)
    const d7 = iso(now - 7 * 24 * 3600 * 1000)
    const d1 = iso(now - 24 * 3600 * 1000)
    const { data: all } = await db.from('bit_downloads').select('kind, tier, watermarked, user_id, created_at').gte('created_at', d30).order('created_at', { ascending: false })
    const rows: { kind: string; tier: string; watermarked: boolean; user_id: string; created_at: string }[] = all ?? []
    const { data: allTime } = await db.from('bit_downloads').select('kind')
    const kinds = ['caption', 'image', 'pdf', 'video']
    const by_kind = kinds.map((kind) => ({
      kind,
      d1: rows.filter((r) => r.kind === kind && r.created_at >= d1).length,
      d7: rows.filter((r) => r.kind === kind && r.created_at >= d7).length,
      d30: rows.filter((r) => r.kind === kind).length,
      all: ((allTime ?? []) as { kind: string }[]).filter((r) => r.kind === kind).length,
    }))
    const tiers = new Map<string, number>()
    for (const r of rows) tiers.set(r.tier, (tiers.get(r.tier) ?? 0) + 1)
    return {
      by_kind,
      by_tier_30: Array.from(tiers, ([tier, n]) => ({ tier, n })),
      watermarked_30: rows.filter((r) => r.watermarked).length,
      clean_30: rows.filter((r) => !r.watermarked).length,
      users_30: new Set(rows.map((r) => r.user_id)).size,
      recent: rows.slice(0, 30),
    }
  })
