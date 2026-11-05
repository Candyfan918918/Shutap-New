/* AI on demand (Nov 5 2026): the bit as an editable page. Every line can be
 * typed in; nothing changes until the person taps. "funnier" offers three
 * versions of that one line (keep yours first); "lock" keeps a line through
 * every rewrite. Lines the person wrote or picked are marked yours. The
 * page is kept as a version only when they tap "keep this as a version".
 * Behind the ondemand flag; the plain article renders otherwise. */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { keepVersion, touchLine } from '@/lib/bits.functions'
import type { TouchOption } from '@/lib/bits/pipeline.server'
import { SLOTS, readSlot, slotLabel, writeSlot, type BitTier, type BitVersion, type Slot } from '@/lib/bits/shared'
import { anonSessionId, jokeTap, jokeTrack } from '../joke/jokeClient'

export type Draft = { hook: string; setup: string; tags: string[]; button: string }

export function draftOf(v: BitVersion): Draft {
  return { hook: v.hook, setup: v.setup, tags: [...v.tags], button: v.button }
}

type Props = {
  bitId: string
  version: BitVersion
  tier: BitTier
  say: (m: string) => void
  /** the live draft and the locked lines live in the parent so rewrites can read them */
  draft: Draft
  onDraft: (d: Draft) => void
  locked: Slot[]
  onLocked: (l: Slot[]) => void
  yours: Slot[]
  onYours: (y: Slot[]) => void
  onKept: (v: BitVersion) => void
  onSignIn?: () => void
  onLimit: () => void
}

export function EditableBit({ bitId, version, tier, say, draft, onDraft, locked, onLocked, yours, onYours, onKept, onSignIn, onLimit }: Props) {
  const touch = useServerFn(touchLine)
  const keep = useServerFn(keepVersion)
  const [open, setOpen] = useState<Slot | null>(null)
  const [options, setOptions] = useState<TouchOption[] | null>(null)
  const [picked, setPicked] = useState<number>(-1) // -1 = keep yours
  const [busy, setBusy] = useState(false)
  const [keeping, setKeeping] = useState(false)
  const [touches, setTouches] = useState<{ used: number; cap: number | null } | null>(null)
  const offered = useRef<Record<string, string[]>>({})
  /** one level of undo per line */
  const undo = useRef<Partial<Record<Slot, string>>>({})
  const dirty = SLOTS.some((s) => readSlot(draft, s) !== readSlot(version, s) && (s.startsWith('tag') ? Number(s.slice(3)) < version.tags.length : true))

  useEffect(() => {
    // a new version on the page: fresh draft, nothing locked carried over
    setOpen(null); setOptions(null); undo.current = {}
  }, [version.id])

  const slots: Slot[] = ['hook', 'setup', ...draft.tags.map((_, i) => `tag${i}` as Slot), 'button']

  function setLine(s: Slot, line: string, markYours: boolean) {
    onDraft(writeSlot(draft, s, line))
    if (markYours && !yours.includes(s)) onYours([...yours, s])
  }

  function onType(s: Slot, el: HTMLElement) {
    const line = (el.innerText ?? '').replace(/\n+/g, ' ').trim()
    if (line === readSlot(draft, s)) return
    if (!undo.current[s]) undo.current[s] = readSlot(draft, s)
    setLine(s, line, true)
  }

  async function funnier(s: Slot) {
    if (tier === 'guest') return onSignIn?.()
    if (locked.includes(s)) return say('that line is locked · unlock it first')
    jokeTap('line_touched', tier, { slot: s })
    setOpen(s); setOptions(null); setPicked(-1); setBusy(true)
    try {
      const r = await touch({ data: { bit_id: bitId, draft, slot: s, avoid: offered.current[s] ?? [], anon_session_id: anonSessionId() } })
      if (!r.ok) {
        setOpen(null)
        if (r.reason === 'limited') { jokeTrack('touch_blocked', tier, { slot: s }); return onLimit() }
        if (r.reason === 'sign_in') return onSignIn?.()
        return say(r.reason === 'rate_limited' ? 'one at a time · try again in a moment' : 'that one did not come back · try again')
      }
      setOptions(r.options)
      setTouches({ used: r.used, cap: r.cap })
      offered.current[s] = [...(offered.current[s] ?? []), ...r.options.map((o) => o.line)].slice(-12)
    } finally {
      setBusy(false)
    }
  }

  function useOption() {
    if (!open) return
    if (picked < 0 || !options) { setOpen(null); jokeTap('touch_picked', tier, { slot: open, pick: 'mine' }); return }
    undo.current[open] = readSlot(draft, open)
    setLine(open, options[picked]!.line, true)
    jokeTap('touch_picked', tier, { slot: open, pick: picked + 1, move: options[picked]!.move })
    setOpen(null)
  }

  function undoLine(s: Slot) {
    const prev = undo.current[s]
    if (prev === undefined) return
    delete undo.current[s]
    setLine(s, prev, false)
    jokeTrack('line_undone', tier, { slot: s })
  }

  function toggleLock(s: Slot) {
    if (tier === 'guest') return onSignIn?.()
    const on = !locked.includes(s)
    onLocked(on ? [...locked, s] : locked.filter((x) => x !== s))
    jokeTap('line_locked', tier, { slot: s, on })
  }

  async function keepIt() {
    if (tier === 'guest') return onSignIn?.()
    setKeeping(true)
    try {
      const r = await keep({ data: { bit_id: bitId, draft, anon_session_id: anonSessionId() } })
      if (!r.ok) return say(r.reason === 'too_many' ? 'that bit has all the versions it can hold' : 'could not keep it · try again')
      jokeTap('version_kept', tier, { yours: yours.length, locked: locked.length })
      onKept(r.version)
      say('kept · it is a version now')
    } finally {
      setKeeping(false)
    }
  }

  function keyDown(e: KeyboardEvent<HTMLParagraphElement>) {
    if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur() }
  }

  return (
    <>
      <article className="bt-card bt-edit" aria-label="The bit, editable" data-ph-private style={{ paddingTop: 8 }}>
        {slots.map((s) => {
          const isLocked = locked.includes(s)
          const isYours = yours.includes(s)
          const isHook = s === 'hook'
          const label = isHook ? 'hook · first 2 seconds' : slotLabel(s)
          return (
            <div key={s} className={`bt-slot bt-eslot${open === s ? ' open' : ''}`}>
              <div className="bt-eslot-main">
                <span className={`bt-lbl${isHook || s === 'button' ? ' r' : ''}`}>
                  {label}
                  {isLocked && <span className="bt-mark lock">locked</span>}
                  {isYours && !isLocked && <span className="bt-mark yours">yours</span>}
                </span>
                <p
                  className={`bt-v${isHook ? ' hook' : ''} bt-etext`}
                  contentEditable={!isLocked}
                  suppressContentEditableWarning
                  spellCheck={false}
                  onBlur={(e) => onType(s, e.currentTarget)}
                  onKeyDown={keyDown}
                  aria-label={`${label}, editable`}
                  style={s === 'button' ? { fontWeight: 400 } : undefined}
                >
                  {readSlot(draft, s)}
                </p>
              </div>
              <div className="bt-ectl">
                <button className={`bt-mini${open === s ? ' on' : ''}`} disabled={busy && open === s} onClick={() => void funnier(s)}>
                  {busy && open === s ? '…' : 'funnier'}
                </button>
                <button className={`bt-mini lock${isLocked ? ' on' : ''}`} aria-pressed={isLocked} onClick={() => toggleLock(s)}>
                  {isLocked ? 'locked' : 'lock'}
                </button>
                {undo.current[s] !== undefined && (
                  <button className="bt-mini" onClick={() => undoLine(s)}>undo</button>
                )}
              </div>
              {open === s && options && (
                <div className="bt-pop" role="dialog" aria-label={`${label}, three ways`}>
                  <span className="bt-lbl r">funnier · {label} · three ways, your voice</span>
                  <button className={`bt-opt keep${picked === -1 ? ' on' : ''}`} onClick={() => setPicked(-1)}>
                    <b>✓</b>
                    <span>{readSlot(draft, s)}<small>keep yours</small></span>
                  </button>
                  {options.map((o, i) => (
                    <button key={i} className={`bt-opt${picked === i ? ' on' : ''}`} onClick={() => setPicked(i)}>
                      <b>{i + 1}</b>
                      <span>{o.line}<small>{o.move}</small></span>
                    </button>
                  ))}
                  <div className="bt-pop-row">
                    <button className="bt-btn sm" onClick={useOption}>{picked < 0 ? 'keep mine' : 'use this one'}</button>
                    <button className="bt-mini" disabled={busy} onClick={() => void funnier(s)}>three more</button>
                    <button className="bt-mini" onClick={() => setOpen(null)}>close</button>
                    {touches && touches.cap !== null && <span className="bt-note" style={{ marginLeft: 'auto' }}>touch {touches.used} of {touches.cap} today</span>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </article>
      <div className="bt-between" style={{ marginTop: -6 }}>
        <span className="bt-note">
          type in any line · nothing changes until you tap · "funnier" changes that line only · locked lines survive every rewrite
        </span>
        {dirty && (
          <button className="bt-btn sm" disabled={keeping} onClick={() => void keepIt()}>
            {keeping ? 'keeping…' : '+ keep this as a version'}
          </button>
        )}
      </div>
    </>
  )
}
