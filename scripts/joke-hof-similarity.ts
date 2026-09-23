// Tunes Guardrail D's embedding threshold on the seeded hall of fame:
// every seeded line against every other, so the threshold sits above the
// highest similarity between two lines from DIFFERENT situations (those
// are not copies of each other) and below the dispatch's must-reject pair.
//
//   LOVABLE_API_KEY=… bun run scripts/joke-hof-similarity.ts
//
// Needs the key: the vectors come from the gateway. Prints the ten closest
// cross-situation pairs, the two dispatch pairs, and the threshold to land
// on. Nothing is written anywhere.
import { SEED_HALL_OF_FAME } from '@/lib/jokes/voices.server'
import { EXEMPLAR_EMBED_THRESHOLD } from '@/lib/jokes/pipeline.server'
import { embedTexts, cosineSimilarity } from '@/lib/agents/embeddings.server'

if (!process.env['LOVABLE_API_KEY']) { console.error('LOVABLE_API_KEY is not set; nothing can be embedded.'); process.exit(1) }
const rows = SEED_HALL_OF_FAME
const vecs = await embedTexts(rows.map((r) => r.joke_text))
if (vecs.some((v) => !v)) { console.error(`${vecs.filter((v) => !v).length} rows came back without a vector`); }
type Pair = { a: number; b: number; s: number; same: boolean }
const pairs: Pair[] = []
for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
  const va = vecs[i], vb = vecs[j]; if (!va || !vb) continue
  pairs.push({ a: i, b: j, s: cosineSimilarity(va, vb), same: rows[i]!.situation_clean === rows[j]!.situation_clean })
}
const cross = pairs.filter((p) => !p.same).sort((x, y) => y.s - x.s)
console.log('closest cross-situation pairs (must NOT match):')
for (const p of cross.slice(0, 10)) console.log(`  ${p.s.toFixed(3)}  ${rows[p.a]!.joke_text}  ⇄  ${rows[p.b]!.joke_text}`)
const must = [
  ['the hamster has the mortgage. not the feed, not the bedding. the mortgage.', "You're a hamster with a mortgage.", true],
  ['God closed the oven door, and opened the washer door.', "You're a hamster with a mortgage.", false],
] as const
const mv = await embedTexts(must.flatMap((m) => [m[0], m[1]]))
console.log('\ndispatch pairs:')
const musts: number[] = []
must.forEach((m, i) => {
  const a = mv[2 * i], b = mv[2 * i + 1]
  const s = a && b ? cosineSimilarity(a, b) : NaN
  if (m[2]) musts.push(s)
  console.log(`  ${s.toFixed(3)}  ${m[2] ? 'must reject' : 'must pass  '}  ${m[0]}  ⇄  ${m[1]}`)
})
const ceiling = cross[0]?.s ?? 0
const floor = Math.min(...musts)
const landed = Math.min(floor - 0.005, Math.max(ceiling + 0.02, 0.8))
console.log(`\nhighest cross-situation similarity ${ceiling.toFixed(3)} · lowest must-reject ${floor.toFixed(3)} · current EXEMPLAR_EMBED_THRESHOLD ${EXEMPLAR_EMBED_THRESHOLD}`)
console.log(ceiling + 0.02 < floor ? `threshold to land on: ${landed.toFixed(2)}` : 'no threshold separates the must-reject pair from the closest cross-situation pair; report both numbers')
