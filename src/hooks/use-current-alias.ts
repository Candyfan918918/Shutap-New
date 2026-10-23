import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { Alias } from '@/data/types'

/** Live alias display for the currently signed-in user. Reads from the
 *  aliases table (source of truth), falling back to the localStorage cache
 *  for instant paint. Refreshes on auth state changes. */
export function useCurrentAlias(): {
  alias: Alias | null
  userId: string | null
  refresh: () => Promise<void>
  /** True once the browser knows whether someone is signed in. Before that,
   *  the header shows a neutral placeholder instead of guessing "sign in". */
  ready: boolean
} {
  // Start empty so the server and browser render the same header; the
  // cached alias paints right after hydration.
  const [alias, setAlias] = useState<Alias | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const refresh = async () => {
    const { data } = await supabase.auth.getSession()
    const sessUser = data.session?.user
    const uid = sessUser?.id ?? null
    const anon = Boolean((sessUser as { is_anonymous?: boolean } | undefined)?.is_anonymous)
    // Anonymous pseudonymous sessions are NOT "signed in" for UI purposes —
    // the header should render the join → pill, not an alias.
    if (!uid || anon) {
      setUserId(null)
      setAlias(null)
      setReady(true)
      try { localStorage.removeItem('shutap_alias') } catch { /* noop */ }
      return
    }
    setUserId(uid)
    try {
      const { getMyAlias } = await import('@/lib/alias.functions')
      // Right after the OAuth round trip the bearer may not be attached yet;
      // one retry instead of falling back to "signed out" chrome.
      const row = await getMyAlias().catch(async () => {
        await new Promise((r) => setTimeout(r, 800))
        return getMyAlias()
      })
      if (row) {
        const next: Alias = { name: (row as { display_name?: string }).display_name, emoji: (row as { emoji?: string }).emoji, avatar: (row as { avatar_url?: string | null }).avatar_url ?? null }
        setAlias(next)
        try { localStorage.setItem('shutap_alias', JSON.stringify(next)) } catch { /* noop */ }
      } else {
        // Signed in but never picked a name: no alias, so the header offers
        // "join →" to finish setup instead of an inert placeholder.
        setAlias(null)
        try { localStorage.removeItem('shutap_alias') } catch { /* noop */ }
      }
    } catch { /* offline / no bearer — keep cache */ }
    setReady(true)
  }

  useEffect(() => {
    let mounted = true
    try {
      const r = localStorage.getItem('shutap_alias')
      if (r) { setAlias(JSON.parse(r) as Alias); setReady(true) }
    } catch { /* noop */ }
    void refresh()
    // A name minted after sign-in (on /welcome) lands here without a reload.
    const onAlias = (e: Event) => {
      const next = (e as CustomEvent<Alias>).detail
      if (mounted && next?.name) { setAlias(next); setReady(true) }
    }
    window.addEventListener('shutap:alias', onAlias)
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        void refresh()
      }
    })
    return () => { mounted = false; window.removeEventListener('shutap:alias', onAlias); sub.subscription.unsubscribe() }
  }, [])

  return { alias, userId, refresh, ready }
}

export function useIsAdmin(): boolean {
  const [admin, setAdmin] = useState(false)
  useEffect(() => {
    let dead = false
    // Checked again on every sign-in change (Oct 23 2026): it used to run once
    // at mount, so when the header mounted before the session was restored the
    // admin link stayed hidden until a full reload.
    const check = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const user = data.session?.user as { is_anonymous?: boolean } | undefined
        if (!user || user.is_anonymous) {
          if (!dead) setAdmin(false)
          return
        }
        const { getIsAdmin } = await import('@/lib/alias.functions')
        const isAdmin = await getIsAdmin()
        if (!dead) setAdmin(Boolean(isAdmin))
      } catch { /* noop */ }
    }
    void check()
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') void check()
    })
    return () => {
      dead = true
      sub.subscription.unsubscribe()
    }
  }, [])
  return admin
}
