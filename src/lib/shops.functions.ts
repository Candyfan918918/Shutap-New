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
