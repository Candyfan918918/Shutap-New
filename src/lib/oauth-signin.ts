/* One place the provider sign-in is started from, so the welcome page and the
 * joke-card gate cannot drift apart. Both send the browser to /welcome, which
 * is where age, alias and the return trip are handled.
 *
 * Oct 26 2026: one phone tapped Google and Apple 19 times in 8 seconds while
 * the provider page loaded. Each tap started its own sign-in, the losers came
 * back later as "failed to exchange authorization code". Now the first tap
 * holds the lock until the page actually leaves (or 20s pass), and the
 * buttons say they are opening. */
import { useSyncExternalStore } from 'react'
import { lovable } from '@/integrations/lovable'

export type OAuthProvider = 'google' | 'apple'

const LOCK_MS = 20_000
let pending: { provider: OAuthProvider; until: number } | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function setPending(next: typeof pending) {
  pending = next
  emit()
}

function current(): OAuthProvider | null {
  if (pending && Date.now() > pending.until) pending = null
  return pending?.provider ?? null
}

if (typeof window !== 'undefined') {
  // Back button from the provider restores this page from cache with the lock
  // still held; release it so the buttons work again.
  window.addEventListener('pageshow', (e) => { if ((e as PageTransitionEvent).persisted) setPending(null) })
}

/** The provider whose sign-in is opening, or null. Buttons use it to show
 *  "opening Google…" and to stay disabled. */
export function useOAuthPending(): OAuthProvider | null {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l) } },
    current,
    () => null,
  )
}

export function oauthButtonLabel(provider: OAuthProvider, opening: OAuthProvider | null): string {
  const name = provider === 'google' ? 'Google' : 'Apple'
  return opening === provider ? `opening ${name}…` : `continue with ${name}`
}

function track(name: string, props: Record<string, unknown> = {}): void {
  void import('@/lib/tracking').then((m) => m.trackEvent(name, props)).catch(() => {})
}

/** Starts the provider round trip. Returns an error string to show, or null
 *  when the browser is on its way (or already has a session). A second call
 *  while one is opening does nothing. */
export async function startOAuth(provider: OAuthProvider): Promise<string | null> {
  if (current()) {
    track('sign_in_repeat_tap', { method: provider, opening: pending?.provider })
    return null
  }
  setPending({ provider, until: Date.now() + LOCK_MS })
  // A lock that outlives a failed hand-off would leave dead buttons.
  window.setTimeout(() => { if (pending && Date.now() >= pending.until) setPending(null) }, LOCK_MS + 50)
  track('sign_in_started', { method: provider })
  try {
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + '/welcome',
    })
    if (result.error) {
      setPending(null)
      const text = result.error.message || 'sign-in failed — please try again'
      track('sign_in_failed', { method: provider, reason: text })
      return friendlyOAuthError(text)
    }
    if (result.redirected) return null // keep the lock: the page is leaving
    setPending(null)
    track('sign_in_provider_ok', { method: provider })
    return null
  } catch (e) {
    setPending(null)
    const text = e instanceof Error ? e.message : 'sign-in failed — please try again'
    track('sign_in_failed', { method: provider, reason: text })
    return friendlyOAuthError(text)
  }
}

/** Provider errors are written for developers. Say what happened and what to do. */
export function friendlyOAuthError(raw: string): string {
  const t = raw.replace(/\+/g, ' ').toLowerCase()
  if (/reject|cancel|denied|access_denied/.test(t)) return 'Sign-in was cancelled. Try again, or use email.'
  if (/exchange|authorization code|flow state|state is invalid|code verifier|expired/.test(t))
    return 'That sign-in timed out. Tap once and give it a few seconds, or use email.'
  if (/popup/.test(t)) return 'Your browser blocked the sign-in window. Allow pop-ups, or use email.'
  return 'Sign-in didn’t finish. Try again, or use email.'
}
