// Admin analytics page. Growth + acquisition are prioritized above KPI cards.
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { adminAnalytics, adminGrowth, adminAcquisition, type GrowthPayload, type GrowthBlock, type AcquisitionPayload } from '@/lib/admin.functions'
import { AdminShell } from '@/components/AdminShell'

type Analytics = Awaited<ReturnType<typeof adminAnalytics>>

function fmt(d: string | null | undefined): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleString() } catch { return '—' }
}

function Card({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: '#fff', border: '.5px solid rgba(11,8,15,.08)', borderRadius: 14, padding: 16, minWidth: 160 }}>
      <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#6f666c' }}>{label}</div>
      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 800, color: '#0b080f', marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#443c42', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ background: '#fdfbf9', borderRadius: 999, height: 8, width: 140, overflow: 'hidden' }}>
      <div style={{ background: '#17131a', height: '100%', width: `${pct}%` }} />
    </div>
  )
}

export function AdminAnalyticsPage() {
  const load = useServerFn(adminAnalytics)
  const loadGrowth = useServerFn(adminGrowth)
  const loadAcq = useServerFn(adminAcquisition)
  const [data, setData] = useState<Analytics | null>(null)
  const [growth, setGrowth] = useState<GrowthPayload | null>(null)
  const [acq, setAcq] = useState<AcquisitionPayload | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [audience, setAudience] = useState<'human' | 'bot' | 'all'>('human')

  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const [r, g, a] = await Promise.all([
          load({ data: {} }),
          loadGrowth({ data: {} }),
          loadAcq({ data: {} }),
        ])
        if (dead) return
        setData(r as Analytics)
        setGrowth(g as GrowthPayload)
        setAcq(a as AcquisitionPayload)
      } catch (e) {
        if (!dead) setErr(e instanceof Error ? e.message : 'load failed')
      }
    })()
    return () => { dead = true }
  }, [load, loadGrowth, loadAcq])

  const visits = data
    ? (audience === 'human' ? data.visits_human : audience === 'bot' ? { ...data.visits_bot, new_30d: 0, returning_30d: 0 } : data.visits)
    : null
  const unique = data
    ? (audience === 'human' ? data.unique_visitors_human : audience === 'bot' ? data.unique_visitors_bot : data.unique_visitors)
    : null
  const countries = data ? (audience === 'human' ? data.top_countries_human : data.top_countries) : []


  return (
    <AdminShell
      title="analytics"
      subtitle={data ? `as of ${fmt(data.generated_at)}` : undefined}
    >
      {err && <div style={{ color: '#17131a', marginBottom: 12 }}>{err}</div>}
      {!data || !visits ? (
        <div style={{ color: '#443c42' }}>loading…</div>
      ) : (
        <>
          {/* Growth — first */}
          {growth && (
            <section style={{ marginBottom: 24 }}>
              <h2 style={sectionH2}>growth · humans only</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                <GrowthBlockCard title="signups" block={growth.signups} />
                <GrowthBlockCard title="visits" block={growth.visits} />
                <GrowthBlockCard title="unique visitors" block={growth.unique_visitors} />
              </div>
            </section>
          )}


          {/* Acquisition — second */}
          {acq && (
            <section style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                <h2 style={{ ...sectionH2, margin: 0 }}>acquisition · 30d, humans</h2>
                <span style={{ fontSize: 11, color: '#6f666c' }}>
                  {acq.total_visits} visits · {acq.captured_utm_count} with UTM
                </span>
              </div>
              <div style={panel}>
                <ChannelBar channels={acq.channels} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 16 }}>
                <div style={panel}>
                  <h3 style={panelH3}>top referrers</h3>
                  <PairTable rows={acq.top_referrers} emptyMsg="no external referrers yet" />
                </div>
                <div style={panel}>
                  <h3 style={panelH3}>top UTM sources</h3>
                  <PairTable rows={acq.top_utm_sources} emptyMsg="no UTM data captured yet — tag campaigns with ?utm_source=…" />
                </div>
                <div style={panel}>
                  <h3 style={panelH3}>top UTM campaigns</h3>
                  <PairTable rows={acq.top_utm_campaigns} emptyMsg="no UTM campaigns yet" />
                </div>
                <div style={panel}>
                  <h3 style={panelH3}>top landing pages</h3>
                  <PairTable rows={acq.top_landing_paths} emptyMsg="landing_path captures start on next visit" />
                </div>
              </div>
            </section>
          )}

          {/* Users KPI cards */}
          <section style={{ marginBottom: 24 }}>
            <h2 style={sectionH2}>users · humans only</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Card label="real users" value={data.users.total_real} />
              <Card label="new · 7d" value={data.users.new_7d} />
              <Card label="new · 30d" value={data.users.new_30d} />
              <Card label="dau" value={data.activity.dau} sub="unique · 24h" />
              <Card label="wau" value={data.activity.wau} sub="unique · 7d" />
              <Card label="mau" value={data.activity.mau} sub="unique · 30d" />
              <Card label="guest→sign_up" value={data.users.guest_converted} />
            </div>
          </section>

          {/* Visits KPI cards */}
          <section style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ ...sectionH2, margin: 0 }}>visits · {audience === 'human' ? 'humans' : audience === 'bot' ? 'bots' : 'all traffic'}</h2>
              <div style={{ display: 'inline-flex', background: '#fff', border: '.5px solid rgba(11,8,15,.12)', borderRadius: 999, padding: 3 }}>
                {(['human', 'bot', 'all'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setAudience(k)}
                    style={{
                      padding: '6px 14px', borderRadius: 999, border: 0,
                      background: audience === k ? '#17131a' : 'transparent',
                      color: audience === k ? '#fff' : '#443c42',
                      fontFamily: "'Sora',sans-serif", fontSize: 11, fontWeight: 700,
                      letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer',
                    }}
                  >{k === 'human' ? 'humans' : k === 'bot' ? 'bots' : 'all'}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <Card label="visits · total" value={visits.total} />
              <Card label="visits · 7d" value={visits.d7} />
              <Card
                label="visits · 30d"
                value={visits.d30}
                sub={audience === 'bot' ? undefined : `${visits.new_30d} new · ${visits.returning_30d} returning`}
              />
              {unique && <Card label="unique visitors" value={unique.total} />}
              {unique && <Card label="unique · 7d" value={unique.d7} />}
              {unique && <Card label="unique · 30d" value={unique.d30} />}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#6f666c' }}>
              visits = sessions; unique visitors = distinct people (per auth user). bots detected by user-agent heuristics; signed-in sessions always count as human.
            </div>

          </section>

          {/* Providers + countries */}
          <section style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={panel}>
              <h2 style={sectionH2}>sign-ins by provider</h2>
              <ProviderTable providers={data.providers} />
            </div>
            <div style={panel}>
              <h2 style={sectionH2}>top countries · 30d · {audience === 'bot' ? 'all' : audience === 'human' ? 'humans' : 'all'}</h2>
              <CountryTable rows={countries} />
            </div>
          </section>

          <section style={{ marginBottom: 24 }}>
            <div style={panel}>
              <h2 style={sectionH2}>behavior · events</h2>
              <EventsTable rows={data.events} />
            </div>
          </section>

          <section style={{ marginBottom: 24 }}>
            <div style={panel}>
              <h2 style={sectionH2}>recent sign-ins</h2>
              <RecentTable rows={data.recent_signins} />
            </div>
          </section>
        </>
      )}
    </AdminShell>
  )
}

function GrowthBlockCard({ title, block }: { title: string; block: GrowthBlock }) {
  const max = block.series30d.reduce((m, p) => Math.max(m, p.n), 0)
  return (
    <div style={panel}>
      <h3 style={panelH3}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        <DeltaChip label="today vs yesterday" d={block.day} />
        <DeltaChip label="7d vs prev 7d" d={block.week} />
        <DeltaChip label="30d vs prev 30d" d={block.month} />
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 60, marginTop: 4 }}>
        {block.series30d.map((p) => {
          const h = max > 0 ? Math.max(1, Math.round((p.n / max) * 60)) : 1
          return (
            <div
              key={p.date}
              title={`${p.date}: ${p.n}`}
              style={{ flex: 1, background: p.n > 0 ? '#17131a' : '#fdfbf9', height: h, borderRadius: 2, minWidth: 2 }}
            />
          )
        })}
      </div>
      <div style={{ fontSize: 10, color: '#6f666c', marginTop: 4, textAlign: 'right' }}>last 30 days</div>
    </div>
  )
}

function DeltaChip({ label, d }: { label: string; d: { curr: number; prev: number; delta_pct: number | null } }) {
  const positive = d.delta_pct != null && d.delta_pct >= 0
  const color = d.delta_pct == null ? '#6f666c' : positive ? '#5b8a5e' : '#17131a'
  const arrow = d.delta_pct == null ? '—' : positive ? '▲' : '▼'
  return (
    <div style={{ background: '#ffffff', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: '#6f666c' }}>{label}</div>
      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, color: '#0b080f', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{d.curr}</div>
      <div style={{ fontSize: 11, color, marginTop: 2 }}>
        {arrow} {d.delta_pct == null ? '—' : `${Math.abs(d.delta_pct)}%`}
        <span style={{ color: '#6f666c', marginLeft: 6 }}>prev {d.prev}</span>
      </div>
    </div>
  )
}

function ChannelBar({ channels }: { channels: Record<string, number> }) {
  const entries = Object.entries(channels)
  const total = entries.reduce((s, [, v]) => s + v, 0)
  if (total === 0) return <div style={empty}>no visits captured yet</div>
  const colors: Record<string, string> = {
    direct: '#7f77dd', search: '#5b8a5e', social: '#c87c4a', referral: '#17131a', utm: '#0b080f',
  }
  return (
    <div>
      <div style={{ display: 'flex', width: '100%', height: 24, borderRadius: 8, overflow: 'hidden', border: '.5px solid rgba(11,8,15,.08)' }}>
        {entries.map(([k, v]) => v > 0 && (
          <div key={k} title={`${k}: ${v}`} style={{ background: colors[k] ?? '#999', width: `${(v / total) * 100}%` }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10 }}>
        {entries.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#443c42' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: colors[k] ?? '#999' }} />
            <b style={{ color: '#0b080f', fontFamily: "'Sora',sans-serif" }}>{k}</b>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PairTable({ rows, emptyMsg }: { rows: Array<[string, number]>; emptyMsg: string }) {
  if (rows.length === 0) return <div style={empty}>{emptyMsg}</div>
  const max = rows.reduce((m, [, v]) => Math.max(m, v), 0)
  return (
    <table style={table}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} style={tr}>
            <td style={{ ...td, width: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{k}</td>
            <td style={td}><Bar value={v} max={max} /></td>
            <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ProviderTable({ providers }: { providers: Record<string, number> }) {
  const entries = Object.entries(providers).sort((a, b) => b[1] - a[1])
  const max = entries.reduce((m, [, v]) => Math.max(m, v), 0)
  if (entries.length === 0) return <div style={empty}>no data</div>
  return (
    <table style={table}>
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k} style={tr}>
            <td style={{ ...td, width: 120 }}>{k || '—'}</td>
            <td style={td}><Bar value={v} max={max} /></td>
            <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function CountryTable({ rows }: { rows: Array<[string, number]> }) {
  if (rows.length === 0) return <div style={empty}>no data</div>
  const max = rows.reduce((m, [, v]) => Math.max(m, v), 0)
  return (
    <table style={table}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} style={tr}>
            <td style={{ ...td, width: 120 }}>{k}</td>
            <td style={td}><Bar value={v} max={max} /></td>
            <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function EventsTable({ rows }: { rows: Array<{ name: string; d7: number; d30: number }> }) {
  if (rows.length === 0) return <div style={empty}>no events yet</div>
  return (
    <table style={table}>
      <thead>
        <tr style={{ background: '#ffffff', textAlign: 'left', color: '#443c42' }}>
          <th style={th}>event</th>
          <th style={{ ...th, textAlign: 'right' }}>7d</th>
          <th style={{ ...th, textAlign: 'right' }}>30d</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} style={tr}>
            <td style={td}>{r.name}</td>
            <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.d7}</td>
            <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.d30}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function RecentTable({ rows }: { rows: Analytics['recent_signins'] }) {
  if (rows.length === 0) return <div style={empty}>no recent sign-ins</div>
  return (
    <table style={table}>
      <thead>
        <tr style={{ background: '#ffffff', textAlign: 'left', color: '#443c42' }}>
          <th style={th}>user</th>
          <th style={th}>email</th>
          <th style={th}>provider</th>
          <th style={th}>when</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.user_id} style={tr}>
            <td style={td}>{r.full_name || `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || '—'}</td>
            <td style={td}>{r.email || '—'}</td>
            <td style={td}>{r.provider || '—'}</td>
            <td style={td}>{fmt(r.last_login_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const sectionH2: React.CSSProperties = { fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, color: '#0b080f', margin: '0 0 12px 0', letterSpacing: '.02em' }
const panelH3: React.CSSProperties = { fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: '#0b080f', margin: '0 0 10px 0', letterSpacing: '.02em' }
const panel: React.CSSProperties = { background: '#fff', border: '.5px solid rgba(11,8,15,.08)', borderRadius: 14, padding: 16, overflow: 'auto' }
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }
const th: React.CSSProperties = { padding: '10px 12px', fontWeight: 600, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase' }
const td: React.CSSProperties = { padding: '10px 12px', color: '#100c14' }
const tr: React.CSSProperties = { borderTop: '.5px solid rgba(11,8,15,.05)' }
const empty: React.CSSProperties = { color: '#6f666c', fontStyle: 'italic', padding: '8px 4px', fontSize: 13 }
