// Homepage poll server functions. Voters only ever get percentages back,
// and only after they have voted. Counts and who-picked-what are admin-only.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { requireRealUser } from '@/lib/require-real-user'
import { FOLLOW_UP_MAX, POLL, POLL_KEY, POLL_OPTION_KEYS, pollOption, toPercents, type PollOptionKey } from '@/lib/poll'

async function db() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}

async function assertAdmin(ctx: unknown): Promise<void> {
  const c = ctx as { supabase: { rpc: (fn: 'has_role', args: { _user_id: string; _role: 'admin' }) => PromiseLike<{ data: unknown; error: unknown }> }; userId: string }
  const { data, error } = await c.supabase.rpc('has_role', { _user_id: c.userId, _role: 'admin' })
  if (error || !data) throw new Error('Forbidden')
}

type PollRow = { key: string; title: string; opened_at: string; closes_at: string | null }
type VoteRow = { option_key: string; follow_up: string | null }

async function loadPoll(): Promise<PollRow | null> {
  const { data } = await (await db()).from('polls').select('key, title, opened_at, closes_at').eq('key', POLL_KEY).maybeSingle()
  return (data as PollRow | null) ?? null
}

const isOpen = (p: PollRow) => !p.closes_at || new Date(p.closes_at).getTime() > Date.now()

async function percents(): Promise<Record<PollOptionKey, number>> {
  const counts = Object.fromEntries(POLL_OPTION_KEYS.map((k) => [k, 0])) as Record<PollOptionKey, number>
  const client = await db()
  await Promise.all(
    POLL_OPTION_KEYS.map(async (k) => {
      const { count } = await client.from('poll_votes').select('user_id', { count: 'exact', head: true }).eq('poll_key', POLL_KEY).eq('option_key', k)
      counts[k] = count ?? 0
    }),
  )
  return toPercents(counts)
}

export interface PollMeta {
  openedAt: string
  open: boolean
}

/** Is the poll running, and since when. No votes, no counts. */
export const getPollMeta = createServerFn({ method: 'GET' }).handler(async (): Promise<PollMeta | null> => {
  const p = await loadPoll()
  if (!p) return null
  return { openedAt: p.opened_at, open: isOpen(p) }
})

export interface MyPollState {
  vote: { option: PollOptionKey; followUp: string | null } | null
  /** Only present once the caller has voted. */
  percents: Record<PollOptionKey, number> | null
}

async function myState(userId: string): Promise<MyPollState> {
  const { data } = await (await db()).from('poll_votes').select('option_key, follow_up').eq('poll_key', POLL_KEY).eq('user_id', userId).maybeSingle()
  const v = data as VoteRow | null
  if (!v || !pollOption(v.option_key)) return { vote: null, percents: null }
  return { vote: { option: v.option_key as PollOptionKey, followUp: v.follow_up }, percents: await percents() }
}

export const getMyPollState = createServerFn({ method: 'GET' })
  .middleware([requireRealUser])
  .handler(async ({ context }): Promise<MyPollState> => myState((context as { userId: string }).userId))

export const castPollVote = createServerFn({ method: 'POST' })
  .middleware([requireRealUser])
  .inputValidator((d: unknown) => z.object({ option: z.enum(POLL_OPTION_KEYS) }).parse(d))
  .handler(async ({ data, context }): Promise<MyPollState & { changed: boolean }> => {
    const userId = (context as { userId: string }).userId
    const p = await loadPoll()
    if (!p || !isOpen(p)) throw new Error('poll_closed')
    const client = await db()
    const { data: existing } = await client.from('poll_votes').select('option_key, change_count').eq('poll_key', POLL_KEY).eq('user_id', userId).maybeSingle()
    const prev = existing as { option_key: string; change_count: number } | null
    const now = new Date().toISOString()
    let changed = false
    if (!prev) {
      const { error } = await client.from('poll_votes').insert({ poll_key: POLL_KEY, user_id: userId, option_key: data.option, voted_at: now, updated_at: now })
      // A double tap can race the insert; the row that landed is the vote.
      if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message)
    } else if (prev.option_key !== data.option) {
      changed = true
      // A changed vote drops the follow-up: it answered the old pick.
      const { error } = await client
        .from('poll_votes')
        .update({ option_key: data.option, previous_option: prev.option_key, change_count: prev.change_count + 1, follow_up: null, updated_at: now })
        .eq('poll_key', POLL_KEY)
        .eq('user_id', userId)
      if (error) throw new Error(error.message)
    }
    return { ...(await myState(userId)), changed }
  })

export const savePollFollowUp = createServerFn({ method: 'POST' })
  .middleware([requireRealUser])
  .inputValidator((d: unknown) => z.object({ answer: z.string().trim().min(1).max(FOLLOW_UP_MAX) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const userId = (context as { userId: string }).userId
    const client = await db()
    const { data: row } = await client.from('poll_votes').select('option_key').eq('poll_key', POLL_KEY).eq('user_id', userId).maybeSingle()
    const opt = pollOption((row as { option_key: string } | null)?.option_key)
    if (!opt) throw new Error('vote_first')
    // Chip questions only take their own chips; the typed one takes text.
    if (opt.followUp.chips.length > 0 && !opt.followUp.chips.includes(data.answer)) throw new Error('unknown_answer')
    const { error } = await client
      .from('poll_votes')
      .update({ follow_up: data.answer, updated_at: new Date().toISOString() })
      .eq('poll_key', POLL_KEY)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

/* ── admin ── */

export interface AdminPollVoter {
  userId: string
  name: string | null
  email: string | null
  provider: string | null
  option: PollOptionKey
  followUp: string | null
  previousOption: PollOptionKey | null
  votedAt: string
  updatedAt: string
  emailedAt: string | null
}

export interface AdminPollReport {
  title: string
  openedAt: string
  closesAt: string | null
  open: boolean
  total: number
  options: Array<{ key: PollOptionKey; label: string; count: number; pct: number; topFollowUp: string | null }>
  /** Distinct browser sessions per step since the poll opened, from site events. */
  funnel: Array<{ step: string; label: string; sessions: number }>
  voters: AdminPollVoter[]
}

const FUNNEL = [
  { step: 'poll_viewed', label: 'saw the poll' },
  { step: 'poll_option_tapped', label: 'tapped an option' },
  { step: 'poll_signin_clicked', label: 'clicked sign in' },
  { step: 'poll_voted', label: 'vote counted' },
] as const

export const adminPollReport = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminPollReport> => {
    await assertAdmin(context)
    const p = await loadPoll()
    if (!p) throw new Error('poll_missing')
    const client = await db()

    const votes: Array<{ user_id: string; option_key: string; follow_up: string | null; previous_option: string | null; voted_at: string; updated_at: string; emailed_at: string | null }> = []
    for (let from = 0; from < 100_000; from += 1000) {
      const { data, error } = await client
        .from('poll_votes')
        .select('user_id, option_key, follow_up, previous_option, voted_at, updated_at, emailed_at')
        .eq('poll_key', POLL_KEY)
        .order('updated_at', { ascending: false })
        .range(from, from + 999)
      if (error) throw new Error(error.message)
      votes.push(...(data ?? []))
      if (!data || data.length < 1000) break
    }

    const profiles = new Map<string, { name: string | null; email: string | null; provider: string | null }>()
    const ids = votes.map((v) => v.user_id)
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await client.from('profiles').select('user_id, email, full_name, first_name, last_name, provider').in('user_id', ids.slice(i, i + 200))
      for (const r of (data ?? []) as Array<{ user_id: string; email: string | null; full_name: string | null; first_name: string | null; last_name: string | null; provider: string | null }>) {
        profiles.set(r.user_id, { name: r.full_name || [r.first_name, r.last_name].filter(Boolean).join(' ') || null, email: r.email, provider: r.provider })
      }
    }

    const counts = Object.fromEntries(POLL_OPTION_KEYS.map((k) => [k, 0])) as Record<PollOptionKey, number>
    const followTally = new Map<PollOptionKey, Map<string, number>>()
    for (const v of votes) {
      const k = v.option_key as PollOptionKey
      if (!(k in counts)) continue
      counts[k] += 1
      if (v.follow_up) {
        const m = followTally.get(k) ?? new Map<string, number>()
        m.set(v.follow_up, (m.get(v.follow_up) ?? 0) + 1)
        followTally.set(k, m)
      }
    }
    const pct = toPercents(counts)

    const funnel = await Promise.all(
      FUNNEL.map(async (f) => {
        const sessions = new Set<string>()
        for (let from = 0; from < 50_000; from += 1000) {
          const { data } = await client.from('events').select('session_id').eq('name', f.step).gte('ts', p.opened_at).range(from, from + 999)
          for (const r of (data ?? []) as Array<{ session_id: string | null }>) if (r.session_id) sessions.add(r.session_id)
          if (!data || data.length < 1000) break
        }
        return { step: f.step, label: f.label, sessions: sessions.size }
      }),
    )

    return {
      title: POLL.title,
      openedAt: p.opened_at,
      closesAt: p.closes_at,
      open: isOpen(p),
      total: votes.length,
      options: POLL.options.map((o) => {
        const tally = [...(followTally.get(o.key)?.entries() ?? [])].sort((a, b) => b[1] - a[1])
        return { key: o.key, label: o.label, count: counts[o.key], pct: pct[o.key], topFollowUp: tally[0]?.[0] ?? null }
      }),
      funnel,
      voters: votes
        .filter((v) => pollOption(v.option_key))
        .map((v) => {
          const prof = profiles.get(v.user_id)
          return {
            userId: v.user_id,
            name: prof?.name ?? null,
            email: prof?.email ?? null,
            provider: prof?.provider ?? null,
            option: v.option_key as PollOptionKey,
            followUp: v.follow_up,
            previousOption: (pollOption(v.previous_option)?.key ?? null) as PollOptionKey | null,
            votedAt: v.voted_at,
            updatedAt: v.updated_at,
            emailedAt: v.emailed_at,
          }
        }),
    }
  })

export const adminSetPollEmailed = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), emailed: z.boolean() }).parse(d))
  .handler(async ({ data, context }): Promise<{ emailedAt: string | null }> => {
    await assertAdmin(context)
    const emailedAt = data.emailed ? new Date().toISOString() : null
    const { error } = await (await db()).from('poll_votes').update({ emailed_at: emailedAt }).eq('poll_key', POLL_KEY).eq('user_id', data.userId)
    if (error) throw new Error(error.message)
    return { emailedAt }
  })

export const adminSetPollOpen = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ open: z.boolean() }).parse(d))
  .handler(async ({ data, context }): Promise<{ closesAt: string | null }> => {
    await assertAdmin(context)
    const closesAt = data.open ? null : new Date().toISOString()
    const { error } = await (await db()).from('polls').update({ closes_at: closesAt }).eq('key', POLL_KEY)
    if (error) throw new Error(error.message)
    return { closesAt }
  })
