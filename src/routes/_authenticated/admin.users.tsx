import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { adminListUsers } from '@/lib/admin.functions'
import { AdminShell } from '@/components/AdminShell'

export const Route = createFileRoute('/_authenticated/admin/users')({
  head: () => ({ meta: [{ title: 'Admin · Users — Shutap' }, { name: 'robots', content: 'noindex' }] }),
  component: AdminUsersPage,
})

type SortCol = 'last_visit_at' | 'last_login_at' | 'signup_at' | 'visit_count' | 'login_count' | 'email'

interface Row {
  user_id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  full_name: string | null
  avatar_url: string | null
  provider: string | null
  is_anonymous: boolean
  signup_at: string | null
  first_visit_at: string
  last_visit_at: string
  last_login_at: string | null
  login_count: number
  visit_count: number
  last_country: string | null
  last_city: string | null
  alias: { display_name: string; emoji: string } | null
  stats: { spills: number; comments: number; reactions: number }
}

function fmt(d: string | null | undefined): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleString() } catch { return '—' }
}

function AdminUsersPage() {
  const load = useServerFn(adminListUsers)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [q, setQ] = useState('')
  const [includeAnon, setIncludeAnon] = useState(false)
  const [sort, setSort] = useState<SortCol>('last_visit_at')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const r = await load({ data: { q: q || undefined, include_anonymous: includeAnon, sort, dir } })
        if (!dead) setRows(r as Row[])
      } catch (e) {
        if (!dead) setErr(e instanceof Error ? e.message : 'load failed')
      }
    })()
    return () => { dead = true }
  }, [load, q, includeAnon, sort, dir])

  function toggleSort(col: SortCol) {
    if (sort === col) setDir(dir === 'desc' ? 'asc' : 'desc')
    else { setSort(col); setDir('desc') }
  }

  const sortableCols = useMemo(() => new Set<SortCol>(['last_visit_at', 'last_login_at', 'signup_at', 'visit_count', 'login_count', 'email']), [])

  const SortableTh = ({ col, label }: { col: SortCol; label: string }) => (
    <th style={{ ...th, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(col)} title="sort">
      {label} {sort === col ? (dir === 'desc' ? '↓' : '↑') : ''}
    </th>
  )
  const Th = ({ col, label }: { col: SortCol | string; label: string }) =>
    typeof col === 'string' && !sortableCols.has(col as SortCol)
      ? <th style={th}>{label}</th>
      : <SortableTh col={col as SortCol} label={label} />

  return (
    <AdminShell title="users">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="search email or name…"
          style={{ flex: 1, padding: '10px 14px', border: '1px solid rgba(11,8,15,.12)', borderRadius: 10 }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#443c42', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={includeAnon} onChange={(e) => setIncludeAnon(e.target.checked)} />
          show guests
        </label>
      </div>
      {err && <div style={{ color: '#17131a', marginBottom: 12 }}>{err}</div>}
      {!rows ? (
        <div style={{ color: '#443c42' }}>loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ color: '#443c42', fontStyle: 'italic' }}>no users yet</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '.5px solid rgba(11,8,15,.08)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#ffffff', textAlign: 'left', color: '#443c42' }}>
                <Th col="email" label="email" />
                <Th col="first_name" label="first" />
                <Th col="last_name" label="last" />
                <Th col="provider" label="provider" />
                <Th col="signup_at" label="signup" />
                <Th col="last_login_at" label="last login" />
                <Th col="last_visit_at" label="last use" />
                <Th col="login_count" label="logins" />
                <Th col="visit_count" label="visits" />
                <Th col="country" label="country" />
                <Th col="city" label="city" />
                <Th col="spills" label="spills" />
                <Th col="comments" label="comments" />
                <Th col="reactions" label="reactions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id} style={{ borderTop: '.5px solid rgba(11,8,15,.05)' }}>
                  <td style={td}>{r.email || (r.is_anonymous ? <span style={{ color: '#6f666c' }}>guest</span> : '—')}</td>
                  <td style={td}>{r.first_name || '—'}</td>
                  <td style={td}>{r.last_name || '—'}</td>
                  <td style={td}>{r.provider || (r.is_anonymous ? 'anon' : '—')}</td>
                  <td style={td}>{fmt(r.signup_at)}</td>
                  <td style={td}>{fmt(r.last_login_at)}</td>
                  <td style={td}>{fmt(r.last_visit_at)}</td>
                  <td style={td}>{r.login_count}</td>
                  <td style={td}>{r.visit_count}</td>
                  <td style={td}>{r.last_country || '—'}</td>
                  <td style={td}>{r.last_city || '—'}</td>
                  <td style={td}>{r.stats.spills}</td>
                  <td style={td}>{r.stats.comments}</td>
                  <td style={td}>{r.stats.reactions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  )
}

const th: React.CSSProperties = { padding: '10px 12px', fontWeight: 600, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase' }
const td: React.CSSProperties = { padding: '10px 12px', color: '#100c14', whiteSpace: 'nowrap' }
