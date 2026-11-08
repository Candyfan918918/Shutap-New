// My creations (Nov 6 2026): everything a person makes on Shutap, in one
// place under their profile. Bits, realtor kits, toasts (Nov 6 2026) and —
// when they open — presentations. Replaces the old set list (/set-list redirects
// here). Private: noindex, disallowed in robots.txt, text hidden in replays.
import { pageMeta } from '@/lib/seo/page-meta'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { listMyBits, type SetListItem } from '@/lib/bits.functions'
import { listMyKits, type KitSummary } from '@/lib/realtors.functions'
import { getMyToast, listMyToasts, type ToastSummary } from '@/lib/toasts.functions'
import { OCCASION, TONE_LABEL as TOAST_TONE, clock } from '@/lib/toasts/shared'
import { readNames } from '@/lib/toasts/names-store'
import { toastTitle } from '@/lib/toasts/toast-text'
import { cueCardsPdf, downloadBlob, keepsakePdf, pdfName, speechPdf } from '@/lib/toasts/toast-pdf'
import { prompterLink } from '@/lib/toasts/on-the-day'
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
  | { kind: 'toasts'; at: string; toast: ToastSummary }

function Creations() {
  const list = useServerFn(listMyBits)
  const navigate = useNavigate()
  const { show } = Route.useSearch()
  const kind: Kind = show ?? 'all'
  const [tier, setTier] = useState<BitTier | null>(null)
  const [bits, setBits] = useState<SetListItem[]>([])
  const [kits, setKits] = useState<KitSummary[]>([])
  const [toasts, setToasts] = useState<ToastSummary[]>([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    list({ data: { anon_session_id: anonSessionId() } })
      .then((r) => {
        setTier(r.tier)
        setBits(r.bits)
        if (r.tier !== 'guest') {
          listMyKits({ data: {} }).then((k) => setKits(k.kits)).catch(() => {})
          listMyToasts({ data: {} }).then((t) => setToasts(t.toasts)).catch(() => {})
        }
      })
      .catch(() => setFailed(true))
    void trackEvent('creations_viewed', {})
  }, [list])

  const items = useMemo<Item[]>(() => {
    const all: Item[] = [
      ...bits.map((b) => ({ kind: 'bits' as const, at: b.created_at, bit: b })),
      ...kits.map((k) => ({ kind: 'kits' as const, at: k.created_at, kit: k })),
      ...toasts.map((t) => ({ kind: 'toasts' as const, at: t.created_at, toast: t })),
    ]
    return all.filter((i) => kind === 'all' || i.kind === kind).sort((a, b) => (a.at < b.at ? 1 : -1))
  }, [bits, kits, toasts, kind])

  const count: Record<Kind, number> = { all: bits.length + kits.length + toasts.length, bits: bits.length, kits: kits.length, toasts: toasts.length, presentations: 0 }

  /** A toast's downloads straight from the list: names from this device
   *  (a device without them opens the toast, which asks once). */
  async function toastGet(t: ToastSummary, what: 'speech' | 'cue_cards' | 'keepsake' | 'prompter') {
    const names = readNames(t.id)
    if (!names) { void navigate({ to: '/toasts/edit/$id', params: { id: t.id } }); return }
    void trackEvent(what === 'prompter' ? 'toast_prompter_opened_here' : 'toast_downloaded', { product: 'toasts', what, where: 'creations' })
    if (what === 'prompter') { window.location.assign(prompterLink(window.location.origin, t.id, names)); return }
    const r = await getMyToast({ data: { id: t.id } }).catch(() => null)
    if (!r?.ok || !r.toast.toast) return
    const x = r.toast.toast
    const blob = what === 'speech' ? speechPdf({ occasion: t.occasion, tone: t.tone, length: t.length, lines: x.lines, names, marked: r.toast.marked })
      : what === 'cue_cards' ? cueCardsPdf({ occasion: t.occasion, cards: x.cards, names, marked: r.toast.marked, trueThing: x.lines.find((l) => l.source === 'true_thing')?.text })
      : keepsakePdf({ occasion: t.occasion, lines: x.lines, names, marked: r.toast.marked })
    downloadBlob(blob, pdfName(t.occasion, names, what.replace('_', '-')))
  }
  const pick = (k: Kind) => void navigate({ to: '/creations', search: k === 'all' ? {} : { show: k }, replace: true })

  return (
    <div className="fd">
      <div className="fd-col">
        <Link to="/profile" className="fd-link fd-muted" style={{ fontSize: 13 }}>← profile</Link>
        <div className="fd-between">
          <h1 className="fd-h1" style={{ fontSize: 28 }}>My creations</h1>
          <div style={{ display: 'flex', gap: 6 }}>
            <Link to="/" className="fd-btn sm">+ bit</Link>
            <Link to="/realtors" className="fd-btn sm ghost">+ kit</Link>
            <Link to="/toasts" className="fd-btn sm ghost">+ toast</Link>
          </div>
        </div>

        <div role="tablist" aria-label="What to show" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {KINDS.map((k) => (
            <button key={k} role="tab" aria-selected={kind === k} className="fd-chip" aria-pressed={kind === k} onClick={() => pick(k)}>
              {KIND_LABEL[k]}{k === 'presentations' ? ' · soon' : count[k] ? ` · ${count[k]}` : ''}
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

        {tier && tier !== 'guest' && kind === 'presentations' && (
          <div className="fd-empty">
            <b>Presentations are coming.</b>
            <span className="fd-muted">Slides with the funny already in them, for teams. They will land here.</span>
            <a href="/pricing#enterprise" className="fd-btn ghost">for teams</a>
          </div>
        )}

        {tier && tier !== 'guest' && kind === 'toasts' && toasts.length > 0 && (
          <div className="fd-post" style={{ gap: 4, background: '#f3f8f4', borderColor: '#b9d3bf' }}>
            <b style={{ fontSize: 14.5 }}>Your toasts live here.</b>
            <span className="fd-muted" style={{ fontSize: 13.5 }}>Locked toasts download as often as you like, forever: the speech, cue cards, keepsake, prompter.</span>
          </div>
        )}

        {tier && tier !== 'guest' && kind !== 'presentations' && (
          items.length === 0 ? (
            <div className="fd-empty">
              <b>Nothing here yet.</b>
              <span className="fd-muted">Everything you make lands here, newest first, with every version.</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {(kind === 'all' || kind === 'bits') && <Link to="/" className="fd-btn">write a bit</Link>}
                {(kind === 'all' || kind === 'kits') && <Link to="/realtors" className="fd-btn ghost">paste a listing</Link>}
                {(kind === 'all' || kind === 'toasts') && <Link to="/toasts" className={kind === 'toasts' ? 'fd-btn' : 'fd-btn ghost'}>write a toast</Link>}
              </div>
            </div>
          ) : (
            items.map((it) =>
              it.kind === 'bits' ? (
                <a
                  key={`b${it.bit.id}`}
                  href={`/bits?bit=${it.bit.id}`}
                  className="fd-post"
                  style={{ textDecoration: 'none', color: 'inherit', gap: 6 }}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                    e.preventDefault()
                    void trackEvent('creation_opened', { kind: 'bit' })
                    void navigate({ href: `/bits?bit=${it.bit.id}` })
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
              ) : it.kind === 'toasts' ? (
                <div key={`t${it.toast.id}`} className="fd-post" style={{ gap: 8 }}>
                  <div className="fd-between" style={{ alignItems: 'flex-start' }}>
                    <Link to="/toasts/edit/$id" params={{ id: it.toast.id }} className="fd-hook" style={{ fontSize: 19, textDecoration: 'none', color: 'inherit' }} onClick={() => void trackEvent('creation_opened', { kind: 'toast' })}>
                      {(() => { const n = readNames(it.toast.id); return n ? toastTitle(it.toast.occasion, n) : `A ${OCCASION[it.toast.occasion].label} toast` })()}
                    </Link>
                    <span className="fd-pill" style={{ flex: 'none' }}>toast</span>
                  </div>
                  <span className="fd-faint">
                    {when(it.at)} · {OCCASION[it.toast.occasion].label} · {TOAST_TONE[it.toast.tone]} · {clock(it.toast.length)} · {it.toast.locked ? <b>locked · unlimited downloads</b> : <b>editing · downloads open when you lock</b>}{it.toast.marked ? ' · free (marked)' : ''}
                  </span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Link to="/toasts/edit/$id" params={{ id: it.toast.id }} className="fd-btn sm">{it.toast.locked ? 'open' : 'keep editing'}</Link>
                    {it.toast.locked && (
                      <>
                        <button type="button" className="fd-btn sm ghost" onClick={() => void toastGet(it.toast, 'speech')}>speech PDF</button>
                        <button type="button" className="fd-btn sm ghost" onClick={() => void toastGet(it.toast, 'cue_cards')}>cue cards</button>
                        {OCCASION[it.toast.occasion].keepsake && <button type="button" className="fd-btn sm ghost" onClick={() => void toastGet(it.toast, 'keepsake')}>keepsake</button>}
                        <button type="button" className="fd-btn sm ghost" onClick={() => void toastGet(it.toast, 'prompter')}>prompter</button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <Link
                  key={`k${it.kit.id}`}
                  to="/realtors"
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
