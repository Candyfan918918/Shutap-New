// PostHog wrapper. Silent no-op if init fails or hasn't happened yet.
// initPostHog() is idempotent — returns the same memoized promise on every
// call. The promise NEVER rejects; on failure _ph resolves to null.
import type { PostHog } from 'posthog-js'
import { isProdHost } from './env'

let _ph: PostHog | null = null
let _initPromise: Promise<void> | null = null

export function posthog(): PostHog | null {
  return _ph
}

export function initPostHog(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (_initPromise) return _initPromise
  if (!isProdHost()) {
    console.info('PostHog disabled on non-production host')
    _ph = null
    _initPromise = Promise.resolve()
    return _initPromise
  }

  // TEMP: hardcoded to verify PostHog delivery end-to-end. Once confirmed,
  // revert to import.meta.env.VITE_POSTHOG_KEY / VITE_POSTHOG_HOST.
  const key = 'phc_AbkqMae5LW3GCw9Be7Sqp4VChsY6vSDYKYEjL3tZSupE'
  const host = 'https://us.i.posthog.com'
  _initPromise = (async () => {
    try {
      const mod = await import('posthog-js')
      mod.default.init(key, {
        api_host: host,
        capture_pageview: false, // we send explicit page_view events
        capture_pageleave: true,
        persistence: 'localStorage+cookie',
        autocapture: false,
        // Session replay shows Shutap's own pages (menus, buttons, site copy)
        // but never a person's content: every input is masked, every element
        // tagged data-ph-private (bits, the scrub notice, sheets, stand-up,
        // set list, Mirror, profile, admin, names) has its text masked, and
        // .ph-no-capture (profile pictures) is not recorded at all. The
        // privacy policy §2 promises this; tag any new surface that shows a
        // story, a bit, a name or an email.
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: '[data-ph-private]',
        },
        // Error tracking: uncaught errors and unhandled promise rejections
        // become $exception events, grouped into issues in PostHog.
        capture_exceptions: true,
      })
      _ph = mod.default
      console.log('PostHog initialized')
    } catch (e) {
      console.warn('PostHog init failed', e)
      _ph = null
    }
  })()
  return _initPromise
}

export async function phCapture(
  name: string,
  props: Record<string, unknown> = {},
): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    await initPostHog()
    // PostHog Web analytics (visitors, pages, sources, UTMs) reads only the
    // standard `$pageview` event. The app's own `page_view` is renamed here;
    // PostHog fills in the URL, referrer and UTM properties itself.
    _ph?.capture(name === 'page_view' ? '$pageview' : name, props)
  } catch { /* noop */ }
}

// For errors the app catches itself (error boundaries, failed requests) —
// those never reach the global handlers, so they're sent explicitly.
export async function phCaptureException(
  error: unknown,
  props: Record<string, unknown> = {},
): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    await initPostHog()
    _ph?.captureException(error, props)
  } catch { /* noop */ }
}

export async function posthogIdentify(
  userId: string,
  props: Record<string, unknown> = {},
): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    await initPostHog()
    _ph?.identify(userId, props)
  } catch { /* noop */ }
}
