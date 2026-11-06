import { pageMeta } from '@/lib/seo/page-meta'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { listMyBits, type SetListItem } from '@/lib/bits.functions'
import { listMyKits, type KitSummary } from '@/lib/realtors.functions'
import { TONE_LABEL } from '@/lib/realtors/listing'
import type { BitTier, BitUsage } from '@/lib/bits/shared'
import { anonSessionId } from '@/pages/home/joke/jokeClient'
import { setDurableReturn } from '@/lib/auth-guard'
import { Footer } from '@/components/feed/Footer'
import '@/components/feed/feed.css'

export const Route = createFileRoute('/set-list')({
  ssr: false,
  head: () => ({ meta: [...pageMeta("Your set list — Shutap", "Revisit your saved comedy bits and their versions, or start writing a new story.", "/set-list"), { name: 'robots', content: 'noindex' }] }),
  // Session replay hides all text on this page.
  component: () => (
    <div data-ph-private style={{ display: 'contents' }}>
      <SetListPage />
    </div>
  ),
})

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

function when(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const y = new Date(Date.now() - 86400e3)
  if (d.toDateString() === today.toDateString()) return 'today'
  if (d.toDateString() === y.toDateString()) return 'yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function SetListPage() {
  const list = useServerFn(listMyBits)
  const navigate = useNavigate()
  const [state, setState] = useState<{ tier: BitTier; bits: SetListItem[]; usage: BitUsage } | null>(null)
  const [failed, setFailed] = useState(false)
  /** realtor kits, in the same list (Nov 6 2026); empty for anyone without one */
  const [kits, setKits] = useState<KitSummary[]>([])

  useEffect(() => {
    list({ data: { anon_session_id: anonSessionId() } })
      .then((r) => { setState(r); if (r.tier !== 'guest') listMyKits({ data: {} }).then((k) => setKits(k.kits)).catch(() => {}) })
      .catch(() => setFailed(true))
  }, [list])

  // Pro has no cap shown (null), so no count either.
  const left = state && state.usage.cap !== null ? Math.max(0, state.usage.cap - state.usage.used) : null

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

        {kits.length > 0 && (
          <section className="fd-post" style={{ gap: 8 }} aria-label="Your realtor kits">
            <div className="fd-between"><b style={{ fontSize: 14 }}>Realtor kits</b><Link to="/realtors/kit" className="fd-link fd-muted">+ paste a listing</Link></div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {kits.map((k) => <Link key={k.id} to="/realtors/kit" search={{ kit: k.id } as never} className="fd-chip" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>{k.address ?? 'listing'}{k.city ? ` · ${k.city}` : ''} · {TONE_LABEL[k.tone].split(' ')[0]}</Link>)}
            </div>
          </section>
        )}
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
              {left !== null ? ` · ${WORDS[left] ?? left} ${left === 1 ? 'bit' : 'bits'} left today` : ''}
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
                <a
                  key={b.id}
                  href={`/?bit=${b.id}`}
                  className="fd-post"
                  style={{ textDecoration: 'none', color: 'inherit', gap: 6 }}
                  // Open in-app, not a full reload of the site (kept as a
                  // real link so new-tab and copy-link still work).
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                    e.preventDefault()
                    void navigate({ href: `/?bit=${b.id}` })
                  }}
                >
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
