// The serious-fact extractor — one small classifier that runs beside the
// Guard at set creation and names the exact phrase in the spill that is an
// illness, a death, a loss or an accident, or says there is none.
//
// Deliberately NOT the Guard. The Guard is a safety system with its own
// purpose and its own tokens, and the direction-guardrails dispatch says it
// stays unchanged. This runs concurrently with it, so the deal pays no
// extra latency, and it fails soft to null: a card is never refused
// because this call was slow.
import { callAgent, tryParseJson } from './gateway'

const PROMPT = `You read one short text and find whether it contains a SERIOUS FACT: an
illness, a diagnosis, a medical condition, a death, a miscarriage, an accident,
an injury, a job loss, an eviction, a bankruptcy, or a comparable loss.
If it does, return the EXACT phrase from the text that names it — the words as
written, nothing added, the shortest span that names the fact ("autoimmune
disease", "cancer", "laid off", "her miscarriage"). If there are several,
return the most serious one. If there is none, return null.
Return ONLY strict JSON, no prose:
{"serious_fact": "<exact phrase>" | null}`

export async function runExtractSeriousFact(cleanText: string): Promise<string | null> {
  const text = String(cleanText ?? '').slice(0, 4000)
  if (!text.trim()) return null
  const llm = await callAgent({
    system: PROMPT,
    messages: [{ role: 'user', content: text }],
    maxTokens: 60,
    temperature: 0,
    timeoutMs: 8000,
  })
  if (llm.error) {
    console.error('[joke-serious-fact] extractor error', llm.error)
    return null
  }
  const parsed = tryParseJson<{ serious_fact?: unknown }>(llm.text)
  const fact = typeof parsed?.serious_fact === 'string' ? parsed.serious_fact.trim() : ''
  if (!fact) return null
  // The phrase must be the text's own words: a paraphrase is not a fact the
  // spill contains, and the guardrail would block words nobody typed.
  return text.toLowerCase().includes(fact.toLowerCase()) ? fact.slice(0, 120) : null
}
