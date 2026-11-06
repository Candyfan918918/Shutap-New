/* The lined box (slice 4b, Nov 5 2026): the write box is already a bit.
 * Five lines (hook, setup, two tags, button), each typed in the person's
 * own words or left empty. "funnier" on a line offers three versions built
 * from the lines they wrote (a touch, not a bit); "lock" keeps a line word
 * for word through the write. Two ways out:
 *   finish the bit — Shutap writes only the empty lines, around theirs
 *   keep it →      — every written line locked: the bit is theirs as typed
 * Nothing is stored until one of those is pressed. Behind the ondemand flag;
 * the plain textarea renders otherwise. */
import { useRef, useState, type KeyboardEvent } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { touchLine } from '@/lib/bits.functions'
import type { TouchOption } from '@/lib/bits/pipeline.server'
import { readSlot, slotLabel, writeSlot, type BitControls, type BitTier, type Slot } from '@/lib/bits/shared'
import { anonSessionId, jokeTap, jokeTrack } from '../joke/jokeClient'
import type { Draft } from './EditableBit'

export const EMPTY_LINES: Draft = { hook: '', setup: '', tags: ['', ''], button: '' }
export const LINE_SLOTS: Slot[] = ['hook', 'setup', 'tag0', 'tag1', 'button']

const PLACEHOLDER: Record<string, string> = {
  hook: "what happened, in one line — the thing you'd say first",
  setup: 'the one fact the hook left out',
  tag0: 'a picture that lands on a thing you can point at… or leave it empty',
  tag1: 'another tag, or skip it',
  button: 'a verdict or a reversal, never a moral',
}
const SUB: Record<string, string> = { hook: 'first 2 seconds', tag1: 'optional', button: 'the last line' }

/** The lines as one story (what the writing card shows, what the key is). */
export function linesText(d: Draft): string {
  return [d.hook, d.setup, ...d.tags, d.button].map((s) => s.trim()).filter(Boolean).join(' ')
}
export function writtenSlots(d: Draft): Slot[] {
  return LINE_SLOTS.filter((s) => readSlot(d, s).trim())
}

/** What the box asks for next, from its state alone. */
export function guideLine(d: Draft, locked: Slot[]): { text: string; ready: boolean } {
  const written = writtenSlots(d)
  if (!written.length) return { text: 'type what happened in any line, in your words · "finish the bit" writes the lines you leave empty', ready: false }
  const unlocked = written.filter((s) => !locked.includes(s))
  if (unlocked.length) return { text: `lock the lines you want kept word for word (${unlocked.map(slotLabel).join(', ')} not locked yet) · "funnier" offers three ways for any line`, ready: false }
  if (!d.hook.trim() || !d.button.trim()) return { text: 'a bit needs a hook and a button · write them, tap funnier, or "finish the bit" and Shutap fills them', ready: false }
  return { text: 'every line locked · keep it as written, or "finish the bit" fills the empty lines', ready: true }
}

type Props = {
  tier: BitTier
  controls: BitControls
  lines: Draft
  onLines: (d: Draft) => void
  locked: Slot[]
  onLocked: (l: Slot[]) => void
  busy: boolean
  /** Shutap fills the empty lines (a bit) */
  onFinish: () => void
  /** the bit as typed, every written line locked (a bit) */
  onKeep: () => void
  onSignIn?: () => void
  /** a signed-out visitor tapped lock (a line) or lock all: sign in first, then it locks */
  onGuestLock?: (what: Slot | 'all') => void
  onLimit: () => void
  onCrisis: () => void
  say: (m: string) => void
}

export function LinedBox({ tier, controls, lines, onLines, locked, onLocked, busy, onFinish, onKeep, onSignIn, onGuestLock, onLimit, onCrisis, say }: Props) {
  const touch = useServerFn(touchLine)
  const [open, setOpen] = useState<Slot | null>(null)
  const [options, setOptions] = useState<TouchOption[] | null>(null)
  const [picked, setPicked] = useState(-1)
  const [touching, setTouching] = useState(false)
  const [touches, setTouches] = useState<{ used: number; cap: number | null } | null>(null)
  const offered = useRef<Record<string, string[]>>({})
  const guide = guideLine(lines, locked)
  const written = writtenSlots(lines)

  function setLine(s: Slot, line: string) {
    onLines(writeSlot(lines, s, line))
    // an emptied line can't stay locked
    if (!line.trim() && locked.includes(s)) onLocked(locked.filter((x) => x !== s))
  }
  function onType(s: Slot, el: HTMLElement) {
    const line = (el.innerText ?? '').replace(/\n+/g, ' ').trim()
    if (line !== readSlot(lines, s)) setLine(s, line)
  }
  function keyDown(e: KeyboardEvent<HTMLParagraphElement>) {
    if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur() }
  }

  async function funnier(s: Slot) {
    if (tier === 'guest') return onSignIn?.()
    if (locked.includes(s)) return say('that line is locked · unlock it first')
    if (!written.length) return say('write one line first · funnier builds from your lines')
    jokeTap('line_touched', tier, { slot: s, where: 'box', written: written.length })
    setOpen(s); setOptions(null); setPicked(-1); setTouching(true)
    try {
      const r = await touch({ data: { draft: lines, slot: s, avoid: offered.current[s] ?? [], controls, anon_session_id: anonSessionId() } })
      if (!r.ok) {
        setOpen(null)
        if (r.reason === 'limited') { jokeTrack('touch_blocked', tier, { slot: s, where: 'box' }); return onLimit() }
        if (r.reason === 'sign_in') return onSignIn?.()
        if (r.reason === 'crisis') return onCrisis()
        return say(r.reason === 'rate_limited' ? 'one at a time · try again in a moment' : 'that one did not come back · try again')
      }
      setOptions(r.options)
      setTouches({ used: r.used, cap: r.cap })
      offered.current[s] = [...(offered.current[s] ?? []), ...r.options.map((o) => o.line)].slice(-12)
    } finally {
      setTouching(false)
    }
  }
  function useOption() {
    if (!open) return
    if (picked >= 0 && options) {
      setLine(open, options[picked]!.line)
      jokeTap('touch_picked', tier, { slot: open, pick: picked + 1, move: options[picked]!.move, where: 'box' })
    } else jokeTap('touch_picked', tier, { slot: open, pick: 'mine', where: 'box' })
    setOpen(null)
  }
  function toggleLock(s: Slot) {
    if (!readSlot(lines, s).trim()) return
    if (tier === 'guest' && onGuestLock && !locked.includes(s)) return onGuestLock(s)
    const on = !locked.includes(s)
    onLocked(on ? [...locked, s] : locked.filter((x) => x !== s))
    jokeTap('line_locked', tier, { slot: s, on, where: 'box' })
  }
  function lockAll() {
    if (tier === 'guest' && onGuestLock) return onGuestLock('all')
    onLocked(written)
    jokeTap('lines_locked_all', tier, { count: written.length })
  }

  return (
    <div className="bt-lined" data-ph-private>
      {LINE_SLOTS.map((s) => {
        const value = readSlot(lines, s)
        const isLocked = locked.includes(s)
        const has = !!value.trim()
        const isHook = s === 'hook'
        const label = slotLabel(s)
        return (
          <div key={s} className={`bt-eslot bt-lline${open === s ? ' open' : ''}`}>
            <div className="bt-eslot-main">
              <span className={`bt-lbl${isHook || s === 'button' ? ' r' : ''}`}>
                {label}
                {SUB[s] && <small>{SUB[s]}</small>}
                {isLocked && <span className="bt-mark lock">locked</span>}
                {has && !isLocked && <span className="bt-mark yours">yours</span>}
              </span>
              <p
                className={`bt-v${isHook ? ' hook' : ''} bt-etext${has ? '' : ' empty'}`}
                contentEditable={!isLocked && !busy}
                suppressContentEditableWarning
                spellCheck={false}
                data-placeholder={PLACEHOLDER[s]}
                onBlur={(e) => onType(s, e.currentTarget)}
                onKeyDown={keyDown}
                aria-label={`${label}, type it`}
                style={s === 'button' ? { fontWeight: 400 } : undefined}
              >
                {value}
              </p>
            </div>
            <div className="bt-ectl">
              <button type="button" className={`bt-mini${open === s ? ' on' : ''}`} disabled={busy || (touching && open === s)} onClick={() => void funnier(s)}>
                {touching && open === s ? '…' : 'funnier'}
              </button>
              <button type="button" className={`bt-mini lock${isLocked ? ' on' : ''}${has ? '' : ' ghost'}`} aria-pressed={isLocked} disabled={busy || !has} onClick={() => toggleLock(s)}>
                {isLocked ? 'locked' : 'lock'}
              </button>
            </div>
            {open === s && options && (
              <div className="bt-pop" role="dialog" aria-label={`${label}, three ways`}>
                <span className="bt-lbl r">funnier · {label} · three ways, from the lines you wrote</span>
                <button type="button" className={`bt-opt keep${picked === -1 ? ' on' : ''}`} onClick={() => setPicked(-1)}>
                  <b>✓</b>
                  <span>{has ? value : <i style={{ color: 'var(--muted)' }}>leave it empty</i>}<small>keep yours</small></span>
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
                  {touches && touches.cap !== null && <span className="bt-note" style={{ marginLeft: 'auto' }}>touch {touches.used} of {touches.cap} today</span>}
                </div>
              </div>
            )}
          </div>
        )
      })}
      <div className="bt-lined-foot">
        <p className={`bt-guide${guide.ready ? ' ready' : ''}`} role="status">{guide.text}</p>
        <div className="bt-lined-cta">
          {written.length > 0 && locked.length < written.length && (
            <button type="button" className="bt-mini" disabled={busy} onClick={lockAll}>lock all {written.length}</button>
          )}
          <button type="button" className="bt-btn ghost" disabled={busy || !written.length} onClick={onFinish} title="Shutap writes the empty lines around yours">
            finish the bit
          </button>
          <button type="button" className="bt-btn bt-go" disabled={busy || !(guide.ready || (tier === 'guest' && written.length > 0))} onClick={onKeep} title="every written line locked: the bit as you typed it">
            keep it →
          </button>
        </div>
      </div>
    </div>
  )
}
