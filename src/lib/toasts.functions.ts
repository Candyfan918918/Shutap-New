// Shutap Toasts (Nov 6 2026): the server functions. Slice 1 is the lab only:
// admin-only, nothing charged, every candidate shown, each run stored in
// toast_evals for the founder to rate before anyone sees the product. The
// product functions (write, edit, lock) arrive behind the toasts flag.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { OCCASIONS, TONES, type Toast, type ToastForm, type ToastLine } from './toasts/shared'
import type { CutResult, ToastResult, ToastTouchOption } from './toasts/toast.server'
import type { ToastUsage } from './toasts/usage.server'

async function requireAdmin(context: unknown): Promise<void> {
  const c = context as { supabase: any; userId: string }
  const { data } = await c.supabase.rpc('has_role', { _user_id: c.userId, _role: 'admin' })
  if (!data) throw new Error('Forbidden')
}

const Pronoun = z.enum(['he', 'she', 'they'])
const line = z.string().trim().max(400)
/** The form as the browser sends it: names already swapped for {friend},
 *  {partner}, {me}. A real name never travels in these fields. */
export const ToastFormIn = z.object({
  occasion: z.enum(OCCASIONS),
  what: z.string().trim().max(120).optional(),
  relation: z.string().trim().max(80),
  pronouns: z.object({ friend: Pronoun, partner: Pronoun.optional() }),
  stories: z.array(line).max(3),
  true_thing: line,
  tone: z.enum(TONES),
  length: z.number().int().min(20).max(480),
  must_say: z.array(z.string().trim().min(1).max(80)).max(8),
  never_say: z.array(z.string().trim().min(1).max(60)).max(12),
})

const LineIn = z.object({
  section: z.string().max(60),
  text: z.string().max(600),
  source: z.enum(['shutap', 'story', 'true_thing', 'must_say', 'bridge']),
  ref: z.number().int().optional(),
  pause: z.boolean().optional(),
  laugh: z.boolean().optional(),
  glass: z.boolean().optional(),
  note: z.string().max(80).optional(),
})

export type LabToastResult =
  | { ok: true; result: ToastResult; form: ToastForm; eval_id: string | null; prompt_version: string }
  | { ok: false; reason: 'failed' | 'crisis'; form?: ToastForm }

/** Admin only: the real pipeline (Guard, Scrubber, two writers, checks,
 *  judge) on a lab form. The scrubbed form is what's stored and returned. */
export const labWriteToast = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ form: ToastFormIn }).parse(d))
  .handler(async ({ data, context }): Promise<LabToastResult> => {
    await requireAdmin(context)
    const { guardForm, scrubForm, writeToast } = await import('./toasts/toast.server')
    const { TOAST_PROMPT_VERSION } = await import('./toasts/prompts.server')
    const guard = await guardForm(data.form as ToastForm)
    if (guard.crisis) return { ok: false, reason: 'crisis' }
    const form = await scrubForm(data.form as ToastForm)
    const result = await writeToast(form)
    if (!result) return { ok: false, reason: 'failed', form }
    let evalId: string | null = null
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
      const { data: row } = await (supabaseAdmin as any)
        .from('toast_evals')
        .insert({ form, result: { toast: result.toast, winner: result.winner, why: result.why, ms: result.ms, seconds: result.seconds, cut_seconds: result.cut_seconds, candidates: result.candidates.map((c) => ({ model: c.model, ms: c.ms, seconds: c.seconds, checks: c.checks })) }, prompt_version: TOAST_PROMPT_VERSION })
        .select('id')
        .single()
      evalId = row?.id ?? null
    } catch (e) {
      console.warn('[toast-lab] eval not stored', e instanceof Error ? e.message : e)
    }
    return { ok: true, result, form, eval_id: evalId, prompt_version: TOAST_PROMPT_VERSION }
  })

/** Admin only: "funnier" on a line of a lab toast, or on a story line of the form. */
export const labTouchToast = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ form: ToastFormIn, kind: z.enum(['speech', 'story']), index: z.number().int().min(0).max(80), lines: z.array(LineIn).max(80).optional(), avoid: z.array(z.string().max(400)).max(9).optional() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; options: ToastTouchOption[] } | { ok: false }> => {
    await requireAdmin(context)
    const { touchToastLine } = await import('./toasts/toast.server')
    const form = data.form as ToastForm
    const options = await touchToastLine(form, data.kind === 'story' ? { kind: 'story', index: data.index } : { kind: 'speech', index: data.index, lines: (data.lines ?? []) as ToastLine[] }, data.avoid ?? [])
    return options ? { ok: true, options } : { ok: false }
  })

/** Admin only: "make a 60-second version" of a lab toast (on demand). */
export const labCutToast = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ form: ToastFormIn, lines: z.array(LineIn).min(1).max(80) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; cut: CutResult } | { ok: false; checks?: CutResult['checks'] }> => {
    await requireAdmin(context)
    const { writeCut60 } = await import('./toasts/toast.server')
    // the lab sees why a cut failed (the product only ever gets a passing cut)
    const cut = await writeCut60(data.form as ToastForm, data.lines as ToastLine[], { keepBest: true })
    if (!cut) return { ok: false }
    return cut.checks.some((c) => c.fatal) ? { ok: false, checks: cut.checks } : { ok: true, cut }
  })

/** Admin only (Nov 9 2026): make and keep the 60-second version of a picked
 *  lab toast, so the /toasts page demo shows it like a paid toast does. The
 *  same writer and checks as "make a 60-second version" in the product. */
export const labCutEval = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ eval_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; seconds: number } | { ok: false; checks: { rule: string; line: string }[] }> => {
    await requireAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const db = supabaseAdmin as any
    const { data: row } = await db.from('toast_evals').select('form, result').eq('id', data.eval_id).maybeSingle()
    const lines = row?.result?.toast?.lines as ToastLine[] | undefined
    if (!row || !lines?.length) return { ok: false, checks: [{ rule: 'no such lab toast', line: '' }] }
    const { writeCut60 } = await import('./toasts/toast.server')
    const cut = await writeCut60(row.form as ToastForm, lines, { keepBest: true })
    if (!cut) return { ok: false, checks: [{ rule: 'no answer', line: '' }] }
    const fatal = cut.checks.filter((c) => c.fatal)
    if (fatal.length) return { ok: false, checks: fatal.map((c) => ({ rule: c.rule, line: c.line })) }
    const result = { ...row.result, toast: { ...row.result.toast, cut60: cut.lines }, cut_seconds: cut.seconds }
    const { error } = await db.from('toast_evals').update({ result }).eq('id', data.eval_id)
    return error ? { ok: false, checks: [{ rule: 'not saved', line: '' }] } : { ok: true, seconds: cut.seconds }
  })

/** Admin only: rate a lab toast. */
export const rateLabToast = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ eval_id: z.string().uuid(), rating: z.enum(['pick', 'cut', 'rewrite']), notes: z.string().max(1000).optional() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    await requireAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { error } = await (supabaseAdmin as any).from('toast_evals').update({ rating: data.rating, notes: data.notes ?? null }).eq('id', data.eval_id)
    return { ok: !error }
  })

export type ToastLedger = { total: number; pick: number; cut: number; rewrite: number; unrated: number; by_occasion: Record<string, { pick: number; cut: number; rewrite: number; unrated: number }>; /** picks (the /toasts page demos) with no 60-second version yet */ uncut: { id: string; occasion: string; relation: string }[] }

/** Admin only: the lab's ledger, by occasion (every occasion needs a pick before launch). */
export const labToastEvals = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }): Promise<ToastLedger> => {
    await requireAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data } = await (supabaseAdmin as any).from('toast_evals').select('id, rating, form, cut:result->toast->cut60').order('created_at', { ascending: false })
    const rows: { id: string; rating: string | null; form: { occasion?: string; relation?: string }; cut: unknown[] | null }[] = data ?? []
    const out: ToastLedger = { total: rows.length, pick: 0, cut: 0, rewrite: 0, unrated: 0, by_occasion: {}, uncut: [] }
    for (const r of rows) {
      if (r.rating === 'pick' && !(Array.isArray(r.cut) && r.cut.length)) out.uncut.push({ id: r.id, occasion: r.form?.occasion ?? '?', relation: r.form?.relation ?? '' })
      const o = r.form?.occasion ?? '?'
      const b = (out.by_occasion[o] ??= { pick: 0, cut: 0, rewrite: 0, unrated: 0 })
      const k = r.rating === 'pick' || r.rating === 'cut' || r.rating === 'rewrite' ? r.rating : 'unrated'
      out[k]++
      b[k]++
    }
    return out
  })

export type { Toast, ToastForm }

/* ───────────────────────── the product (slice 2, Nov 6 2026) ─────────────────────────
   Signed-in users, behind the toasts flag (admins while it's dark). The form
   is written into a toast here: the Guard first (a crisis never sees a
   paywall), then the plan's allowance (a credit bought ahead pays for one
   past the limit), the Scrubber, the writer. What's stored: the scrubbed
   form and the speech, never a name. A write that fails never counts. */
async function toastsOpen(context: unknown): Promise<boolean> {
  const { readFlags } = await import('./flags')
  if (readFlags().toasts) return true
  try { await requireAdmin(context); return true } catch { return false }
}

function isAnon(context: unknown): boolean {
  return !!(context as { claims?: { is_anonymous?: boolean } }).claims?.is_anonymous
}

export type ToastRow = {
  id: string
  occasion: ToastForm['occasion']
  tone: ToastForm['tone']
  length: number
  form: ToastForm
  paid: boolean
  marked: boolean
  locked_at: string | null
  parent_id: string | null
  created_at: string
  version_id: string | null
  toast: Toast | null
  cut60: { lines: ToastLine[]; seconds: number } | null
}

export type WriteMyToastResult =
  | { ok: true; id: string; usage: ToastUsage }
  | { ok: false; reason: 'off' | 'sign_in' | 'crisis' | 'failed' }
  | { ok: false; reason: 'limited'; usage: ToastUsage }

/** Write my toast. Counts one toast (unless bought ahead: then it's paid). */
export const writeMyToast = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ form: ToastFormIn }).parse(d))
  .handler(async ({ data, context }): Promise<WriteMyToastResult> => {
    if (isAnon(context)) return { ok: false, reason: 'sign_in' }
    if (!(await toastsOpen(context))) return { ok: false, reason: 'off' }
    const { userId } = context as { userId: string }
    const form = data.form as ToastForm
    if (!form.stories.some((s) => s.trim())) return { ok: false, reason: 'failed' }
    const { guardForm, scrubForm, writeToast } = await import('./toasts/toast.server')
    // the Guard overrides everything: no paywall, no speech
    const guard = await guardForm(form)
    if (guard.crisis) {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
      await (supabaseAdmin as any).from('events').insert({ user_id: userId, session_id: null, name: 'toast_guard_blocked', product: 'toasts', properties: { product: 'toasts', category: guard.category } }).then(() => {}, () => {})
      return { ok: false, reason: 'crisis' }
    }
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const admin = supabaseAdmin as any
    const { kitTier, today } = await import('./bits/tier.server')
    const { toastAllowance, toastMarked, toastUsage } = await import('./toasts/usage.server')
    const tier = await kitTier(admin, userId)
    const allow = await toastAllowance(admin, userId, tier)
    if (!allow.ok) return { ok: false, reason: 'limited', usage: allow.usage }
    const clean = await scrubForm(form)
    const result = await writeToast(clean)
    if (!result) return { ok: false, reason: 'failed' }
    const { TOAST_PROMPT_VERSION } = await import('./toasts/prompts.server')
    const paid = !!allow.credit
    const { data: row, error } = await admin.from('toasts').insert({
      user_id: userId, occasion: clean.occasion, tone: clean.tone, length: String(clean.length), form: clean,
      prompt_version: TOAST_PROMPT_VERSION, tier, paid, marked: toastMarked(tier, paid), day: today().day,
    }).select('id').single()
    if (error || !row) { console.error('[toasts] insert failed', error?.message); return { ok: false, reason: 'failed' } }
    const winner = result.candidates[result.winner]
    await admin.from('toast_versions').insert({ toast_id: row.id, kind: 'original', content: result.toast, checks: winner?.checks ?? [] })
    if (allow.credit) await admin.from('events').insert({ user_id: userId, session_id: null, name: 'toast_prepay_used', product: 'toasts', properties: { product: 'toasts', toast_id: row.id, stripe_session: allow.credit } }).then(() => {}, () => {})
    await admin.from('events').insert({ user_id: userId, session_id: null, name: 'toast_written', product: 'toasts', properties: { product: 'toasts', toast_id: row.id, occasion: clean.occasion, tone: clean.tone, length: clean.length, seconds: result.seconds, ms: result.ms, tier, paid, stories: clean.stories.filter((s) => s.trim()).length } }).then(() => {}, () => {})
    return { ok: true, id: row.id as string, usage: await toastUsage(admin, userId, tier) }
  })

/** My toast usage, for the labels on the form ("your first toast is free"). */
export const myToastUsage = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }): Promise<{ open: boolean; usage: ToastUsage | null }> => {
    const open = await toastsOpen(context)
    if (isAnon(context)) return { open, usage: null }
    const { userId } = context as { userId: string }
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { kitTier } = await import('./bits/tier.server')
    const { toastUsage } = await import('./toasts/usage.server')
    const tier = await kitTier(supabaseAdmin as any, userId)
    return { open, usage: await toastUsage(supabaseAdmin as any, userId, tier) }
  })

/** One of my toasts, with its latest version. */
export const getMyToast = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; toast: ToastRow } | { ok: false; reason: 'not_found' | 'off' }> => {
    if (!(await toastsOpen(context))) return { ok: false, reason: 'off' }
    const { userId } = context as { userId: string }
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const toast = await loadToastRow(supabaseAdmin as any, data.id, userId)
    return toast ? { ok: true, toast } : { ok: false, reason: 'not_found' }
  })

/** One toast with the version that counts: the locked one, else the latest. */
async function loadToastRow(admin: any, id: string, userId: string): Promise<ToastRow | null> {
  const { data: t } = await admin.from('toasts').select('id, occasion, tone, length, form, paid, marked, locked_at, locked_version_id, parent_id, created_at, cut60').eq('id', id).eq('user_id', userId).maybeSingle()
  if (!t) return null
  const q = admin.from('toast_versions').select('id, content').eq('toast_id', t.id)
  const { data: v } = t.locked_version_id ? await q.eq('id', t.locked_version_id).maybeSingle() : await q.order('created_at', { ascending: false }).limit(1).maybeSingle()
  return { id: t.id, occasion: t.occasion, tone: t.tone, length: Number(t.length), form: t.form, paid: !!t.paid, marked: !!t.marked, locked_at: t.locked_at, parent_id: t.parent_id, created_at: t.created_at, version_id: v?.id ?? null, toast: (v?.content as Toast) ?? null, cut60: (t.cut60 as ToastRow['cut60']) ?? null }
}

/** "funnier" on a story line in the form: three ways to tell the same story.
 *  Never paid, never counted; signed in only. Nothing is stored. */
export const touchMyStory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ form: ToastFormIn, index: z.number().int().min(-1).max(2), avoid: z.array(z.string().max(400)).max(9).optional() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; options: ToastTouchOption[] } | { ok: false; reason: 'off' | 'sign_in' | 'failed' }> => {
    if (isAnon(context)) return { ok: false, reason: 'sign_in' }
    if (!(await toastsOpen(context))) return { ok: false, reason: 'off' }
    const { touchToastLine } = await import('./toasts/toast.server')
    // index -1 is the one true thing (Nov 8 2026: funnier and lock on every line the person types)
    const options = await touchToastLine(data.form as ToastForm, data.index < 0 ? { kind: 'true_thing' } : { kind: 'story', index: data.index }, data.avoid ?? [])
    const { userId } = context as { userId: string }
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    await (supabaseAdmin as any).from('events').insert({ user_id: userId, session_id: null, name: 'toast_story_funnier', product: 'toasts', properties: { product: 'toasts', occasion: data.form.occasion, story: data.index < 0 ? 'true_thing' : data.index + 1, options: options?.length ?? 0 } }).then(() => {}, () => {})
    return options ? { ok: true, options } : { ok: false, reason: 'failed' }
  })

/* ───────────────────────── edit → lock → keep (slice 3, Nov 6 2026) ─────────────────────────
   Editing is free and unlimited until the lock. A saved edit is a new
   version (names already swapped out in the browser; a line the person
   typed with another name in it goes through the Scrubber). Lock freezes
   one version for good. After that: "change a line" is a new toast copied
   from this one ($12.99, free on Pro), and the 60-second version is made on
   demand and kept. Downloads and copies are never counted. */

async function adminDb(): Promise<any> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}

async function event(admin: any, userId: string, name: string, properties: Record<string, unknown>): Promise<void> {
  await admin.from('events').insert({ user_id: userId, session_id: null, name, product: 'toasts', properties: { product: 'toasts', ...properties } }).then(() => {}, () => {})
}

async function latestVersion(admin: any, toastId: string): Promise<{ id: string; content: Toast } | null> {
  const { data } = await admin.from('toast_versions').select('id, content').eq('toast_id', toastId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  return data ? { id: data.id, content: data.content as Toast } : null
}

/** A name typed mid-sentence (a capital after a lowercase word) or a
 *  contact detail sends the line through the Scrubber; anything else is
 *  stored as typed, so role words aren't over-redacted. */
async function cleanEdited(lines: ToastLine[], before: ToastLine[]): Promise<ToastLine[]> {
  const { scrubOne } = await import('./toasts/toast.server')
  const { hasContactDetails } = await import('./agents/scrubber.functions')
  const nameLike = /[a-z,;:] (?!I\b)[A-Z][a-z]{1,}/
  return Promise.all(lines.map(async (l, i) => {
    const prev = before[i]
    const text = l.text.trim()
    if (prev && prev.text === text) return { ...l, text }
    if (hasContactDetails(text) || nameLike.test(text.replace(/\{(friend|partner|me)\}/g, 'x'))) return { ...l, text: await scrubOne(text) }
    return { ...l, text }
  }))
}

const IdIn = z.object({ id: z.string().uuid() })
const EditIn = z.object({ id: z.string().uuid(), lines: z.array(LineIn).min(1).max(80) })

/** Keep the speech as edited on the page: a new version. No model, no charge. */
export const keepToastEdit = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EditIn.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; version_id: string; lines: ToastLine[] } | { ok: false; reason: 'off' | 'not_found' | 'locked' | 'failed' }> => {
    if (!(await toastsOpen(context))) return { ok: false, reason: 'off' }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const { data: t } = await admin.from('toasts').select('id, locked_at').eq('id', data.id).eq('user_id', userId).maybeSingle()
    if (!t) return { ok: false, reason: 'not_found' }
    if (t.locked_at) return { ok: false, reason: 'locked' }
    const prev = await latestVersion(admin, t.id)
    if (!prev) return { ok: false, reason: 'not_found' }
    const lines = await cleanEdited(data.lines as ToastLine[], prev.content.lines)
    const content: Toast = { ...prev.content, lines }
    const { data: v, error } = await admin.from('toast_versions').insert({ toast_id: t.id, kind: 'edited', content }).select('id').single()
    if (error || !v) return { ok: false, reason: 'failed' }
    await admin.from('toasts').update({ updated_at: new Date().toISOString() }).eq('id', t.id)
    return { ok: true, version_id: v.id as string, lines }
  })

/** "funnier" on one line of my speech: three options, nothing changes until picked. */
export const touchMyLine = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), index: z.number().int().min(0).max(80), lines: z.array(LineIn).min(1).max(80), avoid: z.array(z.string().max(400)).max(9).optional() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; options: ToastTouchOption[] } | { ok: false; reason: 'off' | 'not_found' | 'locked' | 'failed' }> => {
    if (!(await toastsOpen(context))) return { ok: false, reason: 'off' }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const { data: t } = await admin.from('toasts').select('id, form, locked_at, occasion').eq('id', data.id).eq('user_id', userId).maybeSingle()
    if (!t) return { ok: false, reason: 'not_found' }
    if (t.locked_at) return { ok: false, reason: 'locked' }
    const { touchToastLine } = await import('./toasts/toast.server')
    const options = await touchToastLine(t.form as ToastForm, { kind: 'speech', index: data.index, lines: data.lines as ToastLine[] }, data.avoid ?? [])
    await event(admin, userId, 'toast_line_funnier', { toast_id: t.id, occasion: t.occasion, line: data.index + 1, options: options?.length ?? 0 })
    return options ? { ok: true, options } : { ok: false, reason: 'failed' }
  })

/** Lock: the words are final. Saves the page's lines first if they changed. */
export const lockMyToast = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EditIn.parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; toast: ToastRow } | { ok: false; reason: 'off' | 'not_found' | 'failed' }> => {
    if (!(await toastsOpen(context))) return { ok: false, reason: 'off' }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const { data: t } = await admin.from('toasts').select('id, locked_at, occasion').eq('id', data.id).eq('user_id', userId).maybeSingle()
    if (!t) return { ok: false, reason: 'not_found' }
    if (!t.locked_at) {
      const prev = await latestVersion(admin, t.id)
      if (!prev) return { ok: false, reason: 'not_found' }
      let versionId = prev.id
      const changed = JSON.stringify(prev.content.lines) !== JSON.stringify(data.lines)
      if (changed) {
        const lines = await cleanEdited(data.lines as ToastLine[], prev.content.lines)
        const { data: v } = await admin.from('toast_versions').insert({ toast_id: t.id, kind: 'edited', content: { ...prev.content, lines } }).select('id').single()
        if (!v) return { ok: false, reason: 'failed' }
        versionId = v.id
      }
      const { error } = await admin.from('toasts').update({ locked_at: new Date().toISOString(), locked_version_id: versionId, updated_at: new Date().toISOString() }).eq('id', t.id).eq('user_id', userId)
      if (error) return { ok: false, reason: 'failed' }
      await event(admin, userId, 'toast_locked', { toast_id: t.id, occasion: t.occasion, edited: changed })
    }
    const toast = await loadToastRow(admin, data.id, userId)
    return toast ? { ok: true, toast } : { ok: false, reason: 'failed' }
  })

/** "make a 60-second version": written once from the locked speech, kept. */
export const cutMyToast = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), again: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true; cut: { lines: ToastLine[]; seconds: number } } | { ok: false; reason: 'off' | 'not_found' | 'not_locked' | 'failed' }> => {
    if (!(await toastsOpen(context))) return { ok: false, reason: 'off' }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const { data: t } = await admin.from('toasts').select('id, form, locked_version_id, cut60, occasion').eq('id', data.id).eq('user_id', userId).maybeSingle()
    if (!t) return { ok: false, reason: 'not_found' }
    if (!t.locked_version_id) return { ok: false, reason: 'not_locked' }
    if (t.cut60 && !data.again) return { ok: true, cut: t.cut60 }
    const { data: v } = await admin.from('toast_versions').select('content').eq('id', t.locked_version_id).maybeSingle()
    if (!v) return { ok: false, reason: 'not_found' }
    const { writeCut60 } = await import('./toasts/toast.server')
    const cut = await writeCut60(t.form as ToastForm, (v.content as Toast).lines)
    if (!cut) return { ok: false, reason: 'failed' }
    const kept = { lines: cut.lines, seconds: cut.seconds }
    await admin.from('toasts').update({ cut60: kept }).eq('id', t.id)
    await event(admin, userId, 'toast_cut_made', { toast_id: t.id, occasion: t.occasion, seconds: cut.seconds, again: !!data.again })
    return { ok: true, cut: kept }
  })

export type CopyResult = { ok: true; id: string } | { ok: false; reason: 'off' | 'not_found' | 'not_locked' | 'pay' | 'failed' }

/** "change a line" after a lock: a new, unlocked toast copied from this
 *  one; this one stays as it is. Free on Pro; otherwise it spends a toast
 *  bought for it ($12.99, toast_prepay) and the copy is clean. */
export const copyMyToast = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdIn.parse(d))
  .handler(async ({ data, context }): Promise<CopyResult> => {
    if (!(await toastsOpen(context))) return { ok: false, reason: 'off' }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const { data: t } = await admin.from('toasts').select('id, occasion, tone, length, form, prompt_version, locked_version_id').eq('id', data.id).eq('user_id', userId).maybeSingle()
    if (!t) return { ok: false, reason: 'not_found' }
    if (!t.locked_version_id) return { ok: false, reason: 'not_locked' }
    const { kitTier, today } = await import('./bits/tier.server')
    const { toastCredits } = await import('./toasts/usage.server')
    const tier = await kitTier(admin, userId)
    let credit: string | null = null
    if (tier !== 'pro') {
      credit = (await toastCredits(admin, userId).catch(() => [] as string[]))[0] ?? null
      if (!credit) return { ok: false, reason: 'pay' }
    }
    const { data: v } = await admin.from('toast_versions').select('content').eq('id', t.locked_version_id).maybeSingle()
    if (!v) return { ok: false, reason: 'not_found' }
    const { data: row, error } = await admin.from('toasts').insert({
      user_id: userId, occasion: t.occasion, tone: t.tone, length: t.length, form: t.form, prompt_version: t.prompt_version,
      tier, paid: !!credit, marked: false, parent_id: t.id, day: today().day,
    }).select('id').single()
    if (error || !row) return { ok: false, reason: 'failed' }
    await admin.from('toast_versions').insert({ toast_id: row.id, kind: 'original', content: v.content })
    if (credit) await event(admin, userId, 'toast_prepay_used', { toast_id: row.id, parent_id: t.id, stripe_session: credit })
    await event(admin, userId, 'toast_copied', { toast_id: row.id, parent_id: t.id, occasion: t.occasion, tier })
    return { ok: true, id: row.id as string }
  })

export type ToastSummary = { id: string; occasion: ToastForm['occasion']; tone: ToastForm['tone']; length: number; locked: boolean; paid: boolean; marked: boolean; parent_id: string | null; created_at: string }

/** My toasts, newest first, for My creations. */
export const listMyToasts = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .handler(async ({ context }): Promise<{ toasts: ToastSummary[] }> => {
    if (isAnon(context)) return { toasts: [] }
    const { userId } = context as { userId: string }
    const admin = await adminDb()
    const { data } = await admin.from('toasts').select('id, occasion, tone, length, locked_at, paid, marked, parent_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100)
    return { toasts: (data ?? []).map((t: any) => ({ id: t.id, occasion: t.occasion, tone: t.tone, length: Number(t.length), locked: !!t.locked_at, paid: !!t.paid, marked: !!t.marked, parent_id: t.parent_id, created_at: t.created_at })) }
  })
