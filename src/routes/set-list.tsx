import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { listMyBits, type SetListItem } from '@/lib/bits.functions'
import type { BitTier, BitUsage } from '@/lib/bits/shared'
import { anonSessionId } from '@/pages/home/joke/jokeClient'
import { setDurableReturn } from '@/lib/auth-guard'
import { Footer } from '@/components/feed/Footer'
import '@/components/feed/feed.css'

export const Route = createFileRoute('/set-list')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Your set list — Shutap' }, { name: 'robots', content: 'noindex' }] }),
  component: SetListPage,
})

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

function when(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const y = new Date(Date.now() - 86400e3)
  if (d.toDateString() === today.toDateString()) return 'today'
  if (d.toDateString() === y.toDateString()) return 'yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function SetListPage() {
  const list = useServerFn(listMyBits)
  const [state, setState] = useState<{ tier: BitTier; bits: SetListItem[]; usage: BitUsage } | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    list({ data: { anon_session_id: anonSessionId() } })
      .then(setState)
      .catch(() => setFailed(true))
  }, [list])

  const left = state ? Math.max(0, state.usage.cap - state.usage.used) : null

  return (
    <div className="fd">
      <div className="fd-col">
        <div className="fd-between">
          <h1 className="fd-h1" style={{ fontSize: 28 }}>
            Your set list
          </h1>
          <Link to="/" className="fd-btn sm">
            + write
          </Link>
        </div>

        {failed && <p className="fd-muted">Couldn't load your set list. Refresh to try again.</p>}
        {!state && !failed && <p className="fd-muted">loading…</p>}

        {state && state.tier === 'guest' && (
          <div className="fd-empty">
            <b>Sign in to keep every bit you write.</b>
            <span className="fd-muted">Free. A made-up name; your real one never shows.</span>
            <Link
              to="/welcome"
              className="fd-btn"
              onClick={() => {
                try { sessionStorage.setItem('shutap_returnTo', '/set-list') } catch { /* noop */ }
                setDurableReturn('/set-list')
              }}
            >
              sign in free
            </Link>
          </div>
        )}

        {state && state.tier !== 'guest' && (
          <>
            <span className="fd-muted">
              {state.bits.length} {state.bits.length === 1 ? 'bit' : 'bits'} · newest first
              {left !== null ? ` · ${WORDS[left] ?? left} ${left === 1 ? 'story' : 'stories'} left today` : ''}
            </span>
            {state.bits.length === 0 ? (
              <div className="fd-empty">
                <b>Nothing here yet.</b>
                <span className="fd-muted">Write a story and the bit lands here, with every version.</span>
                <Link to="/" className="fd-btn">
                  write your first bit
                </Link>
              </div>
            ) : (
              state.bits.map((b) => (
                <a key={b.id} href={`/?bit=${b.id}`} className="fd-post" style={{ textDecoration: 'none', color: 'inherit', gap: 6 }}>
                  <div className="fd-between" style={{ alignItems: 'flex-start' }}>
                    <span className="fd-hook" style={{ fontSize: 19 }}>{b.hook || 'untitled bit'}</span>
                    <span className="fd-pill" style={{ flex: 'none' }}>
                      {b.versions} {b.versions === 1 ? 'version' : 'versions'}
                    </span>
                  </div>
                  <span className="fd-faint">
                    {when(b.created_at)} · {b.audience}
                  </span>
                </a>
              ))
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}
