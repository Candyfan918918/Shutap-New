// Event-triggered emails for rooms activity. Called right after the in-app
// notification row is written (src/lib/feed.functions.ts → notify()).
// Every send goes through sendEmail (hello@shutap.com, prefs + unsubscribe),
// is throttled so nobody gets a burst, and never throws into the user flow.
import { sendEmail } from './send.server'

const SITE = 'https://shutap.com'
const LIKE_MILESTONES = new Set([3, 10, 25, 50, 100, 250, 500, 1000])
const HOUR_MS = 60 * 60 * 1000

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s)

async function emailOf(db: any, userId: string): Promise<string | null> {
  const { data } = await db.auth.admin.getUserById(userId)
  return (data?.user?.email as string) ?? null
}

async function aliasOf(db: any, userId: string): Promise<string> {
  const { data } = await db.from('aliases').select('display_name').eq('user_id', userId).maybeSingle()
  return (data?.display_name as string) || 'someone'
}

async function roomTitle(db: any, roomId: string): Promise<string> {
  const { data } = await db.from('rooms').select('title').eq('id', roomId).maybeSingle()
  return (data?.title as string) || 'your post'
}

/** How many notifications of this kind matched, including the one just written. */
async function recentCount(db: any, filter: Record<string, string>, sinceMs?: number): Promise<number> {
  let q = db.from('notifications').select('id', { count: 'exact', head: true })
  for (const [k, v] of Object.entries(filter)) q = q.eq(k, v)
  if (sinceMs) q = q.gte('created_at', new Date(Date.now() - sinceMs).toISOString())
  const { count } = await q
  return count ?? 0
}

async function guarded(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn()
  } catch (e) {
    console.warn(`[email-events] ${label} failed`, e instanceof Error ? e.message : e)
  }
}

/** Someone commented on a post. At most one email per post per hour. */
export function emailOnComment(db: any, a: { authorId: string; actorId: string; roomId: string; text: string }) {
  return guarded('comment', async () => {
    if (a.authorId === a.actorId) return
    const n = await recentCount(db, { user_id: a.authorId, kind: 'comment', room_id: a.roomId }, HOUR_MS)
    if (n > 1) return
    const to = await emailOf(db, a.authorId)
    if (!to) return
    const [replier, title] = await Promise.all([aliasOf(db, a.actorId), roomTitle(db, a.roomId)])
    await sendEmail('hello', 'new_reply', {
      replier_alias: esc(replier),
      reply_snippet: esc(clip(a.text, 180)),
      room_title: esc(title),
      cta_url: `${SITE}/rooms/${encodeURIComponent(a.roomId)}`,
    }, to)
  })
}

/** A post crossed a like milestone. First-time likes only, so unlike/relike can't re-fire it. */
export function emailOnLike(db: any, a: { authorId: string; actorId: string; roomId: string; likes: number }) {
  return guarded('like', async () => {
    if (a.authorId === a.actorId || !LIKE_MILESTONES.has(a.likes)) return
    const repeat = await recentCount(db, { user_id: a.authorId, actor_id: a.actorId, kind: 'like', room_id: a.roomId })
    if (repeat > 1) return
    const to = await emailOf(db, a.authorId)
    if (!to) return
    const title = await roomTitle(db, a.roomId)
    await sendEmail('hello', 'milestone', {
      room_title: esc(title),
      resonance_count: String(a.likes),
      hall_name: 'the rooms',
      cta_url: `${SITE}/rooms/${encodeURIComponent(a.roomId)}`,
    }, to)
  })
}

/** New follower. Skips re-follows; at most one follower email per hour. */
export function emailOnFollow(db: any, a: { userId: string; actorId: string }) {
  return guarded('follow', async () => {
    if (a.userId === a.actorId) return
    const repeat = await recentCount(db, { user_id: a.userId, actor_id: a.actorId, kind: 'follow' })
    if (repeat > 1) return
    const burst = await recentCount(db, { user_id: a.userId, kind: 'follow' }, HOUR_MS)
    if (burst > 1) return
    const to = await emailOf(db, a.userId)
    if (!to) return
    const [follower, me] = await Promise.all([aliasOf(db, a.actorId), aliasOf(db, a.userId)])
    await sendEmail('hello', 'new_follower', {
      ...(me === 'someone' ? {} : { first_alias: esc(me.trim().split(/\s+/)[0].toLowerCase()) }),
      follower_alias: esc(follower),
      follower_plain: follower,
      cta_url: SITE,
    }, to)
  })
}
