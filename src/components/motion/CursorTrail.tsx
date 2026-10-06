import { useEffect, useRef, useState } from 'react'

/** Desktop-only trailing cursor: a 36px ring that lerps behind the pointer
 * plus a 6px dot pinned to the exact pointer position. Ring grows to 60px
 * and fills over interactive elements. Disabled on touch / reduced-motion. */
export function CursorTrail() {
  const ringRef = useRef<HTMLDivElement | null>(null)
  const ringInnerRef = useRef<HTMLDivElement | null>(null)
  const dotRef = useRef<HTMLDivElement | null>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    if (window.matchMedia('(pointer: coarse)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setEnabled(true)
  }, [])

  useEffect(() => {
    if (!enabled) return
    const ring = ringRef.current
    const inner = ringInnerRef.current
    const dot = dotRef.current
    if (!ring || !inner || !dot) return

    let mx = -100
    let my = -100
    let cx = -100
    let cy = -100
    let shown = false
    let raf = 0

    const onMove = (e: PointerEvent) => {
      mx = e.clientX
      my = e.clientY
      if (!shown) {
        shown = true
        ring.style.opacity = '1'
        dot.style.opacity = '1'
      }
    }

    const tick = () => {
      cx += (mx - cx) * 0.16
      cy += (my - cy) * 0.16
      ring.style.transform = `translate3d(${cx}px, ${cy}px, 0)`
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const isInteractive = (target: EventTarget | null): boolean => {
      let el = target as Element | null
      while (el && el !== document.body) {
        const tag = el.tagName
        if (tag === 'A' || tag === 'BUTTON') return true
        const role = (el as HTMLElement).getAttribute?.('role')
        if (role === 'button' || role === 'link') return true
        if ((el as HTMLElement).dataset?.magnetic === 'true') return true
        el = el.parentElement
      }
      return false
    }

    const onOver = (e: PointerEvent) => {
      if (isInteractive(e.target)) {
        inner.style.width = '60px'
        inner.style.height = '60px'
        inner.style.marginLeft = '-30px'
        inner.style.marginTop = '-30px'
        inner.style.background = 'rgba(23,19,26,.12)'
      } else {
        inner.style.width = '36px'
        inner.style.height = '36px'
        inner.style.marginLeft = '-18px'
        inner.style.marginTop = '-18px'
        inner.style.background = 'transparent'
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerover', onOver)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerover', onOver)
    }
  }, [enabled])

  if (!enabled) return null
  return (
    <>
      <div
        ref={ringRef}
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 99999,
          opacity: 0,
          transition: 'opacity .3s ease',
          willChange: 'transform',
        }}
      >
        <div
          ref={ringInnerRef}
          style={{
            width: 36,
            height: 36,
            marginLeft: -18,
            marginTop: -18,
            borderRadius: '50%',
            border: '1.5px solid #17131a',
            background: 'transparent',
            transition: 'width .25s ease, height .25s ease, margin .25s ease, background .25s ease',
          }}
        />
      </div>
      <div
        ref={dotRef}
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 99999,
          opacity: 0,
          transition: 'opacity .3s ease',
          willChange: 'transform',
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            marginLeft: -3,
            marginTop: -3,
            borderRadius: '50%',
            background: '#17131a',
          }}
        />
      </div>
    </>
  )
}
