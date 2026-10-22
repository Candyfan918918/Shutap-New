import { useEffect, useRef } from 'react'

// Animated replacement for the body's CSS dot grid (global.css). Same pitch,
// size and colour as the static grid; each dot rides a slow diagonal wave.
//
// - SSR / no-JS / reduced-motion: this never mounts its canvas, so the static
//   CSS grid stays. When the canvas starts, it sets html.dots-live, which
//   switches the CSS grid off so there is never a double layer.
// - Canvas is fixed to the viewport but dots are offset by scrollY, so the
//   grid still scrolls with the page like the old background did.
// - Pauses when the tab is hidden.

const PITCH = 18            // px between dots — matches background-size in global.css
const RADIUS = 1            // px — matches the 1px radial-gradient stop
const RGB = '184, 69, 107'
const ALPHA_LOW = 0.1       // trough — a touch fainter than the old static 0.16
const ALPHA_HIGH = 0.34     // crest — the wave reads as a band of darker dots
const BUCKETS = 8           // alpha steps, so each frame is 8 fills, not one per dot
const AMP = 6               // px of vertical travel at the crest
const WAVELENGTH = 420      // px between crests
const PERIOD = 6.5          // seconds per full wave cycle

export function WaveDots() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const root = document.documentElement
    root.classList.add('dots-live')

    let w = 0
    let h = 0
    let dpr = 1
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0)
    }
    resize()

    const k = (Math.PI * 2) / WAVELENGTH
    const omega = (Math.PI * 2) / PERIOD
    const kx = k * 0.8   // wave travels diagonally: mostly across, a little down
    const ky = k * 0.6

    let raf = 0
    const start = performance.now()
    const draw = (now: number) => {
      const t = (now - start) / 1000
      // Re-check size every frame: a tab opened hidden can report 0×0 at
      // mount and never fire a resize, which left the canvas blank.
      if (window.innerWidth !== w || window.innerHeight !== h) resize()
      const sy = window.scrollY
      const yOff = -(sy % PITCH)
      // Clear in device pixels, not CSS pixels: at a fractional screen scale
      // (Windows at 125%/150%) a CSS-pixel clear can miss strips, and the
      // dots from earlier frames stay behind as pink streaks.
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0)
      const paths: Path2D[] = Array.from({ length: BUCKETS }, () => new Path2D())
      for (let y = yOff - PITCH; y < h + PITCH; y += PITCH) {
        const docY = y + sy
        for (let x = PITCH / 2; x < w + PITCH; x += PITCH) {
          const phase = kx * x + ky * docY - omega * t
          const s = Math.sin(phase)
          const lift = (s + 1) / 2                     // 0 trough → 1 crest
          const cx = x + Math.cos(phase) * AMP * 0.35
          const cy = y + PITCH / 2 - s * AMP
          const r = RADIUS * (0.85 + lift * 0.55)
          const b = Math.min(BUCKETS - 1, Math.floor(lift * BUCKETS))
          paths[b].moveTo(cx + r, cy)
          paths[b].arc(cx, cy, r, 0, Math.PI * 2)
        }
      }
      for (let b = 0; b < BUCKETS; b++) {
        const a = ALPHA_LOW + ((b + 0.5) / BUCKETS) * (ALPHA_HIGH - ALPHA_LOW)
        ctx.fillStyle = `rgba(${RGB}, ${a.toFixed(3)})`
        ctx.fill(paths[b])
      }
      raf = requestAnimationFrame(draw)
    }

    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
      root.classList.remove('dots-live')
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden
      // Its own compositor layer, so the browser repaints the whole canvas
      // every frame instead of patching tiles (stale tiles showed as streaks
      // under the blurred header on Windows Chrome/Edge).
      style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', transform: 'translateZ(0)', contain: 'strict' }}
    />
  )
}
