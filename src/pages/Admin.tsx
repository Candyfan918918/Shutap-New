// Admin console — overview: product KPIs, response floor, scheduler health.
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import {
  adminNewRooms,
  adminNeedsResponse,
  adminLiquidityStats,
  adminProductKpis,
} from '@/lib/admin.functions'
import { schedulerHealth } from '@/lib/scheduler-health.functions'
import { AdminShell } from '@/components/AdminShell'

const CARD: React.CSSProperties = {
  background: '#181020',
  border: '.5px solid rgba(255,255,255,.08)',
  borderRadius: 14,
  padding: '18px 20px',
  color: '#e6e3e4',
}

type RoomListItem = {
  room_id: string
  situation_id: string
  title: string
  clean_text: string
  pillar: string | null
  initial_scan: number | null
  scan_band: string | null
  created_at: string
  age_hours: number
  human_relates: number
  human_comments: number
  companion_comments: number
}

function fmtAge(hours: number): string {
  if (hours < 1) return '<1h'
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function RoomRow({ r }: { r: RoomListItem }) {
  return (
    <a
      href={`/room?id=${encodeURIComponent(r.room_id)}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 90px 60px 60px 60px',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '.5px solid rgba(255,255,255,.06)',
        textDecoration: 'none',
        color: '#e6e3e4',
        alignItems: 'center',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 13.5, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
        <div style={{ fontSize: 11.5, color: '#6f666c' }}>
          {r.pillar || '—'} · {fmtAge(r.age_hours)} ago
        </div>
      </div>
      <span style={{ fontVariantNumeric: 'tabular-nums', color: '#e2dde0', textAlign: 'right', fontSize: 13 }}>
        {r.initial_scan ?? '—'}{r.scan_band ? ` · ${r.scan_band}` : ''}
      </span>
      <span style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right', fontSize: 13 }}>{r.human_relates}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right', fontSize: 13 }}>{r.human_comments}</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right', fontSize: 13, color: '#6f666c' }}>{r.companion_comments}</span>
    </a>
  )
}

function RoomTable({ title, rows, empty }: { title: string; rows: RoomListItem[] | undefined; empty: string }) {
  return (
    <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '.5px solid rgba(255,255,255,.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <b style={{ fontFamily: 'Sora,sans-serif', fontSize: 14 }}>{title}</b>
        <span style={{ fontSize: 11.5, color: '#6f666c' }}>{rows?.length ?? 0} rooms</span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 90px 60px 60px 60px',
        gap: 12,
        padding: '10px 16px',
        borderBottom: '.5px solid rgba(255,255,255,.06)',
        fontSize: 10.5,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        color: '#6f666c',
        fontFamily: 'Sora,sans-serif',
        fontWeight: 700,
      }}>
        <span>room</span>
        <span style={{ textAlign: 'right' }}>scan</span>
        <span style={{ textAlign: 'right' }}>relates</span>
        <span style={{ textAlign: 'right' }}>replies</span>
        <span style={{ textAlign: 'right' }}>ai</span>
      </div>
      {(!rows || rows.length === 0) ? (
        <div style={{ padding: '28px 20px', textAlign: 'center', color: '#6f666c', fontFamily: 'Newsreader,serif', fontStyle: 'italic' }}>{empty}</div>
      ) : rows.map((r) => <RoomRow key={r.room_id} r={r} />)}
    </div>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={CARD}>
      <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 26, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.02em', color: accent ?? '#e6e3e4' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6f666c', marginTop: 6, letterSpacing: '.04em', textTransform: 'uppercase', fontFamily: 'Sora,sans-serif', fontWeight: 700 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#6fcf97', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

export function AdminPage() {
  const [tab, setTab] = useState<'needs' | 'new'>('needs')

  const fetchStats = useServerFn(adminLiquidityStats)
  const fetchNeeds = useServerFn(adminNeedsResponse)
  const fetchNew = useServerFn(adminNewRooms)
  const fetchKpis = useServerFn(adminProductKpis)
  const fetchScheduler = useServerFn(schedulerHealth)

  const statsQ = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => fetchStats({ data: {} }) })
  const kpisQ = useQuery({ queryKey: ['admin', 'kpis'], queryFn: () => fetchKpis({ data: {} }) })
  const schedQ = useQuery({ queryKey: ['admin', 'sched'], queryFn: () => fetchScheduler() })
  const needsQ = useQuery({ queryKey: ['admin', 'needs'], queryFn: () => fetchNeeds({ data: {} }), enabled: tab === 'needs' })
  const newQ = useQuery({ queryKey: ['admin', 'new'], queryFn: () => fetchNew({ data: {} }), enabled: tab === 'new' })

  const s = statsQ.data
  const k = kpisQ.data
  const h = schedQ.data

  return (
    <AdminShell variant="dark" title="overview" subtitle="real data. every public room deserves a human within the SLA.">
      {/* Product KPIs */}
      <div style={{ marginBottom: 22 }}>
        <SectionLabel>product · 24h / 7d</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <Kpi label="spills · 24h" value={String(k?.spills_24h ?? '—')} sub={k ? `${k.spills_7d} · 7d` : undefined} />
          <Kpi label="scans · 24h" value={String(k?.scans_24h ?? '—')} sub={k ? `${k.scans_7d} · 7d` : undefined} />
          <Kpi label="replies · 24h" value={String(k?.comments_24h ?? '—')} sub={k ? `${k.comments_7d} · 7d` : undefined} />
          <Kpi label="crisis · 7d" value={String(k?.crisis_flags_7d ?? '—')} accent={(k?.crisis_flags_7d ?? 0) > 0 ? '#e2dde0' : undefined} />
          <Kpi label="mirror · active" value={String(k?.mirror_subs_active ?? '—')} sub={k ? `${k.mirror_subs_trialing} trialing` : undefined} />
        </div>
      </div>

      {/* Liquidity / response floor */}
      <div style={{ marginBottom: 22 }}>
        <SectionLabel>response floor</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <Kpi label="public rooms" value={String(s?.total_public_rooms ?? '—')} />
          <Kpi label="response coverage" value={s ? `${s.response_coverage_pct}%` : '—'} />
          <Kpi label="24h coverage" value={s ? `${s.coverage_24h_pct}%` : '—'} sub={s ? `${s.new_rooms_24h} new` : undefined} />
          <Kpi label="cold rooms (>72h)" value={String(s?.cold_rooms_over_72h ?? '—')} accent={(s?.cold_rooms_over_72h ?? 0) > 0 ? '#e2dde0' : undefined} />
          <Kpi label="median TTFR" value={s?.median_ttfr_hours != null ? `${s.median_ttfr_hours}h` : '—'} />
        </div>
      </div>

      {/* Scheduler health */}
      {h && (
        <div style={{ marginBottom: 22 }}>
          <SectionLabel>retention scheduler · 24h</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <Kpi label="sent" value={String(h.sent_24h)} />
            <Kpi label="failed" value={String(h.failed_24h)} accent={h.failed_24h > 0 ? '#e2dde0' : undefined} />
            <Kpi label="retrying" value={String(h.retrying)} />
            <Kpi label="overdue" value={String(h.scheduled_overdue)} sub={h.oldest_overdue_minutes != null ? `oldest ${h.oldest_overdue_minutes}m` : undefined} accent={h.scheduled_overdue > 10 ? '#e2dde0' : undefined} />
          </div>
        </div>
      )}

      {/* Rooms subordinate tab */}
      <div style={{ marginTop: 22, marginBottom: 12 }}>
        <SectionLabel>rooms</SectionLabel>
        <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,.04)', border: '.5px solid rgba(255,255,255,.08)', borderRadius: 999, padding: 3, marginBottom: 12 }}>
          {(['needs', 'new'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                border: 0,
                background: tab === t ? '#2b2630' : 'transparent',
                color: tab === t ? '#fff' : '#c9bcd0',
                fontFamily: 'Sora,sans-serif',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {t === 'needs' ? 'needs response' : 'newest'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'needs' && (
        <RoomTable
          title="rooms waiting on a human"
          rows={needsQ.data as RoomListItem[] | undefined}
          empty={needsQ.isLoading ? 'loading…' : 'nothing waiting — every room has a human. 🩷'}
        />
      )}
      {tab === 'new' && (
        <RoomTable
          title="latest public rooms"
          rows={newQ.data as RoomListItem[] | undefined}
          empty={newQ.isLoading ? 'loading…' : 'no public rooms yet.'}
        />
      )}
    </AdminShell>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6f666c', marginBottom: 10 }}>
      {children}
    </div>
  )
}
