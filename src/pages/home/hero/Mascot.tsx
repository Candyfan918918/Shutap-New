// Immersive homepage mascot: existing EyeMark wrapped in a cursor-tracking
// wrapper. Pupils translate toward the cursor; the whole mark tilts with a
// tiny spring. Blink is inherited from EyeMark's .shutap-blink class; the
// gentle breathing scale is applied via .home-mascot-breathe in home.css.
// Reduced-motion users see a static mark (all animations disabled in CSS).
import { useEffect, useRef, useState } from 'react'
import { EyeMark } from '@/components/brand/EyeMark'
import { useReducedMotion as usePrefersReducedMotion } from '@/components/motion/useReducedMotion'

export function HeroMascot({ size }: { size: number }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, px: 0, py: 0 })
  const reduce = usePrefersReducedMotion()

  useEffect(() => {
    if (reduce) return
    let raf = 0
    let target = { mx: 0, my: 0 }
    let current = { mx: 0, my: 0 }
    const onMove = (e: MouseEvent) => {
      const el = wrapRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      // normalized -1..1
      target.mx = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth / 2)))
      target.my = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight / 2)))
    }
    const tick = () => {
      // simple lerp toward target
      current.mx += (target.mx - current.mx) * 0.06
      current.my += (target.my - current.my) * 0.06
      setTilt({
        rx: -current.my * 12,
        ry: current.mx * 16,
        px: current.mx * 9,
        py: current.my * 7,
      })
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('mousemove', onMove)
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [reduce])

  return (
    <div
      ref={wrapRef}
      className="home-mascot-breathe"
      style={{
        width: size,
        height: (size * 96) / 140,
        perspective: 650,
        display: 'inline-block',
        filter: 'drop-shadow(0 22px 32px rgba(23,19,26, .28))',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transformStyle: 'preserve-3d',
          transition: reduce ? undefined : 'transform .18s ease-out',
        }}
      >
        <EyeMark size={size} />
        {/* Overlaid pupil-shift layer — small dark dots that translate with
            the cursor. The base EyeMark keeps its own pupils; these sit on
            top as an accent to sell the tracking. Kept subtle so the base
            mark still reads. */}
        {!reduce && (
          <svg
            viewBox="0 0 140 96"
            width={size}
            height={(size * 96) / 140}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
            aria-hidden
          >
            <g style={{ transform: `translate(${tilt.px}px, ${tilt.py}px)`, transition: 'transform .06s linear' }}>
              <circle cx="44" cy="62" r="4" fill="#100c14" />
              <circle cx="112" cy="62" r="4" fill="#100c14" />
            </g>
          </svg>
        )}
      </div>
    </div>
  )
}

// Preserve the historical export name; single implementation now lives in
// src/components/motion (imported and re-aliased above).
export { usePrefersReducedMotion }

// Small helper — IntersectionObserver hook returning "true when >=threshold visible".
export function useOnScreen<T extends Element>(ref: React.RefObject<T | null>, threshold = 0.15) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        setOn(!!e && e.isIntersecting && e.intersectionRatio >= threshold)
      },
      { threshold: [0, threshold, 1] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, threshold])
  return on
}
