/* Companion micro-prompt. Warm, lowercase, Newsreader italic.
   Hard limits: 1 per session, 2 per day. Caller decides when to fire. */
import { useEffect, useState } from 'react'
import { track } from '../lib/feedback'

const today = () => new Date().toISOString().slice(0, 10)

function canPrompt(): boolean {
  try {
    if (sessionStorage.getItem('shutap_rate_session') === '1') return false
    const raw = localStorage.getItem('shutap_rate_day')
    const parsed = raw ? JSON.parse(raw) as { d: string; n: number } : null
    if (parsed && parsed.d === today() && parsed.n >= 2) return false
    return true
  } catch { return true }
}

function markUsed() {
  try {
    sessionStorage.setItem('shutap_rate_session', '1')
    const raw = localStorage.getItem('shutap_rate_day')
    const parsed = raw ? JSON.parse(raw) as { d: string; n: number } : null
    const next = parsed && parsed.d === today() ? { d: today(), n: parsed.n + 1 } : { d: today(), n: 1 }
    localStorage.setItem('shutap_rate_day', JSON.stringify(next))
  } catch { /* noop */ }
}

export function CompanionRatePrompt({
  prompt,
  target,
  onClose,
}: {
  prompt: string
  target: string
  onClose?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [rated, setRated] = useState<null | 'love' | 'friction'>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (canPrompt()) {
      markUsed()
      const id = setTimeout(() => setOpen(true), 350)
      return () => clearTimeout(id)
    } else {
      onClose?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = () => { setOpen(false); onClose?.() }

  const choose = (v: 'love' | 'friction') => {
    setRated(v)
    track(v === 'love' ? 'rate_loved' : 'rate_friction', { target })
  }

  const send = () => {
    if (rated && note.trim()) {
      track(rated === 'love' ? 'rate_loved' : 'rate_friction', { target, note: note.trim() })
    }
    close()
  }

  if (!open) return null
  return (
    <div role="dialog" aria-label="companion check-in" style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 9999,
      display: 'flex', justifyContent: 'center', padding: '0 12px 16px',
      pointerEvents: 'none',
    }}>
      <div style={{
        pointerEvents: 'auto',
        background: '#fff8fb', border: '1px solid rgba(23,19,26,.18)',
        boxShadow: '0 12px 32px rgba(20,16,22,.18)', borderRadius: 18,
        padding: '14px 16px', maxWidth: 380, width: '100%',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        animation: 'shutapSlide .28s ease-out',
      }}>
        <style>{`@keyframes shutapSlide{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div aria-hidden style={{ fontSize: 22, lineHeight: 1 }}>👁️‍🗨️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: '"Newsreader", Georgia, serif', fontStyle: 'italic', color: '#121014', fontSize: 16, lineHeight: 1.35 }}>
              {prompt}
            </div>
            {!rated ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => choose('love')} style={btn('#17131a', '#fff')}>🤍 this helped</button>
                <button onClick={() => choose('friction')} style={btn('#fff', '#17131a', true)}>🥀 not for me</button>
                <button onClick={close} aria-label="dismiss" style={{ ...btn('transparent', '#7a7a7a'), marginLeft: 'auto', padding: '6px 8px' }}>✕</button>
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="optional — one line, if you want"
                  maxLength={200}
                  style={{
                    width: '100%', border: '1px solid rgba(23,19,26,.18)',
                    borderRadius: 10, padding: '8px 10px', fontSize: 13, background: '#fff',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                  <button onClick={close} style={btn('transparent', '#7a7a7a')}>skip</button>
                  <button onClick={send} style={btn('#17131a', '#fff')}>send</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function btn(bg: string, color: string, outlined = false): React.CSSProperties {
  return {
    background: bg,
    color,
    border: outlined ? '1px solid #17131a' : 'none',
    borderRadius: 999,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  }
}
