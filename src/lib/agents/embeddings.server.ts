// Server-only embeddings helper. Calls Lovable AI Gateway's
// /v1/embeddings endpoint with openai/text-embedding-3-small (1536-d) —
// matches the situations.embedding column dimension and fits pgvector's
// HNSW 2000-dim cap. Fail-soft: returns null on any failure so the caller
// can persist the row without blocking the user.
const EMBEDDING_MODEL = 'openai/text-embedding-3-small'

export async function embedText(input: string): Promise<number[] | null> {
  const key = process.env.LOVABLE_API_KEY
  if (!key || !input || !input.trim()) return null
  // A slow gateway must never hold a card flip open: bound every call.
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 8000)
  try {
    const r = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      signal: ctl.signal,
      headers: {
        'content-type': 'application/json',
        'Lovable-API-Key': key,
        'X-Lovable-AIG-SDK': 'vercel-ai-sdk',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: input.slice(0, 8000),
      }),
    })
    if (!r.ok) return null
    const j = (await r.json()) as { data?: { embedding?: number[] }[] }
    const vec = j.data?.[0]?.embedding
    return Array.isArray(vec) && vec.length === 1536 ? vec : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Several texts in one call, in order; a slot is null when the gateway
 *  gave nothing for it. Fail-soft like embedText: no key, no vectors. */
export async function embedTexts(inputs: string[]): Promise<(number[] | null)[]> {
  const key = process.env.LOVABLE_API_KEY
  const clean = inputs.map((s) => String(s ?? '').slice(0, 8000))
  if (!key || clean.length === 0 || clean.every((s) => !s.trim())) return inputs.map(() => null)
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 10000)
  try {
    const r = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      signal: ctl.signal,
      headers: { 'content-type': 'application/json', 'Lovable-API-Key': key, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: clean.map((s) => (s.trim() ? s : ' ')) }),
    })
    if (!r.ok) return inputs.map(() => null)
    const j = (await r.json()) as { data?: { index?: number; embedding?: number[] }[] }
    const out: (number[] | null)[] = inputs.map(() => null)
    ;(j.data ?? []).forEach((d, i) => {
      const at = typeof d.index === 'number' ? d.index : i
      if (Array.isArray(d.embedding) && d.embedding.length === 1536 && at < out.length) out[at] = d.embedding
    })
    return out
  } catch {
    return inputs.map(() => null)
  } finally {
    clearTimeout(timer)
  }
}

/** Cosine similarity of two vectors of equal length. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length && i < b.length; i++) { dot += a[i]! * b[i]!; na += a[i]! * a[i]!; nb += b[i]! * b[i]! }
  return na && nb ? dot / Math.sqrt(na * nb) : 0
}

// pgvector expects vector literals as the text form '[0.1,0.2,...]'
export function toVectorLiteral(vec: number[]): string {
  return '[' + vec.map((n) => (Number.isFinite(n) ? n : 0)).join(',') + ']'
}
