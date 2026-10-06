// Everything under the write box: latest posts, FAQ, footer.
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { listFeed } from '@/lib/feed.functions'
import { TOPIC_LABEL, ago, type FeedPost } from '@/lib/feed-shared'
import { Footer } from '@/components/feed/Footer'
import { HOME_FAQ } from './HomeFAQ'
import '@/components/feed/feed.css'

export function HomeRest() {
  const load = useServerFn(listFeed)
  const [posts, setPosts] = useState<FeedPost[]>([])
  useEffect(() => {
    load({ data: { tab: 'new' } })
      .then((r) => setPosts(r.posts.slice(0, 8)))
      .catch(() => {})
  }, [])

  return (
    <div className="fd" style={{ minHeight: 0 }}>
      {posts.length ? (
        <section style={{ padding: '40px 0 8px' }}>
          <div className="fd-col" style={{ padding: '0 16px 12px', maxWidth: 1080 }}>
            <div className="fd-between">
              <h2 className="fd-h1" style={{ fontSize: 22 }}>
                From the rooms
              </h2>
              <Link to="/rooms" className="fd-link fd-muted">
                see all →
              </Link>
            </div>
          </div>
          <div className="fd-chips" style={{ gap: 12, padding: '0 16px 8px', maxWidth: 1080, margin: '0 auto' }}>
            {posts.map((p) => (
              <Link
                key={p.id}
                to="/rooms/$id"
                params={{ id: p.id }}
                className="fd-post"
                style={{ flex: 'none', width: 290, textDecoration: 'none', color: 'inherit' }}
              >
                <span className="fd-faint">
                  {p.emoji} {p.alias}
                  {p.topic ? ` · ${TOPIC_LABEL[p.topic]}` : ''} · {ago(p.created_at)}
                </span>
                <p className="fd-joke" style={{ fontSize: 18, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.joke}
                </p>
                <span className="fd-faint">
                  ♥ {p.likes} · 💬 {p.comments}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="fd-col" style={{ paddingTop: 40, gap: 0 }}>
        <h2 className="fd-h1" style={{ fontSize: 22, marginBottom: 10 }}>
          FAQ
        </h2>
        {HOME_FAQ.map((f) => (
          <details key={f.q} style={{ borderTop: '1px solid rgba(0,0,0,.09)', padding: '14px 0' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 15, listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
              {f.q}
              <span aria-hidden style={{ color: '#9a9a9a' }}>+</span>
            </summary>
            <p style={{ margin: '8px 0 0', fontSize: 15, lineHeight: 1.5, color: '#555' }}>{f.a}</p>
          </details>
        ))}
      </section>
      <Footer />
    </div>
  )
}
