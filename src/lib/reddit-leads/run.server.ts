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
  aiTells,
  usablePreview,
  isRepeat,
  looksComplete,
  mayMention,
  parseThreadUrl,
  pickDrafts,
  shutapLink,
} from './rules'

const SERPER_URL = 'https://google.serper.dev/search'
const SCORE_BATCH = 15
const MAX_TO_SCORE = 200 // keeps one run's AI calls bounded; the rest waits for the next run
const BACKLOG_DAYS = 5
const SWEEP_HOURS = 36 // how far back the subreddit sweep looks
const RUN_GAP_HOURS = 4 // two scheduled runs a day, 6 hours apart // unscored threads older than this are dropped
const SEARCH_PARALLEL = 5

type Keyword = { query: string; theme: string }
type Found = { url: string; subreddit: string; title: string; snippet: string; query: string; theme: string }
type Lead = Found & { id: string; score: number | null; score_reason: string | null; body?: string }

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
  if (!r.ok) {
    const why = (await r.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 120)
    throw new Error(`serper ${r.status}${why ? `: ${why}` : ''}`)
  }
  const j = (await r.json()) as { organic?: Array<{ link?: string; title?: string; snippet?: string }> }
  return (j.organic ?? [])
    .filter((o) => o.link)
    .map((o) => ({ link: o.link!, title: (o.title ?? '').trim(), snippet: (o.snippet ?? '').trim() }))
}

type Post = { title: string; body: string; closed: boolean }

/** The real post, so the reply answers what they actually asked. Reddit's own
 *  JSON. Null when Reddit refuses this server (it does as of Nov 19; Serper's
 *  page reader returned 500 for every Reddit page, so it was dropped). */
async function readPost(url: string, key: string, errors: string[]): Promise<Post | null> {
  try {
    const r = await fetch(`${url}.json?raw_json=1&limit=1`, {
      headers: { 'User-Agent': 'web:shutap-leads:1.0 (by /u/FunnyCandy)', Accept: 'application/json' },
    })
    if (r.ok) {
      const j = (await r.json()) as any
      const d = j?.[0]?.data?.children?.[0]?.data
      if (d && typeof d.title === 'string') {
        return {
          title: d.title,
          body: String(d.selftext ?? '').slice(0, 4000),
          closed: Boolean(d.locked || d.archived || d.removed_by_category),
        }
      }
    }
  } catch {
    /* fall through to the page reader */
  }
  return null
}

type Fresh = { link: string; title: string; snippet: string }

/** The newest posts in one subreddit, last SWEEP_HOURS only. Reddit's own JSON
 *  first (full text, minutes old); if Reddit refuses this server, Google's
 *  past-day results for that subreddit (Nov 19: keyword searches kept finding
 *  week-old threads, and few new posts asking for help). */
async function sweepSubreddit(sub: string, key: string): Promise<{ posts: Fresh[]; via: 'reddit' | 'google' }> {
  try {
    const r = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=50&raw_json=1`, {
      headers: { 'User-Agent': 'web:shutap-leads:1.0 (by /u/FunnyCandy)', Accept: 'application/json' },
    })
    if (r.ok) {
      const j = (await r.json()) as any
      const cutoff = Date.now() / 1000 - SWEEP_HOURS * 3600
      const posts: Fresh[] = (j?.data?.children ?? [])
        .map((c: any) => c?.data)
        .filter((d: any) => d && d.created_utc >= cutoff && !d.stickied && !d.locked && !d.over_18)
        .map((d: any) => ({
          link: `https://www.reddit.com${d.permalink}`,
          title: String(d.title ?? ''),
          snippet: String(d.selftext ?? '').replace(/\s+/g, ' ').slice(0, 600),
        }))
      return { posts, via: 'reddit' }
    }
  } catch {
    /* fall back to Google */
  }
  const r = await fetch(SERPER_URL, {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: `site:reddit.com/r/${sub}`, tbs: 'qdr:d', num: 10, gl: 'us', hl: 'en' }),
  })
  if (!r.ok) throw new Error(`serper ${r.status}`)
  const j = (await r.json()) as { organic?: Array<{ link?: string; title?: string; snippet?: string }> }
  const posts = (j.organic ?? [])
    .filter((o) => o.link)
    .map((o) => ({ link: o.link!, title: (o.title ?? '').trim(), snippet: (o.snippet ?? '').trim() }))
  return { posts, via: 'google' }
}

// Google titles end in " : r/sub" or " - Reddit"; the draft only needs the post title.
function cleanTitle(t: string): string {
  return t.replace(/\s*[:|-]\s*r\/[A-Za-z0-9_]+\s*$/i, '').replace(/\s*-\s*Reddit\s*$/i, '').trim()
}

// Focus (Candy, Nov 18 2026): comedians and stand-up, content creators,
// social media managers, and writers who want their writing funnier.
const SCORE_SYSTEM = `You sort Reddit threads for a founder who writes comedy and replies by hand with genuinely useful jokes, lines and craft tips.
We reply only to these people, about their own work:
- comedians: stand-up (open mic to working comics), sketch and improv performers, comedy writers;
- content creators: TikTok, Reels, YouTube and Shorts creators who want their videos, hooks, skits or storytimes funnier or want content ideas;
- social media managers and marketers: people writing posts, captions, replies or campaigns for a brand or client who want them funnier, wittier or more engaging;
- writers: humor writers, copywriters, newsletter and blog writers who want a piece, a line or their voice funnier;
- small business and shop owners (Etsy, Shopify, TikTok Shop, local shops) asking how to get traffic or customers from social media, how to get more views on TikTok or Reels, or what content to post for their shop.
Score each thread 1-10 for how much that person needs help making their own work funnier, or (for small business owners) getting views and ideas for their shop's content, right now, judging only from the title and snippet.
10: they ask for feedback on their own joke, set, hook or caption ("is this funny?", "help me with a punchline", "rate my set", "how do I make this hook better") and the joke or line itself is in the title or snippet.
9: the same kind of feedback request, but their joke or line is not visible in the snippet; or they ask for help with a specific joke, line, hook, caption, post, script, bit, set or sketch; or a small business owner asks what to post for their shop, or why their shop's videos get no views.
7-8: one of these people asks a craft question (how to write jokes, make content or posts funnier, find ideas, write hooks, fix something that fell flat, find a funnier voice) where a reply with concrete lines or tips would clearly help.
7-8 also: a small business owner asks how to get traffic or customers from TikTok, Instagram or social media in general.
5-6: one of these people asks something related (content ideas, engagement, writer's block, marketing a shop on a small budget) where a funny, concrete reply would still be welcome.
3-4: loosely related; a reply would feel forced.
1-2: not one of these people (paid ads, SEO, Google rankings, pricing, shipping, taxes, legal or hiring questions from business owners; wedding toasts, personal speeches, "how do I be funny at parties" or social-skills posts), news, memes, finished jokes posted for laughs, someone promoting their own thing, hiring posts, a closed or old discussion, an argument about AI, or anything touching grief, death, illness, self-harm, abuse, minors or a crisis. Anything touching those last topics is always 1.
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
    : `Do not mention Shutap, any website, app, tool or link.`
  return `You write one Reddit comment that Candy, a founder who writes comedy, will post by hand. She is replying to a comedian, content creator, social media manager, writer or small business owner.
For a small business owner asking about traffic, views or what to post: give one or two concrete video or post ideas for their exact shop and product (a specific hook for the first two seconds, a funny angle on their product or their day running the shop), and at most one practical tip on why their posts get no views. No marketing jargon, no "post consistently" filler.
You get the full post. Read it and work out the one thing they are actually asking. Your first sentence answers that, directly. If they asked for names, give names; if they asked "is this funny", say honestly whether it is and why; if they asked for ideas, give ideas for their exact situation. Don't answer a different question.
If they shared a joke, hook or caption, punch up their own line: quote it once, give one better version, and say in a few plain words what you changed. Keep their premise and their voice.
Sound like a real person typing a quick comment, not an assistant:
- 25 to 80 words. Usually two to four short sentences. Normal capitalization.
- One specific idea or line beats a list. At most two example lines, and only if they asked for jokes or lines.
- No headings, no labels like "craft tip:" or "pro tip:", no bullet lists, no em dashes, no semicolons, no emojis, no hashtags, no greeting, no sign-off.
- Never use these phrases: "lean into", "here are a few", "the key is", "the secret is", "instant", "dissonance", "play with", "honestly", "game changer".
- Have an opinion. It's fine to be blunt or to admit something didn't land.
Never invent facts about them. Never punch down: nothing about race, religion, nationality, accent, disability, weight or sexuality. Never offer to write the whole thing, never ask them to DM you.
${ending}
Reply with exactly SKIP only if you can't add anything genuinely useful. A small business owner asking how to get traffic, sales, views or content ideas from social media is always worth a reply: give them a concrete video or post idea for their shop, even if their post never mentions humor.`
}

async function draftOnce(lead: Lead, mention: { ok: boolean; link: string }): Promise<{ text: string; error?: string }> {
  const res = await callAgent({
    system: draftSystem(mention),
    messages: [
      {
        role: 'user',
        content: `Subreddit: r/${lead.subreddit}\nTitle: ${lead.title}\n${lead.body && lead.body === lead.snippet ? 'Preview of the post (may be cut off; answer the question in the title, and only use details shown here)' : 'Post'}:\n${lead.body || '(no text, title only)'}\n\nWrite the comment.`,
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
    if (out.error || !out.text || out.text === 'SKIP') return out
    if (looksComplete(out.text) && aiTells(out.text).length === 0) return out
  }
  return { text: '', error: 'draft came back cut off or sounding like AI twice' }
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

  // Twice a day (Candy, Nov 18): ~7am and ~1pm Pacific. The URL is public, so
  // a run within the last RUN_GAP_HOURS returns at once; the daily draft cap
  // still holds across both runs.
  if (!opts.force) {
    const since = new Date(Date.now() - RUN_GAP_HOURS * 3_600_000).toISOString()
    const { data: ran } = await db.from('reddit_runs').select('id').gte('started_at', since).limit(1)
    if (ran && ran.length) return { ...summary, ok: true, skipped: `ran in the last ${RUN_GAP_HOURS} hours` }
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
  // 1b. The newest posts in every listed, unblocked subreddit.
  const { data: sweepRows } = await db.from('reddit_subreddits').select('name').eq('blocked', false)
  const sweepSubs: string[] = (sweepRows ?? []).map((r: any) => r.name)
  const via = { reddit: 0, google: 0 }
  for (let i = 0; i < sweepSubs.length; i += SEARCH_PARALLEL) {
    const chunk = sweepSubs.slice(i, i + SEARCH_PARALLEL)
    const results = await Promise.allSettled(chunk.map((sub) => sweepSubreddit(sub, key)))
    results.forEach((res, j) => {
      const sub = chunk[j]!
      summary.queries++
      if (res.status === 'rejected') {
        errors.push(`sweep r/${sub}: ${res.reason instanceof Error ? res.reason.message : 'failed'}`)
        return
      }
      via[res.value.via]++
      for (const p of res.value.posts) {
        const t = parseThreadUrl(p.link)
        if (!t || found.has(t.url)) continue
        found.set(t.url, { url: t.url, subreddit: t.subreddit, title: cleanTitle(p.title), snippet: p.snippet, query: `sweep r/${sub}`, theme: 'humor' })
      }
    })
  }
  // Reddit refuses this server as of Nov 19, so the sweep reads Google's past-day
  // results; that is expected, not an error.
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
  let inserted: any[] = []
  if (rows.length) {
    const { data, error: insErr } = await db
      .from('reddit_leads')
      .upsert(rows, { onConflict: 'url', ignoreDuplicates: true })
      .select('id, url, subreddit, title, snippet, query, theme, status')
    if (insErr) {
      errors.push(`save threads: ${insErr.message}`)
      return finish()
    }
    inserted = data ?? []
  }
  // Threads an earlier run found but never scored (over the limit, or the
  // scorer skipped them) get their turn now instead of being thrown away.
  const backlogFrom = new Date(Date.now() - BACKLOG_DAYS * 86_400_000).toISOString()
  const { data: backlog } = await db
    .from('reddit_leads')
    .select('id, url, subreddit, title, snippet, query, theme, status')
    .eq('status', 'new')
    .is('score', null)
    .gte('found_at', backlogFrom)
    .order('found_at', { ascending: false })
    .limit(MAX_TO_SCORE)
  const insertedIds = new Set(inserted.map((r: any) => r.id))
  const open = [
    ...inserted.filter((r: any) => r.status === 'new'),
    ...(backlog ?? []).filter((r: any) => !insertedIds.has(r.id)),
  ]
  if (!open.length) return finish()
  await db
    .from('reddit_leads')
    .update({ status: 'filtered', filter_reason: 'never scored' })
    .eq('status', 'new')
    .is('score', null)
    .lt('found_at', backlogFrom)
  const leads: Lead[] = open
    .slice(0, MAX_TO_SCORE)
    .map((r: any) => ({ ...r, snippet: r.snippet ?? '', score: null, score_reason: null }))

  // 3. Score.
  await scoreLeads(leads, errors)
  const missed = leads.filter((l) => l.score === null)
  if (missed.length) await scoreLeads(missed, errors) // the scorer sometimes skips a few; one more pass
  // Still unscored: left as 'new', so the next run scores them instead of dropping them.
  const scored = leads.filter((l) => l.score !== null)
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
  // Only subreddits Candy has added on /admin/reddit (and not blocked) get drafts.
  const isTarget = (sub: string) => subs.has(sub) && !subs.get(sub)!.blocked
  const notTarget = scored.filter((l) => !isTarget(l.subreddit))
  const targets = scored.filter((l) => isTarget(l.subreddit))
  // Pick extra: some posts can't be read or turn out closed.
  const { picked, dropped } = pickDrafts(targets, room * 2, subsPostedToday)
  for (const l of notTarget) dropped.push({ lead: l, reason: 'not a target subreddit' })
  let draftedNow = 0

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
    if (draftedNow >= room) {
      dropped.push({ lead, reason: 'daily draft cap' })
      continue
    }
    const post = await readPost(lead.url, key, errors)
    let previewOnly = false
    if (post?.closed) {
      await db.from('reddit_leads').update({ status: 'filtered', filter_reason: 'thread closed' }).eq('id', lead.id)
      continue
    }
    if (post) {
      lead.title = post.title || lead.title
      lead.body = post.body
    } else if (usablePreview(lead.snippet)) {
      // Reddit refuses this server, so draft from Google's preview of the post,
      // and tell Candy to read the thread before posting.
      lead.body = lead.snippet
      previewOnly = true
    } else {
      await db.from('reddit_leads').update({ status: 'filtered', filter_reason: 'could not read the post' }).eq('id', lead.id)
      continue
    }
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
      .update({
        status: 'drafted',
        draft: out.text,
        mentions_shutap: mentions,
        link_url: mentions ? link : null,
        ...(previewOnly ? { score_reason: `${lead.score_reason ?? ''} · from Google's preview only: read the thread before posting`.replace(/^ · /, '') } : {}),
      })
      .eq('id', lead.id)
    earlier.push(out.text)
    draftedNow++
    if (mentions) mentionsDraftedToday++
    summary.drafted++
    summary.drafts.push({ subreddit: lead.subreddit, title: lead.title, score: lead.score, mentions_shutap: mentions })
  }

  for (const d of dropped) {
    await db.from('reddit_leads').update({ status: 'filtered', filter_reason: d.reason }).eq('id', d.lead.id)
  }
  return finish()
}
