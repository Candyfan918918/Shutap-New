/* Under the bit: the version chips, the five spare tags, and the way into
 * Mix your own. Every version is saved the moment it is made, so there is no
 * separate keep step; a chip switches the bit above to that version. */
import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { swapTag, varyBit } from '@/lib/bits.functions'
import { VARY_KINDS, type Bit, type BitVersion, type VaryKind } from '@/lib/bits/shared'
import { anonSessionId } from '../joke/jokeClient'

export function chipLabel(v: BitVersion, all: BitVersion[]): string {
  if (v.kind === 'mix') {
    const mixes = all.filter((x) => x.kind === 'mix')
    return mixes.length > 1 ? `your mix ${mixes.indexOf(v) + 1}` : 'your mix'
  }
  if (v.kind === 'tag_swap') {
    const swaps = all.filter((x) => x.kind === 'tag_swap')
    return swaps.length > 1 ? `tag swap ${swaps.indexOf(v) + 1}` : 'tag swap'
  }
  return v.kind
}

export function Versions({
  bit,
  current,
  onSelect,
  onAdd,
  onMix,
  say,
}: {
  bit: Bit
  current: BitVersion
  onSelect: (id: string) => void
  onAdd: (v: BitVersion) => void
  onMix: () => void
  say: (m: string) => void
}) {
  const vary = useServerFn(varyBit)
  const swap = useServerFn(swapTag)
  const [busy, setBusy] = useState<VaryKind | null>(null)
  const [swapping, setSwapping] = useState<number | null>(null)
  /** swap version id → the version it was made from, so a second tap undoes it */
  const [swappedFrom, setSwappedFrom] = useState<Record<string, { from: string; alt: number }>>({})

  const original = bit.versions.find((v) => v.kind === 'original') ?? bit.versions[0]!
  const latestOf = (k: string) => [...bit.versions].reverse().find((v) => v.kind === k)
  const extras = bit.versions.filter((v) => v.kind === 'mix' || v.kind === 'tag_swap')
  const activeSwap = swappedFrom[current.id]

  async function pickKind(k: VaryKind) {
    const made = latestOf(k)
    if (made) return onSelect(made.id)
    setBusy(k)
    try {
      const r = await vary({ data: { bit_id: bit.id, from_version_id: original.id, kind: k, anon_session_id: anonSessionId() } })
      if (r.ok) onAdd(r.version)
      else say(r.reason === 'too_many' ? 'That bit has all the versions it can hold.' : "Couldn't write that version. Try again.")
    } catch {
      say("Couldn't write that version. Try again.")
    } finally {
      setBusy(null)
    }
  }

  async function pickTag(alt: number) {
    if (activeSwap && activeSwap.alt === alt) return onSelect(activeSwap.from)
    const from = activeSwap ? activeSwap.from : current.id
    setSwapping(alt)
    try {
      const r = await swap({ data: { bit_id: bit.id, from_version_id: from, index: 0, alt, anon_session_id: anonSessionId() } })
      if (r.ok) {
        setSwappedFrom((m) => ({ ...m, [r.version.id]: { from, alt } }))
        onAdd(r.version)
      } else say("Couldn't swap that tag. Try again.")
    } catch {
      say("Couldn't swap that tag. Try again.")
    } finally {
      setSwapping(null)
    }
  }

  return (
    <>
      <section className="bt-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} aria-label="Versions">
        <span className="bt-lbl">versions</span>
        <div className="bt-chips">
          <button className="bt-chip" aria-pressed={current.id === original.id} onClick={() => onSelect(original.id)}>
            original
          </button>
          {VARY_KINDS.map((k) => {
            const made = latestOf(k)
            return (
              <button
                key={k}
                className="bt-chip"
                aria-pressed={!!made && current.id === made.id}
                aria-busy={busy === k || undefined}
                disabled={!!busy}
                onClick={() => void pickKind(k)}
              >
                {busy === k ? 'writing…' : k}
              </button>
            )
          })}
          {extras.map((v) => (
            <button key={v.id} className="bt-chip" aria-pressed={current.id === v.id} onClick={() => onSelect(v.id)}>
              {chipLabel(v, bit.versions)}
            </button>
          ))}
        </div>
        {current.id !== original.id && (
          <p className="bt-note" style={{ fontSize: 13 }}>
            The bit above is now the {chipLabel(current, bit.versions)} version. Every version is saved.
          </p>
        )}
        <div className="bt-between" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <b style={{ fontSize: 15 }}>Mix your own</b>
            <span className="bt-note" style={{ fontSize: 13, color: 'var(--muted)' }}>
              pick your favorite hook, tag and ending, one at a time
            </span>
          </div>
          <button className="bt-btn sm" onClick={onMix}>
            start
          </button>
        </div>
      </section>

      {bit.alt_tags.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-label="Spare tags">
          <span className="bt-lbl">{bit.alt_tags.length} more tags · tap to swap into tag 1</span>
          {bit.alt_tags.map((t, i) => (
            <button
              key={i}
              className="bt-opt"
              aria-pressed={activeSwap?.alt === i}
              aria-busy={swapping === i || undefined}
              disabled={swapping !== null}
              onClick={() => void pickTag(i)}
            >
              {t}
            </button>
          ))}
        </section>
      )}
    </>
  )
}
