// Relate SLA queue — auth-gated under /admin/relate.
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { listRelateQueue, relateQueueStats, type RelateQueueRow } from '@/lib/relate-queue.functions'
import { backfillEmbeddings } from '@/lib/embeddings-backfill.functions'
import { schedulerHealth, type SchedulerHealth } from '@/lib/scheduler-health.functions'
import { AdminShell } from '@/components/AdminShell'

export const Route = createFileRoute('/_authenticated/admin/relate')({
  head: () => ({ meta: [{ title: 'Admin · Relate SLA — Shutap' }, { name: 'robots', content: 'noindex' }] }),
  component: AdminRelatePage,
})

const PILLARS = ['all', 'relationships', 'marriage', 'family', 'career'] as const
type PillarFilter = (typeof PILLARS)[number]

function AdminRelatePage() {
  const list = useServerFn(listRelateQueue)
  const stats = useServerFn(relateQueueStats)
  const [rows, setRows] = useState<RelateQueueRow[]>([])
  const [sla, setSla] = useState(30)
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof relateQueueStats>> | null>(null)
  const [pillar, setPillar] = useState<PillarFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    setLoading(true)
    Promise.all([
      list({ data: pillar === 'all' ? { limit: 50 } : { pillar, limit: 50 } }),
      stats(),
    ])
      .then(([q, s]) => {
        if (cancel) return
        setRows(q.rows); setSla(q.sla_minutes); setSummary(s); setError(null)
      })
      .catch((e) => !cancel && setError(e instanceof Error ? e.message : 'failed'))
      .finally(() => !cancel && setLoading(false))
    return () => { cancel = true }
  }, [pillar, list, stats])

  const past = useMemo(() => rows.filter((r) => r.past_sla).length, [rows])

  return (
    <AdminShell
      title="relate SLA"
      subtitle={`every public spill without a human reaction yet. oldest first. target: real response within ${sla} min — no astroturf.`}
      right={<BackfillButton />}
    >
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
          <Stat label="7-day SLA hit-rate" value={`${summary.sla_pct}%`} sub={`${summary.within_sla} / ${summary.total_public_spills} spills`} />
          <Stat label="median first-response" value={summary.median_minutes_to_first_response != null ? `${summary.median_minutes_to_first_response} min` : '—'} sub="last 7 days" />
          <Stat label="open in queue" value={String(rows.length)} sub={`${past} past SLA`} accent={past > 0 ? '#17131a' : undefined} />
        </div>
      )}

      <SchedulerHealthCard />

      <div style={{ display: 'flex', gap: 8, margin: '22px 0 12px', flexWrap: 'wrap' }}>
        {PILLARS.map((p) => (
          <button key={p} onClick={() => setPillar(p)} style={chipStyle(p === pillar)}>{p}</button>
        ))}
      </div>

      {loading && <div style={{ color: '#443c42', fontSize: 14 }}>loading…</div>}
      {error && <div style={{ color: '#17131a', fontSize: 14 }}>error: {error}</div>}
      {!loading && !error && rows.length === 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, color: '#443c42', textAlign: 'center', border: '1px solid rgba(11,8,15,.08)' }}>
          no spills waiting. SLA is being met. 💚
        </div>
      )}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {rows.map((r) => <QueueCard key={r.situation_id} row={r} />)}
      </ul>
    </AdminShell>
  )
}

function QueueCard({ row }: { row: RelateQueueRow }) {
  return (
    <li style={{ background: '#fff', border: `1px solid ${row.past_sla ? 'rgba(23,19,26,.35)' : 'rgba(11,8,15,.08)'}`, borderRadius: 16, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 22 }}>{row.emoji}</span>
        <strong style={{ fontSize: 14 }}>{row.alias}</strong>
        <Badge color="#7f77dd">{row.pillar}</Badge>
        <Badge color={row.support === 'advice' ? '#c87c4a' : '#5b8a5e'}>{row.support === 'advice' ? 'wants advice' : 'wants to be heard'}</Badge>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: row.past_sla ? '#17131a' : '#6f666c', fontWeight: row.past_sla ? 600 : 400 }}>
          {row.past_sla ? `⚠ ${row.minutes_open} min · past SLA` : `${row.minutes_open} min ago`}
        </span>
      </div>
      {row.title && <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{row.title}</div>}
      <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.55, color: '#303030' }}>{row.body}</p>
      <Link to="/room" search={{ id: row.situation_id }} style={{ display: 'inline-block', background: '#0b080f', color: '#fff', textDecoration: 'none', padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600 }}>
        open & respond →
      </Link>
    </li>
  )
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(11,8,15,.08)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#6f666c' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: accent ?? '#0b080f', marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#443c42', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return <span style={{ background: color + '22', color, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, textTransform: 'lowercase', letterSpacing: 0.3 }}>{children}</span>
}

function BackfillButton() {
  const run = useServerFn(backfillEmbeddings)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <button
      onClick={async () => {
        setBusy(true); setMsg(null)
        try {
          const r = await run({ data: { limit: 50 } })
          setMsg(`+${r.embedded}/${r.scanned} · ${r.remaining} left`)
        } catch (e) {
          setMsg(e instanceof Error ? e.message : 'failed')
        } finally { setBusy(false) }
      }}
      disabled={busy}
      style={{ padding: '7px 14px', border: '1px solid rgba(11,8,15,.12)', background: '#fff', borderRadius: 999, cursor: 'pointer', fontWeight: 600, color: '#17131a', fontSize: 12 }}
      title="Backfill embeddings for situations missing a vector"
    >
      {busy ? 'embedding…' : msg ? `embed · ${msg}` : 'embed batch'}
    </button>
  )
}

function SchedulerHealthCard() {
  const run = useServerFn(schedulerHealth)
  const [h, setH] = useState<SchedulerHealth | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let cancel = false
    run()
      .then((r) => !cancel && setH(r))
      .catch((e) => !cancel && setErr(e instanceof Error ? e.message : 'failed'))
    return () => { cancel = true }
  }, [run])
  if (err) return <div style={{ marginTop: 16, fontSize: 13, color: '#17131a' }}>scheduler: {err}</div>
  if (!h) return null
  const overdueColor = h.scheduled_overdue > 10 ? '#17131a' : undefined
  return (
    <div style={{ marginTop: 16, padding: 14, background: '#fff', borderRadius: 14, border: '1px solid rgba(11,8,15,.08)' }}>
      <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: '#6f666c', marginBottom: 8 }}>
        retention scheduler · 24h
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
        <Stat label="sent" value={String(h.sent_24h)} />
        <Stat label="failed" value={String(h.failed_24h)} accent={h.failed_24h > 0 ? '#17131a' : undefined} />
        <Stat label="retrying" value={String(h.retrying)} />
        <Stat label="overdue" value={String(h.scheduled_overdue)} sub={h.oldest_overdue_minutes != null ? `oldest ${h.oldest_overdue_minutes}m` : undefined} accent={overdueColor} />
      </div>
    </div>
  )
}

const chipStyle = (active: boolean): React.CSSProperties => ({
  background: active ? '#0b080f' : '#fff',
  color: active ? '#fff' : '#443c42',
  border: `1px solid ${active ? '#0b080f' : 'rgba(11,8,15,.12)'}`,
  borderRadius: 999, padding: '6px 14px', fontSize: 13, cursor: 'pointer', textTransform: 'lowercase',
})
