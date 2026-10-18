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
const COLOR = 'rgba(184, 69, 107, 0.16)'
const AMP = 3.2             // px of vertical travel at the crest
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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
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
      const sy = window.scrollY
      const yOff = -(sy % PITCH)
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = COLOR
      ctx.beginPath()
      for (let y = yOff - PITCH; y < h + PITCH; y += PITCH) {
        const docY = y + sy
        for (let x = PITCH / 2; x < w + PITCH; x += PITCH) {
          const phase = kx * x + ky * docY - omega * t
          const dy = Math.sin(phase) * AMP
          const dx = Math.cos(phase) * AMP * 0.35
          const cx = x + dx
          const cy = y + PITCH / 2 + dy
          ctx.moveTo(cx + RADIUS, cy)
          ctx.arc(cx, cy, RADIUS, 0, Math.PI * 2)
        }
      }
      ctx.fill()
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
      style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}
    />
  )
}
