// Reddit leads: the daily run. Server only.
//
//   1. Search Google (Serper) for each active keyword, limited to reddit.com
//      threads from the past week.
//   2. Keep thread links only, drop ones already seen and blocked subreddits.
//   3. Score the new threads 1-10 with the AI gateway.
//   4. Pick at most 5 (one per subreddit, none where Candy replied today),
//      draft a helpful reply for each, mention Shutap only where the rules allow.
//
// It never logs into Reddit, calls Reddit's API or posts anything: Reddit is
// read only through Google's results, and Candy posts by hand.
import { callAgent, tryParseJson } from '@/lib/agents/gateway'
import { pacificDay, pacificMidnight } from '@/lib/pacific-day'
import {
  MAX_DRAFTS_PER_DAY,
  isRepeat,
  looksComplete,
  mayMention,
  parseThreadUrl,
  pickDrafts,
  shutapLink,
} from './rules'

const SERPER_URL = 'https://google.serper.dev/search'
const SCORE_BATCH = 15
const MAX_TO_SCORE = 90 // keeps one run's AI calls bounded
const SEARCH_PARALLEL = 5

type Keyword = { query: string; theme: string }
type Found = { url: string; subreddit: string; title: string; snippet: string; query: string; theme: string }
type Lead = Found & { id: string; score: number | null; score_reason: string | null }

export type RunSummary = {
  ok: boolean
  skipped?: string
  day: string
  queries: number
  found: number
  new_threads: number
  drafted: number
  drafts: Array<{ subreddit: string; title: string; score: number | null; mentions_shutap: boolean }>
  errors: string[]
}

async function searchReddit(query: string, key: string): Promise<Array<{ link: string; title: string; snippet: string }>> {
  const r = await fetch(SERPER_URL, {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: `site:reddit.com ${query}`, tbs: 'qdr:w', num: 10, gl: 'us', hl: 'en' }),
  })
  if (!r.ok) throw new Error(`serper ${r.status}`)
  const j = (await r.json()) as { organic?: Array<{ link?: string; title?: string; snippet?: string }> }
  return (j.organic ?? [])
    .filter((o) => o.link)
    .map((o) => ({ link: o.link!, title: (o.title ?? '').trim(), snippet: (o.snippet ?? '').trim() }))
}

// Google titles end in " : r/sub" or " - Reddit"; the draft only needs the post title.
function cleanTitle(t: string): string {
  return t.replace(/\s*[:|-]\s*r\/[A-Za-z0-9_]+\s*$/i, '').replace(/\s*-\s*Reddit\s*$/i, '').trim()
}

const SCORE_SYSTEM = `You sort Reddit threads for a humor-writing founder who replies by hand with genuinely helpful jokes and tips.
Score each thread 1-10 for how much the person who posted it needs help making something funny right now, judging only from the title and snippet.
9-10: they are asking for help writing a funny speech, toast, story, joke or set, or asking which tool helps with that.
7-8: they ask how to be funnier, how to tell a story better, or want feedback on jokes, and a reply with concrete jokes or tips would clearly help.
4-6: loosely related; a reply would feel off-topic or forced.
1-3: news, memes, finished jokes posted for laughs, someone promoting their own thing, a closed or old discussion, or anything touching grief, death, illness, self-harm, abuse, minors or a crisis. These are always 1.
Return JSON only: {"scores":[{"i":<index>,"score":<1-10>,"reason":"<under 12 words>"}]}`

async function scoreLeads(leads: Lead[], errors: string[]): Promise<void> {
  for (let start = 0; start < leads.length; start += SCORE_BATCH) {
    const batch = leads.slice(start, start + SCORE_BATCH)
    const listing = batch
      .map((l, i) => `[${i}] r/${l.subreddit}\nTitle: ${l.title}\nSnippet: ${l.snippet || '(none)'}`)
      .join('\n\n')
    const res = await callAgent({
      system: SCORE_SYSTEM,
      messages: [{ role: 'user', content: listing }],
      maxTokens: 1500,
      jsonMode: true,
      temperature: 0,
      timeoutMs: 60_000,
    })
    if (res.error) {
      errors.push(`score: ${res.error}`)
      continue
    }
    const parsed = tryParseJson<{ scores?: Array<{ i?: number; score?: number; reason?: string }> }>(res.text)
    for (const s of parsed?.scores ?? []) {
      const lead = typeof s.i === 'number' ? batch[s.i] : undefined
      if (!lead || typeof s.score !== 'number') continue
      lead.score = Math.max(1, Math.min(10, Math.round(s.score)))
      lead.score_reason = (s.reason ?? '').slice(0, 200)
    }
  }
}

function draftSystem(mention: { ok: boolean; link: string }): string {
  const ending = mention.ok
    ? `End with one short line that says plainly you made it, in your own words, for example: "Full disclosure, I made shutap.com, it writes these if you want more options: ${mention.link}". Use exactly that link, once.`
    : `Do not mention Shutap, any website, app, tool or link. The reply must stand on its own.`
  return `You write a Reddit comment for Candy, a founder who writes comedy, replying by hand to someone who needs something funny.
Write like a person on Reddit: plain, warm, lowercase-casual is fine, no greeting, no sign-off, no hashtags, no emojis, no bullet-point essays, no marketing words.
Give real help they can use right now: two or three jokes or lines written for their exact situation, and at most one concrete tip on delivery or structure.
You only see the title and a snippet, so keep jokes to what is stated; never invent names or facts about them.
Never punch down: nothing about race, religion, nationality, accent, disability, weight or sexuality.
Under 120 words before the last line.
${ending}
If the title and snippet are not enough to write something genuinely useful, reply with exactly SKIP.`
}

async function draftOnce(lead: Lead, mention: { ok: boolean; link: string }): Promise<{ text: string; error?: string }> {
  const res = await callAgent({
    system: draftSystem(mention),
    messages: [
      {
        role: 'user',
        content: `Subreddit: r/${lead.subreddit}\nTitle: ${lead.title}\nSnippet: ${lead.snippet || '(none)'}\n\nWrite the comment.`,
      },
    ],
    // Generous: the model spends part of this budget thinking before it writes,
    // and a small budget cut drafts off mid-sentence (Nov 17).
    maxTokens: 4000,
    temperature: 0.9,
    timeoutMs: 90_000,
  })
  return { text: res.text.trim(), error: res.error }
}

/** A draft, never a cut-off one: one more try if the first ends mid-sentence. */
async function draftReply(lead: Lead, mention: { ok: boolean; link: string }): Promise<{ text: string; error?: string }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await draftOnce(lead, mention)
    if (out.error || !out.text || out.text === 'SKIP' || looksComplete(out.text)) return out
  }
  return { text: '', error: 'draft came back cut off twice' }
}

/** Run once for the Pacific day. `force` re-runs a day that already ran (manual
 *  tests); the daily caps on drafts still apply. */
export async function runRedditLeads(opts: { force?: boolean } = {}): Promise<RunSummary> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const db = supabaseAdmin as any
  const day = pacificDay()
  const dayStart = new Date(pacificMidnight(day)).toISOString()
  const errors: string[] = []
  const summary: RunSummary = { ok: false, day, queries: 0, found: 0, new_threads: 0, drafted: 0, drafts: [], errors }

  // Once a day: the cron may fire twice, and the URL is public.
  if (!opts.force) {
    const { data: ran } = await db.from('reddit_runs').select('id').gte('started_at', dayStart).limit(1)
    if (ran && ran.length) return { ...summary, ok: true, skipped: 'already ran today' }
  }

  const key = process.env.SERPER_API_KEY
  const { data: runRow } = await db.from('reddit_runs').insert({}).select('id').single()
  const runId: number | undefined = runRow?.id
  const finish = async () => {
    summary.ok = errors.length === 0 || summary.drafted > 0
    if (runId) {
      await db
        .from('reddit_runs')
        .update({
          finished_at: new Date().toISOString(),
          queries: summary.queries,
          found: summary.found,
          new_threads: summary.new_threads,
          drafted: summary.drafted,
          error: errors.length ? errors.join('; ').slice(0, 2000) : null,
        })
        .eq('id', runId)
    }
    return summary
  }
  if (!key) {
    errors.push('SERPER_API_KEY missing')
    return finish()
  }

  // 1. Search.
  const { data: kw } = await db.from('reddit_keywords').select('query, theme').eq('active', true)
  const keywords = (kw ?? []) as Keyword[]
  const found = new Map<string, Found>()
  for (let i = 0; i < keywords.length; i += SEARCH_PARALLEL) {
    const chunk = keywords.slice(i, i + SEARCH_PARALLEL)
    const results = await Promise.allSettled(chunk.map((k) => searchReddit(k.query, key)))
    results.forEach((res, j) => {
      const k = chunk[j]!
      summary.queries++
      if (res.status === 'rejected') {
        errors.push(`search "${k.query}": ${res.reason instanceof Error ? res.reason.message : 'failed'}`)
        return
      }
      for (const r of res.value) {
        const t = parseThreadUrl(r.link)
        if (!t || found.has(t.url)) continue
        found.set(t.url, { url: t.url, subreddit: t.subreddit, title: cleanTitle(r.title), snippet: r.snippet, query: k.query, theme: k.theme })
      }
    })
  }
  summary.found = found.size
  if (!found.size) return finish()

  // 2. Drop seen threads and blocked subreddits.
  const urls = [...found.keys()]
  const seen = new Set<string>()
  for (let i = 0; i < urls.length; i += 200) {
    const { data } = await db.from('reddit_leads').select('url').in('url', urls.slice(i, i + 200))
    for (const r of data ?? []) seen.add(r.url)
  }
  const { data: subRows } = await db.from('reddit_subreddits').select('name, links_allowed, blocked')
  const subs = new Map<string, { links_allowed: 'yes' | 'no' | 'unknown'; blocked: boolean }>(
    (subRows ?? []).map((s: any) => [s.name, { links_allowed: s.links_allowed, blocked: s.blocked }]),
  )
  const fresh = [...found.values()].filter((f) => !seen.has(f.url))
  summary.new_threads = fresh.length
  if (!fresh.length) return finish()

  // Record every new thread first, so nothing is looked at twice.
  const rows = fresh.map((f) => ({
    url: f.url,
    subreddit: f.subreddit,
    title: f.title.slice(0, 500),
    snippet: f.snippet.slice(0, 1000),
    query: f.query,
    theme: f.theme,
    found_day: day,
    status: subs.get(f.subreddit)?.blocked ? 'filtered' : 'new',
    filter_reason: subs.get(f.subreddit)?.blocked ? 'blocked subreddit' : null,
  }))
  const { data: inserted, error: insErr } = await db
    .from('reddit_leads')
    .upsert(rows, { onConflict: 'url', ignoreDuplicates: true })
    .select('id, url, subreddit, title, snippet, query, theme, status')
  if (insErr) {
    errors.push(`save threads: ${insErr.message}`)
    return finish()
  }
  const open = (inserted ?? []).filter((r: any) => r.status === 'new')
  const overflow = open.slice(MAX_TO_SCORE).map((r: any) => r.id)
  if (overflow.length) {
    await db.from('reddit_leads').update({ status: 'filtered', filter_reason: 'over the run limit' }).in('id', overflow)
  }
  const leads: Lead[] = open
    .slice(0, MAX_TO_SCORE)
    .map((r: any) => ({ ...r, snippet: r.snippet ?? '', score: null, score_reason: null }))

  // 3. Score.
  await scoreLeads(leads, errors)
  for (const l of leads) {
    if (l.score !== null) await db.from('reddit_leads').update({ score: l.score, score_reason: l.score_reason }).eq('id', l.id)
  }

  // 4. Pick and draft, inside today's caps.
  const { count: draftedToday } = await db
    .from('reddit_leads')
    .select('id', { count: 'exact', head: true })
    .eq('found_day', day)
    .in('status', ['drafted', 'posted', 'skipped'])
  const { data: postedTodayRows } = await db.from('reddit_leads').select('subreddit').gte('posted_at', dayStart)
  const subsPostedToday = new Set<string>((postedTodayRows ?? []).map((r: any) => r.subreddit))
  const room = Math.max(0, MAX_DRAFTS_PER_DAY - (draftedToday ?? 0))
  const { picked, dropped } = pickDrafts(leads, room, subsPostedToday)

  const { count: postedTotal } = await db.from('reddit_leads').select('id', { count: 'exact', head: true }).eq('status', 'posted')
  const { count: postedWithMention } = await db
    .from('reddit_leads')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'posted')
    .eq('mentions_shutap', true)
  const { count: mentionsToday } = await db
    .from('reddit_leads')
    .select('id', { count: 'exact', head: true })
    .eq('found_day', day)
    .eq('mentions_shutap', true)
  let mentionsDraftedToday = mentionsToday ?? 0
  const { data: earlierRows } = await db
    .from('reddit_leads')
    .select('draft, posted_body')
    .not('draft', 'is', null)
    .order('found_at', { ascending: false })
    .limit(100)
  const earlier: string[] = (earlierRows ?? []).map((r: any) => r.posted_body || r.draft).filter(Boolean)

  for (const lead of picked) {
    const rule = mayMention({
      day,
      linksAllowed: subs.get(lead.subreddit)?.links_allowed ?? 'unknown',
      postedTotal: postedTotal ?? 0,
      postedWithMention: postedWithMention ?? 0,
      mentionsAlreadyDraftedToday: mentionsDraftedToday,
    })
    const link = shutapLink(lead.theme, lead.subreddit)
    let out = await draftReply(lead, { ok: rule.ok, link })
    if (!out.error && out.text && out.text !== 'SKIP' && isRepeat(out.text, earlier)) {
      out = await draftReply(lead, { ok: rule.ok, link }) // one fresh try
      if (!out.error && isRepeat(out.text, earlier)) out = { text: '', error: 'too close to an earlier reply' }
    }
    if (out.error || !out.text || out.text === 'SKIP') {
      await db
        .from('reddit_leads')
        .update({ status: 'filtered', filter_reason: out.error ? `draft: ${out.error}` : 'not enough to go on' })
        .eq('id', lead.id)
      if (out.error) errors.push(`draft r/${lead.subreddit}: ${out.error}`)
      continue
    }
    // A mention the rules did not allow must never reach Candy, whatever the model wrote.
    const mentions = /shutap/i.test(out.text)
    if (mentions && !rule.ok) {
      await db.from('reddit_leads').update({ status: 'filtered', filter_reason: 'draft mentioned Shutap where not allowed' }).eq('id', lead.id)
      continue
    }
    await db
      .from('reddit_leads')
      .update({ status: 'drafted', draft: out.text, mentions_shutap: mentions, link_url: mentions ? link : null })
      .eq('id', lead.id)
    earlier.push(out.text)
    if (mentions) mentionsDraftedToday++
    summary.drafted++
    summary.drafts.push({ subreddit: lead.subreddit, title: lead.title, score: lead.score, mentions_shutap: mentions })
  }

  for (const d of dropped) {
    await db.from('reddit_leads').update({ status: 'filtered', filter_reason: d.reason }).eq('id', d.lead.id)
  }
  return finish()
}
