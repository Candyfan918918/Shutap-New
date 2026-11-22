/* /welcome, the sign-in card (Nov 19 2026 redesign: light, the wordmark, no
 * eye). Google · Apple · email with the code typed here. Does NOT advance the
 * step itself: the parent's onAuthStateChange picks up SIGNED_IN and runs the
 * after-sign-in steps (profile, sign-up event, the way back). */
import { useMemo } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { peekReturnPath } from '@/lib/auth-guard'
import { SignInButtons, SignInLegal, Wordmark, comesWithYou, isWaiting, whatFromPath } from '@/components/signin/SignIn'

export function AuthStep({ error }: { error?: string | null } = {}) {
  // /welcome?method=email comes from an "email" link elsewhere: the email
  // form only, never a second provider chooser.
  const search = useRouterState({ select: (st) => st.location.search as Record<string, unknown> })
  const emailOnly = search?.method === 'email'
  const what = useMemo(() => (typeof window === 'undefined' ? null : whatFromPath(peekReturnPath())), [])
  const failed = !!error
  const line = failed ? isWaiting(what) : comesWithYou(what)

  return (
    <div className="si-card">
      <div className="si-head">
        <Wordmark />
        <h1 className="si-h1">{failed ? 'That sign-in didn’t come through.' : emailOnly ? 'Sign in with email' : 'Sign in to Shutap'}</h1>
        <p className="si-lead">
          {failed ? 'Nothing was lost. Tap once and give it a few seconds, or use email.' : 'Free to start. Everything you make is kept in My creations.'}
        </p>
      </div>
      {line && <div className="si-ctx">{line}</div>}
      <SignInButtons where="welcome" emailOnly={emailOnly} inPlace={false} error={error} />
      {emailOnly && <a href="/welcome" className="si-link" style={{ textAlign: 'center' }}>Use Google or Apple instead</a>}
      <SignInLegal />
    </div>
  )
}

export default AuthStep
