/* Shutap Toasts, one toast (Nov 6 2026): boards 2, 3, 4 and 11.
 *   editing  → their lines green and locked (unlock to change), Shutap's
 *              lines in dashed "tap to edit" boxes, "funnier" on any line
 *              ("keep it as it is" first), the clock against the target,
 *              autosaved; "lock it & get my toast" → the lock sheet.
 *   locked   → "yours to keep", the deliverables, copy and download as often
 *              as they like; "change a line" is a new toast ($12.99, free on
 *              Pro); "remove the mark" on the free toast.
 * Names live on this device: the page shows them, the server never has them. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { useCurrentAlias } from '@/hooks/use-current-alias'
import { getStripe, getStripeEnvironment } from '@/lib/stripe'
import { confirmToastPrepay, createToastCheckout, createToastPrepayCheckout, toastPaidStatus } from '@/lib/payments.functions'
import { copyMyToast, cutMyToast, getMyToast, keepToastEdit, lockMyToast, myToastUsage, touchMyLine, type ToastRow } from '@/lib/toasts.functions'
import { OCCASION, TONE_LABEL, clock, fromPlaceholders, toPlaceholders, toastSeconds, type Names, type ToastLine } from '@/lib/toasts/shared'
import { readNames, saveNames } from '@/lib/toasts/names-store'
import { lineTimes, speechText, toastTitle, withMark } from '@/lib/toasts/toast-text'
import { cueCardsPdf, downloadBlob, keepsakePdf, pdfName, speechPdf } from '@/lib/toasts/toast-pdf'
import { prompterLink, readRuns, type RehearseRun } from '@/lib/toasts/on-the-day'
import QRCode from 'qrcode'
import type { ToastUsage } from '@/lib/toasts/usage.server'
import { TOAST_ONCE, usd } from '@/lib/pricing'
import { trackEvent } from '@/lib/tracking'
import { phCapture } from '@/lib/posthog'
import '@/pages/realtors/realtors.css'
import './toasts.css'

const track = (name: string, props: Record<string, unknown> = {}) => { void phCapture(name, { product: 'toasts', ...props }); void trackEvent(name, { product: 'toasts', ...props }) }
const mine = (l: ToastLine) => l.source === 'story' || l.source === 'true_thing'

const LockIcon = ({ open, color, size = 14 }: { open?: boolean; color: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d={open ? 'M8 11V7a4 4 0 0 1 7.5-2' : 'M8 11V7a4 4 0 0 1 8 0v4'} /></svg>
)

export function ToastPage({ id, sessionId, changedSession }: { id: string; sessionId?: string; changedSession?: string }) {
  const { userId, ready } = useCurrentAlias()
  const navigate = useNavigate()
  const [row, setRow] = useState<ToastRow | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'not_found' | 'off' | 'signin'>('loading')
  const [names, setNames] = useState<Names | null>(null)
  const [usage, setUsage] = useState<ToastUsage | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const noteTimer = useRef<number | undefined>(undefined)
  const say = (m: string) => { setNote(m); window.clearTimeout(noteTimer.current); noteTimer.current = window.setTimeout(() => setNote(null), 3200) }

  useEffect(() => { setNames(readNames(id)) }, [id])
  const load = () => getMyToast({ data: { id } }).then((r) => { if (r.ok) { setRow(r.toast); setState('ok') } else setState(r.reason) }).catch(() => setState('not_found'))
  useEffect(() => {
    if (!ready) return
    if (!userId) { setState('signin'); return }
    void load()
    myToastUsage({ data: {} }).then((r) => setUsage(r.usage)).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, id])

  // back from "remove the mark"
  useEffect(() => {
    if (!ready || !userId || !sessionId) return
    toastPaidStatus({ data: { toastId: id, sessionId, environment: getStripeEnvironment() } })
      .then((r) => { if (r.paid) { say('the mark is off · this toast is clean everywhere'); track('toast_unmarked_seen', {}) } })
      .catch(() => {})
      .finally(() => { void load(); void navigate({ to: '/toasts/edit/$id', params: { id }, search: {} as never, replace: true }) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, sessionId])

  // back from paying for "change a line": make the copy and open it
  useEffect(() => {
    if (!ready || !userId || !changedSession) return
    confirmToastPrepay({ data: { sessionId: changedSession, environment: getStripeEnvironment() } })
      .then(async (r) => {
        if (!r.paid) { say('payment not confirmed yet · if you were charged, tap change a line again'); return }
        const c = await copyMyToast({ data: { id } })
        if (c.ok) { const n = readNames(id); if (n) saveNames(c.id, n); track('toast_copied', { paid: true }); void navigate({ to: '/toasts/edit/$id', params: { id: c.id }, search: {} as never, replace: true }) }
        else say('could not make the copy · tap change a line again, you will not pay twice')
      })
      .catch(() => {})
      .finally(() => { void navigate({ to: '/toasts/edit/$id', params: { id }, search: {} as never, replace: true }) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, changedSession])

  if (state === 'loading') return <div className="rl"><div className="rl-col"><p className="rl-note" style={{ textAlign: 'center' }}>opening your toast…</p></div></div>
  if (state === 'signin') return <div className="rl"><div className="rl-col"><p className="rl-lead">Sign in to open your toast.</p><Link to="/welcome" className="rl-btn" style={{ alignSelf: 'center' }}>sign in</Link></div></div>
  if (state !== 'ok' || !row?.toast) return <div className="rl"><div className="rl-col"><p className="rl-lead">{state === 'off' ? 'Shutap Toasts opens later today.' : 'That toast isn’t here.'}</p><Link to="/toasts" className="rl-btn ghost" style={{ alignSelf: 'center' }}>write a toast</Link></div></div>
  if (!names) return <AskNames row={row} onDone={(n) => { saveNames(id, n); setNames(n) }} />

  return (
    <>
      {row.locked_at
        ? <Locked row={row} names={names} usage={usage} say={say} onNames={(n) => { saveNames(id, n); setNames(n) }} onRow={setRow} />
        : <Editor row={row} names={names} say={say} onNames={(n) => { saveNames(id, n); setNames(n) }} onLocked={(r) => { setRow(r); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />}
      {note && <div className="rl-toast" role="status">{note}</div>}
    </>
  )
}

/* ── another device: the names are asked once, kept on this device only ── */
function AskNames({ row, onDone }: { row: ToastRow; onDone: (n: Names) => void }) {
  const spec = OCCASION[row.occasion]
  const [ask, setAsk] = useState<Names>({ friend: '', partner: '', me: '' })
  return (
    <div className="rl"><div className="rl-col">
      <h1 className="rl-h1" style={{ fontSize: 30 }}>Who's this toast for?</h1>
      <p className="rl-lead">Names stay on your devices, never with Shutap. This device doesn't have them yet.</p>
      <div className="rl-card">
        <label className="ts-field">{spec.who}<input className="rl-input" value={ask.friend} onChange={(e) => setAsk({ ...ask, friend: e.target.value })} /></label>
        {spec.partner && <label className="ts-field">who they're marrying<input className="rl-input" value={ask.partner ?? ''} onChange={(e) => setAsk({ ...ask, partner: e.target.value })} /></label>}
        <label className="ts-field">your first name<input className="rl-input" value={ask.me} onChange={(e) => setAsk({ ...ask, me: e.target.value })} /></label>
        <button type="button" className="rl-btn" disabled={!ask.friend.trim() || !ask.me.trim() || (spec.partner && !ask.partner?.trim())} onClick={() => { onDone(ask); track('toast_names_asked', {}) }}>show my toast</button>
      </div>
    </div></div>
  )
}

/* ── names: change any time, never counts as an edit ── */
function NamesStrip({ row, names, onNames }: { row: ToastRow; names: Names; onNames: (n: Names) => void }) {
  const spec = OCCASION[row.occasion]
  const [open, setOpen] = useState(false)
  const [v, setV] = useState<Names>(names)
  return (
    <div className="ts-names" style={{ background: '#fff', borderColor: 'var(--line)', color: 'var(--ink-2)', flexWrap: 'wrap' }}>
      <LockIcon color="#9b3559" size={16} />
      {!open ? (
        <span>Names are filled in by this browser; Shutap stored {'{friend}'}{spec.partner ? ', {partner}' : ''}, {'{me}'}. <button type="button" className="rl-mini" onClick={() => { setV(names); setOpen(true) }}>change names</button> <span className="rl-note" style={{ display: 'inline' }}>never counts as an edit</span></span>
      ) : (
        <span className="rl-row" style={{ flex: 1 }}>
          <input className="rl-input" style={{ height: 36, width: 140 }} aria-label={spec.who} value={v.friend} onChange={(e) => setV({ ...v, friend: e.target.value })} />
          {spec.partner && <input className="rl-input" style={{ height: 36, width: 140 }} aria-label="their partner" value={v.partner ?? ''} onChange={(e) => setV({ ...v, partner: e.target.value })} />}
          <input className="rl-input" style={{ height: 36, width: 140 }} aria-label="your first name" value={v.me} onChange={(e) => setV({ ...v, me: e.target.value })} />
          <button type="button" className="rl-btn sm" disabled={!v.friend.trim() || !v.me.trim()} onClick={() => { onNames(v); setOpen(false); track('toast_names_changed', {}) }}>save</button>
          <button type="button" className="rl-mini" onClick={() => setOpen(false)}>cancel</button>
        </span>
      )}
    </div>
  )
}

function Header({ row, names, right }: { row: ToastRow; names: Names; right: React.ReactNode }) {
  const spec = OCCASION[row.occasion]
  return (
    <div className="rl-row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p className="rl-lbl r" style={{ margin: 0 }}>{spec.label} · {TONE_LABEL[row.tone]} · target {clock(row.length)}</p>
        <h1 style={{ margin: 0, font: '800 clamp(28px, 4vw, 38px)/1.1 var(--sora)', letterSpacing: '-0.03em', color: 'var(--wine)' }}>
          {row.locked_at ? 'Your toast ' : ''}{toastTitle(row.occasion, names).replace(/^For /, row.locked_at ? 'for ' : 'For ')}
        </h1>
      </div>
      {right}
    </div>
  )
}

/* ───────────────────────── editing (board 2) ───────────────────────── */
function Editor({ row, names, say, onNames, onLocked }: { row: ToastRow; names: Names; say: (m: string) => void; onNames: (n: Names) => void; onLocked: (r: ToastRow) => void }) {
  // the page shows names; what's saved has placeholders again
  const shown = (t: string) => fromPlaceholders(t, names)
  const back = (t: string) => toPlaceholders(t, names)
  const [lines, setLines] = useState<ToastLine[]>(() => row.toast!.lines.map((l) => ({ ...l, text: shown(l.text) })))
  const [unlocked, setUnlocked] = useState<Set<number>>(new Set())
  const [touch, setTouch] = useState<{ index: number; busy: boolean; options?: { line: string; move: string }[]; error?: string } | null>(null)
  const [saved, setSaved] = useState<'saved' | 'saving' | 'unsaved' | 'failed'>('saved')
  const [sheet, setSheet] = useState(false)
  const [locking, setLocking] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const first = useRef(true)
  const spec = OCCASION[row.occasion]

  const stored = (ls: ToastLine[]) => ls.map((l) => ({ ...l, text: back(l.text) }))
  const secs = toastSeconds(lines)
  const times = useMemo(() => lineTimes(lines), [lines])
  const window_ = spec.range ?? [0, row.length]
  const over = secs - window_[1]

  // autosave a moment after typing stops
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setSaved('unsaved')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      setSaved('saving')
      try {
        const r = await keepToastEdit({ data: { id: row.id, lines: stored(lines) } })
        setSaved(r.ok ? 'saved' : 'failed')
        if (!r.ok && r.reason === 'locked') say('this toast is locked')
      } catch { setSaved('failed') }
    }, 1400)
    return () => window.clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines])

  const setText = (i: number, text: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, text: text.replace(/\n/g, ' ') } : l)))

  async function funnier(i: number) {
    const avoid = touch?.index === i ? (touch.options ?? []).map((o) => o.line) : []
    setTouch({ index: i, busy: true })
    track('toast_line_funnier_opened', { line: i + 1, section: lines[i]?.section })
    try {
      const r = await touchMyLine({ data: { id: row.id, index: i, lines: stored(lines), avoid } })
      setTouch(r.ok ? { index: i, busy: false, options: r.options } : { index: i, busy: false, error: 'no new ways this time · tap funnier again' })
    } catch { setTouch({ index: i, busy: false, error: 'could not reach Shutap · try again' }) }
  }

  async function lock() {
    setLocking(true)
    try {
      window.clearTimeout(timer.current)
      const r = await lockMyToast({ data: { id: row.id, lines: stored(lines) } })
      if (!r.ok) return say('could not lock · try again')
      track('toast_locked', { occasion: row.occasion, seconds: secs })
      setSheet(false)
      onLocked(r.toast)
    } catch { say('could not lock · try again') } finally { setLocking(false) }
  }

  return (
    <div className="rl">
      <div className="ts-wrap">
        <Header row={row} names={names} right={<span className="rl-row" style={{ gap: 8 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 34, padding: '0 14px', borderRadius: 999, background: '#eef4ef', color: '#2f4a37', font: '700 13px var(--sora)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2f8a55' }} />editing · open until you lock</span><span className="rl-note">{saved === 'saving' ? 'saving…' : saved === 'unsaved' ? 'unsaved' : saved === 'failed' ? 'not saved · keep typing to retry' : 'saved'}</span></span>} />
        <NamesStrip row={row} names={names} onNames={(n) => { setLines((ls) => ls.map((l) => ({ ...l, text: fromPlaceholders(toPlaceholders(l.text, names), n) }))); onNames(n) }} />

        <div className="ts-cols">
          <section className="rl-box">
            <div className="rl-box-head">
              <span>● the speech</span>
              <span className="rl-row" style={{ fontWeight: 500, color: 'var(--muted)', gap: 12 }}>
                <span><b style={{ color: 'var(--rose)' }}>‖</b> pause</span>
                <span><b style={{ color: 'var(--rose)' }}>(wait)</b> let them laugh</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#f3f8f4', border: '2px solid #2f8a55' }} />your lines</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#fff', border: '1.5px dashed var(--rose)' }} />tap to edit</span>
              </span>
            </div>
            <div style={{ padding: '6px 20px 4px' }}>
              {lines.map((l, i) => {
                const theirs = mine(l)
                const frozen = theirs && !unlocked.has(i)
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px minmax(0, 1fr) auto', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--line)', alignItems: 'start' }}>
                    <span style={{ font: '700 13px var(--sora)', color: 'var(--rose)', paddingTop: 22 }}>{clock(times[i]!)}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                      <span className="rl-lbl">{shown(l.section)}{theirs ? ' · yours' : l.source === 'bridge' ? ' · bridge' : ''}</span>
                      {frozen ? (
                        <p style={{ margin: '0 0 0 -10px', font: '400 19px/1.45 var(--news)', color: 'var(--ink)', background: '#f3f8f4', border: '2px solid #2f8a55', borderRadius: 10, padding: '6px 10px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <button type="button" aria-label={`unlock line ${i + 1} to change it`} title="unlock to change your own line" onClick={() => setUnlocked((s) => new Set(s).add(i))} style={{ border: 0, background: 'none', padding: '4px 0 0', cursor: 'pointer' }}><LockIcon color="#2f6a45" size={16} /></button>
                          <span>{l.text}</span>
                        </p>
                      ) : (
                        <textarea aria-label={`line ${i + 1}`} rows={1} value={l.text} onChange={(e) => setText(i, e.target.value)}
                          style={{ margin: '0 0 0 -10px', font: '400 19px/1.45 var(--news)', color: 'var(--ink)', border: theirs ? '2px solid #2f8a55' : '1.5px dashed rgba(184,69,107,.45)', borderRadius: 10, background: '#fff', padding: '6px 10px', resize: 'none', fieldSizing: 'content', minHeight: '1.45em' } as React.CSSProperties} />
                      )}
                      {(l.pause || l.laugh || l.glass || l.note) && (
                        <span style={{ font: '600 12.5px var(--sora)', color: 'var(--rose-ink)' }}>
                          {[l.pause && '‖ pause', l.laugh && '(wait) let them laugh', l.glass && '↑ glasses up', l.note && shown(l.note)].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                    <div style={{ paddingTop: 20 }}>
                      {!frozen && !theirs && <button type="button" className={`rl-mini${touch?.index === i ? ' on' : ''}`} disabled={touch?.busy} onClick={() => void funnier(i)}>{touch?.index === i && touch.busy ? 'three ways…' : 'funnier'}</button>}
                      {theirs && !frozen && <button type="button" className="rl-mini" onClick={() => setUnlocked((s) => { const n = new Set(s); n.delete(i); return n })}>lock</button>}
                    </div>
                    {touch?.index === i && !touch.busy && (
                      <div className="rl-pop" style={{ gridColumn: '1 / -1' }}>
                        <span className="rl-lbl">three ways · nothing changes until you pick</span>
                        <button type="button" className="rl-opt keep" onClick={() => { setTouch(null); track('toast_line_funnier_kept', { line: i + 1 }) }}><b style={{ color: '#2f6a45' }}>✓</b><span>keep it as it is</span></button>
                        {touch.error ? <p className="rl-note" role="alert">{touch.error}</p> : touch.options?.map((o, k) => (
                          <button key={k} type="button" className="rl-opt" onClick={() => { setText(i, shown(o.line)); setTouch(null); track('toast_line_funnier_picked', { line: i + 1, option: k + 1, move: o.move }) }}>
                            <b>{k + 1}</b><span>{shown(o.line)}<small>{o.move}</small></span>
                          </button>
                        ))}
                        {!touch.error && <button type="button" className="rl-mini" style={{ alignSelf: 'flex-start' }} onClick={() => void funnier(i)}>three more</button>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ padding: '14px 20px 18px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--line)' }}>
              <div className="rl-row" style={{ justifyContent: 'space-between', font: '700 13px var(--sora)' }}>
                <span>{clock(secs)} <span style={{ fontWeight: 500, color: 'var(--muted)' }}>of {spec.range ? `${clock(spec.range[0])}–${clock(spec.range[1])}` : clock(row.length)} · at a relaxed 140 words a minute, pauses counted</span></span>
                <span style={{ color: over > 0 ? 'var(--rose-ink)' : '#2f6a45' }}>{over > 0 ? `${over} seconds over` : `${-over} seconds to spare`}</span>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: 'var(--surface)', overflow: 'hidden' }}><div style={{ width: `${Math.min(100, (secs / window_[1]) * 100)}%`, height: '100%', background: over > 0 ? 'var(--wine)' : 'var(--rose)', borderRadius: 999 }} /></div>
            </div>
          </section>

          <aside className="ts-side">
            <div className="rl-card">
              <span className="rl-lbl r">unlocks when you lock</span>
              {['the speech PDF', 'cue cards', 'the prompter', 'the 60-second version', 'rehearse', spec.keepsake ? 'keepsake + the text after' : 'the text after'].map((g) => (
                <div key={g} style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--muted)', font: '600 14px var(--sora)' }}><LockIcon color="#9c9196" size={16} />{g}</div>
              ))}
            </div>
            <div className="ts-how">
              <p style={{ font: '700 15px/1.4 var(--sora)', color: 'var(--wine)' }}>Edit anything until it sounds like you.</p>
              <p style={{ fontSize: 13.5 }}>Tap any dashed line and type over it, or tap funnier. Your own lines stay word for word; tap the lock on one to change it. When you lock, the words are final and the downloads open. A change after that is a new toast, {usd(TOAST_ONCE.amount)}.</p>
              <button type="button" className="rl-btn" style={{ height: 52, fontSize: 16 }} onClick={() => { setSheet(true); track('toast_lock_sheet_opened', {}) }}>lock it &amp; get my toast</button>
              <p className="rl-note" style={{ textAlign: 'center' }}>nothing more to pay</p>
            </div>
          </aside>
        </div>
      </div>

      {sheet && (
        <div className="rl-sheet-scrim" onClick={() => setSheet(false)}>
          <div className="rl-sheet ts-sheet" role="dialog" aria-modal aria-label="Lock this toast" onClick={(e) => e.stopPropagation()}>
            <LockIcon color="#b8456b" size={30} />
            <h3 style={{ margin: 0, font: '800 24px/1.15 var(--sora)', color: 'var(--wine)' }}>Lock this toast?</h3>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: 'var(--ink-2)' }}>Once it's locked, the words are final. The speech PDF, cue cards, prompter, the 60-second version, rehearse and {spec.keepsake ? 'keepsake' : 'the text after'} all open.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--surface)', borderRadius: 14, padding: '14px 16px', fontSize: 14, lineHeight: 1.5 }}>
              <p style={{ margin: 0 }}><b>Still yours to change after locking:</b> the names (they live on this device) and the prompter's speed and text size.</p>
              <p style={{ margin: 0 }}><b>Not after locking:</b> any word of the speech. A changed line is a new toast, {usd(TOAST_ONCE.amount)}, starting from this one.</p>
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, background: '#f3f8f4', border: '1px solid #b9d3bf', borderRadius: 14, padding: '12px 16px' }}><b>Yours to keep.</b> Find it any time under your <b>profile → My creations → toasts</b>, with unlimited downloads.</p>
            <div className="rl-row" style={{ justifyContent: 'space-between', font: '600 13.5px var(--sora)', color: 'var(--ink-2)' }}>
              <span>{spec.label} · {clock(row.length)} target</span><span style={{ color: over > 0 ? 'var(--rose-ink)' : '#2f6a45' }}>{clock(secs)} · {over > 0 ? `${over} seconds over` : `${-over} seconds to spare`}</span>
            </div>
            <div className="rl-row" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="rl-btn ghost" onClick={() => setSheet(false)}>keep editing</button>
              <button type="button" className="rl-btn" disabled={locking} onClick={() => void lock()}>{locking ? 'locking…' : 'lock it'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── locked (board 4) ───────────────────────── */
function Locked({ row, names, usage, say, onNames, onRow }: { row: ToastRow; names: Names; usage: ToastUsage | null; say: (m: string) => void; onNames: (n: Names) => void; onRow: (r: ToastRow) => void }) {
  const navigate = useNavigate()
  const t = row.toast!
  const spec = OCCASION[row.occasion]
  const marked = row.marked
  const pro = usage?.tier === 'pro'
  const [cut, setCut] = useState(row.cut60)
  const [cutting, setCutting] = useState(false)
  const [sheet, setSheet] = useState<null | 'change' | 'change_pay' | 'unmark'>(null)
  const [checkoutError, setCheckoutError] = useState('')
  const [copying, setCopying] = useState(false)
  const [runs, setRuns] = useState<RehearseRun[]>([])
  const qrRef = useRef<HTMLCanvasElement | null>(null)
  const shown = (s: string) => fromPlaceholders(s, names)
  const phoneLink = typeof window === 'undefined' ? '' : prompterLink(window.location.origin, row.id, names)
  useEffect(() => { setRuns(readRuns(row.id)) }, [row.id])
  useEffect(() => {
    if (!qrRef.current || !phoneLink) return
    QRCode.toCanvas(qrRef.current, phoneLink, { width: 150, margin: 1, color: { dark: '#1a1418', light: '#ffffff' } }).catch(() => {})
  }, [phoneLink])
  const openPrompter = (opts: { short?: boolean; rehearse?: boolean } = {}) => {
    track(opts.rehearse ? 'toast_rehearse_opened' : 'toast_prompter_opened_here', { short: !!opts.short })
    window.location.assign(prompterLink(window.location.origin, row.id, names, opts))
  }

  async function copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); say('copied') } catch { say('copy failed · select the text instead') }
    track('toast_copied_text', { what, marked })
  }
  function pdf(lines: ToastLine[], label: string, what: string) {
    downloadBlob(speechPdf({ occasion: row.occasion, tone: row.tone, length: what === 'cut60' ? 60 : row.length, lines, names, marked, label }), pdfName(row.occasion, names, what))
    track('toast_downloaded', { what, marked })
  }
  async function makeCut(again = false) {
    setCutting(true)
    track('toast_cut_requested', { again })
    try {
      const r = await cutMyToast({ data: { id: row.id, again } })
      if (r.ok) { setCut(r.cut); onRow({ ...row, cut60: r.cut }) } else say('could not cut it to a minute · try again')
    } catch { say('could not reach Shutap · try again') } finally { setCutting(false) }
  }
  async function changeALine() {
    track('toast_change_line_tapped', { pro })
    if (!pro) { setCheckoutError(''); setSheet('change'); return }
    setCopying(true)
    try {
      const c = await copyMyToast({ data: { id: row.id } })
      if (c.ok) { saveNames(c.id, names); track('toast_copied', { paid: false, pro: true }); void navigate({ to: '/toasts/edit/$id', params: { id: c.id } }) }
      else if (c.reason === 'pay') setSheet('change')
      else say('could not make the copy · try again')
    } finally { setCopying(false) }
  }
  async function prepaySecret(): Promise<string> {
    const r = await createToastPrepayCheckout({ data: { environment: getStripeEnvironment(), parentId: row.id, returnUrl: `${window.location.origin}/toasts/edit/${row.id}?changed={CHECKOUT_SESSION_ID}` } })
    if ('error' in r && r.error) { setCheckoutError('checkout could not open · try again'); throw new Error(r.error) }
    return (r as { clientSecret: string }).clientSecret
  }
  async function unmarkSecret(): Promise<string> {
    const r = await createToastCheckout({ data: { toastId: row.id, environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/toasts/edit/${row.id}?session_id={CHECKOUT_SESSION_ID}` } })
    if ('error' in r && r.error) { setCheckoutError(r.error === 'already_paid' ? 'this toast is already clean' : 'checkout could not open · try again'); throw new Error(r.error) }
    return (r as { clientSecret: string }).clientSecret
  }

  const card = (n: string, title: string, meta: string, body: React.ReactNode, accent = false) => (
    <article className="rl-card" style={{ borderRadius: 18, ...(accent ? { border: '1.5px solid var(--rose)' } : {}) }}>
      <div className="rl-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}><h2 style={{ margin: 0, font: '700 17px var(--sora)', color: 'var(--wine)' }}>{n} · {title}</h2><span className="rl-note">{meta}</span></div>
      {body}
    </article>
  )

  return (
    <div className="rl">
      <div className="ts-wrap">
        <div className="rl-row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 8, height: 32, padding: '0 14px', borderRadius: 999, background: 'var(--ink)', color: '#fff', font: '700 13px var(--sora)' }}><LockIcon color="#fff" />locked · the words are final</span>
            <h1 style={{ margin: 0, font: '800 clamp(28px, 4vw, 38px)/1.1 var(--sora)', letterSpacing: '-0.03em', color: 'var(--wine)' }}>Your toast {toastTitle(row.occasion, names).replace(/^For /, 'for ')}</h1>
            <p style={{ margin: 0, fontSize: 15, color: 'var(--ink-2)' }}>{spec.label} · {TONE_LABEL[row.tone]} · {clock(toastSeconds(t.lines))} of {clock(row.length)}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <button type="button" className="rl-btn ghost" disabled={copying} onClick={() => void changeALine()}>{copying ? 'copying…' : `change a line → new toast${pro ? ', free on Pro' : `, ${usd(TOAST_ONCE.amount)}`}`}</button>
            <span className="rl-note">starts from this one · this one stays as it is</span>
          </div>
        </div>
        <NamesStrip row={row} names={names} onNames={onNames} />

        <div role="note" style={{ display: 'flex', gap: 14, alignItems: 'center', background: 'var(--wine)', color: '#fff', borderRadius: 16, padding: '14px 18px', flexWrap: 'wrap' }}>
          <span style={{ font: '600 15px/1.45 var(--sora)', flex: '1 1 320px' }}><b>This toast is yours to keep.</b> Come back any time: <b>profile → My creations → toasts</b>. Every download and copy, unlimited, forever, on any device you sign in on.</span>
          <Link to="/creations" search={{ show: 'toasts' } as never} style={{ height: 40, padding: '0 16px', borderRadius: 999, background: '#fff', color: 'var(--wine)', font: '700 14px/40px var(--sora)', textDecoration: 'none' }}>go to My creations</Link>
        </div>

        <div className="rl-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {card('1', 'the speech', 'PDF · Letter', (
            <>
              <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {t.lines.map((l, i) => <span key={i} style={{ font: '400 14px/1.4 var(--news)', color: 'var(--ink)' }}>{shown(l.text)}{l.pause && <b style={{ color: 'var(--rose)' }}> ‖</b>}{l.laugh && <b style={{ color: 'var(--rose)', fontSize: 12 }}> (wait)</b>}{l.glass && <b style={{ color: 'var(--rose)', fontSize: 12 }}> ↑</b>}</span>)}
              </div>
              <div className="rl-row"><button type="button" className="rl-btn" onClick={() => pdf(t.lines, 'the speech', 'speech')}>download PDF</button><button type="button" className="rl-btn ghost" onClick={() => void copy(speechText(t.lines, names, { marked }), 'speech')}>copy all</button></div>
              <p className="rl-note">With pause marks and the clock in the margin. Large type, so it reads from a podium.</p>
            </>
          ))}
          {card('2', 'cue cards', 'PDF · 4 cards a page', (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, padding: 8, border: '1px dashed rgba(90,30,50,.3)', borderRadius: 10 }}>
                {t.cards.slice(0, 4).map((c, i) => (
                  <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ font: '800 10px var(--sora)', color: 'var(--rose)' }}>{i + 1} · {shown(c.title)}</span>
                    <span style={{ font: '600 10.5px/1.35 var(--sora)', color: 'var(--ink-2)' }}>{c.keys.map(shown).join(' · ')}</span>
                    <span style={{ font: '700 11px/1.3 var(--news)', color: 'var(--ink)' }}>{shown(c.land)}</span>
                  </div>
                ))}
              </div>
              <div className="rl-row"><button type="button" className="rl-btn" disabled={!t.cards.length} onClick={() => { downloadBlob(cueCardsPdf({ occasion: row.occasion, cards: t.cards, names, marked, trueThing: t.lines.find((l) => l.source === 'true_thing')?.text }), pdfName(row.occasion, names, 'cue-cards')); track('toast_downloaded', { what: 'cue_cards', marked }) }}>download cue cards</button></div>
              <p className="rl-note">Print, cut on the dashed lines, hold in one hand. One beat a card: the cue words to glance at, the line to land in bold. Four to a Letter page, cut on the dashed lines.</p>
            </>
          ))}
          {card('3', 'the prompter', 'on your phone', (
            <>
              <div className="rl-row" style={{ alignItems: 'center', gap: 14, flexWrap: 'nowrap' }}>
                <canvas ref={qrRef} width={150} height={150} aria-label="QR code that opens the prompter on your phone" style={{ flex: '0 0 150px', borderRadius: 12, border: '1px solid var(--line)' }} />
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>Scan with your phone and sign in once with this account. The names ride in the link itself (after the #), so they never reach Shutap.</p>
              </div>
              <div className="rl-row">
                <button type="button" className="rl-btn" onClick={() => openPrompter()}>open prompter here</button>
                <button type="button" className="rl-btn ghost" onClick={() => void copy(phoneLink, 'prompter_link')}>copy phone link</button>
              </div>
              <p className="rl-note">Works offline once it's open: a reception hall's Wi-Fi is not a plan.{row.occasion === 'new_years' ? ' “Sync to midnight” tells you when to start.' : row.occasion === 'toastmasters' ? ' Timing lights: green 5:00, yellow 6:00, red 7:00.' : ''}</p>
            </>
          ), true)}
          {card('4', 'the 60-second version', cut ? clock(cut.seconds) : 'on demand', cut ? (
            <>
              <p style={{ margin: 0, font: '400 16px/1.5 var(--news)', color: 'var(--ink)' }}>{cut.lines.map((l) => shown(l.text)).join(' ')}</p>
              <div className="rl-row">
                <button type="button" className="rl-btn ghost" onClick={() => void copy(withMark(speechText(cut.lines, names), marked), 'cut60')}>copy</button>
                <button type="button" className="rl-btn ghost" onClick={() => pdf(cut.lines, 'the 60-second version', 'cut60')}>PDF</button>
                <button type="button" className="rl-btn ghost" onClick={() => openPrompter({ short: true })}>prompter: short</button>
                <button type="button" className="rl-mini" disabled={cutting} onClick={() => void makeCut(true)}>{cutting ? 'cutting…' : 'make it again'}</button>
              </div>
              <p className="rl-note">Your stories, the true thing and your must-says stay; Shutap's lines go first.</p>
            </>
          ) : (
            <>
              <p className="rl-note" style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>For when the DJ says keep it short. Made from this speech when you tap it; your stories, the true thing and your must-says stay.</p>
              <button type="button" className="rl-btn" disabled={cutting} onClick={() => void makeCut()}>{cutting ? 'cutting to a minute… 20s' : 'make a 60-second version'}</button>
            </>
          ))}
          {card('5', 'rehearse', 'timer · nothing recorded', (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--surface)', borderRadius: 14, padding: '14px 16px' }}>
                <span style={{ font: '800 30px var(--sora)', letterSpacing: '-0.02em', color: 'var(--wine)' }}>{runs[0] ? clock(runs[0].seconds) : '0:00'} <span style={{ font: '600 14px var(--sora)', color: 'var(--muted)' }}>/ {clock(row.length)}</span></span>
                <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>{runs[0] ? `Last run ${runs[0].seconds > runs[0].target + 5 ? `${runs[0].seconds - runs[0].target}s over` : 'on time'}${runs[0].long ? ` · “${runs[0].long}” ran long` : ''} · ${runs.length} run${runs.length === 1 ? '' : 's'} on this device.` : 'Read it out loud and tap through the lines. Each run shows your time against the target and the section that ran long. Runs stay on this device.'}</p>
              </div>
              <div className="rl-row"><button type="button" className="rl-btn" onClick={() => openPrompter({ rehearse: true })}>start a run</button></div>
              <p className="rl-note">Running long after locking? The 60-second version is here. The words can't change, the speed can.</p>
            </>
          ))}
          {card('6', spec.keepsake ? 'keepsake + the text after' : 'the text after', '', (
            <>
              {spec.keepsake && (
                <div className="rl-row" style={{ gap: 12, flexWrap: 'nowrap' }}>
                  <div aria-hidden="true" style={{ width: 62, height: 80, flex: '0 0 62px', border: '1px solid var(--line-2)', borderRadius: 4, background: '#fffdf9', padding: 7, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ font: 'italic 400 8px var(--news)', color: 'var(--wine)' }}>{toastTitle(row.occasion, names)}</span>{[0, 1, 2, 3].map((k) => <span key={k} style={{ height: 2, background: '#eee' }} />)}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ font: '600 13.5px var(--sora)' }}>A one-page copy to give them</span><button type="button" className="rl-btn sm" onClick={() => { downloadBlob(keepsakePdf({ occasion: row.occasion, lines: t.lines, names, marked }), pdfName(row.occasion, names, 'keepsake')); track('toast_downloaded', { what: 'keepsake', marked }) }}>download keepsake</button></div>
                </div>
              )}
              <span className="rl-lbl">the text to send tonight</span>
              <p style={{ margin: 0, font: '400 16px/1.45 var(--news)', color: 'var(--ink)' }}>{shown(t.text_after)}</p>
              <div className="rl-row"><button type="button" className="rl-btn ghost sm" onClick={() => void copy(withMark(shown(t.text_after), marked), 'text_after')}>copy</button></div>
            </>
          ))}
        </div>

        <p className="rl-note" style={{ textAlign: 'center', fontSize: 13 }}>
          {marked
            ? <>Your free toast: a shutap.com watermark across every PDF page, and “— shutap.com” at the end of every copy · <button type="button" className="rl-mini" onClick={() => { setCheckoutError(''); setSheet('unmark'); track('toast_unmark_opened', {}) }}>remove the mark, {usd(TOAST_ONCE.amount)}</button></>
            : 'Every page and copy of this toast is clean.'}
        </p>
      </div>

      {sheet && (
        <div className="rl-sheet-scrim" onClick={() => setSheet(null)}>
          <div className="rl-sheet ts-sheet" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
            {sheet === 'change' && (
              <>
                <p className="rl-lbl r" style={{ margin: 0 }}>change a line</p>
                <h3 style={{ margin: 0, font: '800 24px/1.15 var(--sora)', color: 'var(--wine)' }}>Change a line? That's a new toast.</h3>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: 'var(--ink-2)' }}>This toast is locked. Shutap makes an unlocked copy for you to edit, with the same stories and names. This one stays exactly as it is, with all its downloads.</p>
                <div className="rl-row" style={{ justifyContent: 'space-between', background: 'var(--surface)', borderRadius: 14, padding: '14px 16px' }}><b>new toast from this one</b><b style={{ font: '800 22px var(--sora)', color: 'var(--wine)' }}>{usd(TOAST_ONCE.amount)}</b></div>
                <p className="rl-note">Not a change: names, prompter speed and text size. Those stay free. Pro: free, no sheet at all.</p>
                <div className="rl-row" style={{ justifyContent: 'flex-end' }}>
                  <button type="button" className="rl-btn ghost" onClick={() => setSheet(null)}>keep this one</button>
                  <button type="button" className="rl-btn" onClick={() => { setSheet('change_pay'); track('toast_change_checkout_opened', {}) }}>pay {usd(TOAST_ONCE.amount)} &amp; edit the copy</button>
                </div>
              </>
            )}
            {sheet === 'change_pay' && (
              <>
                <h3 style={{ margin: 0, font: '800 20px var(--sora)', color: 'var(--wine)' }}>A new toast from this one · {usd(TOAST_ONCE.amount)}</h3>
                <p className="rl-note">Pay once and the copy opens, ready to edit, clean. No subscription. Tax may be added.</p>
                {checkoutError ? <p className="rl-note" role="alert" style={{ color: 'var(--rose-ink)' }}>{checkoutError}</p> : (
                  <div style={{ minHeight: 420 }}>
                    <EmbeddedCheckoutProvider key={`change-${row.id}`} stripe={getStripe()} options={{ fetchClientSecret: prepaySecret }}>
                      <EmbeddedCheckout />
                    </EmbeddedCheckoutProvider>
                  </div>
                )}
                <button type="button" className="rl-btn ghost" onClick={() => setSheet(null)}>keep this one</button>
              </>
            )}
            {sheet === 'unmark' && (
              <>
                <p className="rl-lbl r" style={{ margin: 0 }}>optional · your free toast</p>
                <h3 style={{ margin: 0, font: '800 24px/1.15 var(--sora)', color: 'var(--wine)' }}>Remove the mark · {usd(TOAST_ONCE.amount)}</h3>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: 'var(--ink-2)' }}>Your free toast has a shutap.com watermark across every PDF page and “— shutap.com” at the end of every copy. Remove it once and this toast is clean everywhere, forever. No subscription. Tax may be added.</p>
                {checkoutError ? <p className="rl-note" role="alert" style={{ color: 'var(--rose-ink)' }}>{checkoutError}</p> : (
                  <div style={{ minHeight: 420 }}>
                    <EmbeddedCheckoutProvider key={`unmark-${row.id}`} stripe={getStripe()} options={{ fetchClientSecret: unmarkSecret }}>
                      <EmbeddedCheckout />
                    </EmbeddedCheckoutProvider>
                  </div>
                )}
                <button type="button" className="rl-btn ghost" onClick={() => setSheet(null)}>keep the mark</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
