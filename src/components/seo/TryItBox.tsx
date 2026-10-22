/* The writer at the bottom of an article or funniest page. A reader types
 * their own story here and lands on the homepage with the bit already being
 * written, instead of reading a link and starting over in an empty box.
 * The box starts empty; the placeholder carries the priming. */
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

const DRAFT_KEY = 'shutap_bit_draft'
const AUTOSTART_KEY = 'shutap_bit_autostart'

export function TryItBox({
  page,
  heading = 'Try it on your own story',
  position = 'bottom',
}: {
  page: string
  heading?: string
  /** 'top' sits right under the page's opening answer (Oct 22 2026: Google
   *  visitors write more than anyone, so the box goes where they land). */
  position?: 'top' | 'bottom'
}) {
  const navigate = useNavigate()
  const [story, setStory] = useState('')
  const text = story.trim()

  const go = () => {
    if (!text) return
    try {
      sessionStorage.setItem(DRAFT_KEY, text)
      sessionStorage.setItem(AUTOSTART_KEY, '1')
    } catch { /* noop */ }
    void import('@/lib/tracking')
      .then((m) => m.trackEvent('seo_cta_clicked', { page, position, chars: text.length }))
      .catch(() => {})
    // The story rides on the navigation (history state) so it arrives even
    // where page storage is blocked; storage above is only a backup.
    void navigate({ to: '/', state: { shutapStory: text, shutapAutostart: true } as never })
  }

  return (
    <section
      aria-label="Write a bit"
      style={{
        margin: position === 'top' ? '0 0 44px' : '8px 0 36px',
        padding: 20,
        borderRadius: 18,
        background: '#ffffff',
        border: '1px solid rgba(11,8,15,.10)',
        display: 'grid',
        gap: 12,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#17131a' }}>{heading}</h2>
      <textarea
        value={story}
        onChange={(e) => setStory(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) go()
        }}
        rows={position === 'top' ? 3 : 4}
        maxLength={4000}
        placeholder="what happened? the meeting, the date, the group chat… tell it like you'd tell a friend"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          resize: 'vertical',
          padding: 14,
          borderRadius: 12,
          border: '1px solid rgba(11,8,15,.18)',
          font: 'inherit',
          fontSize: 16,
          color: '#17131a',
          background: '#fff',
        }}
      />
      <button
        type="button"
        onClick={go}
        disabled={!text}
        style={{
          justifySelf: 'start',
          background: '#b8456b',
          color: '#ffffff',
          border: 0,
          fontWeight: 600,
          fontSize: 17,
          padding: '12px 24px',
          borderRadius: 999,
          cursor: text ? 'pointer' : 'default',
          opacity: text ? 1 : 0.5,
        }}
      >
        write the bit →
      </button>
    </section>
  )
}
