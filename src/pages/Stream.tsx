/* Real React Stream page. Replaces the iframe-ported Shutap-Stream.dc.html.
 * Renders seed rooms + user-published rooms from localStorage (the same
 * dynamic source the iframe used). Scan rooms render as score-card tiles. */
import { useEffect, useMemo, useState } from 'react'
import { Words } from '@/components/motion'
import { useLocation, useNavigate } from '@/compat/router'

import { RoomTile, type RoomTileData } from '../components/RoomTile'
import { RoomDetail } from '../components/RoomDetail'
import { useToast } from '../components/Toast'
import { SHUTAP_SEED } from '../data/seed'
import type { Room } from '../data/types'
import { NUDGES } from '../data/constants'
import { listPillars } from '../lib/pillars.functions'
import { useNoIndex } from '@/components/NoIndex'
import { supabase } from '@/integrations/supabase/client'

function relativeHours(iso: string): string {
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return 'just now'
  const diff = Math.max(0, Date.now() - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return mins + 'm'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + 'h'
  const days = Math.floor(hrs / 24)
  return days + 'd'
}


type FeedItem =
  | { kind: 'room'; room: RoomTileData }
  | { kind: 'nudge'; text: string; key: string }

function NudgeTile({ text }: { text: string }) {
  const [hover, setHover] = useState(false)
  return (
    <a
      href="/#spill"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'block',
        borderRadius: 20,
        border: '1.5px dashed ' + (hover ? '#2b2630' : 'rgba(11,8,15,.16)'),
        background: 'transparent',
        padding: '20px 22px',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color .2s',
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 10 }} aria-hidden>👁</div>
      <div style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.5, color: '#100c14', marginBottom: 14 }}>
        {text}
      </div>
      <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 12.5, color: '#17131a', letterSpacing: '.02em' }}>
        say something →
      </div>
    </a>
  )
}


type Filter = 'all' | 'heard' | 'advice' | 'scan'

interface StoredRoom {
  id: string
  alias?: string
  emoji?: string
  title?: string
  body?: string
  reflection?: string
  hall?: Room['hall']
  support?: Room['support']
  hours?: string
  relates?: number
  sitting?: number
  reactions?: Room['reactions']
  kind?: 'spill' | 'scan'
  initial_scan?: number | null
  scan_band?: RoomTileData['scan_band']
  scan_signature?: string | null
  pillar?: string | null
}

function loadUserRooms(): RoomTileData[] {
  // SSR-safe: return [] on the server. User rooms hydrate after mount.
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('shutap_user_situations')
    if (!raw) return []
    const arr = JSON.parse(raw) as StoredRoom[]
    return arr.map(
      (r): RoomTileData => ({
        id: r.id,
        alias: r.alias || 'someone',
        emoji: r.emoji || '🩷',
        title: r.title || 'untitled',
        body: r.body || '',
        reflection: r.reflection || '',
        hall: (r.hall as Room['hall']) || 'healing',
        support: (r.support as Room['support']) || 'heard',
        hours: r.hours || 'just now',
        relates: r.relates ?? 0,
        sitting: r.sitting ?? 1,
        reactions: r.reactions || { heard: 0, same: 0, strong: 0, time: 0, brave: 0 },
        kind: r.kind,
        initial_scan: r.initial_scan ?? null,
        scan_band: r.scan_band ?? null,
        scan_signature: r.scan_signature ?? null,
        pillar: r.pillar ?? null,
      }),
    )
  } catch {
    return []
  }
}

export function StreamPage() {
  useNoIndex()
  const navigate = useNavigate()
  const { hash } = useLocation()
  const [filter, setFilter] = useState<Filter>('all')
  const { toast: toastMsg, ToastHost } = useToast()
  const [open, setOpen] = useState<RoomTileData | null>(null)
  const [version, setVersion] = useState(0)
  const [dbRooms, setDbRooms] = useState<RoomTileData[]>([])
  const [openedPillars, setOpenedPillars] = useState<string[] | null>(null)
  // Gate any localStorage / client-only data behind a post-mount flag so the
  // first client render matches SSR output (no hydration mismatch).
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Refresh when storage changes (publish from spill / scan)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'shutap_user_situations') setVersion((v) => v + 1)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Fetch public rooms from the DB + subscribe to live inserts.
  useEffect(() => {
    let cancelled = false
    const fetchRooms = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, alias, emoji, title, body, support, hall, reflection, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(200)
      if (cancelled || error || !data) return
      setDbRooms(
        data.map((r): RoomTileData => ({
          id: r.id,
          alias: r.alias || 'someone',
          emoji: r.emoji || '🩷',
          title: r.title || 'untitled',
          body: r.body || '',
          reflection: r.reflection || '',
          hall: ((r.hall as Room['hall']) || 'healing'),
          support: ((r.support as Room['support']) || 'heard'),
          hours: relativeHours(r.created_at as string),
          relates: 0,
          sitting: 0,
          reactions: { heard: 0, same: 0, strong: 0, time: 0, brave: 0 },
          kind: 'spill',
          initial_scan: null,
          scan_band: null,
          scan_signature: null,
          pillar: null,
        })),
      )
    }
    void fetchRooms()
    const channel = supabase
      .channel('stream-rooms')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rooms' }, () => { void fetchRooms() })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rooms' }, () => { void fetchRooms() })
      .subscribe()
    return () => { cancelled = true; void supabase.removeChannel(channel) }
  }, [version])

  // Phase 2c — load opened pillars once (client-only; non-blocking).
  useEffect(() => {
    listPillars()
      .then((rows) => {
        const now = Date.now()
        setOpenedPillars(
          rows.filter((r) => r.opened_at && new Date(r.opened_at).getTime() <= now).map((r) => r.pillar),
        )
      })
      .catch(() => setOpenedPillars(['relationships']))
  }, [])

  const rooms = useMemo<RoomTileData[]>(() => {
    const seed = (SHUTAP_SEED.rooms || []) as RoomTileData[]
    // Only mix in user-local rooms after mount so SSR + first client render
    // produce identical markup.
    const user = mounted ? loadUserRooms() : []
    // Dedup by id: DB rooms first (authoritative), then local cache (a
    // just-published room before the DB fetch resolves), then seed.
    const seen = new Set<string>()
    const out: RoomTileData[] = []
    for (const r of [...dbRooms, ...user, ...seed]) {
      if (seen.has(r.id)) continue
      seen.add(r.id)
      out.push(r)
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, mounted, dbRooms])


  const filtered = useMemo(() => {
    // Pillar gate: hide user rooms tagged with a closed pillar. Seed rooms
    // (no pillar tag) and the currently-opened pillars are always allowed.
    // Before mount / before pillars load, allow everything (seed only) so
    // SSR and first client render agree.
    const opened = mounted ? (openedPillars ?? ['relationships']) : null
    const pillarGated = opened
      ? rooms.filter((r) => !r.pillar || opened.includes(r.pillar))
      : rooms
    if (filter === 'all') return pillarGated
    if (filter === 'scan') return pillarGated.filter((r) => r.kind === 'scan')
    return pillarGated.filter((r) => r.support === filter && r.kind !== 'scan')
  }, [rooms, filter, openedPillars, mounted])


  // Honor /stream#room-<id> deep links from the spill publish flow
  useEffect(() => {
    if (!hash) return
    const m = hash.replace(/^#/, '').match(/^room-(.+)$/)
    if (!m) return
    const id = decodeURIComponent(m[1])
    const r = rooms.find((x) => x.id === id)
    if (r) setOpen(r)
  }, [hash, rooms])

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', overflowX: 'hidden' }}>
      <main>
        {/* HERO */}
        <section style={{ position: 'relative', padding: '44px 0 8px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: '-40% -10% auto', height: '80vh', background: 'radial-gradient(ellipse at 50% 30%, rgba(23,19,26,.12), transparent 60%)', pointerEvents: 'none', animation: 'drift 24s ease-in-out infinite' }} />
          <div aria-hidden style={{ position: 'absolute', right: '-4%', top: '-18%', fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 'clamp(160px,26vw,340px)', lineHeight: 1, color: 'rgba(23,19,26,.06)', letterSpacing: '-.06em', pointerEvents: 'none', userSelect: 'none' }}>rooms</div>
          <div style={{ maxWidth: 740, margin: '0 auto', padding: '0 22px', position: 'relative' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '.24em', textTransform: 'uppercase', color: '#2b2630', marginBottom: 14 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#5DCAA5', animation: 'breathe 3s ease-in-out infinite', display: 'block' }} />
              rooms open right now
            </div>
            <Words as="h1" style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 'clamp(38px,7vw,64px)', lineHeight: 1, letterSpacing: '-.045em', margin: '0 0 12px', color: '#0b080f' }}>
              sit in <em style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontWeight: 400, background: 'linear-gradient(92deg,#2b2630,#2b2630 70%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>someone's&nbsp;thing.</em>
            </Words>
            <p style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 'clamp(15.5px,1.4vw,18px)', color: '#383136', margin: 0, maxWidth: '46ch' }}>
              no algorithm. no upvotes. the room reshapes only when you ask it to.
            </p>
          </div>
        </section>

        {/* MARQUEE STRIP */}
        <section aria-hidden style={{ background: '#100c14', padding: '18px 0', overflow: 'hidden', margin: '26px 0 6px', borderTop: '1px solid rgba(23,19,26,.25)', borderBottom: '1px solid rgba(23,19,26,.25)' }}>
          <div style={{ display: 'flex', width: 'max-content', animation: 'mq 32s linear infinite' }}>
            {[0, 1].map((k) => (
              <div key={k} style={{ display: 'flex', gap: 38, paddingRight: 38, alignItems: 'center', fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 19, letterSpacing: '-.02em', color: '#fdfbf9', whiteSpace: 'nowrap' }}>
                <span>omg same 🫂</span><span style={{ color: '#2b2630' }}>✦</span>
                <span style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontWeight: 400, color: '#e2dde0' }}>i hear you</span><span style={{ color: '#2b2630' }}>✦</span>
                <span>you've got this 💪</span><span style={{ color: '#2b2630' }}>✦</span>
                <span style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontWeight: 400, color: '#e2dde0' }}>pseudonymous. jokes, not prescriptions.</span><span style={{ color: '#2b2630' }}>✦</span>
              </div>
            ))}
          </div>
        </section>

        {/* FEED */}
        <section style={{ padding: '16px 0 60px' }}>
          <div style={{ maxWidth: 740, margin: '0 auto', padding: '0 22px' }}>
            {/* filter pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
              {(['all', 'heard', 'advice', 'scan'] as Filter[]).map((f) => {
                const active = filter === f
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 999,
                      border: '.5px solid ' + (active ? '#2b2630' : 'rgba(11,8,15,.12)'),
                      background: active ? '#fff' : 'transparent',
                      color: active ? '#17131a' : '#443c42',
                      fontFamily: "'Sora',sans-serif",
                      fontWeight: 600,
                      fontSize: 11.5,
                      letterSpacing: '.06em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: '.18s',
                    }}
                  >
                    {f === 'all' ? 'all rooms' : f === 'scan' ? 'scans ✦' : f === 'heard' ? 'looking to be heard' : 'open to advice'}
                  </button>
                )
              })}
            </div>

            <WaterfallFeed filtered={filtered} onOpen={(room) => setOpen(room)} />

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '50px 0', fontFamily: "'Newsreader',serif", fontStyle: 'italic', color: '#6f666c' }}>
                no rooms here yet.{' '}
                <span style={{ color: '#17131a', cursor: 'pointer' }} onClick={() => navigate('/')}>
                  open one →
                </span>
              </div>
            )}

            <div style={{ marginTop: 32, paddingTop: 20, borderTop: '.5px solid rgba(11,8,15,.08)', textAlign: 'center', fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 15, color: '#443c42' }}>
              something happened to you too.{' '}
              <span
                onClick={() => navigate('/#spill')}
                style={{ color: '#17131a', borderBottom: '1px solid rgba(23,19,26,.3)', cursor: 'pointer' }}
              >
                the room is open. →
              </span>
            </div>
          </div>
        </section>
      </main>

      {open && (
        <RoomDetail
          room={open as Room}
          onBack={() => {
            setOpen(null)
            if (window.location.hash) window.history.replaceState(null, '', window.location.pathname)
          }}
          toast={toastMsg}
        />
      )}

      {ToastHost}
    </div>
  )
}

function WaterfallFeed({ filtered, onOpen }: { filtered: RoomTileData[]; onOpen: (r: RoomTileData) => void }) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)')
    const upd = () => setIsMobile(mq.matches)
    upd()
    mq.addEventListener('change', upd)
    return () => mq.removeEventListener('change', upd)
  }, [])

  // Weave nudges into slots 1 and 3
  const items: FeedItem[] = []
  let nudgeIx = 0
  const nudgeSlots = new Set([1, 3])
  for (const r of filtered) {
    if (nudgeSlots.has(items.length) && nudgeIx < NUDGES.length) {
      items.push({ kind: 'nudge', text: NUDGES[nudgeIx], key: 'nudge-' + nudgeIx })
      nudgeIx++
    }
    items.push({ kind: 'room', room: r })
  }

  const render = (it: FeedItem) =>
    it.kind === 'room'
      ? <RoomTile key={it.room.id} room={it.room} onOpen={onOpen} />
      : <NudgeTile key={it.key} text={it.text} />

  if (isMobile) {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>{items.map(render)}</div>
  }
  const left = items.filter((_, i) => i % 2 === 0)
  const right = items.filter((_, i) => i % 2 === 1)
  return (
    <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 13 }}>{left.map(render)}</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 13 }}>{right.map(render)}</div>
    </div>
  )
}
