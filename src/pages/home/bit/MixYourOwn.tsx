/* Mix your own: build a version from the best lines, one part at a time.
 *
 * Tap to select, not drag and drop. Three steps named at the top (hook,
 * tag, ending). Each step asks one question and shows two options as a radio
 * group; tapping one selects it, tapping the other switches. The main button
 * stays disabled until something is selected, so a stray tap never skips
 * ahead. "Show me two others" swaps both options. Back keeps the earlier
 * choice. Saving makes a 'mix' version; the setup stays from the version the
 * user started on. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { getMixOptions, saveMix, type MixPool } from '@/lib/bits.functions'
import type { Bit, BitVersion } from '@/lib/bits/shared'
import { anonSessionId } from '../joke/jokeClient'

type Part = 'hook' | 'tag' | 'button'
const PARTS: { key: Part; label: string; q: string; next: string }[] = [
  { key: 'hook', label: 'hook', q: 'Pick the better hook.', next: 'next: pick the tag →' },
  { key: 'tag', label: 'tag', q: 'Pick the better tag.', next: 'next: pick the ending →' },
  { key: 'button', label: 'ending', q: 'Pick the better ending.', next: 'save my mix' },
]

/** The lines for a part, the starting version's own line first so it is
 *  always one of the first two on offer. */
function linesFor(part: Part, pool: MixPool, from: BitVersion): string[] {
  const own = part === 'hook' ? [from.hook] : part === 'tag' ? from.tags.slice(0, 1) : [from.button]
  const rest = part === 'hook' ? pool.hooks : part === 'tag' ? pool.tags : pool.buttons
  const seen = new Set<string>()
  return [...own, ...rest].filter((l) => {
    const k = l.trim().toLowerCase()
    if (!k || seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export function MixYourOwn({
  bit,
  from,
  onSaved,
  onBack,
  onPrompter,
}: {
  bit: Bit
  from: BitVersion
  onSaved: (v: BitVersion) => void
  onBack: () => void
  onPrompter: (v: BitVersion) => void
}) {
  const options = useServerFn(getMixOptions)
  const save = useServerFn(saveMix)
  const [pool, setPool] = useState<MixPool | null>(null)
  const [failed, setFailed] = useState(false)
  const [step, setStep] = useState(0)
  const [page, setPage] = useState<number[]>([0, 0, 0])
  const [picks, setPicks] = useState<(string | null)[]>([null, null, null])
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<BitVersion | null>(null)
  const headRef = useRef<HTMLHeadingElement | null>(null)

  useEffect(() => {
    let live = true
    options({ data: { bit_id: bit.id, anon_session_id: anonSessionId() } })
      .then((r) => {
        if (!live) return
        if (r.ok) setPool(r.pool)
        else setFailed(true)
      })
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [bit.id, options])

  useEffect(() => {
    headRef.current?.focus()
  }, [step, result])

  const part = PARTS[step]!
  const lines = useMemo(() => (pool ? linesFor(part.key, pool, from) : []), [pool, part.key, from])
  const pages = Math.max(1, Math.ceil(lines.length / 2))
  const pair = lines.slice(page[step]! * 2, page[step]! * 2 + 2)
  const picked = picks[step]

  function choose(line: string) {
    setPicks((p) => p.map((x, i) => (i === step ? line : x)))
  }

  function others() {
    setPage((p) => p.map((x, i) => (i === step ? (x + 1) % pages : x)))
  }

  async function next() {
    if (!picked) return
    if (step < 2) {
      setStep(step + 1)
      return
    }
    setSaving(true)
    try {
      const r = await save({
        data: {
          bit_id: bit.id,
          from_version_id: from.id,
          hook: picks[0]!,
          tag: picks[1]!,
          button: picks[2]!,
          anon_session_id: anonSessionId(),
        },
      })
      if (r.ok) {
        setResult(r.version)
        onSaved(r.version)
      } else setFailed(true)
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  function back() {
    if (step === 0) onBack()
    else setStep(step - 1)
  }

  function startOver() {
    setResult(null)
    setStep(0)
    setPage([0, 0, 0])
    setPicks([null, null, null])
  }

  if (result) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="bt-bar" aria-hidden="true">
          <i className="done" />
          <i className="done" />
          <i className="done" />
        </div>
        <span className="bt-lbl r">your mix</span>
        <h1 className="bt-h2" style={{ fontSize: 28 }} tabIndex={-1} ref={headRef}>
          Here's your version.
        </h1>
        <p className="bt-note" style={{ fontSize: 14, color: 'var(--muted)' }}>
          Saved next to the others. The setup stays from the version you started on.
        </p>
        <article className="bt-card" style={{ paddingTop: 8 }}>
          <div className="bt-slot">
            <span className="bt-lbl r">hook</span>
            <p className="bt-v hook">{result.hook}</p>
          </div>
          <div className="bt-slot">
            <span className="bt-lbl">setup</span>
            <p className="bt-v">{result.setup}</p>
          </div>
          <div className="bt-slot">
            <span className="bt-lbl">tag</span>
            <p className="bt-v">{result.tags[0]}</p>
          </div>
          <div className="bt-slot">
            <span className="bt-lbl r">button</span>
            <p className="bt-v">{result.button}</p>
          </div>
        </article>
        <button className="bt-btn block" onClick={() => onPrompter(result)}>
          open in teleprompter
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          <button className="bt-btn ghost" onClick={onBack}>
            see it in the bit
          </button>
          <button className="bt-btn ghost" onClick={startOver}>
            start over
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="bt-between">
        <button className="bt-btn ghost sm" onClick={back}>
          ← {step === 0 ? 'back to the bit' : 'back'}
        </button>
        <span className="bt-lbl">step {step + 1} of 3</span>
      </div>
      <div className="bt-bar" aria-hidden="true">
        {PARTS.map((p, i) => (
          <i key={p.key} className={i < step ? 'done' : i === step ? 'on' : ''} />
        ))}
      </div>
      <div className="bt-steplabels" aria-hidden="true">
        {PARTS.map((p, i) => (
          <span key={p.key} className={i === step ? 'on' : ''} style={{ textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right' }}>
            {i + 1} · {p.label}
          </span>
        ))}
      </div>
      <h1 className="bt-h2" style={{ fontSize: 28 }} tabIndex={-1} ref={headRef}>
        {part.q}
      </h1>
      <p className="bt-note" style={{ fontSize: 14, color: 'var(--muted)', marginTop: -6 }}>
        Tap the one you'd rather say out loud. You can change your mind until you tap next.
      </p>

      {failed && <p role="alert" className="bt-note" style={{ color: 'var(--rose-ink)', fontSize: 14 }}>Couldn't load the lines. Go back and try again.</p>}
      {!pool && !failed && <p className="bt-note">loading the lines…</p>}

      {pool && (
        <div role="radiogroup" aria-label={part.q} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pair.map((line) => (
            <button key={line} role="radio" aria-checked={picked === line} className="bt-pick" onClick={() => choose(line)}>
              <span className="dot" aria-hidden="true">{picked === line ? '✓' : ''}</span>
              <span className="t">{line}</span>
            </button>
          ))}
        </div>
      )}

      {pool && pages > 1 && (
        <button className="bt-btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={others}>
          show me two others
        </button>
      )}

      <button className="bt-btn block" disabled={!picked || saving} onClick={() => void next()}>
        {saving ? 'saving…' : picked ? part.next : `tap one to continue`}
      </button>
    </div>
  )
}
