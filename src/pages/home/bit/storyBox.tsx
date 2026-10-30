// The write box's helpers (Oct 29 2026 redesign, "notebook + bit fuel"):
// the placeholder that types itself, and the bit-fuel meter that fills as the
// story gets the details a bit needs. The box itself stays empty: the
// prompts live in the placeholder only, never as prefilled text or chips.
import { useEffect, useState } from 'react'

/** Placeholder prompts. Questions that pull details, never example stories. */
export const STORY_PROMPTS = [
  "what's still bugging you from today?",
  'who said what? word for word is funnier.',
  "the thing you'd only tell your group chat…",
  'what happened right before it went wrong?',
] as const

/** Types the prompts out and back in the placeholder while the box is empty.
 *  Reduced motion, or a box with text: the first prompt, still. */
export function useTypingPrompt(active: boolean): string {
  const [st, setSt] = useState({ pi: 0, pc: STORY_PROMPTS[0].length, mode: 'hold' as 'type' | 'erase' | 'hold', hold: 50 })
  const [still, setStill] = useState(true)

  useEffect(() => {
    let reduce = false
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { /* noop */ }
    setStill(reduce)
  }, [])

  useEffect(() => {
    if (!active || still) return
    const id = window.setInterval(() => {
      setSt((s) => {
        const p = STORY_PROMPTS[s.pi]!
        if (s.hold > 0) return { ...s, hold: s.hold - 1 }
        if (s.mode === 'hold') return { ...s, mode: 'erase' }
        if (s.mode === 'type') return s.pc < p.length ? { ...s, pc: s.pc + 1 } : { ...s, mode: 'hold', hold: 45 }
        return s.pc > 0 ? { ...s, pc: Math.max(0, s.pc - 2) } : { pi: (s.pi + 1) % STORY_PROMPTS.length, pc: 0, mode: 'type', hold: 6 }
      })
    }, 55)
    return () => window.clearInterval(id)
  }, [active, still])

  if (still || !active) return STORY_PROMPTS[0]
  return STORY_PROMPTS[st.pi]!.slice(0, st.pc) + '▍'
}

/** The four details that make a bit land, read from the story as typed. */
export const STORY_DETAILS = [
  { key: 'who', label: 'who was there', re: /\b(my|mom|dad|boss|he|she|they|neighbou?r|roommate|wife|husband|boyfriend|girlfriend|friend|kid|son|daughter|coworker|manager|landlord|guy|lady|waiter|barista|teacher|doctor|uber|driver)\b/i },
  { key: 'said', label: 'what they said', re: /["“”]|\b(said|says|told|asked|texted|yelled|goes|replied|wrote|emailed)\b/i },
  { key: 'did', label: 'what you did', re: /\b(I|i)\s+(just\s+|then\s+|finally\s+)?(said|told|walked|left|replied|stood|looked|smiled|laughed|did|went|grabbed|nodded|ate|asked|texted|pretended|tried|ran|sat)\b/ },
  { key: 'after', label: 'what happened after', re: /\b(then|after|afterwards|later|now|next|ended up|so I|turns out)\b/i },
] as const

const LEVELS: Array<[number, string]> = [
  [0, 'empty plate'],
  [1, 'a crumb'],
  [25, 'a snack'],
  [50, 'a meal'],
  [80, 'comedy gold'],
]

export type StoryFuel = { words: number; have: boolean[]; details: number; pct: number; label: string }

/** How much a bit has to work with: length counts for up to 40, each of the
 *  four details for 15. A nudge, never a gate: the button works from word one. */
export function storyFuel(text: string): StoryFuel {
  const t = text.trim()
  const words = t ? t.split(/\s+/).length : 0
  const have = STORY_DETAILS.map((d) => d.re.test(t))
  const details = have.filter(Boolean).length
  const pct = words ? Math.min(100, Math.round((Math.min(words, 60) / 60) * 40 + details * 15)) : 0
  let label = LEVELS[0]![1]
  for (const [at, l] of LEVELS) if (pct >= at) label = l
  return { words, have, details, pct, label }
}

export function FuelMeter({ fuel }: { fuel: StoryFuel }) {
  return (
    <div className="bt-fuel" aria-live="polite">
      <div className="bt-fuel-top">
        <span className="bt-fuel-name">bit fuel</span>
        <span className={`bt-fuel-label${fuel.pct >= 80 ? ' gold' : ''}`}>
          {fuel.label}
          {fuel.pct ? ` · ${fuel.pct}%` : ''}
        </span>
      </div>
      <div className="bt-fuel-track" aria-hidden="true">
        <span style={{ width: `${fuel.pct}%` }} />
      </div>
      <ul className="bt-fuel-details" aria-label="details that make it funnier">
        {STORY_DETAILS.map((d, i) => (
          <li key={d.key} className={fuel.have[i] ? 'on' : undefined}>
            <span className="bt-fuel-dot" aria-hidden="true">{fuel.have[i] ? '✓' : ''}</span>
            <span>{d.label}</span>
            <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{fuel.have[i] ? ' (in)' : ' (not yet)'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
