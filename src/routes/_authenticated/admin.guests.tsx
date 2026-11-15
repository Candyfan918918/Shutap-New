import { pageMeta } from '@/lib/seo/page-meta'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { AdminShell } from '@/components/AdminShell'
import { adminGuests, type AdminGuestsResult } from '@/lib/admin-guests.functions'

export const Route = createFileRoute('/_authenticated/admin/guests')({
  head: () => ({ meta: [...pageMeta('Admin · Guests & conversion — Shutap', 'Guest engagement, sign-up conversion, paywall and payments in the private admin area.', '/admin/guests'), { name: 'robots', content: 'noindex' }] }),
  component: AdminGuestsPage,
})

type Days = 1 | 7 | 14 | 30
const RANGES: Array<{ days: Days; label: string }> = [
  { days: 1, label: 'today' },
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
]

const ink = '#100c14'
const dim = '#443c42'
const blue = '#2f4fb8'
const warn = '#b3400f'

const card: React.CSSProperties = { background: '#fff', border: '.5px solid rgba(11,8,15,.1)', borderRadius: 14, padding: 20, overflowX: 'auto', minWidth: 0 }
const h2: React.CSSProperties = { margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: ink }
const sub: React.CSSProperties = { margin: '0 0 12px', fontSize: 12, color: dim }
const th: React.CSSProperties = { textAlign: 'left', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: dim, fontWeight: 600, padding: '8px 10px', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '9px 10px', borderTop: '.5px solid rgba(11,8,15,.08)', fontSize: 13, color: ink, whiteSpace: 'nowrap' }
const num: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }

const n = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('en-US'))
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 1000) / 10}%` : '—')
const when = (s: string) => {
  try { return new Date(s).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return s }
}

function Table({ head, rows, numeric = [] }: { head: string[]; rows: React.ReactNode[][]; numeric?: number[] }) {
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
      <thead><tr>{head.map((h, i) => <th key={i} style={numeric.includes(i) ? { ...th, textAlign: 'right' } : th}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.length === 0
          ? <tr><td style={{ ...td, color: dim, fontStyle: 'italic' }} colSpan={head.length}>nothing in this window</td></tr>
          : rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={numeric.includes(j) ? num : td}>{c}</td>)}</tr>)}
      </tbody>
    </table>
  )
}

function AdminGuestsPage() {
  const load = useServerFn(adminGuests)
  const [days, setDays] = useState<Days>(14)
  const [r, setR] = useState<AdminGuestsResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let dead = false
    setErr(null)
    setLoading(true)
    load({ data: { days } })
      .then((x) => { if (!dead) setR(x) })
      .catch((e) => {
        if (dead) return
        const m = e instanceof Error ? e.message : 'Unable to load. Try again.'
        setErr(m === 'Forbidden' ? 'This account does not have admin access.' : m)
      })
      .finally(() => { if (!dead) setLoading(false) })
    return () => { dead = true }
  }, [load, days])

  const range = (
    <div role="group" aria-label="date range" style={{ display: 'flex', gap: 4, background: '#f3f1ef', borderRadius: 10, padding: 4 }}>
      {RANGES.map((x) => (
        <button
          key={x.days}
          type="button"
          aria-pressed={days === x.days}
          onClick={() => setDays(x.days)}
          style={{ border: 0, background: days === x.days ? '#fff' : 'transparent', padding: '8px 12px', borderRadius: 8, font: 'inherit', fontSize: 13, fontWeight: days === x.days ? 600 : 400, color: ink, minHeight: 36, cursor: 'pointer' }}
        >
          {x.label}
        </button>
      ))}
    </div>
  )

  return (
    <AdminShell
      title="guests & conversion"
      subtitle="people before they sign up, what they do, where they leave, and what happens at the paywall and checkout · bots and your own browsers excluded"
      right={range}
    >
      {err && <div style={{ color: warn, marginBottom: 12 }}>{err}</div>}
      {!r && !err && <div style={{ color: dim }}>loading…</div>}
      {r && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, opacity: loading ? 0.5 : 1, transition: 'opacity .15s' }}>
          <Funnel r={r} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
            <Leave r={r} />
            <Actions r={r} />
            <Signups r={r} />
            <Paywall r={r} />
            <Payments r={r} />
          </div>
        </div>
      )}
    </AdminShell>
  )
}

function Funnel({ r }: { r: AdminGuestsResult }) {
  const top = r.funnel[0]?.n ?? 0
  return (
    <section style={card}>
      <h2 style={h2}>1 · guest funnel</h2>
      <p style={sub}>unique guest visits (browser sessions) · “got a bit back” counts from Nov 14, 2026</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 260px) 1fr 80px 110px', gap: '10px 14px', alignItems: 'center', fontSize: 13 }}>
        {r.funnel.map((s, i) => {
          const prev = i > 0 ? r.funnel[i - 1].n : 0
          const w = top > 0 ? Math.max(0.4, (s.n / top) * 100) : 0
          return (
            <FunnelRow key={s.key} label={s.label} w={w} n={s.n} note={i === 0 ? '' : s.key === 'signed_up' ? `${pct(s.n, top)} of landed` : s.key === 'asked' || s.key === 'started' ? '' : pct(s.n, prev)} />
          )
        })}
      </div>
    </section>
  )
}

function FunnelRow({ label, w, n: v, note }: { label: string; w: number; n: number; note: string }) {
  return (
    <>
      <div>{label}</div>
      <div style={{ background: '#f3f1ef', borderRadius: 4, height: 18 }}><div style={{ background: blue, height: 18, borderRadius: 4, width: `${w}%` }} /></div>
      <div style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{n(v)}</div>
      <div style={{ color: dim }}>{note}</div>
    </>
  )
}

function Leave({ r }: { r: AdminGuestsResult }) {
  const landed = r.funnel[0]?.n ?? 0
  return (
    <section style={card}>
      <h2 style={h2}>2 · where guests land and leave</h2>
      <p style={sub}>{n(r.bounced)} of {n(landed)} visits ({pct(r.bounced, landed)}) saw one page and did nothing</p>
      <Table
        head={['landing page', 'visits', 'did something', 'signed up']}
        numeric={[1, 2, 3]}
        rows={r.landing.map((l) => [l.path, n(l.visits), pct(l.engaged, l.visits), n(l.signed_up)])}
      />
      <h3 style={{ margin: '18px 0 8px', fontSize: 13, fontWeight: 600 }}>last thing before leaving (didn’t sign up)</h3>
      <Table
        head={['step', 'visits']}
        numeric={[1]}
        rows={r.last_step.map((s) => {
          const hot = s.label.startsWith('started sign-up')
          return [<span style={hot ? { color: warn, fontWeight: 600 } : undefined}>{s.label}</span>, <span style={hot ? { color: warn, fontWeight: 600 } : undefined}>{n(s.n)}</span>]
        })}
      />
    </section>
  )
}

function Actions({ r }: { r: AdminGuestsResult }) {
  return (
    <section style={card}>
      <h2 style={h2}>3 · what guests did</h2>
      <p style={sub}>unique guest visits that took each action · views that fire on their own are listed apart</p>
      <Table
        head={['action', 'guests', 'signed up after']}
        numeric={[1, 2]}
        rows={r.actions.map((a) => [a.label, n(a.guests), `${n(a.signed_up_after)} (${pct(a.signed_up_after, a.guests)})`])}
      />
      {r.views.length > 0 && (
        <p style={{ margin: '12px 0 0', fontSize: 12, color: dim }}>views only: {r.views.map((v) => `${v.label} ${n(v.n)}`).join(' · ')}</p>
      )}
    </section>
  )
}

function Signups({ r }: { r: AdminGuestsResult }) {
  const s = r.signup
  return (
    <section style={card}>
      <h2 style={h2}>4 · what drove the {n(s.total)} sign-ups</h2>
      <p style={sub}>the last sign-up prompt they saw before signing up, and where the visit came from</p>
      <Table
        head={['sign-up came from', 'sign-ups', 'prompt shown', 'rate']}
        numeric={[1, 2, 3]}
        rows={s.drivers.map((d) => [d.label, n(d.signups), d.prompted == null ? '—' : n(d.prompted), d.rate_pct == null ? '—' : `${d.rate_pct}%`])}
      />
      <div style={{ marginTop: 14 }}>
        <Table head={['source', 'sign-ups']} numeric={[1]} rows={s.sources.map((x) => [x.label, n(x.n)])} />
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 12, color: dim }}>
        started sign-up and left: <b style={{ color: warn }}>{n(s.abandoned_signin)}</b> · sign-in return failed: <b style={{ color: s.signin_return_failed ? warn : ink }}>{n(s.signin_return_failed)}</b>
      </p>
    </section>
  )
}

function Paywall({ r }: { r: AdminGuestsResult }) {
  const p = r.paywall
  return (
    <section style={card}>
      <h2 style={h2}>5 · paywall</h2>
      <p style={sub}>signed-in people · unique people per step · “closed” counts from Nov 14, 2026</p>
      <Table
        head={['what showed it', 'saw it', 'tapped a plan', 'opened checkout', 'paid', 'closed']}
        numeric={[1, 2, 3, 4, 5]}
        rows={[
          ...p.rows.map((x) => [x.label, n(x.seen), n(x.chose), n(x.checkout), n(x.paid), n(x.closed)]),
          ...(p.rows.length ? [[<b>total</b>, <b>{n(p.total.seen)}</b>, <b>{n(p.total.chose)}</b>, <b>{n(p.total.checkout)}</b>, <b>{n(p.total.paid)}</b>, <b>{n(p.total.closed)}</b>]] : []),
        ]}
      />
      <p style={{ margin: '12px 0 0', fontSize: 12, color: dim }}>went to /pricing after seeing the paywall: {n(p.to_pricing)}</p>
    </section>
  )
}

function Payments({ r }: { r: AdminGuestsResult }) {
  const p = r.payments
  return (
    <section style={card}>
      <h2 style={h2}>6 · checkout &amp; payment problems</h2>
      <p style={sub}>from Stripe, live payments only · problems count from Nov 14, 2026</p>
      <Table
        head={['problem', 'count', 'who']}
        numeric={[1]}
        rows={[
          ['opened checkout, didn’t pay', n(p.abandoned_checkout.length), p.abandoned_checkout.slice(0, 5).map((a) => `${a.who}${a.plan ? ` · ${a.plan}` : ''} · ${when(a.at)}`).join('\n') || '—'],
          ...p.problems.map((x) => [x.label, n(x.n), x.list.slice(0, 5).map((l) => `${l.who}${l.amount != null ? ` · $${l.amount}` : ''}${l.reason ? ` · ${l.reason}` : ''} · ${when(l.at)}`).join('\n') || '—']),
        ].map((row) => row.map((c, i) => (i === 2 ? <span style={{ whiteSpace: 'pre-line' }}>{c}</span> : c)))}
      />
      <p style={{ margin: '12px 0 0', fontSize: 12, color: dim }}>active plans {n(p.active_plans)} · canceled {n(p.canceled_plans)}</p>
    </section>
  )
}
