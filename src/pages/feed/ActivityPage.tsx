import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { listActivity, type ActivityItem } from '@/lib/feed.functions'
import { ago } from '@/lib/feed-shared'
import { goSignIn } from '@/components/feed/kit'
import '@/components/feed/feed.css'

const VERB: Record<ActivityItem['kind'], string> = {
  follow: 'followed you',
  like: 'liked your post',
  comment: 'commented on your post',
}

export function ActivityPage() {
  const load = useServerFn(listActivity)
  const [items, setItems] = useState<ActivityItem[] | null>(null)
  const [signedIn, setSignedIn] = useState(true)

  useEffect(() => {
    load()
      .then((r) => {
        setItems(r.items)
        setSignedIn(r.signedIn)
        window.dispatchEvent(new Event('shutap:activity-read'))
      })
      .catch(() => setItems([]))
  }, [])

  return (
    <div className="fd">
      <div className="fd-col">
        <h1 className="fd-h1">Activity</h1>
        {items === null ? (
          <p className="fd-muted">loading…</p>
        ) : !signedIn ? (
          <div className="fd-empty">
            <b>Sign in to see who liked and followed you.</b>
            <button className="fd-btn" onClick={goSignIn}>
              sign in
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="fd-empty">
            <b>Nothing yet.</b>
            <span className="fd-muted">Post a joke and it shows up here when people like it.</span>
            <Link to="/" className="fd-btn">
              write
            </Link>
          </div>
        ) : (
          items.map((n) => (
            <div key={n.id} className="fd-comment" style={{ alignItems: 'center', background: n.unread ? '#f5f5f4' : undefined, borderRadius: n.unread ? 12 : 0, padding: '12px 10px' }}>
              <Link to="/u/$pseudonym" params={{ pseudonym: n.slug }} className="fd-av" style={{ textDecoration: 'none' }}>
                {n.emoji}
              </Link>
              <div style={{ flex: 1, minWidth: 0, fontSize: 14 }}>
                <Link to="/u/$pseudonym" params={{ pseudonym: n.slug }} className="fd-name">
                  {n.alias}
                </Link>{' '}
                {n.room_id ? (
                  <Link to="/rooms/$id" params={{ id: n.room_id }} className="fd-link">
                    {VERB[n.kind]}
                  </Link>
                ) : (
                  VERB[n.kind]
                )}
                {n.joke ? (
                  <div className="fd-faint" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {n.joke}
                  </div>
                ) : null}
              </div>
              <span className="fd-faint">{ago(n.created_at)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
