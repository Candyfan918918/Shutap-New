// Rooms feed: posts, likes, saves, follows, comments, reports, activity.
// Every read and write runs on the service role, so author ids never leave
// the server; the client only ever sees aliases and slugs. Identity is
// optional on reads (guests can browse) and required on writes.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { resolveJokeIdentity } from './jokes/session.server'
import { runScrub } from './agents/scrubber.functions'
import { runClassifyCrisis } from './agents/guard.functions'
import {
  TOPICS,
  aliasSlug,
  type FeedComment,
  type FeedPost,
  type Topic,
} from './feed-shared'

const PAGE = 20
const HIDE_AT_REPORTS = 3

async function admin(): Promise<any> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}

async function me(): Promise<string | null> {
  const id = await resolveJokeIdentity(null)
  return id.userId
}

async function mustMe(): Promise<string> {
  const uid = await me()
  if (!uid) throw new Error('sign_in_required')
  return uid
}

/** The joke is the post's title; the situation is the body without the
 *  composed card line at the end. */
function splitBody(title: string, body: string): { joke: string; situation: string } {
  const situation = String(body ?? '')
    .replace(/\n*🃏[^\n]*$/u, '')
    .trim()
  return { joke: String(title ?? ''), situation: situation === title ? '' : situation }
}

type RoomRow = {
  id: string
  author_id: string
  alias: string
  emoji: string
  title: string
  body: string
  topic: Topic | null
  created_at: string
}

async function hydrate(db: any, rows: RoomRow[], uid: string | null): Promise<FeedPost[]> {
  if (!rows.length) return []
  const ids = rows.map((r) => r.id)
  const authors = Array.from(new Set(rows.map((r) => r.author_id)))
  const [likes, comments, myLikes, mySaves, myFollows] = await Promise.all([
    db.from('room_relates').select('room_id').in('room_id', ids),
    db.from('comments').select('room_id').in('room_id', ids).is('deleted_at', null),
    uid ? db.from('room_relates').select('room_id').in('room_id', ids).eq('user_id', uid) : { data: [] },
    uid ? db.from('room_saves').select('room_id').in('room_id', ids).eq('user_id', uid) : { data: [] },
    uid ? db.from('follows').select('followee_id').eq('follower_id', uid).in('followee_id', authors) : { data: [] },
  ])
  const count = (list: any[] | null) => {
    const m = new Map<string, number>()
    for (const r of list ?? []) m.set(r.room_id, (m.get(r.room_id) ?? 0) + 1)
    return m
  }
  const likeN = count(likes.data)
  const commentN = count(comments.data)
  const liked = new Set((myLikes.data ?? []).map((r: any) => r.room_id))
  const saved = new Set((mySaves.data ?? []).map((r: any) => r.room_id))
  const following = new Set((myFollows.data ?? []).map((r: any) => r.followee_id))
  return rows.map((r) => {
    const { joke, situation } = splitBody(r.title, r.body)
    return {
      id: r.id,
      alias: r.alias,
      emoji: r.emoji,
      slug: aliasSlug(r.alias),
      topic: r.topic,
      joke,
      slot: null,
      situation,
      created_at: r.created_at,
      likes: likeN.get(r.id) ?? 0,
      comments: commentN.get(r.id) ?? 0,
      liked: liked.has(r.id),
      saved: saved.has(r.id),
      mine: !!uid && r.author_id === uid,
      following: following.has(r.author_id),
    }
  })
}

const POST_COLS = 'id, author_id, alias, emoji, title, body, topic, created_at'

function baseQuery(db: any) {
  return db
    .from('rooms')
    .select(POST_COLS)
    .eq('source', 'joke')
    .eq('hidden', false)
    .order('created_at', { ascending: false })
    .limit(PAGE)
}

async function notify(db: any, userId: string, actorId: string, kind: 'follow' | 'like' | 'comment', roomId: string | null) {
  if (userId === actorId) return
  try {
    await db.from('notifications').insert({ user_id: userId, actor_id: actorId, kind, room_id: roomId })
  } catch {
    /* activity is best-effort */
  }
}

// ───────────── feed ─────────────

export const listFeed = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) =>
    z
      .object({
        tab: z.enum(['new', 'following', 'saved']).default('new'),
        topic: z.enum(TOPICS).nullable().optional(),
        before: z.string().max(40).nullable().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const db = await admin()
    const uid = await me()
    let q = baseQuery(db)
    if (data.topic) q = q.eq('topic', data.topic)
    if (data.before) q = q.lt('created_at', data.before)
    if (data.tab === 'following') {
      if (!uid) return { posts: [] as FeedPost[], signedIn: false }
      const { data: f } = await db.from('follows').select('followee_id').eq('follower_id', uid)
      const ids = (f ?? []).map((r: any) => r.followee_id)
      if (!ids.length) return { posts: [] as FeedPost[], signedIn: true }
      q = q.in('author_id', ids)
    }
    if (data.tab === 'saved') {
      if (!uid) return { posts: [] as FeedPost[], signedIn: false }
      const { data: s } = await db.from('room_saves').select('room_id').eq('user_id', uid)
      const ids = (s ?? []).map((r: any) => r.room_id)
      if (!ids.length) return { posts: [] as FeedPost[], signedIn: true }
      q = q.in('id', ids)
    }
    const { data: rows } = await q
    return { posts: await hydrate(db, (rows ?? []) as RoomRow[], uid), signedIn: !!uid }
  })

export const getPost = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin()
    const uid = await me()
    const { data: row } = await db
      .from('rooms')
      .select(POST_COLS + ', source, hidden')
      .eq('id', data.id)
      .maybeSingle()
    if (!row || row.hidden || row.source !== 'joke') return { post: null, comments: [] as FeedComment[], signedIn: !!uid }
    const [post] = await hydrate(db, [row as RoomRow], uid)
    const { data: cs } = await db
      .from('comments')
      .select('id, alias_id, clean_text, created_at, is_companion')
      .eq('room_id', data.id)
      .is('deleted_at', null)
      .eq('is_companion', false)
      .order('created_at', { ascending: true })
      .limit(200)
    const authorIds = Array.from(new Set((cs ?? []).map((c: any) => c.alias_id)))
    const { data: al } = authorIds.length
      ? await db.from('aliases').select('user_id, display_name, emoji').in('user_id', authorIds)
      : { data: [] }
    const amap = new Map<string, { display_name: string; emoji: string }>(
      (al ?? []).map((a: any) => [a.user_id, a]),
    )
    const comments: FeedComment[] = (cs ?? []).map((c: any) => {
      const a = amap.get(c.alias_id)
      const name = a?.display_name ?? 'someone'
      return {
        id: c.id,
        alias: name,
        emoji: a?.emoji ?? '🙂',
        slug: aliasSlug(name),
        text: c.clean_text,
        created_at: c.created_at,
        mine: !!uid && c.alias_id === uid,
      }
    })
    return { post, comments, signedIn: !!uid }
  })

// ───────────── reactions ─────────────

const RoomId = z.object({ room_id: z.string().uuid() })

async function roomAuthor(db: any, roomId: string): Promise<string | null> {
  const { data } = await db.from('rooms').select('author_id').eq('id', roomId).maybeSingle()
  return (data?.author_id as string) ?? null
}

export const toggleLike = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => RoomId.parse(d))
  .handler(async ({ data }) => {
    const uid = await mustMe()
    const db = await admin()
    const { data: had } = await db
      .from('room_relates')
      .select('room_id')
      .eq('room_id', data.room_id)
      .eq('user_id', uid)
      .maybeSingle()
    if (had) {
      await db.from('room_relates').delete().eq('room_id', data.room_id).eq('user_id', uid)
    } else {
      await db.from('room_relates').insert({ room_id: data.room_id, user_id: uid })
      const author = await roomAuthor(db, data.room_id)
      if (author) await notify(db, author, uid, 'like', data.room_id)
    }
    const { count } = await db
      .from('room_relates')
      .select('room_id', { count: 'exact', head: true })
      .eq('room_id', data.room_id)
    return { liked: !had, likes: count ?? 0 }
  })

export const toggleSave = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => RoomId.parse(d))
  .handler(async ({ data }) => {
    const uid = await mustMe()
    const db = await admin()
    const { data: had } = await db
      .from('room_saves')
      .select('room_id')
      .eq('room_id', data.room_id)
      .eq('user_id', uid)
      .maybeSingle()
    if (had) await db.from('room_saves').delete().eq('room_id', data.room_id).eq('user_id', uid)
    else await db.from('room_saves').insert({ room_id: data.room_id, user_id: uid })
    return { saved: !had }
  })

// ───────────── comments ─────────────

export const addComment = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ room_id: z.string().uuid(), text: z.string().min(1).max(1000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const uid = await mustMe()
    const db = await admin()
    const s = await runScrub(data.text)
    const clean = (s.clean_text || '').trim()
    if (!clean) throw new Error('empty')
    const guard = await runClassifyCrisis(clean)
    if (guard.crisis) return { ok: false as const, crisis: true }
    const { data: row, error } = await db
      .from('comments')
      .insert({ room_id: data.room_id, alias_id: uid, clean_text: clean, is_companion: false })
      .select('id, clean_text, created_at')
      .single()
    if (error) throw new Error(error.message)
    const author = await roomAuthor(db, data.room_id)
    if (author) await notify(db, author, uid, 'comment', data.room_id)
    const { data: a } = await db.from('aliases').select('display_name, emoji').eq('user_id', uid).maybeSingle()
    const name = (a?.display_name as string) ?? 'you'
    const comment: FeedComment = {
      id: row.id,
      alias: name,
      emoji: (a?.emoji as string) ?? '🙂',
      slug: aliasSlug(name),
      text: row.clean_text,
      created_at: row.created_at,
      mine: true,
    }
    return { ok: true as const, crisis: false, comment, scrubbed: clean !== data.text.trim() }
  })

export const deleteComment = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const uid = await mustMe()
    const db = await admin()
    await db
      .from('comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', data.id)
      .eq('alias_id', uid)
    return { ok: true }
  })

export const deletePost = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => RoomId.parse(d))
  .handler(async ({ data }) => {
    const uid = await mustMe()
    const db = await admin()
    await db.from('rooms').update({ hidden: true }).eq('id', data.room_id).eq('author_id', uid)
    await db.from('joke_cards').update({ room_id: null }).eq('room_id', data.room_id).eq('user_id', uid)
    return { ok: true }
  })

// ───────────── reports ─────────────

export const reportPost = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z
      .object({
        room_id: z.string().uuid(),
        comment_id: z.string().uuid().nullable().optional(),
        reason: z.enum(['targets_a_person', 'real_name', 'hateful', 'spam', 'other']),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const uid = await me()
    const db = await admin()
    await db.from('post_reports').insert({
      room_id: data.room_id,
      comment_id: data.comment_id ?? null,
      reporter_id: uid,
      reason: data.reason,
    })
    // Enough separate people reporting a post takes it down until reviewed.
    if (!data.comment_id) {
      const { data: rs } = await db
        .from('post_reports')
        .select('reporter_id')
        .eq('room_id', data.room_id)
        .is('comment_id', null)
        .is('resolved_at', null)
      const people = new Set((rs ?? []).map((r: any) => r.reporter_id ?? Math.random()))
      if (people.size >= HIDE_AT_REPORTS) await db.from('rooms').update({ hidden: true }).eq('id', data.room_id)
    }
    return { ok: true }
  })

// ───────────── profiles & follows ─────────────

async function aliasBySlug(db: any, slug: string) {
  const name = slug.replace(/-/g, ' ')
  const { data } = await db
    .from('aliases')
    .select('user_id, display_name, emoji, created_at')
    .ilike('display_name', name)
    .limit(1)
  return (data?.[0] as { user_id: string; display_name: string; emoji: string; created_at: string } | undefined) ?? null
}

export const getProfile = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin()
    const uid = await me()
    const a = await aliasBySlug(db, data.slug)
    if (!a) return { profile: null }
    const [followers, followingN, amFollowing, rows] = await Promise.all([
      db.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followee_id', a.user_id),
      db.from('follows').select('followee_id', { count: 'exact', head: true }).eq('follower_id', a.user_id),
      uid
        ? db.from('follows').select('followee_id').eq('follower_id', uid).eq('followee_id', a.user_id).maybeSingle()
        : { data: null },
      baseQuery(db).eq('author_id', a.user_id).limit(50),
    ])
    const posts = await hydrate(db, (rows.data ?? []) as RoomRow[], uid)
    return {
      profile: {
        alias: a.display_name,
        emoji: a.emoji,
        slug: aliasSlug(a.display_name),
        joined: a.created_at,
        followers: followers.count ?? 0,
        following: followingN.count ?? 0,
        likes: posts.reduce((n, p) => n + p.likes, 0),
        isMe: !!uid && uid === a.user_id,
        amFollowing: !!amFollowing.data,
        signedIn: !!uid,
      },
      posts,
    }
  })

export const toggleFollow = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data }) => {
    const uid = await mustMe()
    const db = await admin()
    const a = await aliasBySlug(db, data.slug)
    if (!a) throw new Error('not_found')
    if (a.user_id === uid) throw new Error('self')
    const { data: had } = await db
      .from('follows')
      .select('followee_id')
      .eq('follower_id', uid)
      .eq('followee_id', a.user_id)
      .maybeSingle()
    if (had) await db.from('follows').delete().eq('follower_id', uid).eq('followee_id', a.user_id)
    else {
      await db.from('follows').insert({ follower_id: uid, followee_id: a.user_id })
      await notify(db, a.user_id, uid, 'follow', null)
    }
    const { count } = await db
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('followee_id', a.user_id)
    return { following: !had, followers: count ?? 0 }
  })

export const myAlias = createServerFn({ method: 'GET' }).handler(async () => {
  const uid = await me()
  if (!uid) return { alias: null as null | { alias: string; slug: string; emoji: string }, unread: 0 }
  const db = await admin()
  const [{ data: a }, { count }] = await Promise.all([
    db.from('aliases').select('display_name, emoji').eq('user_id', uid).maybeSingle(),
    db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).is('read_at', null),
  ])
  return {
    alias: a ? { alias: a.display_name as string, slug: aliasSlug(a.display_name), emoji: a.emoji as string } : null,
    unread: count ?? 0,
  }
})

// ───────────── activity ─────────────

export type ActivityItem = {
  id: string
  kind: 'follow' | 'like' | 'comment'
  alias: string
  slug: string
  emoji: string
  room_id: string | null
  joke: string | null
  created_at: string
  unread: boolean
}

export const listActivity = createServerFn({ method: 'GET' }).handler(async () => {
  const uid = await me()
  if (!uid) return { items: [] as ActivityItem[], signedIn: false }
  const db = await admin()
  const { data: rows } = await db
    .from('notifications')
    .select('id, actor_id, kind, room_id, created_at, read_at')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(60)
  const list = (rows ?? []) as any[]
  const actorIds = Array.from(new Set(list.map((r) => r.actor_id).filter(Boolean)))
  const roomIds = Array.from(new Set(list.map((r) => r.room_id).filter(Boolean)))
  const [{ data: al }, { data: rs }] = await Promise.all([
    actorIds.length ? db.from('aliases').select('user_id, display_name, emoji').in('user_id', actorIds) : { data: [] },
    roomIds.length ? db.from('rooms').select('id, title').in('id', roomIds) : { data: [] },
  ])
  const amap = new Map<string, any>((al ?? []).map((a: any) => [a.user_id, a]))
  const rmap = new Map<string, string>((rs ?? []).map((r: any) => [r.id, r.title]))
  const items: ActivityItem[] = list.map((r) => {
    const a = amap.get(r.actor_id)
    const name = a?.display_name ?? 'someone'
    return {
      id: r.id,
      kind: r.kind,
      alias: name,
      slug: aliasSlug(name),
      emoji: a?.emoji ?? '🙂',
      room_id: r.room_id,
      joke: r.room_id ? (rmap.get(r.room_id) ?? null) : null,
      created_at: r.created_at,
      unread: !r.read_at,
    }
  })
  await db.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', uid).is('read_at', null)
  return { items, signedIn: true }
})
