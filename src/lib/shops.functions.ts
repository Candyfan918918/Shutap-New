// Shutap for small business (Nov 21 2026): the server functions for the
// owner's shop. Dark until the smallbusiness flag is on; admins can use it
// while it is dark so the founder can test end to end first.
//
// Slice 2: find the shop on Google, read the one the owner picks, save the
// shop and its choices, read it back, switch the reminder. Writing skits and
// making videos come in later slices.
//
// What is stored: the shop's own name, city and "known for" lines, as typed
// (the planned exception to the Scrubber: the owner's own business, which
// the videos name). Nothing Google returned is stored except the place id
// and what the owner confirmed on the "Is this your shop?" screen.
import { LOGO_DATA } from './shops/logo'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { BUSINESS_TYPE_KEYS, CAMERA_KEYS, COUNTRY_KEYS, LENGTHS, OFFER_KEYS, VOICE_KEYS, type BusinessType, type Camera, type Country, type Length, type Offer, type Voice } from './shops/shop'
import type { ShopMatch } from './shops/places.server'

/** Google lookups in a Pacific day (a search and the read of the picked shop
 *  each count one). Each can cost money; an owner setting up needs two. A
 *  visitor who has not signed up yet gets room for one retry; an account
 *  gets room for typos and a change of mind. */
export const LOOKUPS_A_DAY = { guest: 4, account: 12 } as const

async function requireAdmin(context: unknown): Promise<void> {
  const c = context as { supabase: any; userId: string }
  const { data } = await c.supabase.rpc('has_role', { _user_id: c.userId, _role: 'admin' })
  if (!data) throw new Error('Forbidden')
}

async function shopsOpen(context: unknown): Promise<boolean> {
  const { readFlags } = await import('./flags')
  if (readFlags().smallbusiness) return true
  try { await requireAdmin(context); return true } catch { return false }
}

function isAnon(context: unknown): boolean {
  return !!(context as { claims?: { is_anonymous?: boolean } }).claims?.is_anonymous
}

async function adminDb(): Promise<any> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}

async function track(admin: any, userId: string, name: string, properties: Record<string, unknown>): Promise<void> {
  await admin.from('events').insert({ user_id: userId, session_id: null, name, product: 'smallbusiness', properties: { product: 'smallbusiness', ...properties } }).then(() => {}, () => {})
}

/** Who is looking a shop up. The lookup runs before sign-up, so it cannot
 *  require an account: a signed-in owner is named by their account, anyone
 *  else by their browser's guest id. A caller with neither is refused. */
type Looker = { subject: string; userId: string | null }
async function looker(anonSessionId: string | null): Promise<Looker | null> {
  const { resolveJokeIdentity } = await import('./jokes/session.server')
  const id = await resolveJokeIdentity(anonSessionId)
  if (id.userId) return { subject: 'user:' + id.userId, userId: id.userId }
  return id.subjectKey && id.subjectKey !== 'anon:unknown' ? { subject: id.subjectKey, userId: null } : null
}

/** The product is open to this caller: the flag is on, or they are an admin. */
async function shopsOpenFor(admin: any, userId: string | null): Promise<boolean> {
  const { readFlags } = await import('./flags')
  if (readFlags().smallbusiness) return true
  if (!userId) return false
  const { data } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' })
  return !!data
}

/** May this caller look something up on Google now? Counts the lookup when
 *  they may. Guests are also held per network, like guest bits. A count
 *  that cannot be read refuses: a paid service is never called on a guess. */
async function takeLookup(admin: any, who: Looker, kind: 'search' | 'details'): Promise<boolean> {
  const { today } = await import('./bits/tier.server')
  const day = today().day
  const { count, error } = await admin.from('shop_lookups').select('id', { count: 'exact', head: true }).eq('subject', who.subject).eq('day', day)
  if (error) { console.error('[shops] lookup count failed', error.message); return false }
  if ((count ?? 0) >= (who.userId ? LOOKUPS_A_DAY.account : LOOKUPS_A_DAY.guest)) return false
  if (!who.userId) {
    const { chargeNetwork } = await import('./bits/usage.server')
    if ((await chargeNetwork(admin, 'guest', day).catch(() => 'limited' as const)) === 'limited') return false
  }
  const { error: insErr } = await admin.from('shop_lookups').insert({ subject: who.subject, user_id: who.userId, kind, day })
  if (insErr) { console.error('[shops] lookup insert failed', insErr.message); return false }
  return true
}

/** A lookup's event: under the account when there is one, else under the
 *  guest browser's session id. */
async function trackLookup(admin: any, who: Looker, properties: Record<string, unknown>): Promise<void> {
  await admin.from('events').insert({ user_id: who.userId, session_id: who.userId ? null : who.subject.replace(/^anon:/, ''), name: 'shop_lookup', product: 'smallbusiness', properties: { product: 'smallbusiness', ...properties } }).then(() => {}, () => {})
}

export type FindShopResult =
  | { ok: true; matches: ShopMatch[] }
  | { ok: false; reason: 'off' | 'none' | 'unavailable' | 'slow_down' }

/** The shops on Google matching a name and city, for "Which one is yours?".
 *  Works before sign-up: a guest is named by their browser's guest id.
 *  Every failure is one the screen answers with "I'll type it in". */
export const findMyShop = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ name: z.string().trim().min(2).max(120), city: z.string().trim().min(1).max(80), country: z.enum(COUNTRY_KEYS), anon_session_id: z.string().max(64).optional() }).parse(d))
  .handler(async ({ data }): Promise<FindShopResult> => {
    const admin = await adminDb()
    const who = await looker(data.anon_session_id ?? null)
    if (!(await shopsOpenFor(admin, who?.userId ?? null))) return { ok: false, reason: 'off' }
    if (!who) return { ok: false, reason: 'unavailable' }
    if (!(await takeLookup(admin, who, 'search'))) return { ok: false, reason: 'slow_down' }
    const { searchShops } = await import('./shops/places.server')
    const r = await searchShops({ name: data.name, city: data.city, country: data.country })
    await trackLookup(admin, who, { kind: 'search', country: data.country, found: r.ok ? r.matches.length : 0, reason: r.ok ? null : r.reason })
    if (r.ok) return { ok: true, matches: r.matches }
    return { ok: false, reason: r.reason === 'none' || r.reason === 'bad_input' ? 'none' : 'unavailable' }
  })

/** What the "Is this your shop?" screen shows for the picked place. */
export type PickedShop = { place_id: string; name: string; address: string; kind: string | null; website: string | null; summary: string | null }
export type PickShopResult = { ok: true; shop: PickedShop; /** things the listing and its reviews name, for the owner to keep or remove */ suggested: string[] } | { ok: false; reason: 'off' | 'none' | 'unavailable' | 'slow_down' }

/** Read the shop the owner picked from the list. Review text is not returned
 *  to the browser and not stored; a later slice reads it on the server to
 *  suggest what the videos can mention. */
export const pickMyShop = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ place_id: z.string().regex(/^[A-Za-z0-9_-]{10,200}$/), anon_session_id: z.string().max(64).optional() }).parse(d))
  .handler(async ({ data }): Promise<PickShopResult> => {
    const admin = await adminDb()
    const who = await looker(data.anon_session_id ?? null)
    if (!(await shopsOpenFor(admin, who?.userId ?? null))) return { ok: false, reason: 'off' }
    if (!who) return { ok: false, reason: 'unavailable' }
    if (!(await takeLookup(admin, who, 'details'))) return { ok: false, reason: 'slow_down' }
    const { shopDetails } = await import('./shops/places.server')
    const r = await shopDetails(data.place_id)
    await trackLookup(admin, who, { kind: 'details', found: r.ok ? 1 : 0, reason: r.ok ? null : r.reason })
    if (!r.ok) return { ok: false, reason: r.reason === 'none' || r.reason === 'bad_input' ? 'none' : 'unavailable' }
    const { place_id, name, address, kind, website, summary, reviews } = r.shop
    // "Your videos can mention": suggested from the listing and its reviews
    // (read here only, never sent to the browser or stored as text)
    const { suggestKnownFor } = await import('./shops/skit.server')
    const suggested = await suggestKnownFor({ kind, summary, reviews })
    return { ok: true, shop: { place_id, name, address, kind, website, summary }, suggested }
  })

/** One short "your videos can mention" line. */
const Chip = z.string().trim().min(1).max(40)

export const ShopIn = z.object({
  place_id: z.string().regex(/^[A-Za-z0-9_-]{10,200}$/).nullable(),
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(1).max(80),
  country: z.enum(COUNTRY_KEYS),
  address: z.string().trim().max(200).nullable(),
  /** what the listing calls the place ("Japanese restaurant") */
  kind: z.string().trim().max(80).nullable().optional(),
  website: z.string().trim().max(300).nullable(),
  business_type: z.enum(BUSINESS_TYPE_KEYS),
  known_for: z.array(Chip).max(12),
  voice: z.enum(VOICE_KEYS),
  length: z.union([z.literal(LENGTHS[0]), z.literal(LENGTHS[1]), z.literal(LENGTHS[2])]),
  camera: z.enum(CAMERA_KEYS),
  offer: z.enum(OFFER_KEYS),
  offer_text: z.string().trim().max(80),
  /** the owner's own logo photo, made small on their phone; null to leave the logo as it is */
  logo: z.string().max(220_000).regex(LOGO_DATA).nullable().optional(),
  /** true: take the logo off */
  logo_clear: z.boolean().optional(),
})

export type Shop = {
  id: string
  place_id: string | null
  name: string
  city: string
  country: Country
  address: string | null
  kind: string | null
  website: string | null
  business_type: BusinessType
  known_for: string[]
  voice: Voice
  length: Length
  camera: Camera
  offer: Offer
  offer_text: string
  remind: boolean
  /** a data: image for the end of the videos, or null */
  logo: string | null
  logo_from: 'upload' | 'website' | null
  created_at: string
}

function shopFromRow(r: any): Shop {
  return {
    id: r.id, place_id: r.place_id ?? null, name: r.name, city: r.city, country: r.country, address: r.address ?? null, kind: typeof r.kind === 'string' && r.kind ? r.kind : null, website: r.website ?? null,
    business_type: r.business_type, known_for: Array.isArray(r.known_for) ? r.known_for.filter((x: unknown) => typeof x === 'string') : [],
    voice: r.voice, length: r.length, camera: r.camera, offer: r.offer, offer_text: r.offer_text ?? '', remind: !!r.remind, logo: typeof r.logo === 'string' && r.logo ? r.logo : null, logo_from: r.logo_from === 'upload' || r.logo_from === 'website' ? r.logo_from : null, created_at: r.created_at,
  }
}

const SHOP_COLS = 'id, place_id, name, city, country, address, kind, website, business_type, known_for, voice, length, camera, offer, offer_text, remind, logo, logo_from, created_at'

/** The same line twice (any case) is kept once, in the order given. */
function uniqueChips(chips: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of chips) {
    const k = c.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(c)
  }
  return out
}

export type SaveShopResult = { ok: true; shop: Shop } | { ok: false; reason: 'off' | 'sign_in' | 'failed' }

/** Save my shop and its choices (one shop per account; saving again updates
 *  it). Needs a real account: sign-up sits right after "Is this your shop?". */
export const saveMyShop = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ shop: ShopIn }).parse(d))
  .handler(async ({ data, context }): Promise<SaveShopResult> => {
    if (isAnon(context)) return { ok: false, reason: 'sign_in' }
    if (!(await shopsOpen(context))) return { ok: false, reason: 'off' }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const s = data.shop
    const row = {
      user_id: userId, place_id: s.place_id, name: s.name, city: s.city, country: s.country, address: s.address || null, kind: s.place_id ? s.kind || null : null, website: s.website || null,
      business_type: s.business_type, known_for: uniqueChips(s.known_for), voice: s.voice, length: s.length, camera: s.camera,
      offer: s.offer, offer_text: s.offer === 'none' ? '' : s.offer_text, updated_at: new Date().toISOString(),
    }
    const { data: had } = await admin.from('shops').select('id, website, logo, logo_from').eq('user_id', userId).maybeSingle()
    // The logo: the owner's own photo always wins and stays. Otherwise the
    // icon from their website, fetched when there is none yet or the website
    // changed. A site with no icon leaves the end card without a logo.
    const was = had as { website: string | null; logo: string | null; logo_from: string | null } | null
    let logoWhy = 'kept'
    const logo: { logo?: string | null; logo_from?: string | null } = {}
    if (s.logo) { logo.logo = s.logo; logo.logo_from = 'upload'; logoWhy = 'upload' }
    else if (s.logo_clear) { logo.logo = null; logo.logo_from = null; logoWhy = 'cleared' }
    if (!s.logo && (s.logo_clear || was?.logo_from !== 'upload') && row.website && (s.logo_clear || !was?.logo || was.website !== row.website)) {
      const { fetchSiteLogo } = await import('./shops/logo.server')
      const got = await fetchSiteLogo(row.website)
      logoWhy = got.why
      if (got.logo) { logo.logo = got.logo; logo.logo_from = 'website' }
      else if (was?.logo_from === 'website' && was.website !== row.website) { logo.logo = null; logo.logo_from = null }
    } else if (!s.logo && !row.website && was?.logo_from === 'website') { logo.logo = null; logo.logo_from = null; logoWhy = 'no_site' }
    const { data: saved, error } = await admin.from('shops').upsert({ ...row, ...logo }, { onConflict: 'user_id' }).select(SHOP_COLS).single()
    if (error || !saved) { console.error('[shops] save failed', error?.message); return { ok: false, reason: 'failed' } }
    await track(admin, userId, had ? 'shop_updated' : 'shop_saved', { business_type: s.business_type, country: s.country, from_google: !!s.place_id, has_website: !!s.website, chips: row.known_for.length, voice: s.voice, length: s.length, camera: s.camera, offer: s.offer, logo: logoWhy, has_logo: !!(saved as { logo?: string | null }).logo })
    return { ok: true, shop: shopFromRow(saved) }
  })

/** My shop, or null before setup. `open` is false while the product is dark
 *  for this person. */
export const getMyShop = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }): Promise<{ open: boolean; shop: Shop | null }> => {
    const open = await shopsOpen(context)
    if (!open || isAnon(context)) return { open, shop: null }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const { data, error } = await admin.from('shops').select(SHOP_COLS).eq('user_id', userId).maybeSingle()
    if (error) console.error('[shops] read failed', error.message)
    return { open, shop: data ? shopFromRow(data) : null }
  })

/** "Remind me tomorrow", on or off. The reminder is an email to the sign-up
 *  address and goes only while this is on. */
export const setShopReminder = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ on: z.boolean() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; remind: boolean }> => {
    if (isAnon(context) || !(await shopsOpen(context))) return { ok: false, remind: false }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const { data: row, error } = await admin.from('shops').update({ remind: data.on, updated_at: new Date().toISOString() }).eq('user_id', userId).select('remind').maybeSingle()
    if (error || !row) return { ok: false, remind: false }
    await track(admin, userId, 'shop_reminder_set', { on: data.on })
    return { ok: true, remind: !!row.remind }
  })

/* ───────────────────────── the skits (slice 3, Nov 21 2026) ─────────────────────────
   Signed-in owners with a saved shop. The owner says what happened (or
   nothing: "Surprise me"); the Guard reads it first (a crisis never sees a
   skit or a paywall), then the plan's allowance, the two writers and the
   checks. The writer sees the owner's day as typed, the founder's rated
   JokeNet lines nearest it, and today's topics from the site's daily list.
   Three skits come back; the owner picks one, makes each line theirs
   ("Funnier", edit) and goes to film. What's stored: the day story as typed
   and the skits. A write that fails never counts. */
import { LINE_KEYS, type LineKey, type Skit } from './shops/skit'
import type { ShopUsage } from './shops/allowance'
import type { SkitShop } from './shops/skit.server'

export type SkitSet = {
  id: string
  day: string
  skits: Skit[]
  picked: number | null
  /** the lines as the owner left them, by line key; a key not here is as written */
  lines: Partial<Record<LineKey, string>>
  created_at: string
}

const SET_COLS = 'id, day, skits, picked, lines, created_at'

function setFromRow(r: any): SkitSet {
  const lines: Partial<Record<LineKey, string>> = {}
  for (const k of LINE_KEYS) if (typeof r.lines?.[k] === 'string' && r.lines[k].trim()) lines[k] = r.lines[k]
  return { id: r.id, day: r.day, skits: Array.isArray(r.skits) ? r.skits : [], picked: typeof r.picked === 'number' ? r.picked : null, lines, created_at: r.created_at }
}

async function myShopRow(admin: any, userId: string): Promise<(SkitShop & { id: string }) | null> {
  const { data } = await admin.from('shops').select(SHOP_COLS).eq('user_id', userId).maybeSingle()
  if (!data) return null
  const s = shopFromRow(data)
  return { id: s.id, name: s.name, city: s.city, country: s.country, business_type: s.business_type, kind: s.kind, known_for: s.known_for, voice: s.voice, length: s.length, camera: s.camera, offer: s.offer, offer_text: s.offer_text }
}

async function usageOf(admin: any, userId: string): Promise<ShopUsage> {
  const { kitTier } = await import('./bits/tier.server')
  const { shopUsage } = await import('./shops/usage.server')
  const usage = await shopUsage(admin, userId, await kitTier(admin, userId))
  // The founder tests on the live site all day: an admin account is never
  // stopped by the video limit or the skits-a-day limit. Everything is still
  // counted and still looks like their real plan (the Free mark included).
  const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' })
  return isAdmin ? { ...usage, videos: { ...usage.videos, cap: null }, sets_cap: 500 } : usage
}

/** "Sat, Nov 21 2026" in Los Angeles, for the writer's calendar skit. */
function pacificDateLine(): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())
}

export type WriteSkitsResult =
  | { ok: true; set: SkitSet; usage: ShopUsage }
  | { ok: false; reason: 'off' | 'sign_in' | 'no_shop' | 'crisis' | 'failed' }
  | { ok: false; reason: 'limited' | 'enough_today'; usage: ShopUsage }

/** Draft my three skits for today. `day` is what happened, in the owner's
 *  words (empty for "Surprise me"); `again` asks for three different ones
 *  from the same ask. Skits are free to write; a finished video is what the
 *  plan counts. */
export const writeMySkits = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ day: z.string().max(600), promote: z.string().trim().max(120), idea: z.string().trim().max(80), again: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }): Promise<WriteSkitsResult> => {
    if (isAnon(context)) return { ok: false, reason: 'sign_in' }
    if (!(await shopsOpen(context))) return { ok: false, reason: 'off' }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const shop = await myShopRow(admin, userId)
    if (!shop) return { ok: false, reason: 'no_shop' }
    const { guardDay, keepDay, writeSkits } = await import('./shops/skit.server')
    // the Guard overrides everything: no paywall, no skit
    const guard = await guardDay(data.day)
    if (guard.crisis) {
      await track(admin, userId, 'shop_guard_blocked', { category: guard.category })
      return { ok: false, reason: 'crisis' }
    }
    let usage: ShopUsage
    try { usage = await usageOf(admin, userId) } catch (e) { console.error('[shops] usage read failed', e instanceof Error ? e.message : e); return { ok: false, reason: 'failed' } }
    const { skitAllowance } = await import('./shops/allowance')
    const allow = skitAllowance(usage)
    if (!allow.ok) {
      await track(admin, userId, 'shop_limit_reached', { reason: allow.reason, tier: usage.tier, videos_used: usage.videos.used })
      return { ok: false, reason: allow.reason, usage }
    }
    // "Show 3 different ones": the same ask, told what was already shown
    let avoid: string[] = []
    let dayText = ''
    if (data.again) {
      const { data: prev } = await admin.from('shop_skit_sets').select('day_text, skits').eq('id', data.again).eq('user_id', userId).maybeSingle()
      if (prev) {
        dayText = prev.day_text ?? ''
        avoid = (Array.isArray(prev.skits) ? prev.skits : []).map((s: any) => `${s?.title}: ${s?.pitch}`).filter((x: string) => x.length > 3)
      }
    }
    if (!data.again) dayText = keepDay(data.day)
    const { today } = await import('./bits/tier.server')
    const { todaysTopics } = await import('./shops/topics.server')
    const topics = await todaysTopics(admin, today().day)
    const result = await writeSkits(shop, { day: dayText, promote: data.promote, idea: data.idea, date: pacificDateLine(), avoid, topics })
    if (!result) { await track(admin, userId, 'shop_skits_failed', { again: !!data.again }); return { ok: false, reason: 'failed' } }
    const { SKIT_PROMPT_VERSION } = await import('./shops/prompts.server')
    const { data: row, error } = await admin.from('shop_skit_sets').insert({
      user_id: userId, shop_id: shop.id, day: today().day, day_text: dayText, promote: data.promote, idea: data.idea,
      skits: result.skits, prompt_version: SKIT_PROMPT_VERSION, tier: usage.tier,
    }).select(SET_COLS).single()
    if (error || !row) { console.error('[shops] skit set insert failed', error?.message); return { ok: false, reason: 'failed' } }
    await track(admin, userId, 'shop_skits_written', { set_id: row.id, again: !!data.again, has_day: !!dayText, has_promote: !!data.promote, idea: !!data.idea, ms: result.ms, standard: result.standard, topics: topics.length, tier: usage.tier, voice: shop.voice, length: shop.length, camera: shop.camera, business_type: shop.business_type, model: [...new Set(result.pick.from.map((f) => result.candidates[f]?.model))].join(' + '), judge: result.pick.judge, clean: result.pick.clean, drafts: result.candidates.map((c) => `${c.model}:${c.checks.length ? 'broke ' + c.checks.length : 'clean'}`).join(', ').slice(0, 200), lost: result.lost.join('; ').slice(0, 200) })
    return { ok: true, set: setFromRow(row), usage: { ...usage, sets_today: usage.sets_today + 1 } }
  })

/** Today's skits, newest first, and where the plan stands: for the
 *  returning owner's page and for coming back to film later. */
export const getMySkits = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }): Promise<{ open: boolean; sets: SkitSet[]; usage: ShopUsage | null }> => {
    const open = await shopsOpen(context)
    if (!open || isAnon(context)) return { open, sets: [], usage: null }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const { today } = await import('./bits/tier.server')
    const [{ data }, usage] = await Promise.all([
      admin.from('shop_skit_sets').select(SET_COLS).eq('user_id', userId).eq('day', today().day).order('created_at', { ascending: false }).limit(8),
      usageOf(admin, userId).catch(() => null),
    ])
    return { open, sets: (data ?? []).map(setFromRow), usage }
  })

/** Pick one of the three. Picking again (the other one after all) clears
 *  the lines kept for the first. */
export const pickMySkit = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ set_id: z.string().uuid(), index: z.number().int().min(0).max(2) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; set: SkitSet | null }> => {
    if (isAnon(context) || !(await shopsOpen(context))) return { ok: false, set: null }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const { data: had } = await admin.from('shop_skit_sets').select('picked, skits').eq('id', data.set_id).eq('user_id', userId).maybeSingle()
    if (!had || !Array.isArray(had.skits) || !had.skits[data.index]) return { ok: false, set: null }
    const patch: Record<string, unknown> = { picked: data.index, updated_at: new Date().toISOString() }
    if (had.picked !== data.index) patch['lines'] = {}
    const { data: row, error } = await admin.from('shop_skit_sets').update(patch).eq('id', data.set_id).eq('user_id', userId).select(SET_COLS).single()
    if (error || !row) return { ok: false, set: null }
    await track(admin, userId, 'shop_skit_picked', { set_id: data.set_id, index: data.index, source: had.skits[data.index]?.source })
    return { ok: true, set: setFromRow(row) }
  })

async function pickedSkit(admin: any, userId: string, setId: string): Promise<{ skit: Skit; lines: Partial<Record<LineKey, string>> } | null> {
  const { data } = await admin.from('shop_skit_sets').select(SET_COLS).eq('id', setId).eq('user_id', userId).maybeSingle()
  if (!data) return null
  const set = setFromRow(data)
  const skit = set.picked === null ? null : set.skits[set.picked]
  return skit ? { skit, lines: set.lines } : null
}

export type KeepLineResult = { ok: true; set: SkitSet } | { ok: false; reason: 'off' | 'not_found' | 'rule'; rule?: string }

/** Keep a line the owner edited, or a "funnier" version they chose. The
 *  same checks as the original line; the owner's own words otherwise stand. */
export const keepSkitLine = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ set_id: z.string().uuid(), key: z.enum(LINE_KEYS), text: z.string().trim().min(1).max(200), how: z.enum(['edit', 'funnier']) }).parse(d))
  .handler(async ({ data, context }): Promise<KeepLineResult> => {
    if (isAnon(context) || !(await shopsOpen(context))) return { ok: false, reason: 'off' }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const [mine, shop] = await Promise.all([pickedSkit(admin, userId, data.set_id), myShopRow(admin, userId)])
    if (!mine || !shop) return { ok: false, reason: 'not_found' }
    const { checkLine } = await import('./shops/skit')
    // an owner typing their own line may name their own price or offer
    const rule = checkLine(data.key, data.text, { length: shop.length, camera: shop.camera, hasDay: true, ownWords: data.text })
    if (rule) return { ok: false, reason: 'rule', rule }
    const lines = { ...mine.lines, [data.key]: data.text }
    const { data: row, error } = await admin.from('shop_skit_sets').update({ lines, updated_at: new Date().toISOString() }).eq('id', data.set_id).eq('user_id', userId).select(SET_COLS).single()
    if (error || !row) return { ok: false, reason: 'not_found' }
    await track(admin, userId, data.how === 'edit' ? 'shop_line_edited' : 'shop_line_funnier_kept', { set_id: data.set_id, key: data.key })
    return { ok: true, set: setFromRow(row) }
  })

/** Funnier taps one account may make in a Pacific day (each is a model call). */
export const TOUCHES_A_DAY = 40

export type TouchLineResult = { ok: true; options: string[] } | { ok: false; reason: 'off' | 'not_found' | 'failed' | 'enough_today' }

/** "Funnier" on the hook or one shot's text: up to three other versions.
 *  The code word line is the owner's own offer and is edited, not rewritten. */
export const touchMySkitLine = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ set_id: z.string().uuid(), key: z.enum(['hook', 'shot1', 'shot2', 'shot3']), tried: z.array(z.string().max(200)).max(12) }).parse(d))
  .handler(async ({ data, context }): Promise<TouchLineResult> => {
    if (isAnon(context) || !(await shopsOpen(context))) return { ok: false, reason: 'off' }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const [mine, shop] = await Promise.all([pickedSkit(admin, userId, data.set_id), myShopRow(admin, userId)])
    if (!mine || !shop) return { ok: false, reason: 'not_found' }
    const { today } = await import('./bits/tier.server')
    const { count } = await admin.from('events').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('name', 'shop_line_funnier').gte('created_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    if ((count ?? 0) >= TOUCHES_A_DAY) return { ok: false, reason: 'enough_today' }
    const { touchSkitLine, contextFor } = await import('./shops/skit.server')
    const current = mine.lines[data.key] ?? (data.key === 'hook' ? mine.skit.hook : mine.skit.shots[Number(data.key.slice(-1)) - 1]?.text ?? '')
    const { data: setRow } = await admin.from('shop_skit_sets').select('day_text, promote').eq('id', data.set_id).eq('user_id', userId).maybeSingle()
    const options = await touchSkitLine(shop, mine.skit, data.key, current, data.tried, contextFor(shop, { day: setRow?.day_text ?? '', promote: setRow?.promote ?? '' }))
    await track(admin, userId, 'shop_line_funnier', { set_id: data.set_id, key: data.key, got: options?.length ?? 0, day: today().day })
    return options ? { ok: true, options } : { ok: false, reason: 'failed' }
  })

/* ───────────────────────── the lab (Nov 21 2026) ─────────────────────────
   Admin only, and it works while the product is dark: the founder types a
   shop and a day, sees every candidate set with what the checks flagged, and
   rates it pick / cut / rewrite. Nothing is counted and nothing is shown to
   anyone else. The lab runs the real writer (the two models and the checks)
   but not the Guard: it is the founder's own test text. */
import type { SkitDraft } from './shops/skit.server'

const LabShopIn = z.object({
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(1).max(80),
  country: z.enum(COUNTRY_KEYS),
  business_type: z.enum(BUSINESS_TYPE_KEYS),
  known_for: z.array(Chip).max(12),
  voice: z.enum(VOICE_KEYS),
  length: z.union([z.literal(LENGTHS[0]), z.literal(LENGTHS[1]), z.literal(LENGTHS[2])]),
  camera: z.enum(CAMERA_KEYS),
  offer: z.enum(OFFER_KEYS),
  offer_text: z.string().trim().max(80),
})
const LabAskIn = z.object({ day: z.string().trim().max(600), promote: z.string().trim().max(120), idea: z.string().trim().max(80), topics: z.array(z.string().trim().min(1).max(120)).max(6) })

export type LabSkitsResult =
  | { ok: true; eval_id: string | null; prompt_version: string; ms: number; winner: number; candidates: SkitDraft[]; standard: 'jokenet' | 'static'; topics: string[] }
  | { ok: false; reason: 'failed'; candidates: SkitDraft[]; standard: 'jokenet' | 'static'; topics: string[] }

/** Admin only: write the three skits for a shop typed into the lab. Every
 *  candidate comes back, including the ones the checks rejected. */
export const labWriteSkits = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ shop: LabShopIn, ask: LabAskIn }).parse(d))
  .handler(async ({ data, context }): Promise<LabSkitsResult> => {
    await requireAdmin(context)
    const { writeSkitsLab } = await import('./shops/skit.server')
    const { SKIT_PROMPT_VERSION } = await import('./shops/prompts.server')
    // an empty topics box means "what an owner would get": today's list
    let topics = data.ask.topics
    if (!topics.length) {
      const { today } = await import('./bits/tier.server')
      const { todaysTopics } = await import('./shops/topics.server')
      topics = await todaysTopics(await adminDb(), today().day)
    }
    const r = await writeSkitsLab(data.shop as SkitShop, { ...data.ask, topics, date: pacificDateLine(), avoid: [] })
    if (r.winner < 0) return { ok: false, reason: 'failed', candidates: r.candidates, standard: r.standard, topics }
    let evalId: string | null = null
    try {
      const admin = await adminDb()
      const { data: row } = await admin.from('skit_evals').insert({ shop: data.shop, ask: { ...data.ask, topics }, result: { winner: r.winner, ms: r.ms, standard: r.standard, candidates: r.candidates }, prompt_version: SKIT_PROMPT_VERSION }).select('id').single()
      evalId = row?.id ?? null
    } catch (e) {
      console.warn('[smallbusiness-lab] eval not stored (table missing?)', e instanceof Error ? e.message : e)
    }
    return { ok: true, eval_id: evalId, prompt_version: SKIT_PROMPT_VERSION, ms: r.ms, winner: r.winner, candidates: r.candidates, standard: r.standard, topics }
  })

/** Admin only: rate a lab run. */
export const rateLabSkits = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ eval_id: z.string().uuid(), rating: z.enum(['pick', 'cut', 'rewrite']), notes: z.string().max(1000).optional() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    await requireAdmin(context)
    const admin = await adminDb()
    const { error } = await admin.from('skit_evals').update({ rating: data.rating, notes: data.notes ?? null }).eq('id', data.eval_id)
    return { ok: !error }
  })

/** Admin only: the lab's ledger. */
export const labSkitEvals = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }): Promise<{ total: number; pick: number; cut: number; rewrite: number; unrated: number; by_version: Record<string, { pick: number; cut: number; rewrite: number }> }> => {
    await requireAdmin(context)
    const admin = await adminDb()
    const { data } = await admin.from('skit_evals').select('rating, prompt_version')
    const rows: { rating: string | null; prompt_version: string }[] = data ?? []
    const by: Record<string, { pick: number; cut: number; rewrite: number }> = {}
    let pick = 0, cut = 0, rewrite = 0, unrated = 0
    for (const r of rows) {
      by[r.prompt_version] ??= { pick: 0, cut: 0, rewrite: 0 }
      if (r.rating === 'pick') { pick++; by[r.prompt_version]!.pick++ }
      else if (r.rating === 'cut') { cut++; by[r.prompt_version]!.cut++ }
      else if (r.rating === 'rewrite') { rewrite++; by[r.prompt_version]!.rewrite++ }
      else unrated++
    }
    return { total: rows.length, pick, cut, rewrite, unrated, by_version: by }
  })

/* ───────────────────────── the video (slice 5, Nov 21 2026) ─────────────────────────
   The video is made on the owner's phone from the three clips they filmed;
   nothing is uploaded in this slice. A finished video is what the plan
   counts, so making one is recorded here (and where the week is counted
   from: a save or a send each mark the video as posted). */
export type ShopVideo = { id: string; title: string; day: string; delete_on: string; saved: boolean; sent_tiktok: boolean; created_at: string }
/** A video in My creations: `url` is a link to the owner's own file, good for
 *  an hour; null while it is still on its way up or was never stored. */
export type Creation = ShopVideo & { url: string | null; ext: 'mp4' | 'webm' | null; deletes: { text: string; soon: boolean } }
const VIDEO_COLS = 'id, title, day, delete_on, saved, sent_tiktok, created_at'

export type RecordVideoResult = { ok: true; video: ShopVideo; usage: ShopUsage } | { ok: false; reason: 'off' | 'not_found' | 'failed' }

/** A video was made from this skit. Counts one video on the owner's plan.
 *  Making the same skit's video again the same day (a re-film, another text
 *  style) is the same video and is not counted twice. */
export const recordMyVideo = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ set_id: z.string().uuid(), seconds: z.number().min(0).max(120), ext: z.enum(['mp4', 'webm']), audio: z.boolean(), facing: z.enum(['front', 'back']) }).parse(d))
  .handler(async ({ data, context }): Promise<RecordVideoResult> => {
    if (isAnon(context) || !(await shopsOpen(context))) return { ok: false, reason: 'off' }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const [mine, shop] = await Promise.all([pickedSkit(admin, userId, data.set_id), myShopRow(admin, userId)])
    if (!mine || !shop) return { ok: false, reason: 'not_found' }
    const { today, kitTier } = await import('./bits/tier.server')
    const { deleteDay } = await import('./shops/shop')
    const day = today().day
    const { data: had } = await admin.from('shop_videos').select(VIDEO_COLS).eq('user_id', userId).eq('skit_set_id', data.set_id).eq('day', day).maybeSingle()
    let row = had
    if (!row) {
      const tier = await kitTier(admin, userId)
      const ins = await admin.from('shop_videos').insert({ user_id: userId, shop_id: shop.id, skit_set_id: data.set_id, title: mine.skit.title.slice(0, 120), day, delete_on: deleteDay(day), tier }).select(VIDEO_COLS).single()
      if (ins.error || !ins.data) { console.error('[shops] video insert failed', ins.error?.message); return { ok: false, reason: 'failed' } }
      row = ins.data
    }
    await track(admin, userId, 'shop_video_made', { set_id: data.set_id, video_id: row.id, again: !!had, seconds: data.seconds, ext: data.ext, audio: data.audio, facing: data.facing, length: shop.length, camera: shop.camera })
    return { ok: true, video: row as ShopVideo, usage: await usageOf(admin, userId) }
  })

/** The owner saved the video to their phone (or shared it from the share
 *  sheet). Shutap cannot see whether it was posted: the week's count trusts
 *  the owner. */
export const markMyVideo = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ video_id: z.string().uuid(), how: z.enum(['saved', 'shared']) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    if (isAnon(context) || !(await shopsOpen(context))) return { ok: false }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const { data: row, error } = await admin.from('shop_videos').update({ saved: true }).eq('id', data.video_id).eq('user_id', userId).select('id').maybeSingle()
    if (error || !row) return { ok: false }
    await track(admin, userId, 'shop_video_saved', { video_id: data.video_id, how: data.how })
    return { ok: true }
  })

/** Something on the film screen that only the browser knows about (the
 *  camera was refused, the phone could not put the video together): counted
 *  so the admin funnel shows where owners stop. */
export const noteFilmProblem = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ what: z.enum(['camera_blocked', 'no_camera', 'cannot_record', 'cannot_compose', 'compose_failed', 'clips_saved', 'not_stored']), detail: z.string().max(200).optional() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    if (isAnon(context)) return { ok: false }
    const { userId } = context as { userId: string }
    await track(await adminDb(), userId, 'shop_film_problem', { what: data.what, detail: data.detail ?? null })
    return { ok: true }
  })

/* ───────────────────────── My creations (Nov 21 2026) ─────────────────────────
   The finished video is kept 30 days in a private bucket so the owner can
   download it again; then the nightly job deletes it. The phone uploads it
   straight to storage with a one-time link made here. Only the owner is ever
   given a link to their file. They can delete one themselves at any time. */

/** A one-time link the phone uploads the finished video to. Making the same
 *  video again (another text style) replaces the file. */
export const videoUploadLink = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ video_id: z.string().uuid(), ext: z.enum(['mp4', 'webm']) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; path: string; token: string } | { ok: false }> => {
    if (isAnon(context) || !(await shopsOpen(context))) return { ok: false }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const { data: row } = await admin.from('shop_videos').select('id, storage_path').eq('id', data.video_id).eq('user_id', userId).is('deleted_at', null).maybeSingle()
    if (!row) return { ok: false }
    const { VIDEO_BUCKET, videoPath } = await import('./shops/creations.server')
    const path = videoPath(userId, data.video_id, data.ext)
    const old = (row as { storage_path: string | null }).storage_path
    if (old && old !== path) await admin.storage.from(VIDEO_BUCKET).remove([old])
    const link = await admin.storage.from(VIDEO_BUCKET).createSignedUploadUrl(path, { upsert: true })
    if (link.error || !link.data) { console.error('[shops] upload link failed', link.error?.message); return { ok: false } }
    return { ok: true, path, token: link.data.token }
  })

/** The upload finished: remember where the file is. */
export const videoStored = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ video_id: z.string().uuid(), ext: z.enum(['mp4', 'webm']), bytes: z.number().int().min(1).max(90_000_000) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    if (isAnon(context) || !(await shopsOpen(context))) return { ok: false }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const { videoPath } = await import('./shops/creations.server')
    const { data: row, error } = await admin.from('shop_videos').update({ storage_path: videoPath(userId, data.video_id, data.ext) }).eq('id', data.video_id).eq('user_id', userId).is('deleted_at', null).select('id').maybeSingle()
    if (error || !row) return { ok: false }
    await track(admin, userId, 'shop_video_stored', { video_id: data.video_id, ext: data.ext, mb: Math.round(data.bytes / 104857.6) / 10 })
    return { ok: true }
  })

/** My creations: every video still kept, newest first, each with the day it
 *  will be deleted and an hour-long link to the owner's own file. */
export const getMyCreations = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }): Promise<{ ok: boolean; videos: Creation[] }> => {
    if (isAnon(context) || !(await shopsOpen(context))) return { ok: false, videos: [] }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const { today } = await import('./bits/tier.server')
    const { deleteLabel } = await import('./shops/shop')
    const { VIDEO_BUCKET } = await import('./shops/creations.server')
    const day = today().day
    const { data, error } = await admin.from('shop_videos').select(`${VIDEO_COLS}, storage_path`).eq('user_id', userId).is('deleted_at', null).gt('delete_on', day).order('created_at', { ascending: false }).limit(60)
    if (error) { console.error('[shops] creations read failed', error.message); return { ok: false, videos: [] } }
    const rows = (data ?? []) as (ShopVideo & { storage_path: string | null })[]
    const paths = rows.map((r) => r.storage_path).filter((p): p is string => !!p)
    const links = new Map<string, string>()
    if (paths.length) {
      const signed = await admin.storage.from(VIDEO_BUCKET).createSignedUrls(paths, 3600)
      for (const x of signed.data ?? []) if (x.path && x.signedUrl) links.set(x.path, x.signedUrl)
    }
    return { ok: true, videos: rows.map(({ storage_path, ...v }) => ({ ...v, url: storage_path ? links.get(storage_path) ?? null : null, ext: storage_path ? (storage_path.endsWith('.webm') ? 'webm' : 'mp4') : null, deletes: deleteLabel(v.day, day) })) }
  })

/** The owner deletes one of their videos now. The file goes; the row stays
 *  marked, so a Free or Basic video that was made still counts as made. */
export const deleteMyVideo = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ video_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    if (isAnon(context) || !(await shopsOpen(context))) return { ok: false }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const { data: row } = await admin.from('shop_videos').select('id, storage_path').eq('id', data.video_id).eq('user_id', userId).is('deleted_at', null).maybeSingle()
    if (!row) return { ok: false }
    const path = (row as { storage_path: string | null }).storage_path
    const { VIDEO_BUCKET } = await import('./shops/creations.server')
    if (path) { const rm = await admin.storage.from(VIDEO_BUCKET).remove([path]); if (rm.error) { console.error('[shops] video delete failed', rm.error.message); return { ok: false } } }
    const up = await admin.from('shop_videos').update({ deleted_at: new Date().toISOString(), storage_path: null }).eq('id', data.video_id).eq('user_id', userId)
    if (up.error) return { ok: false }
    await track(admin, userId, 'shop_video_deleted', { video_id: data.video_id, by: 'owner' })
    return { ok: true }
  })

/* ───────────────────────── Your week (Nov 21 2026) ─────────────────────────
   The goal is 3 videos a week; 5 earns the badge. A video counts once the
   owner saved it to post (Shutap cannot see a post, so the count trusts the
   save). The code-word counter is the owner's own tally: they tap +1 when a
   customer says it. */
export type MyWeek = { posted: number; goalMet: boolean; badge: boolean; toGoal: number; toBadge: number; code_says: number; remind: boolean; has_code: boolean }

async function weekOf(admin: any, userId: string): Promise<MyWeek | null> {
  const { today } = await import('./bits/tier.server')
  const { weekStart, weekStatus } = await import('./shops/shop')
  const { data: shop } = await admin.from('shops').select('remind, code_says, offer').eq('user_id', userId).maybeSingle()
  if (!shop) return null
  const { count } = await admin.from('shop_videos').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('saved', true).gte('day', weekStart(today().day))
  return { ...weekStatus(count ?? 0), code_says: Number(shop.code_says ?? 0), remind: !!shop.remind, has_code: shop.offer !== 'none' }
}

export const getMyWeek = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }): Promise<{ ok: boolean; week: MyWeek | null }> => {
    if (isAnon(context) || !(await shopsOpen(context))) return { ok: false, week: null }
    const { userId } = context as { userId: string }
    const week = await weekOf(await adminDb(), userId)
    return { ok: !!week, week }
  })

/** A customer said the code word (+1), or the owner tapped by mistake (-1). */
export const countCodeWord = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ by: z.union([z.literal(1), z.literal(-1)]) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean; code_says: number }> => {
    if (isAnon(context) || !(await shopsOpen(context))) return { ok: false, code_says: 0 }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const { data: shop } = await admin.from('shops').select('code_says').eq('user_id', userId).maybeSingle()
    if (!shop) return { ok: false, code_says: 0 }
    const next = Math.max(0, Math.min(100000, Number(shop.code_says ?? 0) + data.by))
    const { error } = await admin.from('shops').update({ code_says: next }).eq('user_id', userId)
    if (error) return { ok: false, code_says: Number(shop.code_says ?? 0) }
    await track(admin, userId, 'shop_code_said', { by: data.by, total: next })
    return { ok: true, code_says: next }
  })
