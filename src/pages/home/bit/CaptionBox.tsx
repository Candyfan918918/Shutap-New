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
}: {
  bitId: string
  versionId: string
  tier: BitTier
  say: (m: string) => void
  /** at the daily download cap: open the plans */
  onLimit?: () => void
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
  async function copy(text: string, what: string) {
    let r: Awaited<ReturnType<typeof chargeDownload>>
    try {
      r = await charge({ data: { bit_id: bitId, version_id: versionId, kind: 'caption', anon_session_id: anonSessionId() } })
    } catch {
      say("Couldn't copy. Try again.")
      return
    }
    if (!r.ok) {
      if (r.reason === 'limited') {
        say(`That's today's ${r.cap} download${r.cap === 1 ? '' : 's'}. Basic gets 3 a day, Pro unlimited.`)
        onLimit?.()
      } else say(r.reason === 'sign_in' ? 'Sign in to copy it.' : "Couldn't copy. Try again.")
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      say(`${what} copied.`)
      jokeTrack('caption_copied', tier, { what })
      if (!r.repeat) jokeTrack('download', tier, { kind: 'caption', watermarked: false, used: r.used, cap: r.cap })
    } catch {
      say("Couldn't copy. Press and hold the text instead.")
    }
  }

  if (locked) {
    return (
      <div data-ph-private className="bt-cap">
        <span className="bt-lbl">caption + hashtags</span>
        <p className="bt-note">Sign in free to copy the caption and hashtags for this bit.</p>
      </div>
    )
  }

  return (
    <div data-ph-private className="bt-cap" aria-live="polite">
      <span className="bt-lbl">caption + hashtags</span>
      {state === 'loading' && <p className="bt-note">writing the caption…</p>}
      {state === 'error' && <p className="bt-note">Couldn't write a caption this time.</p>}
      {state && typeof state === 'object' && (
        <>
          <p className="cap">{state.caption}</p>
          <p className="tags">{state.hashtags.join(' ')}</p>
          <div className="bt-chips">
            <button className="bt-chip" onClick={() => void copy(`${state.caption}\n\n${state.hashtags.join(' ')}`, 'Caption and hashtags')}>
              copy both
            </button>
            <button className="bt-chip" onClick={() => void copy(state.hashtags.join(' '), 'Hashtags')}>
              copy hashtags
            </button>
          </div>
        </>
      )}
    </div>
  )
}
