// Joke battle server functions.
//
// Players (guests included) are a random ID kept in their browser. Rounds
// are created and timed on the server, so a pick can't claim to be slower
// than it was. Every round, pick, skip and flag is a row in battle_rounds;
// the admin report reads them. Players never get anyone else's picks back.
//
// The bank (battle_setups, battle_versions) is written in-house from the
// admin page: setups by the writer, four versions per setup, each with a
// different technique from the /guides pages. Never from a user's story.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { requireRealUser } from '@/lib/require-real-user'
import { pacificDay, shiftDay } from '@/lib/pacific-day'
import { BATTLE, CONTROL_LINES, RANKS, humorLabel, humorType, nextStreak, rankAvatarPath, rankFor, rankOfAvatar, rankUp, styleOf, wordCount, type RankKey } from '@/lib/battle'
import { SITE_URL } from '@/lib/site'

/* ── shared ── */

async function db(): Promise<any> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}

async function assertAdmin(ctx: unknown): Promise<void> {
  const c = ctx as { supabase: { rpc: (fn: 'has_role', args: { _user_id: string; _role: 'admin' }) => PromiseLike<{ data: unknown; error: unknown }> }; userId: string }
  const { data, error } = await c.supabase.rpc('has_role', { _user_id: c.userId, _role: 'admin' })
  if (error || !data) throw new Error('Forbidden')
}

const PlayerId = z.string().uuid()

export type BattlePlayer = {
  picks: number
  streak: number
  rank: { key: string; name: string } | null
  next: { name: string; at: number } | null
  progress: number
  humor: { style: string; n: number }[]
  humorLabel: string | null
  signedIn: boolean
}

function playerView(p: any): BattlePlayer {
  const picks = p?.picks ?? 0
  const r = rankFor(picks)
  return {
    picks,
    streak: p?.streak_days ?? 0,
    rank: r.rank ? { key: r.rank.key, name: r.rank.name } : null,
    next: r.next ? { name: r.next.name, at: r.next.at } : null,
    progress: r.progress,
    humor: humorType(p?.humor),
    humorLabel: humorLabel(p?.humor),
    signedIn: !!p?.user_id,
  }
}

async function getPlayer(client: any, playerId: string): Promise<any> {
  const { data } = await client.from('battle_players').select('*').eq('player_id', playerId).maybeSingle()
  if (data) return data
  const { data: made } = await client.from('battle_players').upsert({ player_id: playerId }, { onConflict: 'player_id', ignoreDuplicates: true }).select('*').maybeSingle()
  if (made) return made
  const again = await client.from('battle_players').select('*').eq('player_id', playerId).single()
  return again.data
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** Rows past Supabase's 1000-row page, up to a ceiling. */
async function fetchAll(q: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>, max = 50_000): Promise<any[]> {
  const out: any[] = []
  for (let from = 0; from < max; from += 1000) {
    const { data, error } = await q(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

/* ── player: rounds and picks ── */

export type BattleOption = { key: string; text: string }
export type BattleRound = {
  roundId: string
  setup: { n: number; topic: string; text: string }
  total: number
  options: BattleOption[]
  player: BattlePlayer
}

/** The next round for this player, or null when the bank is empty or the
 *  player has picked on every live setup. */
export const battleNext = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ player: PlayerId }).parse(d))
  .handler(async ({ data }): Promise<BattleRound | null> => {
    const client = await db()
    const player = await getPlayer(client, data.player)
    if (!player) return null
    // A light brake on scripts: no human reads 600 rounds a day.
    const today = pacificDay()
    const servedToday = player.served_day === today ? player.served_today ?? 0 : 0
    if (servedToday >= 600) throw new Error('rate_limited')

    const { data: setups } = await client
      .from('battle_setups')
      .select('id, n, topic, setup, picks')
      .eq('active', true)
      .eq('live', true)
      .lt('picks', BATTLE.retireAfter)
    const live: any[] = setups ?? []
    if (!live.length) return null
    const { data: done } = await client.from('battle_rounds').select('setup_id').eq('player_id', data.player).not('picked_at', 'is', null)
    const seen = new Set((done ?? []).map((r: any) => r.setup_id))
    const open = live.filter((s) => !seen.has(s.id))
    if (!open.length) return null
    // Spread picks: the least-picked setups first, random among those.
    const least = Math.min(...open.map((s) => s.picks ?? 0))
    const pool = open.filter((s) => (s.picks ?? 0) <= least + 2)
    const setup = pool[Math.floor(Math.random() * pool.length)]!

    const { data: versions } = await client.from('battle_versions').select('id, text, shown').eq('setup_id', setup.id).eq('active', true)
    const vs: any[] = versions ?? []
    if (vs.length < 2) return null
    // Rotate: the least-shown versions go out, so every version meets every other.
    const byShown = shuffle(vs).sort((a, b) => (a.shown ?? 0) - (b.shown ?? 0))
    const isTest = vs.length >= 2 && (player.rounds_served ?? 0) % BATTLE.testEvery === BATTLE.testEvery - 3
    const real = byShown.slice(0, isTest ? 2 : Math.min(BATTLE.shown, vs.length))
    const control = isTest ? CONTROL_LINES[Math.floor(Math.random() * CONTROL_LINES.length)]! : null
    const options: BattleOption[] = shuffle([
      ...real.map((v) => ({ key: v.id as string, text: v.text as string })),
      ...(control ? [{ key: 'control', text: control }] : []),
    ])

    const { data: round, error } = await client
      .from('battle_rounds')
      .insert({
        player_id: data.player,
        user_id: player.user_id ?? null,
        setup_id: setup.id,
        shown: real.map((v) => v.id),
        options: options.map((o) => o.key),
        control_text: control,
        is_test: isTest,
      })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    await client
      .from('battle_players')
      .update({ rounds_served: (player.rounds_served ?? 0) + 1, served_today: servedToday + 1, served_day: today, last_seen_at: new Date().toISOString() })
      .eq('player_id', data.player)

    const { count } = await client.from('battle_setups').select('id', { count: 'exact', head: true }).eq('active', true).eq('live', true)
    return { roundId: round.id, setup: { n: setup.n, topic: setup.topic, text: setup.setup }, total: count ?? live.length, options, player: playerView(player) }
  })

export type BattleReveal = { key: string; technique: string; guideSlug: string | null; guideTitle: string | null; control: boolean }
export type BattlePickResult = {
  reveal: BattleReveal[]
  player: BattlePlayer
  newRank: { key: string; name: string; line: string } | null
  counted: boolean
}

export const battlePick = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ player: PlayerId, round: z.string().uuid(), choice: z.union([z.string().max(60), z.literal('none'), z.literal('skip')]) }).parse(d),
  )
  .handler(async ({ data }): Promise<BattlePickResult> => {
    const client = await db()
    const { data: round } = await client.from('battle_rounds').select('*').eq('id', data.round).eq('player_id', data.player).maybeSingle()
    if (!round) throw new Error('unknown_round')
    if (round.picked_at) throw new Error('already_picked')
    const player = await getPlayer(client, data.player)
    const ms = Date.now() - new Date(round.served_at).getTime()
    const choice = data.choice
    if (choice !== 'none' && choice !== 'skip' && !(round.options as string[]).includes(choice)) throw new Error('bad_choice')

    const { data: versions } = await client.from('battle_versions').select('id, text, technique_name, guide_slug, guide_title, shown, picked').in('id', round.shown)
    const vmap = new Map<string, any>((versions ?? []).map((v: any) => [v.id, v]))

    // Flags: a flagged pick is stored but not counted toward the results.
    let flag: string | null = null
    if (choice !== 'skip') {
      if (ms < BATTLE.fastMs) flag = 'too_fast'
      else if (choice === 'control') flag = 'test_fail'
      else {
        const { count } = await client
          .from('battle_rounds')
          .select('id', { count: 'exact', head: true })
          .eq('player_id', data.player)
          .eq('setup_id', round.setup_id)
          .not('picked_at', 'is', null)
          .neq('pick', 'skip')
        if ((count ?? 0) > 0) flag = 'repeat'
      }
    }
    const now = new Date().toISOString()
    await client.from('battle_rounds').update({ pick: choice, picked_at: now, ms, flag, user_id: player?.user_id ?? round.user_id ?? null }).eq('id', round.id)

    const counted = choice !== 'skip' && !flag
    if (counted) {
      await Promise.all(
        (round.shown as string[]).map((id) => {
          const v = vmap.get(id)
          if (!v) return null
          return client.from('battle_versions').update({ shown: (v.shown ?? 0) + 1, picked: (v.picked ?? 0) + (choice === id ? 1 : 0) }).eq('id', id)
        }),
      )
      const { data: s } = await client.from('battle_setups').select('picks, nones').eq('id', round.setup_id).single()
      await client.from('battle_setups').update({ picks: (s?.picks ?? 0) + 1, nones: (s?.nones ?? 0) + (choice === 'none' ? 1 : 0) }).eq('id', round.setup_id)
    }

    // The player's side: picks (any non-skip), streak, humor type, test record.
    let next = player
    if (choice !== 'skip') {
      const today = pacificDay()
      const humor = { ...(player?.humor ?? {}) }
      if (vmap.has(choice) && flag !== 'too_fast') {
        const st = styleOf(vmap.get(choice).guide_slug)
        humor[st] = (humor[st] ?? 0) + 1
      }
      const upd: Record<string, unknown> = {
        picks: (player?.picks ?? 0) + 1,
        streak_days: nextStreak(player?.last_day ?? null, player?.streak_days ?? 0, today, shiftDay(today, -1)),
        last_day: today,
        humor,
        last_seen_at: now,
      }
      if (round.is_test) {
        if (choice === 'control') upd.test_failed = (player?.test_failed ?? 0) + 1
        else if (choice !== 'none') upd.test_passed = (player?.test_passed ?? 0) + 1
      }
      const { data: saved } = await client.from('battle_players').update(upd).eq('player_id', data.player).select('*').single()
      next = saved ?? { ...player, ...upd }
    }
    const up = rankUp(player?.picks ?? 0, next?.picks ?? 0)

    const reveal: BattleReveal[] = (round.options as string[]).map((key) => {
      if (key === 'control') return { key, technique: 'a deliberately flat line (a control)', guideSlug: null, guideTitle: null, control: true }
      const v = vmap.get(key)
      return { key, technique: v?.technique_name ?? '', guideSlug: v?.guide_slug ?? null, guideTitle: v?.guide_title ?? null, control: false }
    })
    return { reveal, player: playerView(next), newRank: up ? { key: up.key, name: up.name, line: up.line } : null, counted }
  })

/** Rank, streak and humor type for the header, before the first round. */
export const battleMe = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ player: PlayerId }).parse(d))
  .handler(async ({ data }): Promise<BattlePlayer> => {
    const client = await db()
    const { data: p } = await client.from('battle_players').select('*').eq('player_id', data.player).maybeSingle()
    return playerView(p)
  })

/** A signed-in player: this browser's picks join the account. */
export const battleLink = createServerFn({ method: 'POST' })
  .middleware([requireRealUser])
  .inputValidator((d: unknown) => z.object({ player: PlayerId }).parse(d))
  .handler(async ({ data, context }): Promise<BattlePlayer> => {
    const userId = (context as { userId: string }).userId
    const client = await db()
    const p = await getPlayer(client, data.player)
    if (p && !p.user_id) {
      await client.from('battle_players').update({ user_id: userId, linked_at: new Date().toISOString() }).eq('player_id', data.player)
      await client.from('battle_rounds').update({ user_id: userId }).eq('player_id', data.player).is('user_id', null)
    }
    const { data: fresh } = await client.from('battle_players').select('*').eq('player_id', data.player).maybeSingle()
    return playerView(fresh)
  })

/* ── badges: the profile side ── */

export type MyBadges = {
  picks: number
  rank: { key: RankKey; name: string } | null
  next: { name: string; at: number } | null
  progress: number
  humorLabel: string | null
  earned: RankKey[]
  /** The rank whose picture is the profile picture now, if any. */
  pictureRank: RankKey | null
}

/** A signed-in person's badges: picks added up across every browser they
 *  have played in and linked. */
export const myBattleBadges = createServerFn({ method: 'POST' })
  .middleware([requireRealUser])
  .handler(async ({ context }): Promise<MyBadges> => {
    const userId = (context as { userId: string }).userId
    const client = await db()
    const { data: rows } = await client.from('battle_players').select('picks, humor').eq('user_id', userId)
    let picks = 0
    const humor: Record<string, number> = {}
    for (const r of (rows ?? []) as { picks: number | null; humor: Record<string, number> | null }[]) {
      picks += r.picks ?? 0
      for (const [k, n] of Object.entries(r.humor ?? {})) humor[k] = (humor[k] ?? 0) + (n ?? 0)
    }
    const r = rankFor(picks)
    const { data: alias } = await client.from('aliases').select('avatar_url').eq('user_id', userId).maybeSingle()
    return {
      picks,
      rank: r.rank ? { key: r.rank.key, name: r.rank.name } : null,
      next: r.next ? { name: r.next.name, at: r.next.at } : null,
      progress: r.progress,
      humorLabel: humorLabel(humor),
      earned: RANKS.filter((x) => picks >= x.at).map((x) => x.key),
      pictureRank: rankOfAvatar((alias as { avatar_url?: string | null } | null)?.avatar_url),
    }
  })

/** Use an earned rank's picture as the profile picture. Like uploading a new
 *  photo, it replaces the old one (an uploaded file is removed). */
export const setRankPicture = createServerFn({ method: 'POST' })
  .middleware([requireRealUser])
  .inputValidator((d: unknown) => z.object({ rank: z.enum(RANKS.map((r) => r.key) as [RankKey, ...RankKey[]]) }).parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as { userId: string }).userId
    const client = await db()
    const { data: rows } = await client.from('battle_players').select('picks').eq('user_id', userId)
    const picks = ((rows ?? []) as { picks: number | null }[]).reduce((a, r) => a + (r.picks ?? 0), 0)
    const rank = RANKS.find((r) => r.key === data.rank)!
    if (picks < rank.at) throw new Error(`reach ${rank.name} first`)
    const { data: saved, error } = await client
      .from('aliases')
      .update({ avatar_url: `${SITE_URL}${rankAvatarPath(rank.key)}` })
      .eq('user_id', userId)
      .select('user_id, display_name, emoji, avatar_url')
      .maybeSingle()
    if (error) throw new Error(error.message)
    const { removeAvatarFiles } = await import('./avatar-files.server')
    await removeAvatarFiles(userId)
    return saved as { user_id: string; display_name: string; emoji: string; avatar_url: string | null } | null
  })

/* ── admin: the report ── */

export type AdminBattleTechnique = { name: string; guideSlug: string | null; versions: number; shown: number; picked: number; rate: number }
export type AdminBattleVersion = { id: string; text: string; technique: string; guideSlug: string | null; shown: number; picked: number; share: number; active: boolean }
export type AdminBattleSetup = { id: string; n: number; topic: string; setup: string; active: boolean; live: boolean; picks: number; nones: number; noneRate: number; versions: AdminBattleVersion[] }
export type AdminBattleReport = {
  bank: { setups: number; activeSetups: number; liveSetups: number; readyNotLive: number; versions: number; setupsWithoutVersions: number; retired: number }
  totals: {
    served: number
    decided: number
    counted: number
    skips: number
    nones: number
    flagged: { too_fast: number; test_fail: number; repeat: number; low_quality_player: number }
    players: number
    guests: number
    signedIn: number
    today: number
  }
  agreement: { setupsCompared: number; agree: number } | null
  techniques: AdminBattleTechnique[]
  setups: AdminBattleSetup[]
}

export const adminBattleReport = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminBattleReport> => {
    await assertAdmin(context)
    const client = await db()
    const [setups, versions, rounds, players] = await Promise.all([
      fetchAll((a, b) => client.from('battle_setups').select('id, n, topic, setup, active, live, picks, nones').order('n').range(a, b)),
      fetchAll((a, b) => client.from('battle_versions').select('id, setup_id, text, technique_name, guide_slug, active').range(a, b)),
      fetchAll((a, b) => client.from('battle_rounds').select('player_id, user_id, setup_id, shown, pick, flag, picked_at, served_at').order('served_at', { ascending: false }).range(a, b)),
      fetchAll((a, b) => client.from('battle_players').select('player_id, user_id, picks, test_passed, test_failed').range(a, b)),
    ])
    // A player who keeps picking the flat control line over real jokes is tapping, not reading.
    const lowQuality = new Set(players.filter((p) => (p.test_failed ?? 0) >= 2 && (p.test_failed ?? 0) > (p.test_passed ?? 0)).map((p) => p.player_id))
    const today = pacificDay()

    const stats = new Map<string, { shown: number; picked: number }>()
    const bySetupGroup = new Map<string, { guest: Map<string, number>; signed: Map<string, number> }>()
    const flagged = { too_fast: 0, test_fail: 0, repeat: 0, low_quality_player: 0 }
    let decided = 0, counted = 0, skips = 0, nones = 0, todayN = 0
    for (const r of rounds) {
      if (r.served_at && pacificDay(new Date(r.served_at)) === today) todayN++
      if (!r.picked_at) continue
      decided++
      if (r.pick === 'skip') { skips++; continue }
      if (r.flag) { flagged[r.flag as keyof typeof flagged] = (flagged[r.flag as keyof typeof flagged] ?? 0) + 1; continue }
      if (lowQuality.has(r.player_id)) { flagged.low_quality_player++; continue }
      counted++
      if (r.pick === 'none') nones++
      for (const id of r.shown as string[]) {
        const s = stats.get(id) ?? { shown: 0, picked: 0 }
        s.shown++
        if (r.pick === id) s.picked++
        stats.set(id, s)
      }
      if (r.pick !== 'none') {
        const g = bySetupGroup.get(r.setup_id) ?? { guest: new Map(), signed: new Map() }
        const m = r.user_id ? g.signed : g.guest
        m.set(r.pick, (m.get(r.pick) ?? 0) + 1)
        bySetupGroup.set(r.setup_id, g)
      }
    }

    // Do guests and signed-in players crown the same version? Setups with
    // at least 5 counted picks from each group.
    let compared = 0, agree = 0
    const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    const total = (m: Map<string, number>) => [...m.values()].reduce((s, n) => s + n, 0)
    for (const g of bySetupGroup.values()) {
      if (total(g.guest) >= 5 && total(g.signed) >= 5) {
        compared++
        if (top(g.guest) === top(g.signed)) agree++
      }
    }

    const tech = new Map<string, AdminBattleTechnique>()
    for (const v of versions) {
      const key = `${v.guide_slug ?? ''}|${v.technique_name}`
      const t = tech.get(key) ?? { name: v.technique_name, guideSlug: v.guide_slug, versions: 0, shown: 0, picked: 0, rate: 0 }
      const s = stats.get(v.id)
      t.versions++
      t.shown += s?.shown ?? 0
      t.picked += s?.picked ?? 0
      tech.set(key, t)
    }
    const techniques = [...tech.values()].map((t) => ({ ...t, rate: t.shown ? t.picked / t.shown : 0 })).sort((a, b) => b.rate - a.rate || b.shown - a.shown)

    const vBySetup = new Map<string, AdminBattleVersion[]>()
    for (const v of versions) {
      const s = stats.get(v.id) ?? { shown: 0, picked: 0 }
      const list = vBySetup.get(v.setup_id) ?? []
      list.push({ id: v.id, text: v.text, technique: v.technique_name, guideSlug: v.guide_slug, shown: s.shown, picked: s.picked, share: s.shown ? s.picked / s.shown : 0, active: v.active })
      vBySetup.set(v.setup_id, list)
    }
    const setupRows: AdminBattleSetup[] = setups.map((s) => ({
      id: s.id,
      n: s.n,
      topic: s.topic,
      setup: s.setup,
      active: s.active,
      live: !!s.live,
      picks: s.picks ?? 0,
      nones: s.nones ?? 0,
      noneRate: s.picks ? (s.nones ?? 0) / s.picks : 0,
      versions: (vBySetup.get(s.id) ?? []).sort((a, b) => b.share - a.share),
    }))

    return {
      bank: {
        setups: setups.length,
        activeSetups: setups.filter((s) => s.active).length,
        liveSetups: setups.filter((s) => s.active && s.live).length,
        readyNotLive: setupRows.filter((s) => s.active && !s.live && s.versions.filter((v) => v.active).length >= 3).length,
        versions: versions.length,
        setupsWithoutVersions: setupRows.filter((s) => s.versions.length === 0).length,
        retired: setups.filter((s) => (s.picks ?? 0) >= BATTLE.retireAfter).length,
      },
      totals: {
        served: rounds.length,
        decided,
        counted,
        skips,
        nones,
        flagged,
        players: players.length,
        guests: players.filter((p) => !p.user_id).length,
        signedIn: players.filter((p) => !!p.user_id).length,
        today: todayN,
      },
      agreement: compared ? { setupsCompared: compared, agree } : null,
      techniques,
      setups: setupRows,
    }
  })

export const adminBattleToggle = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ kind: z.enum(['setup', 'version', 'live']), id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context)
    const client = await db()
    const table = data.kind === 'version' ? 'battle_versions' : 'battle_setups'
    const { error } = await client.from(table).update(data.kind === 'live' ? { live: data.active } : { active: data.active }).eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })

/** Put every ready setup (active, 3+ live lines) on the homepage. */
export const adminBattleGoLive = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ turnedOn: number }> => {
    await assertAdmin(context)
    const client = await db()
    const [setups, versions] = await Promise.all([
      fetchAll((a, b) => client.from('battle_setups').select('id').eq('active', true).eq('live', false).range(a, b)),
      fetchAll((a, b) => client.from('battle_versions').select('setup_id').eq('active', true).range(a, b)),
    ])
    const lines = new Map<string, number>()
    for (const v of versions) lines.set(v.setup_id, (lines.get(v.setup_id) ?? 0) + 1)
    const ready = setups.filter((s) => (lines.get(s.id) ?? 0) >= 3).map((s) => s.id)
    for (let i = 0; i < ready.length; i += 100) {
      const { error } = await client.from('battle_setups').update({ live: true }).in('id', ready.slice(i, i + 100))
      if (error) throw new Error(error.message)
    }
    return { turnedOn: ready.length }
  })

/* ── admin: writing the bank ── */

const TOPICS = ['work', 'family', 'roommates', 'dating', 'in-laws', 'friends', 'school', 'neighbors', 'group chat', 'travel', 'shopping', 'partner']

const SETUP_PROMPT = `Write {{N}} setups for a comedy game. A setup is one everyday annoyance,
told in first person by the person it happened to, the way they'd text a friend.
Rules for every setup:
- one or two short sentences, at most 22 words
- one concrete detail a joke can grab: a clock time, a number, an object, or the exact words someone said (in quotes)
- small and everyday: the kind of thing that ruins twenty minutes, not a life
- no names, no brands, no places, nothing tragic, no illness or injury, no bodies, nobody's age, looks, race, religion or politics
- the other person did something; the teller did nothing wrong
Spread them across these topics, about evenly: {{TOPICS}}.
Do not repeat or closely resemble any of these existing setups:
{{EXISTING}}
Return only JSON: {"setups":[{"topic":"work","setup":"..."}, ...]}`

const VERSION_PROMPT = `You write one-line jokes for a comedy game. Players read the setup, then
pick the funniest of several lines. The setup is already on screen: your line is
the punchline only, said by the same person, first person.

SETUP ({{TOPIC}}):
{{SETUP}}

Write exactly {{K}} lines, line i using technique i below. Each technique shows
its shape on a different story: copy the operation, never its words or nouns.

{{TECHNIQUES}}

Every line:
- at most 15 words, one or two short sentences, sayable out loud
- something happens, or a detail you can picture: a note, a reply, an object, a number. Not a label ("she's the CEO of the fridge" is a label)
- no office, legal or official vocabulary the setup didn't use (audit, inventory, protocol, department, report, evidence, receipt, formal)
- the joke is on the other person's behaviour or the situation, never on the teller
- no advice, no therapy words, no moral, no "I realized"
- do not repeat the setup; land somewhere its words could not reach
- end on the word that does the turning; nothing after it
Return only JSON: {"lines":["...", ...]} in technique order.`

type BankTechnique = { id: string; name: string; op: string; example: string; guideSlug: string; guideTitle: string }

async function guideTechniques(): Promise<BankTechnique[]> {
  const [{ funniestBank }, { GUIDES }] = await Promise.all([import('@/lib/bits/pipeline.server'), import('@/lib/seo/guides')])
  const titles = new Map<string, string>((GUIDES as any[]).map((g) => [g.slug, (g.h1 ?? g.title ?? g.slug).replace(/\s*\|\s*Shutap$/, '')]))
  return (await funniestBank()).line
    .filter((t) => t.family.startsWith('funniest:guides/'))
    .map((t) => {
      const slug = t.family.slice('funniest:guides/'.length)
      const name = t.name.charAt(0) + t.name.slice(1).toLowerCase()
      return { id: t.id, name, op: t.op, example: t.example, guideSlug: slug, guideTitle: titles.get(slug) ?? slug }
    })
}

/** Four techniques from four different guides, the least-used in the bank first. */
function dealFour(all: BankTechnique[], used: Map<string, number>): BankTechnique[] {
  const out: BankTechnique[] = []
  const guides = new Set<string>()
  for (const t of shuffle(all).sort((a, b) => (used.get(a.id) ?? 0) - (used.get(b.id) ?? 0))) {
    if (guides.has(t.guideSlug)) continue
    out.push(t)
    guides.add(t.guideSlug)
    if (out.length === BATTLE.versions) break
  }
  return out
}

async function lineFailure(line: string, setup: string): Promise<string | null> {
  const [{ hardRuleFailure }, { costumeToken, isLabelLine }] = await Promise.all([import('@/lib/jokes/pipeline.server'), import('@/lib/bits/techniques')])
  if (wordCount(line) > BATTLE.maxWords) return 'too long'
  const f = hardRuleFailure(line, setup, 'the_roast', { ignoreLength: true })
  if (f && f !== 'too short') return f
  if (costumeToken(line, setup)) return 'costume'
  if (isLabelLine(line)) return 'label'
  return null
}

export type BankProgress = { added: number; setups: number; withoutVersions: number; errors: string[] }

/** Write up to 20 new setups (until the bank holds BATTLE.setups). */
export const adminBattleWriteSetups = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BankProgress> => {
    await assertAdmin(context)
    const client = await db()
    const existing = await fetchAll((a, b) => client.from('battle_setups').select('n, setup').order('n').range(a, b))
    const errors: string[] = []
    const want = Math.min(20, BATTLE.setups - existing.length)
    let added = 0
    if (want > 0) {
      const { callAgent, tryParseJson } = await import('@/lib/agents/gateway')
      const { bitWriterModel } = await import('@/lib/bits/pipeline.server')
      const { toneFailure } = await import('@/lib/jokes/pipeline.server')
      const res = await callAgent({
        model: bitWriterModel(),
        temperature: 1.0,
        maxTokens: 3000,
        timeoutMs: 45_000,
        messages: [
          {
            role: 'user',
            content: SETUP_PROMPT.replace('{{N}}', String(want))
              .replace('{{TOPICS}}', TOPICS.join(', '))
              .replace('{{EXISTING}}', existing.slice(-80).map((s) => `- ${s.setup}`).join('\n') || '(none yet)'),
          },
        ],
      })
      if (res.error) errors.push(res.error)
      const parsed = tryParseJson<{ setups?: { topic?: string; setup?: string }[] }>(res.text)
      const seen = new Set(existing.map((s) => s.setup.toLowerCase()))
      let n = existing.reduce((m, s) => Math.max(m, s.n ?? 0), 0)
      const rows = (parsed?.setups ?? [])
        .map((s) => ({ topic: String(s.topic ?? '').toLowerCase().trim(), setup: String(s.setup ?? '').replace(/\s+/g, ' ').trim() }))
        .filter((s) => s.setup.length > 15 && wordCount(s.setup) <= 26 && !toneFailure(s.setup) && !seen.has(s.setup.toLowerCase()))
        .slice(0, want)
        .map((s) => ({ n: ++n, topic: TOPICS.includes(s.topic) ? s.topic : 'everyday', setup: s.setup, active: true }))
      if (rows.length) {
        const { error } = await client.from('battle_setups').insert(rows)
        if (error) errors.push(error.message)
        else added = rows.length
      }
    }
    const { count: setups } = await client.from('battle_setups').select('id', { count: 'exact', head: true })
    const withoutVersions = await setupsWithoutVersions(client)
    return { added, setups: setups ?? 0, withoutVersions: withoutVersions.length, errors }
  })

async function setupsWithoutVersions(client: any): Promise<any[]> {
  const [setups, versions] = await Promise.all([
    fetchAll((a, b) => client.from('battle_setups').select('id, n, topic, setup').eq('active', true).order('n').range(a, b)),
    fetchAll((a, b) => client.from('battle_versions').select('setup_id').range(a, b)),
  ])
  const has = new Set(versions.map((v) => v.setup_id))
  return setups.filter((s) => !has.has(s.id))
}

/** Write the four versions for up to 5 setups that have none yet. */
export const adminBattleWriteVersions = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BankProgress> => {
    await assertAdmin(context)
    const client = await db()
    const todo = (await setupsWithoutVersions(client)).slice(0, 5)
    const all = await guideTechniques()
    if (all.length < BATTLE.versions) throw new Error('the /guides pages have fewer than four line techniques')
    const usedRows = await fetchAll((a, b) => client.from('battle_versions').select('technique_id').range(a, b))
    const used = new Map<string, number>()
    for (const r of usedRows) used.set(r.technique_id, (used.get(r.technique_id) ?? 0) + 1)
    const { callAgent, tryParseJson } = await import('@/lib/agents/gateway')
    const { bitWriterModel, backupWriterModel } = await import('@/lib/bits/pipeline.server')
    const errors: string[] = []
    let added = 0

    await Promise.all(
      todo.map(async (s) => {
        const four = dealFour(all, used)
        for (const t of four) used.set(t.id, (used.get(t.id) ?? 0) + 1)
        const keep: { text: string; t: BankTechnique }[] = []
        // Two tries: the first writer, then the backup for whatever failed.
        let want = four
        for (const model of [bitWriterModel(), backupWriterModel()]) {
          if (!want.length) break
          const res = await callAgent({
            model,
            temperature: 1.0,
            maxTokens: 1200,
            timeoutMs: 30_000,
            messages: [
              {
                role: 'user',
                content: VERSION_PROMPT.replace('{{TOPIC}}', s.topic)
                  .replace('{{SETUP}}', s.setup)
                  .replace('{{K}}', String(want.length))
                  .replace('{{TECHNIQUES}}', want.map((t, i) => `${i + 1}. ${t.name.toUpperCase()}: ${t.op}\n   shape: ${t.example}`).join('\n')),
              },
            ],
          })
          const lines = (tryParseJson<{ lines?: unknown[] }>(res.text)?.lines ?? []).map((l) => String(l ?? '').replace(/\s+/g, ' ').trim())
          const failed: BankTechnique[] = []
          for (let i = 0; i < want.length; i++) {
            const line = lines[i]
            if (line && !(await lineFailure(line, s.setup))) keep.push({ text: line, t: want[i]! })
            else failed.push(want[i]!)
          }
          want = failed
        }
        if (keep.length < 3) {
          errors.push(`setup ${s.n}: only ${keep.length} lines passed`)
          // Keep what passed but park the setup until it has three.
          await client.from('battle_setups').update({ active: false }).eq('id', s.id)
        }
        if (keep.length) {
          const { error } = await client.from('battle_versions').insert(
            keep.map((k) => ({
              setup_id: s.id,
              text: k.text,
              technique_id: k.t.id,
              technique_name: k.t.name.toLowerCase(),
              guide_slug: k.t.guideSlug,
              guide_title: k.t.guideTitle,
              active: true,
            })),
          )
          if (error) errors.push(error.message)
          else added += keep.length
        }
      }),
    )
    const { count: setups } = await client.from('battle_setups').select('id', { count: 'exact', head: true })
    const withoutVersions = (await setupsWithoutVersions(client)).length
    return { added, setups: setups ?? 0, withoutVersions, errors }
  })
