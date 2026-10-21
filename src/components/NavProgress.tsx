/* A thin bar across the top of the page while the next page loads, so a
 * click always answers at once, even on a slow phone connection. Appears
 * only when a load takes longer than 120ms, so fast clicks don't flicker. */
import { useEffect, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'

export function NavProgress() {
  const loading = useRouterState({ select: (s) => s.status === 'pending' || s.isLoading })
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!loading) {
      setShown(false)
      return
    }
    const t = window.setTimeout(() => setShown(true), 120)
    return () => window.clearTimeout(t)
  }, [loading])

  if (!shown) return null
  return (
    <div
      role="progressbar"
      aria-label="Loading"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 9999, overflow: 'hidden', pointerEvents: 'none' }}
    >
      <div
        style={{
          height: '100%',
          width: '40%',
          background: '#b8336a',
          borderRadius: 2,
          animation: 'shutap-nav-progress 1s ease-in-out infinite',
        }}
      />
      <style>{`@keyframes shutap-nav-progress{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}@media (prefers-reduced-motion: reduce){[role=progressbar]>div{animation:none!important;width:100%!important;opacity:.6}}`}</style>
    </div>
  )
}
