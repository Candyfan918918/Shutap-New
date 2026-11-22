import { pageMeta } from '@/lib/seo/page-meta'
// Admin · Small business (Nov 21 2026): where real owners drop off, from the
// first screen to a video saved to post. Real users only.
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { AdminShell } from '@/components/AdminShell'
import { adminShopsReport, type ShopsReport } from '@/lib/admin-shops.functions'

export const Route = createFileRoute('/_authenticated/admin/smallbusiness')({
  head: () => ({ meta: [...pageMeta('Admin · Small business — Shutap', 'Private numbers for Shutap for small business.', '/admin/smallbusiness'), { name: 'robots', content: 'noindex' }] }),
  component: () => (
    <div data-ph-private style={{ display: 'contents' }}>
      <AdminSmallBusinessPage />
    </div>
  ),
})

const CARD = { border: '1px solid #ead9e0', borderRadius: 14, padding: 16, background: '#fff' } as const
const TH = { textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6f666c', padding: '6px 8px', borderBottom: '1px solid #ead9e0' } as const
const TD = { padding: '8px', borderBottom: '1px solid #f4eaee', fontSize: 14 } as const
const NUM = { ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' } as const

function AdminSmallBusinessPage() {
  const load = useServerFn(adminShopsReport)
  const [days, setDays] = useState<1 | 7 | 30>(7)
  const [data, setData] = useState<ShopsReport | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let off = false
    setData(null)
    load({ data: { days } }).then((r) => { if (!off) { setData(r); setErr(null) } }).catch((e) => { if (!off) setErr(e instanceof Error ? e.message : 'load failed') })
    return () => { off = true }
  }, [days, load])
  const top = data?.funnel[0]?.people ?? 0
  const pct = (n: number | null) => (n === null ? '—' : `${n}%`)
  const list = (rows: { what: string; n: number }[]) => (rows.length ? rows.map((r) => `${r.what} ${r.n}`).join(' · ') : 'none')
  return (
    <AdminShell title="Small business" subtitle="Real users only. Your own accounts and browsers are left out."
      right={<div style={{ display: 'flex', gap: 6 }}>{([1, 7, 30] as const).map((d) => <button key={d} type="button" onClick={() => setDays(d)} aria-pressed={days === d} style={{ height: 32, padding: '0 12px', borderRadius: 999, border: '1px solid #ead9e0', background: days === d ? '#17131a' : '#fff', color: days === d ? '#fff' : '#17131a', font: 'inherit', fontSize: 13, cursor: 'pointer' }}>{d === 1 ? 'today' : `${d} days`}</button>)}</div>}>
      {err && <p style={{ color: '#b3261e' }}>{err}</p>}
      {!data && !err && <p style={{ color: '#6f666c' }}>One moment…</p>}
      {data && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={CARD}>
            <b>Funnel, last {data.days === 1 ? '24 hours' : `${data.days} days`}</b>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead><tr><th style={TH}>Step</th><th style={{ ...TH, textAlign: 'right' }}>People</th><th style={{ ...TH, textAlign: 'right' }}>Of those who opened</th><th style={{ ...TH, textAlign: 'right' }}>Of the step before</th><th style={TH} /></tr></thead>
              <tbody>
                {data.funnel.map((r) => (
                  <tr key={r.key}>
                    <td style={TD}>{r.label}</td><td style={NUM}>{r.people}</td><td style={NUM}>{pct(r.ofFirst)}</td><td style={NUM}>{pct(r.ofPrevious)}</td>
                    <td style={{ ...TD, width: '30%' }}><div style={{ height: 8, borderRadius: 999, background: '#f4eaee' }}><div style={{ height: 8, borderRadius: 999, background: '#c2185b', width: `${top ? Math.round((r.people / top) * 100) : 0}%` }} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!top && <p style={{ color: '#6f666c', fontSize: 13, margin: '10px 0 0' }}>No real user has opened it in this period. The page is still hidden from everyone but you.</p>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {([['Businesses saved', data.totals.businesses], ['Found on Google', data.totals.from_google], ['With a logo', data.totals.with_logo], ['Reminder on', data.totals.reminders_on], ['Skit sets written', data.totals.skit_sets], ['Videos made', data.totals.videos_made], ['Videos saved to post', data.totals.videos_saved], ['Videos kept now', data.totals.videos_kept], ['Code word said (owners’ tally)', data.totals.code_says], ['Hit a plan limit', data.limits]] as const).map(([k, v]) => (
              <div key={k} style={CARD}><div style={{ fontSize: 12, color: '#6f666c' }}>{k}</div><div style={{ fontSize: 26, fontWeight: 800 }}>{v}</div></div>
            ))}
          </div>
          <div style={CARD}>
            <b>What went wrong</b>
            <p style={{ margin: '8px 0 0', fontSize: 14 }}>Filming and making the video: {list(data.problems)}</p>
            <p style={{ margin: '6px 0 0', fontSize: 14 }}>Mic on “Anything fun happen today?”: {list(data.mic)}</p>
            <p style={{ margin: '6px 0 0', fontSize: 14 }}>Google lookups: {data.lookups.searches} searches, {data.lookups.details} detail reads, {data.lookups.failed} that came back with nothing or failed</p>
            <p style={{ margin: '6px 0 0', fontSize: 14 }}>Text styles picked: {list(data.text_styles)}</p>
          </div>
          <p style={{ color: '#6f666c', fontSize: 12 }}>Left out: {data.left_out.admin_accounts} admin account(s), {data.left_out.admin_browsers} browser(s) an admin was seen on, {data.left_out.events} of their events in this period. Funnel steps count distinct people. In the boxes, skit sets, videos made, videos saved and plan limits are for the period; the rest are all-time.</p>
        </div>
      )}
    </AdminShell>
  )
}
