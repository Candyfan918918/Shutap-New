/* The sticky bar at the bottom of a phone screen on guide and funniest
 * pages (Oct 30 2026): appears once the inline writer has scrolled out of
 * view above, taps back to it. Desktop never shows it. */
import { useEffect, useState } from 'react'
import '@/pages/home/bit/bit.css'

export function WriterBar({ page, label }: { page: string; label: string }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    // The writer mounts a beat after this bar, so look it up on each check
    // rather than once; the check is one getBoundingClientRect per scroll.
    let raf = 0
    const check = () => {
      raf = 0
      const box = document.getElementById('bit-write')
      setOn(!!box && box.getBoundingClientRect().bottom < 0)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    check()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  const go = () => {
    void import('@/lib/tracking')
      .then((m) => m.trackEvent('seo_cta_clicked', { page, position: 'sticky', kind: 'anchor' }))
      .catch(() => {})
    document.getElementById('bit-write')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => (document.getElementById('bit-story') as HTMLTextAreaElement | null)?.focus(), 500)
  }
  return (
    <div className={`bt-sticky${on ? ' on' : ''}`} aria-hidden={!on}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <button type="button" onClick={go}>
        say it funnier ↑
      </button>
    </div>
  )
}
