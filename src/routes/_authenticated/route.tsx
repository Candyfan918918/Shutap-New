import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

async function resolveSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session

  // Wait briefly for local session restoration (INITIAL_SESSION) before concluding signed out.
  return await new Promise<Session | null>((resolve) => {
    let done = false
    const finish = (session: Session | null) => {
      if (done) return
      done = true
      try { subscription.unsubscribe() } catch {}
      clearTimeout(timer)
      resolve(session)
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(session)
    })
    const subscription = sub.subscription
    const timer = setTimeout(async () => {
      const { data: retry } = await supabase.auth.getSession()
      finish(retry.session ?? null)
    }, 1200)
  })
}

export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async () => {
    const session = await resolveSession()
    if (!session?.user) throw redirect({ to: '/welcome' })
    return { user: session.user }
  },
  pendingComponent: () => (
    <div
      style={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
        background: '#ffffff',
        color: '#443c42',
        fontFamily: 'Newsreader,serif',
        fontStyle: 'italic',
        fontSize: 16,
      }}
    >
      loading…
    </div>
  ),
  // Session replay hides all text on these pages (profile, check-ins, admin).
  component: () => (
    <div data-ph-private style={{ display: 'contents' }}>
      <Outlet />
    </div>
  ),
})
