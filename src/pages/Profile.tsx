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
import { PLANS, PLAN_COMPARE, planByPriceId, usd, type CompareTier } from '@/lib/pricing'
import { Footer } from '@/components/feed/Footer'
import '@/components/feed/feed.css'
import { changePlanToPro, createMirrorPortal, setPlanCancellation } from '@/lib/payments.functions'
import { deleteMyAccount } from '@/lib/account.functions'
import { getStripeEnvironment } from '@/lib/stripe'
import { setAlias, signOut as unifiedSignOut } from '@/lib/auth'
import { supabase } from '@/integrations/supabase/client'
import { useNoIndex } from '@/components/NoIndex'
import { trackEvent } from '@/lib/tracking'
import { myBattleBadges, setRankPicture, type MyBadges } from '@/lib/battle.functions'
import { RANKS, rankAvatarPath, type RankKey } from '@/lib/battle'

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
  const loadBadges = useServerFn(myBattleBadges)
  const pickRankPicture = useServerFn(setRankPicture)

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
  const [badges, setBadges] = useState<MyBadges | null>(null)
  const [badgeBusy, setBadgeBusy] = useState<RankKey | null>(null)
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
    loadBadges()
      .then((b) => {
        setBadges(b)
        if (window.location.hash === '#badges') requestAnimationFrame(() => document.getElementById('badges')?.scrollIntoView({ block: 'center' }))
      })
      .catch(() => setBadges(null))
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

  async function onUseRankPicture(rank: RankKey) {
    setBadgeBusy(rank)
    try {
      apply((await pickRankPicture({ data: { rank } })) as Profile)
      setBadges((b) => (b ? { ...b, pictureRank: rank } : b))
      void trackEvent('battle_rank_picture_used', { rank })
      toast('profile picture updated.')
    } catch (e) {
      toast(e instanceof Error ? e.message : "couldn't change the picture.")
    } finally { setBadgeBusy(null) }
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

        {/* humor wisdom badges, from the joke battle */}
        <BadgesCard badges={badges} busy={badgeBusy} onUse={(k) => void onUseRankPicture(k)} />

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
      `}</style>
      <Footer />
      {ToastHost}
    </div>
  )
}

/** Badges collected in the homepage joke battle. Each earned rank's picture
 *  can be used as the profile picture. */
function BadgesCard({ badges, busy, onUse }: { badges: MyBadges | null; busy: RankKey | null; onUse: (k: RankKey) => void }) {
  if (badges === null) return null
  const picks = badges.picks
  return (
    <section id="badges" className="fd-post pf-badges" aria-label="Humor wisdom badges" style={{ scrollMarginTop: 90 }}>
      <div className="fd-between">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <b style={{ fontSize: 16 }}>Humor wisdom badges</b>
          <span className="fd-muted" style={{ fontSize: 13 }}>
            {picks
              ? `${badges.rank?.name ?? 'No rank yet'} · ${picks} ${picks === 1 ? 'pick' : 'picks'}${badges.next ? ` · ${badges.next.at - picks} to ${badges.next.name}` : ''}${badges.humorLabel ? ` · ${badges.humorLabel}` : ''}`
              : 'Pick the funniest line in the joke battle to earn your first badge.'}
          </span>
        </div>
        <a href="/#battle" className="fd-link" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>play →</a>
      </div>
      <ol className="pf-ranks">
        {RANKS.map((r) => {
          const earned = badges.earned.includes(r.key)
          const inUse = badges.pictureRank === r.key
          return (
            <li key={r.key} className={`pf-rank${earned ? ' earned' : ''}`}>
              <img src={rankAvatarPath(r.key)} alt="" width={56} height={56} className="pf-rank-pic" />
              <b>{r.name}</b>
              <span className="fd-faint">{earned ? 'collected' : `${r.at} ${r.at === 1 ? 'pick' : 'picks'}`}</span>
              {earned ? (
                inUse ? (
                  <span className="pf-rank-tag">your picture</span>
                ) : (
                  <button className="fd-btn sm ghost pf-rank-btn" disabled={busy !== null} onClick={() => onUse(r.key)}>
                    {busy === r.key ? 'Saving…' : 'Use as picture'}
                  </button>
                )
              ) : (
                <span className="pf-rank-tag locked">locked</span>
              )}
            </li>
          )
        })}
      </ol>
      <style>{`
        .pf-ranks { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 10px; }
        .pf-rank { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 8px; border: 1px solid var(--line); border-radius: 14px; text-align: center; font-size: 14px; }
        .pf-rank .fd-faint { font-size: 12px; }
        .pf-rank-pic { width: 56px; height: 56px; border-radius: 999px; margin-bottom: 4px; }
        .pf-rank:not(.earned) .pf-rank-pic { filter: grayscale(1) opacity(.45); }
        .pf-rank:not(.earned) b { color: var(--faint, #7d7277); }
        .pf-rank.earned .pf-rank-pic { box-shadow: 0 0 0 2px #fff, 0 0 0 3.5px var(--rose, #b8456b); }
        .pf-rank-btn { margin-top: 4px; height: 32px !important; padding: 0 12px !important; font-size: 12px !important; }
        .pf-rank-tag { margin-top: 4px; height: 32px; display: inline-flex; align-items: center; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--rose-ink, #9b3559); }
        .pf-rank-tag.locked { color: var(--faint, #7d7277); font-weight: 600; }
      `}</style>
    </section>
  )
}

/** The plan's rows, the same ones the pricing page and paywall compare. */
function PlanRows({ tier }: { tier: CompareTier }) {
  return (
    <dl style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
      {PLAN_COMPARE.map((r, i) => {
        const c = r.cells[tier]
        return (
          <div key={r.label} className="fd-between" style={{ padding: '9px 0', borderTop: i ? '1px solid var(--line)' : 'none', alignItems: 'baseline' }}>
            <dt style={{ fontSize: 14, color: 'var(--muted)' }}>{r.label}</dt>
            <dd style={{ margin: 0, fontSize: 14.5, fontWeight: c.on ? 800 : 500, color: c.on ? 'var(--ink)' : 'var(--faint)' }}>{c.value}</dd>
          </div>
        )
      })}
    </dl>
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
        <PlanRows tier="free" />
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
      {(paid === 'basic' || paid === 'pro') && <PlanRows tier={paid} />}
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
