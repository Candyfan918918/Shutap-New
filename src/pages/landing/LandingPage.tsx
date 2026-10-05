/* Native React landing (pixel-parity target for public/shutap/Landing.dc.html).
   This is the Step-1 scaffold from .lovable/plan.md: hero + FAQ + footer + onboarding modal + companion pill.
   Spill / Scan / Mirror CTAs and the feed preview will be ported in follow-up turns.
   Not wired as the default route yet — see src/pages/Landing.tsx (`?native=1` opt-in). */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@/compat/router'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ONBOARDING_FRAMES } from './data/onboarding'
import { FALLBACK_ROOMS, type LandingRoom } from './data/rooms'
import { SpillModal } from './modals/SpillModal'
import { ScanModal } from './modals/ScanModal'
import { MirrorTeaser } from './sections/MirrorTeaser'
import { CompanionComposer } from '@/components/CompanionComposer'
import { saveSituation } from '@/lib/situations.functions'
import { requireRealUser, saveIntent } from '@/lib/auth-guard'
import { supabase } from '@/integrations/supabase/client'
import { SHUTAP_SEED } from '@/data/seed'
import type { Room } from '@/data/types'
import { EyeMark, ShutapWordmark } from '@/components/EyeMark'
import { Words } from '@/components/motion'
import './landing.native.css'

// Shared sync key (kept identical to iframe bridge in src/pages/Landing.tsx).
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

// Ordered identically to the iframe's REACTIONS (getter in Landing.dc.html line 427).
const REACTIONS: Array<{ k: keyof LandingRoom['reactions']; color: string }> = [
  { k: 'heard',  color: '#a52a5f' },
  { k: 'same',   color: '#c87c4a' },
  { k: 'strong', color: '#5B8A5E' },
  { k: 'time',   color: '#7F77DD' },
  { k: 'brave',  color: '#c1a02b' },
]

const SORA = "'Sora', system-ui, sans-serif"
const NEWSREADER = "'Newsreader', Georgia, serif"

// Hall of Fame preview cards — pixel-parity port of Landing.dc.html §HOF PREVIEW (lines 273–292).
const HOF_CARDS: Array<{ href: string; label: string; quote: string; credit: string }> = [
  { href: '/halls#loving',    label: '🤍 Most Loving',    quote: '"I called my dad for the first time in eight years. he picked up."',                        credit: '🕊 Older Korean Crane · 847 resonance' },
  { href: '/halls#relatable', label: '🫂 Most Relatable', quote: '"I cried in the work bathroom and a stranger passed me toilet paper under the stall."',    credit: '🦌 Tender Mexican Fawn · 1.2k resonance' },
  { href: '/halls#brave',     label: '💪 Bravest',        quote: '"I walked out of my own wedding. it was the right thing to do."',                          credit: '🦁 Defiant Kenyan Lion · 932 resonance' },
  { href: '/halls#healing',   label: '🌿 Most Healing',   quote: '"I\'ve been going to therapy for two years and I finally cried today."',                   credit: '🕊 Patient Indian Dove · 611 resonance' },
]

// ── Live-rooms loader ─────────────────────────────────────────────────
// Mirrors the iframe's ROOMS source (window.SHUTAP_SEED.rooms) plus the
// user-published rooms in localStorage['shutap_user_situations'] used by
// the React Stream page. Falls back to FALLBACK_ROOMS only when nothing
// live is available (e.g. seed import failed).
function toLandingRoom(r: Partial<Room> & { id: string }): LandingRoom {
  const rx = r.reactions || { heard: 0, same: 0, strong: 0, time: 0, brave: 0 }
  return {
    id: r.id,
    alias: r.alias || 'someone',
    emoji: r.emoji || '🩷',
    title: r.title || 'untitled',
    support: (r.support as 'heard' | 'advice') || 'heard',
    relates: r.relates ?? 0,
    sitting: r.sitting ?? 1,
    hours: r.hours || 'just now',
    reactions: {
      heard: rx.heard ?? 0,
      same: rx.same ?? 0,
      strong: rx.strong ?? 0,
      time: rx.time ?? 0,
      brave: rx.brave ?? 0,
    },
    body: r.body || '',
  }
}
function loadUserRoomsLive(): LandingRoom[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('shutap_user_situations')
    if (!raw) return []
    const arr = JSON.parse(raw) as Array<Partial<Room> & { id: string }>
    return arr.filter(r => r && r.id).map(toLandingRoom)
  } catch { return [] }
}
function useLiveRooms(): LandingRoom[] {
  // Seed-only on first render (SSR + first client paint) so hydration matches.
  // localStorage-backed user rooms merge in AFTER hydration, in an effect.
  const [userRooms, setUserRooms] = useState<LandingRoom[]>([])
  useEffect(() => {
    setUserRooms(loadUserRoomsLive())
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'shutap_user_situations') setUserRooms(loadUserRoomsLive())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return useMemo(() => {
    const seed = (SHUTAP_SEED.rooms || []).map(r => toLandingRoom(r as Room))
    const live = [...userRooms, ...seed]
    return live.length ? live : FALLBACK_ROOMS
  }, [userRooms])
}

export function LandingNativePage() {
  const navigate = useNavigate()
  const router = useRouter()
  const save = useServerFn(saveSituation)
  const [onbOpen, setOnbOpen] = useState<boolean>(false)
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
    try { if (!localStorage.getItem('shutap_onb_seen')) setOnbOpen(true) } catch { /* noop */ }
    // Preload the /welcome route chunk so Spill/Scan CTAs feel instant for
    // anonymous visitors — the sign-in page is ssr:false and otherwise
    // downloads on click.
    void router.preloadRoute({ to: '/welcome' }).catch(() => {})
  }, [router])
  const [onbIdx, setOnbIdx] = useState(0)
  const [spillOpen, setSpillOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [pendingCta, setPendingCta] = useState<null | 'spill' | 'scan'>(null)
  const liveRooms = useLiveRooms()
  const featured = liveRooms[0]
  const gridRooms = liveRooms.slice(0, 4)

  const preloadWelcome = useCallback(() => {
    void router.preloadRoute({ to: '/welcome' }).catch(() => {})
  }, [router])

  const openSpill = useCallback(async () => {
    setPendingCta('spill')
    try {
      if (!(await requireRealUser({ kind: 'spill' }))) return
      setSpillOpen(true)
    } finally {
      setPendingCta(null)
    }
  }, [])
  const closeSpill = useCallback(() => { setSpillOpen(false) }, [])
  const openScan = useCallback(async () => {
    setPendingCta('scan')
    try {
      if (!(await requireRealUser({ kind: 'scan' }))) return
      setScanOpen(true)
    } finally {
      setPendingCta(null)
    }
  }, [])
  const closeScan = useCallback(() => { setScanOpen(false) }, [])
  const openMirror = useCallback(() => { navigate('/mirror') }, [navigate])

  // Intent hash handling — /#spill, /#scan, /#ask open native modals directly
  // (#ask maps to spill, same as the iframe's openComposer → spill fallthrough);
  // /#mirror routes to the React /mirror page.
  // Only auto-open for a REAL signed-in user (resume path from /welcome).
  // Anonymous visitors landing on /#spill via a shared link are re-gated.
  useEffect(() => {
    const handle = async () => {
      const h = window.location.hash
      if (!h) return
      if (h === '#mirror') { history.replaceState(null, '', window.location.pathname + window.location.search); navigate('/mirror'); return }
      if (h === '#ask') {
        history.replaceState(null, '', window.location.pathname + window.location.search)
        setComposerOpen(true)
        return
      }
      if (h !== '#spill' && h !== '#scan') return
      const { data: sess } = await supabase.auth.getSession()
      const u = sess.session?.user as { is_anonymous?: boolean } | undefined
      const real = !!sess.session && !u?.is_anonymous
      history.replaceState(null, '', window.location.pathname + window.location.search)
      if (!real) {
        saveIntent(h === '#scan' ? { kind: 'scan' } : { kind: 'spill' })
        window.location.assign('/welcome')
        return
      }
      if (h === '#scan') setScanOpen(true)
      else setSpillOpen(true)
    }
    void handle()
    const onHash = () => { void handle() }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [navigate])


  // Resume a pending Spill save after the user returns from sign-in. Mirrors
  // the iframe bridge's resume logic in src/pages/Landing.tsx.
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
          const synced = cur ? JSON.parse(cur) as Record<string, string> : {}
          const h = hashKey({ pillar: payload.pillar, title: payload.title, body: payload.body || payload.clean_text })
          synced['hash:' + h] = res?.id || '1'
          if (payload.id) synced['bundle:' + payload.id] = res?.id || '1'
          sessionStorage.setItem(SYNCED_KEY, JSON.stringify(synced))
        } catch { /* ignore */ }
        sessionStorage.removeItem('shutap_pending_save')
        if (res?.room_id) {
          try {
            const { appendUserRoom } = await import('./modals/SpillModal')
            appendUserRoom({
              id: res.room_id,
              title: payload.title ?? 'your situation',
              body: (payload.body ?? payload.clean_text ?? '') as string,
              support: 'heard',
              pillar: (normalized.pillar ?? null) as string | null,
            })
          } catch { /* noop */ }
          navigate(`/stream#room-${res.room_id}`)
        } else if (res?.id) navigate('/profile')
      } catch { /* leave payload for retry */ }
    })()
    return () => { cancelled = true }
  }, [navigate, save])

  const dismissOnb = useCallback(() => {
    try { localStorage.setItem('shutap_onb_seen', '1') } catch { /* ignore */ }
    setOnbOpen(false)
  }, [])
  const advanceOnb = useCallback(() => {
    if (onbIdx >= ONBOARDING_FRAMES.length - 1) { dismissOnb(); return }
    setOnbIdx(i => i + 1)
  }, [onbIdx, dismissOnb])

  const frame = useMemo(() => ONBOARDING_FRAMES[onbIdx], [onbIdx])

  return (
    <div style={{ background: '#ffffff', color: '#0b080f', minHeight: '100vh', fontFamily: "'Sora',system-ui,sans-serif" }}>
      {/* shared eye gradients — same defs the iframe used */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <linearGradient id="eyeG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a52a5f" />
            <stop offset="100%" stopColor="#6d1239" />
          </linearGradient>
          <linearGradient id="pupG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#100c14" />
            <stop offset="100%" stopColor="#100608" />
          </linearGradient>
        </defs>
      </svg>

      {/* HEADER — provided globally by <GlobalHeader /> in the root layout. */}



      <main>
        {/* HERO */}
        <section style={{ position: 'relative', overflow: 'hidden', padding: '64px 0 36px' }}>
          <div style={{ position: 'absolute', inset: '-20% 0 auto 10%', height: '70vh', background: 'radial-gradient(ellipse at center,rgba(231,84,138,.13),transparent 62%)', pointerEvents: 'none', animation: 'drift 22s ease-in-out infinite' }} />
          <div style={{ maxWidth: 740, margin: '0 auto', padding: '0 22px', position: 'relative' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: SORA, fontWeight: 600, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: '#a52a5f', marginBottom: 22 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a52a5f', animation: 'shimmer 3s ease-in-out infinite', display: 'block' }} />
              <span>rooms open now</span>
            </div>
            <Words as="h1" style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(30px,6vw,50px)', lineHeight: 1.15, letterSpacing: '-.015em', margin: '0 0 20px', color: '#0b080f', maxWidth: '14ch' }}>
              finally, somewhere to <em style={{ fontStyle: 'normal', background: 'linear-gradient(92deg,#a52a5f,#890041 70%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>not shut up.</em>
            </Words>
            <p style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 18, lineHeight: 1.6, color: '#383136', maxWidth: '46ch', margin: '0 0 30px' }}>
              let it all out — and you're not the only one who's been through this. spill it; someone in here has lived your exact thing.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 480 }}>
                <button type="button" onClick={openSpill} onPointerEnter={preloadWelcome} onFocus={preloadWelcome} disabled={pendingCta === 'spill'} aria-busy={pendingCta === 'spill'} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8, background: 'linear-gradient(155deg,#ff7eb3,#a52a5f 55%,#c1216b)', color: '#fff', padding: '18px 18px 16px', borderRadius: 18, cursor: pendingCta === 'spill' ? 'progress' : 'pointer', transition: '.18s', border: 'none', boxShadow: '0 12px 28px -12px rgba(193,33,107,.55)', opacity: pendingCta === 'spill' ? 0.75 : 1 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 16, letterSpacing: '-.01em' }}>{pendingCta === 'spill' ? 'opening…' : 'spill it'}</div>
                  <div style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 13, color: 'rgba(255,255,255,.85)', lineHeight: 1.4 }}>tell your story — opens a room the world can sit in.</div>
                </button>
                <button type="button" onClick={openScan} onPointerEnter={preloadWelcome} onFocus={preloadWelcome} disabled={pendingCta === 'scan'} aria-busy={pendingCta === 'scan'} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8, background: '#fff', color: '#0b080f', padding: '18px 18px 16px', borderRadius: 18, cursor: pendingCta === 'scan' ? 'progress' : 'pointer', transition: '.18s', border: '1.5px solid rgba(231,84,138,.28)', opacity: pendingCta === 'scan' ? 0.75 : 1 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#a52a5f" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}><path d="M12 3a9 9 0 1 0 9 9" /><path d="M12 12l5-5" /><circle cx={12} cy={12} r={1.6} fill="#a52a5f" stroke="none" /></svg>
                  <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 16, letterSpacing: '-.01em', color: '#c1216b' }}>{pendingCta === 'scan' ? 'opening…' : 'scan it'}</div>
                  <div style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 13, color: '#443c42', lineHeight: 1.4 }}>60-second read — get a private intensity score.</div>
                </button>
              </div>
              <MirrorTeaser onOpen={openMirror} />

            </div>
            {/* Pseudonym / trust paragraph — pixel-parity port of Landing.dc.html heroAlias (line 206 + buildHeroAlias signed-out branch lines 592–597). */}
            <div style={{ marginTop: 18, fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 13, color: '#6f666c' }}>
              everyone here — teller and room alike — sits under a pseudonym. your real name, email, and identity stay permanently outside. that protection is what makes it possible to be frank.{' '}
              <span
                role="button"
                tabIndex={0}
                onClick={() => navigate('/welcome')}
                style={{ cursor: 'pointer', color: '#c1216b', borderBottom: '1px solid rgba(193,33,107,.3)' }}
              >
                get your alias →
              </span>
            </div>
          </div>
        </section>

        {/* FEATURED ROOM — pixel-parity port of Landing.dc.html §FEATURED ROOM (lines 210–252) */}
        <section style={{ padding: '12px 0 32px' }}>
          <div style={{ maxWidth: 740, margin: '0 auto', padding: '0 22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: SORA, fontWeight: 700, fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: '#a52a5f' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a52a5f', animation: 'pulse 3s infinite', display: 'block' }} />
                a room right now
              </div>
              <a href="/stream" className="prose-link" style={{ fontSize: 13 }}>see all rooms →</a>
            </div>
            {featured && (() => {
              const total = Object.values(featured.reactions).reduce((a, b) => a + b, 0) || 1
              const pct = (n: number) => Math.round((n / total) * 100)
              const label = featured.support === 'heard' ? 'looking to be heard' : 'open to advice'
              return (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/stream#room-${featured.id}`)}
                  className="featured-tile"
                  style={{ background: 'linear-gradient(160deg,#100c14,#100c14)', border: '1px solid rgba(255,255,255,.10)', borderRadius: 22, overflow: 'hidden', cursor: 'pointer', transition: 'transform .18s, box-shadow .2s' }}
                >
                  <div style={{ padding: '24px 26px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(231,84,138,.18)', color: '#f7b8d4', border: '.5px solid rgba(231,84,138,.28)', borderRadius: 999, padding: '4px 11px', fontFamily: SORA, fontWeight: 600, fontSize: 10.5, letterSpacing: '.06em' }}>{label}</span>
                      <span style={{ fontSize: 12, color: '#6f666c', fontFamily: NEWSREADER, fontStyle: 'italic' }}>{featured.hours} ago</span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6f666c', fontFamily: NEWSREADER, fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#5DCAA5', animation: 'breathe 2.8s ease-in-out infinite', display: 'block' }} />
                        {featured.sitting} sitting in
                      </span>
                    </div>
                    <h2 style={{ fontFamily: SORA, fontWeight: 700, fontSize: 'clamp(19px,3.5vw,24px)', lineHeight: 1.22, color: '#fff', margin: '0 0 14px', letterSpacing: '-.01em' }}>
                      {featured.title}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                      <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(231,84,138,.2)', display: 'grid', placeItems: 'center', fontSize: 15, flex: 'none' }}>{featured.emoji}</span>
                      <span style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 13.5, color: '#c4a0b2' }}>{featured.alias}</span>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6f666c', marginBottom: 7 }}>how the room is holding this</div>
                      <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', gap: 1 }}>
                        {REACTIONS.map((rx, i) => (
                          <span key={rx.k} style={{ flex: featured.reactions[rx.k], background: rx.color, borderRadius: i === 0 ? '3px 0 0 3px' : i === REACTIONS.length - 1 ? '0 3px 3px 0' : undefined }} />
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 14, marginTop: 7, fontSize: 11.5, color: '#6f666c', fontFamily: NEWSREADER, fontStyle: 'italic', flexWrap: 'wrap' }}>
                        <span>🤍 i hear you <b style={{ color: '#fdfbf9', fontStyle: 'normal' }}>{pct(featured.reactions.heard)}%</b></span>
                        <span>🫂 omg same <b style={{ color: '#fdfbf9', fontStyle: 'normal' }}>{pct(featured.reactions.same)}%</b></span>
                        <span>💪 you've got this <b style={{ color: '#fdfbf9', fontStyle: 'normal' }}>{pct(featured.reactions.strong)}%</b></span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                      <span style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 13.5, color: '#c4a0b2' }}>
                        <b style={{ color: '#f7b8d4', fontStyle: 'normal' }}>{featured.relates}</b> said 'omg same'
                      </span>
                      <span style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 13, color: '#a52a5f' }}>enter the room →</span>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </section>

        {/* STREAM PREVIEW — pixel-parity port of Landing.dc.html §STREAM PREVIEW + buildFeed()/roomTile() */}
        <section style={{ padding: '8px 0 32px' }}>
          <div style={{ maxWidth: 740, margin: '0 auto', padding: '0 22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: SORA, fontWeight: 700, fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: '#a52a5f' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a52a5f', boxShadow: '0 0 0 3px rgba(231,84,138,.18)', display: 'block' }} />
                rooms open
              </div>
              <a href="/stream" className="prose-link" style={{ fontSize: 13 }}>all rooms →</a>
            </div>
            <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 13, minWidth: 0 }}>
                {[0, 2].map(i => gridRooms[i] && <RoomTile key={gridRooms[i].id} room={gridRooms[i]} navigate={navigate} />)}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 13, minWidth: 0 }}>
                {[1, 3].map(i => gridRooms[i] && <RoomTile key={gridRooms[i].id} room={gridRooms[i]} navigate={navigate} />)}
              </div>
            </div>
          </div>
        </section>

        {/* HALL OF FAME PREVIEW — pixel-parity port of Landing.dc.html §HOF PREVIEW (lines 265–295) */}
        <section style={{ padding: '8px 0 36px' }}>
          <div style={{ maxWidth: 740, margin: '0 auto', padding: '0 22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: SORA, fontWeight: 700, fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: '#a52a5f' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a52a5f', boxShadow: '0 0 0 3px rgba(231,84,138,.18)', display: 'block' }} />
                hall of fame
              </div>
              <a href="/halls" className="prose-link" style={{ fontSize: 13 }}>all halls →</a>
            </div>
            <div style={{ display: 'flex', gap: 11, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              {HOF_CARDS.map(c => (
                <a key={c.href} href={c.href} className="hof-card" style={{ display: 'block', textDecoration: 'none', flex: 'none', width: 230, background: '#fff', border: '.5px solid rgba(11,8,15,.08)', borderRadius: 16, padding: 16, transition: 'transform .18s, border-color .18s' }}>
                  <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#a52a5f', marginBottom: 10 }}>{c.label}</div>
                  <p style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 14.5, lineHeight: 1.4, color: '#0b080f', margin: '0 0 10px' }}>{c.quote}</p>
                  <div style={{ fontSize: 11.5, color: '#6f666c', fontFamily: NEWSREADER, fontStyle: 'italic' }}>{c.credit}</div>
                </a>
              ))}
            </div>
          </div>
        </section>


        {/* WHAT IS SHUTAP + FAQ */}
        <section style={{ padding: '32px 0 24px' }}>

          <div style={{ maxWidth: 740, margin: '0 auto', padding: '0 22px' }}>
            <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: '#a52a5f', marginBottom: 14 }}>what is shutap</div>
            <p style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 17, lineHeight: 1.65, color: '#100c14', margin: '0 0 10px', maxWidth: '52ch' }}>
              a pseudonymous place to vent about relationships, marriage, family, and work — and see what actually happened next for people who lived your exact thing.
            </p>
            <p style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.65, color: '#443c42', margin: '0 0 24px', maxWidth: '52ch' }}>
              <span onClick={openSpill} onPointerEnter={preloadWelcome} className="prose-link">spill it</span> — one question at a time, the companion helps you find the words. or{' '}
              <span onClick={openScan} onPointerEnter={preloadWelcome} className="prose-link">scan it</span> — sixty seconds of questions, a private read saved just for you.
            </p>
            <FaqRow q="is this anonymous?" a="pseudonymous. you get a persistent alias — something like 🦉 Quiet Indonesian Owl — generated the first time you sit down. your real name is never attached to anything, anywhere, including us." />
            <FaqRow q="what happens when i vent?" a="shutap writes you a set of joke cards about it — every card a different angle on the same situation. you keep the ones that land, and nothing is published unless you post it." />
            <FaqRow q="what does the companion do?" a="it helps you put words to it. asks one question at a time, reflects back what it heard, and helps you decide whether you want the room to hear it — or whether you just needed to say it to yourself first." />
            <FaqRow q="what happens after I share?" a="your story opens a room. people can sit in it, relate to it, react to it. when the room goes quiet for 72 hours — it rests. if it's carried enough resonance, it finds its way into the hall of fame." last />
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ padding: '28px 22px 90px', color: '#6f666c', fontSize: 12, textAlign: 'center', fontFamily: NEWSREADER, fontStyle: 'italic', lineHeight: 1.6 }}>
          <div>shutap — say it funnier.</div>
          <div style={{ marginTop: 3 }}>18+ · pseudonymous · your real name never shows · jokes at the situation, never at you 🤍</div>
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: '7px 16px', justifyContent: 'center', fontStyle: 'normal' }}>
            <a href="/relationships" style={{ fontFamily: "'Sora',sans-serif", fontSize: 12, color: '#443c42', textDecoration: 'none' }}>relationships</a>
            <a href="/marriage" style={{ fontFamily: "'Sora',sans-serif", fontSize: 12, color: '#443c42', textDecoration: 'none' }}>marriage</a>
            <a href="/family" style={{ fontFamily: "'Sora',sans-serif", fontSize: 12, color: '#443c42', textDecoration: 'none' }}>family</a>
            <a href="/career" style={{ fontFamily: "'Sora',sans-serif", fontSize: 12, color: '#443c42', textDecoration: 'none' }}>career</a>
            <a href="/lived-intelligence" style={{ fontFamily: "'Sora',sans-serif", fontSize: 12, color: '#443c42', textDecoration: 'none' }}>lived intelligence</a>
            <a href="/faq" style={{ fontFamily: "'Sora',sans-serif", fontSize: 12, color: '#443c42', textDecoration: 'none' }}>faq</a>
            <a href="/terms" style={{ fontFamily: "'Sora',sans-serif", fontSize: 12, color: '#443c42', textDecoration: 'none' }}>terms</a>
            <a href="/privacy" style={{ fontFamily: "'Sora',sans-serif", fontSize: 12, color: '#443c42', textDecoration: 'none' }}>privacy</a>
            <a href="/guidelines" style={{ fontFamily: "'Sora',sans-serif", fontSize: 12, color: '#443c42', textDecoration: 'none' }}>guidelines</a>
            <a href="/safety" style={{ fontFamily: "'Sora',sans-serif", fontSize: 12, color: '#443c42', textDecoration: 'none' }}>safety</a>
            <a href="mailto:hello@shutap.com" style={{ fontFamily: "'Sora',sans-serif", fontSize: 12, color: '#443c42', textDecoration: 'none' }}>contact</a>
          </div>

          <div style={{ marginTop: 9, fontSize: 11.5, color: '#b09aa6', maxWidth: '42ch', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
            shutap writes jokes, not prescriptions. not therapy, not advice, not a diagnosis. in an emergency, call or text 988 (US).
          </div>
          <div style={{ marginTop: 12, fontFamily: SORA, fontStyle: 'normal', fontWeight: 700, fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: '#443c42' }}>you already have the material.</div>
        </footer>
      </main>

      {/* Global companion bubble is rendered in the root layout. The #ask hash
          below re-uses this page's composer state when returning from other pages. */}
      <CompanionComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSpill={openSpill}
        onScan={openScan}
      />

      {/* Onboarding modal (shown once) */}
      {hydrated && onbOpen && frame && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 95, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={dismissOnb} style={{ position: 'absolute', inset: 0, background: 'rgba(10,5,14,.72)', backdropFilter: 'blur(8px)' }} />
          <div role="dialog" style={{ position: 'relative', width: '100%', maxWidth: 420, background: 'linear-gradient(160deg,#100c14,#100c14)', border: '.5px solid rgba(255,255,255,.14)', borderRadius: 24, padding: '26px 28px 28px', textAlign: 'center', animation: 'pop .35s ease' }}>
            <div onClick={dismissOnb} role="button" style={{ position: 'absolute', top: 16, right: 18, fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 13.5, color: '#6f666c', cursor: 'pointer' }}>skip</div>
            <div style={{ marginBottom: 16 }}>
              {frame.eye ? (
                <span style={{ display: 'inline-block' }}>
                  <EyeMark size={46} />
                </span>
              ) : (
                <span style={{ fontSize: 42, lineHeight: 1 }}>{frame.emoji}</span>
              )}
            </div>
            <div style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 22, lineHeight: 1.3, color: '#fff', marginBottom: 18 }}>{frame.big}</div>
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {frame.rows.map(([icon, text], i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 20, lineHeight: '24px', flex: 'none' }}>{icon}</span>
                  <div style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 15, lineHeight: 1.5, color: '#f3c6da' }}>{text}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 7, justifyContent: 'center', margin: '4px 0 18px' }}>
              {ONBOARDING_FRAMES.map((_, i) => (
                <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i === onbIdx ? '#a52a5f' : 'rgba(255,255,255,.18)' }} />
              ))}
            </div>
            <div onClick={advanceOnb} role="button" style={{ background: '#a52a5f', color: '#fff', borderRadius: 14, padding: 14, fontFamily: SORA, fontWeight: 700, fontSize: 14.5, cursor: 'pointer' }}>
              {onbIdx >= ONBOARDING_FRAMES.length - 1 ? "let's go →" : 'next →'}
            </div>
          </div>
        </div>
      )}

      <SpillModal open={spillOpen} onClose={closeSpill} />
      <ScanModal open={scanOpen} onClose={closeScan} />
    </div>
  )
}

function FaqRow({ q, a, last }: { q: string; a: string; last?: boolean }) {
  return (
    <details style={{ borderTop: '.5px solid rgba(11,8,15,.08)', borderBottom: last ? '.5px solid rgba(11,8,15,.08)' : undefined, padding: '15px 0' }}>
      <summary style={{ fontFamily: SORA, fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#0b080f', display: 'flex', justifyContent: 'space-between', alignItems: 'center', listStyle: 'none' }}>
        {q}<span style={{ color: '#a52a5f', fontSize: 20, fontWeight: 300 }}>+</span>
      </summary>
      <p style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 15, color: '#443c42', lineHeight: 1.6, margin: '10px 0 0', maxWidth: '52ch' }}>{a}</p>
    </details>
  )
}

/* Pixel-parity port of DCLogic.roomTile() from Landing.dc.html (lines 721–745). */
function RoomTile({ room: r, navigate }: { room: LandingRoom; navigate: (to: string) => void }) {
  const heardTint = {
    bg: r.support === 'heard' ? 'rgba(231,84,138,.08)' : 'rgba(91,138,94,.10)',
    fg: r.support === 'heard' ? '#c1216b' : '#3a6b3c',
    br: r.support === 'heard' ? 'rgba(193,33,107,.18)' : 'rgba(91,138,94,.22)',
  }
  const label = r.support === 'heard' ? 'looking to be heard' : 'open to advice'
  return (
    <div className="rtile" onClick={() => navigate(`/stream#room-${r.id}`)}>
      <div style={{ padding: '15px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: heardTint.bg, color: heardTint.fg, border: `.5px solid ${heardTint.br}`, borderRadius: 999, padding: '4px 10px', fontFamily: SORA, fontWeight: 600, fontSize: 10, letterSpacing: '.06em' }}>{label}</span>
          <span style={{ fontSize: 12, color: '#6f666c', fontFamily: NEWSREADER, fontStyle: 'italic', marginLeft: 'auto' }}>{r.hours}</span>
        </div>
        <h4 style={{ fontFamily: SORA, fontWeight: 700, fontSize: 15, lineHeight: 1.28, margin: '0 0 10px', color: '#0b080f' }}>{r.title}</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fdfbf9', display: 'grid', placeItems: 'center', fontSize: 12, flex: 'none', animation: 'bob 2.8s ease-in-out infinite' }}>{r.emoji}</span>
          <span style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 12.5, color: '#443c42', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.alias}</span>
        </div>
        <div style={{ marginBottom: 9 }}>
          <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', display: 'flex', gap: 1 }}>
            {REACTIONS.map(rx => (
              <span key={rx.k} style={{ flex: r.reactions[rx.k], background: rx.color, height: '100%' }} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 12.5, color: '#6f666c' }}>
          <span><b style={{ color: '#c1216b', fontStyle: 'normal' }}>{r.relates}</b> said 'omg same'</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5DCAA5', animation: 'breathe 2.8s ease-in-out infinite', display: 'block' }} />
            {r.sitting} in
          </span>
        </div>
      </div>
    </div>
  )
}

