/* Google One Tap on the result page (designed Nov 1 2026, canvas
 * "Shutap — Google One Tap on the result page").
 *
 * A guest who is already signed in to Google in this browser gets Google's
 * own "Continue as <name>" card about 2 seconds after their first bit
 * finishes. One tap signs them in without leaving the page; the bit stays,
 * is claimed into their set list, and everything on the result unlocks.
 * Everyone else keeps the normal sign-in buttons.
 *
 * Google draws and words the card; we only decide when to ask. Google itself
 * backs off after a close (longer each time), so this can't nag.
 *
 * Needs Shutap's own Google OAuth client (Lovable Cloud → Users → Auth →
 * Google → "Your own credentials"): Lovable's managed Google login can't
 * issue One Tap tokens. Until GOOGLE_CLIENT_ID is set this does nothing.
 *
 * Tracked (admin events + PostHog): one_tap_requested, one_tap_not_shown
 * (Google's reason), one_tap_dismissed, one_tap_credential, one_tap_signed_in,
 * one_tap_failed. Plus the usual sign_in_completed / sign_up_completed with
 * via: 'one_tap'. */
import { supabase } from '@/integrations/supabase/client'
import { isProdHost } from '@/lib/env'

/** The public OAuth client id (not a secret: Google shows it in every page
 *  that uses it). Empty = One Tap is off. */
const GOOGLE_CLIENT_ID: string = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || ''

type Credential = { credential: string; select_by?: string }
type Moment = {
  isNotDisplayed?: () => boolean
  getNotDisplayedReason?: () => string
  isSkippedMoment?: () => boolean
  getSkippedReason?: () => string
  isDismissedMoment?: () => boolean
  getDismissedReason?: () => string
}
type GoogleId = {
  initialize: (cfg: Record<string, unknown>) => void
  prompt: (cb?: (m: Moment) => void) => void
  cancel: () => void
}
declare global {
  interface Window { google?: { accounts?: { id?: GoogleId } } }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
let scriptPromise: Promise<GoogleId | null> | null = null
/** One ask per page view; Google adds its own cool-down on top. */
let askedThisPage = false
let rawNonce = ''

export function oneTapAvailable(): boolean {
  return Boolean(GOOGLE_CLIENT_ID) && isProdHost()
}

function track(name: string, props: Record<string, unknown> = {}): void {
  void import('@/lib/tracking').then((m) => m.trackEvent(name, props)).catch(() => {})
}

function loadScript(): Promise<GoogleId | null> {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve) => {
    if (window.google?.accounts?.id) return resolve(window.google.accounts.id)
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve(window.google?.accounts?.id ?? null)
    s.onerror = () => { scriptPromise = null; resolve(null) }
    document.head.appendChild(s)
  })
  return scriptPromise
}

function randomNonce(): string {
  const a = new Uint8Array(24)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

type Options = {
  /** Called the moment Google hands back a credential, before signing in:
   *  leave the note that brings the bit back after sign-in. */
  onCredential: () => void
  /** Called if signing in with the credential fails. */
  onError?: (message: string) => void
  where: string
}

/** Ask Google to show One Tap. Safe to call any number of times: it asks at
 *  most once per page view, and only on shutap.com with a client id set. */
export async function promptOneTap(opts: Options): Promise<void> {
  if (!oneTapAvailable() || askedThisPage) return
  try {
    const { data } = await supabase.auth.getSession()
    if (data.session && data.session.user.is_anonymous !== true) return
  } catch { /* no session check: still fine to ask */ }

  const gid = await loadScript()
  if (!gid) { track('one_tap_failed', { where: opts.where, reason: 'script_blocked' }); return }
  if (askedThisPage) return
  askedThisPage = true

  rawNonce = randomNonce()
  const hashed = await sha256Hex(rawNonce)

  gid.initialize({
    client_id: GOOGLE_CLIENT_ID,
    nonce: hashed,
    context: 'signin',
    ux_mode: 'popup',
    auto_select: false,
    cancel_on_tap_outside: false,
    itp_support: true,
    use_fedcm_for_prompt: true,
    callback: async ({ credential, select_by }: Credential) => {
      track('one_tap_credential', { where: opts.where, select_by: select_by ?? null })
      try { opts.onCredential() } catch { /* noop */ }
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: credential, nonce: rawNonce })
      if (error) {
        track('one_tap_failed', { where: opts.where, reason: error.message.slice(0, 200) })
        opts.onError?.('Google sign-in didn’t finish. Try the sign-in button instead.')
        return
      }
      track('one_tap_signed_in', { where: opts.where })
      const { finishInPlaceSignIn } = await import('@/lib/after-signin')
      void finishInPlaceSignIn('one_tap')
    },
  })

  track('one_tap_requested', { where: opts.where })
  gid.prompt((m: Moment) => {
    // With FedCM most of these are no longer reported; take what comes.
    try {
      if (m.isNotDisplayed?.()) track('one_tap_not_shown', { where: opts.where, reason: m.getNotDisplayedReason?.() ?? null })
      else if (m.isSkippedMoment?.()) track('one_tap_not_shown', { where: opts.where, reason: m.getSkippedReason?.() ?? 'skipped' })
      else if (m.isDismissedMoment?.()) {
        const reason = m.getDismissedReason?.() ?? null
        if (reason !== 'credential_returned') track('one_tap_dismissed', { where: opts.where, reason })
      }
    } catch { /* noop */ }
  })
}

/** Take the card away (a sign-in sheet opened, the page moved on). */
export function cancelOneTap(): void {
  try { window.google?.accounts?.id?.cancel() } catch { /* noop */ }
}
