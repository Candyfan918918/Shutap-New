/* Room share sheet — mirrors MirrorShareSheet / ScanShareCard layout for the
   manual "↗ share" button on a regular (non-scan) room. Editable caption +
   ShareChannels chip row (Messages, X, WhatsApp, Instagram, TikTok, copy,
   native share). Only the headline + link ever leave the sheet. */
import { useEffect, useState } from 'react'
import { ShareChannels, type ShareChannelKey } from './ShareChannels'

function copyToClipboard(text: string): Promise<void> {
  try { return navigator.clipboard.writeText(text) } catch { return Promise.resolve() }
}

export function RoomShareSheet({
  open, onClose, room, url,
}: {
  open: boolean
  onClose: () => void
  room: { id?: string; emoji?: string | null; title: string }
  url: string
}) {
  const defaultCaption = `“${room.title}” — a room on Shutap. someone in here has lived your exact thing →`
  const [caption, setCaption] = useState(defaultCaption)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [shared, setShared] = useState(false)

  useEffect(() => { if (open) { setCaption(defaultCaption); setShared(false) } }, [open, defaultCaption])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const toast = (m: string) => {
    setToastMsg(m)
    window.setTimeout(() => setToastMsg(null), 2200)
  }

  const enc = encodeURIComponent

  const markShared = () => setShared(true)

  const onNativeShare = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    try {
      if (nav.share) { await nav.share({ text: caption, url }); markShared(); return }
    } catch { /* user cancelled or unavailable */ return }
    await copyToClipboard(caption + '\n' + url)
    toast('copied — paste anywhere')
    markShared()
  }

  const onPick = async (kind: ShareChannelKey) => {
    if (kind === 'share') { await onNativeShare(); return }
    const text = caption
    if (kind === 'sms') { window.open('sms:?&body=' + enc(text + '\n' + url), '_blank'); markShared(); return }
    if (kind === 'x') { window.open('https://twitter.com/intent/tweet?text=' + enc(text) + '&url=' + enc(url), '_blank'); markShared(); return }
    if (kind === 'whatsapp') { window.open('https://wa.me/?text=' + enc(text + '\n' + url), '_blank'); markShared(); return }
    if (kind === 'instagram') {
      await copyToClipboard(text + '\n' + url)
      toast('caption copied — paste it on your story')
      window.open('https://instagram.com', '_blank')
      markShared()
      return
    }
    if (kind === 'tiktok') {
      await copyToClipboard(text + '\n' + url)
      toast('caption copied — paste it on your story')
      window.open('https://tiktok.com', '_blank')
      markShared()
      return
    }
    if (kind === 'copy') {
      await copyToClipboard(text + '\n' + url)
      toast('link copied')
      markShared()
      return
    }
  }

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 220,
        background: 'rgba(8,4,10,.82)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: 0, animation: 'rss-fade .2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onWheelCapture={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 460,
          maxHeight: '94dvh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          background: 'linear-gradient(180deg,#100c14 0%, #100c14 100%)',
          border: '.5px solid rgba(255,255,255,.12)',
          borderRadius: '22px 22px 0 0',
          padding: '14px 16px calc(18px + env(safe-area-inset-bottom,0px))',
          boxShadow: '0 -20px 60px rgba(0,0,0,.6)',
          display: 'flex', flexDirection: 'column', gap: 14,
          animation: 'rss-rise .26s cubic-bezier(.2,.9,.25,1)',
        }}
      >
        {/* drag handle */}
        <div aria-hidden style={{
          width: 38, height: 4, borderRadius: 4,
          background: 'rgba(255,255,255,.22)',
          alignSelf: 'center', marginBottom: 2,
        }} />

        {/* Preamble */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          fontFamily: "'Newsreader',serif", fontStyle: 'italic',
          fontSize: 13, lineHeight: 1.45, color: '#a6a6a6',
          padding: '0 4px',
        }}>
          <span aria-hidden style={{ color: '#2b2630', fontSize: 11, letterSpacing: '-.1em', flex: '0 0 auto', lineHeight: 1.6 }}>✦✦</span>
          <span>sharing this room — de-identified. only the headline and a link travel, never the full story.</span>
        </div>

        {/* Room headline card */}
        <div style={{
          position: 'relative',
          borderRadius: 18,
          padding: '22px 20px',
          background: 'radial-gradient(120% 90% at 50% 0%, #121014, #100c14)',
          border: '.5px solid rgba(255,255,255,.12)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'linear-gradient(135deg,#2b2630,#2b2630)',
            display: 'grid', placeItems: 'center', fontSize: 24, flex: 'none',
          }}>{room.emoji || '🩷'}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 10.5,
              letterSpacing: '.22em', textTransform: 'uppercase', color: '#2b2630',
              marginBottom: 4,
            }}>a room on shutap</div>
            <div style={{
              fontFamily: "'Newsreader',Newsreader,serif", fontStyle: 'italic',
              fontSize: 20, lineHeight: 1.25, color: '#fdfbf9',
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>{room.title}</div>
          </div>
        </div>

        {/* Caption */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{
            fontFamily: 'Sora,sans-serif', fontSize: 9.5, fontWeight: 700,
            letterSpacing: '.28em', color: '#727272', textTransform: 'uppercase',
          }}>your caption · edit freely</div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            spellCheck={false}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,.04)',
              border: '.5px solid rgba(255,255,255,.12)',
              borderRadius: 14,
              padding: '11px 13px',
              color: '#fdfbf9',
              fontFamily: 'Newsreader,serif',
              fontStyle: 'italic',
              fontSize: 14.5,
              lineHeight: 1.45,
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Channels */}
        <ShareChannels
          onPick={onPick}
          channels={typeof navigator !== 'undefined' && (navigator as Navigator & { share?: unknown }).share
            ? ['share', 'sms', 'x', 'whatsapp', 'instagram', 'tiktok', 'copy']
            : ['sms', 'x', 'whatsapp', 'instagram', 'tiktok', 'copy']}
        />

        {shared && (
          <div style={{
            textAlign: 'center', fontFamily: "'Newsreader',serif", fontStyle: 'italic',
            fontSize: 13.5, color: '#7fd4a8',
          }}>passed on. someone out there will feel less alone. ♥</div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, marginTop: 2,
        }}>
          <span style={{
            fontFamily: "'Newsreader',serif", fontStyle: 'italic',
            fontSize: 12, color: '#888888',
          }}>only the headline + link leave — never the full story.</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: "'Newsreader',serif", fontStyle: 'italic',
              fontSize: 13.5, color: '#6f666c', flex: 'none', padding: 4,
            }}
          >close</button>
        </div>

        {toastMsg && (
          <div style={{
            position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)',
            background: 'rgba(15,15,15,.96)', color: '#fdfbf9',
            padding: '10px 16px', borderRadius: 999,
            border: '.5px solid rgba(255,255,255,.16)',
            fontFamily: 'Sora,sans-serif', fontSize: 12, zIndex: 240,
          }}>{toastMsg}</div>
        )}
      </div>

      <style>{`
        @keyframes rss-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes rss-rise { from { transform: translateY(20px); opacity: 0 } to { transform: none; opacity: 1 } }
      `}</style>
    </div>
  )
}
