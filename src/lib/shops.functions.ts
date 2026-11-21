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
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { BUSINESS_TYPE_KEYS, CAMERA_KEYS, COUNTRY_KEYS, LENGTHS, OFFER_KEYS, VOICE_KEYS, type BusinessType, type Camera, type Country, type Length, type Offer, type Voice } from './shops/shop'
import type { ShopMatch } from './shops/places.server'

/** Google lookups one account may make in a Pacific day (a search and the
 *  read of the picked shop each count one). Each can cost money; an owner
 *  setting up needs two, so this leaves room for typos and a second try. */
export const LOOKUPS_A_DAY = 12

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

/** May this account look something up on Google now? Counts the lookup when
 *  it may. A count that cannot be read refuses: a paid service is never
 *  called on a guess. */
async function takeLookup(admin: any, userId: string, kind: 'search' | 'details'): Promise<boolean> {
  const { today } = await import('./bits/tier.server')
  const day = today().day
  const { count, error } = await admin.from('shop_lookups').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('day', day)
  if (error) { console.error('[shops] lookup count failed', error.message); return false }
  if ((count ?? 0) >= LOOKUPS_A_DAY) return false
  const { error: insErr } = await admin.from('shop_lookups').insert({ user_id: userId, kind, day })
  if (insErr) { console.error('[shops] lookup insert failed', insErr.message); return false }
  return true
}

export type FindShopResult =
  | { ok: true; matches: ShopMatch[] }
  | { ok: false; reason: 'off' | 'none' | 'unavailable' | 'slow_down' }

/** The shops on Google matching a name and city, for "Which one is yours?".
 *  Works before sign-up (the visitor's guest session is enough). Every
 *  failure is one the screen answers with "I'll type it in". */
export const findMyShop = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().trim().min(2).max(120), city: z.string().trim().min(1).max(80), country: z.enum(COUNTRY_KEYS) }).parse(d))
  .handler(async ({ data, context }): Promise<FindShopResult> => {
    if (!(await shopsOpen(context))) return { ok: false, reason: 'off' }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    if (!(await takeLookup(admin, userId, 'search'))) return { ok: false, reason: 'slow_down' }
    const { searchShops } = await import('./shops/places.server')
    const r = await searchShops({ name: data.name, city: data.city, country: data.country })
    await track(admin, userId, 'shop_lookup', { kind: 'search', country: data.country, found: r.ok ? r.matches.length : 0, reason: r.ok ? null : r.reason })
    if (r.ok) return { ok: true, matches: r.matches }
    return { ok: false, reason: r.reason === 'none' || r.reason === 'bad_input' ? 'none' : 'unavailable' }
  })

/** What the "Is this your shop?" screen shows for the picked place. */
export type PickedShop = { place_id: string; name: string; address: string; kind: string | null; website: string | null; summary: string | null }
export type PickShopResult = { ok: true; shop: PickedShop } | { ok: false; reason: 'off' | 'none' | 'unavailable' | 'slow_down' }

/** Read the shop the owner picked from the list. Review text is not returned
 *  to the browser and not stored; a later slice reads it on the server to
 *  suggest what the videos can mention. */
export const pickMyShop = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ place_id: z.string().regex(/^[A-Za-z0-9_-]{10,200}$/) }).parse(d))
  .handler(async ({ data, context }): Promise<PickShopResult> => {
    if (!(await shopsOpen(context))) return { ok: false, reason: 'off' }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    if (!(await takeLookup(admin, userId, 'details'))) return { ok: false, reason: 'slow_down' }
    const { shopDetails } = await import('./shops/places.server')
    const r = await shopDetails(data.place_id)
    await track(admin, userId, 'shop_lookup', { kind: 'details', found: r.ok ? 1 : 0, reason: r.ok ? null : r.reason })
    if (!r.ok) return { ok: false, reason: r.reason === 'none' || r.reason === 'bad_input' ? 'none' : 'unavailable' }
    const { place_id, name, address, kind, website, summary } = r.shop
    return { ok: true, shop: { place_id, name, address, kind, website, summary } }
  })

/** One short "your videos can mention" line. */
const Chip = z.string().trim().min(1).max(40)

export const ShopIn = z.object({
  place_id: z.string().regex(/^[A-Za-z0-9_-]{10,200}$/).nullable(),
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(1).max(80),
  country: z.enum(COUNTRY_KEYS),
  address: z.string().trim().max(200).nullable(),
  website: z.string().trim().max(300).nullable(),
  business_type: z.enum(BUSINESS_TYPE_KEYS),
  known_for: z.array(Chip).max(12),
  voice: z.enum(VOICE_KEYS),
  length: z.union([z.literal(LENGTHS[0]), z.literal(LENGTHS[1]), z.literal(LENGTHS[2])]),
  camera: z.enum(CAMERA_KEYS),
  offer: z.enum(OFFER_KEYS),
  offer_text: z.string().trim().max(80),
})

export type Shop = {
  id: string
  place_id: string | null
  name: string
  city: string
  country: Country
  address: string | null
  website: string | null
  business_type: BusinessType
  known_for: string[]
  voice: Voice
  length: Length
  camera: Camera
  offer: Offer
  offer_text: string
  remind: boolean
  created_at: string
}

function shopFromRow(r: any): Shop {
  return {
    id: r.id, place_id: r.place_id ?? null, name: r.name, city: r.city, country: r.country, address: r.address ?? null, website: r.website ?? null,
    business_type: r.business_type, known_for: Array.isArray(r.known_for) ? r.known_for.filter((x: unknown) => typeof x === 'string') : [],
    voice: r.voice, length: r.length, camera: r.camera, offer: r.offer, offer_text: r.offer_text ?? '', remind: !!r.remind, created_at: r.created_at,
  }
}

const SHOP_COLS = 'id, place_id, name, city, country, address, website, business_type, known_for, voice, length, camera, offer, offer_text, remind, created_at'

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
      user_id: userId, place_id: s.place_id, name: s.name, city: s.city, country: s.country, address: s.address || null, website: s.website || null,
      business_type: s.business_type, known_for: uniqueChips(s.known_for), voice: s.voice, length: s.length, camera: s.camera,
      offer: s.offer, offer_text: s.offer === 'none' ? '' : s.offer_text, updated_at: new Date().toISOString(),
    }
    const { data: had } = await admin.from('shops').select('id').eq('user_id', userId).maybeSingle()
    const { data: saved, error } = await admin.from('shops').upsert(row, { onConflict: 'user_id' }).select(SHOP_COLS).single()
    if (error || !saved) { console.error('[shops] save failed', error?.message); return { ok: false, reason: 'failed' } }
    await track(admin, userId, had ? 'shop_updated' : 'shop_saved', { business_type: s.business_type, country: s.country, from_google: !!s.place_id, has_website: !!s.website, chips: row.known_for.length, voice: s.voice, length: s.length, camera: s.camera, offer: s.offer })
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
   skit or a paywall), then the plan's allowance, the Scrubber, the two
   writers and the checks. Three skits come back; the owner picks one, makes
   each line theirs ("Funnier", edit) and goes to film. What's stored: the
   scrubbed day story and the skits. A write that fails never counts. */
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
  return { id: s.id, name: s.name, city: s.city, country: s.country, business_type: s.business_type, known_for: s.known_for, voice: s.voice, length: s.length, camera: s.camera, offer: s.offer, offer_text: s.offer_text }
}

async function usageOf(admin: any, userId: string): Promise<ShopUsage> {
  const { kitTier } = await import('./bits/tier.server')
  const { shopUsage } = await import('./shops/usage.server')
  return shopUsage(admin, userId, await kitTier(admin, userId))
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
    const { guardDay, scrubDay, writeSkits } = await import('./shops/skit.server')
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
    if (!data.again) dayText = await scrubDay(data.day)
    const result = await writeSkits(shop, { day: dayText, promote: data.promote, idea: data.idea, date: pacificDateLine(), avoid })
    if (!result) { await track(admin, userId, 'shop_skits_failed', { again: !!data.again }); return { ok: false, reason: 'failed' } }
    const { today } = await import('./bits/tier.server')
    const { SKIT_PROMPT_VERSION } = await import('./shops/prompts.server')
    const { data: row, error } = await admin.from('shop_skit_sets').insert({
      user_id: userId, shop_id: shop.id, day: today().day, day_text: dayText, promote: data.promote, idea: data.idea,
      skits: result.skits, prompt_version: SKIT_PROMPT_VERSION, tier: usage.tier,
    }).select(SET_COLS).single()
    if (error || !row) { console.error('[shops] skit set insert failed', error?.message); return { ok: false, reason: 'failed' } }
    await track(admin, userId, 'shop_skits_written', { set_id: row.id, again: !!data.again, has_day: !!dayText, has_promote: !!data.promote, idea: !!data.idea, ms: result.ms, tier: usage.tier, voice: shop.voice, length: shop.length, camera: shop.camera, business_type: shop.business_type, model: result.candidates[result.winner]?.model })
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
