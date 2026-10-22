// Alias identity: one row per auth user in public.aliases.
// The alias display_name/emoji is user-editable; user_id (auth.uid()) is immutable.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { requireRealUser } from './require-real-user'

const PARTS = {
  emotions: ['Quiet','Wistful','Defiant','Restless','Tender','Patient','Bitter','Forlorn','Tired','Honest','Careful','Steady','Mortified','Hopeful','Reluctant','Curious','Fierce','Gentle'],
  nations: ['Nigerian','Filipino','Brazilian','Kenyan','Indian','Ethiopian','Pakistani','Moroccan','Chilean','Polish','Cuban','Vietnamese','Lebanese','Indonesian','Ghanaian','Korean','Italian','Welsh','Turkish','Argentinian'],
  creatures: [
    { n: 'Owl', e: '🦉' }, { n: 'Fox', e: '🦊' }, { n: 'Bear', e: '🐻' }, { n: 'Lion', e: '🦁' },
    { n: 'Butterfly', e: '🦋' }, { n: 'Hedgehog', e: '🦔' }, { n: 'Swan', e: '🦢' }, { n: 'Wolf', e: '🐺' },
    { n: 'Hawk', e: '🦅' }, { n: 'Crane', e: '🕊' }, { n: 'Fawn', e: '🦌' }, { n: 'Hare', e: '🐇' },
    { n: 'Dove', e: '🕊' }, { n: 'Otter', e: '🦦' }, { n: 'Robin', e: '🐦' }, { n: 'Heron', e: '🪿' },
  ],
} as const

function rand<T>(a: readonly T[]): T { return a[Math.floor(Math.random() * a.length)] }

export function randomAliasParts() {
  const emotion = rand(PARTS.emotions)
  const nation = rand(PARTS.nations)
  const creature = rand(PARTS.creatures)
  return { emotion, nation, creature: creature.n, emoji: creature.e, display_name: `${emotion} ${nation} ${creature.n}` }
}

const AliasIn = z.object({
  emotion: z.string().min(1).max(40).optional(),
  nation: z.string().min(1).max(40).optional(),
  creature: z.string().min(1).max(40).optional(),
  emoji: z.string().min(1).max(8).optional(),
  display_name: z.string().min(1).max(120).optional(),
  birth_year: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  birth_month: z.number().int().min(1).max(12).optional(),
  birth_day: z.number().int().min(1).max(31).optional(),
})

export const getMyAlias = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from('aliases')
      .select('user_id, emotion, nation, creature, emoji, display_name, avatar_url, birth_year, birth_month, birth_day')
      .eq('user_id', context.userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  })

/* ───────── real-name profiles (Oct 2026) ─────────
 * A new account is created with the person's real name and their provider
 * picture (Google gives one; Apple does not). No made-up name, no emoji.
 * The aliases row stays the public identity record. */

const PROFILE_COLS = 'user_id, display_name, emoji, avatar_url'

/** Creates the profile for a freshly signed-in person if it doesn't exist,
 *  from what their sign-in provider shared. Returns the profile either way. */
export const ensureMyProfile = createServerFn({ method: 'POST' })
  .middleware([requireRealUser])
  .handler(async ({ context }) => {
    const existing = await context.supabase.from('aliases').select(PROFILE_COLS).eq('user_id', context.userId).maybeSingle()
    if (existing.data) return existing.data as { user_id: string; display_name: string; emoji: string; avatar_url: string | null }

    const { data: u } = await context.supabase.auth.getUser()
    const { realNameSeed } = await import('./profile-seed.server')
    const seed = realNameSeed(u?.user)
    const { data: saved, error } = await context.supabase
      .from('aliases')
      .insert({
        user_id: context.userId,
        ...seed,
        birth_year: 1990,
        birth_month: 1,
        birth_day: 1,
      } as never)
      .select(PROFILE_COLS)
      .single()
    if (error) {
      // A parallel tab may have created it a moment earlier.
      const again = await context.supabase.from('aliases').select(PROFILE_COLS).eq('user_id', context.userId).maybeSingle()
      if (again.data) return again.data as { user_id: string; display_name: string; emoji: string; avatar_url: string | null }
      throw new Error(error.message)
    }
    return saved as { user_id: string; display_name: string; emoji: string; avatar_url: string | null }
  })

/** Edit the name shown on the profile. */
export const updateMyProfile = createServerFn({ method: 'POST' })
  .middleware([requireRealUser])
  .inputValidator((d: unknown) => z.object({ display_name: z.string().trim().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: saved, error } = await context.supabase
      .from('aliases')
      .update({ display_name: data.display_name } as never)
      .eq('user_id', context.userId)
      .select(PROFILE_COLS)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return saved as { user_id: string; display_name: string; emoji: string; avatar_url: string | null } | null
  })

const DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/

/** Upload a profile picture. The client resizes it first; this stores it in
 *  the public `avatars` bucket and points the profile at it. */
export const setMyAvatar = createServerFn({ method: 'POST' })
  .middleware([requireRealUser])
  .inputValidator((d: unknown) => z.object({ data_url: z.string().max(3_000_000) }).parse(d))
  .handler(async ({ data, context }) => {
    const m = DATA_URL.exec(data.data_url)
    if (!m) throw new Error('unsupported image')
    const type = m[1]!
    const bytes = Buffer.from(m[2]!, 'base64')
    if (bytes.length > 2_000_000) throw new Error('image too large')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const path = `${context.userId}/avatar-${Date.now()}.${type === 'jpeg' ? 'jpg' : type}`
    const up = await supabaseAdmin.storage.from('avatars').upload(path, bytes, { contentType: `image/${type}`, upsert: true })
    if (up.error) throw new Error(up.error.message)
    const url = supabaseAdmin.storage.from('avatars').getPublicUrl(path).data.publicUrl
    const { data: saved, error } = await supabaseAdmin
      .from('aliases')
      .update({ avatar_url: url } as never)
      .eq('user_id', context.userId)
      .select(PROFILE_COLS)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return saved as { user_id: string; display_name: string; emoji: string; avatar_url: string | null } | null
  })

/** Remove the profile picture (falls back to the initial). */
export const removeMyAvatar = createServerFn({ method: 'POST' })
  .middleware([requireRealUser])
  .handler(async ({ context }) => {
    const { data: saved, error } = await context.supabase
      .from('aliases')
      .update({ avatar_url: null } as never)
      .eq('user_id', context.userId)
      .select(PROFILE_COLS)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return saved as { user_id: string; display_name: string; emoji: string; avatar_url: string | null } | null
  })

/** Upsert alias for the authenticated user. If no row exists, one is created
 *  with sensible defaults (random alias, birth 1990-01-01 unless supplied).
 *  Enforces one row per user via PK on user_id. */
export const upsertMyAlias = createServerFn({ method: 'POST' })
  .middleware([requireRealUser])
  .inputValidator((d: unknown) => AliasIn.parse(d))
  .handler(async ({ data, context }) => {
    // Read existing so we can partial-update without breaking NOT NULL fields.
    const existing = await context.supabase
      .from('aliases')
      .select('user_id, emotion, nation, creature, emoji, display_name, birth_year, birth_month, birth_day')
      .eq('user_id', context.userId)
      .maybeSingle()

    const seed = randomAliasParts()
    const base = existing.data ?? {
      user_id: context.userId,
      emotion: seed.emotion,
      nation: seed.nation,
      creature: seed.creature,
      emoji: seed.emoji,
      display_name: seed.display_name,
      birth_year: 1990,
      birth_month: 1,
      birth_day: 1,
    }
    const emotion = data.emotion ?? base.emotion
    const nation = data.nation ?? base.nation
    const creature = data.creature ?? base.creature
    const emoji = data.emoji ?? base.emoji
    const display_name = data.display_name ?? `${emotion} ${nation} ${creature}`
    const row = {
      user_id: context.userId,
      emotion,
      nation,
      creature,
      emoji,
      display_name,
      birth_year: data.birth_year ?? base.birth_year,
      birth_month: data.birth_month ?? base.birth_month,
      birth_day: data.birth_day ?? base.birth_day,
    }

    const { data: saved, error } = await context.supabase
      .from('aliases')
      .upsert(row as never, { onConflict: 'user_id' })
      .select('user_id, emotion, nation, creature, emoji, display_name, birth_year, birth_month, birth_day')
      .single()
    if (error) throw new Error(error.message)
    return saved
  })

/** Re-roll the alias display fields (emotion/nation/creature/emoji/display_name)
 *  while preserving user_id + birth date. */
export const rerollMyAlias = createServerFn({ method: 'POST' })
  .middleware([requireRealUser])
  .handler(async ({ context }) => {
    const p = randomAliasParts()
    const { data, error } = await context.supabase
      .from('aliases')
      .update({
        emotion: p.emotion,
        nation: p.nation,
        creature: p.creature,
        emoji: p.emoji,
        display_name: p.display_name,
      } as never)
      .eq('user_id', context.userId)
      .select('user_id, emotion, nation, creature, emoji, display_name, birth_year, birth_month, birth_day')
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  })

/** Server-side admin check via user_roles.has_role. */
export const getIsAdmin = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    })
    if (error) return false
    return Boolean(data)
  })

/** Batch-resolve public alias display for a set of user ids. Uses service role
 *  because RLS on aliases only allows owner reads; only display_name + emoji
 *  are returned, no PII. */
export const resolveAliases = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ userIds: z.array(z.string().uuid()).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    if (data.userIds.length === 0) return {} as Record<string, { display_name: string; emoji: string }>
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: rows, error } = await supabaseAdmin
      .from('aliases')
      .select('user_id, display_name, emoji, avatar_url')
      .in('user_id', data.userIds)
    if (error) return {} as Record<string, { display_name: string; emoji: string }>
    const out: Record<string, { display_name: string; emoji: string }> = {}
    for (const r of rows ?? []) {
      out[(r as { user_id: string }).user_id] = {
        display_name: (r as { display_name: string }).display_name,
        emoji: (r as { emoji: string }).emoji,
        avatar_url: (r as { avatar_url?: string | null }).avatar_url ?? null,
      } as { display_name: string; emoji: string }
    }
    return out
  })
