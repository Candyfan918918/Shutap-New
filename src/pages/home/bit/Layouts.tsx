/* The bit laid out for filming: a skit (a shot list one person films alone)
 * and a sketch (one page, Courier, standard format, copy and PDF). Both are written
 * on first open for the version on screen and cached on the server. */
import { useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { getSkit, getSketch } from '@/lib/bits.functions'
import type { BitVersion, SkitBeat, SketchElement } from '@/lib/bits/shared'
import { anonSessionId } from '../joke/jokeClient'
import { pdfFilename, sketchPdf } from './sketch-pdf'
import { Progress } from './Progress'

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
      <h1 className="bt-h2" style={{ fontSize: 'var(--fs-h2)' }}>
        {title}
      </h1>
    </>
  )
}

function Waiting({ load, what, retry }: { load: Load<unknown>; what: string; retry: () => void }) {
  if (load.state === 'loading')
    return (
      <div data-ph-private className="bt-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="bt-lbl r">laying out the {what}</span>
        <Progress
          steps={what === 'skit' ? ['reading the bit', 'blocking the shots', 'placing the on-screen text'] : ['reading the bit', 'writing the scene heading and action', 'formatting the dialogue']}
          expectSec={10}
          note="usually about 10 seconds, once per version"
        />
      </div>
    )
  if (load.state === 'error')
    return (
      <div data-ph-private className="bt-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p role="alert" style={{ margin: 0 }}>{load.message}</p>
        <button className="bt-btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={retry}>
          try again
        </button>
      </div>
    )
  return null
}

export function SkitView({
  bitId,
  version,
  onBack,
  onStandup,
  say,
}: {
  bitId: string
  version: BitVersion
  onBack: () => void
  onStandup: () => void
  say: (m: string) => void
}) {
  const skit = useServerFn(getSkit)
  const [nonce, setNonce] = useState(0)
  const load = useLayout<SkitBeat[]>(skit, bitId, version.id, nonce)

  async function copy(beats: SkitBeat[]) {
    const text = beats
      .map((b, i) => `${i + 1}. ${b.shot.toUpperCase()} · ${b.speaker}\n${b.line}${b.on_screen ? `\non screen: ${b.on_screen}` : ''}`)
      .join('\n\n')
    say((await copyText(text)) ? 'Skit copied.' : "Couldn't copy. Select the text instead.")
  }

  return (
    <div data-ph-private style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Top title="Skit" meta={`skit · shot list · ~${version.est_seconds}s`} onBack={onBack} />
      <Waiting load={load} what="skit" retry={() => setNonce((n) => n + 1)} />
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
              copy skit
            </button>
            <button className="bt-btn ghost" onClick={onStandup}>
              run it as stand-up
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function SketchView({
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
  const sketch = useServerFn(getSketch)
  const [nonce, setNonce] = useState(0)
  const load = useLayout<SketchElement[]>(sketch, bitId, version.id, nonce)

  async function copy(els: SketchElement[]) {
    const text = els
      .map((e) => {
        const t = e.type === 'scene_heading' || e.type === 'character' || e.type === 'transition' ? e.text.toUpperCase() : e.text
        const pad = e.type === 'character' ? '                    ' : e.type === 'dialogue' ? '          ' : e.type === 'parenthetical' ? '               ' : ''
        return pad + t
      })
      .join('\n')
    say((await copyText(text)) ? 'Sketch copied.' : "Couldn't copy. Select the text instead.")
  }

  function download(els: SketchElement[]) {
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

  return (
    <div data-ph-private style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Top title="Sketch" meta="sketch · one page" onBack={onBack} />
      <Waiting load={load} what="sketch" retry={() => setNonce((n) => n + 1)} />
      {load.state === 'ok' && (
        <>
          <div className="bt-page" role="document" aria-label="Sketch, one page">
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
              save PDF
            </button>
          </div>
        </>
      )}
    </div>
  )
}
