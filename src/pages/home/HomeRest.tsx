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
              <h2 className="fd-h1" style={{ fontSize: 'var(--fs-read)' }}>
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
                <p className="fd-joke" style={{ fontSize: 'var(--fs-body)', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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

      <section className="fd-col" style={{ paddingTop: 48, gap: 0 }}>
        <h2 className="fd-h1" style={{ fontSize: 'var(--fs-read)', marginBottom: 8 }}>
          Our goal: say it funnier
        </h2>
        <p className="home-reading" style={{ margin: '0 0 16px', fontSize: 'var(--fs-read)', lineHeight: 1.6, color: '#555' }}>
          Humor is a form of wisdom, and the people who use it well are listened to. Shutap helps people say it funnier.
        </p>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          {[
            ['Today', 'The AI bit generator for content creators and comedians: your story becomes a bit, then a teleprompter, a scene or a screenplay page.'],
            ['Next', 'Shutap Enterprise for presentations, demos, launches and meetings, and the Shutap joke dataset.'],
            ['Exploring', 'Short videos, screenwriting and audio stories. Plans, not promised dates.'],
          ].map(([h, b]) => (
            <div key={h} style={{ border: '1px solid rgba(0,0,0,.09)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--fs-label)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 4 }}>{h}</div>
              <div style={{ fontFamily: 'Newsreader,serif', fontWeight: 400, fontSize: 'var(--fs-read)', lineHeight: 1.6, color: '#555' }}>{b}</div>
            </div>
          ))}
        </div>
        <Link to="/business" className="fd-link fd-muted" style={{ marginTop: 12 }}>
          Shutap Enterprise: request pricing →
        </Link>
      </section>

      <section className="fd-col" style={{ paddingTop: 40, gap: 0 }}>
        <h2 className="fd-h1" style={{ fontSize: 'var(--fs-read)', marginBottom: 10 }}>
          AI bit generator FAQ
        </h2>
        {HOME_FAQ.map((f) => (
          <details key={f.q} style={{ borderTop: '1px solid rgba(0,0,0,.09)', padding: '14px 0' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 500, fontSize: 'var(--fs-body)', listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
              {f.q}
              <span aria-hidden style={{ color: '#9a9a9a' }}>+</span>
            </summary>
            <p className="home-faq-answer" style={{ margin: '8px 0 0', fontSize: 'var(--fs-read)', lineHeight: 1.6, color: '#555' }}>{f.a}</p>
          </details>
        ))}
        <Link to="/faq" className="fd-link fd-muted" style={{ marginTop: 12 }}>
          all questions →
        </Link>
      </section>
      <Footer />
    </div>
  )
}
