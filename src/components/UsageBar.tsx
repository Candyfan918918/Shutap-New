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

export function usageLine(u: MyUsage): string {
  const bits = u.bits.cap === null ? 'bits ∞' : `${u.bits.used}/${u.bits.cap} bits today`
  const per = u.downloads.period === 'month' ? 'this month' : 'today'
  const dl = u.downloads.cap === null ? 'downloads ∞' : `${u.downloads.used}/${u.downloads.cap} downloads ${per}`
  return `${bits} · ${dl}`
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
      <Row label="AI on demand touches today" used={usage.touches.used} cap={usage.touches.cap} />
      <p style={{ margin: 0, fontSize: 12.5, color: '#8f898d' }}>
        A download is a video, a picture, a PDF or a copied line; a realtor kit is six. The same one again on the same day is free. Bits and touches reset at midnight Pacific; monthly downloads on the 1st.
      </p>
    </section>
  )
}
