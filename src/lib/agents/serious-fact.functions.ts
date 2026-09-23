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
//   metaphor_span  · the phrase where the user describes themselves as
//                    something they are not ("a hamster in a non-stop
//                    spinning wheel"), or null. Guardrail G then requires
//                    a noun from their literal day on every card.
//   emotional      · the user reports a feeling about themselves. With
//                    self_directed, Guardrail H rejects blame.
//
// Deliberately NOT the Guard. The Guard is a safety system with its own
// purpose and its own tokens, and the direction-guardrails dispatch says it
// stays unchanged. This runs concurrently with it, so the deal pays no
// extra latency, and it fails soft: a card is never refused because this
// call was slow, and no answer leaves every guardrail at its strictest.
import { callAgent, tryParseJson } from './gateway'

const PROMPT = `You read one short text someone wrote about something that happened to
them and answer four questions about it. Return ONLY strict JSON, no prose:
{"serious_fact": "<exact phrase>" | null, "self_directed": true | false,
 "metaphor_span": "<exact phrase>" | null, "emotional": true | false}

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
are in it).

METAPHOR_SPAN: does the writer describe THEMSELVES as something they are
not — an animal, an object, a machine, a role they do not hold ("I feel
like a hamster in a non-stop spinning wheel", "I'm a walking ATM", "I'm
the family's unpaid intern")? If so return the EXACT phrase from the text
that is the image, the words as written ("a hamster in a non-stop spinning
wheel"). A comparison of someone else, or no image, is null.

EMOTIONAL: true when the writer reports a feeling about themselves —
overstimulated, sad, useless, angry at everyone, exhausted, guilty, lost.
false when the text reports an event, a mistake, a fact or a question
without a feeling about the self ("I sent a screenshot of my boss to my
boss", "why am I lactose intolerant?").`

export type SpillReading = {
  seriousFact: string | null
  selfDirected: boolean | null
  metaphorSpan: string | null
  emotional: boolean | null
}

export async function runReadSpill(cleanText: string): Promise<SpillReading> {
  const text = String(cleanText ?? '').slice(0, 4000)
  const none: SpillReading = { seriousFact: null, selfDirected: null, metaphorSpan: null, emotional: null }
  if (!text.trim()) return none
  const llm = await callAgent({
    system: PROMPT,
    messages: [{ role: 'user', content: text }],
    maxTokens: 140,
    temperature: 0,
    timeoutMs: 8000,
  })
  if (llm.error) {
    console.error('[joke-serious-fact] reader error', llm.error)
    return none
  }
  const parsed = tryParseJson<{ serious_fact?: unknown; self_directed?: unknown; metaphor_span?: unknown; emotional?: unknown }>(llm.text)
  if (!parsed) console.warn('[joke-serious-fact] reader returned no JSON', { text: String(llm.text ?? '').slice(0, 200) })
  const fact = typeof parsed?.serious_fact === 'string' ? parsed.serious_fact.trim() : ''
  // The phrase must be the text's own words: a paraphrase is not a fact the
  // spill contains, and the guardrail would block words nobody typed.
  const seriousFact = fact && text.toLowerCase().includes(fact.toLowerCase()) ? fact.slice(0, 120) : null
  const selfDirected = typeof parsed?.self_directed === 'boolean' ? parsed.self_directed : null
  const span = typeof parsed?.metaphor_span === 'string' ? parsed.metaphor_span.trim() : ''
  // Like the serious fact: the span must be the text's own words.
  const metaphorSpan = span && text.toLowerCase().includes(span.toLowerCase()) ? span.slice(0, 160) : null
  const emotional = typeof parsed?.emotional === 'boolean' ? parsed.emotional : null
  return { seriousFact, selfDirected, metaphorSpan, emotional }
}

/** The serious fact alone — the older name, kept for the callers that
 *  only want the phrase. */
export async function runExtractSeriousFact(cleanText: string): Promise<string | null> {
  return (await runReadSpill(cleanText)).seriousFact
}
