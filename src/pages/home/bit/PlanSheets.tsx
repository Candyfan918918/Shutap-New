/* The paywall and the Pro upgrade, shown inside the writer's bottom sheet.
 *
 *   PaywallBody   a free account at its daily limit (bit 3), or anyone
 *                 removing the watermark from a download. Basic and Pro side
 *                 by side, Pro marked the better deal. Checkout is /subscribe.
 *   UpgradeBody   a Basic account at its daily limit (bit 6): Pro on the same
 *                 subscription, the difference charged now.
 *
 * Prices and plan lines come from @/lib/pricing, the same numbers checkout
 * charges. The story in the box is kept (sessionStorage) while they pay. */
import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { changePlanToPro } from '@/lib/payments.functions'
import { getStripeEnvironment } from '@/lib/stripe'
import { PLANS, PLAN_LINES, usd, type PaidPlan } from '@/lib/pricing'

export type PaywallWhere = 'bit_3' | 'daily_limit' | 'download'

function PlanCard({ plan, best, where, onPick }: { plan: PaidPlan; best?: boolean; where: PaywallWhere; onPick: (p: PaidPlan) => void }) {
  const p = PLANS[plan]
  return (
    <div className={`bt-plan${best ? ' best' : ''}`}>
      <div className="bt-plan-top">
        <b>{p.name}</b>
        {best && <span className="bt-plan-badge">best deal</span>}
      </div>
      <div className="bt-plan-price">
        {usd(p.amount)}
        <span>/mo</span>
      </div>
      <ul>
        {PLAN_LINES[plan].map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <a
        href={`/subscribe?plan=${plan}&from=${where}`}
        className={`bt-btn block${best ? '' : ' ghost'}`}
        onClick={() => onPick(plan)}
      >
        get {p.name}
      </a>
    </div>
  )
}

export function PaywallBody({
  where,
  onPick,
  onClose,
}: {
  where: PaywallWhere
  onPick: (p: PaidPlan) => void
  onClose: () => void
}) {
  return (
    <>
      <h3 id="bit-sheet-title">{where === 'download' ? 'Remove the watermark.' : "That's today's free bits."}</h3>
      <div className="bt-plans">
        <PlanCard plan="basic" where={where} onPick={onPick} />
        <PlanCard plan="pro" best where={where} onPick={onPick} />
      </div>
      <p className="bt-note" style={{ textAlign: 'center' }}>
        {where === 'download' ? 'Cancel anytime. Prices in USD, tax may apply.' : 'Resets at midnight Pacific. Your story stays in the box.'}
      </p>
      <button className="bt-btn ghost block" onClick={onClose}>
        not now
      </button>
    </>
  )
}

const UPGRADE_FAIL: Record<string, string> = {
  plan_cancelling: 'Your Basic plan is set to end. Resume it from your profile first.',
}

export function UpgradeBody({
  onChoose,
  onUpgraded,
  onClose,
}: {
  onChoose: () => void
  onUpgraded: () => void
  onClose: () => void
}) {
  const change = useServerFn(changePlanToPro)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function go() {
    onChoose()
    setBusy(true)
    setErr(null)
    try {
      const r = await change({ data: { environment: getStripeEnvironment() } })
      if (r.ok) {
        onUpgraded()
        return
      }
      if (r.error === 'no_basic_plan') {
        // Nothing to move from (it ended, or this is another account):
        // a normal Pro checkout instead.
        window.location.assign('/subscribe?plan=pro&from=daily_limit')
        return
      }
      setErr(UPGRADE_FAIL[r.error] ?? "Couldn't switch you to Pro. Your card wasn't charged for Pro; you're still on Basic.")
    } catch {
      setErr("Couldn't switch you to Pro. Try again in a minute.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h3 id="bit-sheet-title">That's 5 for today.</h3>
      <p className="bt-sub" style={{ fontSize: 'var(--fs-body)' }}>
        Pro writes as many as you want.
      </p>
      <button className="bt-btn block" disabled={busy} onClick={() => void go()}>
        {busy ? 'switching…' : `go Pro · ${usd(PLANS.pro.amount)}/mo`}
      </button>
      {err && (
        <p role="alert" className="bt-note" style={{ textAlign: 'center', color: 'var(--rose-ink)' }}>
          {err}
        </p>
      )}
      <p className="bt-note" style={{ textAlign: 'center' }}>
        The difference for this month is charged now.
      </p>
      <button className="bt-btn ghost block" disabled={busy} onClick={onClose}>
        not now
      </button>
    </>
  )
}
