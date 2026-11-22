// Admin numbers for Shutap for small business (Nov 21 2026). Admin-only.
// Every number is counted from real rows, and counts real users only: admin
// accounts, every browser an admin account was ever seen on (the founder's
// own phones and computers), and smoke-test events are left out.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { funnel, tally, type FunnelEvent, type FunnelRow } from './shops/funnel'

async function assertAdmin(ctx: unknown): Promise<void> {
  const c = ctx as { supabase: { rpc: (fn: 'has_role', args: { _user_id: string; _role: 'admin' }) => PromiseLike<{ data: unknown; error: unknown }> }; userId: string }
  const { data, error } = await c.supabase.rpc('has_role', { _user_id: c.userId, _role: 'admin' })
  if (error || !data) throw new Error('Forbidden')
}

async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; from < 100_000; from += 1000) {
    const { data, error } = await build(from, from + 999)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as T[]
    out.push(...rows)
    if (rows.length < 1000) break
  }
  return out
}

export type ShopsReport = {
  days: number
  since: string
  left_out: { admin_accounts: number; admin_browsers: number; events: number }
  funnel: FunnelRow[]
  totals: { businesses: number; from_google: number; with_logo: number; reminders_on: number; videos_made: number; videos_saved: number; videos_kept: number; skit_sets: number; code_says: number }
  problems: { what: string; n: number }[]
  mic: { what: string; n: number }[]
  lookups: { searches: number; details: number; failed: number }
  limits: number
  text_styles: { what: string; n: number }[]
}

export const adminShopsReport = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ days: z.union([z.literal(1), z.literal(7), z.literal(30)]).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }): Promise<ShopsReport> => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const db = supabaseAdmin as any
    const days = data.days ?? 7
    const since = new Date(Date.now() - days * 86_400_000).toISOString()
    type Ev = { user_id: string | null; session_id: string | null; name: string; properties: Record<string, unknown> | null }
    const [roles, events] = await Promise.all([
      fetchAll<{ user_id: string }>((f, t) => db.from('user_roles').select('user_id').eq('role', 'admin').order('user_id').range(f, t)),
      fetchAll<Ev>((f, t) => db.from('events').select('user_id, session_id, name, properties').eq('product', 'smallbusiness').gte('ts', since).order('ts').range(f, t)),
    ])
    const admins = new Set(roles.map((r) => r.user_id))
    // a browser an admin was ever signed in on is the founder's, signed in or not
    const adminBrowsers = new Set<string>()
    if (admins.size) {
      const seen = await fetchAll<{ session_id: string | null }>((f, t) => db.from('events').select('session_id').in('user_id', [...admins]).not('session_id', 'is', null).order('ts', { ascending: false }).range(f, Math.min(t, 19_999)))
      for (const s of seen) if (s.session_id) adminBrowsers.add(s.session_id)
    }
    const real: FunnelEvent[] = []
    let leftOut = 0
    for (const e of events) {
      const mine = (e.user_id && admins.has(e.user_id)) || (e.session_id && adminBrowsers.has(e.session_id)) || e.properties?.['smoke'] === true
      const who = e.user_id ?? (e.session_id ? `s:${e.session_id}` : null)
      if (mine || !who) { leftOut++; continue }
      real.push({ who, name: e.name, properties: e.properties })
    }
    // an account's events before sign-up were under its browser: fold them together
    const owner = new Map<string, string>()
    for (const e of events) if (e.user_id && e.session_id) owner.set(`s:${e.session_id}`, e.user_id)
    for (const e of real) e.who = owner.get(e.who) ?? e.who

    const notAdmin = (q: any) => (admins.size ? q.not('user_id', 'in', `(${[...admins].join(',')})`) : q)
    const count = async (q: any) => { const { count: n } = await q; return n ?? 0 }
    const [businesses, fromGoogle, withLogo, remindOn, made, saved, kept, sets, says] = await Promise.all([
      count(notAdmin(db.from('shops').select('id', { count: 'exact', head: true }))),
      count(notAdmin(db.from('shops').select('id', { count: 'exact', head: true }).not('place_id', 'is', null))),
      count(notAdmin(db.from('shops').select('id', { count: 'exact', head: true }).not('logo', 'is', null))),
      count(notAdmin(db.from('shops').select('id', { count: 'exact', head: true }).eq('remind', true))),
      count(notAdmin(db.from('shop_videos').select('id', { count: 'exact', head: true }).gte('created_at', since))),
      count(notAdmin(db.from('shop_videos').select('id', { count: 'exact', head: true }).gte('created_at', since).eq('saved', true))),
      count(notAdmin(db.from('shop_videos').select('id', { count: 'exact', head: true }).not('storage_path', 'is', null).is('deleted_at', null))),
      count(notAdmin(db.from('shop_skit_sets').select('id', { count: 'exact', head: true }).gte('created_at', since))),
      (async () => { const { data: rows } = await notAdmin(db.from('shops').select('code_says').gt('code_says', 0).limit(5000)); return ((rows ?? []) as { code_says: number }[]).reduce((a, r) => a + Number(r.code_says ?? 0), 0) })(),
    ])
    const lookups = real.filter((e) => e.name === 'shop_lookup')
    return {
      days, since,
      left_out: { admin_accounts: admins.size, admin_browsers: adminBrowsers.size, events: leftOut },
      funnel: funnel(real),
      totals: { businesses, from_google: fromGoogle, with_logo: withLogo, reminders_on: remindOn, videos_made: made, videos_saved: saved, videos_kept: kept, skit_sets: sets, code_says: says },
      problems: tally(real, 'shop_film_problem', 'what'),
      mic: tally(real, 'sb_mic', 'how'),
      lookups: { searches: lookups.filter((e) => e.properties?.['kind'] === 'search').length, details: lookups.filter((e) => e.properties?.['kind'] === 'details').length, failed: lookups.filter((e) => e.properties?.['reason']).length },
      limits: real.filter((e) => e.name === 'shop_limit_reached').length,
      text_styles: tally(real, 'sb_video_ready', 'style'),
    }
  })
