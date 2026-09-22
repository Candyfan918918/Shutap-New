// The spill reader — one small classifier that runs beside the Guard at
// set creation and answers two things the guardrails need to know:
//
//   serious_fact   · the exact phrase in the spill that is an illness, a
//                    death, a loss or an accident, or null. Guardrail B
//                    blocks its tokens outside quotes.
//   self_directed  · there is no other adult in the spill and the user is
//                    the actor. Guardrail A narrows to the verdict-noun
//                    list on those spills (spec §8, round U); on every
//                    other spill it stays total.
//
// Deliberately NOT the Guard. The Guard is a safety system with its own
// purpose and its own tokens, and the direction-guardrails dispatch says it
// stays unchanged. This runs concurrently with it, so the deal pays no
// extra latency, and it fails soft: a card is never refused because this
// call was slow, and no answer leaves every guardrail at its strictest.
import { callAgent, tryParseJson } from './gateway'

const PROMPT = `You read one short text someone wrote about something that happened to
them and answer two questions about it. Return ONLY strict JSON, no prose:
{"serious_fact": "<exact phrase>" | null, "self_directed": true | false}

SERIOUS_FACT: does the text contain an illness, a diagnosis, a medical
condition, a death, a miscarriage, an accident, an injury, a job loss, an
eviction, a bankruptcy, or a comparable loss? If it does, return the EXACT
phrase from the text that names it — the words as written, nothing added,
the shortest span that names the fact ("autoimmune disease", "cancer",
"laid off", "her miscarriage"). If there are several, return the most
serious one. If there is none, return null.

SELF_DIRECTED: true only when there is NO other adult in the text and the
writer is the one who acted — their own mistake, their own week, their own
feeling, a baby or a toddler, an object, a question about themselves
("leaving at 8:30 hoping to make it by 8:00", "I accidentally terminated
myself in the system", "why am I sad?", "I get angry with my baby").
false when any other adult did or said something — a partner, a parent,
an in-law, a boss, an ex, a friend, a roommate, a stranger — even when
that adult was kind ("my parents still support me" is false: the parents
are in it).`

export type SpillReading = { seriousFact: string | null; selfDirected: boolean | null }

export async function runReadSpill(cleanText: string): Promise<SpillReading> {
  const text = String(cleanText ?? '').slice(0, 4000)
  const none: SpillReading = { seriousFact: null, selfDirected: null }
  if (!text.trim()) return none
  const llm = await callAgent({
    system: PROMPT,
    messages: [{ role: 'user', content: text }],
    maxTokens: 80,
    temperature: 0,
    timeoutMs: 8000,
  })
  if (llm.error) {
    console.error('[joke-serious-fact] reader error', llm.error)
    return none
  }
  const parsed = tryParseJson<{ serious_fact?: unknown; self_directed?: unknown }>(llm.text)
  const fact = typeof parsed?.serious_fact === 'string' ? parsed.serious_fact.trim() : ''
  // The phrase must be the text's own words: a paraphrase is not a fact the
  // spill contains, and the guardrail would block words nobody typed.
  const seriousFact = fact && text.toLowerCase().includes(fact.toLowerCase()) ? fact.slice(0, 120) : null
  const selfDirected = typeof parsed?.self_directed === 'boolean' ? parsed.self_directed : null
  return { seriousFact, selfDirected }
}

/** The serious fact alone — the older name, kept for the callers that
 *  only want the phrase. */
export async function runExtractSeriousFact(cleanText: string): Promise<string | null> {
  return (await runReadSpill(cleanText)).seriousFact
}
