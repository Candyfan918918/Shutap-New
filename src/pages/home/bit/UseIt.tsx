/* "Use it: 4 ways" (Nov 20 2026, Candy): the right-hand panel of the bit
 * result. All four outputs are always in view as picture cards (video,
 * teleprompter, script, shot list); one is open below, drawn the way it is
 * used and never clipped, beside one instruction and one main button.
 * "Next" walks a new person through all four.
 *
 * Written for someone who is not a professional creator (a shop owner):
 * teleprompter, script and shot list, not stand-up, sketch and skit. The
 * script and the shot list are laid out the first time their card is
 * opened (once per version, kept on the server). */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useServerFn } from '@tanstack/react-start'
import QRCode from 'qrcode'
import { getSketch, getSkit } from '@/lib/bits.functions'
import type { BitTier, BitVersion, SketchElement, SkitBeat } from '@/lib/bits/shared'
import { anonSessionId, jokeTap, jokeTrack } from '../joke/jokeClient'
import { pdfFilename, sketchPdf } from './sketch-pdf'
import { Progress } from './Progress'

export type UseTab = 'video' | 'prompter' | 'script' | 'shots'
const TABS: { id: UseTab; name: string; use: string }[] = [
  { id: 'video', name: 'Video', use: 'to post' },
  { id: 'prompter', name: 'Teleprompter', use: 'to shoot' },
  { id: 'script', name: 'Script', use: 'to practice' },
  { id: 'shots', name: 'Shot list', use: 'to shoot' },
]
const nextOf = (t: UseTab): UseTab => TABS[(TABS.findIndex((x) => x.id === t) + 1) % TABS.length]!.id
const nameOf = (t: UseTab) => TABS.find((x) => x.id === t)!.name

type Load<T> = { state: 'idle' } | { state: 'loading' } | { state: 'ok'; data: T } | { state: 'error'; message: string }
const FAIL: Record<string, string> = {
  rate_limited: 'Too many from this network. Try again in a bit.',
  sign_in: 'Sign in to open this.',
  not_found: "Couldn't find that version.",
  failed: "Couldn't lay that one out. Try again.",
}

/** The words of a version, so a line saved in place (same id) reloads its layouts. */
const rev = (v: BitVersion) => [v.hook, v.setup, ...v.tags, v.button].join('\n')

function useLayout<T>(fn: (a: { data: { bit_id: string; version_id: string; anon_session_id: string } }) => Promise<any>, on: boolean, bitId: string, version: BitVersion, nonce: number): Load<T> {
  const [load, setLoad] = useState<Load<T>>({ state: 'idle' })
  const fnRef = useRef(fn)
  fnRef.current = fn
  const words = rev(version)
  // a changed line: what was laid out no longer matches
  useEffect(() => { setLoad({ state: 'idle' }) }, [bitId, version.id, words])
  useEffect(() => {
    if (!on) return
    let live = true
    setLoad((l) => (l.state === 'ok' ? l : { state: 'loading' }))
    fnRef.current({ data: { bit_id: bitId, version_id: version.id, anon_session_id: anonSessionId() } })
      .then((r: { ok: boolean; data?: T; reason?: string }) => {
        if (!live) return
        if (r.ok) setLoad({ state: 'ok', data: r.data as T })
        else setLoad({ state: 'error', message: FAIL[r.reason ?? 'failed'] ?? FAIL.failed! })
      })
      .catch(() => live && setLoad({ state: 'error', message: FAIL.failed! }))
    return () => { live = false }
  }, [on, bitId, version.id, words, nonce])
  return load
}

async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}

function Thumb({ id }: { id: UseTab }) {
  if (id === 'video')
    return (
      <span className="bt-thumb" style={{ background: '#fdf3f6' }} aria-hidden>
        <i style={{ top: 6, height: 7, background: '#fff' }} />
        <svg width="18" height="18" viewBox="0 0 44 44" style={{ position: 'absolute', left: 6, top: 20 }}><circle cx="22" cy="22" r="21" fill="#fff" /><path d="M18 14l12 8-12 8z" fill="#8e1c4c" /></svg>
      </span>
    )
  if (id === 'prompter')
    return (
      <span className="bt-thumb" style={{ background: '#121014' }} aria-hidden>
        <i style={{ top: 12, background: '#5d5157' }} /><i style={{ top: 22, height: 4, background: '#fff' }} /><i style={{ top: 33, background: '#cfc5ca' }} /><i style={{ top: 41, right: 12, background: '#cfc5ca' }} />
      </span>
    )
  if (id === 'script')
    return (
      <span className="bt-thumb page" aria-hidden>
        <i style={{ top: 7, right: 14, background: '#3a3236' }} /><i style={{ top: 15, left: 13, right: 9 }} /><i style={{ top: 22, left: 9 }} /><i style={{ top: 30, left: 13, right: 9 }} /><i style={{ top: 37, left: 9 }} />
      </span>
    )
  return (
    <span className="bt-thumb" style={{ background: '#fbf6f8' }} aria-hidden>
      <i style={{ top: 8, right: 16, background: '#b8456b' }} /><i style={{ top: 14 }} /><i style={{ top: 24, right: 16, background: '#b8456b' }} /><i style={{ top: 30 }} /><i style={{ top: 40, right: 16, background: '#b8456b' }} /><i style={{ top: 46 }} />
    </span>
  )
}

export function UseIt({
  bitId,
  version,
  tier,
  say,
  video,
  watermark,
  initial,
  onStandup,
  onSignIn,
}: {
  bitId: string
  version: BitVersion
  tier: BitTier
  say: (m: string) => void
  /** the Video panel (VideoCard, plain) */
  video: ReactNode
  /** free files carry the shutap.com mark */
  watermark: boolean
  /** the card to open first (a link from another device) */
  initial?: UseTab
  /** run the teleprompter here, full screen */
  onStandup: () => void
  /** guests: each of these takes a free account */
  onSignIn?: (from: 'standup' | 'sketch' | 'skit') => void
}) {
  const [tab, setTab] = useState<UseTab>(initial ?? 'video')
  useEffect(() => { if (initial) setTab(initial) }, [initial])
  const [qr, setQr] = useState<null | 'prompter' | 'shots'>(null)
  const [nonce, setNonce] = useState(0)
  const guest = !!onSignIn
  const sketchFn = useServerFn(getSketch)
  const skitFn = useServerFn(getSkit)
  const sketch = useLayout<SketchElement[]>(sketchFn, tab === 'script' && !guest, bitId, version, nonce)
  const skit = useLayout<SkitBeat[]>(skitFn, tab === 'shots' && !guest, bitId, version, nonce)
  const lines = [version.hook, version.setup, ...version.tags, version.button].filter(Boolean)

  function open(t: UseTab, how: 'card' | 'next') {
    setTab(t)
    jokeTap('use_tab_opened', tier, { tab: t, how, kind: version.kind })
    // the same funnel steps the old tiles logged
    if (t === 'script') jokeTrack('sketch_opened', tier, { kind: version.kind })
    if (t === 'shots') jokeTrack('skit_opened', tier, { kind: version.kind })
  }

  function sendTo(what: 'prompter' | 'shots') {
    jokeTap('use_send_device', tier, { what, state: guest ? 'guest' : 'ok' })
    if (guest) return onSignIn!(what === 'prompter' ? 'standup' : 'skit')
    setQr(what)
  }

  async function copyScript(els: SketchElement[]) {
    const text = els
      .map((e) => {
        const t = e.type === 'scene_heading' || e.type === 'character' || e.type === 'transition' ? e.text.toUpperCase() : e.text
        const pad = e.type === 'character' ? '                    ' : e.type === 'dialogue' ? '          ' : e.type === 'parenthetical' ? '               ' : ''
        return pad + t
      })
      .join('\n')
    const ok = await copyText(text)
    jokeTap('use_copied', tier, { what: 'script', ok })
    say(ok ? 'Script copied.' : "Couldn't copy. Select the text instead.")
  }

  function printScript(els: SketchElement[]) {
    jokeTap('use_pdf_saved', tier, { what: 'script', watermarked: watermark })
    const blob = sketchPdf(els, version.hook, { watermark })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = pdfFilename(version.hook)
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  async function copyShots(beats: SkitBeat[]) {
    const text = beats.map((b, i) => `${i + 1}. ${b.shot.toUpperCase()} · ${b.speaker}\n${b.line}${b.on_screen ? `\nwords on screen: ${b.on_screen}` : ''}`).join('\n\n')
    const ok = await copyText(text)
    jokeTap('use_copied', tier, { what: 'shots', ok })
    say(ok ? 'Shot list copied.' : "Couldn't copy. Select the text instead.")
  }

  const next = nextOf(tab)
  const nextLink = (
    <button type="button" className="bt-next" onClick={() => open(next, 'next')}>
      {next === 'video' ? 'Back to: Video' : `Next: ${nameOf(next)}`} →
    </button>
  )
  const waiting = (load: Load<unknown>, what: string, steps: string[]) =>
    load.state === 'error' ? (
      <div className="bt-use-wait">
        <p role="alert" style={{ margin: 0 }}>{load.message}</p>
        <button className="bt-btn ghost sm" onClick={() => setNonce((n) => n + 1)}>try again</button>
      </div>
    ) : (
      <div className="bt-use-wait">
        <span className="bt-lbl r">laying out your {what}</span>
        <Progress steps={steps} expectSec={10} note="about 10 seconds, once per version" />
      </div>
    )
  const signIn = (from: 'sketch' | 'skit', what: string) => (
    <div className="bt-use-wait">
      <p style={{ margin: 0 }}>Your {what} is laid out from these lines the moment you sign in. Free.</p>
      <button className="bt-btn sm" onClick={() => onSignIn!(from)}>Sign in free</button>
    </div>
  )

  return (
    <section className="bt-card bt-use" aria-label="Use it: 4 ways">
      <div className="bt-panel-h"><b>2 · Use it: 4 ways</b><span>tap one to open it</span></div>
      <div className="bt-use-tabs" role="tablist" aria-label="The four ways to use your bit">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`bt-use-tab${tab === t.id ? ' on' : ''}`} onClick={() => open(t.id, 'card')}>
            <Thumb id={t.id} />
            <span><b>{t.name}</b><small>{t.use}</small></span>
          </button>
        ))}
      </div>

      {/* the video stays mounted so it keeps playing position and a download in progress */}
      <div style={{ display: tab === 'video' ? 'contents' : 'none' }}>
        <div className="bt-use-wrap">{video}<div className="bt-use-next">{nextLink}</div></div>
      </div>

      {tab === 'prompter' && (
        <div className="bt-use-wrap">
          <div className="bt-use-body" data-ph-private>
            <div className="bt-phone bt-tele" aria-label="Your bit on the teleprompter">
              <div>
                {lines.map((l, i) => <p key={i} className={i === 0 ? 'lit' : undefined}>{l}</p>)}
              </div>
            </div>
            <div className="bt-use-side">
              <b className="bt-use-h">Read your lines while you film.</b>
              <p className="bt-use-p"><b>Best with two devices:</b> film with your phone and show the teleprompter on a second phone, tablet or laptop, right under the camera lens. Press record, then tap start.</p>
              <button className="bt-btn block" onClick={() => sendTo('prompter')}>Send to my other device</button>
              <button className="bt-btn ghost block" onClick={onStandup}>Start here</button>
              <span className="bt-note">Only one device? Start here and record with your laptop camera.</span>
            </div>
          </div>
          <div className="bt-use-next">{nextLink}</div>
        </div>
      )}

      {tab === 'script' && (
        <div className="bt-use-wrap">
          <div className="bt-use-body" data-ph-private>
            <div className="bt-desk">
              {guest ? signIn('sketch', 'script') : sketch.state === 'ok' ? (
                <div className="bt-paper" role="document" aria-label="Your script, one page">
                  {sketch.data.map((e, i) => (
                    <p key={i} className={`sp-${e.type}`}>{e.type === 'parenthetical' && !e.text.startsWith('(') ? `(${e.text})` : e.text}</p>
                  ))}
                </div>
              ) : waiting(sketch, 'script', ['reading your bit', 'setting the scene', 'placing each line'])}
            </div>
            <div className="bt-use-side">
              <b className="bt-use-h">Read it through once before you film.</b>
              <p className="bt-use-p">Print it or send it to whoever is in the video, and read it out loud together. No need to memorize it: the teleprompter has your lines.</p>
              <button className="bt-btn block" disabled={sketch.state !== 'ok'} onClick={() => sketch.state === 'ok' && printScript(sketch.data)}>Save PDF to print</button>
              <button className="bt-btn ghost block" disabled={sketch.state !== 'ok'} onClick={() => sketch.state === 'ok' && void copyScript(sketch.data)}>Copy text</button>
              {watermark && !guest && <span className="bt-note">Free: the PDF carries the shutap.com mark.</span>}
            </div>
          </div>
          <div className="bt-use-next">{nextLink}</div>
        </div>
      )}

      {tab === 'shots' && (
        <div className="bt-use-wrap">
          <div className="bt-use-body" data-ph-private>
            <div className="bt-phone bt-shots">
              {guest ? signIn('skit', 'shot list') : skit.state === 'ok' ? (
                <ol aria-label="Your shot list">
                  {skit.data.map((b, i) => (
                    <li key={i}>
                      <b>{i + 1} · {b.shot} · {b.speaker}</b>
                      <span>{b.line}</span>
                      {b.on_screen && <em>words on screen: {b.on_screen}</em>}
                    </li>
                  ))}
                </ol>
              ) : waiting(skit, 'shot list', ['reading your bit', 'planning the shots', 'placing the words on screen'])}
            </div>
            <div className="bt-use-side">
              <b className="bt-use-h">{skit.state === 'ok' ? `Film it as ${skit.data.length} short clips.` : 'Film it as short clips.'}</b>
              <p className="bt-use-p">Film each shot in order, a few seconds each. Playing both people? Swap a hat or apron. Then join the clips in TikTok or CapCut and post.</p>
              <button className="bt-btn block" onClick={() => sendTo('shots')}>Open on another device</button>
              <button className="bt-btn ghost block" disabled={skit.state !== 'ok'} onClick={() => skit.state === 'ok' && void copyShots(skit.data)}>Copy text</button>
            </div>
          </div>
          <div className="bt-use-next">{nextLink}</div>
        </div>
      )}

      {qr && <SendSheet what={qr} url={`${window.location.origin}/bits?bit=${bitId}&v=${version.id}&open=${qr}`} onClose={() => setQr(null)} />}
    </section>
  )
}

/** The QR for a second device, with the steps (the other device is usually signed out). */
function SendSheet({ what, url, onClose }: { what: 'prompter' | 'shots'; url: string; onClose: () => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (!ref.current) return
    QRCode.toCanvas(ref.current, url, { width: 200, margin: 1, color: { dark: '#1a1418', light: '#ffffff' } }).catch(() => {})
  }, [url])
  const name = what === 'prompter' ? 'teleprompter' : 'shot list'
  return (
    <div className="bt-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bt-sheet" role="dialog" aria-modal="true" aria-labelledby="bt-send-title">
        <h3 id="bt-send-title">Open the {name} on another device</h3>
        <canvas ref={ref} width={200} height={200} aria-label={`QR code to your ${name}`} style={{ alignSelf: 'center', borderRadius: 12 }} />
        <ol className="bt-send-steps">
          <li>Point the other device's camera at this code and open the link.</li>
          <li>Sign in there with the same account. Your bit opens by itself.</li>
          {what === 'prompter' ? <li>Prop it right under the lens of the phone that films, press record, then tap start.</li> : <li>Keep it next to you and film the shots in order.</li>}
        </ol>
        <button className="bt-btn block" onClick={onClose}>Done</button>
      </div>
    </div>
  )
}
