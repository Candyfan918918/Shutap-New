/* The usage bar (Nov 5 2026): what's used of the plan, always visible to a
 * signed-in person — a short line in the header menu and a card on the
 * profile. Reads myUsage once per mount; the writer's own counters refresh
 * their own labels. "downloads" means everything taken: a video, a picture,
 * a PDF, a copied line, later a realtor kit (= 6). */
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { myUsage, type MyUsage } from '@/lib/bits.functions'
import { PLANS, usd } from '@/lib/pricing'

export function useMyUsage(enabled: boolean): MyUsage | null {
  const fn = useServerFn(myUsage)
  const [u, setU] = useState<MyUsage | null>(null)
  useEffect(() => {
    if (!enabled) return
    let live = true
    fn({ data: {} }).then((r) => live && setU(r)).catch(() => {})
    return () => { live = false }
  }, [enabled, fn])
  return u
}

/** The usage card in the account menu (Nov 6 2026), after Lovable's credit
 *  bar: one bar, a colored segment for each thing (bits rose, downloads
 *  amber, realtor kits blue). Each segment is that thing's share of its own
 *  limit used; a legend under the bar says what's left. */
export const USAGE_COLORS = { bits: '#c1216b', downloads: '#e0912f', kits: '#3b6fd8' } as const

export function UsageMini({ u, dark = false }: { u: MyUsage; dark?: boolean }) {
  const per = (p: string) => (p === 'month' ? 'month' : p === 'day' ? 'today' : 'once')
  const parts = [
    { key: 'bits', label: 'bits', used: u.bits.used, cap: u.bits.cap, when: 'today' },
    { key: 'downloads', label: 'downloads', used: u.downloads.used, cap: u.downloads.cap, when: per(u.downloads.period) },
    { key: 'kits', label: 'realtor kits', used: u.kits.used, cap: u.kits.cap, when: per(u.kits.period) },
  ] as const
  const ink = dark ? '#ffffff' : '#111111'
  const muted = dark ? '#b5b5b5' : '#6b6b6b'
  const track = dark ? 'rgba(255,255,255,.12)' : '#f1e6eb'
  const plan = u.tier === 'pro' ? 'Pro' : u.tier === 'basic' ? 'Basic' : 'Free'
  return (
    <div style={{ display: 'grid', gap: 8, fontFamily: "'Sora',system-ui,sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: ink }}>{plan} plan</span>
        <span style={{ fontSize: 11.5, color: muted }}>{u.tier === 'pro' ? 'unlimited' : 'what\u2019s left'}</span>
      </div>
      <div role="img" aria-label={parts.map((p) => `${p.label}: ${p.cap === null ? 'unlimited' : `${Math.max(0, p.cap - p.used)} of ${p.cap} left`}`).join(', ')} style={{ display: 'flex', gap: 3, height: 8 }}>
        {parts.map((p) => {
          // filled = what's left, like a credit bar draining as it's used
          const pct = p.cap === null ? 100 : Math.max(0, Math.min(100, Math.round(((p.cap - p.used) / Math.max(1, p.cap)) * 100)))
          const c = USAGE_COLORS[p.key]
          return (
            <span key={p.key} style={{ flex: 1, borderRadius: 999, background: track, overflow: 'hidden', position: 'relative' }}>
              <span style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: c, opacity: p.cap === null ? 0.35 : 1, borderRadius: 999, transition: 'width .3s' }} />
            </span>
          )
        })}
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        {parts.map((p) => {
          const left = p.cap === null ? null : Math.max(0, p.cap - p.used)
          return (
            <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: muted }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: USAGE_COLORS[p.key], flex: 'none' }} />
              <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{p.label}</span>
              <span style={{ whiteSpace: 'nowrap' }}><b style={{ color: left === 0 ? '#b3261e' : ink, fontWeight: 600 }}>{left === null ? '\u221e' : `${left} of ${p.cap}`}</b>{left === null ? '' : ` · ${p.when}`}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** The account menu (Nov 6 2026): one short line per thing, what's left,
 *  so it fits a narrow menu instead of one long line running out of it. */
export function usageRows(u: MyUsage): string[] {
  const left = (used: number, cap: number) => Math.max(0, cap - used)
  const per = (p: string) => (p === 'month' ? 'this month' : p === 'day' ? 'today' : '')
  const row = (cap: number | null, used: number, one: string, many: string, period: string) =>
    cap === null ? `unlimited ${many}` : `${left(used, cap)} of ${cap} ${cap === 1 ? one : many} left${per(period) ? ' ' + per(period) : ''}`
  return [
    row(u.bits.cap, u.bits.used, 'bit', 'bits', 'day'),
    row(u.downloads.cap, u.downloads.used, 'download', 'downloads', u.downloads.period),
    row(u.kits.cap, u.kits.used, 'realtor kit', 'realtor kits', u.kits.period),
  ]
}

export function usageLine(u: MyUsage): string {
  const bits = u.bits.cap === null ? 'bits ∞' : `${u.bits.used}/${u.bits.cap} bits today`
  const per = u.downloads.period === 'month' ? 'this month' : 'today'
  const dl = u.downloads.cap === null ? 'downloads ∞' : `${u.downloads.used}/${u.downloads.cap} downloads ${per}`
  const kits = u.kits.cap === null ? 'kits ∞' : `${u.kits.used}/${u.kits.cap} kit${u.kits.cap === 1 ? '' : 's'}${u.kits.period === 'day' ? ' today' : ''}`
  return `${bits} · ${dl} · ${kits}`
}

function Row({ label, used, cap, note }: { label: string; used: number; cap: number | null; note?: string }) {
  const pct = cap === null ? 0 : Math.min(100, Math.round((used / Math.max(1, cap)) * 100))
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 8 }}>
        <span>{label}</span>
        <b>{cap === null ? 'unlimited' : `${used} / ${cap}`}{note ? <span style={{ fontWeight: 500, color: '#8f898d' }}> · {note}</span> : null}</b>
      </div>
      {cap !== null && (
        <div style={{ height: 6, borderRadius: 999, background: '#f0d6e0', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#b3261e' : '#c1216b', transition: 'width .3s' }} />
        </div>
      )}
    </div>
  )
}

/** The profile card. */
export function UsageCard({ usage }: { usage: MyUsage }) {
  const kitsLeft = usage.downloads.cap === null ? null : Math.floor(Math.max(0, usage.downloads.cap - usage.downloads.used) / 6)
  return (
    <section className="fd-post" aria-label="Usage" style={{ gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Your plan this {usage.downloads.period === 'month' ? 'month' : 'day'}</h2>
        <span style={{ fontSize: 12.5, color: '#8f898d' }}>
          {usage.tier === 'free' ? 'Free' : usage.tier === 'basic' ? `Basic · ${usd(PLANS.basic.amount)}/mo` : usage.tier === 'pro' ? `Pro · ${usd(PLANS.pro.amount)}/mo` : ''}
        </span>
      </div>
      <Row label="New bits today" used={usage.bits.used} cap={usage.bits.cap} />
      <Row
        label={`Downloads ${usage.downloads.period === 'month' ? 'this month' : 'today'}`}
        used={usage.downloads.used}
        cap={usage.downloads.cap}
        note={kitsLeft !== null && usage.downloads.period === 'month' ? `${kitsLeft} realtor kit${kitsLeft === 1 ? '' : 's'} left` : undefined}
      />
      <Row label={usage.kits.period === 'day' ? 'Realtor kits today' : 'Realtor kit (free, once)'} used={usage.kits.used} cap={usage.kits.cap} />
      <Row label="AI on demand touches today" used={usage.touches.used} cap={usage.touches.cap} />
      <p style={{ margin: 0, fontSize: 12.5, color: '#8f898d' }}>
        A download is a video, a picture, a PDF or a copied kit output; the kit PDF is six. A bought kit is never counted. The same one again on the same day is free. Bits and touches reset at midnight Pacific; monthly downloads on the 1st.
      </p>
    </section>
  )
}
