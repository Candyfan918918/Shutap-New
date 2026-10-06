import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Reactive card physics — pointer-only hover tilt + cursor glare + one-shot
 * sheen sweep + colored glow shadow. Skipped entirely on coarse pointers
 * (touch) and when `prefers-reduced-motion: reduce`.
 *
 * Usage:
 *   const { ref, decor } = useReactiveCard({ glow: 'rgba(23,19,26,.55)' })
 *   <div ref={ref} style={{ position:'relative', ...cardStyle }}>
 *     {children}
 *     {decor}
 *   </div>
 *
 * The card MUST be `position: relative`. The decor uses an inner clipping
 * wrapper (`border-radius: inherit; overflow: hidden`) so the card's own
 * shadow is never clipped.
 */
export function useReactiveCard(opts: {
  glow?: string
  /** Optional predicate; when returns true, ignore all pointer input. */
  isDisabled?: () => boolean
} = {}): { ref: React.RefObject<HTMLDivElement | null>; decor: ReactNode } {
  const { glow = 'rgba(23,19,26,.55)', isDisabled } = opts
  const ref = useRef<HTMLDivElement | null>(null)
  const glareRef = useRef<HTMLDivElement | null>(null)
  const sheenRef = useRef<HTMLDivElement | null>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setEnabled(!coarse && !reduce)
  }, [])

  useEffect(() => {
    if (!enabled) return
    const card = ref.current
    const glare = glareRef.current
    const sheen = sheenRef.current
    if (!card || !glare || !sheen) return

    const origShadow = card.style.boxShadow
    const origTransform = card.style.transform
    const origTransition = card.style.transition
    let raf = 0

    const setTilt = (px: number, py: number) => {
      const rx = (0.5 - py) * 11
      const ry = (px - 0.5) * 13
      card.style.transition = 'transform 0s'
      card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-7px) scale(1.02)`
      glare.style.background = `radial-gradient(280px circle at ${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%, rgba(255,255,255,.22), transparent 58%)`
    }

    const onMove = (e: PointerEvent) => {
      if (isDisabled?.()) return
      const rect = card.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const px = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
      const py = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setTilt(px, py))
    }

    const onEnter = (e: PointerEvent) => {
      if (isDisabled?.()) return
      card.style.boxShadow = `0 24px 54px -24px rgba(0,0,0,.35), 0 0 30px -10px ${glow}`
      glare.style.opacity = '1'
      // restart sheen sweep
      sheen.style.animation = 'none'
      void sheen.offsetWidth
      sheen.style.animation = 'mo-card-sheen .9s ease'
      onMove(e)
    }

    const onLeave = () => {
      cancelAnimationFrame(raf)
      card.style.transition = 'transform .55s cubic-bezier(.16,1,.3,1), box-shadow .35s ease'
      card.style.transform = origTransform || ''
      card.style.boxShadow = origShadow
      glare.style.opacity = '0'
    }

    card.addEventListener('pointerenter', onEnter)
    card.addEventListener('pointermove', onMove)
    card.addEventListener('pointerleave', onLeave)

    return () => {
      cancelAnimationFrame(raf)
      card.removeEventListener('pointerenter', onEnter)
      card.removeEventListener('pointermove', onMove)
      card.removeEventListener('pointerleave', onLeave)
      card.style.transform = origTransform
      card.style.boxShadow = origShadow
      card.style.transition = origTransition
    }
  }, [enabled, glow, isDisabled])

  const decor = enabled ? (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 'inherit',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      <div
        ref={glareRef}
        style={{
          position: 'absolute',
          inset: 0,
          mixBlendMode: 'screen',
          opacity: 0,
          transition: 'opacity .35s ease',
        }}
      />
      <div
        ref={sheenRef}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: '55%',
          left: '-70%',
          background: 'linear-gradient(100deg, transparent, rgba(255,255,255,.16), transparent)',
          transform: 'skewX(-16deg)',
        }}
      />
    </div>
  ) : null

  return { ref, decor }
}
