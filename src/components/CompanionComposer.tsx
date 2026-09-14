/* Native port of the iframe's composerRoot sheet (public/shutap/Landing.dc.html §COMPOSER
   OVERLAY, lines ~395–415). Bottom sheet: eye + copy + text input + send, a Mirror shortcut
   row, and an AI reply area fed by the runCompanion server function (mode 'ask').
   Opened by the floating CompanionBubble. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@/compat/router'
import { useServerFn } from '@tanstack/react-start'
import { EyeMark } from './EyeMark'
import { runCompanion } from '@/lib/agents/companion.functions'
import { getDueCheckin, recordCheckinResponse, snoozeCheckin } from '@/lib/checkins.functions'
import { supabase } from '@/integrations/supabase/client'
import { useCurrentAlias } from '@/hooks/use-current-alias'


const NEWSREADER = "'Newsreader', Georgia, serif"
const SORA = "'Sora', system-ui, sans-serif"

type AskRoom = { id: string; title: string; alias: string; emoji: string }
type Turn = { role: 'user' | 'assistant'; content: string }
type BeatKind = 'trajectory' | 'action' | 'resolution' | 'feeling'
type Beat = { title: string; chips: { value: string; label: string }[]; kind: BeatKind }
type DueCheckin = { id: string; type: string; beat: Beat | null }

export function CompanionComposer({ open, onClose, onSpill, onScan }: {
  open: boolean
  onClose: () => void
  onSpill: () => void
  onScan: () => void
}) {
  const navigate = useNavigate()
  const ask = useServerFn(runCompanion)
  const { alias: currentAlias } = useCurrentAlias()

  const fetchDue = useServerFn(getDueCheckin)
  const submitCheckin = useServerFn(recordCheckinResponse)
  const snoozeFn = useServerFn(snoozeCheckin)
  const inputRef = useRef<HTMLInputElement>(null)
  const [reply, setReply] = useState<string>('')
  const [rooms, setRooms] = useState<AskRoom[]>([])
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<Turn[]>([])
  const [due, setDue] = useState<DueCheckin | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')
  const [checkinBusy, setCheckinBusy] = useState(false)
  const [checkinAck, setCheckinAck] = useState<string>('')

  useEffect(() => {
    if (!open) return
    setReply('')
    setRooms([])
    setHistory([])
    setDue(null)
    setNoteOpen(false)
    setNote('')
    setCheckinAck('')
    queueMicrotask(() => inputRef.current?.focus())
    let cancelled = false
    ;(async () => {
      try {
        const { data: sess } = await supabase.auth.getSession()
        const u = sess.session?.user as { is_anonymous?: boolean } | undefined
        const real = !!sess.session && !u?.is_anonymous
        if (!real) return
        const d = await fetchDue()
        if (cancelled) return
        if (d && d.beat) setDue(d as DueCheckin)
      } catch { /* fail silent */ }
    })()
    return () => { cancelled = true }
  }, [open, fetchDue])

  const onChip = useCallback(async (value: string) => {
    if (!due || !due.beat || checkinBusy) return
    setCheckinBusy(true)
    const kind = due.beat.kind
    const clean = note.trim().slice(0, 2000)
    const payload: Record<string, unknown> = { checkin_id: due.id }
    if (kind === 'trajectory') payload.trajectory = value
    else if (kind === 'action') payload.action = value
    else if (kind === 'resolution') payload.resolution = value
    else if (kind === 'feeling') payload.feeling_tap = value
    if (clean) payload.clean_text = clean
    try {
      await submitCheckin({ data: payload as never })
      setDue(null)
      setNoteOpen(false)
      setNote('')
      setCheckinAck("noted 🤍 — i'll check on you again.")
    } catch {
      setDue(null)
    } finally {
      setCheckinBusy(false)
    }
  }, [due, note, checkinBusy, submitCheckin])

  const onSnooze = useCallback(async () => {
    if (!due) return
    const id = due.id
    setDue(null)
    setNoteOpen(false)
    setNote('')
    try { await snoozeFn({ data: { id } }) } catch { /* fail silent */ }
  }, [due, snoozeFn])

  const send = useCallback(async () => {
    const v = (inputRef.current?.value || '').trim()
    if (!v || busy) return
    setBusy(true)
    setReply('…')
    setRooms([])
    const nextHistory: Turn[] = [...history, { role: 'user', content: v }]
    setHistory(nextHistory)
    if (inputRef.current) inputRef.current.value = ''
    try {
      const res = await ask({ data: { mode: 'ask', messages: nextHistory, alias: currentAlias?.name } })
      const text = (res?.text || '').trim() || "i'm here — say a bit more?"
      setReply(text)
      setHistory((h) => [...h, { role: 'assistant', content: text }])
      if (res?.action === 'spill') { onClose(); onSpill(); return }
      if (res?.action === 'scan') { onClose(); onScan(); return }
      if (res?.action === 'mirror') { onClose(); navigate('/mirror'); return }
      if (res?.action === 'rooms' && Array.isArray(res.rooms)) {
        setRooms(res.rooms as AskRoom[])
      }
    } catch {
      setReply("i couldn't reach the network. try again in a moment.")
    } finally {
      setBusy(false)
    }
  }, [ask, busy, history, navigate, onClose, onScan, onSpill])

  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 85, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(10,5,14,.55)', backdropFilter: 'blur(6px)' }} />
      <div role="dialog" style={{ position: 'relative', width: '100%', maxWidth: 560, background: 'linear-gradient(160deg,#100c14,#100c14)', border: '.5px solid rgba(255,255,255,.16)', borderRadius: '22px 22px 0 0', padding: 22, animation: 'slideUp .3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
          <span style={{ width: 30, display: 'inline-flex', flex: 'none', marginTop: 1 }}>
            <EyeMark size={30} />
          </span>
          <div style={{ flex: 1, fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 14, color: '#fdfbf9', lineHeight: 1.5 }}>
            i'm the companion. tell me what's going on — i can find you a room, help you spill, scan how you're doing, or just answer.
          </div>
          <div onClick={onClose} role="button" style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 13, color: '#9b8090', cursor: 'pointer', flex: 'none' }}>close</div>
        </div>
        {due && due.beat && (
          <div style={{ marginBottom: 14, background: 'rgba(231,84,138,.08)', border: '.5px solid rgba(231,84,138,.28)', borderRadius: 16, padding: '14px 15px' }}>
            <div style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 14.5, color: '#fdfbf9', lineHeight: 1.5, marginBottom: 12 }}>
              {due.beat.title}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {due.beat.chips.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onChip(c.value)}
                  disabled={checkinBusy}
                  style={{ fontFamily: SORA, fontWeight: 600, fontSize: 12.5, padding: '7px 13px', borderRadius: 999, border: '1px solid rgba(231,84,138,.35)', background: 'rgba(231,84,138,.14)', color: '#fdfbf9', cursor: checkinBusy ? 'wait' : 'pointer', opacity: checkinBusy ? 0.6 : 1, transition: 'background .15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(231,84,138,.28)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(231,84,138,.14)' }}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {!noteOpen ? (
              <div
                role="button"
                onClick={() => setNoteOpen(true)}
                style={{ display: 'inline-block', fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 12.5, color: '#caaebb', cursor: 'pointer', marginRight: 14 }}
              >
                add a note — optional
              </div>
            ) : (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 2000))}
                placeholder="add a note — optional"
                rows={2}
                style={{ display: 'block', width: '100%', marginTop: 4, marginBottom: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, padding: '8px 10px', color: '#fdfbf9', fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 13.5, outline: 'none', resize: 'vertical' }}
              />
            )}
            <div
              role="button"
              onClick={onSnooze}
              style={{ display: 'inline-block', fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 12.5, color: '#9b8090', cursor: 'pointer' }}
            >
              not now
            </div>
          </div>
        )}
        {checkinAck && !due && (
          <div style={{ marginBottom: 14, fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 13.5, color: '#f7b8d4', lineHeight: 1.5 }}>
            {checkinAck}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 14, padding: '12px 14px' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder='"i need to get something off my chest" · "how am i doing?" · "family rooms" · "what is shutap?"'
            onKeyDown={(e) => { if (e.key === 'Enter') send() }}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fdfbf9', fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 15 }}
          />
          <div onClick={send} role="button" style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 13.5, color: '#a52a5f', cursor: busy ? 'wait' : 'pointer', flex: 'none', opacity: busy ? 0.6 : 1 }}>send →</div>
        </div>
        <div onClick={() => { onClose(); navigate('/mirror') }} role="button" style={{ marginTop: 13, display: 'flex', alignItems: 'center', gap: 11, background: 'rgba(231,84,138,.10)', border: '.5px solid rgba(231,84,138,.28)', borderRadius: 14, padding: '13px 15px', cursor: 'pointer' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#f7b8d4" strokeWidth={1.6} style={{ width: 20, height: 20, flex: 'none' }}>
            <rect x="5" y="3" width="14" height="18" rx="7" />
            <path d="M9 8.5c1 1.2 5 1.2 6 0" />
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 13, color: '#fdfbf9' }}>the mirror</div>
            <div style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 12.5, color: '#caaebb', marginTop: 1 }}>what i've noticed about you, over time</div>
          </div>
          <span style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 13, color: '#f7b8d4', flex: 'none' }}>open →</span>
        </div>
        {reply && (
          <div style={{ marginTop: 14, fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 14.5, color: '#c4a0b2', lineHeight: 1.55 }}>{reply}</div>
        )}
        {rooms.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rooms.map((r) => (
              <div
                key={r.id}
                role="button"
                onClick={() => { onClose(); navigate(`/stream#room-${r.id}`) }}
                style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'rgba(255,255,255,.05)', border: '.5px solid rgba(255,255,255,.12)', borderRadius: 12, padding: '11px 13px', cursor: 'pointer' }}
              >
                <span style={{ fontSize: 20, flex: 'none' }}>{r.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 13, color: '#fdfbf9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                  <div style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 12, color: '#9b8090', marginTop: 1 }}>{r.alias}</div>
                </div>
                <span style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 12.5, color: '#f7b8d4', flex: 'none' }}>open →</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
