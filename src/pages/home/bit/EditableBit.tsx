/* AI on demand (Nov 5 2026): the bit as an editable page. Every line can be
 * typed in; nothing changes until the person taps. "funnier" offers three
 * versions of that one line (keep yours first); "lock" keeps a line through
 * every rewrite. Lines the person wrote or picked are marked yours.
 * Nov 20 2026 (Candy): a changed line is saved at once (no "keep this as
 * a version" step), so the video, teleprompter, script and shot list
 * always match the lines on the page. Saving never counts as a bit.
 * Behind the ondemand flag; the plain article renders otherwise. */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { keepVersion, touchLine } from '@/lib/bits.functions'
import type { TouchOption } from '@/lib/bits/pipeline.server'
import { SLOTS, readSlot, writeSlot, type BitTier, type BitVersion, type Slot } from '@/lib/bits/shared'
import { anonSessionId, jokeTap, jokeTrack } from '../joke/jokeClient'

export type Draft = { hook: string; setup: string; tags: string[]; button: string }

/** The line names on the result page, in plain words (Nov 20 2026). */
export function plainLabel(s: Slot): string {
  if (s === 'hook') return 'Opening line'
  if (s === 'setup') return 'What happened'
  if (s === 'button') return 'Last line'
  const n = Number(s.slice(3))
  return n === 0 ? 'Funny line' : n === 1 ? 'Funnier line' : `Funny line ${n + 1}`
}

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
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const saving = useRef(false)
  const queued = useRef<Draft | null>(null)
  /** a save lands as a new (or rewritten) version: keep this page's undo across it */
  const keepUndo = useRef(false)
  const [touches, setTouches] = useState<{ used: number; cap: number | null } | null>(null)
  const offered = useRef<Record<string, string[]>>({})
  /** each line's paragraph: funnier reads what is typed right now */
  const els = useRef<Partial<Record<Slot, HTMLElement | null>>>({})
  /** one level of undo per line */
  const undo = useRef<Partial<Record<Slot, string>>>({})
  const differs = (d: Draft) => SLOTS.some((s) => readSlot(d, s) !== readSlot(version, s) && (s.startsWith('tag') ? Number(s.slice(3)) < version.tags.length : true))
  const versionRef = useRef(version)
  versionRef.current = version

  useEffect(() => {
    // a new version on the page: fresh draft, nothing locked carried over
    setOpen(null); setOptions(null)
    if (keepUndo.current) keepUndo.current = false
    else { undo.current = {}; setSaved('idle') }
  }, [version.id])

  /** Save the lines as they stand. One save at a time; the latest wins. */
  async function save(next: Draft) {
    if (tier === 'guest') return
    if (!next.hook.trim() || !next.setup.trim() || !next.button.trim() || !next.tags.some((t) => t.trim())) return
    if (saving.current) { queued.current = next; return }
    saving.current = true
    setSaved('saving')
    try {
      const v = versionRef.current
      const r = await keep({ data: { bit_id: bitId, draft: next, replace_version_id: v.kind === 'edited' ? v.id : undefined, anon_session_id: anonSessionId() } })
      if (!r.ok) {
        setSaved('failed')
        jokeTrack('line_save_failed', tier, { reason: r.reason })
        if (r.reason === 'too_many') say('this bit has all the versions it can hold · make a new bit to keep editing')
        else say('could not save that line · try again')
      } else {
        keepUndo.current = r.version.id !== v.id
        jokeTap('version_kept', tier, { yours: yours.length, locked: locked.length, auto: true, replaced: r.version.id === v.id })
        onKept(r.version)
        setSaved('saved')
      }
    } catch {
      setSaved('failed')
      say('could not reach Shutap · your line is not saved yet')
    } finally {
      saving.current = false
      const q = queued.current
      queued.current = null
      if (q) void save(q)
    }
  }

  const slots: Slot[] = ['hook', 'setup', ...draft.tags.map((_, i) => `tag${i}` as Slot), 'button']

  function setLine(s: Slot, line: string, markYours: boolean) {
    const next = writeSlot(draft, s, line)
    onDraft(next)
    if (markYours && !yours.includes(s)) onYours([...yours, s])
    if (differs(next)) void save(next)
  }

  function onType(s: Slot, el: HTMLElement) {
    const line = (el.innerText ?? '').replace(/\n+/g, ' ').trim()
    if (line === readSlot(draft, s)) return
    if (!undo.current[s]) undo.current[s] = readSlot(draft, s)
    setLine(s, line, true)
  }

  /** the bit as typed on the page this instant (state can lag a blur) */
  function live(): Draft {
    let next = draft
    for (const sl of slots) {
      const el = els.current[sl]
      if (!el) continue
      const t = (el.innerText ?? '').replace(/\n+/g, ' ').trim()
      if (t !== readSlot(next, sl)) {
        if (!undo.current[sl]) undo.current[sl] = readSlot(next, sl)
        next = writeSlot(next, sl, t)
        if (!yours.includes(sl)) onYours([...yours, sl])
      }
    }
    if (next !== draft) onDraft(next)
    return next
  }

  async function funnier(s: Slot) {
    if (tier === 'guest') return onSignIn?.()
    const draft = live()
    if (locked.includes(s)) return say('that line is locked · unlock it first')
    jokeTap('line_touched', tier, { slot: s })
    setOpen(s); setOptions(null); setPicked(-1); setBusy(true)
    try {
      const r = await touch({ data: { bit_id: bitId, draft, slot: s, avoid: offered.current[s] ?? [], anon_session_id: anonSessionId() } })
      if (!r.ok) {
        setOpen(null)
        if (r.reason === 'limited') { jokeTrack('touch_blocked', tier, { slot: s }); return onLimit() }
        if (r.reason === 'sign_in') return onSignIn?.()
        jokeTrack('touch_failed', tier, { slot: s, where: 'result', reason: r.reason })
        return say(r.reason === 'rate_limited' ? 'one at a time · try again in a moment' : 'that one did not come back · try again')
      }
      setOptions(r.options)
      setTouches({ used: r.used, cap: r.cap })
      offered.current[s] = [...(offered.current[s] ?? []), ...r.options.map((o) => o.line)].slice(-12)
    } catch {
      setOpen(null)
      jokeTrack('touch_failed', tier, { slot: s, where: 'result', reason: 'network' })
      say('could not reach Shutap · try again')
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

  function keyDown(e: KeyboardEvent<HTMLParagraphElement>) {
    if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur() }
  }

  return (
    <>
      <div className="bt-key" aria-label="What funnier and lock do">
        <div><span className="bt-mini fb" aria-hidden>funnier</span><span>Shows 3 new ways to say that line. Yours stays first: pick one or keep yours.</span></div>
        <div><span className="bt-mini lock on" aria-hidden>lock</span><span>Keeps that line word for word when you rewrite the whole bit.</span></div>
      </div>
      <article className="bt-edit" aria-label="The bit, editable" data-ph-private>
        {slots.map((s) => {
          const isLocked = locked.includes(s)
          const isYours = yours.includes(s)
          const label = plainLabel(s)
          return (
            <div key={s} className={`bt-row${open === s ? ' open' : ''}${isLocked ? ' locked' : ''}`}>
              <div className="bt-eslot-main">
                <span className="bt-rowk">
                  {label}
                  {isYours && !isLocked && <span className="bt-mark yours">yours</span>}
                </span>
                <p
                  ref={(el) => { els.current[s] = el }}
                  className="bt-v bt-etext"
                  contentEditable={!isLocked}
                  suppressContentEditableWarning
                  spellCheck={false}
                  onBlur={(e) => onType(s, e.currentTarget)}
                  onKeyDown={keyDown}
                  aria-label={`${label}, editable`}
                >
                  {readSlot(draft, s)}
                </p>
              </div>
              <div className="bt-ectl">
                {undo.current[s] !== undefined && (
                  <button className="bt-mini" onClick={() => undoLine(s)}>undo</button>
                )}
                <button className={`bt-mini fb${open === s ? ' on' : ''}`} disabled={busy && open === s} onClick={() => void funnier(s)}>
                  {busy && open === s ? '…' : 'funnier'}
                </button>
                <button className={`bt-mini lock${isLocked ? ' on' : ''}`} aria-pressed={isLocked} onClick={() => toggleLock(s)}>
                  <LockIcon open={!isLocked} />{isLocked ? 'locked' : 'lock'}
                </button>
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
      <span className="bt-note" role="status" style={{ minHeight: '1.4em' }}>
        {saved === 'saving' ? 'saving your line…' : saved === 'saved' ? 'Saved. The video, teleprompter, script and shot list now use your new line.' : saved === 'failed' ? 'That line is not saved yet.' : 'You can also type in any line. Changes save by themselves.'}
      </span>
    </>
  )
}

function LockIcon({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d={open ? 'M8 11V8a4 4 0 0 1 7.5-2' : 'M8 11V8a4 4 0 0 1 8 0v3'} />
    </svg>
  )
}
