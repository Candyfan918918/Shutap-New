// The Guard — crisis classifier. Overrides everything. High recall over precision.
import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'
import { callAgent, callAgentBounded, tryParseJson } from './gateway'

export type CrisisResult = {
  crisis: boolean
  category: 'self_harm' | 'suicidal' | 'abuse' | 'danger' | 'none'
  severity: 'low' | 'medium' | 'high'
}

const GUARD_PROMPT = `You are THE GUARD — a safety classifier, not a voice. Read the text and decide if it
signals self-harm, suicidal intent, abuse, or imminent danger to the writer or someone
else. Bias toward catching it: when unsure, flag.
Return ONLY strict JSON, no prose:
{"crisis": true|false, "category": "self_harm|suicidal|abuse|danger|none", "severity": "low|medium|high"}`

// Deterministic keyword pre-check — false positive cost is low, false negative cost is high.
const HARD_SIGNALS = [
  'kill myself', 'end my life', 'suicide', 'suicidal', 'want to die',
  'hurt myself', 'self harm', 'self-harm', 'cutting myself',
  'overdose', 'jump off', 'no reason to live',
]

function keywordCrisis(text: string): CrisisResult | null {
  const t = text.toLowerCase()
  for (const sig of HARD_SIGNALS) {
    if (t.includes(sig)) {
      return { crisis: true, category: 'suicidal', severity: 'high' }
    }
  }
  if (/\b(he|she|they)\s+(hits|hit|beats|beat|hurts|hurt|punches)\s+me\b/.test(t)) {
    return { crisis: true, category: 'abuse', severity: 'high' }
  }
  return null
}

const GuardInput = z.object({ clean_text: z.string().min(1).max(8000) })

// Plain server-side function. Call directly from other server handlers to
// avoid nesting createServerFn calls through the RPC resolver.
export async function runClassifyCrisis(cleanText: string): Promise<CrisisResult> {
  const text = String(cleanText ?? '').slice(0, 8000)
  if (!text) return { crisis: false, category: 'none', severity: 'low' }
  const hard = keywordCrisis(text)
  if (hard) return hard

  const llm = await callAgentBounded({
    system: GUARD_PROMPT,
    messages: [{ role: 'user', content: text }],
    maxTokens: 80,
  }, 5_000)
  const parsed = tryParseJson<CrisisResult>(llm.text)
  if (parsed && typeof parsed.crisis === 'boolean') return parsed
  // graceful no-flag if AI offline
  return { crisis: false, category: 'none', severity: 'low' }
}

export const classifyCrisis = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => GuardInput.parse(data))
  .handler(async ({ data }): Promise<CrisisResult> => runClassifyCrisis(data.clean_text))
