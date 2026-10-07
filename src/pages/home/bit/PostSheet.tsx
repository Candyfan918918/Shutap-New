/* Post to rooms: the whole bit or the whole scene, never a single joke.
 * Pick which, pick a topic, see exactly what will post, post it under the
 * Shutap name. The server checks again for names and for a crisis before
 * anything goes public. */
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { postBitToRoom } from '@/lib/bits.functions'
import type { BitTier, BitVersion } from '@/lib/bits/shared'
import { TOPICS, TOPIC_LABEL, type Topic } from '@/lib/feed-shared'
import { anonSessionId, jokeTrack } from '../joke/jokeClient'

const FAIL: Record<string, string> = {
  names: 'That has a name or contact detail in it. Edit the story and write it again.',
  crisis: "This one can't be posted.",
  no_scene: "Couldn't lay out the scene. Try posting the bit.",
  sign_in: 'Sign in to post.',
  not_found: "Couldn't find that version.",
  failed: "Couldn't post that. Try again.",
}

export function PostSheet({
  bitId,
  version,
  audience,
  tier,
  onClose,
}: {
  bitId: string
  version: BitVersion
  audience: string
  tier: BitTier
  onClose: () => void
}) {
  const post = useServerFn(postBitToRoom)
  const [kind, setKind] = useState<'bit' | 'scene'>('bit')
  const [topic, setTopic] = useState<Topic>((TOPICS as readonly string[]).includes(audience) ? (audience as Topic) : 'social')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const r = await post({ data: { bit_id: bitId, version_id: version.id, kind, topic, anon_session_id: anonSessionId() } })
      if (r.ok) {
        setDone(r.room_id)
        jokeTrack('post', tier, { kind, topic, already: r.already })
      } else setError(FAIL[r.reason] ?? FAIL.failed!)
    } catch {
      setError(FAIL.failed!)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="bt-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bt-sheet" role="dialog" aria-modal="true" aria-labelledby="post-title" style={{ maxHeight: '92vh', overflow: 'auto' }}>
        {done ? (
          <>
            <h3 id="post-title">Posted.</h3>
            <p className="bt-sub" style={{ fontSize: 15 }}>It's in the {TOPIC_LABEL[topic]} room under your Shutap name.</p>
            <Link to="/rooms/$id" params={{ id: done }} className="bt-btn block">
              view post
            </Link>
            <button className="bt-btn ghost block" onClick={onClose}>
              back to the bit
            </button>
          </>
        ) : (
          <>
            <h3 id="post-title">Post to rooms</h3>
            <span className="bt-lbl">post as</span>
            <div className="bt-chips" role="group" aria-label="Post as">
              <button className="bt-chip" aria-pressed={kind === 'bit'} onClick={() => setKind('bit')}>
                the full bit
              </button>
              <button className="bt-chip" aria-pressed={kind === 'scene'} onClick={() => setKind('scene')}>
                the scene
              </button>
            </div>
            <div className="bt-post-prev">
              {kind === 'bit' ? (
                <>
                  <span className="bt-lbl r">hook</span>
                  <b className="h">{version.hook}</b>
                  <span className="bt-lbl">setup</span>
                  <p>{version.setup}</p>
                  {version.tags.map((t, i) => (
                    <span key={i}>
                      <span className="bt-lbl">tag {i + 1}</span>
                      <p>{t}</p>
                    </span>
                  ))}
                  <span className="bt-lbl r">button</span>
                  <p>{version.button}</p>
                </>
              ) : (
                <>
                  <b className="h">{version.hook}</b>
                  <p className="bt-note" style={{ fontSize: 13 }}>
                    Posts the shot list: numbered beats with the shot, who says it, and the line. It's laid out when you post if you haven't opened it yet.
                  </p>
                </>
              )}
            </div>
            <span className="bt-lbl">topic</span>
            <div className="bt-chips" role="group" aria-label="Topic">
              {TOPICS.map((t) => (
                <button key={t} className="bt-chip" aria-pressed={topic === t} onClick={() => setTopic(t)}>
                  {TOPIC_LABEL[t]}
                </button>
              ))}
            </div>
            <p className="bt-note" style={{ fontSize: 12.5 }}>
              Posts under your Shutap name. Jokes about the situation, never a real person. Names are checked again before it goes up.
            </p>
            {error && (
              <p role="alert" className="bt-note" style={{ color: 'var(--rose-ink, #9b3559)', fontSize: 13.5 }}>
                {error}
              </p>
            )}
            <button className="bt-btn block" disabled={busy} onClick={() => void submit()}>
              {busy ? 'posting…' : `post the ${kind}`}
            </button>
            <button className="bt-btn ghost block" onClick={onClose}>
              cancel
            </button>
          </>
        )}
      </div>
    </div>
  )
}
