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
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [opened, setOpened] = useState(false)
  const open = opened || wantsRoom(story)
  useEffect(() => {
    if (open && !opened) {
      setOpened(true)
      track('drive_opened', { chars: story.trim().length })
    }
  }, [open, opened, story, track])
  const focused = useRef(false)

  const words = story.trim() ? story.trim().split(/\s+/).length : 0
  const done = checks.filter((c) => c.ok).length
  const activeIdx = checks.findIndex((c) => !c.ok)
  const ready = words >= 2 && !busy

  function append(add: string, event: string, what: string) {
    const cur = story.replace(/\s+$/, '')
    const next = cur ? `${cur} ${add}` : add
    onStory(next)
    track(event, { what })
    requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      el.focus()
      el.setSelectionRange(next.length, next.length)
    })
  }

  const make = (
    <button type="button" className="bt-btn bt-go dv-make" disabled={!ready} aria-busy={busy} onClick={onMake}>
      {busy ? 'cutting it into a bit…' : open ? 'Make it a bit →' : 'Make my bit →'}
    </button>
  )

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
            placeholder={open ? 'What happened? Who was there, what they said, how it ended…' : 'What happened? One sentence is enough.'}
            value={story}
            maxLength={4000}
            disabled={busy}
            onFocus={() => { if (!focused.current) { focused.current = true; track('box_focus', { open }) } }}
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
      {open && (
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
                      <button type="button" className="dv-add" onClick={() => append(it.add, 'drive_add', c.id)}>+ {it.label}</button>
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
            {make}
            <p>{words < 2 ? 'Type a line or two to start.' : done === 4 ? 'All four are in. Your lines stay word for word.' : 'Ready now. Your lines stay word for word; the AI copilot drafts only what’s missing.'}</p>
          </div>
        </aside>
      )}
    </div>
  )
}
