/* Final "enter" step. Lazy-loaded — routes user to their pending intent
 * or the default stream. */
import { useEffect, useRef, useState } from 'react'
import { getRouterRef } from '@/lib/router-ref'
import { clearIntent, readIntent, takeDurableReturn } from '@/lib/auth-guard'
import { readJokePending } from '@/pages/home/joke/jokeClient'
import { isWaiting, whatFromPath } from '@/components/signin/SignIn'
import { peekReturnPath } from '@/lib/auth-guard'

export interface WelcomeEnterStepProps {
  displayName: string
}

const PENDING_KEYS = ['shutap_pending_save', 'shutap_pending_comment', 'shutap_returnTo'] as const

/** Only same-origin paths are ever followed. */
function safePath(p: string | null | undefined): string | null {
  return p && p.startsWith('/') && !p.startsWith('//') ? p : null
}

export function WelcomeEnterStep({ displayName }: WelcomeEnterStepProps) {
  const [resuming, setResuming] = useState(false)
  const resumedRef = useRef(false)
  // read before enterRoom() takes the return notes away
  const [what] = useState(() => (typeof window === 'undefined' ? null : whatFromPath(peekReturnPath())))
  const first = (displayName || '').trim().split(/\s+/)[0] || ''

  const enterRoom = () => {
    const router = getRouterRef()
    const goPath = (to: string) => { if (router) router.navigate({ to }); else window.location.replace(to) }
    // Spill and Scan are retired: their old intents land on the write box.
    const goHash = (_hash: 'spill' | 'scan') => { if (router) router.navigate({ to: '/bits' }); else window.location.replace('/bits') }
    const goRoom = (roomId: string) => {
      if (router) router.navigate({ to: '/rooms/$id', params: { id: roomId } })
      else window.location.replace('/rooms/' + encodeURIComponent(roomId))
    }
    try {
      const intent = readIntent()
      if (intent) {
        clearIntent()
        if (intent.kind === 'spill') { goHash('spill'); return }
        if (intent.kind === 'scan') { goHash('scan'); return }
        if (intent.kind === 'subscribe') { goPath('/subscribe'); return }
        if (intent.kind === 'custom') {
          const url = intent.url
          if (url.startsWith('/') && !url.startsWith('//') && router) router.history.push(url)
          else window.location.replace(url)
          return
        }
        if ('roomId' in intent && intent.roomId) { goRoom(intent.roomId); return }
      }
      const pc = sessionStorage.getItem('shutap_pending_comment')
      if (pc) {
        const parsed = JSON.parse(pc) as { roomId?: string }
        if (parsed?.roomId) { goRoom(parsed.roomId); return }
      }
      if (sessionStorage.getItem('shutap_pending_save')) { goHash('spill'); return }
      const goUrl = (url: string) => {
        if (router) router.history.push(url)
        else window.location.replace(url)
      }
      // The joke deck they left. The note says where they were headed: the
      // landing page for the alias gate, the paywall for the mirror reading.
      // The landing page restores the deck on the card they had turned over
      // and claims it to the name they just picked. Not cleared here — the
      // landing page clears it after the claim.
      const note = readJokePending()
      if (note) { goUrl(safePath(note.returnTo) ?? '/'); return }
      const ret = safePath(sessionStorage.getItem('shutap_returnTo'))
      if (ret) {
        sessionStorage.removeItem('shutap_returnTo')
        goUrl(ret)
        return
      }
      // sessionStorage is per tab; a magic link opened elsewhere has none.
      const durable = takeDurableReturn()
      if (durable) { goUrl(durable); return }
    } catch { /* noop */ }
    goPath('/')
  }

  useEffect(() => {
    // Always go straight on: back to what they were doing, else home.
    if (resumedRef.current) return
    resumedRef.current = true
    setResuming(true)
    enterRoom()
  }, [])

  return (
    <div className="si-state">
      <div className="si-check" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#e7548a" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
      </div>
      <h1 className="si-h1" style={{ fontSize: 30 }} data-ph-private>{first && first !== 'friend' ? `You’re in, ${first}.` : 'You’re in.'}</h1>
      <p className="si-lead" role="status">{isWaiting(what) ?? (resuming ? 'Taking you back…' : 'Welcome to Shutap.')}</p>
      <p className="si-small">Everything you make is kept under profile › My creations.</p>
      <button type="button" className="si-link" onClick={enterRoom}>Go now →</button>
    </div>
  )
}

export default WelcomeEnterStep
