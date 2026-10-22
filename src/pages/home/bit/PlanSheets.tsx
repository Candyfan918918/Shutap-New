/* The paywall and the Pro upgrade, shown inside the writer's bottom sheet.
 *
 *   PaywallBody   a free account at its daily limit (bit 3), or anyone
 *                 removing the watermark from a download. Pro leads (the
 *                 better deal), Basic sits under it, and the free features
 *                 every account keeps are listed. Checkout is /subscribe.
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

/** What every account already has, free. Shown under the plans so a paywall
 *  never reads as "pay to use Shutap". */
const FREE_FEATURES: { icon: FeatureIcon; label: string }[] = [
  { icon: 'prompter', label: 'Teleprompter' },
  { icon: 'screenplay', label: 'Scene and screenplay' },
  { icon: 'rewrite', label: 'Hotter, tighter, mix your own' },
  { icon: 'list', label: 'Set list of every bit' },
  { icon: 'hash', label: 'Caption and hashtags' },
  { icon: 'post', label: 'Post to rooms' },
]

type FeatureIcon = 'prompter' | 'screenplay' | 'rewrite' | 'list' | 'hash' | 'post'

function Icon({ name }: { name: FeatureIcon }) {
  const c = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const
  switch (name) {
    case 'prompter':
      return (<svg {...c}><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M7 9h10M7 12.5h6M9 21h6M12 17v4" /></svg>)
    case 'screenplay':
      return (<svg {...c}><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 12h7M9 15.5h5" /></svg>)
    case 'rewrite':
      return (<svg {...c}><path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7" /><path d="M20 4v4.7h-4.7M20 12a8 8 0 0 1-13.7 5.6L4 15.3" /><path d="M4 20v-4.7h4.7" /></svg>)
    case 'list':
      return (<svg {...c}><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></svg>)
    case 'hash':
      return (<svg {...c}><path d="M5 9h15M4 15h15M10 4 8 20M16 4l-2 16" /></svg>)
    case 'post':
      return (<svg {...c}><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" /><path d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" /></svg>)
  }
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
  const download = where === 'download'
  return (
    <div className="pw">
      <div className="pw-head">
        <h3 id="bit-sheet-title">{download ? 'Download it clean.' : "That's today's free bits."}</h3>
        <p className="pw-sub">{download ? 'Both plans remove the watermark.' : 'Want to keep writing tonight?'}</p>
      </div>

      <section className="pw-pro" aria-label="Pro plan">
        <div className="pw-pro-top">
          <span className="pw-name">{PLANS.pro.name}</span>
          <span className="pw-badge">best deal</span>
        </div>
        <p className="pw-promise">As many bits as you want.</p>
        <ul className="pw-pro-lines">
          <li>No watermark on downloads</li>
          <li>The Mirror: what keeps coming up in your bits</li>
        </ul>
        <div className="pw-pro-buy">
          <span className="pw-price">
            {usd(PLANS.pro.amount)}
            <small>/month</small>
          </span>
          <a href={`/subscribe?plan=pro&from=${where}`} className="pw-cta" onClick={() => onPick('pro')}>
            get Pro
          </a>
        </div>
      </section>

      <section className="pw-basic" aria-label="Basic plan">
        <div className="pw-basic-text">
          <span className="pw-name">{PLANS.basic.name}</span>
          <span className="pw-basic-lines">{PLAN_LINES.basic.join(', ')}</span>
        </div>
        <div className="pw-basic-buy">
          <span className="pw-basic-price">
            {usd(PLANS.basic.amount)}
            <small>/mo</small>
          </span>
          <a href={`/subscribe?plan=basic&from=${where}`} className="pw-cta ghost" onClick={() => onPick('basic')}>
            get Basic
          </a>
        </div>
      </section>

      <section className="pw-free" aria-label="Free with every account">
        <h4>Free with every account</h4>
        <ul>
          {FREE_FEATURES.map((f) => (
            <li key={f.label}>
              <Icon name={f.icon} />
              {f.label}
            </li>
          ))}
        </ul>
      </section>

      <p className="pw-foot">{download ? 'Cancel anytime. Prices in USD; tax may apply.' : 'Free bits come back at midnight Pacific. Your story stays in the box.'}</p>
      <button className="bt-btn ghost block" onClick={onClose}>
        not now
      </button>
    </div>
  )
}

const UPGRADE_FAIL: Record<string, string> = {
  plan_cancelling: 'Your Basic plan is set to end. Tap "keep my plan" on your profile first.',
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
