/* Under the bit: the version chips, the five crowd-work angles, and the way into
 * Mix your own. Every version is saved the moment it is made, so there is no
 * separate keep step; a chip switches the bit above to that version. */
import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { swapAngle, varyBit } from '@/lib/bits.functions'
import { VARY_KINDS, type Bit, type BitTier, type BitVersion, type Slot, type VaryKind } from '@/lib/bits/shared'
import { anonSessionId, jokeTrack } from '../joke/jokeClient'

/** The rewrites in plain words (Nov 20 2026): the kinds keep their names in the data. */
export const KIND_LABEL: Record<VaryKind, string> = { hotter: 'bolder', tighter: 'shorter', storytelling: 'bigger ending' }

export function chipLabel(v: BitVersion, all: BitVersion[]): string {
  if (v.kind === 'edited' || (v.kind === 'mix' && v.why === 'kept as written by you')) {
    const kept = all.filter((x) => x.kind === 'edited' || (x.kind === 'mix' && x.why === 'kept as written by you'))
    return kept.length > 1 ? `yours ${kept.indexOf(v) + 1}` : 'yours'
  }
  if (v.kind === 'mix') {
    const mixes = all.filter((x) => x.kind === 'mix')
    return mixes.length > 1 ? `your mix ${mixes.indexOf(v) + 1}` : 'your mix'
  }
  if (v.kind === 'tag_swap') {
    const swaps = all.filter((x) => x.kind === 'tag_swap')
    return swaps.length > 1 ? `tag swap ${swaps.indexOf(v) + 1}` : 'tag swap'
  }
  return KIND_LABEL[v.kind as VaryKind] ?? v.kind
}

export function Versions({
  bit,
  current,
  onSelect,
  onAdd,
  onMix,
  say,
  onSignIn,
  onPaywall,
  onLimit,
  left,
  onCharged,
  locked,
}: {
  bit: Bit
  current: BitVersion
  onSelect: (id: string) => void
  onAdd: (v: BitVersion) => void
  onMix: () => void
  say: (m: string) => void
  /** Set for a guest: rewriting takes a free account, so every rewrite
   *  control opens the sign-in sheet instead. */
  onSignIn?: (from: 'rewrite' | 'swap' | 'mix') => void
  /** Set for a free account: free gets the bit as written (Nov 1 2026), so a
   *  new rewrite, a crowd-work swap or a mix opens the plans instead. */
  onPaywall?: (from: 'rewrite' | 'swap' | 'mix') => void
  /** A rewrite counts as a new bit: at the daily cap, open the limit sheet. */
  onLimit?: (tier: BitTier) => void
  /** bits left today (null = no cap), shown on the rewrite chips */
  left?: number | null
  /** a rewrite was charged: the parent refreshes the count */
  onCharged?: () => void
  /** AI on demand: lines a rewrite must leave word for word */
  locked?: Slot[]
}) {
  const vary = useServerFn(varyBit)
  const swap = useServerFn(swapAngle)
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
    if (onSignIn) return onSignIn('rewrite')
    if (onPaywall) {
      jokeTrack('rewrite_blocked', 'free', { kind: k })
      return onPaywall('rewrite')
    }
    setBusy(k)
    try {
      const r = await vary({ data: { bit_id: bit.id, from_version_id: original.id, kind: k, locked: locked?.length ? locked : undefined, anon_session_id: anonSessionId() } })
      if (r.ok) {
        onAdd(r.version)
        onCharged?.()
      } else if (r.reason === 'sign_in') say('Sign in to rewrite it. It\'s free.')
      else if (r.reason === 'daily') {
        jokeTrack('rewrite_blocked', r.tier, { kind: k })
        if (onLimit) onLimit(r.tier)
        else say("That's today's bits. A rewrite counts as a new one.")
      }
      else say(r.reason === 'too_many' ? 'That bit has all the versions it can hold.' : "Couldn't write that version. Try again.")
    } catch {
      say("Couldn't write that version. Try again.")
    } finally {
      setBusy(null)
    }
  }

  async function pickAngle(alt: number) {
    if (activeSwap && activeSwap.alt === alt) return onSelect(activeSwap.from)
    if (onSignIn) return onSignIn('swap')
    if (onPaywall) {
      jokeTrack('rewrite_blocked', 'free', { kind: 'tag_swap' })
      return onPaywall('swap')
    }
    const from = activeSwap ? activeSwap.from : current.id
    setSwapping(alt)
    try {
      const r = await swap({ data: { bit_id: bit.id, from_version_id: from, index: 0, alt, anon_session_id: anonSessionId() } })
      if (r.ok) {
        setSwappedFrom((m) => ({ ...m, [r.version.id]: { from, alt } }))
        onAdd(r.version)
      } else say(r.reason === 'sign_in' ? 'Sign in to swap the tag. It\'s free.' : "Couldn't swap that tag. Try again.")
    } catch {
      say("Couldn't swap that tag. Try again.")
    } finally {
      setSwapping(null)
    }
  }

  const others = bit.versions.filter((v) => v.id !== original.id)
  return (
    <>
      <section className="bt-rewrite" aria-label="Rewrite the whole bit">
        <div className="bt-panel-h sm">
          <b>Rewrite the whole bit</b>
          <span>
            {onPaywall
              ? 'Basic & Pro · locked lines stay'
              : left !== undefined && left !== null && !onSignIn
                ? `each one counts as a bit · ${left === 0 ? 'none left today' : `${left} left today`} · locked lines stay`
                : 'locked lines stay'}
          </span>
        </div>
        <div className="bt-rewrite-row">
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
                {busy === k ? 'writing…' : left === 0 && !onSignIn && !onPaywall && !made ? `${KIND_LABEL[k]} · limit` : KIND_LABEL[k]}
              </button>
            )
          })}
          <button className="bt-chip" onClick={() => (onSignIn ? onSignIn('mix') : onMix())}>pick &amp; mix</button>
        </div>
        {others.length > 0 && (
          <div className="bt-showing" aria-label="Versions of this bit">
            <span className="bt-note">showing:</span>
            <button className="bt-chip sm" aria-pressed={current.id === original.id} onClick={() => onSelect(original.id)}>original</button>
            {others.map((v) => (
              <button key={v.id} className="bt-chip sm" aria-pressed={current.id === v.id} onClick={() => onSelect(v.id)}>
                {chipLabel(v, bit.versions)}
              </button>
            ))}
          </div>
        )}
      </section>

      {bit.crowd_work.length > 0 && (
        <details className="bt-swaps-more" data-ph-private>
          <summary>5 other funny lines to swap in</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }} aria-label="Other funny lines">
          <span className="bt-note">Tap one to put it in as your funny line. Tap it again to undo.</span>
          {bit.crowd_work.map((t, i) => (
            <button
              key={i}
              className="bt-opt"
              aria-pressed={activeSwap?.alt === i}
              aria-busy={swapping === i || undefined}
              disabled={swapping !== null}
              onClick={() => void pickAngle(i)}
            >
              {t}
            </button>
          ))}
          </div>
        </details>
      )}
    </>
  )
}
