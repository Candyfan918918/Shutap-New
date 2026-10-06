import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { listFeed } from '@/lib/feed.functions'
import { TOPICS, TOPIC_LABEL, type FeedPost, type Topic } from '@/lib/feed-shared'
import { PostCard, Toast, goSignIn, useToast } from '@/components/feed/kit'

type Tab = 'new' | 'following' | 'saved'

export function FeedPage({ tab, topic }: { tab: Tab; topic: Topic | null }) {
  const load = useServerFn(listFeed)
  const navigate = useNavigate()
  const [posts, setPosts] = useState<FeedPost[] | null>(null)
  const [signedIn, setSignedIn] = useState(false)
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, say] = useToast()

  useEffect(() => {
    let live = true
    setPosts(null)
    load({ data: { tab, topic } })
      .then((r) => {
        if (!live) return
        setPosts(r.posts)
        setSignedIn(r.signedIn)
        setMore(r.posts.length >= 20)
      })
      .catch(() => live && setPosts([]))
    return () => {
      live = false
    }
  }, [tab, topic])

  const go = (next: { tab?: Tab; topic?: Topic | null }) =>
    navigate({
      to: '/rooms',
      search: {
        tab: (next.tab ?? tab) === 'new' ? undefined : (next.tab ?? tab),
        topic: (next.topic === undefined ? topic : next.topic) ?? undefined,
      },
    })

  const loadMore = async () => {
    if (!posts?.length) return
    setBusy(true)
    try {
      const r = await load({ data: { tab, topic, before: posts[posts.length - 1].created_at } })
      setPosts([...posts, ...r.posts])
      setMore(r.posts.length >= 20)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fd">
      <div className="fd-col">
        <div className="fd-between">
          <h1 className="fd-h1">Rooms</h1>
          <Link to="/" className="fd-btn sm">
            + write
          </Link>
        </div>

        <div className="fd-tabs" role="tablist">
          {(['new', 'following', 'saved'] as Tab[]).map((t) => (
            <button key={t} role="tab" className="fd-tab" aria-selected={tab === t} onClick={() => go({ tab: t })}>
              {t}
            </button>
          ))}
        </div>

        <div className="fd-chips">
          <button className="fd-chip" aria-pressed={!topic} onClick={() => go({ topic: null })}>
            all
          </button>
          {TOPICS.map((t) => (
            <button key={t} className="fd-chip" aria-pressed={topic === t} onClick={() => go({ topic: t })}>
              {TOPIC_LABEL[t]}
            </button>
          ))}
        </div>

        {posts === null ? (
          <p className="fd-muted">loading…</p>
        ) : posts.length === 0 ? (
          <Empty tab={tab} signedIn={signedIn} />
        ) : (
          <>
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                signedIn={signedIn}
                say={say}
                onGone={(id) => setPosts((xs) => (xs ?? []).filter((x) => x.id !== id))}
              />
            ))}
            {more ? (
              <button className="fd-btn ghost block" disabled={busy} onClick={() => void loadMore()}>
                {busy ? 'loading…' : 'more'}
              </button>
            ) : null}
          </>
        )}
      </div>
      <Toast msg={toast} />
    </div>
  )
}

function Empty({ tab, signedIn }: { tab: Tab; signedIn: boolean }) {
  if (tab !== 'new' && !signedIn)
    return (
      <div className="fd-empty">
        <b>Sign in to see this.</b>
        <button className="fd-btn" onClick={goSignIn}>
          sign in
        </button>
      </div>
    )
  const text =
    tab === 'following' ? 'Follow people to fill this up.' : tab === 'saved' ? 'Nothing saved yet.' : 'No posts here yet.'
  return (
    <div className="fd-empty">
      <b>{text}</b>
      <Link to="/" className="fd-btn">
        write the first one
      </Link>
    </div>
  )
}
