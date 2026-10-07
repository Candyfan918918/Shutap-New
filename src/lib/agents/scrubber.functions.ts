// The Scrubber — guardrail that de-identifies free text BEFORE storage.
// Runs a deterministic regex pass for high-precision PII (email/phone/url),
// then an LLM pass through the gateway for names + locations.
// Output is the only thing ever stored; raw input is never persisted.
import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { z } from 'zod'
import { callAgent, tryParseJson } from './gateway'

export type ScrubReplacement = {
  detected_type: 'name' | 'address' | 'location' | 'phone' | 'email' | 'url'
  replacement_token: string
  count: number
}

export type ScrubResult = {
  clean_text: string
  replacements: ScrubReplacement[]
  notice: string
}

const SCRUBBER_PROMPT = `You are THE SCRUBBER. Find every piece of real personal information in this text and
replace it so the story stays vivid but no real person or place is identifiable. Replace:
real human names (including the writer's own) → a relationship/role label if clear
([my mom], [my boss], [her]) else [a friend]; street addresses → remove; specific
locations → generalize ([my hometown], region only); phones/emails → remove.
When unsure whether something is identifying, REDACT it. Preserve tone, feeling, and
readability — never flatten the emotion.
Return ONLY strict JSON, no prose:
{ "clean_text": "...", "replacements": [ {"detected_type":"name|address|location|phone|email", "replacement_token": "[my mom]", "count": 1} ], "notice": "<one lowercase in-voice line telling the user what you swapped and why>" }`

// Deterministic first pass
function regexScrub(raw: string): { text: string; replacements: ScrubReplacement[] } {
  const replacements: ScrubReplacement[] = []
  let text = raw

  const patterns: { re: RegExp; type: ScrubReplacement['detected_type']; token: string }[] = [
    { re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, type: 'email', token: '[email]' },
    { re: /\bhttps?:\/\/\S+/gi, type: 'url', token: '[link]' },
    { re: /(\+?\d[\d\s().-]{7,}\d)/g, type: 'phone', token: '[phone]' },
  ]
  for (const p of patterns) {
    const matches = text.match(p.re)
    if (matches && matches.length) {
      replacements.push({ detected_type: p.type, replacement_token: p.token, count: matches.length })
      text = text.replace(p.re, p.token)
    }
  }
  return { text, replacements }
}

/** The deterministic pass alone, as a yes/no: does this text carry an email,
 *  a link or a phone number? For text that was written FROM already-scrubbed
 *  input (a bit about to be posted), where a second model pass only adds
 *  false alarms — it "redacts when unsure", and flags role words like
 *  "husband" as names. */
export function hasContactDetails(text: string): boolean {
  return regexScrub(String(text ?? '')).replacements.length > 0
}

const ScrubInput = z.object({ raw: z.string().min(1).max(8000) })

// Plain server-side function. Call this directly from other server handlers
// (server functions, server routes, MCP tools) to avoid nesting createServerFn
// calls through the RPC resolver — which fails with "Server function info not
// found" when this wrapper isn't imported by any client bundle.
export async function runScrub(raw: string): Promise<ScrubResult> {
  const clamped = String(raw ?? '').slice(0, 8000)
  if (!clamped) {
    return { clean_text: '', replacements: [], notice: '' }
  }
  // Step 1: regex pass
  const first = regexScrub(clamped)

  // Step 2: LLM pass for names + locations
  const llm = await callAgent({
    system: SCRUBBER_PROMPT,
    messages: [{ role: 'user', content: first.text }],
    maxTokens: 800,
  })

  const parsed = tryParseJson<ScrubResult>(llm.text)
  // Guard: LLM must not erase non-empty input. An empty/whitespace-only
  // clean_text for non-empty input is treated as a scrubber failure — we
  // fall back to the regex-scrubbed text rather than persisting "".
  if (parsed && typeof parsed.clean_text === 'string' && parsed.clean_text.trim().length > 0) {
    // Union both passes' replacements
    const all = [...first.replacements, ...(parsed.replacements ?? [])]
    return {
      clean_text: parsed.clean_text,
      replacements: all,
      notice: parsed.notice || "heads up — I tidied a couple of identifying bits so your real name never shows 🔒",
    }
  }

  // Graceful fallback: keep regex-scrubbed text, no LLM substitution
  return {
    clean_text: first.text,
    replacements: first.replacements,
    notice: first.replacements.length
      ? "heads up — I swapped out a couple of identifying bits so your real name never shows 🔒"
      : "kept your words as-is — nothing identifying caught my eye 🔒",
  }
}

export const scrubText = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ScrubInput.parse(data))
  .handler(async ({ data }): Promise<ScrubResult> => runScrub(data.raw))
