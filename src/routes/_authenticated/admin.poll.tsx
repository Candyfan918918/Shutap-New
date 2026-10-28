import { pageMeta } from '@/lib/seo/page-meta'
// Homepage poll: counts per option, the sign-in funnel, and who picked what
// (name, email, follow-up) so they can be emailed. Admin-only; every number
// comes from real rows.
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { AdminShell } from '@/components/AdminShell'
import { adminPollReport, adminSetPollEmailed, adminSetPollOpen, type AdminPollReport, type AdminPollVoter } from '@/lib/poll.functions'
import { POLL, pollDate, pollOption, type PollOptionKey } from '@/lib/poll'

export const Route = createFileRoute('/_authenticated/admin/poll')({
  head: () => ({ meta: [...pageMeta('Admin · Poll — Shutap', 'Review homepage poll votes and follow-up answers in the private administration area.', '/admin/poll'), { name: 'robots', content: 'noindex' }] }),
  component: () => (
    <div data-ph-private style={{ display: 'contents' }}>
      <AdminPollPage />
    </div>
  ),
})

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

function csvCell(v: string | null | undefined): string {
  const s = v ?? ''
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(rows: AdminPollVoter[]): string {
  const head = ['name', 'email', 'signed in with', 'pick', 'follow-up', 'changed from', 'voted', 'last change', 'emailed']
  const body = rows.map((r) => [
    r.name, r.email, r.provider, pollOption(r.option)?.label, r.followUp,
    r.previousOption ? pollOption(r.previousOption)?.label : '', r.votedAt, r.updatedAt, r.emailedAt ?? '',
  ].map(csvCell).join(','))
  return [head.join(','), ...body].join('\n')
}

function AdminPollPage() {
  const load = useServerFn(adminPollReport)
  const setEmailed = useServerFn(adminSetPollEmailed)
  const setOpen = useServerFn(adminSetPollOpen)
  const [data, setData] = useState<AdminPollReport | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | PollOptionKey>('all')
  const [onlyNotEmailed, setOnlyNotEmailed] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setData(await load())
      setErr(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
    }
  }, [load])

  useEffect(() => { void refresh() }, [refresh])

  const rows = useMemo(() => {
    if (!data) return []
    return data.voters.filter((v) => (filter === 'all' || v.option === filter) && (!onlyNotEmailed || (!v.emailedAt && !v.doNotContact)))
  }, [data, filter, onlyNotEmailed])

  async function toggleEmailed(v: AdminPollVoter) {
    try {
      const r = await setEmailed({ data: { userId: v.userId, emailed: !v.emailedAt } })
      setData((d) => d && { ...d, voters: d.voters.map((x) => (x.userId === v.userId ? { ...x, emailedAt: r.emailedAt } : x)) })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'update failed')
    }
  }

  async function toggleOpen() {
    if (!data) return
    if (data.open && !window.confirm('Close voting? The poll disappears from the homepage.')) return
    try {
      await setOpen({ data: { open: !data.open } })
      await refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'update failed')
    }
  }

  function exportCsv() {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shutap-poll-${filter}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminShell
      title="poll"
      subtitle={data ? `${POLL.title} · voting opened ${pollDate(data.openedAt)} · ${data.open ? 'open' : `closed ${data.closesAt ? pollDate(data.closesAt) : ''}`} · ${data.total} ${data.total === 1 ? 'vote' : 'votes'}` : POLL.title}
      right={
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={exportCsv} disabled={!rows.length} style={btn}>export csv</button>
          <button type="button" onClick={() => void toggleOpen()} disabled={!data} style={btn}>{data?.open === false ? 'reopen poll' : 'close poll'}</button>
        </div>
      }
    >
      {err && <div style={{ color: '#c1216b', marginBottom: 12 }}>{err}</div>}
      {!data ? (
        <div style={{ color: '#443c42' }}>loading…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
            {data.options.map((o) => (
              <div key={o.key} style={card}>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, minHeight: 36 }}>{o.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10 }}>
                  <span style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{o.count}</span>
                  <span style={{ fontSize: 13, color: '#6b4a5c' }}>{data.total ? `${o.pct}%` : '—'}</span>
                </div>
                <div style={{ fontSize: 12, color: '#6b4a5c', marginTop: 6 }}>top follow-up: {o.topFollowUp ?? '—'}</div>
              </div>
            ))}
          </div>

          <h2 style={h2}>does the poll drive sign-ins? <span style={{ fontWeight: 500, color: '#6b4a5c', fontSize: 12 }}>browser sessions since voting opened</span></h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {data.funnel.map((f) => (
              <div key={f.step} style={{ ...card, background: '#f7f6f4', border: 0 }}>
                <div style={{ fontSize: 12, color: '#6b4a5c' }}>{f.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{f.sessions}</div>
              </div>
            ))}
          </div>

          <h2 style={h2}>what they tapped <span style={{ fontWeight: 500, color: '#6b4a5c', fontSize: 12 }}>every tap, voted or not · browser sessions since voting opened</span></h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
            {data.taps.map((t) => (
              <div key={t.key} style={card}>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, minHeight: 36 }}>{t.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 10, fontVariantNumeric: 'tabular-nums' }}>{t.sessions}</div>
                <div style={{ fontSize: 12, color: '#6b4a5c', marginTop: 6 }}>{t.guests} not signed in · {t.signedIn} signed in</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
            <h2 style={{ ...h2, margin: 0 }}>who picked what</h2>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', fontSize: 13, color: '#443c42' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                pick
                <select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | PollOptionKey)} style={select}>
                  <option value="all">all</option>
                  {POLL.options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={onlyNotEmailed} onChange={(e) => setOnlyNotEmailed(e.target.checked)} />
                not emailed yet
              </label>
            </div>
          </div>

          <div style={{ border: '.5px solid rgba(11,8,15,.12)', borderRadius: 14, overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['person', 'signed in with', 'pick', 'follow-up', 'changed from', 'voted', 'emailed'].map((h) => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7} style={{ ...td, color: '#6b4a5c', fontStyle: 'italic' }}>no votes yet</td></tr>
                ) : rows.map((v) => (
                  <tr key={v.userId}>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{v.name ?? '—'}</div>
                      <div style={{ fontSize: 12, color: '#6b4a5c' }}>{v.email ?? 'no email'}</div>
                    </td>
                    <td style={{ ...td, color: '#6b4a5c' }}>{v.provider ?? '—'}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{pollOption(v.option)?.label}</td>
                    <td style={td}>{v.followUp ? <span style={{ padding: '3px 10px', borderRadius: 999, background: '#f7f6f4' }}>{v.followUp}</span> : <span style={{ color: '#6b4a5c' }}>—</span>}</td>
                    <td style={{ ...td, color: '#6b4a5c' }}>{v.previousOption ? pollOption(v.previousOption)?.label : '—'}</td>
                    <td style={{ ...td, color: '#6b4a5c', whiteSpace: 'nowrap' }}>{when(v.votedAt)}</td>
                    <td style={td}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                        {v.doNotContact
                          ? <span style={{ color: '#6b4a5c', fontSize: 12 }}>never contact</span>
                          : <input type="checkbox" checked={!!v.emailedAt} onChange={() => void toggleEmailed(v)} aria-label={`emailed ${v.name ?? v.email ?? 'this voter'}`} />}
                        <span style={{ color: '#6b4a5c', fontSize: 12 }}>{v.emailedAt ? pollDate(v.emailedAt) : ''}</span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminShell>
  )
}

const btn: React.CSSProperties = { minHeight: 36, padding: '0 14px', borderRadius: 999, border: '.5px solid rgba(11,8,15,.16)', background: '#fff', color: '#0b080f', fontFamily: "'Sora',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }
const card: React.CSSProperties = { background: '#fff', border: '.5px solid rgba(11,8,15,.10)', borderRadius: 14, padding: 16 }
const h2: React.CSSProperties = { fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, color: '#0b080f', margin: '0 0 10px' }
const select: React.CSSProperties = { minHeight: 34, padding: '0 10px', borderRadius: 10, border: '.5px solid rgba(11,8,15,.16)', background: '#fff', color: '#0b080f', fontFamily: "'Sora',sans-serif", fontSize: 12 }
const th: React.CSSProperties = { textAlign: 'left', padding: '12px 14px', fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6b4a5c', borderBottom: '.5px solid rgba(11,8,15,.10)' }
const td: React.CSSProperties = { padding: '12px 14px', borderBottom: '.5px solid rgba(11,8,15,.06)', verticalAlign: 'top' }
