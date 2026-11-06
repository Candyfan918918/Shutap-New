/* Shoot mode (Nov 6 2026): the walkthrough or the voiceover as a teleprompter
 * on the phone's browser. Big text, one segment lit at a time, scrolls by
 * itself at a words-per-second pace; tap to pause; − / + for speed; mirror
 * for a glass rig; "cues" hides the grey directions. The screen is kept
 * awake. No camera, no microphone: record with a second device. */
import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { getRealtorKit, type KitView } from '@/lib/realtors.functions'
import { kitTitle } from '@/lib/realtors/kit-text'
import { phCapture } from '@/lib/posthog'
import QRCode from 'qrcode'
import { supabase } from '@/integrations/supabase/client'
import { startOAuth, useOAuthPending, oauthButtonLabel } from '@/lib/oauth-signin'
import { setDurableReturn } from '@/lib/auth-guard'

type Seg = { cue: string; sub?: string; act?: string; line: string }

function segments(k: KitView, which: 'walkthrough' | 'voiceover'): Seg[] {
  const v = k.versions[k.versions.length - 1]!.content
  if (which === 'voiceover') return v.voiceover.map((x, i) => ({ cue: x.label || `part ${i + 1}`, line: x.text }))
  return v.walkthrough.shots.map((s, i) => ({ cue: `${i + 1} · ${s.where}`, sub: `${s.seconds}s`, act: s.action, line: s.line }))
}

export function Prompter({ kitId }: { kitId: string }) {
  const [kit, setKit] = useState<KitView | null>(null)
  const [which, setWhich] = useState<'walkthrough' | 'voiceover'>('walkthrough')
  const [idx, setIdx] = useState(0)
  const [running, setRunning] = useState(false)
  const [wps, setWps] = useState(2.4)
  const [mirror, setMirror] = useState(false)
  const [cues, setCues] = useState(true)
  const [err, setErr] = useState('')
  /** Nov 6 2026: "another phone" — the QR and the steps for a second device */
  const [second, setSecond] = useState(false)
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (!second || !qrRef.current) return
    QRCode.toCanvas(qrRef.current, window.location.origin + window.location.pathname, { width: 200, margin: 1, color: { dark: '#1a1418', light: '#ffffff' } }).catch(() => {})
  }, [second])
  const timer = useRef<number | undefined>(undefined)
  const segRefs = useRef<(HTMLDivElement | null)[]>([])

  /** Nov 6 2026: the phone that scanned the QR is usually signed out. Ask it
   *  to sign in (same account), then come straight back here, ready. */
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const opening = useOAuthPending()
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session && data.session.user.is_anonymous !== true))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session && session.user.is_anonymous !== true) setSignedIn(true) })
    return () => sub.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!signedIn) return
    getRealtorKit({ data: { kit_id: kitId } }).then((r) => { if (r.kit) setKit(r.kit); else setErr('this kit belongs to another account · sign in here with the account you made it with') }).catch(() => setErr('could not open the kit · try again'))
    void phCapture('kit_shoot_opened', { product: 'realtors' })
  }, [kitId, signedIn])
  function comeBackHere() {
    const back = window.location.pathname
    try { sessionStorage.setItem('shutap_returnTo', back) } catch { /* noop */ }
    setDurableReturn(back)
  }
  async function signIn(method: 'google' | 'apple' | 'email') {
    comeBackHere()
    void phCapture('kit_shoot_signin', { product: 'realtors', method })
    if (method === 'email') { window.location.assign('/welcome?method=email'); return }
    const e = await startOAuth(method)
    if (e) setErr(e)
  }

  // keep the screen on while it runs
  useEffect(() => {
    let lock: any = null
    if (running && 'wakeLock' in navigator) (navigator as any).wakeLock.request('screen').then((l: any) => { lock = l }).catch(() => {})
    return () => { lock?.release?.() }
  }, [running])

  const segs = kit ? segments(kit, which) : []

  useEffect(() => { segRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [idx, which])

  useEffect(() => {
    window.clearTimeout(timer.current)
    if (!running || !segs.length) return
    const words = segs[idx]!.line.split(/\s+/).filter(Boolean).length
    const ms = Math.max(1500, (words / wps) * 1000 + 600)
    timer.current = window.setTimeout(() => {
      if (idx + 1 >= segs.length) setRunning(false)
      else setIdx(idx + 1)
    }, ms)
    return () => window.clearTimeout(timer.current)
  }, [running, idx, wps, segs])

  if (signedIn === false) return (
    <div className="pr">
      <div className="pr-gate">
        <h1>Sign in to open your kit on this phone.</h1>
        <p>Use the same account you made the kit with. The teleprompter opens right after, ready to roll.</p>
        <button className="main" disabled={!!opening} onClick={() => void signIn('google')}>{oauthButtonLabel('google', opening)}</button>
        <button disabled={!!opening} onClick={() => void signIn('apple')}>{oauthButtonLabel('apple', opening)}</button>
        <button onClick={() => void signIn('email')}>continue with email</button>
      </div>
    </div>
  )
  if (err) return <div className="pr"><div className="pr-top"><span>{err}</span><Link to="/realtors/kit">the kit page</Link></div></div>
  if (!kit) return <div className="pr"><div className="pr-top"><span>opening…</span></div></div>

  return (
    <div className={`pr${mirror ? ' mirror' : ''}${cues ? '' : ' nocue'}`}>
      <div className="pr-top">
        <span>{which} · {kitTitle(kit.listing)} · {idx + 1} of {segs.length}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => { setWhich((w) => (w === 'walkthrough' ? 'voiceover' : 'walkthrough')); setIdx(0); setRunning(false) }}>{which === 'walkthrough' ? 'voiceover' : 'walkthrough'}</button>
          <button onClick={() => { setRunning(false); setSecond(true); void phCapture('kit_shoot_second_phone', { product: 'realtors' }) }}>other phone</button>
          <Link to="/realtors/kit" search={{ kit: kit.id } as never}>close</Link>
        </div>
      </div>
      <div className="pr-scroll" onClick={() => setRunning((r) => !r)}>
        {segs.map((s, i) => (
          <div key={i} className={`pr-seg${i === idx ? ' on' : ''}`} ref={(el) => { segRefs.current[i] = el }} onClick={(e) => { e.stopPropagation(); setIdx(i) }}>
            <div className="cue">{s.cue}{s.sub && <small>{s.sub}</small>}</div>
            {s.act && <p className="act">{s.act}</p>}
            <p className="line">{s.line}</p>
          </div>
        ))}
      </div>
      <div className="pr-bar">
        <div className="row">
        <button onClick={() => setWps((w) => Math.max(1, +(w - 0.3).toFixed(1)))}>−</button>
        <button className={running ? 'on' : ''} onClick={() => setRunning((r) => !r)}>{running ? 'pause' : idx === 0 ? 'start' : 'go'}</button>
        <button onClick={() => setWps((w) => Math.min(5, +(w + 0.3).toFixed(1)))}>+</button>
        <button className={mirror ? 'on' : ''} onClick={() => setMirror((m) => !m)}>mirror</button>
        <button onClick={() => { setIdx(0); setRunning(false) }}>restart</button>
        <button className={cues ? 'on' : ''} onClick={() => setCues((c) => !c)}>cues</button>
        </div>
        <span>{wps.toFixed(1)} words a second · the cue is for you, say only the line · tap a line to jump · record with a second device</span>
      </div>
      {second && (
        <div className="pr-second" role="dialog" aria-modal="true" aria-label="Read on another phone" onClick={() => setSecond(false)}>
          <div className="pr-second-card" onClick={(e) => e.stopPropagation()}>
            <b>Read on another phone</b>
            <canvas ref={qrRef} width={200} height={200} aria-label="QR code to this teleprompter" />
            <ol>
              <li>Scan this with the phone you'll read from, or send it the link.</li>
              <li>Sign in on that phone with the same account you use here: Google, Apple or email.</li>
              <li>The teleprompter opens with this kit, ready to roll.</li>
            </ol>
            <p>Record with this phone or a laptop. Shoot mode never opens a camera.</p>
            <div className="row">
              <button onClick={async () => { try { await navigator.clipboard.writeText(window.location.origin + window.location.pathname); setCopied(true) } catch { setCopied(false) } }}>{copied ? 'link copied' : 'copy link'}</button>
              <button className="on" onClick={() => setSecond(false)}>done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
