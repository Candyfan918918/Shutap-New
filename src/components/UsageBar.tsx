/* The usage bar: what's left of the plan, always visible to a signed-in
 * person — a card in the header menu and one on the profile. Nov 6 2026
 * (Candy): pay to create, never to use. Only making something new is
 * counted (bits, realtor kits); downloads, copies, the prompter and
 * "funnier" are unlimited, so they get one plain line, not a meter. */
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

/** The usage card in the account menu: one bar, a colored segment for each
 *  thing you make (bits rose, realtor kits blue), filled with what's left,
 *  and a legend; then one line saying everything else is unlimited. */
export const USAGE_COLORS = { bits: '#c1216b', kits: '#3b6fd8' } as const

const kitWhen = (p: string) => (p === 'month' ? 'this month' : 'once')

export function UsageMini({ u, dark = false }: { u: MyUsage; dark?: boolean }) {
  const parts = [
    { key: 'bits', label: 'bits', used: u.bits.used, cap: u.bits.cap, when: 'today' },
    { key: 'kits', label: 'realtor kits', used: u.kits.used, cap: u.kits.cap, when: kitWhen(u.kits.period) },
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
        {u.kits.credits > 0 && <div style={{ fontSize: 12, color: muted, paddingLeft: 15 }}>+ {u.kits.credits} bought kit{u.kits.credits === 1 ? '' : 's'} ready to write</div>}
        <div style={{ fontSize: 12, color: muted, paddingTop: 2 }}>downloads, copies, funnier: <b style={{ color: ink, fontWeight: 600 }}>unlimited</b>{u.tier === 'free' ? ' · marked' : ''}</div>
      </div>
    </div>
  )
}

/** The account menu as plain lines (what's left). */
export function usageRows(u: MyUsage): string[] {
  const row = (cap: number | null, used: number, one: string, many: string, when: string) =>
    cap === null ? `unlimited ${many}` : `${Math.max(0, cap - used)} of ${cap} ${cap === 1 ? one : many} left ${when}`
  return [
    row(u.bits.cap, u.bits.used, 'bit', 'bits', 'today'),
    row(u.kits.cap, u.kits.used, 'realtor kit', 'realtor kits', kitWhen(u.kits.period)),
    'unlimited downloads and copies',
  ]
}

export function usageLine(u: MyUsage): string {
  const bits = u.bits.cap === null ? 'bits ∞' : `${u.bits.used}/${u.bits.cap} bits today`
  const kits = u.kits.cap === null ? 'kits ∞' : `${u.kits.used}/${u.kits.cap} kit${u.kits.cap === 1 ? '' : 's'}${u.kits.period === 'month' ? ' this month' : ''}`
  return `${bits} · ${kits} · downloads ∞`
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
  return (
    <section className="fd-post" aria-label="Usage" style={{ gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Your plan</h2>
        <span style={{ fontSize: 12.5, color: '#8f898d' }}>
          {usage.tier === 'free' ? 'Free' : usage.tier === 'basic' ? `Basic · ${usd(PLANS.basic.amount)}/mo` : usage.tier === 'pro' ? `Pro · ${usd(PLANS.pro.amount)}/mo` : ''}
        </span>
      </div>
      <Row label="New bits today" used={usage.bits.used} cap={usage.bits.cap} />
      <Row label={usage.kits.period === 'month' ? 'Realtor kits this month' : 'Realtor kit (free, once)'} used={usage.kits.used} cap={usage.kits.cap} note={usage.kits.credits > 0 ? `+ ${usage.kits.credits} bought` : undefined} />
      <Row label="Downloads, copies, prompter, funnier" used={0} cap={null} />
      <p style={{ margin: 0, fontSize: 12.5, color: '#8f898d' }}>
        You pay to make something new, never to use it. Everything you made lives in My creations: download, copy and run the prompter as often as you like.{usage.tier === 'free' ? ' Free downloads end with "— shutap.com".' : ''} Bits reset at midnight Pacific; realtor kits on the 1st of the month.
      </p>
    </section>
  )
}
