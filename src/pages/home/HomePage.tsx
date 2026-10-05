/* Immersive homepage — pixel-parity mount of the canonical design reference
 * (Shutap_Landing_v2_07072026.html). The reference markup is injected via
 * `IMMERSIVE_HTML` and animated by `mountImmersive`; the existing
 * spill / scan / welcome / mirror flows are preserved by delegating CTA
 * clicks (`data-cta="spill|scan"`) and internal links (`data-link="/…"`)
 * back to the router + modal handlers. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@/compat/router'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { SpillModal } from '@/pages/landing/modals/SpillModal'
import { ScanModal } from '@/pages/landing/modals/ScanModal'
import { saveSituation } from '@/lib/situations.functions'
import { requireRealUser, saveIntent } from '@/lib/auth-guard'
import { supabase } from '@/integrations/supabase/client'
import { mountImmersive } from './immersiveMount'
import { mountHomeMotion } from './motionAdapter'
import { CursorTrail } from '@/components/motion/CursorTrail'
import { HomeImmersive } from './HomeImmersive'
import { Link } from '@tanstack/react-router'
import './home.css'
import '@/components/motion/motion.css'

const SORA = "'Sora',system-ui,sans-serif"
const NEWS = "'Newsreader',Georgia,serif"

export function HomeFooter() {
  return (
    <footer style={{ background: '#ffffff', borderTop: '.5px solid rgba(11,8,15,.06)', padding: '54px 22px 46px', color: '#443c42', fontFamily: "'Sora',system-ui,sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
        <div style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 16, color: '#383136' }}>shutap — say it funnier.</div>
        <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', fontFamily: SORA, fontWeight: 600, fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase' }}>
          <Link to="/stream" style={{ color: '#443c42', textDecoration: 'none' }}>rooms</Link>
          <Link to="/halls" style={{ color: '#443c42', textDecoration: 'none' }}>halls</Link>
          <Link to="/vent/$topic" params={{ topic: 'family' }} style={{ color: '#443c42', textDecoration: 'none' }}>what people bring</Link>
        </div>
        <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', fontFamily: 'Sora', fontSize: 12, color: '#6f666c' }}>
          <Link to="/relationships" style={{ color: '#6f666c', textDecoration: 'none' }}>relationships</Link>
          <Link to="/marriage" style={{ color: '#6f666c', textDecoration: 'none' }}>marriage</Link>
          <Link to="/family" style={{ color: '#6f666c', textDecoration: 'none' }}>family</Link>
          <Link to="/career" style={{ color: '#6f666c', textDecoration: 'none' }}>career & work</Link>
          <Link to="/lived-intelligence" style={{ color: '#6f666c', textDecoration: 'none' }}>what is lived intelligence?</Link>
          <Link to="/about" style={{ color: '#6f666c', textDecoration: 'none' }}>about</Link>
          <Link to="/how-it-works" style={{ color: '#6f666c', textDecoration: 'none' }}>how it works</Link>
          <Link to="/faq" style={{ color: '#6f666c', textDecoration: 'none' }}>faq</Link>
        </div>
        <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', fontFamily: 'Sora', fontSize: 12, color: '#6f666c' }}>
          <Link to="/terms" style={{ color: '#6f666c', textDecoration: 'none' }}>Terms</Link>
          <Link to="/privacy" style={{ color: '#6f666c', textDecoration: 'none' }}>Privacy</Link>
          <Link to="/guidelines" style={{ color: '#6f666c', textDecoration: 'none' }}>Guidelines</Link>
          <Link to="/safety" style={{ color: '#6f666c', textDecoration: 'none' }}>Safety</Link>
          <Link to="/ai-disclosure" style={{ color: '#6f666c', textDecoration: 'none' }}>AI Disclosure</Link>
          <Link to="/legal" style={{ color: '#6f666c', textDecoration: 'none' }}>Disclaimer</Link>
          <a href="mailto:hello@shutap.com" style={{ color: '#6f666c', textDecoration: 'none' }}>Contact</a>
        </div>
        <div data-nosnippet style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 13, color: '#6f666c', maxWidth: 620, lineHeight: 1.6 }}>
          18+ · pseudonymous · your real name never shows · jokes at the situation, never at you 🤍
          <br />
          shutap writes jokes, not prescriptions. not therapy, not advice, not a diagnosis. in an emergency, call or text 988 (US).
        </div>
        <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 10, letterSpacing: '.28em', color: '#c1216b', marginTop: 6 }}>YOU ALREADY HAVE THE MATERIAL.</div>
      </div>
    </footer>
  )
}

const SYNCED_KEY = 'shutap_situations_synced'
function pillarMap(p?: string | null): 'relationships' | 'marriage' | 'family' | 'career' {
  if (p === 'family') return 'family'
  if (p === 'marriage') return 'marriage'
  if (p === 'career' || p === 'work') return 'career'
  return 'relationships'
}
function hashKey(input: { pillar?: string | null; title?: string | null; body?: string | null; clean_text?: string | null }): string {
  const norm = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 240)
  const raw = pillarMap(input.pillar) + '|' + norm(input.title) + '|' + norm(input.body || input.clean_text)
  let h = 5381
  for (let i = 0; i < raw.length; i++) h = ((h << 5) + h + raw.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

import type { NewestRoom } from '@/lib/newest-rooms.functions'

export function HomePage({ openRoomsCount = 0, newestRooms = [] }: { openRoomsCount?: number; newestRooms?: NewestRoom[] } = {}) {
  const navigate = useNavigate()
  const router = useRouter()
  const save = useServerFn(saveSituation)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const [spillOpen, setSpillOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [pendingCta, setPendingCta] = useState<null | 'spill' | 'scan'>(null)

  useEffect(() => { void router.preloadRoute({ to: '/welcome' }).catch(() => {}) }, [router])

  const openSpill = useCallback(async () => {
    if (pendingCta) return
    setPendingCta('spill')
    try { if (!(await requireRealUser({ kind: 'spill' }))) return; setSpillOpen(true) } finally { setPendingCta(null) }
  }, [pendingCta])
  const openScan = useCallback(async () => {
    if (pendingCta) return
    setPendingCta('scan')
    try { if (!(await requireRealUser({ kind: 'scan' }))) return; setScanOpen(true) } finally { setPendingCta(null) }
  }, [pendingCta])

  // Mount the immersive motion/interactivity onto the native React DOM.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    // Defer one microtask so RestInjector's useEffect has run and populated the DOM.
    let disposeMount: (() => void) | undefined
    let disposeMotion: (() => void) | undefined
    const raf = requestAnimationFrame(() => {
      disposeMount = mountImmersive(root, {
        onCta: (k) => { if (k === 'spill') void openSpill(); else void openScan() },
        onNav: (to) => navigate(to as never),
        motion: 'full',
        showPreloader: false,
      })
      disposeMotion = mountHomeMotion(root)
    })
    return () => { cancelAnimationFrame(raf); disposeMotion?.(); disposeMount?.() }
  }, [navigate, openSpill, openScan])

  // Scroll-snap: opt in on the homepage only.
  useEffect(() => {
    const html = document.documentElement
    html.classList.add('home-scroll-snap')
    return () => { html.classList.remove('home-scroll-snap') }
  }, [])

  // Hash intents — /#spill, /#scan, /#mirror
  useEffect(() => {
    const handle = async () => {
      const h = window.location.hash
      if (!h) return
      if (h === '#mirror') { history.replaceState(null, '', window.location.pathname + window.location.search); navigate('/mirror'); return }
      if (h === '#ask') {
        history.replaceState(null, '', window.location.pathname + window.location.search)
        requestAnimationFrame(() => {
          const trigger = document.querySelector('[data-comp-action="open"]') as HTMLElement | null
          trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        })
        return
      }
      if (h !== '#spill' && h !== '#scan') return
      const { data: sess } = await supabase.auth.getSession()
      const u = sess.session?.user as { is_anonymous?: boolean } | undefined
      const real = !!sess.session && !u?.is_anonymous
      history.replaceState(null, '', window.location.pathname + window.location.search)
      if (!real) { saveIntent(h === '#scan' ? { kind: 'scan' } : { kind: 'spill' }); window.location.assign('/welcome'); return }
      if (h === '#scan') setScanOpen(true); else setSpillOpen(true)
    }
    void handle()
    const onHash = () => { void handle() }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [navigate])

  // Resume pending spill after sign-in
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const raw = sessionStorage.getItem('shutap_pending_save')
      if (!raw) return
      const { data: sess } = await supabase.auth.getSession()
      if (!sess.session || cancelled) return
      try {
        const payload = JSON.parse(raw) as { id?: string; pillar?: string | null; title?: string | null; body?: string | null; clean_text?: string | null }
        const normalized = { ...payload, pillar: pillarMap(payload.pillar) }
        const res = await save({ data: normalized as never })
        try {
          const cur = sessionStorage.getItem(SYNCED_KEY)
          const synced = cur ? (JSON.parse(cur) as Record<string, string>) : {}
          const h = hashKey({ pillar: payload.pillar, title: payload.title, body: payload.body || payload.clean_text })
          synced['hash:' + h] = res?.id || '1'
          if (payload.id) synced['bundle:' + payload.id] = res?.id || '1'
          sessionStorage.setItem(SYNCED_KEY, JSON.stringify(synced))
        } catch { /* ignore */ }
        sessionStorage.removeItem('shutap_pending_save')
        if (res?.room_id) {
          try {
            const { appendUserRoom } = await import('@/pages/landing/modals/SpillModal')
            appendUserRoom({ id: res.room_id, title: payload.title ?? 'your situation', body: (payload.body ?? payload.clean_text ?? '') as string, support: 'heard', pillar: (normalized.pillar ?? null) as string | null })
          } catch { /* noop */ }
          navigate(`/stream#room-${res.room_id}`)
        } else if (res?.id) navigate('/profile')
      } catch { /* leave payload for retry */ }
    })()
    return () => { cancelled = true }
  }, [navigate, save])

  return (
    <div ref={rootRef} className="home-immersive" style={{ background: '#ffffff', color: '#0b080f', fontFamily: "'Sora',system-ui,sans-serif" }}>
      <CursorTrail />
      <HomeImmersive openRoomsCount={openRoomsCount} newestRooms={newestRooms} />
      <SpillModal open={spillOpen} onClose={() => setSpillOpen(false)} />
      <ScanModal open={scanOpen} onClose={() => setScanOpen(false)} />
    </div>
  )
}
