/* One sign-in for the whole site (Nov 19 2026, approved by Candy from the
 * canvas "Shutap — sign-in & welcome redesign").
 *
 *   SignInButtons  Google · Apple · email with the code typed right here.
 *                  Each button goes straight to its provider, never to a
 *                  second chooser (Oct 21 2026 rule).
 *   SignInPanel    the card: wordmark, headline, line, "Your bit comes with
 *                  you.", the buttons, "Not now", the 18+ line once.
 *   SignInSheet    the panel as a pop-up (bottom sheet on a phone).
 *
 * Used by /welcome, the bits / toasts / realtors pop-ups and the second-phone
 * prompter gates, so they can't drift apart again. The email code works in
 * place: verifying it signs the person in on the page they are on, and
 * finishInPlaceSignIn does what /welcome would have done (profile, sign-up
 * event, legal record, welcome email). */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { sendMagicLink } from '@/lib/magic-link.functions'
import { startOAuth, useOAuthPending, oauthButtonLabel } from '@/lib/oauth-signin'
import './signin.css'

export type SignInMethod = 'google' | 'apple' | 'email'
/** What the person is in the middle of, for "Your bit comes with you." */
export type SignInWhat = 'bit' | 'toast' | 'listing' | 'kit' | null

export const WHAT_WORD: Record<Exclude<SignInWhat, null>, string> = {
  bit: 'Your bit',
  toast: 'Your toast',
  listing: 'Your listing',
  kit: 'Your kit',
}
/** before sign-in */
export const comesWithYou = (w: SignInWhat) => (w ? `${WHAT_WORD[w]} comes with you.` : null)
/** after sign-in */
export const isWaiting = (w: SignInWhat) => (w ? `${WHAT_WORD[w]} is waiting.` : null)

/** Where someone is headed back to → what they were making. Nothing in
 *  progress (the header, My creations, profile) → null: no line at all. */
export function whatFromPath(path: string | null | undefined): SignInWhat {
  if (!path) return null
  let p = path
  try { p = new URL(path, 'https://shutap.com').pathname + new URL(path, 'https://shutap.com').search } catch { /* keep as is */ }
  if (/^\/realtors\/(shoot|prompter)/.test(p) || /^\/realtors\?(.*&)?kit=/.test(p)) return 'kit'
  if (p.startsWith('/realtors')) return 'listing'
  if (p.startsWith('/toasts')) return 'toast'
  if (p.startsWith('/bits') || p.startsWith('/guides') || p.startsWith('/funniest')) return 'bit'
  return null
}

export function Wordmark({ size }: { size?: 'sm' | 'lg' }) {
  return <div className={`si-wm${size ? ` ${size}` : ''}`} aria-label="shutap">shut<span>ap</span></div>
}

export function SignInLegal() {
  return (
    <p className="si-legal">
      By continuing you confirm you’re 18+ and agree to the <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
    </p>
  )
}

export function LoadingDots({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="si-dots" role="status" aria-label={label}>
      <span /><span /><span />
    </div>
  )
}

const GoogleG = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z" />
    <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z" />
    <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
  </svg>
)
const AppleLogo = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
)

const RESEND_COOLDOWN_MS = 60_000
const track = (name: string, props: Record<string, unknown> = {}) => {
  void import('@/lib/tracking').then((m) => m.trackEvent(name, props)).catch(() => {})
}

export type SignInButtonsProps = {
  /** for events: which surface this is (welcome, bits_sheet, toasts_form…) */
  where: string
  /** Runs right before the browser leaves for a provider, and before an
   *  email code is sent: leave the notes that bring the work back. */
  onBefore?: (method: SignInMethod) => void
  /** /welcome?method=email: the email form only */
  emailOnly?: boolean
  /** true (default): a verified code finishes the sign-in on this page.
   *  /welcome passes false; it runs its own after-sign-in steps. */
  inPlace?: boolean
  /** called once the email code is verified (the session is there) */
  onSignedIn?: () => void
  /** a provider error to show, from the page (e.g. the return trip failed) */
  error?: string | null
}

export function SignInButtons({ where, onBefore, emailOnly, inPlace = true, onSignedIn, error }: SignInButtonsProps) {
  const opening = useOAuthPending()
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<'input' | 'code'>('input')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [codeSentAt, setCodeSentAt] = useState<number | null>(null)
  const [resends, setResends] = useState(0)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [, setTick] = useState(0)
  const codeRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return
    const t = window.setInterval(() => {
      setTick((n) => n + 1)
      if (Date.now() >= cooldownUntil) window.clearInterval(t)
    }, 1000)
    return () => window.clearInterval(t)
  }, [cooldownUntil])
  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))
  useEffect(() => { if (phase === 'code') codeRef.current?.focus() }, [phase])

  async function oauth(provider: 'google' | 'apple') {
    setErr(null)
    try { onBefore?.(provider) } catch { /* the sign-in still goes */ }
    const message = await startOAuth(provider)
    if (message) setErr(message)
  }

  // The server lowercases the address; verification must use the same form.
  const norm = () => email.trim().toLowerCase()

  async function sendCode(resend = false) {
    if (busy) return
    const v = norm()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { setErr('Enter a valid email.'); return }
    if (resend && Date.now() < cooldownUntil) return
    setBusy(true); setErr(null)
    if (!resend) { try { onBefore?.('email') } catch { /* noop */ } }
    track('sign_in_started', { method: 'email', resend, where })
    try {
      const redirectTo = window.location.origin + '/welcome'
      let branded: Awaited<ReturnType<typeof sendMagicLink>> | null
      try { branded = await sendMagicLink({ data: { email: v, redirectTo } }) } catch { branded = null }
      if (!branded) {
        // A code may or may not exist; a second one would void it.
        setErr("Couldn't send the email. Try again in a minute.")
        track('sign_in_failed', { method: 'email', reason: 'request_failed', where })
        return
      }
      if (!branded.ok) {
        if (branded.stage === 'throttle') {
          setErr('Too many codes in a row. Give the last one a minute.')
          track('sign_in_failed', { method: 'email', reason: 'rate_limited', where })
          return
        }
        if (branded.stage === 'send') {
          setErr("Couldn't send the email. Try again in a minute.")
          track('sign_in_failed', { method: 'email', reason: `send: ${branded.error}`, where })
          return
        }
        const { error: otpErr } = await supabase.auth.signInWithOtp({ email: v, options: { emailRedirectTo: redirectTo, shouldCreateUser: true } })
        if (otpErr) {
          setErr(otpErr.message)
          track('sign_in_failed', { method: 'email', reason: otpErr.message, where })
          return
        }
      }
      const next = resend ? resends + 1 : 0
      setResends(next)
      setCode('')
      setCodeSentAt(Date.now())
      setCooldownUntil(Date.now() + RESEND_COOLDOWN_MS)
      setPhase('code')
      track('sign_in_code_sent', { method: 'email', resend, resends: next, where })
    } catch (e) {
      const text = e instanceof Error ? e.message : 'sign-in failed'
      setErr(text)
      track('sign_in_failed', { method: 'email', reason: text, where })
    } finally { setBusy(false) }
  }

  async function verify() {
    if (busy) return
    const token = code.trim()
    // The code's length comes from the auth settings (8 today).
    if (!/^\d{6,10}$/.test(token)) { setErr('Enter the code from the email.'); return }
    setBusy(true); setErr(null)
    const secs = codeSentAt ? Math.round((Date.now() - codeSentAt) / 1000) : null
    try {
      let ok: string | null = null
      let first: string | null = null
      // 'email' verifies new and returning addresses; the others are fallbacks.
      for (const type of ['email', 'signup', 'magiclink'] as const) {
        const r = await supabase.auth.verifyOtp({ email: norm(), token, type })
        if (!r.error) { ok = type; break }
        if (!first) first = r.error.message
      }
      if (!ok) {
        setErr(resends > 0 ? "That code didn't work. Use the newest email." : "That code didn't work. Check it, or send a new one.")
        track('sign_in_failed', { method: 'email_code', reason: first ?? 'verify_failed', seconds_since_code_sent: secs, resends, where })
        return
      }
      track('sign_in_succeeded', { method: 'email_code', type_used: ok, seconds_since_code_sent: secs, resends, where })
      if (inPlace) {
        const { finishInPlaceSignIn } = await import('@/lib/after-signin')
        void finishInPlaceSignIn(`email_${where}`)
      }
      onSignedIn?.()
    } catch (e) {
      const text = e instanceof Error ? e.message : 'verification failed'
      setErr(text)
      track('sign_in_failed', { method: 'email_code', reason: text, where })
    } finally { setBusy(false) }
  }

  const shown = err ?? error ?? null

  if (phase === 'code') {
    return (
      <div className="si-stack" data-testid="email-code-step">
        <div className="si-info" role="status">
          <b>Code sent{email.trim() ? ` to ${email.trim()}` : ''}.</b> Not in your inbox? Check spam or junk. It comes from hello@shutap.com.
        </div>
        <form className="si-stack" onSubmit={(e) => { e.preventDefault(); void verify() }}>
          <label htmlFor={`si-code-${where}`} className="si-sr">Code from the email</label>
          <input
            ref={codeRef}
            id={`si-code-${where}`}
            className="si-input code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="code from the email"
            maxLength={10}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D+/g, '').slice(0, 10))}
          />
          <button type="submit" className="si-btn dark" disabled={busy} aria-busy={busy}>{busy ? 'Checking…' : 'Verify and continue'}</button>
        </form>
        {shown && <p className="si-err" role="alert">{shown}</p>}
        <button type="button" className="si-link" disabled={busy || cooldownLeft > 0} onClick={() => void sendCode(true)}>
          {cooldownLeft > 0 ? `Send a new code in ${cooldownLeft}s` : 'Send a new code'}
        </button>
        <button type="button" className="si-link" onClick={() => { setCode(''); setPhase('input'); setErr(null); setResends(0); setCodeSentAt(null) }}>
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div className="si-stack">
      {!emailOnly && (
        <>
          <button type="button" className="si-btn g" disabled={busy || !!opening} onClick={() => void oauth('google')}>
            <GoogleG />{opening === 'google' ? 'Opening Google…' : 'Continue with Google'}
          </button>
          <button type="button" className="si-btn ap" disabled={busy || !!opening} onClick={() => void oauth('apple')}>
            <AppleLogo />{opening === 'apple' ? 'Opening Apple…' : 'Continue with Apple'}
          </button>
          <div className="si-or">or</div>
        </>
      )}
      <form className="si-row" onSubmit={(e) => { e.preventDefault(); void sendCode() }}>
        <label htmlFor={`si-email-${where}`} className="si-sr">Email</label>
        <input
          id={`si-email-${where}`}
          className="si-input"
          type="email"
          autoComplete="email"
          autoFocus={emailOnly}
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="si-btn dark fit" disabled={busy} aria-busy={busy}>{busy ? 'Sending…' : 'Send code'}</button>
      </form>
      {shown && <p className="si-err" role="alert">{shown}</p>}
    </div>
  )
}

/** kept for callers that still label their own buttons */
export { oauthButtonLabel }

export type SignInPanelProps = SignInButtonsProps & {
  title: string
  sub?: string
  what?: SignInWhat
  /** shown between the line and the buttons (e.g. the toast watermark note) */
  children?: ReactNode
  /** "Not now" and the × */
  onClose?: (how: 'not_now' | 'close') => void
  closeLabel?: string
  headingId?: string
  /** the card's own class (sheet vs page) */
  className?: string
}

export function SignInPanel({ title, sub, what = null, children, onClose, closeLabel = 'Not now', headingId = 'si-title', className, ...buttons }: SignInPanelProps) {
  const line = comesWithYou(what)
  return (
    <div className={`si-card${className ? ` ${className}` : ''}`}>
      <div className="si-sheet-top">
        <Wordmark size="sm" />
        {onClose && <button type="button" className="si-x" aria-label="Close" onClick={() => onClose('close')}>×</button>}
      </div>
      <div className="si-sheet-copy">
        <h2 id={headingId} className="si-h1">{title}</h2>
        {sub && <p className="si-lead">{sub}</p>}
      </div>
      {children}
      {line && <div className="si-ctx">{line}</div>}
      <SignInButtons {...buttons} />
      {onClose && <button type="button" className="si-btn ghost" onClick={() => onClose('not_now')}>{closeLabel}</button>}
      <SignInLegal />
    </div>
  )
}

export type SignInSheetProps = Omit<SignInPanelProps, 'onClose' | 'className'> & {
  onClose: (how: 'not_now' | 'close' | 'backdrop' | 'escape') => void
}

export function SignInSheet({ onClose, headingId = 'si-sheet-title', ...panel }: SignInSheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose('escape') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="si-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose('backdrop') }}>
      <div role="dialog" aria-modal="true" aria-labelledby={headingId} style={{ display: 'contents' }}>
        <SignInPanel {...panel} headingId={headingId} className="si-sheet" onClose={(how) => onClose(how)} />
      </div>
    </div>
  )
}
