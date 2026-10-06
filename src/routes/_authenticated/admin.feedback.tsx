// Feedback summary — real feedback_events roll-up (loved / friction / questions).
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { getFeedbackSummary, type FeedbackSummary } from '@/lib/feedback-summary.functions'
import { AdminShell } from '@/components/AdminShell'

export const Route = createFileRoute('/_authenticated/admin/feedback')({
  head: () => ({ meta: [{ title: 'Admin · Feedback — Shutap' }, { name: 'robots', content: 'noindex' }] }),
  component: AdminFeedbackPage,
})

function AdminFeedbackPage() {
  const load = useServerFn(getFeedbackSummary)
  const [days, setDays] = useState<7 | 14 | 30>(7)
  const [data, setData] = useState<FeedbackSummary | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const r = await load({ data: { windowDays: days } })
        if (!dead) setData(r as FeedbackSummary)
      } catch (e) {
        if (!dead) setErr(e instanceof Error ? e.message : 'load failed')
      }
    })()
    return () => { dead = true }
  }, [load, days])

  return (
    <AdminShell
      title="feedback"
      subtitle="what people love, where they hit friction, questions they left. no fake counts."
      right={
        <div style={{ display: 'inline-flex', background: '#fff', border: '.5px solid rgba(11,8,15,.12)', borderRadius: 999, padding: 3 }}>
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d as 7 | 14 | 30)}
              style={{
                padding: '6px 14px', borderRadius: 999, border: 0,
                background: days === d ? '#17131a' : 'transparent',
                color: days === d ? '#fff' : '#443c42',
                fontFamily: "'Sora',sans-serif", fontSize: 11, fontWeight: 700,
                letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer',
              }}
            >{d}d</button>
          ))}
        </div>
      }
    >
      {err && <div style={{ color: '#17131a', marginBottom: 12 }}>{err}</div>}
      {!data ? (
        <div style={{ color: '#443c42' }}>loading…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 22 }}>
            <Card label="sentiment" value={`${data.sentiment}%`} sub="love / (love+friction)" />
            <Card label="loved" value={String(data.counts.love)} />
            <Card label="friction" value={String(data.counts.friction)} />
            <Card label="questions" value={String(data.counts.question)} />
            <Card label="total events" value={String(data.counts.total)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 22 }}>
            <Panel title="loved · top 12">
              <RankTable rows={data.loved} accent="#5b8a5e" />
            </Panel>
            <Panel title="friction · top 12">
              <RankTable rows={data.friction} accent="#17131a" />
            </Panel>
            <Panel title="events by type">
              <RankTable rows={data.byType} />
            </Panel>
          </div>

          <Panel title={`questions (${data.questions.length})`}>
            {data.questions.length === 0 ? (
              <div style={empty}>no questions in this window</div>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
                {data.questions.map((q, i) => (
                  <li key={i} style={{ borderTop: i === 0 ? 'none' : '.5px solid rgba(11,8,15,.06)', paddingTop: 10 }}>
                    <div style={{ fontSize: 13, color: '#100c14' }}>{q.text}</div>
                    <div style={{ fontSize: 11, color: '#6f666c', marginTop: 2 }}>{q.page || '—'} · {new Date(q.t).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </AdminShell>
  )
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: '#fff', border: '.5px solid rgba(11,8,15,.08)', borderRadius: 14, padding: 16 }}>
      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, color: '#0b080f' }}>{value}</div>
      <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#6f666c', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#443c42', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '.5px solid rgba(11,8,15,.08)', borderRadius: 14, padding: 16, overflow: 'auto' }}>
      <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: '#0b080f', margin: '0 0 12px 0', letterSpacing: '.02em' }}>{title}</h2>
      {children}
    </div>
  )
}

function RankTable({ rows, accent }: { rows: Array<{ key: string; n: number }>; accent?: string }) {
  if (rows.length === 0) return <div style={empty}>no data</div>
  const max = rows.reduce((m, r) => Math.max(m, r.n), 0)
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <tbody>
        {rows.map((r) => {
          const pct = max > 0 ? Math.max(2, Math.round((r.n / max) * 100)) : 0
          return (
            <tr key={r.key} style={{ borderTop: '.5px solid rgba(11,8,15,.05)' }}>
              <td style={{ padding: '8px 10px', color: '#100c14', width: '55%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{r.key}</td>
              <td style={{ padding: '8px 10px' }}>
                <div style={{ background: '#fdfbf9', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                  <div style={{ background: accent ?? '#17131a', height: '100%', width: `${pct}%` }} />
                </div>
              </td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', width: 40 }}>{r.n}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

const empty: React.CSSProperties = { color: '#6f666c', fontStyle: 'italic', padding: '8px 4px', fontSize: 13 }
