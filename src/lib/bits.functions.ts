// Server functions for bits: write one from a story, make versions, swap a
// tag, read one back, list the caller's set list.
//
// Order on every write: the day's budget is reserved first, in one locked
// write (nothing is scrubbed, classified or stored past a spent budget), then
// the Scrubber (the raw text is never stored), then the Guard (a crisis
// overrides everything: no bit, no paywall, the help block). The premise pass
// starts beside the Guard to save time; if the Guard fires, its result is
// thrown away unread. Any path that ends without a bit gives the budget back.
//
// Daily new bits: guest 0 (sign in first) · free 1 · basic 3 · pro fair-use.
// New bits and rewrites (hotter/tighter/storytelling) count. Rewrites, angle
// swap and mix your own are paid only (free gets the bit as written).
// Everyone sees the whole bit. Bits are server-only rows; ownership is checked
// here: the signed-in user, or the guest's own browser id.
import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'
import { hasContactDetails, runScrub } from './agents/scrubber.functions'
import { runClassifyCrisis } from './agents/guard.functions'
import { requestAnonId, resolveJokeIdentity, type JokeIdentity } from './jokes/session.server'
import { activePlan } from './plan.server'
import { downloadsUsed, kitTier, resolveTier } from './bits/tier.server'
import { heatFor, touchLineDraft, varyBitDraft, writeBitFromStory, type BitFailure, type TouchOption } from './bits/pipeline.server'
import { forgetPerson, personSignal } from './bits/person.server'
import { NO_CAP, TOUCH_FAIR_USE, capFor, chargeBit, chargeNetwork, mergeGuestUsage, readUsed, refundBit, refundBitUnlessStored, today, usageView } from './bits/usage.server'
import { DOWNLOAD_KINDS } from './bits/plans'
import { limitFor } from './entitlements'
import {
  AUDIENCES,
  DEFAULT_CONTROLS,
  LENGTHS,
  SLOTS,
  VARY_KINDS,
  VOICES,
  estSeconds,
  readSlot,
  writeSlot,
  type Bit,
  type BitControls,
  type BitDraft,
  type BitTier,
  type BitUsage,
  type BitVersion,
  type Slot,
  type SkitBeat,
  type SketchElement,
  type VersionKind,
  isPaidTier,
} from './bits/shared'

const Ctx = { anon_session_id: z.string().max(64).nullable().optional() }

const ControlsSchema = z
  .object({
    audience: z.enum(AUDIENCES).optional(),
    voice: z.enum(VOICES).optional(),
    length: z.enum(LENGTHS).optional(),
    heat: z.number().int().min(1).max(5).optional(),
    move: z.string().max(120).optional(),
  })
  .optional()

/** The service-role client. bits and bit_versions postdate the generated
 *  types, so the client is untyped here; the shapes are the Row types below. */
async function adminDb(): Promise<any> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}

/* The comedy-formats rename (Oct 30 2026) moved three columns: bits.alt_tags →
   crowd_work, bit_versions.scene → skit, bit_versions.screenplay → sketch
   (migration 20261031000000). Until that migration has run, the old names
   still work: checked once a minute, so a deploy that lands before the SQL
   keeps writing bits. */
type Cols = { crowd: 'crowd_work' | 'alt_tags'; skit: 'skit' | 'scene'; sketch: 'sketch' | 'screenplay' }
const NEW_COLS: Cols = { crowd: 'crowd_work', skit: 'skit', sketch: 'sketch' }
const OLD_COLS: Cols = { crowd: 'alt_tags', skit: 'scene', sketch: 'screenplay' }
let colsCache: { at: number; cols: Cols } | null = null
async function cols(admin: any): Promise<Cols> {
  if (colsCache && Date.now() - colsCache.at < 60_000) return colsCache.cols
  const { error } = await admin.from('bits').select('crowd_work').limit(1)
  const c = error ? OLD_COLS : NEW_COLS
  if (error) console.warn('[bits] crowd_work column missing: migration 20261031000000 not run yet, using the old column names')
  colsCache = { at: Date.now(), cols: c }
  return c
}

/** Guest or account, for the per-network layer (no database read). */
function guestOrAccount(id: JokeIdentity): BitTier {
  return id.userId ? 'free' : 'guest'
}


/** After sign-in, count the guest bits this browser wrote today toward the
 *  account. Idempotent; a failure here never blocks the caller. */
async function mergeGuestToday(admin: any, id: JokeIdentity, anonSessionId: string | null, day: string): Promise<void> {
  if (!id.userId) return
  const anon = requestAnonId(anonSessionId)
  if (!anon) return
  try {
    await mergeGuestUsage(admin, id.userId, anon, day)
  } catch (e) {
    console.error('[bits] guest usage merge failed', e instanceof Error ? e.message : e)
  }
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
  crowd_work: string[]
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

function toVersion(v: VersionRow): BitVersion {
  return {
    id: v.id,
    kind: ((v.kind as string) === 'escalate' ? 'storytelling' : v.kind) as VersionKind,
    hook: v.hook,
    setup: v.setup,
    tags: v.tags,
    button: v.button,
    why: v.why ?? '',
    est_seconds: v.est_seconds,
    heat: v.heat,
    created_at: v.created_at,
  }
}

/** Everyone sees the whole bit, guests included (Oct 22 2026). `locked` stays
 *  in the shape, always false, so older callers keep working. */
function toBit(row: BitRow, versions: VersionRow[]): Bit & { locked: boolean } {
  return {
    id: row.id,
    story: row.story_clean,
    controls: { ...DEFAULT_CONTROLS, ...(row.controls ?? {}) },
    crowd_work: row.crowd_work ?? [],
    versions: versions.map((v) => toVersion(v)),
    created_at: row.created_at,
    locked: false,
  }
}

async function loadOwnedBit(admin: any, bitId: string, id: JokeIdentity): Promise<BitRow | null> {
  const c = await cols(admin)
  const { data } = await admin
    .from('bits')
    .select(`id, user_id, anon_key, story_clean, controls, ${c.crowd}, created_at`)
    .eq('id', bitId)
    .maybeSingle()
  if (!data) return null
  const row = { ...data, crowd_work: data[c.crowd] ?? [] } as BitRow
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
  // before migration 20261031000000 the kind check still says 'escalate'
  const legacy = (await cols(admin)).crowd === 'alt_tags'
  const { data, error } = await admin
    .from('bit_versions')
    .insert({
      bit_id: bitId,
      kind: legacy && kind === 'storytelling' ? 'escalate' : kind,
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
  // 'edited' (Nov 5 2026) needs migration 20261105230000; until it runs the
  // kind check refuses it, so the version is kept as a mix (also "theirs").
  if (error && kind === 'edited' && String((error as any).code) === '23514') return insertVersion(admin, bitId, 'mix', draft, heat)
  if (error || !data) throw new Error(error?.message ?? 'could not save that version')
  return data as VersionRow
}

/* ───────────────────────── write a bit ───────────────────────── */

/** A bit has landed once its row AND its first version exist. Another copy
 *  of the same press may have saved the row a moment before its version, so
 *  this waits briefly for the version before giving up. */
async function landedBit(admin: any, bitId: string, id: JokeIdentity): Promise<{ row: BitRow; versions: VersionRow[] } | null> {
  const row = await loadOwnedBit(admin, bitId, id)
  if (!row) return null
  for (let i = 0; i < 6; i++) {
    const versions = await loadVersions(admin, row.id)
    if (versions.length) return { row, versions }
    await new Promise((r) => setTimeout(r, 300))
  }
  return null
}

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

type GivenLines = Partial<Pick<BitDraft, 'hook' | 'setup' | 'tags' | 'button'>>
function cleanLines(l: GivenLines): GivenLines | undefined {
  const t = (v?: string) => (v ?? '').replace(/\s+/g, ' ').trim()
  const out: GivenLines = { hook: t(l.hook) || undefined, setup: t(l.setup) || undefined, tags: (l.tags ?? []).map(t), button: t(l.button) || undefined }
  if (!out.tags?.some(Boolean)) delete out.tags
  return out.hook || out.setup || out.tags || out.button ? out : undefined
}
/** If the Scrubber changed the story, the lines need the same treatment. */
async function scrubGivenAsync(g: GivenLines): Promise<GivenLines> {
  const one = async (v?: string) => (v && hasContactDetails(v) ? (await runScrub(v)).clean_text : v)
  return { hook: await one(g.hook), setup: await one(g.setup), tags: g.tags ? await Promise.all(g.tags.map((t) => one(t).then((x) => x ?? ''))) : undefined, button: await one(g.button) }
}
function scrubGiven(g: GivenLines, raw: string, clean: string): GivenLines | Promise<GivenLines> {
  return raw === clean ? g : scrubGivenAsync(g)
}
function linesAsStory(g: GivenLines): string {
  return [g.hook, g.setup, ...(g.tags ?? []), g.button].filter(Boolean).join(' ')
}

async function writeCore(
  story: string,
  controlsIn: Partial<BitControls> | undefined,
  anonSessionId: string | null,
  lab: boolean,
  writeId?: string,
  given?: GivenLines,
): Promise<WriteBitResult & { lab?: LabDetail }> {
  const started = Date.now()
  const supabaseAdmin = await adminDb()
  const id = await resolveJokeIdentity(anonSessionId)
  const tier = await resolveTier(supabaseAdmin, id)
  const anon = anonKey(id)
  if (!id.userId && !anon) return { status: 'no_session' }

  const { day, resetsAt } = today()
  const subject = id.subjectKey
  const usageNow = async () => usageView(tier, await readUsed(supabaseAdmin, subject, day).catch(() => 0), resetsAt)

  // Nov 1 2026: signing in comes before the first bit. A guest's press opens
  // the sign-in sheet, and the story is written right after sign-in.
  if (!lab && !id.userId) return { status: 'limited', reason: 'daily', tier, usage: usageView(tier, 0, resetsAt) }

  // A press of "write" carries one id, reused on the client's silent retry
  // and when the sign-in return replays it. If that bit already exists, this
  // is a copy of a write that landed (or is landing): hand the same bit back,
  // charge nothing.
  let bitId = writeId ?? crypto.randomUUID()
  if (!lab && writeId) {
    const { data: taken } = await supabaseAdmin.from('bits').select('id').eq('id', writeId).maybeSingle()
    if (taken) {
      if (await loadOwnedBit(supabaseAdmin, writeId, id)) {
        const landed = await landedBit(supabaseAdmin, writeId, id)
        if (!landed) return { status: 'failed', tier, usage: await usageNow() }
        return {
          status: 'ok',
          bit: toBit(landed.row, landed.versions),
          tier,
          usage: await usageNow(),
          notice: '',
          replacements: [],
          ms: Date.now() - started,
        }
      }
      bitId = crypto.randomUUID() // someone else's id: never reuse it
    }
  }

  /** Give the budget back — unless a bit with this id is stored, which means
   *  another copy of the same press landed and its charge must stand. One
   *  statement in the database, so the check can't go stale. */
  const refundIfNotLanded = () => refundBitUnlessStored(supabaseAdmin, subject, day, bitId)

  // After sign-in, this browser's guest bit today counts toward the account.
  await mergeGuestToday(supabaseAdmin, id, anonSessionId, day)

  // 1 · reserve today's budget in one locked write, before anything is read
  //     or stored. The admin lab skips it.
  let used = 0
  if (!lab) {
    try {
      used = await chargeBit(supabaseAdmin, subject, day, capFor(tier), bitId)
    } catch (e) {
      // The budget can't be read: refuse rather than write uncounted.
      console.error('[bit] budget unavailable', e instanceof Error ? e.message : e)
      return { status: 'failed', tier, usage: usageView(tier, 0, resetsAt) }
    }
    if (used === -1) return { status: 'limited', reason: 'daily', tier, usage: await usageNow() }
    if ((await chargeNetwork(supabaseAdmin, tier, day, 3)) === 'limited') {
      await refundIfNotLanded()
      return { status: 'limited', reason: 'rate_limited', tier, usage: await usageNow() }
    }
  }
  const usage = usageView(tier, used, resetsAt)

  // From here on, any way out without a bit gives the budget back.
  let kept = false
  try {
    // 2 · scrub: the raw text goes no further than this line
    const scrubbed = await runScrub(story)
    const clean = scrubbed.clean_text.trim()
    if (!clean) return { status: 'failed', tier, usage: lab ? usage : await refundedUsage() }
    const tScrub = Date.now()

    // 3 · the Guard, with the writer started beside it to save its time. A
    // crisis throws the writer's work away unread: nothing is charged, stored
    // or shown, and the help block is all that comes back.
    const controls = { ...DEFAULT_CONTROLS, ...(controlsIn ?? {}) } as BitControls
    const sink: { failure?: BitFailure } = {}
    // THIS PERSON: their own kept lines and rewrite habits (a quick read,
    // cached five minutes; '' for a first bit)
    const person = await personSignal(supabaseAdmin, id.userId).catch(() => '')
    // The person's lines are scrubbed with the story (same text), so the
    // given block carries clean lines too.
    const givenClean = given ? await scrubGiven(given, story, clean) : undefined
    const writing = writeBitFromStory(clean, controls, undefined, sink, { person, given: givenClean }).catch((e) => {
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

    // 4 · write
    const written = await writing
    if (!written || !written.ranked.length) {
      // Logged without the story: the controls, the rules that refused each
      // candidate, and any gateway error. Enough to see why, nothing to read.
      await supabaseAdmin
        .from('bit_failures')
        .insert({ user_id: id.userId, controls, rejected: (sink.failure?.rejected ?? []).map((r) => ({ rule: r.rule })), error: sink.failure?.error ?? null, lab, ms: Date.now() - started } as never)
        .then(() => null, () => null)
      if (!lab) {
        const { alertBitFailure } = await import('./bits/alert.server')
        await alertBitFailure('user_write_failed', {
          controls,
          signed_in: !!id.userId,
          ms: Date.now() - started,
          error: sink.failure?.error ?? null,
          rejected: sink.failure?.rejected?.map((r) => r.rule) ?? [],
        })
      }
      return { status: 'failed', tier, usage: lab ? usage : await refundedUsage() }
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
      [(await cols(supabaseAdmin)).crowd]: written.crowdWork,
      prompt_version: written.promptVersion,
      writer_model: written.writerModel,
      judge_model: written.judgeModel,
      judge_why: written.judgeWhy,
      timings: { ...timings, lab, rejected: written.rejected.map((r) => r.rule), attempts: written.attempts, techniques: written.techniques },
    } as never)
    if (error) {
      // Two copies of the same press raced and the other one saved first:
      // its bit is this press's bit, and its charge stands.
      if ((error as { code?: string }).code === '23505') {
        const landed = await landedBit(supabaseAdmin, bitId, id)
        if (landed) {
          kept = true
          return {
            status: 'ok',
            bit: toBit(landed.row, landed.versions),
            tier,
            usage: await usageNow(),
            notice: '',
            replacements: [],
            ms: Date.now() - started,
          }
        }
      }
      throw new Error(error.message)
    }
    let original: VersionRow
    try {
      original = await insertVersion(supabaseAdmin, bitId, 'original', best, controls.heat)
    } catch (e) {
      // A row without its version would read as a blank bit: take it back out.
      const { error: delErr } = await supabaseAdmin.from('bits').delete().eq('id', bitId).then(
        (r: { error: { message: string } | null }) => r,
        (err: unknown) => ({ error: { message: err instanceof Error ? err.message : String(err) } }),
      )
      if (delErr) {
        // The empty row stays, so the stored-bit check would keep the charge
        // for nothing: give it back directly.
        console.error('[bit] could not remove a bit without its version', delErr.message)
        await refundBit(supabaseAdmin, subject, day, bitId)
      }
      throw e
    }
    kept = true
    // The charge stands for a stored bit. If a failing copy of the same press
    // gave it back in the meantime, this takes it again (a no-op otherwise).
    if (!lab) {
      try {
        // No cap here: the bit is already written, so it always counts.
        await chargeBit(supabaseAdmin, subject, day, NO_CAP, bitId)
      } catch (e) {
        console.error('[bit] re-charge after store failed', e instanceof Error ? e.message : e)
      }
    }
    console.log('[bit] written', {
      bit_id: bitId,
      tier,
      lab,
      candidates: written.ranked.length,
      rejected: written.rejected.map((r) => r.rule),
      attempts: written.attempts,
      timings,
    })

    const row: BitRow = {
      id: bitId,
      user_id: id.userId,
      anon_key: anon,
      story_clean: clean,
      controls,
      crowd_work: written.crowdWork,
      created_at: original.created_at,
    }
    return {
      status: 'ok',
      bit: toBit(row, [original]),
      tier,
      usage,
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
  } finally {
    if (!lab && !kept) await refundIfNotLanded()
  }

  /** The count after this write's refund, for the "didn't count" message. */
  async function refundedUsage(): Promise<BitUsage> {
    await refundIfNotLanded()
    return usageNow()
  }
}

export const writeBit = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z
      .object({
        story: z.string().max(4000).optional(),
        /** the lined box (Nov 5 2026): the lines the person wrote; the writer fills the rest */
        lines: z.object({ hook: z.string().max(300).optional(), setup: z.string().max(600).optional(), tags: z.array(z.string().max(600)).max(3).optional(), button: z.string().max(600).optional() }).optional(),
        controls: ControlsSchema,
        /** one id per press of "write", reused on the silent retry */
        write_id: z.string().uuid().optional(),
        ...Ctx,
      })
      .refine((d) => (d.story && d.story.trim()) || (d.lines && Object.values(d.lines).some((v) => (Array.isArray(v) ? v.some(Boolean) : !!v))), { message: 'a story or a line' })
      .parse(d),
  )
  .handler(async ({ data }): Promise<WriteBitResult> => {
    try {
      const given = data.lines ? cleanLines(data.lines) : undefined
      // With lines and no story, the lines are the story the writer reads.
      const story = data.story?.trim() || (given ? linesAsStory(given) : '')
      const { lab: _lab, ...result } = await writeCore(
        story,
        data.controls as Partial<BitControls> | undefined,
        data.anon_session_id ?? null,
        false,
        data.write_id,
        given,
      )
      if (result.status === 'no_session') {
        const { alertBitFailure } = await import('./bits/alert.server')
        await alertBitFailure('user_write_failed', { error: 'no_session (visitor has no account and no guest session)' })
      }
      return result as WriteBitResult
    } catch (e) {
      const { alertBitFailure } = await import('./bits/alert.server')
      await alertBitFailure('user_write_failed', { error: `threw: ${e instanceof Error ? e.message : String(e)}` })
      throw e
    }
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
  | { ok: false; reason: 'daily'; tier: BitTier }

/** Hotter, tighter or storytelling, rewritten from the version the user is on.
 *  A rewrite is a model call, so since Oct 29 2026 it counts as a new bit
 *  against the daily cap (tag swap and mix your own stay free: no model). */
export const varyBit = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z
      .object({ bit_id: z.string().uuid(), from_version_id: z.string().uuid().optional(), kind: z.enum(VARY_KINDS), locked: z.array(z.enum(SLOTS)).max(6).optional(), ...Ctx })
      .parse(d),
  )
  .handler(async ({ data }): Promise<VersionResult> => {
    const supabaseAdmin = await adminDb()
    const id = await resolveJokeIdentity(data.anon_session_id ?? null)
    // Rewriting takes an account, and (Nov 1 2026) a paid plan: free gets the
    // bit as written. MAX_VERSIONS is the per-bit safety limit.
    if (!id.userId) return { ok: false, reason: 'sign_in' }
    const tier = await resolveTier(supabaseAdmin, id)
    if (tier === 'free' || tier === 'guest') return { ok: false, reason: 'daily', tier }
    const row = await loadOwnedBit(supabaseAdmin, data.bit_id, id)
    if (!row) return { ok: false, reason: 'not_found' }
    const versions = await loadVersions(supabaseAdmin, row.id)
    if (versions.length >= MAX_VERSIONS) return { ok: false, reason: 'too_many' }
    const { day } = today()
    if ((await chargeNetwork(supabaseAdmin, guestOrAccount(id), day, 1)) === 'limited') return { ok: false, reason: 'rate_limited' }
    // The rewrite is a new bit against today's cap. Charged under a fresh
    // id so a retry of the same press is still one charge.
    const chargeId = crypto.randomUUID()
    let used: number
    try {
      used = await chargeBit(supabaseAdmin, id.subjectKey, day, capFor(tier), chargeId)
    } catch {
      return { ok: false, reason: 'failed' }
    }
    if (used === -1) return { ok: false, reason: 'daily', tier }
    const refund = () => refundBit(supabaseAdmin, id.subjectKey, day, chargeId).catch(() => {})

    const from = versions.find((v) => v.id === data.from_version_id) ?? versions[0]
    if (!from) return { ok: false, reason: 'not_found' }
    const controls = { ...DEFAULT_CONTROLS, ...(row.controls ?? {}) } as BitControls
    const fromDraft = { hook: from.hook, setup: from.setup, tags: from.tags, button: from.button, why: from.why ?? '' }
    let draft = await varyBitDraft(row.story_clean, fromDraft, controls, data.kind, data.locked ?? [])
    if (!draft) {
      await refund()
      return { ok: false, reason: 'failed' }
    }
    // Locked lines (AI on demand) come through untouched whatever the writer did.
    for (const sl of data.locked ?? []) if (readSlot(fromDraft, sl)) draft = writeSlot(draft, sl, readSlot(fromDraft, sl))
    const saved = await insertVersion(supabaseAdmin, row.id, data.kind, draft, heatFor(data.kind, controls))
    forgetPerson(id.userId)
    return { ok: true, version: toVersion(saved) }
  })

/** Put one of the five spare tags into a tag slot. No model call. */
export const swapAngle = createServerFn({ method: 'POST' })
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
    // Free gets the bit as written; swaps are Basic and Pro.
    const tier = await resolveTier(supabaseAdmin, id)
    if (tier === 'free' || tier === 'guest') return { ok: false, reason: 'daily', tier }
    const row = await loadOwnedBit(supabaseAdmin, data.bit_id, id)
    if (!row) return { ok: false, reason: 'not_found' }
    const versions = await loadVersions(supabaseAdmin, row.id)
    if (versions.length >= MAX_VERSIONS) return { ok: false, reason: 'too_many' }
    const from = versions.find((v) => v.id === data.from_version_id) ?? versions[0]
    const alt = row.crowd_work?.[data.alt]
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
    return { ok: true, version: toVersion(saved) }
  })

/* ───────────────────────── reading ───────────────────────── */

export const getBit = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ bit_id: z.string().uuid(), ...Ctx }).parse(d))
  .handler(async ({ data }): Promise<{ bit: (Bit & { locked: boolean }) | null; tier: BitTier }> => {
    const supabaseAdmin = await adminDb()
    const id = await resolveJokeIdentity(data.anon_session_id ?? null)
    const row = await loadOwnedBit(supabaseAdmin, data.bit_id, id)
    const tier = await resolveTier(supabaseAdmin, id)
    if (!row) return { bit: null, tier }
    return { bit: toBit(row, await loadVersions(supabaseAdmin, row.id)), tier }
  })

export type SetListItem = { id: string; hook: string; audience: string; versions: number; created_at: string }

/** The set list: the caller's bits, newest first. Signed in only. */
export const listMyBits = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ ...Ctx }).parse(d ?? {}))
  .handler(async ({ data }): Promise<{ tier: BitTier; bits: SetListItem[]; usage: BitUsage }> => {
    const supabaseAdmin = await adminDb()
    const id = await resolveJokeIdentity(data.anon_session_id ?? null)
    const tier = await resolveTier(supabaseAdmin, id)
    const { day, resetsAt } = today()
    // Right after sign-in, the count already includes the guest bit.
    await mergeGuestToday(supabaseAdmin, id, data.anon_session_id ?? null, day)
    let used = 0
    try {
      used = await readUsed(supabaseAdmin, id.subjectKey, day)
    } catch (e) {
      console.error('[bits] usage read failed', e instanceof Error ? e.message : e)
    }
    const usage = usageView(tier, used, resetsAt)
    if (!id.userId) return { tier, bits: [], usage }
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
    return { tier, bits, usage }
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
    // Today's guest bit counts toward the account's day (free is 2 in total).
    try {
      await mergeGuestUsage(supabaseAdmin, id.userId, data.anon_session_id, today().day)
    } catch (e) {
      console.error('[bits] guest usage merge failed', e instanceof Error ? e.message : e)
    }
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
  const c = await cols(admin)
  const { data } = await admin.from('bits').select(`candidates, ${c.crowd}`).eq('id', bitId).maybeSingle()
  const cands = (Array.isArray(data?.candidates) ? data.candidates : []) as BitDraft[]
  return {
    hooks: uniq(cands.map((c) => c.hook)),
    tags: uniq([...cands.flatMap((c) => c.tags ?? []), ...((data?.[c.crowd] ?? []) as string[])]),
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
    // Free gets the bit as written; mix your own is Basic and Pro.
    const tier = await resolveTier(supabaseAdmin, id)
    if (tier === 'free' || tier === 'guest') return { ok: false, reason: 'daily', tier }
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
    return { ok: true, version: toVersion(saved) }
  })

/* ───────────────────────── skit + sketch ───────────────────────── */

export type LayoutResult<T> = { ok: true; data: T } | { ok: false; reason: 'sign_in' | 'not_found' | 'rate_limited' | 'failed' }

async function layoutFor<T>(
  kind: 'skit' | 'sketch',
  bitId: string,
  versionId: string,
  anonSessionId: string | null,
): Promise<LayoutResult<T>> {
  const supabaseAdmin = await adminDb()
  const id = await resolveJokeIdentity(anonSessionId)
  if (!id.userId) return { ok: false, reason: 'sign_in' }
  const row = await loadOwnedBit(supabaseAdmin, bitId, id)
  if (!row) return { ok: false, reason: 'not_found' }
  const col = (await cols(supabaseAdmin))[kind]
  const { data: v } = await supabaseAdmin
    .from('bit_versions')
    .select(`id, hook, setup, tags, button, ${col}`)
    .eq('id', versionId)
    .eq('bit_id', row.id)
    .maybeSingle()
  if (!v) return { ok: false, reason: 'not_found' }
  if (v[col]) return { ok: true, data: v[col] as T }
  if ((await chargeNetwork(supabaseAdmin, guestOrAccount(id), today().day, 1)) === 'limited') return { ok: false, reason: 'rate_limited' }
  const { writeSkit, writeSketch } = await import('./bits/pipeline.server')
  const made = kind === 'skit' ? await writeSkit(row.story_clean, v) : await writeSketch(row.story_clean, v)
  if (!made) return { ok: false, reason: 'failed' }
  await supabaseAdmin.from('bit_versions').update({ [col]: made } as never).eq('id', v.id)
  return { ok: true, data: made as T }
}

const LayoutInput = z.object({ bit_id: z.string().uuid(), version_id: z.string().uuid(), ...Ctx })

export const getSkit = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => LayoutInput.parse(d))
  .handler(({ data }) => layoutFor<SkitBeat[]>('skit', data.bit_id, data.version_id, data.anon_session_id ?? null))

export const getSketch = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => LayoutInput.parse(d))
  .handler(({ data }) => layoutFor<SketchElement[]>('sketch', data.bit_id, data.version_id, data.anon_session_id ?? null))

/* ───────────────────────── download ───────────────────────── */

/* ───────────────────────── AI on demand: one line, funnier · keep an edited version ───────────────────────── */

export type TouchResult =
  | { ok: true; options: TouchOption[]; used: number; cap: number | null }
  | { ok: false; reason: 'sign_in' | 'not_found' | 'rate_limited' | 'failed' | 'crisis' }
  | { ok: false; reason: 'limited'; used: number; cap: number; tier: BitTier }

const DraftIn = z.object({
  hook: z.string().max(300),
  setup: z.string().max(600),
  tags: z.array(z.string().max(600)).max(3),
  button: z.string().max(600),
})

/** Three versions of one line of the bit as it stands on the page (edits
 *  included), the rest held still. A touch, not a bit: Free 3 a day, paid
 *  unlimited, counted in bit_usage under touch:<user>. Nothing is stored. */
export const touchLine = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({
      /** the bit on the result page; absent in the lined box, where no bit exists yet */
      bit_id: z.string().uuid().optional(),
      draft: DraftIn,
      slot: z.enum(SLOTS),
      avoid: z.array(z.string().max(600)).max(12).optional(),
      /** the box's settings, when there is no bit to read them from */
      controls: ControlsSchema,
      ...Ctx,
    }).parse(d),
  )
  .handler(async ({ data }): Promise<TouchResult> => {
    const supabaseAdmin = await adminDb()
    const id = await resolveJokeIdentity(data.anon_session_id ?? null)
    if (!id.userId) return { ok: false, reason: 'sign_in' }
    const row = data.bit_id ? await loadOwnedBit(supabaseAdmin, data.bit_id, id) : null
    if (data.bit_id && !row) return { ok: false, reason: 'not_found' }
    const tier = await resolveTier(supabaseAdmin, id)
    const { day } = today()
    if ((await chargeNetwork(supabaseAdmin, guestOrAccount(id), day, 1)) === 'limited') return { ok: false, reason: 'rate_limited' }
    const subject = `touch:${id.userId}`
    const limit = limitFor('touch', tier)
    const chargeId = crypto.randomUUID()
    let used: number
    try {
      used = await chargeBit(supabaseAdmin, subject, day, limit.cap ?? TOUCH_FAIR_USE, chargeId)
    } catch {
      return { ok: false, reason: 'failed' }
    }
    if (used === -1) return limit.cap === null ? { ok: false, reason: 'rate_limited' } : { ok: false, reason: 'limited', used: limit.cap, cap: limit.cap, tier }
    const controls = { ...DEFAULT_CONTROLS, ...(row ? row.controls ?? {} : data.controls ?? {}) } as BitControls
    // Typed lines are the person's own text: names come out before a model sees them.
    const clean = { ...data.draft, why: '' }
    for (const sl of SLOTS) {
      const v = readSlot(clean, sl)
      if (v && hasContactDetails(v)) Object.assign(clean, writeSlot(clean, sl, (await runScrub(v)).clean_text))
    }
    // In the lined box the lines are the story; the Guard reads them like one.
    let story = row?.story_clean ?? ''
    if (!row) {
      story = linesAsStory(clean)
      if (story.length < 3) return { ok: false, reason: 'failed' }
      const crisis = await runClassifyCrisis(story)
      if (crisis.crisis) {
        await refundBit(supabaseAdmin, subject, day, chargeId)
        await supabaseAdmin.from('crisis_events').insert({ alias_id: id.userId, category: crisis.category, severity: crisis.severity, resources_shown: true } as never)
        return { ok: false, reason: 'crisis' }
      }
    }
    const options = await touchLineDraft(story, clean, data.slot, controls, data.avoid ?? [])
    if (!options) {
      await refundBit(supabaseAdmin, subject, day, chargeId)
      return { ok: false, reason: 'failed' }
    }
    return { ok: true, options, used, cap: limit.cap }
  })

/** Keep the bit as it stands on the page (typed lines, picked lines) as a
 *  version of its own. The person's words are scrubbed like a story; the
 *  version is theirs, never used anywhere else. No model call, no charge. */
export const keepVersion = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ bit_id: z.string().uuid(), draft: DraftIn, ...Ctx }).parse(d))
  .handler(async ({ data }): Promise<VersionResult> => {
    const supabaseAdmin = await adminDb()
    const id = await resolveJokeIdentity(data.anon_session_id ?? null)
    if (!id.userId) return { ok: false, reason: 'sign_in' }
    const row = await loadOwnedBit(supabaseAdmin, data.bit_id, id)
    if (!row) return { ok: false, reason: 'not_found' }
    const versions = await loadVersions(supabaseAdmin, row.id)
    if (versions.length >= MAX_VERSIONS) return { ok: false, reason: 'too_many' }
    let draft = { ...data.draft, tags: data.draft.tags.map((t) => t.trim()).filter(Boolean), why: 'kept as written by you' }
    draft = { ...draft, hook: draft.hook.trim(), setup: draft.setup.trim(), button: draft.button.trim() }
    if (!draft.hook || !draft.setup || !draft.button || !draft.tags.length) return { ok: false, reason: 'failed' }
    for (const sl of SLOTS) {
      const v = readSlot(draft, sl)
      if (v && hasContactDetails(v)) draft = writeSlot(draft, sl, (await runScrub(v)).clean_text)
    }
    const controls = { ...DEFAULT_CONTROLS, ...(row.controls ?? {}) } as BitControls
    const saved = await insertVersion(supabaseAdmin, row.id, 'edited', draft, controls.heat)
    forgetPerson(id.userId)
    return { ok: true, version: toVersion(saved) }
  })

/** The usage bar (Nov 5 2026): what this account has used of its plan, for
 *  the header pill and the profile. Pro reads unlimited (null caps). */
export type MyUsage = {
  tier: BitTier
  bits: { used: number; cap: number | null; resets_at: string }
  downloads: { used: number; cap: number | null; period: 'day' | 'month' }
  touches: { used: number; cap: number | null }
  /** realtor kits written: Free 1 ever, Basic 20 a month, Pro unlimited (a bought kit never counts) */
  kits: { used: number; cap: number | null; period: 'month' | 'ever'; credits: number }
}
export const myUsage = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ ...Ctx }).parse(d ?? {}))
  .handler(async ({ data }): Promise<MyUsage | null> => {
    const supabaseAdmin = await adminDb()
    const id = await resolveJokeIdentity(data.anon_session_id ?? null)
    if (!id.userId) return null
    const tier = await resolveTier(supabaseAdmin, id)
    const { day, resetsAt } = today()
    const k = limitFor('kit', tier)
    const kitsQ = async () => {
      let q = supabaseAdmin.from('kits').select('id', { count: 'exact', head: true }).eq('user_id', id.userId).eq('paid', false)
      if (k.period === 'month') q = q.gte('day', `${day.slice(0, 7)}-01`)
      const { count } = await q
      return count ?? 0
    }
    const creditsQ = async () => {
      const [{ data: paid }, { data: used }] = await Promise.all([
        supabaseAdmin.from('events').select('properties').eq('user_id', id.userId).eq('name', 'kit_prepaid').limit(200),
        supabaseAdmin.from('events').select('properties').eq('user_id', id.userId).eq('name', 'kit_prepay_used').limit(200),
      ])
      const spent = new Set((used ?? []).map((r: any) => r.properties?.stripe_session).filter(Boolean))
      return new Set((paid ?? []).map((r: any) => r.properties?.stripe_session).filter((x: any) => x && !spent.has(x))).size
    }
    const [bitsUsed, dl, touchesUsed, kitsUsed, kitCreditsN] = await Promise.all([
      readUsed(supabaseAdmin, id.subjectKey, day).catch(() => 0),
      downloadsUsed(supabaseAdmin, id.userId, tier).catch(() => 0),
      readUsed(supabaseAdmin, `touch:${id.userId}`, day).catch(() => 0),
      kitsQ().catch(() => 0),
      creditsQ().catch(() => 0),
    ])
    const d = limitFor('download', tier)
    return {
      tier,
      bits: { used: bitsUsed, cap: limitFor('bit', tier).cap, resets_at: resetsAt },
      downloads: { used: dl, cap: d.cap, period: d.period === 'ever' ? 'day' : d.period },
      touches: { used: touchesUsed, cap: limitFor('touch', tier).cap },
      kits: { used: kitsUsed, cap: k.cap, period: k.period === 'ever' ? 'ever' : 'month', credits: kitCreditsN },
    }
  })

export type DownloadCharge =
  | { ok: true; used: number; cap: number | null; watermarked: boolean; tier: BitTier; repeat: boolean }
  | { ok: false; reason: 'sign_in' | 'not_found' | 'failed' }
  | { ok: false; reason: 'limited'; used: number; cap: number; tier: BitTier }

export type DownloadUsage = { used: number; cap: number | null; tier: BitTier; period: 'day' | 'month' }


/** How many downloads this account has used today, for the labels. */
export const downloadUsage = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ ...Ctx }).parse(d ?? {}))
  .handler(async ({ data }): Promise<DownloadUsage> => {
    const supabaseAdmin = await adminDb()
    const id = await resolveJokeIdentity(data.anon_session_id ?? null)
    const tier = await resolveTier(supabaseAdmin, id)
    const { cap, period } = limitFor('download', tier)
    if (!id.userId) return { used: 0, cap, tier, period: period === 'ever' ? 'day' : period }
    const used = await downloadsUsed(supabaseAdmin, id.userId, tier).catch(() => 0)
    return { used, cap, tier, period: period === 'ever' ? 'day' : period }
  })

/** One download against today's cap. The picture, the
 *  PDF and the video are each their own download; the same kind on the same
 *  version the same day is free (a retry, a second copy). Logged to
 *  bit_downloads (the admin ledger) and to events (the admin feed); the
 *  browser sends the PostHog event with the same name and properties. */
export const chargeDownload = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ bit_id: z.string().uuid(), version_id: z.string().uuid(), kind: z.enum(DOWNLOAD_KINDS), ...Ctx }).parse(d),
  )
  .handler(async ({ data }): Promise<DownloadCharge> => {
    const supabaseAdmin = await adminDb()
    const id = await resolveJokeIdentity(data.anon_session_id ?? null)
    if (!id.userId) return { ok: false, reason: 'sign_in' }
    const row = await loadOwnedBit(supabaseAdmin, data.bit_id, id)
    if (!row) return { ok: false, reason: 'not_found' }
    const tier = await resolveTier(supabaseAdmin, id)
    const { day } = today()
    const cap = limitFor('download', tier).cap
    const watermarked = !isPaidTier(tier)
    // The ledger is bookkeeping. Whatever goes wrong with it (table not
    // there yet, a bad connection), the download goes through uncounted and
    // the reason lands in the admin feed, never in the user's face.
    const allowUncounted = async (why: string): Promise<DownloadCharge> => {
      console.error('[download] ledger unavailable, download allowed uncounted:', why)
      await supabaseAdmin
        .from('events')
        .insert({ user_id: id.userId, session_id: null, name: 'download_ledger_error', properties: { kind: data.kind, tier, why: why.slice(0, 200) } as never } as never)
        .then(() => {}, () => {})
      // Tell the founder (Nov 1 2026: a missing table went unnoticed 3 days).
      const { alertDownloadUncounted } = await import('./bits/alert.server')
      await alertDownloadUncounted({ kind: data.kind, tier, why: why.slice(0, 300) })
      return { ok: true, used: 0, cap, watermarked, tier, repeat: false }
    }
    try {
      let used: number
      try {
        used = await downloadsUsed(supabaseAdmin, id.userId, tier)
      } catch (e) {
        return allowUncounted(e instanceof Error ? e.message : String(e))
      }
      const { count: sameCount } = await supabaseAdmin
        .from('bit_downloads')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', id.userId)
        .eq('version_id', data.version_id)
        .eq('kind', data.kind)
        .eq('day', day)
      if ((sameCount ?? 0) > 0) return { ok: true, used, cap, watermarked, tier, repeat: true }
      if (cap !== null && used >= cap) return { ok: false, reason: 'limited', used, cap, tier }
      const { error } = await supabaseAdmin
        .from('bit_downloads')
        .insert({ user_id: id.userId, bit_id: row.id, version_id: data.version_id, kind: data.kind, tier, watermarked, day })
      if (error) {
        // The unique index: a parallel press already counted it.
        if (String(error.code) === '23505') return { ok: true, used, cap, watermarked, tier, repeat: true }
        return allowUncounted(error.message)
      }
      await supabaseAdmin
        .from('events')
        .insert({ user_id: id.userId, session_id: null, name: 'download', properties: { product: 'bits', kind: data.kind, tier, watermarked, bit_id: row.id, version_id: data.version_id } as never } as never)
        .then(() => {}, () => {})
      forgetPerson(id.userId)
      return { ok: true, used: used + 1, cap, watermarked, tier, repeat: false }
    } catch (e) {
      return allowUncounted(e instanceof Error ? e.message : String(e))
    }
  })

export type ExportResult =
  | { ok: true; svg: string; filename: string; watermarked: boolean; tier: BitTier }
  | { ok: false; reason: 'not_found' | 'sign_in' }

/** The picture, drawn here so the tier decides the mark: free gets the heavy
 *  watermark, Basic and Pro a clean file. Downloading takes an account. Everyone's picture
 *  carries the whole bit. */
export const exportBit = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ bit_id: z.string().uuid(), version_id: z.string().uuid(), format: z.enum(['bit', 'hook']), ...Ctx }).parse(d),
  )
  .handler(async ({ data }): Promise<ExportResult> => {
    const supabaseAdmin = await adminDb()
    const id = await resolveJokeIdentity(data.anon_session_id ?? null)
    if (!id.userId) return { ok: false, reason: 'sign_in' }
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
    const tier = await resolveTier(supabaseAdmin, id)
    const watermarked = !isPaidTier(tier)
    const svg = renderBitSvg({ ...v, format: data.format, locked: false, watermark: watermarked })
    return { ok: true, svg, filename: artFilename(v.hook, data.format), watermarked, tier }
  })

/* ───────────────────────── post to rooms ───────────────────────── */

export type PostResult =
  | { ok: true; room_id: string; already: boolean }
  | { ok: false; reason: 'sign_in' | 'not_found' | 'names' | 'crisis' | 'no_skit' | 'failed' }

/** A post is a whole bit or a whole skit, never a single joke. The content
 *  is snapshotted on the room so a later version never changes a post that
 *  already has likes and comments. */
export const postBitToRoom = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z
      .object({
        bit_id: z.string().uuid(),
        version_id: z.string().uuid(),
        kind: z.enum(['bit', 'skit']),
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
    const skitCol = (await cols(supabaseAdmin)).skit
    const { data: v } = await supabaseAdmin
      .from('bit_versions')
      .select(`id, hook, setup, tags, button, est_seconds, ${skitCol}`)
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
    if (data.kind === 'skit') {
      let beats = v[skitCol] as SkitBeat[] | null
      if (!beats) {
        const { writeSkit } = await import('./bits/pipeline.server')
        beats = await writeSkit(row.story_clean, v)
        if (!beats) return { ok: false, reason: 'no_skit' }
        await supabaseAdmin.from('bit_versions').update({ [skitCol]: beats } as never).eq('id', v.id)
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

