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
  }
}

// pgvector expects vector literals as the text form '[0.1,0.2,...]'
export function toVectorLiteral(vec: number[]): string {
  return '[' + vec.map((n) => (Number.isFinite(n) ? n : 0)).join(',') + ']'
}
