/* What happens right after someone signs in, shared by /welcome (Google,
 * Apple and email round trips) and Google One Tap on the result page (which
 * signs in without leaving the page). Kept in one place so the two can't
 * drift: completion tracking, the once-per-account sign-up event, the legal
 * acceptance record and the profile made from the provider's name and photo. */
import { supabase } from '@/integrations/supabase/client'

/** Which way this sign-in came in: the identity used most recently
 *  ('google' | 'apple' | 'email'), so completions can be split by method. */
export async function signInMethod(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession()
    const u = data.session?.user
    if (!u) return 'unknown'
    const ids = [...(u.identities ?? [])].sort((a, b) =>
      String(b.last_sign_in_at ?? '').localeCompare(String(a.last_sign_in_at ?? '')))
    return ids[0]?.provider ?? (u.app_metadata as { provider?: string } | undefined)?.provider ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

/** Accounts younger than this when they first land signed in are new sign-ups. */
const NEW_ACCOUNT_MS = 30 * 60_000

/** Fires sign_up_completed exactly once for a brand-new account. `via` names
 *  the surface (e.g. 'one_tap') when it isn't the /welcome page. */
export async function trackSignUpOnce(via?: string): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  const u = data.session?.user as ({ id: string; created_at?: string; is_anonymous?: boolean; user_metadata?: Record<string, unknown> } | undefined)
  if (!u || u.is_anonymous || !u.created_at) return false
  if (Date.now() - new Date(u.created_at).getTime() > NEW_ACCOUNT_MS) return false
  const key = `shutap_signup_tracked_${u.id}`
  try {
    if (localStorage.getItem(key)) return false
    localStorage.setItem(key, '1')
  } catch { /* storage blocked: still count it */ }
  const method = await signInMethod()
  const meta = u.user_metadata ?? {}
  const has_photo = Boolean(meta['avatar_url'] || meta['picture'])
  const m = await import('@/lib/tracking')
  await m.trackEvent('sign_up_completed', { method, has_photo, ...(via ? { via } : {}) })
  return true
}

/** For a sign-in that happened on the page itself (One Tap): everything
 *  /welcome would have done, minus the page. Never throws. */
export async function finishInPlaceSignIn(via: string): Promise<void> {
  try {
    let first = true
    try {
      first = sessionStorage.getItem('shutap_signin_tracked') !== '1'
      sessionStorage.setItem('shutap_signin_tracked', '1')
    } catch { /* noop */ }
    if (first) {
      const method = await signInMethod()
      const m = await import('@/lib/tracking')
      void m.trackEvent('sign_in_completed', { method, via })
    }
    void trackSignUpOnce(via).catch(() => false)

    const [{ recordLegalAcceptance }, { getMyAlias, ensureMyProfile }, { setAlias }] = await Promise.all([
      import('@/lib/legal.functions'),
      import('@/lib/alias.functions'),
      import('@/lib/auth'),
    ])
    void recordLegalAcceptance({ data: {} }).catch(() => {})

    // The bearer can lag a moment behind the new session: one retry.
    type P = { display_name?: string | null; emoji?: string | null; avatar_url?: string | null } | null
    const getAlias = async (): Promise<P | 'error'> => {
      try { return (await getMyAlias()) as P } catch { return 'error' }
    }
    let existing = await getAlias()
    if (existing === 'error') {
      await new Promise((r) => setTimeout(r, 600))
      existing = await getAlias()
    }
    if (existing !== 'error' && existing?.display_name) {
      setAlias({ name: existing.display_name, emoji: existing.emoji ?? '', avatar: existing.avatar_url ?? null })
      return
    }
    let saved: P = null
    try {
      saved = (await ensureMyProfile()) as P
    } catch {
      await new Promise((r) => setTimeout(r, 600))
      saved = (await ensureMyProfile().catch(() => null)) as P
    }
    if (!saved?.display_name) return
    setAlias({ name: saved.display_name, emoji: saved.emoji ?? '', avatar: saved.avatar_url ?? null })
    // A profile made just now is a new account, as on /welcome.
    const welcome = await import('@/lib/welcome-email.functions').catch(() => null)
    void welcome?.sendWelcomeEmail().catch(() => {})
  } catch { /* the session is there; the rest can be redone on /welcome */ }
}
