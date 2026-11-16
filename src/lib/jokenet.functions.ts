// JokeNet admin server functions (Nov 16 2026). The Lab's in-house joke
// dataset, inside Shutap instead of an Excel file: list, add, rate, tag,
// import, export, and preview what the bit writer would be shown for a story.
//
// Admin only. In-house rows only: users' stories and bits never go in.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

async function db(): Promise<any> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}

async function assertAdmin(ctx: unknown): Promise<void> {
  const c = ctx as { supabase: any; userId: string }
  const { data, error } = await c.supabase.rpc('has_role', { _user_id: c.userId, _role: 'admin' })
  if (error || !data) throw new Error('Forbidden')
}

/* ── taxonomy (the master sheet's taxonomy tab) ── */

export const JOKENET_TAXONOMY = {
  archetype: ['work', 'ex', 'dating', 'family', 'roommate', 'friend', 'money', 'customer service', 'health system', 'transit', 'neighbors', 'internet', 'other'],
  move: ['their word made a world', 'fake precision', 'the object given a life', 'the errand', 'the lineup', 'answer the text', 'the procedure', 'the wrong role', 'the prior', 'counter-offer'],
  mechanism: ['incongruity', 'misdirection', 'hyperbole', 'understatement', 'wordplay', 'callback', 'rule of three', 'anti-humor', 'absurd literalism', 'contrast', 'analogy'],
  tone: ['dry', 'absurd', 'dark', 'warm', 'deadpan', 'petty', 'high-energy'],
  source: ['me', 'shutap', 'contributor', 'dataset'],
  license: ['own', 'CC-BY', 'CC0', 'unclear'],
} as const

const COLS = 'id, situation, joke, rating, slot, archetype, target, tone, heat, move, mechanism, voice, source, license, sent, wins, losses, posted_on, notes, founder, added_on, archived_at, created_at, updated_at'

export type JokenetRow = {
  id: number
  situation: string
  joke: string
  rating: number | null
  slot: string | null
  archetype: string | null
  target: string | null
  tone: string | null
  heat: number | null
  move: string | null
  mechanism: string | null
  voice: string | null
  source: string
  license: string
  sent: boolean
  wins: number
  losses: number
  posted_on: string | null
  notes: string | null
  founder: boolean
  added_on: string
  archived_at: string | null
  created_at: string
  updated_at: string
}

export type JokenetStats = {
  total: number
  rated: number
  unrated: number
  feedsWriter: number
  byRating: Record<string, number>
  untagged: number
  noVector: number
  archived: number
  addedThisWeek: number
}

/* ── list ── */

const ListInput = z.object({
  q: z.string().max(200).default(''),
  rating: z.enum(['all', 'unrated', '1', '2', '3', '4', '5', '4+']).default('all'),
  source: z.string().max(40).default('all'),
  archetype: z.string().max(40).default('all'),
  view: z.enum(['active', 'archived']).default('active'),
  sort: z.enum(['newest', 'oldest', 'rating', 'situation']).default('newest'),
  page: z.number().int().min(0).max(10_000).default(0),
  pageSize: z.number().int().min(10).max(200).default(50),
})

export const adminJokenetList = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListInput.parse(d ?? {}))
  .handler(async ({ data, context }): Promise<{ rows: JokenetRow[]; total: number; stats: JokenetStats }> => {
    await assertAdmin(context)
    const s = await db()
    let q = s.from('jokenet').select(COLS, { count: 'exact' })
    q = data.view === 'archived' ? q.not('archived_at', 'is', null) : q.is('archived_at', null)
    if (data.rating === 'unrated') q = q.is('rating', null)
    else if (data.rating === '4+') q = q.gte('rating', 4)
    else if (data.rating !== 'all') q = q.eq('rating', Number(data.rating))
    if (data.source !== 'all') q = q.eq('source', data.source)
    if (data.archetype !== 'all') q = data.archetype === 'untagged' ? q.is('archetype', null) : q.eq('archetype', data.archetype)
    const term = data.q.trim().replace(/[%,()]/g, ' ')
    if (term) q = q.or(`situation.ilike.%${term}%,joke.ilike.%${term}%,notes.ilike.%${term}%`)
    if (data.sort === 'newest') q = q.order('id', { ascending: false })
    else if (data.sort === 'oldest') q = q.order('id', { ascending: true })
    else if (data.sort === 'rating') q = q.order('rating', { ascending: false, nullsFirst: false }).order('id', { ascending: false })
    else q = q.order('situation', { ascending: true }).order('id', { ascending: true })
    const from = data.page * data.pageSize
    const { data: rows, count, error } = await q.range(from, from + data.pageSize - 1)
    if (error) throw new Error(error.message)
    return { rows: (rows ?? []) as JokenetRow[], total: count ?? 0, stats: await stats(s) }
  })

async function stats(s: any): Promise<JokenetStats> {
  const head = (f: (q: any) => any) => f(s.from('jokenet').select('id', { count: 'exact', head: true })).then((r: any) => r.count ?? 0)
  const active = (q: any) => q.is('archived_at', null)
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString()
  const [total, unrated, feedsWriter, untagged, noVector, archived, addedThisWeek, r1, r2, r3, r4, r5] = await Promise.all([
    head((q) => active(q)),
    head((q) => active(q).is('rating', null)),
    head((q) => active(q).gte('rating', 4).in('license', ['own', 'CC-BY', 'CC0']).neq('source', 'dataset')),
    head((q) => active(q).or('archetype.is.null,mechanism.is.null,tone.is.null')),
    head((q) => active(q).is('embedding', null)),
    head((q) => q.not('archived_at', 'is', null)),
    head((q) => active(q).gte('created_at', weekAgo)),
    ...[1, 2, 3, 4, 5].map((n) => head((q) => active(q).eq('rating', n))),
  ])
  return { total, rated: total - unrated, unrated, feedsWriter, untagged, noVector, archived, addedThisWeek, byRating: { '1': r1, '2': r2, '3': r3, '4': r4, '5': r5 } }
}

/* ── add / edit ── */

const opt = (max: number) => z.string().trim().max(max).nullable().optional()
const RowInput = z.object({
  id: z.number().int().positive().optional(),
  situation: z.string().trim().min(1).max(2000),
  joke: z.string().trim().min(1).max(2000),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  slot: opt(40),
  archetype: opt(40),
  target: opt(80),
  tone: opt(40),
  heat: z.number().int().min(1).max(3).nullable().optional(),
  move: opt(80),
  mechanism: opt(80),
  voice: opt(40),
  source: z.string().trim().max(40).optional(),
  license: z.enum(['own', 'CC-BY', 'CC0', 'unclear']).optional(),
  sent: z.boolean().optional(),
  posted_on: opt(40),
  notes: opt(2000),
  founder: z.boolean().optional(),
})
type RowIn = z.infer<typeof RowInput>

function clean(r: RowIn): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(r)) {
    if (k === 'id' || v === undefined) continue
    out[k] = typeof v === 'string' && v.trim() === '' ? null : v
  }
  return out
}

async function embedRows(s: any, rows: { id: number; situation: string }[]): Promise<number> {
  if (!rows.length) return 0
  const { embedTexts, toVectorLiteral } = await import('@/lib/agents/embeddings.server')
  let done = 0
  for (let i = 0; i < rows.length; i += 64) {
    const chunk = rows.slice(i, i + 64)
    const vecs = await embedTexts(chunk.map((r) => r.situation))
    await Promise.all(
      chunk.map(async (r, j) => {
        const v = vecs[j]
        if (!v) return
        const { error } = await s.from('jokenet').update({ embedding: toVectorLiteral(v) }).eq('id', r.id)
        if (!error) done++
      }),
    )
  }
  return done
}

export const adminJokenetSave = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RowInput.parse(d))
  .handler(async ({ data, context }): Promise<{ row: JokenetRow }> => {
    await assertAdmin(context)
    const s = await db()
    const patch = clean(data)
    let row: any
    let resituated = true
    if (data.id) {
      const { data: before } = await s.from('jokenet').select('situation').eq('id', data.id).maybeSingle()
      resituated = !before || before.situation !== data.situation
      const r = await s.from('jokenet').update(patch).eq('id', data.id).select(COLS).single()
      if (r.error) throw new Error(r.error.message)
      row = r.data
    } else {
      const r = await s.from('jokenet').insert({ source: 'me', license: 'own', ...patch }).select(COLS).single()
      if (r.error) throw new Error(r.error.message)
      row = r.data
    }
    if (resituated) await embedRows(s, [{ id: row.id, situation: row.situation }])
    return { row }
  })

export const adminJokenetPatch = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        ids: z.array(z.number().int().positive()).min(1).max(500),
        rating: z.number().int().min(1).max(5).nullable().optional(),
        archived: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<{ updated: number }> => {
    await assertAdmin(context)
    const patch: Record<string, unknown> = {}
    if (data.rating !== undefined) patch.rating = data.rating
    if (data.archived !== undefined) patch.archived_at = data.archived ? new Date().toISOString() : null
    if (!Object.keys(patch).length) return { updated: 0 }
    const { data: rows, error } = await (await db()).from('jokenet').update(patch).in('id', data.ids).select('id')
    if (error) throw new Error(error.message)
    return { updated: rows?.length ?? 0 }
  })

/* ── import ── */

export const adminJokenetImport = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ rows: z.array(RowInput).min(1).max(1000) }).parse(d))
  .handler(async ({ data, context }): Promise<{ added: number; updated: number; skipped: number }> => {
    await assertAdmin(context)
    const s = await db()
    // A row whose joke is already in JokeNet is an update (its rating and tags
    // win) when it carries an id that exists; otherwise a duplicate, skipped.
    const { data: existing } = await s.from('jokenet').select('id, joke').limit(100_000)
    const byJoke = new Map<string, number>((existing ?? []).map((r: any) => [norm(r.joke), r.id]))
    const ids = new Set<number>((existing ?? []).map((r: any) => r.id))
    let added = 0
    let updated = 0
    let skipped = 0
    const fresh: any[] = []
    for (const r of data.rows) {
      const key = norm(r.joke)
      if (r.id && ids.has(r.id)) {
        const { error } = await s.from('jokenet').update(clean(r)).eq('id', r.id)
        if (error) skipped++
        else updated++
        continue
      }
      if (byJoke.has(key)) {
        skipped++
        continue
      }
      byJoke.set(key, -1)
      fresh.push({ source: 'me', license: 'own', ...clean(r) })
    }
    for (let i = 0; i < fresh.length; i += 200) {
      const { data: ins, error } = await s.from('jokenet').insert(fresh.slice(i, i + 200)).select('id, situation')
      if (error) throw new Error(error.message)
      added += ins?.length ?? 0
      await embedRows(s, ins ?? [])
    }
    return { added, updated, skipped }
  })

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

/* ── export ── */

export const adminJokenetExport = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ rows: JokenetRow[] }> => {
    await assertAdmin(context)
    const s = await db()
    const out: JokenetRow[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await s.from('jokenet').select(COLS).order('id').range(from, from + 999)
      if (error) throw new Error(error.message)
      out.push(...(data ?? []))
      if (!data || data.length < 1000) break
    }
    return { rows: out }
  })

/* ── vectors (for matching rows to the story being written) ── */

export const adminJokenetEmbed = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(500).default(256) }).parse(d ?? {}))
  .handler(async ({ data, context }): Promise<{ embedded: number; remaining: number }> => {
    await assertAdmin(context)
    const s = await db()
    const { data: rows } = await s.from('jokenet').select('id, situation').is('embedding', null).is('archived_at', null).order('id').limit(data.limit)
    const embedded = await embedRows(s, rows ?? [])
    const { count } = await s.from('jokenet').select('id', { count: 'exact', head: true }).is('embedding', null).is('archived_at', null)
    return { embedded, remaining: count ?? 0 }
  })

/* ── tagging ── */

const TAG_PROMPT = `You label rows of a comedy dataset. For each row, read the situation and
the joke and fill the labels. Use ONLY the listed values; if none fits, null.

archetype (what kind of situation): {{ARCHETYPE}}
move (how the joke was built): {{MOVE}}
mechanism (why it is funny, humor theory): {{MECHANISM}}
tone: {{TONE}}
heat: 1 = gentle, 2 = pointed, 3 = brutal
target: who or what the joke is aimed at, 1–3 words (e.g. boss, mother-in-law,
  the situation). Never the teller.

Rows:
{{ROWS}}

Answer JSON only: {"rows":[{"id":<id>,"archetype":...,"move":...,"mechanism":...,"tone":...,"heat":<1-3>,"target":...}]}`

export const adminJokenetTag = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ids: z.array(z.number().int().positive()).max(40).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }): Promise<{ tagged: number; remaining: number; error?: string }> => {
    await assertAdmin(context)
    const s = await db()
    let q = s.from('jokenet').select('id, situation, joke, archetype, move, mechanism, tone, heat, target').is('archived_at', null)
    q = data.ids?.length ? q.in('id', data.ids) : q.or('archetype.is.null,mechanism.is.null,tone.is.null').order('id', { ascending: false }).limit(25)
    const { data: rows } = await q
    if (!rows?.length) return { tagged: 0, remaining: 0 }
    const { callAgent, tryParseJson } = await import('@/lib/agents/gateway')
    const T = JOKENET_TAXONOMY
    const res = await callAgent({
      model: (process.env['JOKENET_TAG_MODEL'] ?? '').trim() || undefined,
      temperature: 0,
      maxTokens: 4000,
      timeoutMs: 45_000,
      messages: [
        {
          role: 'user',
          content: TAG_PROMPT.replace('{{ARCHETYPE}}', T.archetype.join(' · '))
            .replace('{{MOVE}}', [...T.move, 'none'].join(' · '))
            .replace('{{MECHANISM}}', T.mechanism.join(' · '))
            .replace('{{TONE}}', T.tone.join(' · '))
            .replace('{{ROWS}}', rows.map((r: any) => `id ${r.id}\n  situation: ${r.situation}\n  joke: ${r.joke}`).join('\n')),
        },
      ],
    })
    if (res.error) return { tagged: 0, remaining: -1, error: res.error }
    const parsed = tryParseJson<{ rows?: any[] }>(res.text)
    const pick = (v: unknown, list: readonly string[]) => (typeof v === 'string' && list.includes(v) ? v : null)
    let tagged = 0
    for (const t of parsed?.rows ?? []) {
      const r = rows.find((x: any) => x.id === t?.id)
      if (!r) continue
      // Never overwrite a label already there: hers win.
      const patch: Record<string, unknown> = {}
      if (!r.archetype) patch.archetype = pick(t.archetype, T.archetype)
      if (!r.move) patch.move = pick(t.move, T.move)
      if (!r.mechanism) patch.mechanism = pick(t.mechanism, T.mechanism)
      if (!r.tone) patch.tone = pick(t.tone, T.tone)
      if (!r.heat && [1, 2, 3].includes(t.heat)) patch.heat = t.heat
      if (!r.target && typeof t.target === 'string' && t.target.trim()) patch.target = t.target.trim().slice(0, 80)
      for (const k of Object.keys(patch)) if (patch[k] == null) delete patch[k]
      if (!Object.keys(patch).length) continue
      const { error } = await s.from('jokenet').update(patch).eq('id', r.id)
      if (!error) tagged++
    }
    const { count } = await s.from('jokenet').select('id', { count: 'exact', head: true }).is('archived_at', null).or('archetype.is.null,mechanism.is.null,tone.is.null')
    return { tagged, remaining: count ?? 0 }
  })

/* ── what the writer sees ── */

export const adminJokenetPreview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ story: z.string().trim().min(1).max(4000) }).parse(d))
  .handler(async ({ data, context }): Promise<{ from: 'jokenet' | 'static'; lines: { s: string; l: string; m: string; f?: boolean }[] }> => {
    await assertAdmin(context)
    const { liveStandard } = await import('@/lib/bits/jokenet.server')
    return liveStandard(data.story, 6)
  })
