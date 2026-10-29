// The bit eval bench (bit-1.4). Admin only. Thirty frozen stories, each
// written by two pipeline variants:
//   old — bit-1.2 prompt, flash-lite writer first (what was live Oct 16–29),
//         no judge, no technique deal
//   new — the current pipeline (bit-1.4 prompt, strong writer preferred,
//         judge on, techniques dealt from the hand-tuned 25 + the /funniest bank)
// Shown blind, left/right shuffled, rated pick-left / pick-right / neither.
// The founder's rating is the only "funnier" that counts.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { EVAL_SET, JOKENET_SET } from '@/lib/jokes/eval-set'
import type { BitControls, BitDraft } from '@/lib/bits/shared'

export const EVAL_ROUND = 'bit-1.4-vs-1.2'

/** The thirty: the frozen eval set plus the first founder-ledger stories. */
export const EVAL_STORIES: { id: string; story: string }[] = [
  ...EVAL_SET.map((s) => ({ id: s.id, story: s.situation })),
  ...JOKENET_SET.slice(0, 30 - EVAL_SET.length).map((s) => ({ id: s.id, story: s.situation })),
]

const CONTROLS: BitControls = { audience: 'social', voice: 'deadpan', length: '30s', heat: 3 }

export type EvalMeta = { variant: 'old' | 'new'; writer?: string; judge?: string; prompt?: string; techniques?: string[]; rejected?: string[]; ms: number; error?: string }

export type EvalPair = {
  id: string
  story_id: string
  story: string
  left_variant: 'old' | 'new' | null // null until rated: the page never learns which is which
  left_bit: BitDraft | null
  right_bit: BitDraft | null
  left_meta: EvalMeta | null
  right_meta: EvalMeta | null
  verdict: 'left' | 'right' | 'neither' | null
  note: string | null
  rated_at: string | null
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

function hide(row: any): EvalPair {
  const rated = !!row.rated_at
  return {
    id: row.id,
    story_id: row.story_id,
    story: row.story,
    left_variant: rated ? row.left_variant : null,
    left_bit: row.left_bit ?? null,
    right_bit: row.right_bit ?? null,
    left_meta: rated ? row.left_meta ?? null : null,
    right_meta: rated ? row.right_meta ?? null : null,
    verdict: row.verdict ?? null,
    note: row.note ?? null,
    rated_at: row.rated_at ?? null,
  }
}

/** Every pair in the round, rated and unrated, plus which stories are still to run. */
export const listEvalPairs = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ pairs: EvalPair[]; todo: string[] }> => {
    await assertAdmin(context)
    const db = await adminDb()
    const { data, error } = await db.from('bit_eval_pairs').select('*').eq('round', EVAL_ROUND).order('created_at', { ascending: true })
    if (error) throw new Error(error.message)
    const done = new Set((data ?? []).map((r: any) => r.story_id))
    return { pairs: (data ?? []).map(hide), todo: EVAL_STORIES.filter((s) => !done.has(s.id)).map((s) => s.id) }
  })

/** Write both variants for one story and store the pair, shuffled. */
export const runEvalPair = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ story_id: z.string().min(1).max(40) }).parse(d))
  .handler(async ({ data, context }): Promise<EvalPair> => {
    await assertAdmin(context)
    const story = EVAL_STORIES.find((s) => s.id === data.story_id)
    if (!story) throw new Error('unknown story')
    const db = await adminDb()
    const { writeBitFromStory } = await import('@/lib/bits/pipeline.server')
    const { BIT_PROMPT_V12, BIT_ANGLE_FINDER_V12 } = await import('@/lib/bits/prompt-v12.server')

    const t0 = Date.now()
    const [oldRun, newRun] = await Promise.all([
      writeBitFromStory(story.story, CONTROLS, undefined, undefined, {
        prompt: BIT_PROMPT_V12,
        angleFinder: BIT_ANGLE_FINDER_V12,
        writer: 'google/gemini-2.5-flash-lite',
        backup: 'google/gemini-2.5-flash',
        judge: false,
        preferPrimary: false,
        noTechniques: true,
      }),
      writeBitFromStory(story.story, CONTROLS),
    ])
    const ms = Date.now() - t0
    const meta = (r: Awaited<ReturnType<typeof writeBitFromStory>>, variant: 'old' | 'new'): EvalMeta =>
      r ? { variant, writer: r.writerModel, judge: r.judgeModel, prompt: r.promptVersion, techniques: r.techniques, rejected: r.rejected.map((x) => x.rule), ms } : { variant, error: 'no bit', ms }
    const leftIsOld = Math.random() < 0.5
    const row = {
      round: EVAL_ROUND,
      story_id: story.id,
      story: story.story,
      controls: CONTROLS,
      left_variant: leftIsOld ? 'old' : 'new',
      left_bit: (leftIsOld ? oldRun : newRun)?.ranked[0] ?? null,
      right_bit: (leftIsOld ? newRun : oldRun)?.ranked[0] ?? null,
      left_meta: leftIsOld ? meta(oldRun, 'old') : meta(newRun, 'new'),
      right_meta: leftIsOld ? meta(newRun, 'new') : meta(oldRun, 'old'),
    }
    const { data: saved, error } = await db.from('bit_eval_pairs').upsert(row, { onConflict: 'round,story_id' }).select('*').single()
    if (error) throw new Error(error.message)
    return hide(saved)
  })

/** The founder's verdict. Reveals which side was which. */
export const rateEvalPair = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), verdict: z.enum(['left', 'right', 'neither']), note: z.string().max(400).optional() }).parse(d))
  .handler(async ({ data, context }): Promise<EvalPair> => {
    await assertAdmin(context)
    const db = await adminDb()
    const { data: saved, error } = await db
      .from('bit_eval_pairs')
      .update({ verdict: data.verdict, note: data.note?.trim() || null, rated_at: new Date().toISOString() })
      .eq('id', data.id)
      .eq('round', EVAL_ROUND)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return hide(saved)
  })

/** The scoreboard: how often each variant won, over rated pairs only. */
export const evalSummary = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ rated: number; total: number; newWins: number; oldWins: number; neither: number }> => {
    await assertAdmin(context)
    const db = await adminDb()
    const { data } = await db.from('bit_eval_pairs').select('left_variant, verdict, rated_at').eq('round', EVAL_ROUND)
    const rows: any[] = data ?? []
    let newWins = 0, oldWins = 0, neither = 0
    for (const r of rows) {
      if (!r.rated_at) continue
      if (r.verdict === 'neither') neither++
      else if ((r.verdict === 'left') === (r.left_variant === 'new')) newWins++
      else oldWins++
    }
    return { rated: newWins + oldWins + neither, total: EVAL_STORIES.length, newWins, oldWins, neither }
  })
