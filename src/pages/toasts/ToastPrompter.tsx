/* Shutap Toasts, on the day (Nov 6 2026): boards 5 and 6.
 *   the prompter  one line big, the next and last dimmed, the running clock,
 *                 slower / hold / faster, text size, "skip to the toast ↓".
 *   New Year's    "sync to midnight": it tells you when to start so the last
 *                 line lands at 12:00.
 *   Toastmasters  the club's timing lights: green 5:00, yellow 6:00, red 7:00.
 *   rehearse      tap through the lines out loud; your time against the
 *                 target and the section that ran long. Nothing is recorded;
 *                 runs stay on this device.
 * The names ride in the link after the # (never sent anywhere) or come from
 * this device. Once open it needs no connection. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client'
import { startOAuth, useOAuthPending, oauthButtonLabel } from '@/lib/oauth-signin'
import { setDurableReturn } from '@/lib/auth-guard'
import { getMyToast, type ToastRow } from '@/lib/toasts.functions'
import { OCCASION, clock, occasionName, fromPlaceholders, lineSeconds, toastSeconds, type Names, type ToastLine } from '@/lib/toasts/shared'
import { readNames, saveNames } from '@/lib/toasts/names-store'
import { lineTimes } from '@/lib/toasts/toast-text'
import { namesFromHash, saveRun, type RehearseRun } from '@/lib/toasts/on-the-day'
import { phCapture } from '@/lib/posthog'
import { trackEvent } from '@/lib/tracking'
import '@/pages/realtors/realtors.css'
import './toasts.css'

const track = (name: string, props: Record<string, unknown> = {}) => { void phCapture(name, { product: 'toasts', ...props }); void trackEvent(name, { product: 'toasts', ...props }) }

function nextMidnight(): number {
  const d = new Date()
  d.setHours(24, 0, 0, 0)
  return d.getTime()
}

export function ToastPrompter({ id, rehearse, short }: { id: string; rehearse: boolean; short: boolean }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [row, setRow] = useState<ToastRow | null>(null)
  const [err, setErr] = useState('')
  const [names, setNames] = useState<Names | null>(null)
  const opening = useOAuthPending()

  useEffect(() => {
    const h = namesFromHash(window.location.hash)
    if (h) saveNames(id, h)
    setNames(h ?? readNames(id))
    void supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session && data.session.user.is_anonymous !== true))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session && session.user.is_anonymous !== true) setSignedIn(true) })
    return () => sub.subscription.unsubscribe()
  }, [id])
  useEffect(() => {
    if (!signedIn) return
    getMyToast({ data: { id } }).then((r) => { if (r.ok) setRow(r.toast); else setErr(r.reason === 'off' ? 'Shutap Toasts opens later today.' : 'this toast belongs to another account · sign in here with the account you made it with') }).catch(() => setErr('could not open the toast · check the connection and try again'))
  }, [id, signedIn])

  async function signIn(method: 'google' | 'apple' | 'email') {
    const back = window.location.pathname + window.location.search + window.location.hash
    try { sessionStorage.setItem('shutap_returnTo', back) } catch { /* noop */ }
    setDurableReturn(back)
    track('toast_prompter_signin', { method })
    if (method === 'email') { window.location.assign('/welcome?method=email'); return }
    const e = await startOAuth(method)
    if (e) setErr(e)
  }

  if (signedIn === false) return (
    <div className="pr">
      <div className="pr-gate">
        <h1>Sign in to open your toast on this phone.</h1>
        <p>Use the same account you made the toast with. The prompter opens right after; once it's open it works without Wi-Fi.</p>
        <button className="main" disabled={!!opening} onClick={() => void signIn('google')}>{oauthButtonLabel('google', opening)}</button>
        <button disabled={!!opening} onClick={() => void signIn('apple')}>{oauthButtonLabel('apple', opening)}</button>
        <button onClick={() => void signIn('email')}>continue with email</button>
      </div>
    </div>
  )
  if (err) return <div className="pr"><div className="pr-top"><span>{err}</span><Link to="/toasts/edit/$id" params={{ id }}>your toast</Link></div></div>
  if (!row?.toast) return <div className="pr"><div className="pr-top"><span>opening…</span></div></div>
  if (!row.locked_at) return <div className="pr"><div className="pr-gate"><h1>Lock your toast to open the prompter.</h1><p>The prompter, cue cards and rehearse open when the words are final.</p><Link to="/toasts/edit/$id" params={{ id }} className="rl-btn">back to your toast</Link></div></div>
  if (!names) return <AskNames row={row} onDone={(n) => { saveNames(id, n); setNames(n) }} />
  const lines = short && row.cut60 ? row.cut60.lines : row.toast.lines
  return <Run row={row} lines={lines} names={names} rehearse={rehearse} short={short && !!row.cut60} />
}

function AskNames({ row, onDone }: { row: ToastRow; onDone: (n: Names) => void }) {
  const spec = OCCASION[row.occasion]
  const [v, setV] = useState<Names>({ friend: '', partner: '', me: '' })
  return (
    <div className="pr"><div className="pr-gate">
      <h1>Who's this toast for?</h1>
      <p>Asked once on this phone. Names stay on your devices, never with Shutap.</p>
      <input className="rl-input" style={{ maxWidth: 320 }} placeholder={spec.who} value={v.friend} onChange={(e) => setV({ ...v, friend: e.target.value })} />
      {spec.partner && <input className="rl-input" style={{ maxWidth: 320 }} placeholder="who they're marrying" value={v.partner ?? ''} onChange={(e) => setV({ ...v, partner: e.target.value })} />}
      <input className="rl-input" style={{ maxWidth: 320 }} placeholder="your first name" value={v.me} onChange={(e) => setV({ ...v, me: e.target.value })} />
      <button className="main" disabled={!v.friend.trim() || !v.me.trim()} onClick={() => onDone(v)}>open the prompter</button>
    </div></div>
  )
}

function Run({ row, lines, names, rehearse, short }: { row: ToastRow; lines: ToastLine[]; names: Names; rehearse: boolean; short: boolean }) {
  const spec = OCCASION[row.occasion]
  const target = short ? 60 : row.length
  const total = useMemo(() => toastSeconds(lines), [lines])
  const plan = useMemo(() => lineTimes(lines), [lines])
  const [idx, setIdx] = useState(0)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [size, setSize] = useState(1)
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState<RehearseRun | null>(null)
  const [midnight, setMidnight] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const startedAt = useRef<number | null>(null)
  const banked = useRef(0)
  const lineStarts = useRef<number[]>([])
  const timer = useRef<number | undefined>(undefined)
  const refs = useRef<(HTMLDivElement | null)[]>([])
  const toastAt = useMemo(() => {
    const tt = lines.findIndex((l) => l.source === 'true_thing')
    return tt >= 0 ? tt : Math.max(0, lines.length - 2)
  }, [lines])

  useEffect(() => { track('toast_prompter_opened', { occasion: row.occasion, rehearse, short }) }, [row.occasion, rehearse, short])

  // the clock: what's run so far, paused time not counted
  const nowElapsed = () => banked.current + (startedAt.current ? (Date.now() - startedAt.current) / 1000 : 0)
  useEffect(() => {
    const t = window.setInterval(() => { setElapsed(nowElapsed()); setNow(Date.now()) }, 250)
    return () => window.clearInterval(t)
  }, [])

  function start() {
    if (running) return
    startedAt.current = Date.now()
    if (!lineStarts.current.length) lineStarts.current[idx] = 0
    setRunning(true)
  }
  function hold() {
    if (!running) return
    banked.current = nowElapsed()
    startedAt.current = null
    setRunning(false)
  }
  function go(i: number) {
    const n = Math.max(0, Math.min(lines.length - 1, i))
    lineStarts.current[n] = nowElapsed()
    setIdx(n)
  }

  // keep the screen on while it runs
  useEffect(() => {
    let lock: { release?: () => void } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<{ release?: () => void }> } }
    if (running && nav.wakeLock) nav.wakeLock.request('screen').then((l) => { lock = l }).catch(() => {})
    return () => { lock?.release?.() }
  }, [running])

  useEffect(() => { refs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [idx, size])

  // the prompter moves on by itself at the speech's own pace; rehearse waits for a tap
  useEffect(() => {
    window.clearTimeout(timer.current)
    if (!running || rehearse) return
    const ms = Math.max(1200, (lineSeconds(lines[idx]!) / speed) * 1000)
    timer.current = window.setTimeout(() => { if (idx + 1 < lines.length) go(idx + 1); else hold() }, ms)
    return () => window.clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, idx, speed, rehearse])

  // New Year's: start on its own so the last line lands at midnight
  useEffect(() => {
    if (!midnight || running) return
    const startAt = midnight - (total / speed) * 1000
    if (now >= startAt) { setMidnight(null); start(); track('toast_midnight_started', {}) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, midnight])

  function finish() {
    hold()
    const secs = Math.round(nowElapsed())
    // the section that ran longest past its planned time
    const by: Record<string, { planned: number; actual: number }> = {}
    const starts = lineStarts.current
    lines.forEach((l, i) => {
      const s = l.section.split(' · ')[0]!
      const a = starts[i]
      const b = starts[i + 1] ?? secs
      if (a === undefined) return
      by[s] ??= { planned: 0, actual: 0 }
      by[s]!.planned += lineSeconds(l)
      by[s]!.actual += Math.max(0, b - a)
    })
    let long: string | null = null
    let worst = 3
    for (const [s, v] of Object.entries(by)) if (v.actual - v.planned > worst) { worst = v.actual - v.planned; long = s }
    const run: RehearseRun = { at: new Date().toISOString(), seconds: secs, target, long: long ? fromPlaceholders(long, names) : null }
    saveRun(row.id, run)
    setDone(run)
    track('toast_rehearse_finished', { occasion: row.occasion, seconds: secs, target, over: secs - target, long: !!long })
  }

  const light = row.occasion === 'toastmasters' && !short ? (elapsed >= 420 ? 'red' : elapsed >= 360 ? 'yellow' : elapsed >= 300 ? 'green' : null) : null
  const back = `/toasts/edit/${row.id}`

  if (done) return (
    <div className="pr"><div className="pr-gate">
      <h1>{clock(done.seconds)} <span style={{ color: '#9a8890', fontWeight: 500 }}>/ {clock(target)}</span></h1>
      <p>{done.seconds > target + 5 ? `${done.seconds - target} seconds over.` : done.seconds < target - 20 ? `${target - done.seconds} seconds under: slow down and wait for the laughs.` : 'Right on time.'}{done.long ? ` “${done.long}” ran long.` : ''}</p>
      <p style={{ fontSize: 12.5 }}>Nothing was recorded. Your runs stay on this phone.</p>
      <button className="main" onClick={() => { setDone(null); setIdx(0); setElapsed(0); banked.current = 0; startedAt.current = null; lineStarts.current = [] }}>run it again</button>
      <a href={back} style={{ color: '#fff' }}>back to your toast</a>
    </div></div>
  )

  return (
    <div className="pr" style={{ ['--tp-scale' as string]: size }}>
      <div className="pr-top">
        <a href={back}>done</a>
        <span>{rehearse ? 'rehearse' : short ? '60-second version' : occasionName(row.occasion, row.form)} · {fromPlaceholders(lines[idx]!.section, names)}</span>
        <b style={{ color: '#fff', fontSize: 17 }}>{clock(elapsed)} <span style={{ color: '#9a8890', fontWeight: 500 }}>/ {clock(target)}</span></b>
      </div>
      <div style={{ padding: '0 16px' }}><div style={{ height: 6, borderRadius: 999, background: '#2a2024', overflow: 'hidden' }}><div style={{ width: `${Math.min(100, (elapsed / Math.max(1, target)) * 100)}%`, height: '100%', background: elapsed > target ? '#ff6b6b' : '#e7548a' }} /></div></div>

      {light !== null || row.occasion === 'toastmasters' ? (
        <div className="tp-lights" aria-live="polite">
          <span role="img" aria-label={`green light ${light === 'green' ? 'on' : 'off'}`} className={light === 'green' ? 'on g' : 'g'} />
          <span role="img" aria-label={`yellow light ${light === 'yellow' ? 'on' : 'off'}`} className={light === 'yellow' ? 'on y' : 'y'} />
          <span role="img" aria-label={`red light ${light === 'red' ? 'on' : 'off'}`} className={light === 'red' ? 'on r' : 'r'} />
          <b>{light === 'green' ? 'green · in time' : light === 'yellow' ? 'yellow · wrap it up' : light === 'red' ? 'red · close now' : 'green at 5:00 · yellow 6:00 · red 7:00'}</b>
        </div>
      ) : null}

      {midnight && !running ? (
        <div className="pr-gate">
          <p>start talking in</p>
          <h1 style={{ fontSize: 84, letterSpacing: '-0.04em' }}>{clock(Math.max(0, (midnight - (total / speed) * 1000 - now) / 1000))}</h1>
          <p>at {new Date(midnight - (total / speed) * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })} · your last line lands at 12:00</p>
          <button onClick={() => { setMidnight(null); start() }}>start now</button>
          <button onClick={() => setMidnight(null)}>cancel</button>
        </div>
      ) : (
        <div className="pr-scroll tp-scroll" onClick={() => (rehearse ? (running ? (idx + 1 < lines.length ? go(idx + 1) : finish()) : start()) : running ? hold() : start())}>
          {lines.map((l, i) => (
            <div key={i} className={`pr-seg${i === idx ? ' on' : ''}`} ref={(el) => { refs.current[i] = el }} onClick={(e) => { e.stopPropagation(); go(i) }}>
              <div className="cue">{fromPlaceholders(l.section, names)}<small>{clock(plan[i]!)}</small></div>
              <p className="line">{fromPlaceholders(l.text, names)}</p>
              {(l.pause || l.laugh || l.glass || l.note) && (
                <div className="tp-marks">
                  {l.pause && <span className="fill">‖ pause</span>}
                  {l.laugh && <span>wait for the laugh</span>}
                  {l.glass && <span className="fill">↑ glasses up</span>}
                  {l.note && <span>{fromPlaceholders(l.note, names)}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="pr-bar">
        {rehearse ? (
          <div className="row">
            <button className={running ? '' : 'on'} onClick={() => (running ? hold() : start())}>{running ? '❚❚ hold' : idx === 0 && elapsed === 0 ? 'start the clock' : 'go on'}</button>
            <button className="on" disabled={!running} onClick={() => (idx + 1 < lines.length ? go(idx + 1) : finish())}>{idx + 1 < lines.length ? 'next line →' : 'finish'}</button>
            <button onClick={() => finish()} disabled={elapsed === 0}>stop</button>
          </div>
        ) : (
          <>
            <div className="row">
              <button aria-label="slower" onClick={() => setSpeed((s) => Math.max(0.6, +(s - 0.1).toFixed(1)))}>− slower</button>
              <button className={running ? '' : 'on'} aria-label={running ? 'hold' : 'start'} onClick={() => (running ? hold() : start())}>{running ? '❚❚ hold' : elapsed ? 'go on' : 'start'}</button>
              <button aria-label="faster" onClick={() => setSpeed((s) => Math.min(1.6, +(s + 0.1).toFixed(1)))}>faster +</button>
              <button aria-label="smaller text" onClick={() => setSize((v) => Math.max(0.7, +(v - 0.1).toFixed(1)))}>A−</button>
              <button aria-label="bigger text" onClick={() => setSize((v) => Math.min(1.5, +(v + 0.1).toFixed(1)))}>A+</button>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="on tp-skip" onClick={() => { go(toastAt); track('toast_prompter_skip', {}) }}>skip to the toast ↓</button>
              {row.occasion === 'new_years' && !running && <button onClick={() => { setMidnight(nextMidnight()); track('toast_midnight_synced', {}) }}>sync to midnight</button>}
            </div>
          </>
        )}
        <span>{rehearse ? 'say it out loud, tap for the next line · nothing is recorded' : `${speed.toFixed(1)}× pace · tap the text to hold · tap a line to jump · choked up or told to wrap it? skip to the toast`}</span>
      </div>
    </div>
  )
}
