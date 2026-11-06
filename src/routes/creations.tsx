// My creations (Nov 6 2026): everything a person makes on Shutap, in one
// place under their profile. Bits, realtor kits, and — when they open —
// toasts and presentations. Replaces the old set list (/set-list redirects
// here). Private: noindex, disallowed in robots.txt, text hidden in replays.
import { pageMeta } from '@/lib/seo/page-meta'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { listMyBits, type SetListItem } from '@/lib/bits.functions'
import { listMyKits, type KitSummary } from '@/lib/realtors.functions'
import { TONE_LABEL } from '@/lib/realtors/listing'
import type { BitTier } from '@/lib/bits/shared'
import { anonSessionId } from '@/pages/home/joke/jokeClient'
import { setDurableReturn } from '@/lib/auth-guard'
import { trackEvent } from '@/lib/tracking'
import { Footer } from '@/components/feed/Footer'
import '@/components/feed/feed.css'

const KINDS = ['all', 'bits', 'kits', 'toasts', 'presentations'] as const
type Kind = (typeof KINDS)[number]
const KIND_LABEL: Record<Kind, string> = { all: 'all', bits: 'bits', kits: 'realtor kits', toasts: 'toasts', presentations: 'presentations' }

export const Route = createFileRoute('/creations')({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => z.object({ show: z.enum(KINDS).optional() }).parse(s),
  head: () => ({ meta: [...pageMeta('My creations — Shutap', 'Every bit, realtor kit, toast and presentation you made on Shutap, in one place.', '/creations'), { name: 'robots', content: 'noindex' }] }),
  component: () => (
    <div data-ph-private style={{ display: 'contents' }}>
      <Creations />
    </div>
  ),
})

function when(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const y = new Date(Date.now() - 86400e3)
  if (d.toDateString() === today.toDateString()) return 'today'
  if (d.toDateString() === y.toDateString()) return 'yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type Item =
  | { kind: 'bits'; at: string; bit: SetListItem }
  | { kind: 'kits'; at: string; kit: KitSummary }

function Creations() {
  const list = useServerFn(listMyBits)
  const navigate = useNavigate()
  const { show } = Route.useSearch()
  const kind: Kind = show ?? 'all'
  const [tier, setTier] = useState<BitTier | null>(null)
  const [bits, setBits] = useState<SetListItem[]>([])
  const [kits, setKits] = useState<KitSummary[]>([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    list({ data: { anon_session_id: anonSessionId() } })
      .then((r) => {
        setTier(r.tier)
        setBits(r.bits)
        if (r.tier !== 'guest') listMyKits({ data: {} }).then((k) => setKits(k.kits)).catch(() => {})
      })
      .catch(() => setFailed(true))
    void trackEvent('creations_viewed', {})
  }, [list])

  const items = useMemo<Item[]>(() => {
    const all: Item[] = [
      ...bits.map((b) => ({ kind: 'bits' as const, at: b.created_at, bit: b })),
      ...kits.map((k) => ({ kind: 'kits' as const, at: k.created_at, kit: k })),
    ]
    return all.filter((i) => kind === 'all' || i.kind === kind).sort((a, b) => (a.at < b.at ? 1 : -1))
  }, [bits, kits, kind])

  const count: Record<Kind, number> = { all: bits.length + kits.length, bits: bits.length, kits: kits.length, toasts: 0, presentations: 0 }
  const pick = (k: Kind) => void navigate({ to: '/creations', search: k === 'all' ? {} : { show: k }, replace: true })

  return (
    <div className="fd">
      <div className="fd-col">
        <Link to="/profile" className="fd-link fd-muted" style={{ fontSize: 13 }}>← profile</Link>
        <div className="fd-between">
          <h1 className="fd-h1" style={{ fontSize: 28 }}>My creations</h1>
          <div style={{ display: 'flex', gap: 6 }}>
            <Link to="/" className="fd-btn sm">+ bit</Link>
            <Link to="/realtors/kit" className="fd-btn sm ghost">+ kit</Link>
          </div>
        </div>

        <div role="tablist" aria-label="What to show" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {KINDS.map((k) => (
            <button key={k} role="tab" aria-selected={kind === k} className="fd-chip" aria-pressed={kind === k} onClick={() => pick(k)}>
              {KIND_LABEL[k]}{k === 'toasts' || k === 'presentations' ? ' · soon' : count[k] ? ` · ${count[k]}` : ''}
            </button>
          ))}
        </div>

        {failed && <p className="fd-muted">Couldn't load your creations. Refresh to try again.</p>}
        {tier === null && !failed && <p className="fd-muted">loading…</p>}

        {tier === 'guest' && (
          <div className="fd-empty">
            <b>Sign in to keep everything you make.</b>
            <span className="fd-muted">Free. Bits, realtor kits and more, all in one place.</span>
            <Link
              to="/welcome"
              className="fd-btn"
              onClick={() => {
                try { sessionStorage.setItem('shutap_returnTo', '/creations') } catch { /* noop */ }
                setDurableReturn('/creations')
              }}
            >
              sign in free
            </Link>
          </div>
        )}

        {tier && tier !== 'guest' && (kind === 'toasts' || kind === 'presentations') && (
          <div className="fd-empty">
            <b>{kind === 'toasts' ? 'Toasts are coming.' : 'Presentations are coming.'}</b>
            <span className="fd-muted">
              {kind === 'toasts'
                ? 'Best man, maid of honor, retirement, birthday: your stories, said funnier, with a teleprompter. They will land here.'
                : 'Slides with the funny already in them, for teams. They will land here.'}
            </span>
            {kind === 'toasts' ? <Link to="/toasts" className="fd-btn">hear the day it opens</Link> : <a href="/pricing#enterprise" className="fd-btn ghost">for teams</a>}
          </div>
        )}

        {tier && tier !== 'guest' && kind !== 'toasts' && kind !== 'presentations' && (
          items.length === 0 ? (
            <div className="fd-empty">
              <b>Nothing here yet.</b>
              <span className="fd-muted">Everything you make lands here, newest first, with every version.</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {kind !== 'kits' && <Link to="/" className="fd-btn">write a bit</Link>}
                {kind !== 'bits' && <Link to="/realtors/kit" className="fd-btn ghost">paste a listing</Link>}
              </div>
            </div>
          ) : (
            items.map((it) =>
              it.kind === 'bits' ? (
                <a
                  key={`b${it.bit.id}`}
                  href={`/?bit=${it.bit.id}`}
                  className="fd-post"
                  style={{ textDecoration: 'none', color: 'inherit', gap: 6 }}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                    e.preventDefault()
                    void trackEvent('creation_opened', { kind: 'bit' })
                    void navigate({ href: `/?bit=${it.bit.id}` })
                  }}
                >
                  <div className="fd-between" style={{ alignItems: 'flex-start' }}>
                    <span className="fd-hook" style={{ fontSize: 19 }}>{it.bit.hook || 'untitled bit'}</span>
                    <span className="fd-pill" style={{ flex: 'none' }}>bit</span>
                  </div>
                  <span className="fd-faint">
                    {when(it.at)} · {it.bit.audience} · {it.bit.versions} {it.bit.versions === 1 ? 'version' : 'versions'}
                  </span>
                </a>
              ) : (
                <Link
                  key={`k${it.kit.id}`}
                  to="/realtors/kit"
                  search={{ kit: it.kit.id } as never}
                  className="fd-post"
                  style={{ textDecoration: 'none', color: 'inherit', gap: 6 }}
                  onClick={() => void trackEvent('creation_opened', { kind: 'kit' })}
                >
                  <div className="fd-between" style={{ alignItems: 'flex-start' }}>
                    <span className="fd-hook" style={{ fontSize: 19 }}>{it.kit.address ?? 'a listing'}{it.kit.city ? `, ${it.kit.city}` : ''}</span>
                    <span className="fd-pill" style={{ flex: 'none' }}>realtor kit</span>
                  </div>
                  <span className="fd-faint">
                    {when(it.at)} · {TONE_LABEL[it.kit.tone]}{it.kit.price ? ` · ${it.kit.price}` : ''}
                  </span>
                </Link>
              ),
            )
          )
        )}
      </div>
      <Footer />
    </div>
  )
}
