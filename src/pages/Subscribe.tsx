import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from '@/compat/router'
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'
import { useServerFn } from '@tanstack/react-start'
import { getStripe, getStripeEnvironment } from '@/lib/stripe'
import { changePlanToPro, createMirrorCheckout, createMirrorPortal } from '@/lib/payments.functions'
import { trackEvent } from '@/lib/tracking'
import { getMyBillingStatus, type BillingStatus } from '@/lib/billing.functions'
import { PLANS, PLAN_LINES, planByPriceId, planKeyFromParam, usd, type PlanKey } from '@/lib/pricing'
import { supabase } from '@/integrations/supabase/client'
import { useNoIndex } from '@/components/NoIndex'
import { setDurableReturn } from '@/lib/auth-guard'
import { AuthStep } from './welcome/AuthStep'
import { readJokePending } from './home/joke/jokeClient'
import eyeMascot from '@/assets/eye-mascot.svg'
import stripeWordmark from '@/assets/stripe-wordmark.svg'

// Every dollar figure on this page and on /subscribe/return comes from
// @/lib/pricing — never hardcoded in JSX — so the paywall on the writer quotes
// the same number this page charges. Amounts are pre-tax list prices; Stripe
// adds location-based tax inside the embedded checkout.

// Light homepage theme tokens.
const INK = '#100c14'
const MUTED = '#737373'
const SOFT_MUTED = '#969696'
const ACCENT = '#b8456b'
const DEEP_ACCENT = '#17131a'
const PAGE_BG = '#ffffff'
const HAIRLINE = 'rgba(20,20,20,.12)'

const fadeUpKeyframes = `
@keyframes shutapSubFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
`

const FROM_KEY = 'shutap_paywall_from'
/** The paywall that sent them here, if any: from ?from=, else what this
 *  session last stored. */
const FROM_TTL_MS = 30 * 60 * 1000
function paywallFrom(raw: string | null): string | null {
  const ok = (v: unknown) => (v === 'bit_3' || v === 'daily_limit' || v === 'download' ? v : null)
  const v = ok(raw)
  try {
    if (v) {
      sessionStorage.setItem(FROM_KEY, JSON.stringify({ v, at: Date.now() }))
      return v
    }
    // Only a recent paywall counts (it survives the sign-in round trip); an
    // old one isn't credited for a later direct visit.
    const saved = JSON.parse(sessionStorage.getItem(FROM_KEY) ?? 'null') as { v?: unknown; at?: number } | null
    if (!saved || typeof saved.at !== 'number' || Date.now() - saved.at > FROM_TTL_MS) return null
    return ok(saved.v)
  } catch {
    return v
  }
}

function fadeUp(delay = 0): CSSProperties {
  return { animation: `shutapSubFadeUp .5s ease ${delay}s both` }
}

function LockGlyph({ color = MUTED, size = 11 }: { color?: string; size?: number }) {
  return (
    <svg width={Math.round((size * 9) / 11)} height={size} viewBox="0 0 9 11" fill="none" style={{ flex: 'none' }}>
      <rect x="0.5" y="4.5" width="8" height="6" rx="1.5" stroke={color} />
      <path d="M2.5 4.5V3a2 2 0 0 1 4 0v1.5" stroke={color} fill="none" />
    </svg>
  )
}

function CheckGlyph({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round((size * 10) / 11)} viewBox="0 0 11 10" fill="none" style={{ flex: 'none' }}>
      <path d="M1.5 5l3 3 5-6.5" stroke={DEEP_ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }}>
      <button
        onClick={onBack}
        style={{ background: 'transparent', border: 'none', color: MUTED, fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: 14.5, cursor: 'pointer', padding: 0 }}
      >
        ← back
      </button>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '.5px solid rgba(20,20,20,.18)', borderRadius: 999, padding: '5px 11px', background: 'rgba(255,255,255,.5)' }}>
        <LockGlyph size={11} />
        <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 9.5, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase', color: MUTED }}>
          secure · stripe
        </span>
      </div>
    </div>
  )
}

/** Pro is the plan the page leads with. It carries the tinted ground and the
 *  stronger frame whether or not it is the one currently picked, so the
 *  hierarchy reads before anyone clicks; selecting Basic outlines Basic
 *  without ever making it look like the headline option. */
function planCardStyle(selected: boolean, featured = false): CSSProperties {
  const border = selected
    ? `2px solid ${featured ? DEEP_ACCENT : ACCENT}`
    : featured
      ? '1.5px solid rgba(23,19,26,.42)'
      : `1px solid ${HAIRLINE}`
  return {
    border,
    background: featured ? 'linear-gradient(135deg,#f7f7f7 0%,#ffffff 62%)' : '#ffffff',
    boxShadow: selected
      ? featured ? '0 18px 44px rgba(23,19,26,.22)' : '0 12px 36px rgba(23,19,26,.20)'
      : featured ? '0 10px 30px rgba(23,19,26,.12)' : '0 4px 16px rgba(20,20,20,.05)',
    borderRadius: 18,
    padding: featured ? '22px 22px' : '16px 20px',
    cursor: 'pointer',
    opacity: !selected && !featured ? 0.88 : 1,
    transition: 'border-color .18s ease, box-shadow .18s ease, opacity .18s ease',
  }
}

export function SubscribePage() {
  useNoIndex()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const initialPlan = planKeyFromParam(search.get('plan'))
  // Where the paywall was opened (bit_3 / daily_limit / download), kept for
  // the session so it survives the sign-in round trip before checkout.
  const from = paywallFrom(search.get('from'))
  const [planKey, setPlanKey] = useState<PlanKey>(initialPlan)
  // A plan already chosen (on the paywall or /pricing) goes straight to
  // checkout; the two plans only show again on "change plan".
  const [picking, setPicking] = useState(() => !search.get('plan'))
  const plan = PLANS[planKey]
  const [err, setErr] = useState<string | null>(null)
  /** Stripe's own words for a setup error, in small print under the plain
   *  message, so the cause can be read and fixed. */
  const [errDetail, setErrDetail] = useState<string | null>(null)

  const [authed, setAuthed] = useState<boolean | null>(null)
  const [checked, setChecked] = useState(false)
  const [alreadySubbed, setAlreadySubbed] = useState(false)
  /** the plan they're already on, when they are */
  const [currentPlan, setCurrentPlan] = useState<'basic' | 'pro' | null>(null)
  const [portalBusy, setPortalBusy] = useState(false)
  const [upgradeBusy, setUpgradeBusy] = useState(false)

  const fetchStatus = useServerFn(getMyBillingStatus)
  const openPortalFn = useServerFn(createMirrorPortal)
  const changePlanFn = useServerFn(changePlanToPro)

  useEffect(() => {
    // A background ANONYMOUS session is not a real account: treat it as
    // signed out so checkout prompts sign-in instead of failing server-side.
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user as { is_anonymous?: boolean } | undefined
      setAuthed(Boolean(data.session) && !user?.is_anonymous)
    })
  }, [])

  // A guest is not bounced away: the paywall is the page that says what a
  // membership buys, so they read it here and sign in here, in the slot where
  // checkout will appear. Sign-in itself still completes on /welcome (OAuth
  // and the magic link both land there, and a new alias gets its ceremony),
  // which then sends them straight back to the plan they were quoted.
  useEffect(() => {
    if (authed === false) {
      try { sessionStorage.setItem('shutap_returnTo', `/subscribe?plan=${planKey}`) } catch { /* noop */ }
      // …and durably, for the magic link that opens in another tab.
      setDurableReturn(`/subscribe?plan=${planKey}`)
    }
  }, [authed, planKey])

  // Signing in on this page (an OAuth popup, a code typed in) flips the slot
  // from sign-in to checkout without a reload.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const user = session?.user as { is_anonymous?: boolean } | undefined
      if (session && !user?.is_anonymous) setAuthed(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  /** A guest who came from the joke deck: the card they turned over is
   *  written down and waiting on the landing page. Said once, so paying does
   *  not feel like walking away from it. */
  const cameFromDeck = typeof window !== 'undefined' && !!readJokePending()

  // Duplicate-subscription guard: if the user already has an active row,
  // stop rendering checkout and offer the portal instead.
  useEffect(() => {
    if (!authed) return
    let done = false
    ;(async () => {
      try {
        const s = await fetchStatus({ data: { environment: getStripeEnvironment() } })
        if (done) return
        // A cancelled plan still inside its paid period isn't "already
        // subscribed": it won't renew, so checkout stays open.
        if (s?.isActive && s.status !== 'canceled') {
          setAlreadySubbed(true)
          setCurrentPlan(planByPriceId(s.priceId)?.tier ?? 'basic')
        }
      } catch { /* treat as not subscribed */ }
      finally { if (!done) setChecked(true) }
    })()
    return () => { done = true }
  }, [authed, fetchStatus])

  async function openPortal() {
    setPortalBusy(true)
    try {
      const result = await openPortalFn({
        data: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/profile` },
      })
      if ('error' in result) throw new Error(result.error)
      window.location.href = result.url
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not open billing portal')
      setPortalBusy(false)
    }
  }

  async function upgradeToPro() {
    setUpgradeBusy(true)
    setErr(null)
    try {
      const r = await changePlanFn({ data: { environment: getStripeEnvironment() } })
      if (!r.ok && r.error === 'no_basic_plan') {
        // Nothing to move from: open a normal Pro checkout instead.
        setAlreadySubbed(false)
        setPlanKey('pro')
        return
      }
      if (!r.ok) throw new Error(r.error === 'plan_cancelling' ? 'Your Basic plan is set to end. Tap "keep my plan" on your profile first.' : "Couldn't switch you to Pro. You're still on Basic.")
      setCurrentPlan('pro')
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't switch you to Pro.")
    } finally {
      setUpgradeBusy(false)
    }
  }

  const fetchClientSecret = async (): Promise<string> => {
    try {
      const result = await createMirrorCheckout({
        data: {
          priceId: plan.priceId,
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/subscribe/return?session_id={CHECKOUT_SESSION_ID}`,
        },
      })
      if ('error' in result) {
        // One subscription per person: show the plan they're on instead.
        if (result.error === 'already_subscribed') {
          const s = await fetchStatus({ data: { environment: getStripeEnvironment() } }).catch(() => null)
          setCurrentPlan(planByPriceId(s?.priceId)?.tier ?? 'basic')
          setAlreadySubbed(true)
        }
        throw new Error(result.error === 'already_subscribed' ? "You're already on a plan." : result.error)
      }
      if (!result.clientSecret) throw new Error('No client secret returned')
      void trackEvent('checkout_started', { plan: plan.tier, price: plan.priceId, where: from })
      return result.clientSecret
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Could not start checkout'
      // Stripe setup errors (tax settings, a missing price) mean nothing to a
      // buyer: say checkout is down, keep the detail in the console.
      const setup = /tax|head office|price not found|no such price|api key|not configured/i.test(raw)
      if (setup) console.error('[checkout] setup error', raw)
      setErr(setup ? "Checkout isn't available right now. Your card wasn't charged. Try again later." : raw)
      setErrDetail(setup ? raw : null)
      throw e
    }
  }

  function selectPlan(k: PlanKey) {
    if (planKey === k) return
    setPlanKey(k)
    setErr(null)
    navigate(`/subscribe?plan=${k}`, { replace: true })
  }

  if (authed === null || (authed && !checked)) return null

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, color: INK, fontFamily: 'Inter, system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>
      <style>{fadeUpKeyframes}</style>

      {/* ambient glow */}
      <div style={{ position: 'absolute', top: -180, left: '50%', transform: 'translateX(-50%)', width: 640, height: 420, background: 'radial-gradient(closest-side, rgba(23,19,26,.14), rgba(23,19,26,0))', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', maxWidth: 500, margin: '0 auto', padding: '26px 20px 72px', display: 'flex', flexDirection: 'column' }}>
        <TopBar onBack={() => navigate(-1)} />

        {/* header */}
        <div style={fadeUp()}>
          <img src={eyeMascot} alt="" style={{ width: 38, height: 38, marginBottom: 14, display: 'block' }} />
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 30, lineHeight: 1.15, letterSpacing: '-.04em', margin: '0 0 10px', color: INK }}>
            {picking ? 'Pick a plan.' : `Shutap ${plan.name}`}
          </h1>
          <p style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.55, color: MUTED, margin: '0 0 22px', maxWidth: '38ch' }}>
            {picking
              ? 'No watermark on either. Pro adds unlimited bits and the Mirror.'
              : plan.tier === 'pro'
                ? 'As many bits as you want, no watermark, and the Mirror.'
                : 'Five new bits a day and no watermark.'}
          </p>
          {cameFromDeck ? (
            <p style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: 14, lineHeight: 1.5, color: MUTED, margin: '-10px 0 22px', maxWidth: '38ch' }}>
              Your jokes are saved. They'll be there when you're back.
            </p>
          ) : null}
        </div>

        {alreadySubbed ? (
          /* already subscribed */
          <div style={{ background: '#ffffff', border: '1px solid rgba(20,20,20,.10)', borderRadius: 18, padding: 22, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 10px 32px rgba(23,19,26,.08)', ...fadeUp(0.1) }}>
            <div style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: 19, lineHeight: 1.4, color: INK }}>
              {currentPlan === 'pro' ? "you're on Pro." : "you're on Basic."}
            </div>
            <div style={{ color: MUTED, fontSize: 14, lineHeight: 1.55 }}>
              {currentPlan === 'pro'
                ? 'cancel or change your card from your profile.'
                : `Pro is ${usd(PLANS.pro.amount)}/mo: unlimited bits and the Mirror. the difference for this month is charged now.`}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {currentPlan !== 'pro' && (
                <button
                  onClick={() => void upgradeToPro()}
                  disabled={upgradeBusy}
                  style={{ background: DEEP_ACCENT, color: '#fff', border: 'none', borderRadius: 999, padding: '11px 20px', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
                >
                  {upgradeBusy ? 'switching…' : `go Pro · ${usd(PLANS.pro.amount)}/mo`}
                </button>
              )}
              <button
                onClick={openPortal}
                disabled={portalBusy}
                style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 999, padding: '11px 20px', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
              >
                {portalBusy ? 'opening…' : 'manage billing →'}
              </button>
              <button
                onClick={() => navigate(currentPlan === 'pro' ? '/mirror' : '/')}
                style={{ background: 'transparent', color: MUTED, border: '1px solid rgba(20,20,20,.18)', borderRadius: 999, padding: '11px 20px', fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}
              >
                {currentPlan === 'pro' ? 'go to the mirror →' : 'write a bit →'}
              </button>
            </div>
            {err && <div style={{ color: DEEP_ACCENT, fontSize: 13 }}>{err}</div>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {!picking && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, border: `1px solid ${HAIRLINE}`, borderRadius: 14, padding: '12px 16px', marginBottom: 22, ...fadeUp(0.1) }}>
                <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: INK }}>
                  {plan.name} <span style={{ fontWeight: 500, color: MUTED }}>{usd(plan.amount)}/{plan.interval === 'year' ? 'year' : 'month'}</span>
                </span>
                <button
                  onClick={() => setPicking(true)}
                  style={{ background: 'transparent', border: 'none', padding: 0, color: ACCENT, fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  change plan
                </button>
              </div>
            )}
            {/* plan cards */}
            {picking && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, ...fadeUp(0.1) }}>
              {/* Pro — featured */}
              <div role="button" tabIndex={0} onClick={() => selectPlan('pro')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectPlan('pro') }} style={planCardStyle(planKey === 'pro', true)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14.5, color: INK }}>{PLANS.pro.name}</span>
                  <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 9.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#fff', background: DEEP_ACCENT, borderRadius: 999, padding: '4px 10px' }}>
                    best deal
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 30, lineHeight: 1, color: INK }}>{usd(PLANS.pro.amount)}</span>
                  <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 400, fontSize: 14, color: MUTED }}>/month</span>
                </div>
                <div style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: 13.5, color: MUTED }}>
                  {PLAN_LINES.pro.join(' · ')}
                </div>
              </div>

              {/* Basic */}
              <div role="button" tabIndex={0} onClick={() => selectPlan('basic')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectPlan('basic') }} style={planCardStyle(planKey === 'basic')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14.5, color: INK }}>{PLANS.basic.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 24, lineHeight: 1, color: INK }}>{usd(PLANS.basic.amount)}</span>
                  <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 400, fontSize: 14, color: MUTED }}>/month</span>
                </div>
                <div style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: 13.5, color: MUTED }}>
                  {PLAN_LINES.basic.join(' · ')}
                </div>
              </div>
            </div>
            )}

            {/* billing, plainly */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 28, ...fadeUp(0.14) }}>
              {[
                `${usd(plan.amount)} today, then every ${plan.interval}. no trial.`,
                'cancel anytime. access runs to the end of the period.',
              ].map((line) => (
                <div key={line} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckGlyph />
                  <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 12.5, fontWeight: 600, color: '#4e4e4e' }}>{line}</span>
                </div>
              ))}
            </div>

            {/* checkout */}
            <div style={fadeUp(0.18)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <LockGlyph size={12} />
                <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: MUTED }}>
                  secure checkout
                </span>
                <span style={{ height: 1, flex: 1, background: 'rgba(20,20,20,.10)' }} />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 10.5, color: SOFT_MUTED }}>powered by</span>
                  <img src={stripeWordmark} alt="Stripe" style={{ height: 15, display: 'block' }} />
                </span>
              </div>

              {err ? (
                <div style={{ background: 'rgba(23,19,26,.08)', border: '1px solid rgba(23,19,26,.35)', borderRadius: 12, padding: 14, color: DEEP_ACCENT, fontSize: 13.5 }}>
                  {err}
                  {errDetail && (
                    <div style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1.45, color: MUTED, wordBreak: 'break-word' }}>details: {errDetail}</div>
                  )}
                </div>
              ) : !authed ? (
                /* the sign-in, in the slot checkout takes once they have one —
                   the same google / apple / email step as /welcome, so a
                   guest never has to leave the paywall to pay for it */
                <div style={{ background: '#100c14', borderRadius: 16, padding: '22px 20px 18px', boxShadow: '0 14px 44px rgba(23,19,26,.16)' }}>
                  <style>{`.oauth-btn:hover{background:rgba(255,255,255,.10);border-color:rgba(255,255,255,.25)}`}</style>
                  <div style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: 17, lineHeight: 1.4, color: '#efedeb', marginBottom: 4 }}>
                    sign in to pay
                  </div>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 12.5, lineHeight: 1.55, color: '#bdb8bb', marginBottom: 16 }}>

                  </div>
                  <AuthStep />
                </div>
              ) : (
                <div style={{ background: '#ffffff', border: '1px solid rgba(20,20,20,.08)', borderRadius: 16, padding: '20px 18px', boxShadow: '0 14px 44px rgba(23,19,26,.10)' }}>
                  <EmbeddedCheckoutProvider key={plan.priceId} stripe={getStripe()} options={{ fetchClientSecret }}>
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12 }}>
                <LockGlyph color={SOFT_MUTED} size={11} />
                <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 11, color: SOFT_MUTED }}>
                  payments by Stripe. we never see your card.
                </span>
              </div>
            </div>

            {/* fine print */}
            <div style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: 12.5, lineHeight: 1.6, color: SOFT_MUTED, marginTop: 22, ...fadeUp(0.22) }}>
              By subscribing you agree to the{' '}
              <a href="/terms" style={{ color: MUTED, textDecoration: 'underline' }}>terms</a>,{' '}
              <a href="/privacy" style={{ color: MUTED, textDecoration: 'underline' }}>privacy policy</a>,{' '}
              <a href="/disclaimer" style={{ color: MUTED, textDecoration: 'underline' }}>disclaimer</a> and{' '}
              <a href="/terms#refunds" style={{ color: MUTED, textDecoration: 'underline' }}>refund policy</a>.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function SubscribeReturnPage() {
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const sessionId = search.get('session_id')
  const [state, setState] = useState<'checking' | 'ok' | 'missing' | 'incomplete'>('checking')
  const [billing, setBilling] = useState<BillingStatus>(null)
  const [portalBusy, setPortalBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const fetchStatus = useServerFn(getMyBillingStatus)
  const openPortalFn = useServerFn(createMirrorPortal)

  useEffect(() => {
    if (!sessionId) { setState('missing'); return }
    let cancelled = false
    // Poll billing status briefly — webhook may land a moment after redirect.
    const started = Date.now()
    const check = async () => {
      try {
        const s = await fetchStatus({ data: { environment: getStripeEnvironment() } })
        if (cancelled) return
        if (s?.isActive) { setBilling(s); setState('ok'); return }
      } catch { /* keep polling */ }
      if (Date.now() - started > 8000) {
        if (!cancelled) setState('incomplete')
        return
      }
      setTimeout(check, 1000)
    }
    void check()
    return () => { cancelled = true }
  }, [sessionId, fetchStatus])

  // Paid from the joke deck: land them back on their cards, not on a receipt.
  // The landing page picks the note up, claims the set to the new alias and
  // opens the deck on the card they had turned over — with all three theirs
  // to flip now.
  useEffect(() => {
    if (state !== 'ok') return
    if (!readJokePending()) return
    navigate('/', { replace: true })
  }, [state, navigate])

  async function openPortal() {
    setPortalBusy(true)
    try {
      const result = await openPortalFn({
        data: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/profile` },
      })
      if ('error' in result) throw new Error(result.error)
      window.location.href = result.url
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not open billing portal')
      setPortalBusy(false)
    }
  }

  // All summary values come from the real billing status row — never hardcoded.
  const planEntry = planByPriceId(billing?.priceId)
  const planLine = planEntry
    ? `${planEntry.name} · ${usd(planEntry.amount)}/${planEntry.interval === 'year' ? 'yr' : 'mo'}`
    : billing?.priceId ?? null
  const isPro = planEntry?.tier === 'pro'
  const periodEndDate = billing?.currentPeriodEnd
    ? new Date(billing.currentPeriodEnd)
        .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        .toLowerCase()
    : null
  const trialing = billing?.status === 'trialing'

  const title = state === 'ok' ? (isPro ? "you're on Pro." : "you're on Basic.")
    : state === 'checking' ? 'confirming your subscription…'
    : state === 'incomplete' ? 'we couldn\'t confirm your subscription yet.'
    : 'no checkout session found.'
  const body = state === 'ok'
    ? (isPro ? 'unlimited bits, no watermark, and the Mirror.' : 'five new bits a day, no watermark.')
    : state === 'checking' ? 'one moment while stripe finalizes.'
    : state === 'incomplete' ? 'if you completed payment, it should appear on your profile within a minute. otherwise, try again.'
    : 'try starting checkout again.'

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, color: INK, fontFamily: 'Inter, system-ui, sans-serif', position: 'relative', overflow: 'hidden' }}>
      <style>{fadeUpKeyframes}</style>

      {/* ambient glow */}
      <div style={{ position: 'absolute', top: -180, left: '50%', transform: 'translateX(-50%)', width: 640, height: 420, background: 'radial-gradient(closest-side, rgba(23,19,26,.14), rgba(23,19,26,0))', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', maxWidth: 500, margin: '0 auto', padding: '26px 20px 72px', display: 'flex', flexDirection: 'column' }}>
        <TopBar onBack={() => navigate('/profile')} />

        <div style={fadeUp()}>
          {state === 'ok' && (
            <span style={{ width: 46, height: 46, borderRadius: 999, background: 'rgba(23,19,26,.14)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <svg width="18" height="15" viewBox="0 0 11 10" fill="none">
                <path d="M1.5 5l3 3 5-6.5" stroke={DEEP_ACCENT} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
          <h1 style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontWeight: 400, fontSize: 31, lineHeight: 1.25, margin: '0 0 10px', color: INK }}>
            {title}
          </h1>
          <p style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.55, color: MUTED, margin: '0 0 24px', maxWidth: '40ch' }}>
            {body}
          </p>
        </div>

        {state === 'ok' && (
          <div style={fadeUp(0.06)}>
            <div style={{ background: '#ffffff', border: '1px solid rgba(20,20,20,.10)', borderRadius: 18, padding: '6px 20px', boxShadow: '0 10px 32px rgba(23,19,26,.08)', marginBottom: 20 }}>
              {planLine && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, padding: '14px 0', borderBottom: '1px solid rgba(20,20,20,.07)' }}>
                  <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 600, color: MUTED }}>plan</span>
                  <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 13.5, fontWeight: 700, color: INK }}>{planLine}</span>
                </div>
              )}
              {periodEndDate && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, padding: '14px 0', borderBottom: '1px solid rgba(20,20,20,.07)' }}>
                  <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 600, color: MUTED }}>{trialing ? 'trial ends' : 'renews'}</span>
                  <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 13.5, fontWeight: 700, color: INK }}>{periodEndDate}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 14, padding: '14px 0' }}>
                <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 600, color: MUTED }}>reminder</span>
                <span style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: 13.5, color: '#4e4e4e' }}>we'll email you before it ends</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
              <button
                onClick={() => navigate('/')}
                style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 999, padding: '12px 22px', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                write a bit →
              </button>
              {isPro && (
                <button
                  onClick={() => navigate('/mirror')}
                  style={{ background: 'transparent', color: MUTED, border: '1px solid rgba(20,20,20,.18)', borderRadius: 999, padding: '12px 22px', fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  go to the mirror →
                </button>
              )}
              <button
                onClick={openPortal}
                disabled={portalBusy}
                style={{ background: 'transparent', color: MUTED, border: '1px solid rgba(20,20,20,.18)', borderRadius: 999, padding: '12px 22px', fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                {portalBusy ? 'opening…' : 'manage billing'}
              </button>
            </div>
            {err && <div style={{ color: DEEP_ACCENT, fontSize: 13, marginBottom: 14 }}>{err}</div>}

            <div style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', fontSize: 12.5, lineHeight: 1.6, color: SOFT_MUTED }}>
              manage or cancel anytime from your profile — cancellation applies at the end of the period.
            </div>
          </div>
        )}

        {(state === 'incomplete' || state === 'missing') && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', ...fadeUp(0.06) }}>
            <button
              onClick={() => navigate('/subscribe')}
              style={{ background: 'transparent', color: MUTED, border: '1px solid rgba(20,20,20,.18)', borderRadius: 999, padding: '12px 22px', fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              try checkout again →
            </button>
            <button
              onClick={() => navigate('/profile')}
              style={{ background: 'transparent', color: MUTED, border: '1px solid rgba(20,20,20,.18)', borderRadius: 999, padding: '12px 22px', fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            >
              go to profile
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
