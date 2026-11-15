// Admin-only: /admin/guests. Loads the window's events and visits and hands
// them to aggregateGuests (admin-guests-report.ts), which does the counting.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { aggregateGuests, type GuestEventRow, type GuestVisitRow, type GuestsReport } from './admin-guests-report'
import { pacificDay } from './pacific-day'

async function assertAdmin(ctx: unknown): Promise<void> {
  const c = ctx as { supabase: { rpc: (fn: 'has_role', args: { _user_id: string; _role: 'admin' }) => PromiseLike<{ data: unknown; error: unknown }> }; userId: string }
  const { data, error } = await c.supabase.rpc('has_role', { _user_id: c.userId, _role: 'admin' })
  if (error || !data) throw new Error('Forbidden')
}

// PostgREST caps a response at ~1000 rows; page through with range().
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  const size = 1000
  for (let from = 0; from < 300_000; from += size) {
    const { data, error } = await build(from, from + size - 1)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as T[]
    out.push(...rows)
    if (rows.length < size) break
  }
  return out
}

/** The start of the window: "today" is since Pacific midnight; N days is the
 *  last N×24 hours. */
function windowStart(days: number, now = Date.now()): string {
  if (days !== 1) return new Date(now - days * 24 * 3600 * 1000).toISOString()
  const day = pacificDay(now) // YYYY-MM-DD in Los Angeles
  // Pacific midnight: try both offsets, keep the one that lands on that day.
  for (const off of ['-08:00', '-07:00']) {
    const t = new Date(`${day}T00:00:00${off}`).getTime()
    if (pacificDay(t) === day && pacificDay(t - 1) !== day) return new Date(t).toISOString()
  }
  return new Date(now - 24 * 3600 * 1000).toISOString()
}

export type AdminGuestsResult = GuestsReport & { days: number; since: string }

export const adminGuests = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ days: z.union([z.literal(1), z.literal(7), z.literal(14), z.literal(30)]) }).parse(d ?? { days: 14 }))
  .handler(async ({ data, context }): Promise<AdminGuestsResult> => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const db = supabaseAdmin as any
    const since = windowStart(data.days)

    const [events, visits, profiles, roles, subs, kits, toasts] = await Promise.all([
      fetchAll<GuestEventRow>((f, t) => db.from('events').select('name, user_id, session_id, ts, properties').gte('ts', since).order('ts').range(f, t)),
      fetchAll<GuestVisitRow & { started_at: string }>((f, t) => db.from('visits_classified').select('session_id, is_bot, utm_source, referrer, started_at').gte('started_at', since).order('started_at').range(f, t)),
      fetchAll<{ user_id: string; email: string | null }>((f, t) => db.from('profiles').select('user_id, email').eq('is_anonymous', false).not('email', 'is', null).neq('email', '').order('user_id').range(f, t)),
      fetchAll<{ user_id: string }>((f, t) => db.from('user_roles').select('user_id').eq('role', 'admin').order('user_id').range(f, t)),
      fetchAll<{ status: string; environment: string }>((f, t) => db.from('subscriptions').select('status, environment').order('status').range(f, t)),
      fetchAll<{ user_id: string; created_at: string; paid: boolean }>((f, t) => db.from('kits').select('user_id, created_at, paid').gte('created_at', since).order('created_at').range(f, t)),
      fetchAll<{ user_id: string; created_at: string; paid: boolean }>((f, t) => db.from('toasts').select('user_id, created_at, paid').gte('created_at', since).order('created_at').range(f, t)),
    ])

    const report = aggregateGuests({
      events,
      visits,
      accountIds: new Set(profiles.map((p) => p.user_id)),
      adminIds: new Set(roles.map((r) => r.user_id)),
      emails: new Map(profiles.map((p) => [p.user_id, p.email ?? ''])),
      subs,
      kits,
      toasts,
    })
    return { ...report, days: data.days, since }
  })
