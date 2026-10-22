/* Profile: the person's real name and picture, their plan, and the account
 * basics. Everything else that used to live here (the cards tab, stories,
 * made-up-name controls, the mirror) is gone (Oct 2026). Bits live in the
 * set list. */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@/compat/router'
import { useServerFn } from '@tanstack/react-start'

import { useToast } from '../components/Toast'
import { UserAvatar } from '@/components/UserAvatar'
import { ensureMyProfile, updateMyProfile, setMyAvatar, removeMyAvatar } from '@/lib/alias.functions'
import { getMyBillingStatus, type BillingStatus } from '@/lib/billing.functions'
import { PLANS, PLAN_LINES, planByPriceId, usd } from '@/lib/pricing'
import { BIT_CAPS } from '@/lib/bits/plans'
import { Footer } from '@/components/feed/Footer'
import '@/components/feed/feed.css'
import { changePlanToPro, createMirrorPortal, setPlanCancellation } from '@/lib/payments.functions'
import { deleteMyAccount } from '@/lib/account.functions'
import { getStripeEnvironment } from '@/lib/stripe'
import { setAlias, signOut as unifiedSignOut } from '@/lib/auth'
import { supabase } from '@/integrations/supabase/client'
import { useNoIndex } from '@/components/NoIndex'

type Profile = { display_name: string; emoji: string; avatar_url: string | null }

/** Square-crop and shrink an image to a small JPEG data URL in the browser. */
async function toAvatarDataUrl(file: File, size = 320): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error('could not read that image'))
      i.src = url
    })
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    const sx = (img.naturalWidth - side) / 2
    const sy = (img.naturalHeight - side) / 2
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('could not read that image')
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
    return c.toDataURL('image/jpeg', 0.86)
  } finally {
    URL.revokeObjectURL(url)
  }
}


export function ProfilePage() {
  useNoIndex()
  const navigate = useNavigate()
  const { toast, ToastHost } = useToast()
  const loadProfile = useServerFn(ensureMyProfile)
  const saveName = useServerFn(updateMyProfile)
  const uploadAvatar = useServerFn(setMyAvatar)
  const clearAvatar = useServerFn(removeMyAvatar)
  const fetchBilling = useServerFn(getMyBillingStatus)
  const openPortalFn = useServerFn(createMirrorPortal)
  const setCancelFn = useServerFn(setPlanCancellation)
  const upgradeFn = useServerFn(changePlanToPro)
  const deleteAccountFn = useServerFn(deleteMyAccount)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [editing, setEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [busy, setBusy] = useState<null | 'name' | 'photo'>(null)
  const [billing, setBilling] = useState<BillingStatus | undefined>(undefined)
  const [portalBusy, setPortalBusy] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const apply = (p: Profile | null) => {
    if (!p) return
    setProfile(p)
    setAlias({ name: p.display_name, emoji: p.emoji, avatar: p.avatar_url })
  }

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user?.email ?? ''))
    loadProfile().then((p) => apply(p as Profile)).catch(() => toast("couldn't load your profile."))
    fetchBilling({ data: { environment: getStripeEnvironment() } })
      .then((b) => setBilling(b as BillingStatus))
      .catch(() => setBilling(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSaveName() {
    const v = nameDraft.trim()
    if (!v) return toast('enter a name.')
    setBusy('name')
    try {
      apply((await saveName({ data: { display_name: v } })) as Profile)
      setEditing(false)
      toast('saved.')
    } catch (e) {
      toast(e instanceof Error ? e.message : "couldn't save.")
    } finally { setBusy(null) }
  }

  async function onPickPhoto(file: File | undefined) {
    if (!file) return
    if (!/^image\//.test(file.type)) return toast('pick an image file.')
    setBusy('photo')
    try {
      const data_url = await toAvatarDataUrl(file)
      apply((await uploadAvatar({ data: { data_url } })) as Profile)
      toast('photo updated.')
    } catch (e) {
      toast(e instanceof Error ? e.message : "couldn't upload that photo.")
    } finally {
      setBusy(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onRemovePhoto() {
    setBusy('photo')
    try { apply((await clearAvatar()) as Profile) } catch { toast("couldn't remove the photo.") } finally { setBusy(null) }
  }

  async function openPortal() {
    setPortalBusy(true)
    try {
      const result = await openPortalFn({
        data: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/profile` },
      })
      if ('error' in result) throw new Error(result.error)
      window.location.href = result.url
    } catch (e) {
      toast(e instanceof Error ? e.message : "couldn't open billing.")
      setPortalBusy(false)
    }
  }

  /** Cancel (true) or keep (false) the plan. Returns an error message, or
   *  null when it worked. */
  async function changeCancellation(cancel: boolean): Promise<string | null> {
    try {
      const r = await setCancelFn({ data: { environment: getStripeEnvironment(), cancel } })
      if (!r.ok) return r.error === 'no_plan' ? "There's no active plan on this account." : "Couldn't change your plan. Nothing was changed; try again in a minute."
      setBilling((b) => (b ? { ...b, cancelAtPeriodEnd: r.cancelAtPeriodEnd, currentPeriodEnd: r.currentPeriodEnd ?? b.currentPeriodEnd } : b))
      toast(cancel ? 'Cancelled. You won\'t be charged again.' : 'Your plan will renew.')
      return null
    } catch {
      return "Couldn't change your plan. Nothing was changed; try again in a minute."
    }
  }

  /** Basic -> Pro: Stripe charges the difference now. Returns an error
   *  message, or null when it worked. */
  async function upgrade(): Promise<string | null> {
    try {
      const r = await upgradeFn({ data: { environment: getStripeEnvironment() } })
      if (!r.ok) {
        if (r.error === 'no_basic_plan') {
          navigate('/subscribe?plan=pro')
          return null
        }
        return "Couldn't upgrade you. Your card wasn't charged for Pro; you're still on Basic."
      }
      const b = await fetchBilling({ data: { environment: getStripeEnvironment() } })
      setBilling(b as BillingStatus)
      toast("You're on Pro.")
      return null
    } catch {
      return "Couldn't upgrade you. Try again in a minute."
    }
  }

  async function onDeleteAccount() {
    if (deleteConfirm !== 'delete my account') return toast('type "delete my account" to confirm.')
    setDeleteBusy(true)
    try {
      const result = await deleteAccountFn({ data: { environment: getStripeEnvironment(), confirm: deleteConfirm } })
      if ('error' in result) throw new Error(result.error)
      try { localStorage.clear() } catch { /* noop */ }
      await supabase.auth.signOut()
      toast('account deleted.')
      navigate('/')
    } catch (e) {
      toast(e instanceof Error ? e.message : "couldn't delete account.")
      setDeleteBusy(false)
    }
  }

  async function signOut() {
    await unifiedSignOut()
    navigate('/')
  }

  return (
    <div className="fd">
      <div className="fd-col" style={{ paddingTop: 36 }}>
        <h1 className="fd-h1" style={{ fontSize: 28 }}>
          Your account
        </h1>

        {/* who */}
        <section className="fd-post" aria-label="Profile">
          <div className="fd-row" style={{ gap: 14, alignItems: 'center' }}>
            <UserAvatar name={profile?.display_name} avatar={profile?.avatar_url} emoji={profile?.emoji} size={64} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {!editing ? (
                <b style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.02em', overflowWrap: 'anywhere' }}>{profile?.display_name ?? '…'}</b>
              ) : (
                <input
                  className="fd-input"
                  aria-label="Name"
                  value={nameDraft}
                  maxLength={80}
                  autoFocus
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void onSaveName()
                    if (e.key === 'Escape') setEditing(false)
                  }}
                />
              )}
              {email && <span className="fd-muted" style={{ overflowWrap: 'anywhere' }}>{email}</span>}
            </div>
          </div>
          <div className="fd-row" style={{ flexWrap: 'wrap' }}>
            {editing ? (
              <>
                <button className="fd-btn sm" disabled={busy === 'name'} onClick={() => void onSaveName()}>
                  {busy === 'name' ? 'Saving…' : 'Save name'}
                </button>
                <button className="fd-btn sm ghost" disabled={busy === 'name'} onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  className="fd-btn sm ghost"
                  disabled={!profile}
                  onClick={() => {
                    if (!profile) return
                    setNameDraft(profile.display_name)
                    setEditing(true)
                  }}
                >
                  Edit name
                </button>
                <button className="fd-btn sm ghost" disabled={busy === 'photo' || !profile} onClick={() => fileRef.current?.click()}>
                  {busy === 'photo' ? 'Uploading…' : profile?.avatar_url ? 'Change photo' : 'Add photo'}
                </button>
                {profile?.avatar_url && (
                  <button className="fd-link fd-muted" disabled={busy === 'photo'} onClick={onRemovePhoto} style={{ marginLeft: 4, whiteSpace: 'nowrap' }}>
                    Remove photo
                  </button>
                )}
              </>
            )}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => void onPickPhoto(e.target.files?.[0])} />
          </div>
        </section>

        {/* plan */}
        <BillingCard billing={billing} onOpenPortal={openPortal} portalBusy={portalBusy} navigate={navigate} onCancellation={changeCancellation} onUpgrade={upgrade} />

        {/* elsewhere */}
        <section className="fd-post" style={{ gap: 0, padding: '4px 16px' }} aria-label="More">
          <button className="fd-link pf-row" onClick={() => navigate('/set-list')}>
            <span>Your set list</span>
            <span aria-hidden className="fd-faint">→</span>
          </button>
          <button className="fd-link pf-row" onClick={() => void signOut()} style={{ borderTop: '1px solid var(--line)' }}>
            <span>Sign out</span>
            <span aria-hidden className="fd-faint">→</span>
          </button>
        </section>

        {/* delete */}
        {!showDelete ? (
          <button className="fd-link" onClick={() => setShowDelete(true)} style={{ alignSelf: 'flex-start', color: '#b3261e', fontSize: 13, fontWeight: 600, marginTop: 6 }}>
            Delete account
          </button>
        ) : (
          <section className="fd-post" style={{ borderColor: 'rgba(179,38,30,.28)' }} aria-label="Delete account">
            <b style={{ fontSize: 15 }}>Delete your account?</b>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--ink-2)' }}>
              This deletes your account, your profile and your bits, and cancels any plan. It can't be undone.
            </p>
            <label className="fd-muted" htmlFor="pf-delete">
              Type <b style={{ color: 'var(--ink)' }}>delete my account</b> to confirm.
            </label>
            <input id="pf-delete" className="fd-input" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="delete my account" />
            <div className="fd-row" style={{ flexWrap: 'wrap' }}>
              <button
                className="fd-btn sm"
                style={{ background: '#b3261e' }}
                disabled={deleteBusy || deleteConfirm !== 'delete my account'}
                onClick={() => void onDeleteAccount()}
              >
                {deleteBusy ? 'Deleting…' : 'Delete permanently'}
              </button>
              <button
                className="fd-btn sm ghost"
                disabled={deleteBusy}
                onClick={() => {
                  setShowDelete(false)
                  setDeleteConfirm('')
                }}
              >
                Keep my account
              </button>
            </div>
          </section>
        )}
      </div>
      <style>{`
        .fd-link.pf-row { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 14px 0; font-weight: 600; font-size: 15px; text-align: left; }
        .fd-link.pf-row:hover span:first-child { color: var(--rose-ink); }
        .pf-lines { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; font-size: 14px; color: var(--ink-2); }
        .pf-lines li { display: flex; gap: 8px; }
        .pf-lines li::before { content: '✓'; color: var(--rose); font-weight: 800; }
      `}</style>
      <Footer />
      {ToastHost}
    </div>
  )
}

function planLabelFor(priceId: string | null): { name: string; price: string } {
  const p = planByPriceId(priceId)
  if (p) return { name: p.name, price: `${usd(p.amount)}/${p.interval === 'year' ? 'year' : 'month'}` }
  return { name: 'Paid plan', price: '' }
}

function BillingCard({
  billing,
  onOpenPortal,
  portalBusy,
  navigate,
  onCancellation,
  onUpgrade,
}: {
  billing: BillingStatus | undefined
  onOpenPortal: () => void
  portalBusy: boolean
  navigate: (path: string) => void
  onCancellation: (cancel: boolean) => Promise<string | null>
  onUpgrade: () => Promise<string | null>
}) {
  const [confirming, setConfirming] = useState(false)
  const [upgrading, setUpgrading] = useState<'ask' | 'busy' | null>(null)
  const [changing, setChanging] = useState(false)
  const [changeErr, setChangeErr] = useState<string | null>(null)
  async function change(cancel: boolean) {
    setChanging(true)
    setChangeErr(null)
    const err = await onCancellation(cancel)
    setChanging(false)
    setChangeErr(err)
    if (!err) setConfirming(false)
  }

  const head = (pill?: { text: string; quiet?: boolean; alert?: boolean }) => (
    <div className="fd-between">
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Plan</h2>
      {pill && (
        <span
          className="fd-pill"
          style={pill.alert ? { background: '#fdecea', color: '#b3261e' } : pill.quiet ? { background: 'var(--surface)', color: 'var(--muted)' } : undefined}
        >
          {pill.text}
        </span>
      )}
    </div>
  )

  if (billing === undefined) {
    return (
      <section className="fd-post" aria-label="Plan">
        {head()}
        <span className="fd-muted">Loading…</span>
      </section>
    )
  }

  // No plan, or one that has ended (cancelled, or never paid): Free.
  if (billing === null || !billing.isActive) {
    return (
      <section className="fd-post" aria-label="Plan">
        {head({ text: 'Free', quiet: true })}
        <div>
          <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.03em' }}>Free</span>
        </div>
        <ul className="pf-lines">
          <li>{BIT_CAPS.free} new bits a day</li>
          <li>Teleprompter, scene and screenplay views</li>
          <li>Your set list keeps every bit</li>
        </ul>
        <button className="fd-btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/pricing')}>
          See plans
        </button>
      </section>
    )
  }

  const end = billing.currentPeriodEnd ? new Date(billing.currentPeriodEnd) : null
  const endStr = end ? end.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null
  const plan = planLabelFor(billing.priceId)
  const paid = planByPriceId(billing.priceId)?.tier
  const lines = paid === 'pro' || paid === 'basic' ? PLAN_LINES[paid] : []
  const cancelling = billing.cancelAtPeriodEnd
  const pastDue = billing.status === 'past_due'

  const pill = cancelling
    ? { text: endStr ? `Ends ${endStr}` : 'Cancelled', quiet: true }
    : pastDue
      ? { text: 'Payment failed', alert: true }
      : billing.status === 'trialing'
        ? { text: 'Trial' }
        : { text: 'Active' }

  const statusLine = cancelling
    ? `Cancelled. You won't be charged again. You keep ${plan.name}${endStr ? ` until ${endStr}` : ' until this period ends'}, then you're on Free.`
    : pastDue
      ? `Your last payment didn't go through. Update your card to keep ${plan.name}.`
      : billing.status === 'trialing'
        ? endStr ? `Trial ends ${endStr}.` : 'Trial.'
        : endStr ? `Renews ${endStr}.` : 'Renews monthly.'

  return (
    <section className="fd-post" aria-label="Plan">
      {head(pill)}
      <div>
        <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.03em' }}>{plan.name}</span>
        {plan.price && <span className="fd-muted"> {plan.price}</span>}
      </div>
      {lines.length > 0 && (
        <ul className="pf-lines">
          {lines.map((l) => (
            <li key={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</li>
          ))}
        </ul>
      )}
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: pastDue ? '#b3261e' : 'var(--ink-2)' }}>{statusLine}</p>

      {confirming && !cancelling && (
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b style={{ fontSize: 15 }}>Cancel {plan.name}?</b>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--ink-2)' }}>
            You won't be charged again.{endStr ? ` You keep ${plan.name} until ${endStr}, then you're on Free.` : " You're on Free when this period ends."}
          </p>
          <div className="fd-row" style={{ flexWrap: 'wrap' }}>
            <button className="fd-btn sm" style={{ background: '#b3261e' }} disabled={changing} onClick={() => void change(true)}>
              {changing ? 'Cancelling…' : `Cancel ${plan.name}`}
            </button>
            <button
              className="fd-btn sm ghost"
              disabled={changing}
              onClick={() => {
                setConfirming(false)
                setChangeErr(null)
              }}
            >
              Go back
            </button>
          </div>
        </div>
      )}
      {upgrading && (
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b style={{ fontSize: 15 }}>Upgrade to Pro?</b>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--ink-2)' }}>
            {usd(PLANS.pro.amount)}/month for unlimited bits and the Mirror. The difference for the rest of this month is charged now, to the card you pay with.
            {cancelling ? ' This also undoes your cancellation.' : ''}
          </p>
          <div className="fd-row" style={{ flexWrap: 'wrap' }}>
            <button
              className="fd-btn sm"
              disabled={upgrading === 'busy'}
              onClick={async () => {
                setUpgrading('busy')
                setChangeErr(null)
                const err = await onUpgrade()
                setChangeErr(err)
                setUpgrading(err ? 'ask' : null)
              }}
            >
              {upgrading === 'busy' ? 'Upgrading…' : 'Pay and upgrade'}
            </button>
            <button
              className="fd-btn sm ghost"
              disabled={upgrading === 'busy'}
              onClick={() => {
                setUpgrading(null)
                setChangeErr(null)
              }}
            >
              Go back
            </button>
          </div>
        </div>
      )}
      {changeErr && (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: '#b3261e' }}>
          {changeErr}
        </p>
      )}

      {!confirming && !upgrading && (
        <div className="fd-row" style={{ flexWrap: 'wrap', gap: 10 }}>
          {paid === 'basic' && !pastDue && (
            <button
              className="fd-btn sm"
              onClick={() => {
                setUpgrading('ask')
                setChangeErr(null)
              }}
            >
              Upgrade to Pro · {usd(PLANS.pro.amount)}/mo
            </button>
          )}
          {cancelling ? (
            <button className="fd-btn sm ghost" disabled={changing} onClick={() => void change(false)}>
              {changing ? 'Saving…' : "Don't cancel"}
            </button>
          ) : (
            <button
              className="fd-btn sm ghost"
              onClick={() => {
                setConfirming(true)
                setChangeErr(null)
              }}
            >
              Cancel plan
            </button>
          )}
        </div>
      )}
      {billing.hasCustomer && !confirming && !upgrading && (
        <button className="fd-link fd-muted" disabled={portalBusy} onClick={onOpenPortal} style={{ alignSelf: 'flex-start', whiteSpace: 'nowrap' }}>
          {portalBusy ? 'Opening…' : pastDue ? 'Update card →' : 'Card and receipts →'}
        </button>
      )}
    </section>
  )
}
