/* ShareSheet — pixel-parity port of shareBtnsHTML() + fireShare() from
   public/shutap/Landing.dc.html (lines ~1784-1810). Six-channel row
   (Text / X / Instagram / TikTok / WhatsApp / copy) with the exact
   iframe channel targets:
     Text     → sms:?&body=<caption> <url>
     X        → twitter.com/intent/tweet?text=<caption>&url=<url>
     WhatsApp → wa.me/?text=<caption> <url>
     Instagram → clipboard(caption+url), open instagram.com
     TikTok   → clipboard(caption+url), open tiktok.com/upload
     copy     → clipboard(caption+url)

   `<ShareChannels>` is the raw row for embedding (used by scan reveal
   siblings). `<ShareSheet>` is the full overlay modal shell wrapping a
   custom card (e.g. scan card, mirror card) + the channels row + close. */

import { useCallback } from 'react'

const NEWSREADER = "'Newsreader', Georgia, serif"

type Channel = 'Text' | 'X' | 'Instagram' | 'TikTok' | 'WhatsApp' | 'copy'

const I = '#e2e2e2' // calm cream-blush glyph, on-brand

const CHANNELS: Array<{ key: Channel; label: string; svg: React.ReactNode }> = [
  {
    key: 'Text',
    label: 'Text',
    svg: (
      <path d="M20 11.5a8 8 0 0 1-8 8 8 8 0 0 1-3.4-.7L4 20l1.2-4.5A8 8 0 0 1 4 11.5a8 8 0 0 1 8-8 8 8 0 0 1 8 8z" fill="none" stroke={I} strokeWidth={1.5} strokeLinejoin="round" />
    ),
  },
  { key: 'X', label: 'X', svg: <path d="M18.9 3H22l-7.6 8.7L23.3 21h-7l-5.5-7.2L4.4 21H1.3l8.2-9.4L.7 3h7.2l5 6.6z" fill={I} /> },
  {
    key: 'Instagram',
    label: 'Instagram',
    svg: (
      <>
        <rect x="4.5" y="4.5" width="15" height="15" rx="4.5" fill="none" stroke={I} strokeWidth={1.5} />
        <circle cx="12" cy="12" r="3.6" fill="none" stroke={I} strokeWidth={1.5} />
        <circle cx="16.8" cy="7.2" r="1.1" fill={I} />
      </>
    ),
  },
  {
    key: 'TikTok',
    label: 'TikTok',
    svg: <path d="M16 4c.3 2.2 1.6 3.7 3.7 3.9V11c-1.3.1-2.6-.3-3.7-1v5.4c0 3-2.2 5.1-5 5.1S6 18.3 6 15.5s2.4-5 5.4-4.7v3c-1.4-.4-2.5.3-2.5 1.7 0 1.1.8 1.9 1.9 1.9s2-.8 2-2.3V4z" fill={I} />,
  },
  {
    key: 'WhatsApp',
    label: 'WhatsApp',
    svg: (
      <>
        <path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.4-1.1A8.5 8.5 0 1 0 12 3.5z" fill="none" stroke={I} strokeWidth={1.5} />
        <path d="M9.2 8.4c.2 0 .4 0 .5.4l.6 1.4c.1.1 0 .3 0 .4-.4.7-.7.7-.5 1.1a5 5 0 0 0 2.5 2.2c.4.1.5-.3.8-.6.1-.2.3-.2.4-.1l1.3.6c.1.5.1.9-.1 1.2-.2.4-.9.8-1.2.8-.6.1-1.1.1-2.3-.4a8 8 0 0 1-3.3-2.9c-.2-.2-.8-1.1-.8-2s.4-1.3.6-1.5c.1-.2.3-.3.5-.3z" fill={I} />
      </>
    ),
  },
  {
    key: 'copy',
    label: 'copy',
    svg: (
      <>
        <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" fill="none" stroke={I} strokeWidth={1.6} strokeLinecap="round" />
        <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" fill="none" stroke={I} strokeWidth={1.6} strokeLinecap="round" />
      </>
    ),
  },
]

function fireShare(target: Channel, caption: string, url: string, toast?: (msg: string) => void) {
  const ec = encodeURIComponent(caption)
  const eu = encodeURIComponent(url)
  const copyThen = (msg: string, then?: () => void) => {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(caption + ' ' + url)
        .then(() => { toast?.(msg); then?.() })
        .catch(() => { then?.() })
    } else {
      toast?.(msg); then?.()
    }
  }
  switch (target) {
    case 'Text': window.open('sms:?&body=' + ec + '%20' + eu, '_blank'); break
    case 'X': window.open('https://twitter.com/intent/tweet?text=' + ec + '&url=' + eu, '_blank', 'noopener'); break
    case 'WhatsApp': window.open('https://wa.me/?text=' + ec + '%20' + eu, '_blank', 'noopener'); break
    case 'Instagram': copyThen('caption copied — opening Instagram, paste it on your story.', () => window.open('https://www.instagram.com/', '_blank', 'noopener')); break
    case 'TikTok': copyThen('caption copied — opening TikTok, paste it in your post.', () => window.open('https://www.tiktok.com/upload', '_blank', 'noopener')); break
    case 'copy':
    default: copyThen('caption + link copied.'); break
  }
}

export function ShareChannels({ caption, url, onToast }: { caption: string; url: string; onToast?: (msg: string) => void }) {
  const fire = useCallback((t: Channel) => fireShare(t, caption, url, onToast), [caption, url, onToast])
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
      {CHANNELS.map((c) => (
        <div
          key={c.key}
          role="button"
          onClick={() => fire(c.key)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        >
          <span
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'rgba(255,255,255,.05)',
              border: '.5px solid rgba(246,245,244,.13)',
              display: 'grid',
              placeItems: 'center',
              transition: '.16s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(23,19,26,.16)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(23,19,26,.4)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(246,245,244,.13)' }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 23, height: 23 }}>{c.svg}</svg>
          </span>
          <span style={{ fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 11.5, color: '#645b61' }}>{c.label}</span>
        </div>
      ))}
    </div>
  )
}

export function ShareSheet({
  open,
  onClose,
  caption,
  url,
  children,
  onToast,
}: {
  open: boolean
  onClose: () => void
  caption: string
  url: string
  children?: React.ReactNode
  onToast?: (msg: string) => void
}) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 95, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(10,5,14,.65)', backdropFilter: 'blur(8px)' }} />
      <div
        role="dialog"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 460,
          margin: 16,
          padding: 22,
          background: 'linear-gradient(160deg,#100c14,#100c14)',
          border: '.5px solid rgba(255,255,255,.14)',
          borderRadius: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {children}
        <ShareChannels caption={caption} url={url} onToast={onToast} />
        <div
          role="button"
          onClick={onClose}
          style={{ textAlign: 'center', fontFamily: NEWSREADER, fontStyle: 'italic', fontSize: 13, color: '#6f666c', cursor: 'pointer' }}
        >
          close
        </div>
      </div>
    </div>
  )
}
