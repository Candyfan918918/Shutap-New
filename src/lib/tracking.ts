// Client-side tracking wrapper. Fires visit + events into the DB via the
// server fns AND (when configured) into PostHog. Silent no-op when things
// aren't ready — never throws, never blocks render.
import { recordVisit, trackEventFn, upsertMyProfile } from './tracking.functions'
import { phCapture, posthogIdentify } from './posthog'
import { isProdHost } from './env'
import { DEFAULT_PRODUCT, type Product } from './product'


const SESSION_KEY = 'shutap_session_id'
const VISIT_SENT_KEY = 'shutap_visit_sent'
const PROFILE_SENT_KEY = 'shutap_profile_sent'

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr'
  try {
    let sid = sessionStorage.getItem(SESSION_KEY)
    if (!sid) {
      sid = (crypto.randomUUID?.() ?? String(Date.now()) + Math.random().toString(36).slice(2))
      sessionStorage.setItem(SESSION_KEY, sid)
    }
    return sid
  } catch {
    return 'anon-' + Date.now()
  }
}

/** Every event names its product (Nov 5 2026): bits unless the caller says
 *  otherwise, so admin and PostHog can tell the realtor kits apart later. */
export async function trackEvent(name: string, properties: Record<string, unknown> = {}): Promise<void> {
  if (!isProdHost()) return
  const session_id = getSessionId()
  const props: Record<string, unknown> = { product: DEFAULT_PRODUCT as Product, ...properties }
  try { if (window.localStorage.getItem('shutap_smoke') === '1') props.smoke = true } catch { /* noop */ }
  void phCapture(name, props)
  try {
    await trackEventFn({ data: { session_id, name, properties: props } })
  } catch { /* noop */ }
}


const LANDING_KEY = 'shutap_landing_path'
const UTM_KEY = 'shutap_utm'

function readUtmFromLocation(): {
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null;
  utm_term: string | null; utm_content: string | null;
} {
  const empty = { utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null }
  try {
    const p = new URLSearchParams(window.location.search)
    const get = (k: string) => {
      const v = p.get(k)
      return v && v.trim() ? v.trim().slice(0, 200) : null
    }
    return {
      utm_source: get('utm_source'),
      utm_medium: get('utm_medium'),
      utm_campaign: get('utm_campaign'),
      utm_term: get('utm_term'),
      utm_content: get('utm_content'),
    }
  } catch { return empty }
}

/** Idempotent per browser session — safe to call on every page. */
export async function recordVisitOnce(path: string): Promise<void> {
  if (typeof window === 'undefined') return
  if (!isProdHost()) return
  try {
    if (sessionStorage.getItem(VISIT_SENT_KEY)) return
    sessionStorage.setItem(VISIT_SENT_KEY, '1')
  } catch { /* noop */ }

  const session_id = getSessionId()
  const referrer = document.referrer || ''
  // Capture landing path + UTM once per session; persist so downstream events could reuse.
  let landing_path: string | null = null
  let utm = { utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null } as ReturnType<typeof readUtmFromLocation>
  try {
    landing_path = sessionStorage.getItem(LANDING_KEY)
    if (!landing_path) {
      landing_path = path
      sessionStorage.setItem(LANDING_KEY, landing_path)
    }
    const storedUtm = sessionStorage.getItem(UTM_KEY)
    if (storedUtm) {
      utm = JSON.parse(storedUtm)
    } else {
      utm = readUtmFromLocation()
      sessionStorage.setItem(UTM_KEY, JSON.stringify(utm))
    }
  } catch { /* noop */ }
  try {
    await recordVisit({ data: { session_id, path, referrer, landing_path, ...utm } })
  } catch { /* noop */ }
}


interface SupabaseUserLike {
  id: string
  email?: string | null
  is_anonymous?: boolean
  user_metadata?: Record<string, unknown> | null
  app_metadata?: Record<string, unknown> | null
}

export async function syncProfileFromSession(
  user: SupabaseUserLike | null | undefined,
  opts: { login?: boolean } = {},
): Promise<void> {
  if (!user || user.is_anonymous) return
  const login = opts.login === true
  try {
    // Fire once per session per user id for passive syncs. A genuine sign-in
    // (login=true) always fires so login_count/last_login_at increment.
    const key = `${PROFILE_SENT_KEY}:${user.id}`
    if (!login) {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    }
  } catch { /* noop */ }
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const app = (user.app_metadata ?? {}) as Record<string, unknown>
  const asStr = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const first = asStr(meta.given_name) || asStr(meta.first_name) || null
  const last = asStr(meta.family_name) || asStr(meta.last_name) || null
  const full = asStr(meta.full_name) || asStr(meta.name) || (first && last ? `${first} ${last}` : null)
  const avatar = asStr(meta.avatar_url) || asStr(meta.picture) || null
  const provider = asStr(app.provider) || asStr(meta.provider) || 'email'
  const email = user.email || asStr(meta.email) || null
  try {
    await upsertMyProfile({
      data: {
        email,
        first_name: first,
        last_name: last,
        full_name: full,
        avatar_url: avatar,
        provider,
        is_anonymous: false,
        login,
      },
    })
  } catch { /* noop */ }
  try {
    posthogIdentify(user.id, {
      email,
      first_name: first,
      last_name: last,
      name: full,
      provider,
    })
  } catch { /* noop */ }
}
