import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { adminListEvents } from '@/lib/admin.functions'
import { AdminShell } from '@/components/AdminShell'

export const Route = createFileRoute('/_authenticated/admin/events')({
  head: () => ({ meta: [{ title: 'Admin · Events — Shutap' }, { name: 'robots', content: 'noindex' }] }),
  component: AdminEventsPage,
})

interface EventRow {
  id: string
  user_id: string | null
  session_id: string | null
  ts: string
  name: string
  properties: Record<string, unknown>
}

function AdminEventsPage() {
  const load = useServerFn(adminListEvents)
  const [rows, setRows] = useState<EventRow[] | null>(null)
  const [name, setName] = useState('')
  const [userId, setUserId] = useState('')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const r = await load({ data: { name: name || undefined, user_id: userId || undefined, limit: 200 } })
        if (!dead) setRows(r as EventRow[])
      } catch (e) {
        if (!dead) setErr(e instanceof Error ? e.message : 'load failed')
      }
    })()
    return () => { dead = true }
  }, [load, name, userId])

  return (
    <AdminShell title="events">
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="event name (e.g. spill_created)" style={inp} />
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="user id (uuid)" style={inp} />
      </div>
      {err && <div style={{ color: '#17131a', marginBottom: 12 }}>{err}</div>}
      {!rows ? (
        <div style={{ color: '#443c42' }}>loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ color: '#443c42', fontStyle: 'italic' }}>no events</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, border: '.5px solid rgba(11,8,15,.08)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#ffffff', textAlign: 'left', color: '#443c42' }}>
                <th style={th}>time</th>
                <th style={th}>event</th>
                <th style={th}>user</th>
                <th style={th}>props</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: '.5px solid rgba(11,8,15,.05)' }}>
                  <td style={td}>{new Date(r.ts).toLocaleString()}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{r.name}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 11 }}>{r.user_id || '—'}</td>
                  <td style={{ ...td, fontFamily: 'monospace', fontSize: 11, maxWidth: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{JSON.stringify(r.properties)}</td>
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
const td: React.CSSProperties = { padding: '10px 12px', color: '#100c14' }
const inp: React.CSSProperties = { flex: 1, padding: '10px 14px', border: '1px solid rgba(11,8,15,.12)', borderRadius: 10 }
