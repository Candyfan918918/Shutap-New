import { useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { EyeMark } from './EyeMark'
import { getDueCheckin } from '@/lib/checkins.functions'
import { getUnseenCompanionCount, markCompanionSeen } from '@/lib/admin.functions'
import { supabase } from '@/integrations/supabase/client'

/* The companion: a draggable, semi-transparent pink circle with the brand eyes
   (no pill, no label). Tap (without dragging) opens the Ask flow; drag to
   reposition (persisted to localStorage). */
export function CompanionBubble({
  onOpen,
  elevated = false,
}: {
  onOpen: () => void
  elevated?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onOpenRef = useRef(onOpen)
  useEffect(() => { onOpenRef.current = onOpen }, [onOpen])
  const fetchDue = useServerFn(getDueCheckin)
  const fetchUnseen = useServerFn(getUnseenCompanionCount)
  const markSeen = useServerFn(markCompanionSeen)
  const [hasDue, setHasDue] = useState(false)
  const [hasUnseen, setHasUnseen] = useState(false)
  const hasDot = hasDue || hasUnseen

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: sess } = await supabase.auth.getSession()
        const u = sess.session?.user as { is_anonymous?: boolean } | undefined
        const real = !!sess.session && !u?.is_anonymous
        if (!real) return
        const [d, n] = await Promise.all([
          fetchDue().catch(() => null),
          fetchUnseen().catch(() => 0),
        ])
        if (cancelled) return
        if (d) setHasDue(true)
        if ((n ?? 0) > 0) setHasUnseen(true)
      } catch { /* fail silent */ }
    })()
    return () => { cancelled = true }
  }, [fetchDue, fetchUnseen])

  // When the user taps the bubble AND there were unseen companion replies,
  // stamp companion_seen_at so the dot clears on next check.
  useEffect(() => {
    const prev = onOpenRef.current
    onOpenRef.current = () => {
      if (hasUnseen) {
        setHasUnseen(false)
        void markSeen().catch(() => {})
      }
      prev()
    }
  }, [hasUnseen, markSeen])


  useEffect(() => {
    const el = ref.current
    if (!el) return

    const STORAGE_KEY = 'companion-bubble-pos-v1'

    const clampAndApply = (x: number, y: number) => {
      const sz = el.offsetWidth || 58
      const nx = Math.max(8, Math.min(window.innerWidth - sz - 8, x))
      const ny = Math.max(8, Math.min(window.innerHeight - sz - 8, y))
      el.style.left = nx + 'px'
      el.style.top = ny + 'px'
      el.style.right = 'auto'
      el.style.bottom = 'auto'
      return { nx, ny }
    }

    // Restore persisted position
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const p = JSON.parse(raw) as { x: number; y: number }
        if (typeof p.x === 'number' && typeof p.y === 'number') {
          clampAndApply(p.x, p.y)
        }
      }
    } catch { /* noop */ }

    const onResize = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return
        const p = JSON.parse(raw) as { x: number; y: number }
        clampAndApply(p.x, p.y)
      } catch { /* noop */ }
    }
    window.addEventListener('resize', onResize)

    let dragging = false
    let moved = false
    let sx = 0
    let sy = 0
    let ox = 0
    let oy = 0
    const TAP_THRESHOLD = 10

    const down = (e: PointerEvent) => {
      dragging = true
      moved = false
      const r = el.getBoundingClientRect()
      ox = r.left
      oy = r.top
      sx = e.clientX
      sy = e.clientY
      el.style.cursor = 'grabbing'
      if (el.setPointerCapture && e.pointerId != null) el.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - sx
      const dy = e.clientY - sy
      if (Math.abs(dx) > TAP_THRESHOLD || Math.abs(dy) > TAP_THRESHOLD) moved = true
      if (!moved) return
      clampAndApply(ox + dx, oy + dy)
      e.preventDefault()
    }
    const up = () => {
      if (!dragging) return
      dragging = false
      el.style.cursor = 'grab'
      if (!moved) {
        // tap: no meaningful movement — fire onOpen
        try { onOpenRef.current() } catch { /* noop */ }
      } else {
        // persist final position
        try {
          const r = el.getBoundingClientRect()
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: r.left, y: r.top }))
        } catch { /* noop */ }
      }
    }

    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('resize', onResize)
    }
  }, [])


  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-label="Ask the companion"
      className="companion-halo"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        zIndex: elevated ? 65 : 35,
        width: 58,
        height: 58,
        borderRadius: '50%',
        background: 'rgba(23,19,26,0.18)',
        backdropFilter: 'blur(4px)',
        boxShadow: '0 12px 30px -8px rgba(20,16,22,.35)',
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <div style={{ pointerEvents: 'none', display: 'inline-flex', transform: 'translateX(-2px)' }}>
        <EyeMark size={34} />
      </div>
      {hasDot && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#2b2630',
            boxShadow: '0 0 0 2px rgba(20,16,22,.9)',
            animation: 'pulse 2.4s infinite',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}

