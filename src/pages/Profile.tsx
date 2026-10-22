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
import { planByPriceId, usd } from '@/lib/pricing'
import { createMirrorPortal, setPlanCancellation } from '@/lib/payments.functions'
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

const label: React.CSSProperties = {
  fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 10.5, letterSpacing: '.16em',
  textTransform: 'uppercase', color: '#6f666c', marginBottom: 10,
}
const card: React.CSSProperties = {
  background: '#fff', border: '.5px solid rgba(11,8,15,.08)', borderRadius: 14, padding: 16,
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
      toast(cancel ? 'cancelled. no more charges.' : 'your plan will renew.')
      return null
    } catch {
      return "Couldn't change your plan. Nothing was changed; try again in a minute."
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
    <div style={{ minHeight: '100vh', background: 'transparent', color: '#0b080f' }}>
      <main style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(40px, 8vw, 72px) 20px 80px' }}>
        <h1 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em', margin: '0 0 24px' }}>profile</h1>

        {/* photo + name */}
        <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <UserAvatar name={profile?.display_name} avatar={profile?.avatar_url} emoji={profile?.emoji} size={72} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button disabled={busy === 'photo' || !profile} onClick={() => fileRef.current?.click()} style={btn('#17131a')}>
                  {busy === 'photo' ? 'uploading…' : profile?.avatar_url ? 'change photo' : 'upload photo'}
                </button>
                {profile?.avatar_url && (
                  <button disabled={busy === 'photo'} onClick={onRemovePhoto} style={btn('#6f666c')}>remove</button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => void onPickPhoto(e.target.files?.[0])} />
            </div>
          </div>

          <div>
            <div style={label}>name</div>
            {!editing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 18 }}>{profile?.display_name ?? '…'}</span>
                {profile && (
                  <button onClick={() => { setNameDraft(profile.display_name); setEditing(true) }} style={btn('#17131a')}>edit</button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  value={nameDraft}
                  maxLength={80}
                  autoFocus
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void onSaveName() }}
                  style={{ flex: '1 1 220px', border: '.5px solid rgba(11,8,15,.2)', borderRadius: 10, padding: '9px 12px', fontFamily: 'Sora,sans-serif', fontSize: 15, background: '#fff' }}
                />
                <button disabled={busy === 'name'} onClick={() => void onSaveName()} style={btn('#b8456b')}>{busy === 'name' ? 'saving…' : 'save'}</button>
                <button disabled={busy === 'name'} onClick={() => setEditing(false)} style={btn('#6f666c')}>cancel</button>
              </div>
            )}
          </div>

          {email && (
            <div>
              <div style={label}>email</div>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 14, color: '#443c42' }}>{email}</div>
            </div>
          )}
        </section>

        {/* plan */}
        <div style={{ marginTop: 28 }}>
          <div style={label}>plan</div>
          <BillingCard billing={billing} onOpenPortal={openPortal} portalBusy={portalBusy} navigate={navigate} onCancellation={changeCancellation} />
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/set-list')} style={wineLink}>your set list →</button>
          <button onClick={signOut} style={wineLink}>sign out →</button>
        </div>

        {/* delete */}
        <div style={{ marginTop: 36, paddingTop: 22, borderTop: '.5px solid rgba(179,38,30,.16)' }}>
          {!showDelete ? (
            <button onClick={() => setShowDelete(true)} style={{ ...btn('#b3261e'), background: 'transparent' }}>delete account</button>
          ) : (
            <div style={{ background: '#fff5f5', border: '.5px solid rgba(179,38,30,.24)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 15, lineHeight: 1.5 }}>
                this deletes your account, your profile, your bits, and cancels any subscription. it can't be undone.
              </div>
              <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 11, color: '#443c42' }}>
                type <strong>delete my account</strong> to confirm.
              </div>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="delete my account"
                style={{ border: '.5px solid rgba(179,38,30,.32)', borderRadius: 10, padding: '9px 12px', fontFamily: 'Sora,sans-serif', fontSize: 14, background: '#fff' }}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  disabled={deleteBusy || deleteConfirm !== 'delete my account'}
                  onClick={() => void onDeleteAccount()}
                  style={{ ...btn('#b3261e'), opacity: deleteBusy || deleteConfirm !== 'delete my account' ? 0.5 : 1 }}
                >{deleteBusy ? 'deleting…' : 'delete permanently'}</button>
                <button disabled={deleteBusy} onClick={() => { setShowDelete(false); setDeleteConfirm('') }} style={btn('#2b2630')}>cancel</button>
              </div>
            </div>
          )}
        </div>
      </main>
      {ToastHost}
    </div>
  )
}

function btn(color: string): React.CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: 999,
    border: '.5px solid ' + color + '40',
    background: color + '10',
    color,
    fontFamily: 'Sora,sans-serif',
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '.02em',
    cursor: 'pointer',
  }
}

function planLabelFor(priceId: string | null): string {
  const p = planByPriceId(priceId)
  if (p) return `${p.name} · ${usd(p.amount)}/${p.interval === 'year' ? 'yr' : 'mo'}`
  return priceId ?? 'unknown plan'
}

function BillingCard({
  billing,
  onOpenPortal,
  portalBusy,
  navigate,
  onCancellation,
}: {
  billing: BillingStatus | undefined
  onOpenPortal: () => void
  portalBusy: boolean
  navigate: (path: string) => void
  onCancellation: (cancel: boolean) => Promise<string | null>
}) {
  const [confirming, setConfirming] = useState(false)
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
  if (billing === undefined) {
    return <div style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', color: '#6f666c' }}>loading…</div>
  }
  // A plan that has ended (cancelled, or never paid) shows as free.
  if (billing === null || !billing.isActive) {
    return (
      <div style={{ background: '#fff', border: '.5px solid rgba(11,8,15,.08)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 15, color: '#0b080f' }}>
          you're on free.
        </div>
        <div>
          <button onClick={() => navigate('/pricing')} style={btn('#17131a')}>see plans →</button>
        </div>
      </div>
    )
  }
  const end = billing.currentPeriodEnd ? new Date(billing.currentPeriodEnd) : null
  const endStr = end ? end.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null
  const statusLabel =
    billing.status === 'trialing' ? 'trialing'
    : billing.status === 'active' && billing.cancelAtPeriodEnd ? 'canceling'
    : billing.status === 'active' ? 'active'
    : billing.status === 'past_due' ? 'payment failed'
    : billing.status
  const statusColor =
    billing.status === 'past_due' ? '#b3261e'
    : billing.cancelAtPeriodEnd ? '#6f666c'
    : '#17131a'
  return (
    <div style={{ background: '#fff', border: '.5px solid rgba(11,8,15,.08)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: statusColor, background: statusColor + '18', padding: '3px 8px', borderRadius: 999 }}>
          {statusLabel}
        </span>
        <span style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 15, color: '#0b080f' }}>
          {planLabelFor(billing.priceId)}
        </span>
      </div>
      {endStr && (
        <div style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 13.5, color: '#443c42' }}>
          {billing.status === 'trialing' ? `trial ends ${endStr}`
            : billing.cancelAtPeriodEnd ? `access ends ${endStr}`
            : billing.status === 'past_due' ? `payment retrying · access until ${endStr}`
            : `renews ${endStr}`}
        </div>
      )}
      {confirming ? (
        <div style={{ borderTop: '.5px solid rgba(11,8,15,.08)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 14, color: '#0b080f', lineHeight: 1.5 }}>
            Cancel {planByPriceId(billing.priceId)?.name ?? 'your plan'}? You won't be charged again.
            {endStr ? ` You keep it until ${endStr}, then you're on free.` : " You'll be on free when this period ends."}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button disabled={changing} onClick={() => void change(true)} style={btn('#b8456b')}>{changing ? 'cancelling…' : 'yes, cancel'}</button>
            <button disabled={changing} onClick={() => { setConfirming(false); setChangeErr(null) }} style={btn('#6f666c')}>keep my plan</button>
          </div>
        </div>
      ) : null}
      {changeErr && (
        <div role="alert" style={{ fontFamily: 'Sora,sans-serif', fontSize: 13, color: '#b3261e' }}>{changeErr}</div>
      )}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {billing.cancelAtPeriodEnd ? (
          <button onClick={() => void change(false)} disabled={changing} style={wineLink}>
            {changing ? 'saving…' : 'keep my plan →'}
          </button>
        ) : !confirming ? (
          <button onClick={() => { setConfirming(true); setChangeErr(null) }} style={wineLink}>
            cancel plan →
          </button>
        ) : null}
        {billing.hasCustomer && (
          <button onClick={onOpenPortal} disabled={portalBusy} style={wineLink}>
            {portalBusy ? 'opening…' : 'card and receipts →'}
          </button>
        )}
      </div>
    </div>
  )
}

const wineLink: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: 0,
  color: '#2b2630',
  fontFamily: "'Newsreader',serif",
  fontStyle: 'italic',
  fontSize: 14,
  cursor: 'pointer',
  textDecoration: 'none',
}
