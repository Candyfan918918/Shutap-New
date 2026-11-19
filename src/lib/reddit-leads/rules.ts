// Reddit leads: the pure rules (no I/O), so they can be tested on their own.
//
// The job never posts. These rules decide which threads become drafts and
// whether a draft may mention Shutap, so that what Candy posts by hand stays
// well inside what Reddit and each subreddit allow.

/** Most drafts in one day. */
export const MAX_DRAFTS_PER_DAY = 10
/** Lowest score (1-10) that becomes a draft. */
export const MIN_SCORE = 6
/** No Shutap mentions before this Pacific day: two weeks of plain helpful replies
 *  first, while the account builds history. */
export const MENTIONS_FROM_DAY = '2026-12-02'
/** At most one posted reply in this many may mention Shutap. */
export const MENTION_ONE_IN = 10
/** Two replies sharing more than this share of word trigrams count as repeats. */
export const REPEAT_LIMIT = 0.3

export type Theme = 'humor' | 'toast' | string

/** A Reddit thread URL reduced to its canonical form, or null when the link is
 *  not a thread (a subreddit page, a user page, a wiki, a search). */
export function parseThreadUrl(link: string): { url: string; subreddit: string; id: string } | null {
  let u: URL
  try {
    u = new URL(link)
  } catch {
    return null
  }
  if (!/(^|\.)reddit\.com$/i.test(u.hostname)) return null
  const m = u.pathname.match(/^\/r\/([A-Za-z0-9_]{2,21})\/comments\/([a-z0-9]{3,12})(?:\/|$)/i)
  if (!m) return null
  const subreddit = m[1]!.toLowerCase()
  const id = m[2]!.toLowerCase()
  return { url: `https://www.reddit.com/r/${subreddit}/comments/${id}/`, subreddit, id }
}

/** The one Shutap link a draft may carry: full shutap.com (never a shortener,
 *  which Reddit treats as spam), tagged so PostHog shows which subreddit sent
 *  the visit. */
export function shutapLink(theme: Theme, subreddit: string): string {
  const path = theme === 'toast' ? '/toasts' : '/bits'
  const q = new URLSearchParams({
    utm_source: 'reddit',
    utm_medium: 'comment',
    utm_campaign: theme === 'toast' ? 'toast' : 'humor',
    utm_content: subreddit.toLowerCase(),
  })
  return `https://shutap.com${path}?${q.toString()}`
}

export type MentionInputs = {
  day: string // Pacific 'YYYY-MM-DD'
  linksAllowed: 'yes' | 'no' | 'unknown'
  postedTotal: number // replies Candy has marked posted, all time
  postedWithMention: number // of those, how many mentioned Shutap
  mentionsAlreadyDraftedToday: number
}

/** Whether a draft may mention Shutap. All four must hold: the warm-up is over,
 *  the subreddit has been marked as allowing links, the mention would keep
 *  mentions at or under 1 in MENTION_ONE_IN posted replies, and no other draft
 *  today already mentions it. */
export function mayMention(x: MentionInputs): { ok: boolean; reason: string } {
  if (x.day < MENTIONS_FROM_DAY) return { ok: false, reason: `warm-up until ${MENTIONS_FROM_DAY}` }
  if (x.linksAllowed !== 'yes') return { ok: false, reason: `subreddit links: ${x.linksAllowed}` }
  if (x.mentionsAlreadyDraftedToday > 0) return { ok: false, reason: 'one mention a day' }
  if ((x.postedWithMention + 1) * MENTION_ONE_IN > x.postedTotal + 1) {
    return { ok: false, reason: `mentions would pass 1 in ${MENTION_ONE_IN}` }
  }
  return { ok: true, reason: 'allowed' }
}

export type Candidate = { id: string; subreddit: string; score: number | null }

/** Today's drafts: score at or above MIN_SCORE, best first, one per subreddit,
 *  none in a subreddit Candy already replied in today, at most `room`. */
export function pickDrafts<T extends Candidate>(
  scored: T[],
  room: number,
  subsPostedToday: Set<string>,
): { picked: T[]; dropped: Array<{ lead: T; reason: string }> } {
  const picked: T[] = []
  const dropped: Array<{ lead: T; reason: string }> = []
  const usedSubs = new Set<string>()
  const sorted = [...scored].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  for (const lead of sorted) {
    const sub = lead.subreddit.toLowerCase()
    if ((lead.score ?? 0) < MIN_SCORE) dropped.push({ lead, reason: `score ${lead.score ?? '-'}` })
    else if (subsPostedToday.has(sub)) dropped.push({ lead, reason: 'already replied in this subreddit today' })
    else if (usedSubs.has(sub)) dropped.push({ lead, reason: 'one draft per subreddit a day' })
    else if (picked.length >= room) dropped.push({ lead, reason: 'daily draft cap' })
    else {
      picked.push(lead)
      usedSubs.add(sub)
    }
  }
  return { picked, dropped }
}

function trigrams(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const out = new Set<string>()
  for (let i = 0; i + 2 < words.length; i++) out.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`)
  return out
}

/** Share of word trigrams two texts have in common (Jaccard), 0..1. */
export function overlap(a: string, b: string): number {
  const x = trigrams(a)
  const y = trigrams(b)
  if (x.size === 0 || y.size === 0) return 0
  let shared = 0
  for (const t of x) if (y.has(t)) shared++
  return shared / (x.size + y.size - shared)
}

/** A finished reply ends on sentence punctuation, a closing quote or bracket,
 *  or the Shutap link, and is not too short to be a real answer. A reply that
 *  ends mid-word was cut off and must never reach Candy. */
export function looksComplete(text: string): boolean {
  const t = text.trim()
  if (t.length < 60) return false
  if (/https?:\/\/\S+$/.test(t)) return true
  return /[.!?…)"'”’]$/.test(t)
}

/** True when the draft repeats any earlier reply too closely. Reddit's spam
 *  filters look for the same text posted in several places. */
export function isRepeat(draft: string, earlier: string[]): boolean {
  return earlier.some((e) => overlap(draft, e) > REPEAT_LIMIT)
}

/** Phrases and marks that made Nov 17-18 drafts read as AI. Any hit sends the
 *  draft back for another try; two misses and it is dropped. */
const AI_TELLS: Array<[RegExp, string]> = [
  [/[\u2014\u2013]/, 'dash'],
  [/;/, 'semicolon'],
  [/\blean(ing)? (right |all the way )?into\b/i, 'lean into'],
  [/\b(craft|pro) tip\b/i, 'tip label'],
  [/\bhere are (a few|some)\b/i, 'here are a few'],
  [/\bthe (key|secret) (is|to)\b/i, 'the key is'],
  [/\b(dissonance|game[- ]changer|instant(ly)?)\b/i, 'stock word'],
  [/\bplay with\b/i, 'play with'],
  [/^\s*[-*\u2022]\s/m, 'bullet'],
  [/^\s*[a-z ]{2,30}:\s*$/im, 'label line'],
]

export function aiTells(text: string): string[] {
  const hits = AI_TELLS.filter(([re]) => re.test(text)).map(([, name]) => name)
  const words = text.trim().split(/\s+/).length
  if (words > 110) hits.push('too long')
  const quoted = (text.match(/^\s*"/gm) ?? []).length
  if (quoted > 2) hits.push('list of quoted lines')
  return hits
}
