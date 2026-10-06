// Post-read relate nudge — slides up when the reader nears the end of a
// public story. Fetches one cold-queue room and offers a single "omg same"
// tap. Session-guarded to fire once per browser session.
import { useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { supabase } from '@/integrations/supabase/client'
import { getColdNudge } from '@/lib/relate-queue.functions'
import { trackEvent } from '@/lib/tracking'

const SESSION_KEY = 'shutap_cold_nudge_shown_v1'

type Cold = { room_id: string; title: string; first_line: string; pillar: string | null }

export function RelateNudge({ currentRoomId, currentIsCrisis }: { currentRoomId: string | null; currentIsCrisis?: boolean }) {
  const [cold, setCold] = useState<Cold | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [relating, setRelating] = useState(false)
  const [related, setRelated] = useState(false)
  const shownRef = useRef(false)
  const fetchCold = useServerFn(getColdNudge)

  useEffect(() => {
    if (currentIsCrisis) return
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY)) return

    let cancelled = false
    const trigger = async () => {
      if (shownRef.current || cancelled) return
      shownRef.current = true
      try {
        const { data: sess } = await supabase.auth.getSession()
        const u = sess.session?.user as { is_anonymous?: boolean } | undefined
        if (!sess.session || u?.is_anonymous) return
        const c = await fetchCold({ data: currentRoomId ? { excludeRoomId: currentRoomId } : {} })
        if (cancelled || !c) return
        setCold(c as Cold)
        void trackEvent('cold_relate_nudge_shown', { room_id: c.room_id })
        try { sessionStorage.setItem(SESSION_KEY, '1') } catch { /* noop */ }
      } catch { /* fail silent */ }
    }

    const onScroll = () => {
      const el = document.documentElement
      const pct = (el.scrollTop + window.innerHeight) / Math.max(1, el.scrollHeight)
      if (pct >= 0.8) {
        window.removeEventListener('scroll', onScroll)
        trigger()
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => { cancelled = true; window.removeEventListener('scroll', onScroll) }
  }, [currentRoomId, currentIsCrisis, fetchCold])

  if (!cold || dismissed) return null

  const doRelate = async () => {
    if (relating || related) return
    setRelating(true)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const uid = sess.session?.user?.id
      if (uid) {
        await supabase.from('room_relates').insert({ room_id: cold.room_id, user_id: uid } as never)
      }
      setRelated(true)
      void trackEvent('cold_relate_nudge_accepted', { room_id: cold.room_id })
    } catch { /* noop */ } finally { setRelating(false) }
  }

  return (
    <div
      role="dialog"
      aria-label="another room needs you"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        maxWidth: 520,
        margin: '0 auto',
        background: '#fff',
        border: '.5px solid rgba(23,19,26,.35)',
        borderRadius: 16,
        boxShadow: '0 20px 40px -12px rgba(20,16,22,.28)',
        padding: '14px 16px',
        zIndex: 55,
        animation: 'slideUp .35s ease-out',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontFamily: 'Sora,sans-serif', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#6f666c' }}>
        <span>someone else is waiting</span>
        <button
          onClick={() => setDismissed(true)}
          aria-label="dismiss"
          style={{ background: 'none', border: 0, cursor: 'pointer', color: '#6f666c', fontSize: 18, lineHeight: 1, padding: 0 }}
        >×</button>
      </div>
      <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 15, color: '#0b080f', marginBottom: 4 }}>{cold.title}</div>
      {cold.first_line && (
        <div style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 13.5, color: '#443c42', marginBottom: 10 }}>{cold.first_line}</div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={doRelate}
          disabled={relating || related}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 999,
            border: 0,
            background: related ? '#d9d9d9' : '#2b2630',
            color: '#fff',
            fontFamily: 'Sora,sans-serif',
            fontWeight: 700,
            fontSize: 12.5,
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            cursor: related ? 'default' : 'pointer',
          }}
        >
          {related ? '✓ offered' : relating ? '…' : 'omg same 🩷'}
        </button>
        <a
          href={`/room?id=${encodeURIComponent(cold.room_id)}`}
          style={{
            padding: '10px 14px',
            borderRadius: 999,
            border: '1.5px solid #17131a',
            color: '#17131a',
            fontFamily: 'Sora,sans-serif',
            fontWeight: 600,
            fontSize: 12.5,
            textDecoration: 'none',
            letterSpacing: '.06em',
            textTransform: 'uppercase',
          }}
        >open</a>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(120%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
    </div>
  )
}
