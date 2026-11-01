// THIS PERSON: what someone's own past bits say about their taste, shown to
// the writer so a returning user gets a bit closer to the one they'd keep.
// A chatbot starts from zero every time; this is the part that doesn't.
//
// Three signals, all from their own account, never from anyone else's:
//   kept     — the hook and button of versions they downloaded or posted
//              (the strongest signal: they took it somewhere)
//   steering — which rewrites they reach for: hotter, tighter, storytelling
//   settings — the wild level, voice and length they usually write at
// Fail-soft: no rows, a guest, a missing table → '' and the writer runs
// exactly as before. Cached per user for five minutes.
import type { BitDraft } from './shared'

const TTL_MS = 5 * 60_000
const MAX_KEPT = 3
const cache = new Map<string, { at: number; value: string }>()

type VersionRow = { id: string; bit_id: string; kind: string; hook: string; button: string; heat: number }
type BitRow = { id: string; controls: { voice?: string; length?: string; heat?: number } | null }

export function personBlockFrom(opts: {
  bits: BitRow[]
  versions: VersionRow[]
  keptVersionIds: Set<string>
}): string {
  const { bits, versions, keptVersionIds } = opts
  if (bits.length < 2) return ''
  const lines: string[] = []

  const kept = versions.filter((v) => keptVersionIds.has(v.id)).slice(0, MAX_KEPT)
  if (kept.length) {
    lines.push('  Lines they kept (downloaded or posted), on OTHER stories:')
    for (const v of kept) lines.push(`    hook: ${v.hook}\n    button: ${v.button}`)
  }

  const n = (k: string) => versions.filter((v) => v.kind === k).length
  const hotter = n('hotter')
  const tighter = n('tighter')
  const story = n('storytelling') + n('escalate')
  if (hotter >= 2 && hotter >= tighter * 2) lines.push(`  They rewrote hotter ${hotter} times and tighter ${tighter}: start one notch wilder than asked.`)
  else if (tighter >= 2 && tighter >= hotter * 2) lines.push(`  They rewrote tighter ${tighter} times and hotter ${hotter}: cut harder, shorter lines, no tag three.`)
  if (story >= 2) lines.push(`  They asked for the storytelling version ${story} times: they like beats that build.`)

  const heats = bits.map((b) => b.controls?.heat).filter((h): h is number => typeof h === 'number')
  const voices = bits.map((b) => b.controls?.voice).filter((v): v is string => !!v)
  const mode = (xs: string[]) => {
    const t = new Map<string, number>()
    for (const x of xs) t.set(x, (t.get(x) ?? 0) + 1)
    return [...t.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  }
  if (heats.length >= 3) {
    const avg = heats.reduce((s, h) => s + h, 0) / heats.length
    const v = mode(voices)
    lines.push(`  They usually write at wild ${avg.toFixed(1)}${v ? `, ${v}` : ''}.`)
  }

  if (!lines.length) return ''
  return `
THIS PERSON — from their own past bits. Write toward the one they'd keep.
  Never reuse the kept lines' words, nouns or premise; match their register.
${lines.join('\n')}
`
}

export async function personSignal(admin: any, userId: string | null): Promise<string> {
  if (!userId) return ''
  const hit = cache.get(userId)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value
  let value = ''
  try {
    const { data: bits } = await admin
      .from('bits')
      .select('id, controls')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40)
    const bitRows: BitRow[] = Array.isArray(bits) ? bits : []
    if (bitRows.length >= 2) {
      const ids = bitRows.map((b) => b.id)
      const [{ data: versions }, { data: downloads }, { data: posts }] = await Promise.all([
        admin.from('bit_versions').select('id, bit_id, kind, hook, button, heat').in('bit_id', ids).order('created_at', { ascending: false }).limit(200),
        admin.from('bit_downloads').select('version_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(60),
        admin.from('rooms').select('bit_version_id').eq('author_id', userId).not('bit_version_id', 'is', null).limit(60),
      ])
      const kept = new Set<string>()
      for (const d of Array.isArray(downloads) ? downloads : []) if (d?.version_id) kept.add(d.version_id)
      for (const p of Array.isArray(posts) ? posts : []) if (p?.bit_version_id) kept.add(p.bit_version_id)
      value = personBlockFrom({ bits: bitRows, versions: Array.isArray(versions) ? versions : [], keptVersionIds: kept })
    }
  } catch {
    value = ''
  }
  cache.set(userId, { at: Date.now(), value })
  return value
}

/** After a download, post or rewrite, the next bit should see it. */
export function forgetPerson(userId: string | null): void {
  if (userId) cache.delete(userId)
}

export const _test = { personBlockFrom }
export type { BitDraft }
