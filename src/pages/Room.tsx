/* Real React Room page — /room?id=<id>. Resolves the room from
 * localStorage (user-published spills/scans) first, then the seed.
 * Falls back to a friendly empty state when nothing matches. */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from '@/compat/router'

import { RoomDetail } from '../components/RoomDetail'
import { useToast } from '../components/Toast'
import { SHUTAP_SEED } from '../data/seed'
import type { Room } from '../data/types'
import { useNoIndex } from '@/components/NoIndex'

interface StoredRoom extends Partial<Room> {
  id: string
}

function loadUserRooms(): Room[] {
  try {
    const raw = localStorage.getItem('shutap_user_situations')
    if (!raw) return []
    const arr = JSON.parse(raw) as StoredRoom[]
    return arr.map(
      (r): Room => ({
        id: r.id,
        alias: r.alias || 'someone',
        emoji: r.emoji || '🩷',
        title: r.title || 'untitled',
        body: r.body || '',
        reflection: r.reflection || '',
        hall: r.hall || 'healing',
        support: (r.support as Room['support']) || 'heard',
        hours: r.hours || 'just now',
        relates: r.relates ?? 0,
        sitting: r.sitting ?? 1,
        reactions: r.reactions || { heard: 0, same: 0, strong: 0, time: 0, brave: 0 },
        comments: r.comments || [],
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

export function RoomPage() {
  useNoIndex()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const id = params.get('id')
  const { toast: toastMsg, ToastHost } = useToast()
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'shutap_user_situations') setVersion((v) => v + 1)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const room = useMemo<Room | null>(() => {
    if (!id) return null
    const all: Room[] = [...loadUserRooms(), ...((SHUTAP_SEED.rooms || []) as Room[])]
    return all.find((r) => r.id === id) || null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, version])

  if (!id || !room) {
    return (
      <div style={{ minHeight: '100vh', background: '#ffffff' }}>
        <main style={{ maxWidth: 640, margin: '0 auto', padding: '60px 22px', textAlign: 'center' }}>

          <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 10.5, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6f666c', marginBottom: 10 }}>
            this room
          </div>
          <h1 style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 24, margin: '0 0 10px', color: '#0b080f' }}>
            quiet here.
          </h1>
          <p style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 15.5, color: '#443c42', margin: '0 0 24px' }}>
            this room may have rested, or the link is broken.
          </p>
          <button
            onClick={() => navigate('/stream')}
            style={{
              padding: '11px 22px',
              borderRadius: 999,
              border: '1.5px solid #17131a',
              background: '#fff',
              cursor: 'pointer',
              fontFamily: 'Sora,sans-serif',
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: '#17131a',
            }}
          >
            see open rooms →
          </button>
        </main>
        {ToastHost}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>

      <RoomDetail room={room} onBack={() => navigate('/stream')} toast={toastMsg} />
      {ToastHost}
    </div>
  )
}
