// Shutap Toasts (Nov 6 2026): one toast, private. Slice 2 shows the speech
// as written, with the names put back from this device; slice 3 makes this
// the editor (edit, funnier, lock) and the locked page. Signed in only;
// client-only, so it is disallowed in robots.txt.
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { pageMeta } from '@/lib/seo/page-meta'
import { useCurrentAlias } from '@/hooks/use-current-alias'
import { getMyToast, type ToastRow } from '@/lib/toasts.functions'
import { OCCASION, TONE_LABEL, clock, fromPlaceholders, toastSeconds, type Names } from '@/lib/toasts/shared'
import { readNames, saveNames } from '@/lib/toasts/names-store'
import '@/components/feed/feed.css'
import '@/pages/realtors/realtors.css'
import '@/pages/toasts/toasts.css'

export const Route = createFileRoute('/toasts/edit/$id')({
  ssr: false,
  head: () => ({ meta: [...pageMeta('Your toast — Shutap Toasts', 'Your toast.', '/toasts'), { name: 'robots', content: 'noindex' }] }),
  component: EditRoute,
})

function EditRoute() {
  const { id } = Route.useParams()
  return <div className="fd" data-ph-private style={{ display: 'contents' }}><ToastPage id={id} /></div>
}

function ToastPage({ id }: { id: string }) {
  const { userId, ready } = useCurrentAlias()
  const [row, setRow] = useState<ToastRow | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'not_found' | 'off' | 'signin'>('loading')
  const [names, setNames] = useState<Names | null>(null)
  const [ask, setAsk] = useState<Names>({ friend: '', partner: '', me: '' })

  useEffect(() => { setNames(readNames(id)) }, [id])
  useEffect(() => {
    if (!ready) return
    if (!userId) { setState('signin'); return }
    getMyToast({ data: { id } }).then((r) => { if (r.ok) { setRow(r.toast); setState('ok') } else setState(r.reason) }).catch(() => setState('not_found'))
  }, [ready, userId, id])

  if (state === 'loading') return <div className="rl"><div className="rl-col"><p className="rl-note">opening your toast…</p></div></div>
  if (state === 'signin') return <div className="rl"><div className="rl-col"><p className="rl-lead">Sign in to open your toast.</p><Link to="/welcome" className="rl-btn" style={{ alignSelf: 'center' }}>sign in</Link></div></div>
  if (state !== 'ok' || !row?.toast) return <div className="rl"><div className="rl-col"><p className="rl-lead">{state === 'off' ? 'Shutap Toasts opens soon.' : 'That toast isn’t here.'}</p><Link to="/toasts" className="rl-btn ghost" style={{ alignSelf: 'center' }}>write a toast</Link></div></div>

  const spec = OCCASION[row.occasion]
  // another device: the names are asked once, kept on this device only
  if (!names) {
    return (
      <div className="rl"><div className="rl-col">
        <h1 className="rl-h1" style={{ fontSize: 30 }}>Who's this toast for?</h1>
        <p className="rl-lead">Names stay on your devices, never with Shutap. This device doesn't have them yet.</p>
        <div className="rl-card">
          <label className="ts-field">{spec.who}<input className="rl-input" value={ask.friend} onChange={(e) => setAsk({ ...ask, friend: e.target.value })} /></label>
          {spec.partner && <label className="ts-field">who they're marrying<input className="rl-input" value={ask.partner ?? ''} onChange={(e) => setAsk({ ...ask, partner: e.target.value })} /></label>}
          <label className="ts-field">your first name<input className="rl-input" value={ask.me} onChange={(e) => setAsk({ ...ask, me: e.target.value })} /></label>
          <button type="button" className="rl-btn" disabled={!ask.friend.trim() || !ask.me.trim()} onClick={() => { saveNames(id, ask); setNames(ask) }}>show my toast</button>
        </div>
      </div></div>
    )
  }

  const t = row.toast
  const secs = toastSeconds(t.lines)
  let at = 0
  return (
    <div className="rl">
      <div className="rl-col">
        <div>
          <p className="rl-kicker">{spec.label} · {TONE_LABEL[row.tone]} · target {clock(row.length)}</p>
          <h1 className="rl-h1" style={{ fontSize: 34 }}>For {fromPlaceholders('{friend}', names)}{spec.partner ? ` & ${fromPlaceholders('{partner}', names)}` : ''}</h1>
          <p className="rl-lead">{clock(secs)} of {clock(row.length)} · editing, “funnier” on every line and lock come next. {row.marked ? 'Your free toast: every page ends “— shutap.com”.' : ''}</p>
        </div>
        <div className="rl-card" style={{ gap: 0 }}>
          {t.lines.map((l, k) => {
            const start = at
            at += toastSeconds([l])
            const mine = l.source === 'story' || l.source === 'true_thing'
            return (
              <div key={k} className="rl-item" style={{ gridTemplateColumns: '48px 1fr' }}>
                <span className="n" style={{ fontSize: 13 }}>{clock(start)}</span>
                <div>
                  <div className="meta">{fromPlaceholders(l.section, names)}</div>
                  <p className="rl-line" style={mine ? { background: '#f3f8f4', border: '2px solid #2f8a55' } : undefined}>
                    {fromPlaceholders(l.text, names)}
                    {l.pause && <b style={{ color: 'var(--rose)' }}> ‖</b>}
                    {l.laugh && <b style={{ color: 'var(--rose)', fontSize: 13 }}> (wait)</b>}
                    {l.glass && <b style={{ color: 'var(--rose)', fontSize: 13 }}> ↑ glasses</b>}
                  </p>
                  {l.note && <div className="rl-note" style={{ color: 'var(--rose-ink)' }}>{fromPlaceholders(l.note, names)}</div>}
                </div>
              </div>
            )
          })}
        </div>
        <Link to="/toasts" className="rl-btn ghost" style={{ alignSelf: 'center' }}>write another toast</Link>
      </div>
    </div>
  )
}
