/* Home: the write box and what's under it. Spill and Scan are retired;
 * their old hash links land on the box. */
import { useEffect } from 'react'
import { useNavigate } from '@/compat/router'
import { HomeImmersive } from './HomeImmersive'
import { Footer } from '@/components/feed/Footer'
import './home.css'

export function HomeFooter() {
  return <Footer />
}

import type { NewestRoom } from '@/lib/newest-rooms.functions'

export function HomePage({ openRoomsCount = 0, newestRooms = [] }: { openRoomsCount?: number; newestRooms?: NewestRoom[] } = {}) {
  const navigate = useNavigate()

  // Old links: /#spill and /#scan now land on the write box. /#mirror goes
  // to the mirror.
  useEffect(() => {
    const h = window.location.hash
    if (!h) return
    if (h === '#mirror') { history.replaceState(null, '', window.location.pathname + window.location.search); navigate('/mirror'); return }
    if (h === '#spill' || h === '#scan' || h === '#ask' || h === '#joke') {
      history.replaceState(null, '', window.location.pathname + window.location.search)
      requestAnimationFrame(() => {
        const box = document.querySelector('textarea') as HTMLTextAreaElement | null
        box?.focus()
      })
    }
  }, [navigate])

  return (
    <div className="home-immersive" style={{ background: 'transparent', color: '#1a1418', fontFamily: "'Sora',system-ui,sans-serif" }}>
      <HomeImmersive openRoomsCount={openRoomsCount} newestRooms={newestRooms} />
    </div>
  )
}
