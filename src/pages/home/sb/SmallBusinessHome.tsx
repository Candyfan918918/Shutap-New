/* The new homepage, small business first (Nov 21 2026, design approved by
 * Candy). Order: "Humor is attention." with the three product tiles, then
 * everything about Shutap for small business (hero, the four moving phones,
 * up close, why owners use it, plans and questions), then Realtors, Toasts,
 * trust and the closing call to action.
 *
 * Shown only while the smallbusiness flag is on, or to an admin (see the
 * index route): every small-business button goes to /smallbusiness, which is
 * dark until launch. The markup and styles come from the approved design;
 * every link is a plain href, and every tap is tracked here (admin events and
 * PostHog) with what was tapped and where it goes. */
import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { trackEvent } from '@/lib/tracking'
import { Footer } from '@/components/feed/Footer'
import { SB_HOME_HTML } from './sbHomeMarkup'
import { forwardToBits } from '../ProductHome'
import '@/components/feed/feed.css'
import './sbHome.css'

/** What a tap was, from the nearest section and the link's own words. */
function describe(a: HTMLAnchorElement): Record<string, unknown> {
  const section = a.closest('section, article')
  const where = section?.id || section?.getAttribute('aria-labelledby') || section?.className.split(' ').find((c) => c && c !== 'rv') || 'page'
  return { cta: a.dataset.cta || (a.textContent || '').trim().slice(0, 60), href: a.getAttribute('href'), where }
}

export function SmallBusinessHome() {
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // old links that expected the homepage write box still go to /bits
    if (window.location.hash === '#mirror') { window.location.replace('/mirror'); return }
    if (forwardToBits()) return
    void trackEvent('home_view', { surface: 'home', version: 'smallbusiness' })
    const root = ref.current
    if (!root) return
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest('a') as HTMLAnchorElement | null
      if (!a || !root.contains(a)) return
      const href = a.getAttribute('href') || ''
      void trackEvent('home_cta', { surface: 'home', version: 'smallbusiness', ...describe(a) })
      // same-site links move inside the app, without a full reload
      if (href.startsWith('/') && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
        e.preventDefault()
        void navigate({ to: href as '/' })
      }
    }
    root.addEventListener('click', onClick)
    // the finished-video demos are muted loops; some browsers need a nudge
    root.querySelectorAll('video').forEach((v) => { v.muted = true; void v.play?.().catch(() => {}) })
    return () => root.removeEventListener('click', onClick)
  }, [navigate])

  return (
    <div>
      <div ref={ref} className="shp-home" dangerouslySetInnerHTML={{ __html: SB_HOME_HTML }} />
      <div className="fd" style={{ minHeight: 0 }}>
        <Footer />
      </div>
    </div>
  )
}
