// Shutap for Realtors (Nov 5 2026): the server functions. Dark until the
// realtors flag is on; the lab functions are admin-only and work regardless
// so the founder can rate kits before anyone sees the product.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { readFlags } from './flags'
import { DEFAULT_LISTING_CONTROLS, OUTPUTS, TONES, type Kit, type Listing, type ListingControls } from './realtors/listing'
import type { KitResult } from './realtors/kit.server'

const ControlsIn = z.object({
  tone: z.enum(TONES).optional(),
  roast_house: z.boolean().optional(),
  roast_neighborhood: z.boolean().optional(),
  mention_price: z.boolean().optional(),
  must_say: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
  never_say: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
})

async function requireAdmin(context: unknown): Promise<void> {
  const c = context as { supabase: any; userId: string }
  const { data } = await c.supabase.rpc('has_role', { _user_id: c.userId, _role: 'admin' })
  if (!data) throw new Error('Forbidden')
}

export type ReadListingResult =
  | { ok: true; listing: Listing; how: 'jsonld' | 'og' | 'text' | 'card'; seen?: string }
  | { ok: false; reason: 'bad_url' | 'blocked' | 'fetch_failed' | 'nothing_found' | 'not_a_listing' | 'off'; host?: string; seen?: string }

/** Read a listing from a link or pasted text. Anyone signed in, once the
 *  flag is on; admins always (for the lab). */
export const readListing = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ url: z.string().url().max(2000).optional(), text: z.string().max(12000).optional() }).parse(d))
  .handler(async ({ data, context }): Promise<ReadListingResult> => {
    if (!readFlags().realtors) {
      try { await requireAdmin(context) } catch { return { ok: false, reason: 'off' } }
    }
    const { readListingText, readListingUrl } = await import('./realtors/read.server')
    if (data.text && data.text.trim().length >= 40) return readListingText(data.text)
    if (data.url) return readListingUrl(data.url)
    return { ok: false, reason: 'nothing_found' }
  })

const ListingIn = z.object({
  source: z.string().max(120),
  url: z.string().max(2000).nullable(),
  address: z.string().max(200).nullable(),
  city: z.string().max(80).nullable(),
  price: z.string().max(30).nullable(),
  beds: z.number().nullable(),
  baths: z.number().nullable(),
  sqft: z.number().nullable(),
  year_built: z.number().nullable(),
  hoa: z.string().max(30).nullable().optional(),
  taxes: z.string().max(30).nullable().optional(),
  lot_sqft: z.number().nullable().optional(),
  mls: z.string().max(40).nullable().optional(),
  status: z.string().max(40).nullable().optional(),
  open_houses: z.array(z.string().max(80)).max(10).optional(),
  description: z.string().max(4000),
  photos: z.array(z.string().max(200)).max(30),
  note: z.string().max(600),
})

export type LabKitResult = { ok: true; result: KitResult; eval_id: string | null; prompt_version: string } | { ok: false; reason: 'failed' }

/** Admin only: write a kit from a listing, every candidate shown, nothing
 *  charged, stored in kit_evals for rating. */
export const labWriteKit = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ listing: ListingIn, controls: ControlsIn }).parse(d))
  .handler(async ({ data, context }): Promise<LabKitResult> => {
    await requireAdmin(context)
    const { writeKit } = await import('./realtors/kit.server')
    const { KIT_PROMPT_VERSION } = await import('./realtors/prompts.server')
    const controls: ListingControls = { ...DEFAULT_LISTING_CONTROLS, ...data.controls }
    const result = await writeKit(data.listing as Listing, controls)
    if (!result) return { ok: false, reason: 'failed' }
    let evalId: string | null = null
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
      const { data: row } = await (supabaseAdmin as any)
        .from('kit_evals')
        .insert({ listing: data.listing, controls, result: { kit: result.kit, skipped: result.skipped, winner: result.winner, why: result.why, ms: result.ms, candidates: result.candidates.map((c) => ({ model: c.model, ms: c.ms, checks: c.checks })) }, prompt_version: KIT_PROMPT_VERSION })
        .select('id')
        .single()
      evalId = row?.id ?? null
    } catch (e) {
      console.warn('[kit-lab] eval not stored (table missing?)', e instanceof Error ? e.message : e)
    }
    return { ok: true, result, eval_id: evalId, prompt_version: KIT_PROMPT_VERSION }
  })

/** Admin only: rate a lab kit. */
export const rateLabKit = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ eval_id: z.string().uuid(), rating: z.enum(['pick', 'cut', 'rewrite']), notes: z.string().max(1000).optional() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    await requireAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { error } = await (supabaseAdmin as any).from('kit_evals').update({ rating: data.rating, notes: data.notes ?? null }).eq('id', data.eval_id)
    return { ok: !error }
  })

/** Admin only: the lab's ledger. */
export const labKitEvals = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }): Promise<{ total: number; pick: number; cut: number; rewrite: number; unrated: number; by_version: Record<string, { pick: number; cut: number; rewrite: number }> }> => {
    await requireAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data } = await (supabaseAdmin as any).from('kit_evals').select('rating, prompt_version')
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

export { OUTPUTS, type Kit }

/* ───────────────────────── the product (Nov 6 2026) ─────────────────────────
   Signed-in users, behind the realtors flag. A kit is written for a listing
   (stored with the agent's note and controls), kept as its original version;
   every edit the agent keeps is a version of its own; a rewrite (new tone or
   controls on the same listing) is a new kit and counts like one. Copies and
   PDFs go through chargeKitDownload: one pool with the bit downloads. */
import { resolveTier, today, downloadsUsed, kitTier } from './bits/tier.server'
import { limitFor } from './entitlements'
import type { BitTier } from './bits/shared'

type KitVersionRow = { id: string; kit_id: string; kind: 'original' | 'edited' | 'rewrite'; content: Kit; skipped: { where: string; what: string }[]; created_at: string }
export type KitView = {
  id: string
  listing_id: string
  listing: Listing
  tone: ListingControls['tone']
  controls: ListingControls
  paid: boolean
  created_at: string
  versions: KitVersionRow[]
}
/** credits: kits bought on their own ($12.99) and not yet written. */
export type KitUsage = { tier: BitTier; kits: { used: number; cap: number | null; period: 'month' | 'ever' }; credits: number; downloads: { used: number; cap: number | null; period: 'day' | 'month' } }

export type WriteKitResult =
  | { ok: true; kit: KitView; usage: KitUsage }
  | { ok: false; reason: 'off' | 'sign_in' | 'failed' | 'not_found' }
  | { ok: false; reason: 'limited'; usage: KitUsage }

async function adminDb(): Promise<any> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}

function listingFromRow(r: any): Listing {
  return {
    source: r.source, url: r.url ?? null, address: r.address ?? null, city: r.city ?? null, price: r.price ?? null,
    beds: r.beds === null || r.beds === undefined ? null : Number(r.beds), baths: r.baths === null || r.baths === undefined ? null : Number(r.baths),
    sqft: r.sqft ?? null, year_built: r.year_built ?? null, hoa: r.hoa ?? null, taxes: r.taxes ?? null, lot_sqft: r.lot_sqft ?? null,
    mls: r.mls ?? null, status: r.status ?? null, open_houses: Array.isArray(r.open_houses) ? r.open_houses : [],
    description: r.description ?? '', photos: Array.isArray(r.photos) ? r.photos : [], note: r.note ?? '',
  }
}

async function kitsUsed(admin: any, userId: string, tier: BitTier): Promise<number> {
  const { period } = limitFor('kit', tier)
  let q = admin.from('kits').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('paid', false)
  if (period === 'month') q = q.gte('day', `${today().day.slice(0, 7)}-01`)
  const { count } = await q
  return count ?? 0
}

/** Kits bought before they're written (Nov 6 2026): each paid one-time
 *  checkout of kind kit_prepay is one credit (event kit_prepaid), spent by
 *  the next kit written past the plan's limit (event kit_prepay_used). */
async function kitCredits(admin: any, userId: string): Promise<string[]> {
  const [{ data: paid }, { data: used }] = await Promise.all([
    admin.from('events').select('properties').eq('user_id', userId).eq('name', 'kit_prepaid').limit(200),
    admin.from('events').select('properties').eq('user_id', userId).eq('name', 'kit_prepay_used').limit(200),
  ])
  const spent = new Set((used ?? []).map((r: any) => r.properties?.stripe_session).filter(Boolean))
  return [...new Set((paid ?? []).map((r: any) => r.properties?.stripe_session).filter(Boolean) as string[])].filter((s) => !spent.has(s))
}

async function usageFor(admin: any, userId: string, tier: BitTier): Promise<KitUsage> {
  const k = limitFor('kit', tier)
  const d = limitFor('download', tier)
  const [ku, du, cr] = await Promise.all([kitsUsed(admin, userId, tier).catch(() => 0), downloadsUsed(admin, userId, tier).catch(() => 0), kitCredits(admin, userId).catch(() => [] as string[])])
  return { tier, kits: { used: ku, cap: k.cap, period: k.period === 'ever' ? 'ever' : 'month' }, credits: cr.length, downloads: { used: du, cap: d.cap, period: d.period === 'ever' ? 'day' : d.period } }
}

async function loadKit(admin: any, kitId: string, userId: string): Promise<KitView | null> {
  const { data: k } = await admin.from('kits').select('id, listing_id, user_id, tone, controls, paid, created_at').eq('id', kitId).eq('user_id', userId).maybeSingle()
  if (!k) return null
  const [{ data: l }, { data: vs }] = await Promise.all([
    admin.from('listings').select('*').eq('id', k.listing_id).maybeSingle(),
    admin.from('kit_versions').select('id, kit_id, kind, content, skipped, created_at').eq('kit_id', kitId).order('created_at', { ascending: true }),
  ])
  if (!l) return null
  const controls = { ...DEFAULT_LISTING_CONTROLS, ...(k.controls ?? {}), tone: k.tone } as ListingControls
  return { id: k.id, listing_id: k.listing_id, listing: listingFromRow(l), tone: k.tone, controls, paid: !!k.paid, created_at: k.created_at, versions: (vs ?? []) as KitVersionRow[] }
}

const KitIdIn = z.object({ kit_id: z.string().uuid() })

/** Write a kit: from a listing just read (listing) or an existing one
 *  (listing_id, a rewrite). Counts one kit. The note is scrubbed like a story. */
export const writeRealtorKit = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ listing: ListingIn.optional(), listing_id: z.string().uuid().optional(), controls: ControlsIn }).refine((x) => x.listing || x.listing_id, { message: 'a listing' }).parse(d))
  .handler(async ({ data, context }): Promise<WriteKitResult> => {
    const { userId } = context as { userId: string }
    if (!readFlags().realtors) {
      try { await requireAdmin(context) } catch { return { ok: false, reason: 'off' } }
    }
    const admin = await adminDb()
    const tier = await kitTier(admin, userId)
    const usage = await usageFor(admin, userId, tier)
    // past the plan's limit, a kit bought on its own pays for this one
    let credit: string | null = null
    if (usage.kits.cap !== null && usage.kits.used >= usage.kits.cap) {
      credit = (await kitCredits(admin, userId).catch(() => [] as string[]))[0] ?? null
      if (!credit) return { ok: false, reason: 'limited', usage }
    }
    const controls: ListingControls = { ...DEFAULT_LISTING_CONTROLS, ...data.controls }
    // the listing row: reused on a rewrite, stored on a first write
    let listingId = data.listing_id ?? null
    let listing: Listing
    if (listingId) {
      const { data: l } = await admin.from('listings').select('*').eq('id', listingId).eq('user_id', userId).maybeSingle()
      if (!l) return { ok: false, reason: 'not_found' }
      listing = listingFromRow(l)
      if (data.listing?.note !== undefined) listing.note = data.listing.note
    } else {
      listing = { ...(data.listing as Listing), open_houses: data.listing!.open_houses ?? [], hoa: data.listing!.hoa ?? null, taxes: data.listing!.taxes ?? null, lot_sqft: data.listing!.lot_sqft ?? null, mls: data.listing!.mls ?? null, status: data.listing!.status ?? null }
    }
    // the agent's note is their text: names out before a model or the table sees it
    const { hasContactDetails, runScrub } = await import('./agents/scrubber.functions')
    if (listing.note && hasContactDetails(listing.note)) listing.note = (await runScrub(listing.note)).clean_text
    if (!listingId) {
      const { data: row, error } = await admin.from('listings').insert({
        user_id: userId, source: listing.source, url: listing.url, address: listing.address, city: listing.city, price: listing.price, beds: listing.beds, baths: listing.baths,
        sqft: listing.sqft, year_built: listing.year_built, hoa: listing.hoa, taxes: listing.taxes, lot_sqft: listing.lot_sqft, mls: listing.mls, status: listing.status, open_houses: listing.open_houses,
        description: listing.description, photos: listing.photos, note: listing.note, controls,
      }).select('id').single()
      if (error || !row) return { ok: false, reason: 'failed' }
      listingId = row.id as string
    } else {
      await admin.from('listings').update({ note: listing.note, controls, updated_at: new Date().toISOString() }).eq('id', listingId)
    }
    const { writeKit } = await import('./realtors/kit.server')
    const { KIT_PROMPT_VERSION } = await import('./realtors/prompts.server')
    const result = await writeKit(listing, controls)
    if (!result) return { ok: false, reason: 'failed' }
    const { data: kitRow, error: kErr } = await admin.from('kits').insert({ listing_id: listingId, user_id: userId, tone: controls.tone, prompt_version: KIT_PROMPT_VERSION, controls, day: today().day, paid: !!credit }).select('id').single()
    if (kErr || !kitRow) return { ok: false, reason: 'failed' }
    if (credit) await admin.from('events').insert({ user_id: userId, session_id: null, name: 'kit_prepay_used', properties: { product: 'realtors', kit_id: kitRow.id, stripe_session: credit } as never } as never).then(() => {}, () => {})
    await admin.from('kit_versions').insert({ kit_id: kitRow.id, kind: 'original', content: result.kit, skipped: result.skipped })
    await admin.from('events').insert({ user_id: userId, session_id: null, name: 'kit_written', properties: { product: 'realtors', tone: controls.tone, rewrite: !!data.listing_id, ms: result.ms, tier } as never } as never).then(() => {}, () => {})
    const kit = await loadKit(admin, kitRow.id, userId)
    if (!kit) return { ok: false, reason: 'failed' }
    return { ok: true, kit, usage: await usageFor(admin, userId, tier) }
  })

/** Keep the kit as edited on the page as a version. No model, no charge. */
export const keepKitEdit = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => KitIdIn.extend({ content: z.any() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; version: KitVersionRow } | { ok: false; reason: 'not_found' | 'failed' | 'too_many' }> => {
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const kit = await loadKit(admin, data.kit_id, userId)
    if (!kit) return { ok: false, reason: 'not_found' }
    if (kit.versions.length >= 40) return { ok: false, reason: 'too_many' }
    const content = sanitizeKit(data.content, kit.versions[kit.versions.length - 1]!.content)
    const { hasContactDetails, runScrub } = await import('./agents/scrubber.functions')
    for (const { where, line } of (await import('./realtors/kit.server')).kitLines(content)) {
      if (hasContactDetails(line)) {
        const clean = (await runScrub(line)).clean_text
        replaceLine(content, where, line, clean)
      }
    }
    const { data: row, error } = await admin.from('kit_versions').insert({ kit_id: kit.id, kind: 'edited', content, skipped: [] }).select('id, kit_id, kind, content, skipped, created_at').single()
    if (error || !row) return { ok: false, reason: 'failed' }
    return { ok: true, version: row as KitVersionRow }
  })

/** A kit's content as typed on the page: same shape as the last version,
 *  strings trimmed and capped, nothing else let through. */
function sanitizeKit(input: unknown, base: Kit): Kit {
  const t = (v: unknown, max = 600) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
  const i = (input ?? {}) as any
  const shots = Array.isArray(i?.walkthrough?.shots) ? i.walkthrough.shots : base.walkthrough.shots
  return {
    walkthrough: {
      shots: shots.slice(0, 14).map((s: any, n: number) => ({ where: t(s?.where, 80) || base.walkthrough.shots[n]?.where || '', action: t(s?.action, 240), line: t(s?.line), seconds: t(s?.seconds, 12), ...(s?.fact ? { fact: t(s.fact, 60) } : {}) })),
      cut15: t(i?.walkthrough?.cut15, 300) || base.walkthrough.cut15,
      cut60: t(i?.walkthrough?.cut60, 300) || base.walkthrough.cut60,
    },
    voiceover: (Array.isArray(i?.voiceover) ? i.voiceover : base.voiceover).slice(0, 14).map((x: any) => ({ label: t(x?.label, 60), text: t(x?.text) })).filter((x: any) => x.text),
    hooks: (Array.isArray(i?.hooks) ? i.hooks : base.hooks).slice(0, 6).map((x: any) => ({ line: t(x?.line, 200), move: t(x?.move, 60) })).filter((x: any) => x.line),
    open_house: (Array.isArray(i?.open_house) ? i.open_house : base.open_house).slice(0, 8).map((x: any) => ({ label: t(x?.label, 60), text: t(x?.text, 900) })).filter((x: any) => x.text),
    posts: (Array.isArray(i?.posts) ? i.posts : base.posts).slice(0, 10).map((x: any) => ({ label: t(x?.label, 60), text: t(x?.text, 1200) })).filter((x: any) => x.text),
    straight: t(i?.straight, 2500) || base.straight,
  }
}
function replaceLine(k: Kit, where: string, from: string, to: string) {
  const swap = (s: string) => (s === from ? to : s)
  k.walkthrough.shots.forEach((s) => { s.line = swap(s.line); s.action = swap(s.action) })
  k.walkthrough.cut15 = swap(k.walkthrough.cut15); k.walkthrough.cut60 = swap(k.walkthrough.cut60)
  k.voiceover.forEach((x) => { x.text = swap(x.text) }); k.hooks.forEach((x) => { x.line = swap(x.line) })
  k.open_house.forEach((x) => { x.text = swap(x.text) }); k.posts.forEach((x) => { x.text = swap(x.text) })
  k.straight = swap(k.straight)
  void where
}

export const getRealtorKit = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => KitIdIn.parse(d))
  .handler(async ({ data, context }): Promise<{ kit: KitView | null; usage: KitUsage | null }> => {
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const kit = await loadKit(admin, data.kit_id, userId)
    const tier = await kitTier(admin, userId)
    return { kit, usage: await usageFor(admin, userId, tier) }
  })

export type KitSummary = { id: string; address: string | null; city: string | null; price: string | null; tone: ListingControls['tone']; created_at: string }
export const listMyKits = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }): Promise<{ kits: KitSummary[]; usage: KitUsage }> => {
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const { data: rows } = await admin.from('kits').select('id, tone, created_at, listings(address, city, price)').eq('user_id', userId).order('created_at', { ascending: false }).limit(60)
    const kits: KitSummary[] = (rows ?? []).map((r: any) => ({ id: r.id, address: r.listings?.address ?? null, city: r.listings?.city ?? null, price: r.listings?.price ?? null, tone: r.tone, created_at: r.created_at }))
    const tier = await kitTier(admin, userId)
    return { kits, usage: await usageFor(admin, userId, tier) }
  })

export const KIT_DOWNLOADS = [...OUTPUTS, 'pdf', 'txt'] as const
export type KitDownloadKind = (typeof KIT_DOWNLOADS)[number]

export type KitDownloadCharge =
  | { ok: true; used: number; cap: number | null; watermarked: boolean; tier: BitTier; repeat: boolean }
  | { ok: false; reason: 'sign_in' | 'not_found' | 'failed' }
  | { ok: false; reason: 'limited'; used: number; cap: number; tier: BitTier }

/** One copy, PDF or text file of a kit: never counted on any plan (Nov 6
 *  2026, pay to create, never to use). Logged for admin and PostHog. Free's
 *  unbought kit is marked ("— shutap.com" on every output); Basic, Pro and a
 *  bought kit are clean. */
export const chargeKitDownload = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => KitIdIn.extend({ version_id: z.string().uuid(), output: z.enum(KIT_DOWNLOADS) }).parse(d))
  .handler(async ({ data, context }): Promise<KitDownloadCharge> => {
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const kit = await loadKit(admin, data.kit_id, userId)
    if (!kit) return { ok: false, reason: 'not_found' }
    if (!kit.versions.some((v) => v.id === data.version_id)) return { ok: false, reason: 'not_found' }
    const tier = await kitTier(admin, userId)
    const cap = limitFor('download', tier).cap
    const { day } = today()
    const free = tier === 'free' && !kit.paid
    let used = 0
    try { used = await downloadsUsed(admin, userId, tier) } catch { /* ledger down: let it through */ }
    const { count: same } = await admin.from('kit_downloads').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('version_id', data.version_id).eq('output', data.output).eq('day', day)
    if ((same ?? 0) > 0) return { ok: true, used, cap, watermarked: free, tier, repeat: true }
    const { error } = await admin.from('kit_downloads').insert({ user_id: userId, kit_id: kit.id, version_id: data.version_id, output: data.output, units: 0, tier, watermarked: free, day })
    if (error && String(error.code) !== '23505') console.error('[kit download] ledger', error.message)
    await admin.from('events').insert({ user_id: userId, session_id: null, name: 'download', properties: { product: 'realtors', kind: data.output, tier, watermarked: free, paid: kit.paid, kit_id: kit.id, version_id: data.version_id } as never } as never).then(() => {}, () => {})
    return { ok: true, used, cap, watermarked: free, tier, repeat: false }
  })

export const kitUsage = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }): Promise<KitUsage> => {
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    return usageFor(admin, userId, await kitTier(admin, userId))
  })

export type KitTouchResult =
  | { ok: true; options: { line: string; move: string }[]; used: number; cap: number | null }
  | { ok: false; reason: 'sign_in' | 'not_found' | 'failed' | 'rate_limited' }
  | { ok: false; reason: 'limited'; used: number; cap: number; tier: BitTier }

/** "funnier" on one line of a kit: three versions, the rest untouched.
 *  Unlimited on every plan (Nov 6 2026); a hidden fair-use ceiling only. */
export const touchKitLine = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => KitIdIn.extend({ where: z.string().max(80), context: z.string().max(3000), line: z.string().max(600), avoid: z.array(z.string().max(600)).max(12).optional() }).parse(d))
  .handler(async ({ data, context }): Promise<KitTouchResult> => {
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const kit = await loadKit(admin, data.kit_id, userId)
    if (!kit) return { ok: false, reason: 'not_found' }
    const tier = await kitTier(admin, userId)
    const { chargeBit, refundBit, TOUCH_FAIR_USE } = await import('./bits/usage.server')
    const { day } = today()
    const subject = `touch:${userId}`
    const limit = limitFor('touch', tier)
    const chargeId = crypto.randomUUID()
    let used: number
    try { used = await chargeBit(admin, subject, day, limit.cap ?? TOUCH_FAIR_USE, chargeId) } catch { return { ok: false, reason: 'failed' } }
    if (used === -1) return limit.cap === null ? { ok: false, reason: 'rate_limited' } : { ok: false, reason: 'limited', used: limit.cap, cap: limit.cap, tier }
    const { touchKitLine: touch } = await import('./realtors/kit.server')
    const { hasContactDetails, runScrub } = await import('./agents/scrubber.functions')
    const line = data.line && hasContactDetails(data.line) ? (await runScrub(data.line)).clean_text : data.line
    const options = await touch(kit.listing, kit.controls, data.where, data.context, line, data.avoid ?? [])
    if (!options) { await refundBit(admin, subject, day, chargeId); return { ok: false, reason: 'failed' } }
    await admin.from('events').insert({ user_id: userId, session_id: null, name: 'kit_line_touched', properties: { product: 'realtors', where: data.where, tier } as never } as never).then(() => {}, () => {})
    return { ok: true, options, used, cap: limit.cap }
  })
