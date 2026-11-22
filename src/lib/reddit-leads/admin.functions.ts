// Reddit leads, the admin side: what /admin/reddit reads and changes.
// Admin-only. The service role does the reads and writes after the admin check.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { pacificDay, pacificMidnight } from '@/lib/pacific-day'
import { MAX_DRAFTS_PER_DAY, MENTION_ONE_IN, MENTIONS_FROM_DAY, mayMention } from './rules'

async function db() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  // The generated types do not know these tables yet.
  return supabaseAdmin as any // eslint-disable-line @typescript-eslint/no-explicit-any
}

async function assertAdmin(ctx: unknown): Promise<void> {
  const c = ctx as { supabase: { rpc: (fn: 'has_role', args: { _user_id: string; _role: 'admin' }) => PromiseLike<{ data: unknown; error: unknown }> }; userId: string }
  const { data, error } = await c.supabase.rpc('has_role', { _user_id: c.userId, _role: 'admin' })
  if (error || !data) throw new Error('Forbidden')
}

export type LinksAllowed = 'yes' | 'no' | 'unknown'

export type RedditLead = {
  id: string
  url: string
  subreddit: string
  title: string
  snippet: string | null
  theme: string | null
  score: number | null
  scoreReason: string | null
  draft: string | null
  mentionsShutap: boolean
  status: string
  foundAt: string
  postedAt: string | null
  postedBody: string | null
  linksAllowed: LinksAllowed
}

export type RedditReport = {
  day: string
  mentionsFrom: string
  maxDraftsPerDay: number
  mentionOneIn: number
  drafts: RedditLead[]
  posted: RedditLead[]
  stats: { postedTotal: number; postedWithMention: number; postedToday: number; waiting: number }
  runs: Array<{ startedAt: string; finishedAt: string | null; queries: number; found: number; newThreads: number; drafted: number; error: string | null }>
  subreddits: Array<{ name: string; linksAllowed: LinksAllowed; blocked: boolean; notes: string | null; found: number; posted: number }>
  keywords: Array<{ id: string; query: string; theme: string; active: boolean }>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toLead(r: any, rules: Map<string, LinksAllowed>): RedditLead {
  return {
    id: r.id,
    url: r.url,
    subreddit: r.subreddit,
    title: r.title,
    snippet: r.snippet,
    theme: r.theme,
    score: r.score,
    scoreReason: r.score_reason,
    draft: r.draft,
    mentionsShutap: !!r.mentions_shutap,
    status: r.status,
    foundAt: r.found_at,
    postedAt: r.posted_at,
    postedBody: r.posted_body,
    linksAllowed: rules.get(r.subreddit) ?? 'unknown',
  }
}

const LEAD_COLS = 'id, url, subreddit, title, snippet, theme, score, score_reason, draft, mentions_shutap, status, found_at, posted_at, posted_body'

export const adminRedditReport = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RedditReport> => {
    await assertAdmin(context)
    const client = await db()
    const day = pacificDay()
    const dayStart = new Date(pacificMidnight(day)).toISOString()

    const [subsRes, draftsRes, postedRes, runsRes, kwRes, countsRes] = await Promise.all([
      client.from('reddit_subreddits').select('name, links_allowed, blocked, notes'),
      client.from('reddit_leads').select(LEAD_COLS).eq('status', 'drafted').order('score', { ascending: false }).order('found_at', { ascending: false }).limit(50),
      client.from('reddit_leads').select(LEAD_COLS).eq('status', 'posted').order('posted_at', { ascending: false }).limit(40),
      client.from('reddit_runs').select('started_at, finished_at, queries, found, new_threads, drafted, error').order('started_at', { ascending: false }).limit(7),
      client.from('reddit_keywords').select('id, query, theme, active').order('theme').order('query'),
      client.from('reddit_leads').select('subreddit, status, mentions_shutap, posted_at').limit(10000),
    ])
    for (const r of [subsRes, draftsRes, postedRes, runsRes, kwRes, countsRes]) if (r.error) throw new Error(r.error.message)

    const rules = new Map<string, LinksAllowed>()
    const subMeta = new Map<string, { blocked: boolean; notes: string | null }>()
    for (const s of subsRes.data ?? []) {
      rules.set(s.name, s.links_allowed)
      subMeta.set(s.name, { blocked: s.blocked, notes: s.notes })
    }

    const perSub = new Map<string, { found: number; posted: number }>()
    let postedTotal = 0
    let postedWithMention = 0
    let postedToday = 0
    for (const r of countsRes.data ?? []) {
      const c = perSub.get(r.subreddit) ?? { found: 0, posted: 0 }
      c.found++
      if (r.status === 'posted') {
        c.posted++
        postedTotal++
        if (r.mentions_shutap) postedWithMention++
        if (r.posted_at && r.posted_at >= dayStart) postedToday++
      }
      perSub.set(r.subreddit, c)
    }
    const names = new Set<string>([...perSub.keys(), ...rules.keys()])
    const subreddits = [...names]
      .map((name) => ({
        name,
        linksAllowed: rules.get(name) ?? ('unknown' as LinksAllowed),
        blocked: subMeta.get(name)?.blocked ?? false,
        notes: subMeta.get(name)?.notes ?? null,
        found: perSub.get(name)?.found ?? 0,
        posted: perSub.get(name)?.posted ?? 0,
      }))
      .sort((a, b) => b.found - a.found || a.name.localeCompare(b.name))

    const drafts = (draftsRes.data ?? []).map((r: unknown) => toLead(r, rules))
    return {
      day,
      mentionsFrom: MENTIONS_FROM_DAY,
      maxDraftsPerDay: MAX_DRAFTS_PER_DAY,
      mentionOneIn: MENTION_ONE_IN,
      drafts,
      posted: (postedRes.data ?? []).map((r: unknown) => toLead(r, rules)),
      stats: { postedTotal, postedWithMention, postedToday, waiting: drafts.length },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      runs: (runsRes.data ?? []).map((r: any) => ({
        startedAt: r.started_at,
        finishedAt: r.finished_at,
        queries: r.queries,
        found: r.found,
        newThreads: r.new_threads,
        drafted: r.drafted,
        error: r.error,
      })),
      subreddits,
      keywords: kwRes.data ?? [],
    }
  })

/** Candy posted a reply (with whatever edits she made) or skipped the thread. */
export const adminRedditMark = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(['posted', 'skipped', 'undo']),
        body: z.string().max(10000).optional(),
        reason: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context)
    const client = await db()
    const { data: lead, error } = await client.from('reddit_leads').select('id, subreddit, draft, status').eq('id', data.id).single()
    if (error || !lead) throw new Error('Lead not found')

    if (data.action === 'undo') {
      const { error: e } = await client
        .from('reddit_leads')
        .update({ status: 'drafted', posted_at: null, posted_body: null, skip_reason: null })
        .eq('id', data.id)
      if (e) throw new Error(e.message)
      return { ok: true }
    }

    if (data.action === 'skipped') {
      const { error: e } = await client.from('reddit_leads').update({ status: 'skipped', skip_reason: data.reason ?? null }).eq('id', data.id)
      if (e) throw new Error(e.message)
      return { ok: true }
    }

    // Posted. What she posted decides whether it counts as a Shutap mention.
    const body = (data.body ?? lead.draft ?? '').trim()
    if (!body) throw new Error('Nothing to save: the reply is empty')
    const mentions = /shutap/i.test(body)
    if (mentions) {
      const [{ data: sub }, { count: total }, { count: withMention }] = await Promise.all([
        client.from('reddit_subreddits').select('links_allowed').eq('name', lead.subreddit).maybeSingle(),
        client.from('reddit_leads').select('id', { count: 'exact', head: true }).eq('status', 'posted'),
        client.from('reddit_leads').select('id', { count: 'exact', head: true }).eq('status', 'posted').eq('mentions_shutap', true),
      ])
      const rule = mayMention({
        day: pacificDay(),
        linksAllowed: (sub?.links_allowed as LinksAllowed) ?? 'unknown',
        postedTotal: total ?? 0,
        postedWithMention: withMention ?? 0,
        mentionsAlreadyDraftedToday: 0,
      })
      if (!rule.ok) {
        throw new Error(`This reply mentions Shutap, which isn't allowed here yet (${rule.reason}). Take the mention out before you post it.`)
      }
    }
    const { error: e } = await client
      .from('reddit_leads')
      .update({ status: 'posted', posted_at: new Date().toISOString(), posted_body: body, mentions_shutap: mentions })
      .eq('id', data.id)
    if (e) throw new Error(e.message)
    return { ok: true }
  })

/** Set a subreddit's link rule or block it. */
export const adminRedditSetSubreddit = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().regex(/^[a-z0-9_]{2,21}$/),
        linksAllowed: z.enum(['yes', 'no', 'unknown']),
        blocked: z.boolean(),
        notes: z.string().max(500).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context)
    const { error } = await (await db())
      .from('reddit_subreddits')
      .upsert(
        { name: data.name, links_allowed: data.linksAllowed, blocked: data.blocked, notes: data.notes ?? null, updated_at: new Date().toISOString() },
        { onConflict: 'name' },
      )
    if (error) throw new Error(error.message)
    return { ok: true }
  })

/** Add a keyword search, or switch one on or off. */
export const adminRedditKeyword = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .union([
        z.object({ id: z.string().uuid(), active: z.boolean() }),
        z.object({ query: z.string().trim().min(3).max(120), theme: z.enum(['humor', 'toast']) }),
      ])
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context)
    const client = await db()
    const { error } =
      'id' in data
        ? await client.from('reddit_keywords').update({ active: data.active }).eq('id', data.id)
        : await client.from('reddit_keywords').upsert({ query: data.query, theme: data.theme, active: true }, { onConflict: 'query' })
    if (error) throw new Error(error.message)
    return { ok: true }
  })

/** Run the search now instead of waiting for the morning. The daily caps still hold. */
export const adminRedditRunNow = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context)
    const { runRedditLeads } = await import('./run.server')
    return runRedditLeads({ force: true })
  })
