/* The text under the video: a caption and hashtags, ready to paste into
 * TikTok, Reels or Shorts. Written on first open, then cached per version. */
import { useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { chargeDownload, getCaption } from '@/lib/bits.functions'
import { anonSessionId, jokeTrack } from '../joke/jokeClient'
import type { BitTier } from '@/lib/bits/shared'

export function CaptionBox({
  bitId,
  versionId,
  tier,
  say,
  onLimit,
  downloadsLeft,
  onCharged,
  onSignIn,
  beforeCopy,
  resume,
  onResumed,
}: {
  bitId: string
  versionId: string
  tier: BitTier
  say: (m: string) => void
  /** at the daily download cap: open the plans */
  onLimit?: () => void
  downloadsLeft?: number | null
  onCharged?: (used: number, cap: number | null) => void
  /** guests: copying needs an account */
  onSignIn?: () => void
  /** returns true when a confirm sheet took over; the copy waits for `resume` */
  beforeCopy?: () => boolean
  resume?: boolean
  onResumed?: () => void
}) {
  const fn = useServerFn(getCaption)
  const charge = useServerFn(chargeDownload)
  const fnRef = useRef(fn)
  fnRef.current = fn
  // Captions are written on request, so they need an account.
  const locked = tier === 'guest'
  const [state, setState] = useState<{ caption: string; hashtags: string[] } | 'loading' | 'error' | null>(null)

  useEffect(() => {
    if (locked) return
    let live = true
    setState('loading')
    fnRef.current({ data: { bit_id: bitId, version_id: versionId, anon_session_id: anonSessionId() } })
      .then((r) => live && setState(r.ok ? { caption: r.caption, hashtags: r.hashtags } : 'error'))
      .catch(() => live && setState('error'))
    return () => {
      live = false
    }
  }, [bitId, versionId, locked])

  // Copying the caption or the hashtags is one download (the first copy of
  // this version today; later copies of the same version are free).
  async function copy(text: string, what: string, skipConfirm = false) {
    if (!skipConfirm && beforeCopy?.()) return
    let r: Awaited<ReturnType<typeof chargeDownload>>
    try {
      r = await charge({ data: { bit_id: bitId, version_id: versionId, kind: 'caption', anon_session_id: anonSessionId() } })
    } catch {
      say("Couldn't copy. Try again.")
      return
    }
    if (!r.ok) {
      if (r.reason === 'limited') {
        jokeTrack('download_blocked', tier, { kind: 'caption', used: r.used, cap: r.cap })
        say(`That's today's ${r.cap} download${r.cap === 1 ? '' : 's'}. Basic gets 3 a day, Pro unlimited.`)
        onLimit?.()
      } else say(r.reason === 'sign_in' ? 'Sign in to copy it.' : "Couldn't copy. Try again.")
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      say(`${what} copied.`)
      jokeTrack('caption_copied', tier, { what })
      if (!r.repeat) {
        jokeTrack('download', tier, { kind: 'caption', watermarked: false, used: r.used, cap: r.cap, resumed: skipConfirm })
        onCharged?.(r.used, r.cap)
      }
    } catch {
      say("Couldn't copy. Press and hold the text instead.")
    }
  }

  // Finish a copy that was waiting on the confirm, sign-in or payment.
  const resumedRef = useRef(false)
  useEffect(() => {
    if (!resume || resumedRef.current || !state || typeof state !== 'object') return
    resumedRef.current = true
    onResumed?.()
    void copy(`${state.caption}\n\n${state.hashtags.join(' ')}`, 'Caption and hashtags', true).finally(() => {
      resumedRef.current = false
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, state])

  const leftLabel = downloadsLeft === undefined ? '' : downloadsLeft === null ? '' : ` · ${downloadsLeft} download${downloadsLeft === 1 ? '' : 's'} left today`

  if (locked) {
    return (
      <section data-ph-private className="bt-card bt-cap" aria-label="Caption and hashtags">
        <span className="bt-lbl">caption + hashtags</span>
        <p className="bt-note">A caption under 100 characters and five hashtags, written for this bit. Sign in free to see and copy them.</p>
        {onSignIn && (
          <button className="bt-btn sm" onClick={onSignIn}>
            sign in to copy
          </button>
        )}
      </section>
    )
  }

  return (
    <section data-ph-private className="bt-card bt-cap" aria-live="polite" aria-label="Caption and hashtags">
      <div className="bt-between">
        <span className="bt-lbl">caption + hashtags</span>
        <span className="bt-note">copying is one download{leftLabel}</span>
      </div>
      {state === 'loading' && <p className="bt-note">writing the caption…</p>}
      {state === 'error' && <p className="bt-note">Couldn't write a caption this time.</p>}
      {state && typeof state === 'object' && (
        <>
          <p className="cap">{state.caption}</p>
          <div className="bt-chips" aria-label="Hashtags">
            {state.hashtags.map((h) => (
              <span key={h} className="bt-chip" style={{ cursor: 'default' }}>
                {h}
              </span>
            ))}
          </div>
          <div className="bt-chips">
            <button className="bt-btn sm" disabled={downloadsLeft === 0} onClick={() => void copy(`${state.caption}\n\n${state.hashtags.join(' ')}`, 'Caption and hashtags')}>
              {downloadsLeft === 0 ? "that's today's downloads" : 'copy caption + hashtags'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
