// Server functions for bits: write one from a story, make versions, swap a
// tag, read one back, list the caller's set list.
//
// Order on every write: the day's budget first (nothing is scrubbed,
// classified or stored past a spent budget), then the Scrubber (the raw text
// is never stored), then the Guard (a crisis overrides everything: no bit,
// no paywall, the help block). The premise pass starts beside the Guard to
// save time; if the Guard fires, its result is thrown away unread.
//
// Bits are server-only rows. Ownership is checked here: the signed-in user,
// or the guest's own anon session. A guest gets the hook and setup; the tags
// and button stay masked until they sign in.
import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'
import { hasContactDetails, runScrub } from './agents/scrubber.functions'
import { runClassifyCrisis } from './agents/guard.functions'
import { resolveJokeIdentity, resolveDayInfo, type JokeIdentity } from './jokes/session.server'
import { heatFor, varyBitDraft, writeBitFromStory, type BitFailure } from './bits/pipeline.server'
import { chargeNetwork, chargeStory, readCounter, refundStory, usageFrom } from './bits/usage.server'
import {
  AUDIENCES,
  DEFAULT_CONTROLS,
  LENGTHS,
  VARY_KINDS,
  VOICES,
  estSeconds,
  type Bit,
  type BitControls,
  type BitDraft,
  type BitTier,
  type BitUsage,
  type BitVersion,
  type SceneBeat,
  type ScreenplayElement,
  type VersionKind,
} from './bits/shared'

const Ctx = { anon_session_id: z.string().max(64).nullable().optional() }

const ControlsSchema = z
  .object({
    audience: z.enum(AUDIENCES).optional(),
    voice: z.enum(VOICES).optional(),
    length: z.enum(LENGTHS).optional(),
    heat: z.number().int().min(1).max(5).optional(),
  })
  .optional()

/** The service-role client. bits and bit_versions postdate the generated
 *  types, so the client is untyped here; the shapes are the Row types below. */
async function adminDb(): Promise<any> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}

/** A guest's bits are keyed to their browser session; no session, no bit. */
function anonKey(id: JokeIdentity): string | null {
  if (id.userId) return null
  const k = id.subjectKey.startsWith('anon:') ? id.subjectKey.slice(5) : ''
  return k && k !== 'unknown' && k.length >= 8 ? k : null
}

type BitRow = {
  id: string
  user_id: string | null
  anon_key: string | null
  story_clean: string
  controls: BitControls
  alt_tags: string[]
  created_at: string
}

type VersionRow = {
  id: string
  bit_id: string
  kind: VersionKind
  hook: string
  setup: string
  tags: string[]
  button: string
  why: string | null
  est_seconds: number
  heat: number
  created_at: string
}

/** Same shape, nothing to read: each word becomes a bar of its length. */
function mask(text: string): string {
  return text
    .split(/\s+/)
    .map((w) => '█'.repeat(Math.max(1, Math.min(w.length, 12))))
    .join(' ')
}

function toVersion(v: VersionRow, locked: boolean): BitVersion {
  return {
    id: v.id,
    kind: v.kind,
    hook: v.hook,
    setup: v.setup,
    tags: locked ? v.tags.map(mask) : v.tags,
    button: locked ? mask(v.button) : v.button,
    why: locked ? '' : (v.why ?? ''),
    est_seconds: v.est_seconds,
    heat: v.heat,
    created_at: v.created_at,
  }
}

function toBit(row: BitRow, versions: VersionRow[], locked: boolean): Bit & { locked: boolean } {
  return {
    id: row.id,
    story: row.story_clean,
    controls: { ...DEFAULT_CONTROLS, ...(row.controls ?? {}) },
    alt_tags: locked ? [] : (row.alt_tags ?? []),
    versions: versions.map((v) => toVersion(v, locked)),
    created_at: row.created_at,
    locked,
  }
}

async function loadOwnedBit(admin: any, bitId: string, id: JokeIdentity): Promise<BitRow | null> {
  const { data } = await admin
    .from('bits')
    .select('id, user_id, anon_key, story_clean, controls, alt_tags, created_at')
    .eq('id', bitId)
    .maybeSingle()
  const row = data as BitRow | null
  if (!row) return null
  const anon = anonKey(id)
  const owns = id.userId ? row.user_id === id.userId : !row.user_id && !!anon && row.anon_key === anon
  return owns ? row : null
}

async function loadVersions(admin: any, bitId: string): Promise<VersionRow[]> {
  const { data } = await admin
    .from('bit_versions')
    .select('id, bit_id, kind, hook, setup, tags, button, why, est_seconds, heat, created_at')
    .eq('bit_id', bitId)
    .order('created_at', { ascending: true })
  return (data as VersionRow[] | null) ?? []
}

async function insertVersion(
  admin: any,
  bitId: string,
  kind: VersionKind,
  draft: BitDraft,
  heat: number,
): Promise<VersionRow> {
  const { data, error } = await admin
    .from('bit_versions')
    .insert({
      bit_id: bitId,
      kind,
      hook: draft.hook,
      setup: draft.setup,
      tags: draft.tags,
      button: draft.button,
      why: draft.why,
      est_seconds: estSeconds(draft),
      heat,
    } as never)
    .select('id, bit_id, kind, hook, setup, tags, button, why, est_seconds, heat, created_at')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'could not save that version')
  return data as VersionRow
}

/* ───────────────────────── write a bit ───────────────────────── */

export type WriteBitResult =
  | { status: 'crisis' }
  | { status: 'limited'; reason: 'daily' | 'rate_limited'; tier: BitTier; usage: BitUsage }
  | { status: 'no_session' }
  | { status: 'failed'; tier: BitTier; usage: BitUsage }
  | {
      status: 'ok'
      bit: Bit & { locked: boolean }
      tier: BitTier
      usage: BitUsage
      /** what the Scrubber swapped, for the "names removed" notice */
      notice: string
      replacements: { type: string; replacement: string; count: number }[]
      ms: number
    }

export type LabDetail = {
  ranked: BitDraft[]
  rejected: { hook: string; rule: string }[]
  premises: string[]
  judge_why: string | null
  timings: Record<string, number>
  writer_model: string
  judge_model: string
}

async function writeCore(
  story: string,
  controlsIn: Partial<BitControls> | undefined,
  anonSessionId: string | null,
  lab: boolean,
): Promise<WriteBitResult & { lab?: LabDetail }> {
  const started = Date.now()
  const supabaseAdmin = await adminDb()
  const id = await resolveJokeIdentity(anonSessionId)
  const anon = anonKey(id)
  if (!id.userId && !anon) return { status: 'no_session' }

  // 1 · budget, before anything is read or stored. The admin lab skips it.
  const { day, resetsAt } = await resolveDayInfo(supabaseAdmin, id.userId)
  const counter = await readCounter(supabaseAdmin, id.subjectKey, day)
  const usage = usageFrom(id.tier, counter, resetsAt)
  if (!lab) {
    if (usage.used >= usage.cap) return { status: 'limited', reason: 'daily', tier: id.tier, usage }
    if ((await chargeNetwork(supabaseAdmin, day, 3)) === 'limited') {
      return { status: 'limited', reason: 'rate_limited', tier: id.tier, usage }
    }
  }

  // 2 · scrub: the raw text goes no further than this line
  const scrubbed = await runScrub(story)
  const clean = scrubbed.clean_text.trim()
  if (!clean) return { status: 'failed', tier: id.tier, usage }
  const tScrub = Date.now()

  // 3 · the Guard, with the writer started beside it to save its time. A
  // crisis throws the writer's work away unread: nothing is charged, stored
  // or shown, and the help block is all that comes back.
  const controls = { ...DEFAULT_CONTROLS, ...(controlsIn ?? {}) } as BitControls
  const sink: { failure?: BitFailure } = {}
  const writing = writeBitFromStory(clean, controls, undefined, sink).catch((e) => {
    sink.failure = { rejected: [], error: e instanceof Error ? e.message : 'threw' }
    return null
  })
  const crisis = await runClassifyCrisis(clean)
  const tGuard = Date.now()
  if (crisis.crisis) {
    await supabaseAdmin.from('crisis_events').insert({
      alias_id: id.userId,
      category: crisis.category,
      severity: crisis.severity,
      resources_shown: true,
    } as never)
    return { status: 'crisis' }
  }

  // 4 · charge, then write
  const bitId = crypto.randomUUID()
  if (!lab) await chargeStory(supabaseAdmin, counter, bitId)
  const written = await writing
  if (!written || !written.ranked.length) {
    // Logged without the story: the controls, the rules that refused each
    // candidate, and any gateway error. Enough to see why, nothing to read.
    await supabaseAdmin
      .from('bit_failures')
      .insert({ user_id: id.userId, controls, rejected: sink.failure?.rejected ?? [], error: sink.failure?.error ?? null, lab, ms: Date.now() - started } as never)
      .then(() => null, () => null)
    if (!lab) await refundStory(supabaseAdmin, id.subjectKey, day, bitId)
    return { status: 'failed', tier: id.tier, usage }
  }
  const timings = {
    scrub_ms: tScrub - started,
    guard_ms: tGuard - tScrub,
    ...written.timings,
    total_ms: Date.now() - started,
  }

  const best = written.ranked[0]!
  const { error } = await supabaseAdmin.from('bits').insert({
    id: bitId,
    user_id: id.userId,
    anon_key: id.userId ? null : anon,
    story_clean: clean,
    controls,
    premises: written.premises,
    candidates: written.ranked,
    alt_tags: written.altTags,
    prompt_version: written.promptVersion,
    writer_model: written.writerModel,
    judge_model: written.judgeModel,
    judge_why: written.judgeWhy,
    timings: { ...timings, lab, rejected: written.rejected },
  } as never)
  if (error) {
    if (!lab) await refundStory(supabaseAdmin, id.subjectKey, day, bitId)
    throw new Error(error.message)
  }
  const original = await insertVersion(supabaseAdmin, bitId, 'original', best, controls.heat)
  console.log('[bit] written', {
    bit_id: bitId,
    tier: id.tier,
    lab,
    candidates: written.ranked.length,
    rejected: written.rejected,
    timings,
  })

  const row: BitRow = {
    id: bitId,
    user_id: id.userId,
    anon_key: anon,
    story_clean: clean,
    controls,
    alt_tags: written.altTags,
    created_at: original.created_at,
  }
  return {
    status: 'ok',
    bit: toBit(row, [original], !id.userId),
    tier: id.tier,
    usage: lab ? usage : { ...usage, used: usage.used + 1 },
    notice: scrubbed.notice ?? '',
    replacements: (scrubbed.replacements ?? []).map((r) => ({
      type: String(r.detected_type ?? ''),
      replacement: String(r.replacement_token ?? ''),
      count: Number(r.count ?? 1),
    })),
    ms: Date.now() - started,
    ...(lab
      ? {
          lab: {
            ranked: written.ranked,
            rejected: written.rejected,
            premises: written.premises.filter((p) => p.used).map((p) => p.t),
            judge_why: written.judgeWhy,
            timings,
            writer_model: written.writerModel,
            judge_model: written.judgeModel,
          },
        }
      : {}),
  }
}

export const writeBit = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ story: z.string().min(1).max(4000), controls: ControlsSchema, ...Ctx }).parse(d),
  )
  .handler(async ({ data }): Promise<WriteBitResult> => {
    const { lab: _lab, ...result } = await writeCore(data.story, data.controls as Partial<BitControls> | undefined, data.anon_session_id ?? null, false)
    return result as WriteBitResult
  })

/** Admin only: the same run, uncharged, with every candidate and timing. */
export const labWriteBit = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ story: z.string().min(1).max(4000), controls: ControlsSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const c = context as { supabase: any; userId: string }
    const { data: isAdmin } = await c.supabase.rpc('has_role', { _user_id: c.userId, _role: 'admin' })
    if (!isAdmin) throw new Error('Forbidden')
    return writeCore(data.story, data.controls as Partial<BitControls> | undefined, null, true)
  })

/* ───────────────────────── versions ───────────────────────── */

const MAX_VERSIONS = 16

export type VersionResult =
  | { ok: true; version: BitVersion }
  | { ok: false; reason: 'not_found' | 'sign_in' | 'too_many' | 'rate_limited' | 'failed' }

/** Hotter, tighter or escalate, rewritten from the version the user is on. */
export const varyBit = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z
      .object({ bit_id: z.string().uuid(), from_version_id: z.string().uuid().optional(), kind: z.enum(VARY_KINDS), ...Ctx })
      .parse(d),
  )
  .handler(async ({ data }): Promise<VersionResult> => {
    const supabaseAdmin = await adminDb()
    const id = await resolveJokeIdentity(data.anon_session_id ?? null)
    if (!id.userId) return { ok: false, reason: 'sign_in' }
    const row = await loadOwnedBit(supabaseAdmin, data.bit_id, id)
    if (!row) return { ok: false, reason: 'not_found' }
    const versions = await loadVersions(supabaseAdmin, row.id)
    if (versions.length >= MAX_VERSIONS) return { ok: false, reason: 'too_many' }
    const { day } = await resolveDayInfo(supabaseAdmin, id.userId)
    if ((await chargeNetwork(supabaseAdmin, day, 1)) === 'limited') return { ok: false, reason: 'rate_limited' }

    const from = versions.find((v) => v.id === data.from_version_id) ?? versions[0]
    if (!from) return { ok: false, reason: 'not_found' }
    const controls = { ...DEFAULT_CONTROLS, ...(row.controls ?? {}) } as BitControls
    const draft = await varyBitDraft(
      row.story_clean,
      { hook: from.hook, setup: from.setup, tags: from.tags, button: from.button, why: from.why ?? '' },
      controls,
      data.kind,
    )
    if (!draft) return { ok: false, reason: 'failed' }
    const saved = await insertVersion(supabaseAdmin, row.id, data.kind, draft, heatFor(data.kind, controls))
    return { ok: true, version: toVersion(saved, false) }
  })

/** Put one of the five spare tags into a tag slot. No model call. */
export const swapTag = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z
      .object({
        bit_id: z.string().uuid(),
        from_version_id: z.string().uuid().optional(),
        index: z.number().int().min(0).max(2),
        alt: z.number().int().min(0).max(4),
        ...Ctx,
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<VersionResult> => {
    const supabaseAdmin = await adminDb()
    const id = await resolveJokeIdentity(data.anon_session_id ?? null)
    if (!id.userId) return { ok: false, reason: 'sign_in' }
    const row = await loadOwnedBit(supabaseAdmin, data.bit_id, id)
    if (!row) return { ok: false, reason: 'not_found' }
    const versions = await loadVersions(supabaseAdmin, row.id)
    if (versions.length >= MAX_VERSIONS) return { ok: false, reason: 'too_many' }
    const from = versions.find((v) => v.id === data.from_version_id) ?? versions[0]
    const alt = row.alt_tags?.[data.alt]
    if (!from || !alt) return { ok: false, reason: 'not_found' }
    const tags = [...from.tags]
    tags[Math.min(data.index, tags.length - 1)] = alt
    const saved = await insertVersion(
      supabaseAdmin,
      row.id,
      'tag_swap',
      { hook: from.hook, setup: from.setup, tags, button: from.button, why: from.why ?? '' },
      from.heat,
    )
    return { ok: true, version: toVersion(saved, false) }
  })

/* ───────────────────────── reading ───────────────────────── */

export const getBit = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ bit_id: z.string().uuid(), ...Ctx }).parse(d))
  .handler(async ({ data }): Promise<{ bit: (Bit & { locked: boolean }) | null; tier: BitTier }> => {
    const supabaseAdmin = await adminDb()
    const id = await resolveJokeIdentity(data.anon_session_id ?? null)
    const row = await loadOwnedBit(supabaseAdmin, data.bit_id, id)
    if (!row) return { bit: null, tier: id.tier }
    return { bit: toBit(row, await loadVersions(supabaseAdmin, row.id), !id.userId), tier: id.tier }
  })

export type SetListItem = { id: string; hook: string; audience: string; versions: number; created_at: string }

/** The set list: the caller's bits, newest first. Signed in only. */
export const listMyBits = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ ...Ctx }).parse(d ?? {}))
  .handler(async ({ data }): Promise<{ tier: BitTier; bits: SetListItem[]; usage: BitUsage }> => {
    const supabaseAdmin = await adminDb()
    const id = await resolveJokeIdentity(data.anon_session_id ?? null)
    const { day, resetsAt } = await resolveDayInfo(supabaseAdmin, id.userId)
    const usage = usageFrom(id.tier, await readCounter(supabaseAdmin, id.subjectKey, day), resetsAt)
    if (!id.userId) return { tier: id.tier, bits: [], usage }
    const { data: rows } = await supabaseAdmin
      .from('bits')
      .select('id, controls, created_at, bit_versions(hook, kind, created_at)')
      .eq('user_id', id.userId)
      .order('created_at', { ascending: false })
      .limit(200)
    const bits = ((rows ?? []) as any[]).map((r) => {
      const vs = ((r.bit_versions ?? []) as { hook: string; kind: string; created_at: string }[]).sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      )
      return {
        id: r.id as string,
        hook: vs.find((v) => v.kind === 'original')?.hook ?? vs[0]?.hook ?? '',
        audience: (r.controls?.audience as string) ?? 'social',
        versions: vs.length,
        created_at: r.created_at as string,
      }
    })
    return { tier: id.tier, bits, usage }
  })

/** After sign-in: the bits this browser wrote as a guest become the user's. */
export const claimGuestBits = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ anon_session_id: z.string().min(8).max(64) }).parse(d))
  .handler(async ({ data }): Promise<{ claimed: number }> => {
    const supabaseAdmin = await adminDb()
    const id = await resolveJokeIdentity(null)
    if (!id.userId) return { claimed: 0 }
    const { data: rows } = await supabaseAdmin
      .from('bits')
      .update({ user_id: id.userId, anon_key: null } as never)
      .is('user_id', null)
      .eq('anon_key', data.anon_session_id)
      .select('id')
    return { claimed: (rows as unknown[] | null)?.length ?? 0 }
  })

/* ───────────────────────── Mix your own ───────────────────────── */

export type MixPool = { hooks: string[]; tags: string[]; buttons: string[] }

function uniq(xs: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const x of xs) {
    const t = (x ?? '').trim()
    if (!t || seen.has(t.toLowerCase())) continue
    seen.add(t.toLowerCase())
    out.push(t)
  }
  return out
}

/** The lines on offer: every hook, tag and button the judge kept for this
 *  story, plus the spare tags. Read from the server copy on save too, so a
 *  mix can only ever be made of lines the pipeline actually wrote. */
async function mixPool(admin: any, bitId: string): Promise<MixPool> {
  const { data } = await admin.from('bits').select('candidates, alt_tags').eq('id', bitId).maybeSingle()
  const cands = (Array.isArray(data?.candidates) ? data.candidates : []) as BitDraft[]
  return {
    hooks: uniq(cands.map((c) => c.hook)),
    tags: uniq([...cands.flatMap((c) => c.tags ?? []), ...((data?.alt_tags ?? []) as string[])]),
    buttons: uniq(cands.map((c) => c.button)),
  }
}

export const getMixOptions = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ bit_id: z.string().uuid(), ...Ctx }).parse(d))
  .handler(async ({ data }): Promise<{ ok: true; pool: MixPool } | { ok: false; reason: 'sign_in' | 'not_found' }> => {
    const supabaseAdmin = await adminDb()
    const id = await resolveJokeIdentity(data.anon_session_id ?? null)
    if (!id.userId) return { ok: false, reason: 'sign_in' }
    const row = await loadOwnedBit(supabaseAdmin, data.bit_id, id)
    if (!row) return { ok: false, reason: 'not_found' }
    return { ok: true, pool: await mixPool(supabaseAdmin, row.id) }
  })

/** Save the three picks as a 'mix' version. The setup stays from the version
 *  the user started on. */
export const saveMix = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z
      .object({
        bit_id: z.string().uuid(),
        from_version_id: z.string().uuid().optional(),
        hook: z.string().min(1).max(400),
        tag: z.string().min(1).max(600),
        button: z.string().min(1).max(600),
        ...Ctx,
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<VersionResult> => {
    const supabaseAdmin = await adminDb()
    const id = await resolveJokeIdentity(data.anon_session_id ?? null)
    if (!id.userId) return { ok: false, reason: 'sign_in' }
    const row = await loadOwnedBit(supabaseAdmin, data.bit_id, id)
    if (!row) return { ok: false, reason: 'not_found' }
    const versions = await loadVersions(supabaseAdmin, row.id)
    if (versions.length >= MAX_VERSIONS) return { ok: false, reason: 'too_many' }
    const pool = await mixPool(supabaseAdmin, row.id)
    const from = versions.find((v) => v.id === data.from_version_id) ?? versions[0]
    // Only lines the pipeline wrote for this story, or the current version's own.
    const okHook = pool.hooks.includes(data.hook) || from?.hook === data.hook
    const okTag = pool.tags.includes(data.tag) || !!from?.tags.includes(data.tag)
    const okButton = pool.buttons.includes(data.button) || from?.button === data.button
    if (!from || !okHook || !okTag || !okButton) return { ok: false, reason: 'not_found' }
    const saved = await insertVersion(
      supabaseAdmin,
      row.id,
      'mix',
      { hook: data.hook, setup: from.setup, tags: [data.tag], button: data.button, why: 'Your mix: the hook, tag and ending you picked.' },
      from.heat,
    )
    return { ok: true, version: toVersion(saved, false) }
  })

/* ───────────────────────── scene + screenplay ───────────────────────── */

export type LayoutResult<T> = { ok: true; data: T } | { ok: false; reason: 'sign_in' | 'not_found' | 'rate_limited' | 'failed' }

async function layoutFor<T>(
  kind: 'scene' | 'screenplay',
  bitId: string,
  versionId: string,
  anonSessionId: string | null,
): Promise<LayoutResult<T>> {
  const supabaseAdmin = await adminDb()
  const id = await resolveJokeIdentity(anonSessionId)
  if (!id.userId) return { ok: false, reason: 'sign_in' }
  const row = await loadOwnedBit(supabaseAdmin, bitId, id)
  if (!row) return { ok: false, reason: 'not_found' }
  const { data: v } = await supabaseAdmin
    .from('bit_versions')
    .select(`id, hook, setup, tags, button, ${kind}`)
    .eq('id', versionId)
    .eq('bit_id', row.id)
    .maybeSingle()
  if (!v) return { ok: false, reason: 'not_found' }
  if (v[kind]) return { ok: true, data: v[kind] as T }
  const { day } = await resolveDayInfo(supabaseAdmin, id.userId)
  if ((await chargeNetwork(supabaseAdmin, day, 1)) === 'limited') return { ok: false, reason: 'rate_limited' }
  const { writeScene, writeScreenplay } = await import('./bits/pipeline.server')
  const made = kind === 'scene' ? await writeScene(row.story_clean, v) : await writeScreenplay(row.story_clean, v)
  if (!made) return { ok: false, reason: 'failed' }
  await supabaseAdmin.from('bit_versions').update({ [kind]: made } as never).eq('id', v.id)
  return { ok: true, data: made as T }
}

const LayoutInput = z.object({ bit_id: z.string().uuid(), version_id: z.string().uuid(), ...Ctx })

export const getScene = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => LayoutInput.parse(d))
  .handler(({ data }) => layoutFor<SceneBeat[]>('scene', data.bit_id, data.version_id, data.anon_session_id ?? null))

export const getScreenplay = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => LayoutInput.parse(d))
  .handler(({ data }) => layoutFor<ScreenplayElement[]>('screenplay', data.bit_id, data.version_id, data.anon_session_id ?? null))

/* ───────────────────────── download ───────────────────────── */

export type ExportResult =
  | { ok: true; svg: string; filename: string; watermarked: boolean; tier: BitTier }
  | { ok: false; reason: 'not_found' }

/** The picture, drawn here so the tier decides the mark: guest and free get
 *  the heavy watermark, Shutap+ gets a clean file. A guest's picture carries
 *  only the hook and setup — the same lines they can read. */
export const exportBit = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ bit_id: z.string().uuid(), version_id: z.string().uuid(), format: z.enum(['bit', 'hook']), ...Ctx }).parse(d),
  )
  .handler(async ({ data }): Promise<ExportResult> => {
    const supabaseAdmin = await adminDb()
    const id = await resolveJokeIdentity(data.anon_session_id ?? null)
    const row = await loadOwnedBit(supabaseAdmin, data.bit_id, id)
    if (!row) return { ok: false, reason: 'not_found' }
    const { data: v } = await supabaseAdmin
      .from('bit_versions')
      .select('hook, setup, tags, button')
      .eq('id', data.version_id)
      .eq('bit_id', row.id)
      .maybeSingle()
    if (!v) return { ok: false, reason: 'not_found' }
    const { renderBitSvg, artFilename } = await import('./bits/art')
    const watermarked = id.tier !== 'paying'
    const svg = renderBitSvg({ ...v, format: data.format, locked: !id.userId, watermark: watermarked })
    return { ok: true, svg, filename: artFilename(v.hook, data.format), watermarked, tier: id.tier }
  })

/* ───────────────────────── post to rooms ───────────────────────── */

export type PostResult =
  | { ok: true; room_id: string; already: boolean }
  | { ok: false; reason: 'sign_in' | 'not_found' | 'names' | 'crisis' | 'no_scene' | 'failed' }

/** A post is a whole bit or a whole scene, never a single joke. The content
 *  is snapshotted on the room so a later version never changes a post that
 *  already has likes and comments. */
export const postBitToRoom = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z
      .object({
        bit_id: z.string().uuid(),
        version_id: z.string().uuid(),
        kind: z.enum(['bit', 'scene']),
        topic: z.enum(['office', 'work', 'family', 'school', 'live', 'social']),
        ...Ctx,
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<PostResult> => {
    const supabaseAdmin = await adminDb()
    const id = await resolveJokeIdentity(data.anon_session_id ?? null)
    if (!id.userId) return { ok: false, reason: 'sign_in' }
    const row = await loadOwnedBit(supabaseAdmin, data.bit_id, id)
    if (!row) return { ok: false, reason: 'not_found' }
    const { data: v } = await supabaseAdmin
      .from('bit_versions')
      .select('id, hook, setup, tags, button, est_seconds, scene')
      .eq('id', data.version_id)
      .eq('bit_id', row.id)
      .maybeSingle()
    if (!v) return { ok: false, reason: 'not_found' }

    const { data: existing } = await supabaseAdmin
      .from('rooms')
      .select('id')
      .eq('bit_version_id', v.id)
      .eq('post_kind', data.kind)
      .eq('hidden', false)
      .maybeSingle()
    if (existing) return { ok: true, room_id: existing.id as string, already: true }

    let postData: Record<string, unknown>
    let body: string
    if (data.kind === 'scene') {
      let beats = v.scene as SceneBeat[] | null
      if (!beats) {
        const { writeScene } = await import('./bits/pipeline.server')
        beats = await writeScene(row.story_clean, v)
        if (!beats) return { ok: false, reason: 'no_scene' }
        await supabaseAdmin.from('bit_versions').update({ scene: beats } as never).eq('id', v.id)
      }
      postData = { hook: v.hook, beats, secs: v.est_seconds }
      body = beats.map((b, i) => `${i + 1}. ${b.shot} · ${b.speaker}: ${b.line}`).join('\n')
    } else {
      postData = { hook: v.hook, setup: v.setup, tags: v.tags, button: v.button, secs: v.est_seconds }
      body = [v.setup, ...v.tags, v.button].join('\n\n')
    }

    // The lines were written from a story the Scrubber already cleaned, and
    // the writer is told never to use names, so the model pass is not run
    // again here: it redacts "when unsure" and flagged role words ("my
    // husband") as names, refusing clean bits. The deterministic pass still
    // runs, and the Guard.
    if (hasContactDetails(`${v.hook}\n\n${body}`)) return { ok: false, reason: 'names' }
    const guard = await runClassifyCrisis(`${v.hook}\n\n${body}`)
    if (guard.crisis) return { ok: false, reason: 'crisis' }

    const { data: alias } = await supabaseAdmin.from('aliases').select('display_name, emoji').eq('user_id', id.userId).maybeSingle()
    const title = String(v.hook).slice(0, 600)
    const { data: situation, error: sitErr } = await supabaseAdmin
      .from('situations')
      .insert({
        alias_id: id.userId,
        pillar: 'family',
        clean_text: row.story_clean,
        kind: 'joke',
        title,
        body,
        is_public: true,
        crisis_flag: false,
        is_seed: false,
        status: 'open',
      } as never)
      .select('id')
      .single()
    // The story page behind the post is secondary: a failure here is logged,
    // and the post still goes up.
    if (sitErr || !situation) console.error('[bit-post] situation insert failed', sitErr?.message)

    const { data: room, error: roomErr } = await supabaseAdmin
      .from('rooms')
      .insert({
        author_id: id.userId,
        alias: (alias?.display_name as string) ?? 'someone',
        emoji: (alias?.emoji as string) ?? '🎤',
        title,
        body,
        support: 'heard',
        hall: 'relatable',
        source: 'joke',
        topic: data.topic,
        post_kind: data.kind,
        bit_version_id: v.id,
        post_data: postData,
      } as never)
      .select('id')
      .single()
    if (roomErr || !room) {
      console.error('[bit-post] room insert failed', roomErr?.message)
      return { ok: false, reason: 'failed' }
    }
    if (situation) await supabaseAdmin.from('situations').update({ room_id: room.id } as never).eq('id', situation.id)
    return { ok: true, room_id: room.id as string, already: false }
  })

/* ───────────────────────── caption + hashtags ───────────────────────── */

export type CaptionResult =
  | { ok: true; caption: string; hashtags: string[] }
  | { ok: false; reason: 'sign_in' | 'not_found' | 'rate_limited' | 'failed' }

/** The text under the video: a teaser caption and 5–8 hashtags, written on
 *  first ask and cached on the version. Signed in only: a guest's tags and
 *  button are not theirs yet, and the caption is written from them. */
export const getCaption = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => LayoutInput.parse(d))
  .handler(async ({ data }): Promise<CaptionResult> => {
    const supabaseAdmin = await adminDb()
    const id = await resolveJokeIdentity(data.anon_session_id ?? null)
    if (!id.userId) return { ok: false, reason: 'sign_in' }
    const row = await loadOwnedBit(supabaseAdmin, data.bit_id, id)
    if (!row) return { ok: false, reason: 'not_found' }
    const { data: v } = await supabaseAdmin
      .from('bit_versions')
      .select('id, hook, setup, tags, button, caption')
      .eq('id', data.version_id)
      .eq('bit_id', row.id)
      .maybeSingle()
    if (!v) return { ok: false, reason: 'not_found' }
    if (v.caption?.caption) return { ok: true, caption: v.caption.caption, hashtags: v.caption.hashtags ?? [] }
    const { day } = await resolveDayInfo(supabaseAdmin, id.userId)
    if ((await chargeNetwork(supabaseAdmin, day, 1)) === 'limited') return { ok: false, reason: 'rate_limited' }
    const { writeCaption } = await import('./bits/pipeline.server')
    const made = await writeCaption(row.story_clean, v, (row.controls as BitControls)?.audience ?? 'social')
    if (!made) return { ok: false, reason: 'failed' }
    await supabaseAdmin.from('bit_versions').update({ caption: made } as never).eq('id', v.id)
    return { ok: true, ...made }
  })
