/* The lined box (Nov 8 2026 redesign, approved by Candy). Since Nov 12 2026
 * it opens with the lines cut from the story they typed (BitSurface's story
 * step, their words only); a line the story didn't cover is theirs to write.
 * Five lines (hook, setup, two tags, button), all required, all in
 * their own words. Empty lines are drafted by the AI copilot at Make (Nov 13); AI also runs when "funnier" is
 * tapped on one line, and offers three other ways to say it with theirs
 * first; nothing changes until they pick. "lock" keeps a line from being
 * changed (and from funnier) until it's unlocked. Both stay gray until the
 * line has text. "Make my bit →" is never disabled: with lines missing it
 * says which; with all five it hands them over word for word, and the
 * result lays them out as the video, stand-up, sketch and skit.
 * (Supersedes Nov 5's "finish the bit", which wrote the empty lines.)
 * Nothing is stored until "Make my bit" is pressed. */
import { useRef, useState, type KeyboardEvent } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { touchLine } from '@/lib/bits.functions'
import type { TouchOption } from '@/lib/bits/pipeline.server'
import { readSlot, slotLabel, writeSlot, type BitControls, type BitTier, type Slot } from '@/lib/bits/shared'
import { anonSessionId, jokeTap, jokeTrack } from '../joke/jokeClient'
import type { Draft } from './EditableBit'

export const EMPTY_LINES: Draft = { hook: '', setup: '', tags: ['', ''], button: '' }
export const LINE_SLOTS: Slot[] = ['hook', 'setup', 'tag0', 'tag1', 'button']

const LINE: Record<string, { title: string; sub: string; help: string }> = {
  hook: { title: 'Hook', sub: 'the first 2 seconds', help: 'What happened, the way you’d say it first. A reason to listen.' },
  setup: { title: 'Setup', sub: 'the one fact the hook left out', help: 'Just enough of the story to follow the turn.' },
  tag0: { title: 'Tag 1', sub: 'a laugh after the turn', help: 'A picture that lands on a thing you can point at.' },
  tag1: { title: 'Tag 2', sub: 'another laugh, same idea', help: 'Don’t restart the story; push the same idea further.' },
  button: { title: 'Button', sub: 'the last line', help: 'A verdict or a reversal, never a moral. The line you stop on.' },
}
const EMPTY_TAP = 'Type something first to make it funnier or lock it.'

const LockIcon = ({ open, color }: { open?: boolean; color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d={open ? 'M8 11V7a4 4 0 0 1 7.5-2' : 'M8 11V7a4 4 0 0 1 8 0v4'} /></svg>
)

/** The lines as one story (what the writing card shows, what the key is). */
export function linesText(d: Draft): string {
  return [d.hook, d.setup, ...d.tags, d.button].map((s) => s.trim()).filter(Boolean).join(' ')
}
export function writtenSlots(d: Draft): Slot[] {
  return LINE_SLOTS.filter((s) => readSlot(d, s).trim())
}
/** Nov 13 2026 (Candy): every line is optional. An incomplete bit still makes
 *  the video, stand-up, sketch and skit; one written line is enough, and
 *  the AI copilot drafts the empty lines around the written ones. */
export const OPTIONAL_SLOTS: Slot[] = LINE_SLOTS
/** what has to be written before Make: one line, any line */
export function missingSlots(d: Draft): Slot[] {
  return writtenSlots(d).length ? [] : ['hook']
}
/** "the tag 1, tag 2 and button" */
export function listLines(slots: Slot[]): string {
  const n = slots.map((s) => LINE[s]!.title.toLowerCase())
  return n.length < 2 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`
}

/** What the box asks for next, from its state alone. */
export function guideLine(d: Draft, locked: Slot[]): { text: string; ready: boolean } {
  const missing = missingSlots(d)
  if (!writtenSlots(d).length) return { text: 'Go back to your story, or type a line here. Stuck? Write a rough version and tap funnier.', ready: false }
  const empty = LINE_SLOTS.filter((s) => !readSlot(d, s).trim())
  if (empty.length) return { text: `Your lines stay word for word. Leave the ${listLines(empty)} empty and the AI copilot drafts ${empty.length > 1 ? 'them' : 'it'}; you can change any line after.`, ready: true }
  const open = LINE_SLOTS.filter((s) => !locked.includes(s))
  return { text: `Every word is yours${open.length ? '' : ', all locked'}. Next: the 5-second video, stand-up, sketch and skit.`, ready: true }
}

type Props = {
  tier: BitTier
  controls: BitControls
  lines: Draft
  onLines: (d: Draft) => void
  locked: Slot[]
  onLocked: (l: Slot[]) => void
  busy: boolean
  /** all five lines written: make the bit from them, word for word */
  /** the five lines as typed this instant */
  onMake: (lines: Draft) => void
  /** which box this is, for events: 'top' or 'mid' */
  box?: string
  onSignIn?: () => void
  /** a signed-out visitor tapped lock (a line) or lock all: sign in first, then it locks */
  onGuestLock?: (what: Slot | 'all') => void
  onLimit: () => void
  onCrisis: () => void
  say: (m: string) => void
  /** /bit-lab demo maker: a funnier option was used on a line */
  onPicked?: (slot: Slot, typed: string, picked: string, move: string) => void
}

export function LinedBox({ tier, controls, lines, onLines, locked, onLocked, busy, onMake, box = 'top', onSignIn, onGuestLock, onLimit, onCrisis, say, onPicked }: Props) {
  const touch = useServerFn(touchLine)
  const [open, setOpen] = useState<Slot | null>(null)
  const [options, setOptions] = useState<TouchOption[] | null>(null)
  const [picked, setPicked] = useState(-1)
  const [touching, setTouching] = useState(false)
  const [touches, setTouches] = useState<{ used: number; cap: number | null } | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const noteTimer = useRef<number | undefined>(undefined)
  const offered = useRef<Record<string, string[]>>({})
  const typedOnce = useRef<Record<string, boolean>>({})
  const [focusSlot, setFocusSlot] = useState<Slot | null>(null)
  /** each line's editable paragraph: a tap on funnier reads what is typed
   *  right now, even if the line has not blurred into state yet */
  const els = useRef<Partial<Record<Slot, HTMLElement | null>>>({})
  const guide = guideLine(lines, locked)
  const written = writtenSlots(lines)

  function flash(m: string) {
    setNote(m)
    window.clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => setNote(null), 4200)
  }
  function setLine(s: Slot, line: string) {
    onLines(writeSlot(lines, s, line))
    // an emptied line can't stay locked
    if (!line.trim() && locked.includes(s)) onLocked(locked.filter((x) => x !== s))
  }
  function onType(s: Slot, el: HTMLElement) {
    const line = (el.innerText ?? '').replace(/\n+/g, ' ').trim()
    if (line === readSlot(lines, s)) return
    setLine(s, line)
    // which line got text, never the words
    if (line && !typedOnce.current[s]) { typedOnce.current[s] = true; jokeTap('line_typed', tier, { slot: s, box }) }
  }
  function keyDown(e: KeyboardEvent<HTMLParagraphElement>) {
    if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur() }
  }

  /** the lines as typed on the page this instant (state can lag a blur) */
  function live(): typeof lines {
    let next = lines
    for (const sl of LINE_SLOTS) {
      const el = els.current[sl]
      if (!el) continue
      const t = (el.innerText ?? '').replace(/\n+/g, ' ').trim()
      if (t !== readSlot(next, sl)) next = writeSlot(next, sl, t)
    }
    if (next !== lines) onLines(next)
    return next
  }

  async function funnier(s: Slot) {
    const lines = live()
    if (!readSlot(lines, s).trim()) { jokeTap('line_tap_empty', tier, { slot: s, what: 'funnier', box }); return flash(EMPTY_TAP) }
    if (locked.includes(s)) return flash('That line is locked. Unlock it to try funnier.')
    // Nov 12 2026: a guest's first tap is free (the server allows one); the next asks for sign-in
    jokeTap('line_touched', tier, { slot: s, where: 'box', box, written: written.length, guest: tier === 'guest' })
    setOpen(s); setOptions(null); setPicked(-1); setTouching(true)
    try {
      const r = await touch({ data: { draft: lines, slot: s, avoid: offered.current[s] ?? [], controls, anon_session_id: anonSessionId() } })
      if (!r.ok) {
        setOpen(null)
        if (r.reason === 'limited') { jokeTrack('touch_blocked', tier, { slot: s, where: 'box' }); return onLimit() }
        if (r.reason === 'sign_in') { jokeTap('funnier_needs_signin', tier, { slot: s, box }); return onSignIn?.() }
        if (r.reason === 'crisis') return onCrisis()
        jokeTrack('touch_failed', tier, { slot: s, where: 'box', box, reason: r.reason })
        return say(r.reason === 'rate_limited' ? 'one at a time · try again in a moment' : 'that one did not come back · try again')
      }
      setOptions(r.options)
      setTouches({ used: r.used, cap: r.cap })
      offered.current[s] = [...(offered.current[s] ?? []), ...r.options.map((o) => o.line)].slice(-12)
    } catch (e) {
      setOpen(null)
      // what threw, so a refused request is not logged as a dropped one (Nov 10)
      const msg = e instanceof Error ? e.message : String(e)
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false
      jokeTrack('touch_failed', tier, { slot: s, where: 'box', box, reason: offline ? 'network' : 'threw', detail: msg.replace(/\s+/g, ' ').slice(0, 120), chars: readSlot(lines, s).length })
      say(offline ? 'could not reach Shutap · try again' : 'that one did not come back · try again')
    } finally {
      setTouching(false)
    }
  }
  function useOption() {
    if (!open) return
    if (picked >= 0 && options) {
      onPicked?.(open, readSlot(lines, open), options[picked]!.line, options[picked]!.move)
      setLine(open, options[picked]!.line)
      jokeTap('touch_picked', tier, { slot: open, pick: picked + 1, move: options[picked]!.move, where: 'box', box })
    } else jokeTap('touch_picked', tier, { slot: open, pick: 'mine', where: 'box', box })
    setOpen(null)
  }
  function toggleLock(s: Slot) {
    const lines = live()
    if (!readSlot(lines, s).trim()) { jokeTap('line_tap_empty', tier, { slot: s, what: 'lock', box }); return flash(EMPTY_TAP) }
    if (tier === 'guest' && onGuestLock && !locked.includes(s)) return onGuestLock(s)
    const on = !locked.includes(s)
    onLocked(on ? [...locked, s] : locked.filter((x) => x !== s))
    jokeTap('line_locked', tier, { slot: s, on, where: 'box', box })
  }
  function make() {
    const now = live()
    const missing = missingSlots(now)
    jokeTap('box_submit', tier, { box, written: writtenSlots(now).length, missing: missing.length, locked: locked.length, ready: !missing.length })
    if (missing.length) return flash('Type a line first, or go back to your story. Stuck? Write a rough version and tap funnier.')
    setNote(null)
    onMake(now)
  }

  return (
    <div className="bt-lined" data-ph-private>
      {LINE_SLOTS.map((s) => {
        const value = readSlot(lines, s)
        const isLocked = locked.includes(s)
        const has = !!value.trim()
        const meta = LINE[s]!
        const label = slotLabel(s)
        const state = isLocked ? 'locked' : has || focusSlot === s ? 'typing' : 'empty'
        const optional = OPTIONAL_SLOTS.includes(s)
        const status = isLocked ? 'locked · word for word' : has ? 'written · not locked' : 'empty · AI drafts it'
        return (
          <div key={s} className={`bt-tline${open === s ? ' open' : ''}`}>
            <div className="bt-tline-head">
              <b>{meta.title}<span> · {meta.sub}</span></b>
              <i className={isLocked ? 'ok' : has || optional ? undefined : 'req'}>{status}</i>
            </div>
            <div className={`bt-tbox ${state}`}>
              <p
                ref={(el) => { els.current[s] = el }}
                className={`bt-v bt-etext${has ? '' : ' empty'}`}
                contentEditable={!isLocked && !busy}
                suppressContentEditableWarning
                spellCheck={false}
                data-placeholder={`type the ${label} here…`}
                onFocus={() => setFocusSlot(s)}
                onBlur={(e) => { setFocusSlot((f) => (f === s ? null : f)); onType(s, e.currentTarget) }}
                onKeyDown={keyDown}
                aria-label={`${meta.title}, optional, type it or leave it for AI`}
                style={s === 'button' ? { fontWeight: 400 } : undefined}
              >
                {value}
              </p>
              <span className="bt-tpills">
                <button type="button" className={`bt-tpill funnier${open === s ? ' on' : ''}${has && !isLocked ? '' : ' off'}`} aria-disabled={!has || isLocked} disabled={busy || (touching && open === s)} onClick={() => void funnier(s)}>
                  {touching && open === s ? 'three ways…' : 'funnier'}
                </button>
                {isLocked ? (
                  <button type="button" className="bt-tpill locked" aria-pressed="true" disabled={busy} onClick={() => toggleLock(s)}><LockIcon color="#fff" />locked</button>
                ) : (
                  <button type="button" className={`bt-tpill lock${has ? '' : ' off'}`} aria-pressed="false" aria-disabled={!has} disabled={busy} onClick={() => toggleLock(s)}><LockIcon open color={has ? '#2f6a45' : '#8f878b'} />lock</button>
                )}
              </span>
            </div>
            {open === s && options && (
              <div className="bt-pop" role="dialog" aria-label={`${label}, three ways`}>
                <span className="bt-lbl r">funnier · {label} · nothing changes until you pick</span>
                <button type="button" className={`bt-opt keep${picked === -1 ? ' on' : ''}`} onClick={() => setPicked(-1)}>
                  <b>✓</b>
                  <span>{value}<small>keep yours</small></span>
                </button>
                {options.map((o, i) => (
                  <button type="button" key={i} className={`bt-opt${picked === i ? ' on' : ''}`} onClick={() => setPicked(i)}>
                    <b>{i + 1}</b>
                    <span>{o.line}<small>{o.move}</small></span>
                  </button>
                ))}
                <div className="bt-pop-row">
                  <button type="button" className="bt-btn sm" onClick={useOption}>{picked < 0 ? 'keep mine' : 'use this one'}</button>
                  <button type="button" className="bt-mini" disabled={touching} onClick={() => void funnier(s)}>three more</button>
                  <button type="button" className="bt-mini" onClick={() => setOpen(null)}>close</button>
                  {tier === 'guest' ? <span className="bt-note" style={{ marginLeft: 'auto' }}>your free try · sign in for unlimited</span> : touches && touches.cap !== null && <span className="bt-note" style={{ marginLeft: 'auto' }}>touch {touches.used} of {touches.cap} today</span>}
                </div>
              </div>
            )}
            <span className="bt-thelp">{meta.help}</span>
          </div>
        )
      })}
      {note && <p className="bt-lined-note" role="alert">{note}</p>}
      <div className="bt-lined-foot">
        <p className={`bt-guide${guide.ready ? ' ready' : ''}`} role="status">{guide.text}</p>
        <div className="bt-lined-cta">
          <button type="button" className="bt-btn bt-go" disabled={busy} aria-busy={busy} onClick={make}>
            {busy ? 'Making it…' : 'Make my video, stand-up, sketch & skit →'}
          </button>
        </div>
      </div>
    </div>
  )
}
