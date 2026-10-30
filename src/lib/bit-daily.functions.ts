// Daily humor training (/bit-daily). Admin only.
//
// Every day: the newest /funniest page's techniques × three fresh stories
// (plus any story the founder types herself). One writer call per story
// writes one bit per technique, so each bit is traceable to its technique.
// No judge: she is the judge. She rates each bit keep / cut / rewrite, can
// mark the single funniest line, and leave a note.
//
// What the ratings change (src/lib/bits/house.server.ts):
//   · kept and rewritten bits are shown to the live writer as her taste
//   · each technique's keep rate raises or lowers how often it is dealt
// The weekly blind eval (/bit-eval) measures whether any of it is working.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { pacificDay } from '@/lib/pacific-day'
import type { BitControls, BitDraft } from '@/lib/bits/shared'

const CONTROLS: BitControls = { audience: 'social', voice: 'deadpan', length: '30s', heat: 3 }
const STORIES_PER_DAY = 3
const TECHNIQUES_PER_DAY = 4

export type DailyStory = { id: string; story: string; own?: boolean }
export type DailyTechnique = { id: string; name: string; op: string; slug: string }
export type DailyBit = {
  id: string
  story_id: string
  story: string
  technique_id: string
  technique_name: string
  bit: BitDraft | null
  rule: string | null
  verdict: 'keep' | 'cut' | 'rewrite' | null
  rewrite: string | null
  best_line: string | null
  note: string | null
  rated_at: string | null
}
export type DailyStats = {
  rated: number
  kept: number
  rewritten: number
  cut: number
  feeding: number
  techniques: { id: string; name: string; rated: number; kept: number }[]
}
export type DailyState = {
  day: string
  page: { slug: string; category: string; pick: string } | null
  techniques: DailyTechnique[]
  stories: DailyStory[]
  bits: DailyBit[]
  todo: string[]
  stats: DailyStats
}

async function assertAdmin(ctx: unknown): Promise<void> {
  const c = ctx as { supabase: { rpc: (fn: 'has_role', args: { _user_id: string; _role: 'admin' }) => PromiseLike<{ data: unknown; error: unknown }> }; userId: string }
  const { data, error } = await c.supabase.rpc('has_role', { _user_id: c.userId, _role: 'admin' })
  if (error || !data) throw new Error('Forbidden')
}

async function adminDb(): Promise<any> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  return supabaseAdmin
}

/** Today's page and its line techniques, topped up from earlier pages when
 *  the newest has fewer than four that work in a written line. */
async function todaysTechniques(): Promise<{ page: DailyState['page']; techniques: DailyTechnique[] }> {
  const [{ FUNNIEST }, { funniestBank }] = await Promise.all([import('@/lib/seo/funniest'), import('@/lib/bits/pipeline.server')])
  const pages = [...FUNNIEST].sort((a, b) => b.published.localeCompare(a.published))
  const bank = (await funniestBank()).line
  const picked: DailyTechnique[] = []
  for (const p of pages) {
    for (const t of bank.filter((x) => x.family === `funniest:${p.slug}`)) {
      if (picked.length < TECHNIQUES_PER_DAY) picked.push({ id: t.id, name: t.name, op: t.op, slug: p.slug })
    }
    if (picked.length >= TECHNIQUES_PER_DAY) break
  }
  const top = pages[0]
  return { page: top ? { slug: top.slug, category: top.category, pick: top.pick.name } : null, techniques: picked }
}

const STORY_PROMPT = `Write ${STORIES_PER_DAY} short stories that real people would type into a comedy app
about something that annoyed them recently. Each one:
- first person, past tense, one to three sentences, plain words, like a text to a friend
- has exactly one concrete detail a joke can grab: a clock time, a number, an object, or the exact words someone said (in quotes)
- no names, no places, nothing tragic, no illness, no bodies, nobody's age or looks
- small and everyday: the kind of thing that ruins twenty minutes, not a life
Make them different from each other: one about family, one about work or school, one about a roommate, partner, date or friend.
Today's date is {{DAY}}; do not mention it.
Return only JSON: {"stories":["...","...","..."]}`

/** Fallback when the story writer fails: never leave the day empty. */
const SPARE_STORIES = [
  'My neighbor knocked at 7am to ask if I could move my car. It was parked in front of my own house.',
  'My coworker replied-all "thanks!" to a 200-person email about the fire drill.',
  'My mom texted "call me, it\'s important." It was about a coupon.',
  'My roommate used my towel and hung it back up neatly, like that fixed it.',
  'My date showed up 25 minutes late and asked if I\'d already ordered for him.',
  'My manager said "no pressure" and then asked for it by end of day.',
  'My brother borrowed my charger in March. He just asked if I had a spare.',
  'The group chat planned dinner for Friday. I found out on Saturday from the photos.',
  'My landlord fixed the leak by putting a bucket under it and texting "should be good now."',
]

async function writeStories(day: string): Promise<DailyStory[]> {
  try {
    const { callAgent, tryParseJson, DEFAULT_MODEL } = await import('@/lib/agents/gateway')
    const res = await callAgent({
      model: DEFAULT_MODEL,
      temperature: 1.0,
      maxTokens: 800,
      timeoutMs: 20_000,
      messages: [{ role: 'user', content: STORY_PROMPT.replace('{{DAY}}', day) }],
    })
    const parsed = tryParseJson<{ stories?: unknown }>(res.text)
    const stories = (Array.isArray(parsed?.stories) ? parsed!.stories : [])
      .map((s) => String(s ?? '').replace(/\s+/g, ' ').trim())
      .filter((s) => s.length > 20 && s.length < 400)
      .slice(0, STORIES_PER_DAY)
    if (stories.length === STORIES_PER_DAY) return stories.map((story, i) => ({ id: `s${i + 1}`, story }))
  } catch {
    // fall through to the spares
  }
  const n = Number(day.replace(/-/g, '')) % SPARE_STORIES.length
  return Array.from({ length: STORIES_PER_DAY }, (_, i) => ({ id: `s${i + 1}`, story: SPARE_STORIES[(n + i * 3) % SPARE_STORIES.length]! }))
}

async function getOrCreateDay(db: any, day: string, pageSlug: string | null): Promise<DailyStory[]> {
  const { data } = await db.from('bit_daily_days').select('stories').eq('day', day).maybeSingle()
  if (data?.stories) return data.stories as DailyStory[]
  const stories = await writeStories(day)
  const { data: saved, error } = await db
    .from('bit_daily_days')
    .upsert({ day, page_slug: pageSlug, stories }, { onConflict: 'day', ignoreDuplicates: true })
    .select('stories')
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (saved?.stories) return saved.stories as DailyStory[]
  // another tab created it first
  const again = await db.from('bit_daily_days').select('stories').eq('day', day).single()
  return (again.data?.stories ?? stories) as DailyStory[]
}

function toBit(r: any): DailyBit {
  return {
    id: r.id,
    story_id: r.story_id,
    story: r.story,
    technique_id: r.technique_id,
    technique_name: r.technique_name,
    bit: r.bit ?? null,
    rule: r.meta?.rule ?? null,
    verdict: r.verdict ?? null,
    rewrite: r.rewrite ?? null,
    best_line: r.best_line ?? null,
    note: r.note ?? null,
    rated_at: r.rated_at ?? null,
  }
}

async function stats(db: any): Promise<DailyStats> {
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString()
  const { data } = await db.from('bit_daily').select('technique_id, technique_name, verdict, rated_at').not('rated_at', 'is', null).gte('rated_at', since)
  const rows: any[] = data ?? []
  const by = new Map<string, { id: string; name: string; rated: number; kept: number }>()
  let kept = 0, rewritten = 0, cut = 0
  for (const r of rows) {
    if (r.verdict === 'keep') kept++
    else if (r.verdict === 'rewrite') rewritten++
    else if (r.verdict === 'cut') cut++
    const t = by.get(r.technique_id) ?? { id: r.technique_id, name: r.technique_name, rated: 0, kept: 0 }
    t.rated++
    if (r.verdict === 'keep') t.kept++
    by.set(r.technique_id, t)
  }
  return {
    rated: rows.length,
    kept,
    rewritten,
    cut,
    feeding: Math.min(4, kept + rewritten),
    techniques: [...by.values()].sort((a, b) => b.kept / b.rated - a.kept / a.rated || b.rated - a.rated),
  }
}

async function state(db: any): Promise<DailyState> {
  const day = pacificDay()
  const { page, techniques } = await todaysTechniques()
  const stories = await getOrCreateDay(db, day, page?.slug ?? null)
  const { data, error } = await db.from('bit_daily').select('*').eq('day', day).order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  const bits = (data ?? []).map(toBit)
  const written = new Set(bits.map((b: DailyBit) => b.story_id))
  return { day, page, techniques, stories, bits, todo: stories.map((s) => s.id).filter((id) => !written.has(id)), stats: await stats(db) }
}

export const getDaily = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DailyState> => {
    await assertAdmin(context)
    return state(await adminDb())
  })

/** One writer call for one story: one bit per technique of the day. */
export const runDailyStory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ story_id: z.string().min(1).max(20) }).parse(d))
  .handler(async ({ data, context }): Promise<DailyBit[]> => {
    await assertAdmin(context)
    const db = await adminDb()
    const day = pacificDay()
    const { page, techniques } = await todaysTechniques()
    const stories = await getOrCreateDay(db, day, page?.slug ?? null)
    const story = stories.find((s) => s.id === data.story_id)
    if (!story) throw new Error('unknown story')
    if (!techniques.length) throw new Error('no techniques on the /funniest pages')

    const pipe = await import('@/lib/bits/pipeline.server')
    const { TECHNIQUES } = await import('@/lib/bits/techniques')
    const { houseSignal } = await import('@/lib/bits/house.server')
    const bank = (await pipe.funniestBank()).line
    const anyFit = TECHNIQUES.filter((t) => t.fit === 'any')
    const dealt = techniques.map((t, i) => ({
      primary: bank.find((b) => b.id === t.id)!,
      backup: anyFit[(Math.floor(Math.random() * anyFit.length) + i) % anyFit.length]!,
    }))
    const house = await houseSignal()
    let pass = await pipe.runBitPass(story.story, [], CONTROLS, { dealt, house: house.examples })
    if (!pass.bits.length) pass = await pipe.runBitPass(story.story, [], CONTROLS, { dealt, house: house.examples, model: pipe.backupWriterModel() })
    if (!pass.bits.length) throw new Error(pass.error ?? 'the writer returned nothing')

    const rows = pass.bits.flatMap((bit, i) => {
      const slot = pass.slots?.[i] ?? i
      const t = techniques[slot]
      if (!t) return []
      const rule = pipe.bitFailure(bit, story.story, CONTROLS)
      // Safety misses are never shown, not even to the founder.
      if (rule && pipe.isSafetyFailure(rule)) return []
      return [
        {
          day,
          story_id: story.id,
          story: story.story,
          technique_id: t.id,
          technique_name: t.name,
          page_slug: t.slug,
          bit,
          meta: { rule, writer: pass.model, prompt: pipe.BIT_PROMPT_VERSION },
        },
      ]
    })
    if (!rows.length) throw new Error('every bit broke a safety rule; try again')
    const { data: saved, error } = await db.from('bit_daily').upsert(rows, { onConflict: 'day,story_id,technique_id' }).select('*')
    if (error) throw new Error(error.message)
    return (saved ?? []).map(toBit)
  })

/** Her own story joins today's set (scrubbed first, like every story). */
export const addDailyStory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ story: z.string().min(10).max(1200) }).parse(d))
  .handler(async ({ data, context }): Promise<DailyStory> => {
    await assertAdmin(context)
    const db = await adminDb()
    const day = pacificDay()
    const { page } = await todaysTechniques()
    const stories = await getOrCreateDay(db, day, page?.slug ?? null)
    const { runScrub } = await import('@/lib/agents/scrubber.functions')
    const clean = (await runScrub(data.story)).clean_text.trim()
    if (!clean) throw new Error('nothing left after removing names')
    const own: DailyStory = { id: `own${stories.filter((s) => s.own).length + 1}`, story: clean, own: true }
    const { error } = await db.from('bit_daily_days').update({ stories: [...stories, own] }).eq('day', day)
    if (error) throw new Error(error.message)
    return own
  })

export const rateDaily = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        verdict: z.enum(['keep', 'cut', 'rewrite']),
        rewrite: z.string().max(1200).optional(),
        best_line: z.string().max(400).optional(),
        note: z.string().max(400).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<DailyBit> => {
    await assertAdmin(context)
    if (data.verdict === 'rewrite' && !data.rewrite?.trim()) throw new Error('write the rewrite first')
    const db = await adminDb()
    const { data: saved, error } = await db
      .from('bit_daily')
      .update({
        verdict: data.verdict,
        rewrite: data.verdict === 'rewrite' ? data.rewrite!.trim() : null,
        best_line: data.best_line?.trim() || null,
        note: data.note?.trim() || null,
        rated_at: new Date().toISOString(),
      })
      .eq('id', data.id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    const { forgetHouseSignal } = await import('@/lib/bits/house.server')
    forgetHouseSignal()
    return toBit(saved)
  })

export const dailyStats = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DailyStats> => {
    await assertAdmin(context)
    return stats(await adminDb())
  })
