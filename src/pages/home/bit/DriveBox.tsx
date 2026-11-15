/* The /bits story box that drives the story (Nov 14 2026, Candy approved
 * designs C and A).
 *
 * C: on the first screen it is one line. "What happened? One sentence is
 * enough." with Make my bit, and four starters for anyone with no idea yet.
 * One sentence makes a whole bit: Shutap cuts it, the AI copilot drafts the
 * lines it didn't cover.
 *
 * A: once they write more than a line (a full stop and more, a new line, or
 * 60 characters), the same box opens in place: the story at page size on the
 * left, settings under it, and a rail on the right with the four things that
 * make a bit land. The first one missing is highlighted with a starter that
 * adds to the story. Nothing is required; every line is optional.
 *
 * The textarea stays the same element in both, so focus and caret never
 * jump. Pure UI: the parent owns the story, the settings and the cut. */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { StoryCheck } from '@/lib/bits/split'

type Item = { q: string; hint: string; add: string; label: string }
const RAIL: Record<StoryCheck['id'], Item> = {
  who: { q: 'Who’s in it?', hint: 'By role: my boss, my daughter, the guy at the gate.', add: 'It was me and my ', label: 'start: “It was me and my…”' },
  said: { q: 'What did someone say?', hint: 'The exact words, in quotes. Real dialogue is where the laugh hides.', add: 'They said, “', label: 'add: They said, “…”' },
  after: { q: 'What happened right after?', hint: 'What you did, or what went wrong next.', add: 'Then ', label: 'add: Then…' },
  ending: { q: 'How did it end?', hint: 'The last thing anyone said or did. That’s usually your button.', add: 'In the end, ', label: 'add: In the end…' },
}

const STARTERS = [
  { label: 'My boss said…', text: 'My boss said, “' },
  { label: 'My kid did…', text: 'My kid ' },
  { label: 'On my date…', text: 'On my date, ' },
  { label: 'At the airport…', text: 'At the airport, ' },
] as const

/** Nov 14 2026 (Candy): the empty box types its own prompt, changing, and
 *  says it's free. Stops while the box has focus or text; still for reduced motion. */
const TYPED_TOP = [
  'Make your funny story funnier. Try it free…',
  'My boss replied-all to the whole company…',
  'Turn one line into a stand-up bit. Free…',
  'My kid told the waiter we don’t tip…',
  'Got a joke? Make it funnier, free…',
]
const TYPED_FULL = [
  'Your joke, your story, your stand-up set: make it funnier, free…',
  'At my cousin’s wedding the DJ played my ringtone…',
  'Paste your set. Shutap cuts it into a bit. Try it free…',
  'My landlord texted “quick question” at 2am…',
]
function useTypedPrompt(lines: string[], paused: boolean): string {
  const [text, setText] = useState(lines[0] ?? '')
  useEffect(() => {
    if (paused || typeof window === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setText(lines[0] ?? ''); return }
    let i = 0, n = 0, dir = 1, hold = 0
    const t = window.setInterval(() => {
      const line = lines[i] ?? ''
      if (hold > 0) { hold--; return }
      n += dir * (dir > 0 ? 1 : 3)
      if (n >= line.length) { n = line.length; dir = -1; hold = 38 }
      else if (n <= 0) { n = 0; dir = 1; i = (i + 1) % lines.length; hold = 6 }
      setText(line.slice(0, n))
    }, 45)
    return () => window.clearInterval(t)
  }, [lines, paused])
  return text
}

/** More than one sentence's worth: open the full box. */
export function wantsRoom(story: string): boolean {
  const t = story.trim()
  return t.length >= 60 || /\n/.test(story) || /[.!?]["”’]?\s+\S/.test(t)
}

export function DriveBox({
  story,
  onStory,
  checks,
  busy,
  onMake,
  onRemix,
  settings,
  settingsLine,
  track,
  fullSlot,
}: {
  story: string
  onStory: (s: string) => void
  checks: StoryCheck[]
  busy: boolean
  onMake: () => void
  /** "Stuck? Start from the demo story", when the page has a demo */
  onRemix?: () => void
  /** the four settings (audience, voice, length, wild), already rendered */
  settings: React.ReactNode
  /** social · deadpan · 30s · wild 3 */
  settingsLine: string
  track: (event: string, props?: Record<string, unknown>) => void
  /** Nov 14 2026 (/bits): the id of the place lower on the page where the
   *  full box (A) always stands open. The one line (C) then stays one line on
   *  top, and both type into the same story. */
  fullSlot?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const fullRef = useRef<HTMLTextAreaElement>(null)
  const [opened, setOpened] = useState(false)
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  useEffect(() => { if (fullSlot) setSlot(document.getElementById(fullSlot)) }, [fullSlot])
  const split = !!fullSlot
  const open = !split && (opened || wantsRoom(story))
  useEffect(() => {
    if (!split && open && !opened) {
      setOpened(true)
      track('drive_opened', { chars: story.trim().length })
    }
  }, [split, open, opened, story, track])
  // the one line grows with what's typed, up to three lines
  useEffect(() => {
    const el = ref.current
    if (!split || !el) return
    el.style.height = ''
    if (!story) return
    const base = el.clientHeight
    el.style.height = 'auto'
    el.style.height = `${Math.min(Math.max(el.scrollHeight, base), 132)}px`
  }, [split, story])
  const focused = useRef(false)
  const [focusTop, setFocusTop] = useState(false)
  const [focusFull, setFocusFull] = useState(false)
  const typedTop = useTypedPrompt(TYPED_TOP, focusTop || !!story)
  const typedFull = useTypedPrompt(TYPED_FULL, focusFull || !!story)

  const words = story.trim() ? story.trim().split(/\s+/).length : 0
  const done = checks.filter((c) => c.ok).length
  const activeIdx = checks.findIndex((c) => !c.ok)
  const ready = words >= 2 && !busy

  function append(add: string, event: string, what: string, into: 'top' | 'full' = 'top') {
    const cur = story.replace(/\s+$/, '')
    const next = cur ? `${cur} ${add}` : add
    onStory(next)
    track(event, { what })
    requestAnimationFrame(() => {
      const el = into === 'full' ? fullRef.current : ref.current
      if (!el) return
      el.focus()
      el.setSelectionRange(next.length, next.length)
    })
  }

  const makeBtn = (big: boolean) => (
    <button type="button" className="bt-btn bt-go dv-make" disabled={!ready} aria-busy={busy} onClick={onMake}>
      {busy ? 'cutting it into a bit…' : big ? 'Make it a bit →' : 'Make my bit →'}
    </button>
  )
  const make = makeBtn(open)
  const note = words < 2 ? 'Type a line or two to start.' : checks.every((c) => c.ok) ? 'All four are in. Your lines stay word for word.' : 'Ready now. Your lines stay word for word; the AI copilot drafts only what’s missing.'

  /** the rail: what makes a bit land, the first missing one with a starter */
  const rail = (into: 'top' | 'full') => (
    <aside className="dv-rail" aria-label="What makes a bit land">
      <div className="dv-rail-h">
        <span>What makes it land</span>
        <b>{done} of 4</b>
      </div>
      <div className="dv-bar" aria-hidden="true"><span style={{ width: `${done * 25}%` }} className={done === 4 ? 'full' : undefined} /></div>
      <ol className="dv-items">
        {checks.map((c, i) => {
          const it = RAIL[c.id]
          if (i === activeIdx) {
            return (
              <li key={c.id} className="dv-item on">
                <span className="dv-n">{i + 1}</span>
                <div>
                  <b>{it.q}</b>
                  <p>{it.hint}</p>
                  <button type="button" className="dv-add" onClick={() => append(it.add, 'drive_add', c.id, into)}>+ {it.label}</button>
                </div>
              </li>
            )
          }
          return (
            <li key={c.id} className={`dv-item${c.ok ? ' ok' : ''}`}>
              <span className="dv-n">{c.ok ? '✓' : i + 1}</span>
              <div>
                <b>{it.q}</b>
                <p>{c.ok ? 'in your story' : 'optional · the AI copilot can draft it'}</p>
              </div>
            </li>
          )
        })}
      </ol>
      <div className="dv-go">
        {makeBtn(true)}
        <p>{note}</p>
      </div>
    </aside>
  )

  /** A, always open, in its own place on the page (fullSlot) */
  /** A (approved design): the story with the rail on the right, settings
   *  under it; narrower than the page (980px) and at page type sizes. */
  const full = split && slot ? createPortal(
    <div className="bt dv-host dv-a">
      <div className="dv-turn">
        <h2>Your turn — write yours.</h2>
        <span>free · no sign-in · your lines stay word for word</span>
      </div>
      <div className="bt-box dv open">
        <div className="dv-main">
          <div className="dv-head">
            <label htmlFor="bit-story-full" className="bt-box-title"><span className="bt-rec" aria-hidden="true" />tell it your way</label>
            {onRemix && <button type="button" className="dv-remix" onClick={onRemix}>Stuck? Start from the demo story</button>}
          </div>
          <div className="dv-write">
            <textarea
              suppressHydrationWarning
              id="bit-story-full"
              ref={fullRef}
              className="dv-paper"
              placeholder={focusFull ? 'Your joke, your story, your stand-up set: write it here and make it funnier…' : typedFull}
              value={story}
              maxLength={4000}
              disabled={busy}
              onFocus={() => { setFocusFull(true); track('box_focus', { box: 'full' }) }}
              onBlur={() => setFocusFull(false)}
              onChange={(e) => onStory(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (ready) onMake() } }}
            />
          </div>
          <div className="dv-count">
            <span>{words} {words === 1 ? 'word' : 'words'} · names get removed before anything is saved</span>
            <span>{settingsLine}</span>
          </div>
          <div className="dv-set">{settings}</div>
        </div>
        {rail('full')}
      </div>
    </div>,
    slot,
  ) : null

  return (
    <div className={`bt-box dv${open ? ' open' : ''}`}>
      <div className="dv-main">
        {open ? (
          <div className="dv-head">
            <label htmlFor="bit-story" className="bt-box-title"><span className="bt-rec" aria-hidden="true" />tell it your way</label>
            {onRemix && <button type="button" className="dv-remix" onClick={onRemix}>Stuck? Start from the demo story</button>}
          </div>
        ) : (
          <label htmlFor="bit-story" className="dv-sr">What happened?</label>
        )}
        <div className="dv-write">
          <textarea
            suppressHydrationWarning
            id="bit-story"
            ref={ref}
            className="dv-paper"
            rows={1}
            placeholder={open ? 'Your joke, your story, your stand-up set: write it here and make it funnier…' : focusTop ? 'Make your funny story funnier. One line is enough…' : typedTop}
            value={story}
            maxLength={4000}
            disabled={busy}
            onFocus={() => { setFocusTop(true); if (!focused.current) { focused.current = true; track('box_focus', { open }) } }}
            onBlur={() => setFocusTop(false)}
            onChange={(e) => onStory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              if (e.metaKey || e.ctrlKey || (!open && !e.shiftKey)) {
                e.preventDefault()
                if (ready) onMake()
              }
            }}
          />
          {!open && make}
        </div>
        {!open ? (
          <div className="dv-starts">
            <span className="dv-muted">No idea? Start with:</span>
            {STARTERS.map((s) => (
              <button key={s.label} type="button" className="dv-chip" onClick={() => append(s.text, 'drive_starter', s.label)}>{s.label}</button>
            ))}
            <span className="dv-free">free · no sign-in · one line is enough, the AI copilot drafts the rest</span>
          </div>
        ) : (
          <>
            <div className="dv-count">
              <span>{words} {words === 1 ? 'word' : 'words'} · names get removed before anything is saved</span>
              <span>{settingsLine}</span>
            </div>
            <div className="dv-set">{settings}</div>
          </>
        )}
      </div>
      {open && rail('top')}
      {full}
    </div>
  )
}
