/* The bit laid out for filming: a scene (shot list for a POV or skit) and a
 * screenplay page (Courier, standard format, copy and PDF). Both are written
 * on first open for the version on screen and cached on the server. */
import { useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { getScene, getScreenplay } from '@/lib/bits.functions'
import type { BitVersion, SceneBeat, ScreenplayElement } from '@/lib/bits/shared'
import { anonSessionId } from '../joke/jokeClient'
import { pdfFilename, screenplayPdf } from './screenplay-pdf'

type Load<T> = { state: 'loading' } | { state: 'ok'; data: T } | { state: 'error'; message: string }

const FAIL: Record<string, string> = {
  rate_limited: 'Too many from this network. Try again in a bit.',
  sign_in: 'Sign in to open this.',
  not_found: "Couldn't find that version.",
  failed: "Couldn't lay that one out. Try again.",
}

function useLayout<T>(fn: (a: { data: { bit_id: string; version_id: string; anon_session_id: string } }) => Promise<any>, bitId: string, versionId: string, nonce: number): Load<T> {
  const [load, setLoad] = useState<Load<T>>({ state: 'loading' })
  const fnRef = useRef(fn)
  fnRef.current = fn
  useEffect(() => {
    let live = true
    setLoad({ state: 'loading' })
    fnRef.current({ data: { bit_id: bitId, version_id: versionId, anon_session_id: anonSessionId() } })
      .then((r: { ok: boolean; data?: T; reason?: string }) => {
        if (!live) return
        if (r.ok) setLoad({ state: 'ok', data: r.data as T })
        else setLoad({ state: 'error', message: FAIL[r.reason ?? 'failed'] ?? FAIL.failed! })
      })
      .catch(() => live && setLoad({ state: 'error', message: FAIL.failed! }))
    return () => {
      live = false
    }
  }, [bitId, versionId, nonce])
  return load
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function Top({ title, meta, onBack }: { title: string; meta: string; onBack: () => void }) {
  return (
    <>
      <div className="bt-between">
        <button className="bt-btn ghost sm" onClick={onBack}>
          ← the bit
        </button>
        <span className="bt-lbl">{meta}</span>
      </div>
      <h1 className="bt-h2" style={{ fontSize: 28 }}>
        {title}
      </h1>
    </>
  )
}

function Waiting({ load, what, retry }: { load: Load<unknown>; what: string; retry: () => void }) {
  if (load.state === 'loading')
    return (
      <div className="bt-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="bt-lbl r">laying out the {what}</span>
        <div className="bt-bar" aria-hidden="true">
          <i className="on" />
          <i />
          <i />
        </div>
        <span className="bt-note">a few seconds, once per version</span>
      </div>
    )
  if (load.state === 'error')
    return (
      <div className="bt-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p role="alert" style={{ margin: 0 }}>{load.message}</p>
        <button className="bt-btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={retry}>
          try again
        </button>
      </div>
    )
  return null
}

export function SceneView({
  bitId,
  version,
  onBack,
  onPrompter,
  say,
}: {
  bitId: string
  version: BitVersion
  onBack: () => void
  onPrompter: () => void
  say: (m: string) => void
}) {
  const scene = useServerFn(getScene)
  const [nonce, setNonce] = useState(0)
  const load = useLayout<SceneBeat[]>(scene, bitId, version.id, nonce)

  async function copy(beats: SceneBeat[]) {
    const text = beats
      .map((b, i) => `${i + 1}. ${b.shot.toUpperCase()} · ${b.speaker}\n${b.line}${b.on_screen ? `\non screen: ${b.on_screen}` : ''}`)
      .join('\n\n')
    say((await copyText(text)) ? 'Scene copied.' : "Couldn't copy. Select the text instead.")
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Top title="Scene" meta={`scene · pov · ~${version.est_seconds}s`} onBack={onBack} />
      <Waiting load={load} what="scene" retry={() => setNonce((n) => n + 1)} />
      {load.state === 'ok' && (
        <>
          <ol className="bt-card bt-beats" aria-label="Shot list">
            {load.data.map((b, i) => (
              <li key={i} className="bt-beat">
                <span className="n" aria-hidden="true">{i + 1}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span className="shot">
                    {b.shot} · {b.speaker}
                  </span>
                  <span className="line">{b.line}</span>
                  {b.on_screen && (
                    <span>
                      <span className="ost">on screen: {b.on_screen}</span>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <div className="bt-row">
            <button className="bt-btn" onClick={() => void copy(load.data)}>
              copy scene
            </button>
            <button className="bt-btn ghost" onClick={onPrompter}>
              teleprompter
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function ScreenplayView({
  bitId,
  version,
  onBack,
  say,
  watermark,
}: {
  bitId: string
  version: BitVersion
  onBack: () => void
  say: (m: string) => void
  watermark: boolean
}) {
  const screenplay = useServerFn(getScreenplay)
  const [nonce, setNonce] = useState(0)
  const load = useLayout<ScreenplayElement[]>(screenplay, bitId, version.id, nonce)

  async function copy(els: ScreenplayElement[]) {
    const text = els
      .map((e) => {
        const t = e.type === 'scene_heading' || e.type === 'character' || e.type === 'transition' ? e.text.toUpperCase() : e.text
        const pad = e.type === 'character' ? '                    ' : e.type === 'dialogue' ? '          ' : e.type === 'parenthetical' ? '               ' : ''
        return pad + t
      })
      .join('\n')
    say((await copyText(text)) ? 'Screenplay copied.' : "Couldn't copy. Select the text instead.")
  }

  function download(els: ScreenplayElement[]) {
    const blob = screenplayPdf(els, version.hook, { watermark })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = pdfFilename(version.hook)
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Top title="Screenplay page" meta="screenplay page" onBack={onBack} />
      <Waiting load={load} what="screenplay page" retry={() => setNonce((n) => n + 1)} />
      {load.state === 'ok' && (
        <>
          <div className="bt-page" role="document" aria-label="Screenplay page">
            {load.data.map((e, i) => (
              <p key={i} className={`sp-${e.type}`}>
                {e.type === 'parenthetical' && !e.text.startsWith('(') ? `(${e.text})` : e.text}
              </p>
            ))}
          </div>
          <div className="bt-row">
            <button className="bt-btn" onClick={() => void copy(load.data)}>
              copy
            </button>
            <button className="bt-btn ghost" onClick={() => download(load.data)}>
              download PDF
            </button>
          </div>
        </>
      )}
    </div>
  )
}
