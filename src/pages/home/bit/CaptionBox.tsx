/* The text under the video: a caption and hashtags, ready to paste into
 * TikTok, Reels or Shorts. Written on first open, then cached per version. */
import { useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { getCaption } from '@/lib/bits.functions'
import { anonSessionId, jokeTrack } from '../joke/jokeClient'
import type { BitTier } from '@/lib/bits/shared'

export function CaptionBox({
  bitId,
  versionId,
  tier,
  locked,
  say,
}: {
  bitId: string
  versionId: string
  tier: BitTier
  locked: boolean
  say: (m: string) => void
}) {
  const fn = useServerFn(getCaption)
  const fnRef = useRef(fn)
  fnRef.current = fn
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

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text)
      say(`${what} copied.`)
      jokeTrack('caption_copied', tier, { what })
    } catch {
      say("Couldn't copy. Press and hold the text instead.")
    }
  }

  if (locked) {
    return (
      <div className="bt-cap">
        <span className="bt-lbl">caption + hashtags</span>
        <p className="bt-note">Sign in free to get a caption and hashtags for this bit.</p>
      </div>
    )
  }

  return (
    <div className="bt-cap" aria-live="polite">
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
