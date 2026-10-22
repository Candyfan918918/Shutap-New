// Product section of /admin: bits, sign-ins, DAU/MAU, repeat use,
// free vs paying, engagement, and a per-user table.
import { useEffect, useMemo, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { adminProductMetrics, type ProductMetrics, type ProductUserRow } from '@/lib/admin-product.functions'

const INK = '#0b080f'
const DIM = '#6f666c'
const MID = '#443c42'

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch { return '—' }
}
const n = (v: number | null | undefined, suffix = '') => (v == null ? '—' : `${v}${suffix}`)

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={tile}>
      <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: DIM }}>{label}</div>
      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 800, color: INK, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: MID, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Series({ title, rows, unit }: { title: string; rows: Array<{ date: string; n: number }>; unit: string }) {
  const max = rows.reduce((m, p) => Math.max(m, p.n), 0)
  const total = rows.reduce((s, p) => s + p.n, 0)
  return (
    <div style={panel}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <h3 style={panelH3}>{title}</h3>
        <span style={{ fontSize: 11, color: DIM }}>peak {max} · {total} {unit} in 30d</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 72 }}>
        {rows.map((p) => (
          <div
            key={p.date}
            title={`${p.date}: ${p.n}`}
            style={{ flex: 1, minWidth: 2, borderRadius: 2, background: p.n > 0 ? '#17131a' : '#f1ecef', height: max > 0 ? Math.max(2, Math.round((p.n / max) * 72)) : 2 }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: DIM, marginTop: 4 }}>
        <span>{rows[0]?.date}</span><span>{rows[rows.length - 1]?.date}</span>
      </div>
    </div>
  )
}

type SortKey = 'runs_today' | 'runs_total' | 'last_sign_in' | 'first_sign_in' | 'sign_ins' | 'bits' | 'rewrites' | 'last_bit_at' | 'active_days_30d' | 'plan'

function UserTable({ rows }: { rows: ProductUserRow[] }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortKey>('last_sign_in')
  const [desc, setDesc] = useState(true)
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const filtered = needle
      ? rows.filter((r) => `${r.name ?? ''} ${r.email ?? ''}`.toLowerCase().includes(needle))
      : rows
    const val = (r: ProductUserRow): string | number => {
      const v = r[sort]
      return v == null ? '' : v
    }
    return [...filtered].sort((a, b) => {
      const x = val(a), y = val(b)
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
      return desc ? -c : c
    })
  }, [rows, q, sort, desc])

  const Th = ({ k, label }: { k?: SortKey; label: string }) => (
    <th
      style={{ ...th, cursor: k ? 'pointer' : 'default', userSelect: 'none' }}
      onClick={k ? () => { if (sort === k) setDesc(!desc); else { setSort(k); setDesc(true) } } : undefined}
    >
      {label} {k && sort === k ? (desc ? '↓' : '↑') : ''}
    </th>
  )

  return (
    <div style={panel}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <h3 style={{ ...panelH3, margin: 0 }}>signed-in users · {rows.length}</h3>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search name or email…"
          style={{ marginLeft: 'auto', minWidth: 220, padding: '8px 12px', border: '1px solid rgba(11,8,15,.12)', borderRadius: 10, fontSize: 13 }}
        />
      </div>
      {rows.length === 0 ? (
        <div style={empty}>no signed-in users yet</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={table}>
            <thead>
              <tr style={{ textAlign: 'left', color: MID }}>
                <Th label="user" />
                <Th label="provider" />
                <Th k="first_sign_in" label="first sign-in" />
                <Th k="last_sign_in" label="last sign-in" />
                <Th k="sign_ins" label="sign-ins" />
                <Th k="runs_today" label="runs · today" />
                <Th k="runs_total" label="runs · total" />
                <Th k="bits" label="bits" />
                <Th k="rewrites" label="rewrites" />
                <Th k="last_bit_at" label="last bit" />
                <Th k="active_days_30d" label="active days · 30d" />
                <Th k="plan" label="plan" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.user_id} style={tr}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{r.name || '—'}{r.is_admin && <span style={{ color: DIM, fontWeight: 400 }}> · admin</span>}</div>
                    <div style={{ color: DIM, fontSize: 12 }}>{r.email || '—'}</div>
                  </td>
                  <td style={td}>{r.provider || '—'}</td>
                  <td style={td}>{fmtDate(r.first_sign_in)}</td>
                  <td style={td}>{fmtDate(r.last_sign_in)}</td>
                  <td style={num}>{r.sign_ins}</td>
                  <td style={{ ...num, fontWeight: r.runs_today > 0 ? 700 : 400 }}>{r.runs_today}</td>
                  <td style={num}>{r.runs_total}</td>
                  <td style={num}>{r.bits}</td>
                  <td style={num}>{r.rewrites}</td>
                  <td style={td}>{fmtDate(r.last_bit_at)}</td>
                  <td style={num}>{r.active_days_30d}</td>
                  <td style={td}>
                    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: r.plan === 'free' ? '#f4f0f2' : '#17131a', color: r.plan === 'free' ? MID : '#fff' }}>{r.plan}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function AdminProductSection() {
  const load = useServerFn(adminProductMetrics)
  const [includeAdmins, setIncludeAdmins] = useState(false)
  const [m, setM] = useState<ProductMetrics | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let dead = false
    setErr(null)
    ;(async () => {
      try {
        const r = await load({ data: { include_admins: includeAdmins } })
        if (!dead) setM(r as ProductMetrics)
      } catch (e) {
        if (!dead) setErr(e instanceof Error ? e.message : 'load failed')
      }
    })()
    return () => { dead = true }
  }, [load, includeAdmins])

  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <h2 style={{ ...sectionH2, margin: 0 }}>product</h2>
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: MID }}>
          <input type="checkbox" checked={includeAdmins} onChange={(e) => setIncludeAdmins(e.target.checked)} />
          include admin accounts
        </label>
      </div>
      {err && <div style={{ color: '#17131a', marginBottom: 12 }}>{err}</div>}
      {!m ? (
        !err && <div style={{ color: MID }}>loading…</div>
      ) : (
        <>
          <h3 style={groupH}>runs</h3>
          <div style={grid}>
            <Tile label="runs · today" value={m.runs.today} sub={`${m.runs.today_split.signed_in} signed-in · ${m.runs.today_split.guest} guest`} />
            <Tile label="people running today" value={m.runs.users_today} sub="signed-in users" />
            <Tile label="today's mix" value={`${m.runs.today_split.bits} / ${m.runs.today_split.rewrites} / ${m.runs.today_split.failed}`} sub="new bits / rewrites / failed" />
            <Tile label="runs · all time" value={m.runs.total} sub={`${m.runs.total_split.signed_in} signed-in · ${m.runs.total_split.guest} guest`} />
            <Tile label="all-time mix" value={`${m.runs.total_split.bits} / ${m.runs.total_split.rewrites} / ${m.runs.total_split.failed}`} sub="new bits / rewrites / failed" />
          </div>

          <h3 style={groupH}>bits</h3>
          <div style={grid}>
            <Tile label="bits · all time" value={m.bits.total} sub={`${m.bits.d1} today · ${m.bits.d7} · 7d`} />
            <Tile label="bits · 30d" value={m.bits.d30} sub={`${m.bits.signed_in_30d} signed-in · ${m.bits.guest_30d} guest`} />
            <Tile label="rewrites" value={m.bits.rewrites_total} sub={`${m.bits.rewrites_30d} · 30d · ${n(m.bits.rewrites_per_bit)} per bit`} />
            <Tile label="bits reworked" value={n(m.bits.pct_bits_reworked, '%')} sub="got at least one rewrite" />
            <Tile label="posted to rooms" value={m.bits.posted_total} />
            <Tile label="write success · 7d" value={n(m.bits.success_rate_7d, '%')} sub={`${m.bits.failures_7d} failed`} />
          </div>

          <h3 style={groupH}>users</h3>
          <div style={grid}>
            <Tile label="signed-in users" value={m.users.signed_in_total} sub={`${m.users.new_7d} new · 7d · ${m.users.new_30d} · 30d`} />
            <Tile label="paying" value={m.users.paying} sub={`${m.users.trialing} trialing · ${m.users.cancelling} cancelling`} />
            <Tile label="free" value={m.users.free} />
            <Tile label="made a bit" value={m.engagement.activated} sub={`${n(m.engagement.activation_pct, '%')} of signed-in users`} />
          </div>

          <h3 style={groupH}>activity · signed-in users</h3>
          <div style={grid}>
            <Tile label="dau" value={m.activity.dau} sub={`${m.activity.makers_dau} made a bit`} />
            <Tile label="wau" value={m.activity.wau} sub={`${m.activity.makers_wau} made a bit`} />
            <Tile label="mau" value={m.activity.mau} sub={`${m.activity.makers_mau} made a bit`} />
            <Tile label="dau / mau" value={n(m.activity.stickiness_pct, '%')} />
          </div>

          <h3 style={groupH}>repeat use</h3>
          <div style={grid}>
            <Tile label="active 2+ days · 30d" value={m.repeat.active_2plus_days_30d} sub={`${n(m.repeat.pct_of_mau, '%')} of mau`} />
            <Tile label="came back after sign-up" value={m.repeat.came_back_after_signup} sub="active on a later day · 30d" />
            <Tile label="made 2+ bits" value={m.repeat.makers_2plus_bits} sub={`median ${n(m.engagement.median_bits_per_maker)} per maker`} />
            <Tile label="signed in 2+ times" value={m.repeat.signed_in_2plus_times} />
            <Tile label="bits per mau user" value={n(m.engagement.bits_per_active_user_30d)} sub="signed-in bits · 30d" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, margin: '20px 0 16px' }}>
            <Series title="bits per day" rows={m.bits.series30d} unit="bits" />
            <Series title="active signed-in users per day" rows={m.activity.series30d} unit="user-days" />
          </div>

          <UserTable rows={m.user_rows} />

          <p style={{ fontSize: 11, color: DIM, marginTop: 10, lineHeight: 1.6 }}>
            A run = one press of write or rewrite: a new bit, a rewrite, or an attempt that failed. Today = today in {m.timezone}.
            Active = a signed-in user who wrote a bit, rewrote one, fired an event or opened a visit. Days are {m.timezone} calendar days; dau / wau / mau are the last 24h / 7d / 30d.
            Paying = live Stripe subscription that is active or past due; sandbox subscriptions ({m.users.sandbox_subs}) are not counted.
            {m.excluded_admins > 0 ? ` ${m.excluded_admins} admin account${m.excluded_admins === 1 ? ' is' : 's are'} left out of every number.` : ''}
            {' '}As of {fmtDate(m.generated_at)}.
          </p>
        </>
      )}
    </section>
  )
}

const sectionH2: React.CSSProperties = { fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, color: INK, margin: '0 0 12px 0', letterSpacing: '.02em' }
const groupH: React.CSSProperties = { fontFamily: "'Sora',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: DIM, margin: '18px 0 10px' }
const panelH3: React.CSSProperties = { fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: INK, margin: 0, letterSpacing: '.02em' }
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }
const tile: React.CSSProperties = { background: '#fff', border: '.5px solid rgba(11,8,15,.08)', borderRadius: 14, padding: 16 }
const panel: React.CSSProperties = { background: '#fff', border: '.5px solid rgba(11,8,15,.08)', borderRadius: 14, padding: 16 }
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }
const th: React.CSSProperties = { padding: '10px 12px', fontWeight: 600, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '10px 12px', color: '#100c14', whiteSpace: 'nowrap', verticalAlign: 'top' }
const num: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
const tr: React.CSSProperties = { borderTop: '.5px solid rgba(11,8,15,.05)' }
const empty: React.CSSProperties = { color: DIM, fontStyle: 'italic', padding: '8px 4px', fontSize: 13 }
