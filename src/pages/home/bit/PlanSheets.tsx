/* The paywall and the Pro upgrade, shown inside the writer's bottom sheet.
 *
 *   PaywallBody   a free account at its daily limit (bit 3), or anyone
 *                 removing the watermark from a download. Free, Basic and
 *                 Pro side by side on the same rows as the pricing page,
 *                 Pro first to buy, then what every plan keeps. Checkout is
 *                 /subscribe.
 *   UpgradeBody   a Basic account at its daily limit (bit 6): Pro on the same
 *                 subscription, the difference charged now.
 *
 * Prices and plan lines come from @/lib/pricing, the same numbers checkout
 * charges. The story in the box is kept (sessionStorage) while they pay. */
import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { changePlanToPro } from '@/lib/payments.functions'
import { getStripeEnvironment } from '@/lib/stripe'
import { EVERY_PLAN, PLANS, PLAN_COMPARE, usd, type CompareTier, type PaidPlan } from '@/lib/pricing'

export type PaywallWhere = 'bit_3' | 'daily_limit' | 'download'

/** What every plan keeps, Free included (the same list as the pricing
 *  page), so a paywall never reads as "pay to use Shutap". */
const EVERY_ICON: Record<(typeof EVERY_PLAN)[number], FeatureIcon> = {
  'A full bit: hook, setup, tags and button': 'bit',
  'Hotter, tighter, mix and tag swap': 'rewrite',
  Teleprompter: 'prompter',
  'Scene and screenplay': 'screenplay',
  'Caption and hashtags': 'hash',
  'Set list of every bit': 'list',
}

/** The comparison table: one column per plan, the same rows everywhere.
 *  `you` marks the plan they're on. */
function Compare({ tiers, you }: { tiers: CompareTier[]; you?: CompareTier }) {
  const name = (t: CompareTier) => (t === 'free' ? 'Free' : PLANS[t].name)
  const price = (t: CompareTier) => (t === 'free' ? '$0' : usd(PLANS[t].amount))
  return (
    <div className="pw-cmp" style={{ gridTemplateColumns: `minmax(68px, 1fr) repeat(${tiers.length}, minmax(0, 1fr))` }} role="table" aria-label="Plans compared">
      <div className="lbl hd" role="columnheader" />
      {tiers.map((t) => (
        <div key={t} className={`hd${t === 'pro' ? ' pro' : ''}`} role="columnheader">
          {name(t)}
          <small>{t === you ? 'you now' : `${price(t)}${t === 'free' ? '' : '/mo'}`}</small>
        </div>
      ))}
      {PLAN_COMPARE.map((r) => (
        <div key={r.label} style={{ display: 'contents' }} role="row">
          <div className="lbl" role="rowheader">{r.short}</div>
          {tiers.map((t) => {
            const c = r.cells[t]
            return (
              <div key={t} className={`${c.on ? 'on' : 'off'}${t === 'pro' ? ' pro' : ''}`} role="cell">
                {c.short}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

type FeatureIcon = 'bit' | 'prompter' | 'screenplay' | 'rewrite' | 'list' | 'hash' | 'post'

function Icon({ name }: { name: FeatureIcon }) {
  const c = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const
  switch (name) {
    case 'bit':
      return (<svg {...c}><rect x="4" y="3" width="16" height="18" rx="2.5" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>)
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

      <Compare tiers={['free', 'basic', 'pro']} you="free" />

      <div className="pw-buy">
        <a href={`/subscribe?plan=pro&from=${where}`} className="pw-cta fill" onClick={() => onPick('pro')}>
          get Pro · {usd(PLANS.pro.amount)}/mo
        </a>
        <a href={`/subscribe?plan=basic&from=${where}`} className="pw-cta ghost" onClick={() => onPick('basic')}>
          get Basic · {usd(PLANS.basic.amount)}/mo
        </a>
      </div>

      <section className="pw-free" aria-label="Every plan, Free included">
        <h4>Every plan, Free included</h4>
        <ul>
          {EVERY_PLAN.map((f) => (
            <li key={f}>
              <Icon name={EVERY_ICON[f]} />
              {f}
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
  plan_cancelling: 'Your Basic plan is set to end. Tap "Keep Basic" on your account page first.',
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
      <Compare tiers={['basic', 'pro']} you="basic" />
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
