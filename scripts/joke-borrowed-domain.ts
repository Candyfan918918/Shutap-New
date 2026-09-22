// Guardrail E against everything on file: every ledger row (approved and
// rejected), the seed hall of fame, the brief's own exemplars, and the
// production candidates the offline verification stored. Prints what E
// rejects, so a false positive on an approved line is visible before it
// costs a card.
//
//   bun run scripts/joke-borrowed-domain.ts [stored.json]
import rows from '@/lib/jokes/jokenet.json'
import { classifyArchetype } from '@/lib/jokes/deck.server'
import type { SlotKey } from '@/lib/jokes/deck'
import { borrowedDomain, spillDomains, normalizeForCopy } from '@/lib/jokes/pipeline.server'
import { SEED_HALL_OF_FAME } from '@/lib/jokes/voices.server'
import { promptExemplars } from '@/lib/jokes/prompts.server'

type Row = { id: string; situation: string; joke: string; rating: string; slot: string; notes: string }
const SLOT: Record<string, SlotKey> = { take: 'the_take', clapback: 'the_clapback', roast: 'the_roast', line: 'the_roast' }
const flagsFor = (situation: string) => ({ domains: spillDomains(situation, classifyArchetype(situation)), spill_norm: normalizeForCopy(situation) })

let hits = 0
console.log('── ledger rows ──')
for (const r of rows as Row[]) {
  const b = borrowedDomain(r.joke, SLOT[r.slot] ?? 'the_roast', flagsFor(r.situation))
  if (b) { hits++; console.log(`  #${r.id} [${(r.notes ?? '').split('|')[0]}] ${b.domain}/${b.token} :: ${r.joke.trim()}\n      spill: ${r.situation.slice(0, 90)} · open: ${spillDomains(r.situation).join(',') || '—'}`) }
}
console.log('── seed hall of fame ──')
for (const h of SEED_HALL_OF_FAME) {
  const b = borrowedDomain(h.joke_text, h.slot, flagsFor(h.situation_clean))
  if (b) { hits++; console.log(`  ${b.domain}/${b.token} :: ${h.joke_text}`) }
}
console.log('── the brief\'s exemplars (no spill: every domain closed) ──')
for (const e of promptExemplars()) {
  const b = borrowedDomain(e.text, 'the_roast', { domains: [], spill_norm: '' })
  if (b) console.log(`  ${b.domain}/${b.token} :: ${e.text}`)
}
const file = process.argv[2]
if (file) {
  console.log(`── stored production candidates (${file}) ──`)
  const stored = JSON.parse(await Bun.file(file).text()) as { id: string; spill: string; cards: { slot: SlotKey; text: string; cands: { text: string }[] | null }[] }[]
  for (const s of stored) {
    const f = flagsFor(s.spill)
    console.log(`  ${s.id} · open: ${f.domains.join(',') || '—'}`)
    for (const c of s.cards) {
      const lines = c.cands?.length ? c.cands.map((x) => x.text) : [c.text]
      for (const l of lines) {
        const b = borrowedDomain(l, c.slot, f)
        if (b) console.log(`    E ${c.slot} ${b.domain}/${b.token} :: ${l}`)
      }
    }
  }
}
console.log(`${hits} ledger/seed lines caught by E`)
