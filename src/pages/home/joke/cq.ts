// Older Safari (before 16) has no container-query units, so every card size
// written in cqw collapses and the card renders as plain text. Card sizes use
// `var(--cq, 1cqw)`; where cqw is unsupported this measures the card's
// wrapper and sets --cq to 1% of its width in pixels instead.
import { useCallback, useRef } from 'react'

const supported = () =>
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('width', '1cqw')

export function useCqRef() {
  const obs = useRef<ResizeObserver | null>(null)
  return useCallback((el: HTMLDivElement | null) => {
    obs.current?.disconnect()
    obs.current = null
    if (!el || supported()) return
    const set = () => el.style.setProperty('--cq', `${el.clientWidth / 100}px`)
    set()
    if (typeof ResizeObserver !== 'undefined') {
      obs.current = new ResizeObserver(set)
      obs.current.observe(el)
    } else window.addEventListener('resize', set)
  }, [])
}
