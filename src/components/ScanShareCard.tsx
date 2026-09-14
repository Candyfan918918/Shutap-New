/* Scan share card — 9:16 portrait modal opened from the Scan result screen
   and any persisted scan room. Makes ZERO model calls; renders entirely from
   the persisted scan situation record. All band word / colour / gauge /
   marker position are DERIVED from `score` at runtime — nothing is hardcoded
   per-card. Built to match the standalone preview reference: animated aura,
   conic spin, film grain, sheen sweep, blinking eye mascot, ring fill +
   count-up, animated spectrum marker. Honors prefers-reduced-motion (motion
   stops at the final state). */
import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { ShareChannels, ActionPill, type ShareChannelKey } from './ShareChannels'
import { ShutapWordmark } from './EyeMark'
import { CompanionEye } from './brand/CompanionEye'

export interface ScanRecord {
  score: number
  signature: string | null
  read?: string | null
  factors?: string[] | null
  pillar?: string | null
  url?: string
}

interface Band {
  key: 'settling' | 'sitting' | 'weighing' | 'heavy' | 'consuming'
  word: string
  color: string
}

function deriveBand(score: number): Band {
  if (score < 200) return { key: 'settling', word: 'settling', color: '#6f666c' }
  if (score < 400) return { key: 'sitting', word: 'sitting with it', color: '#7F77DD' }
  if (score < 600) return { key: 'weighing', word: 'weighing', color: '#c87c4a' }
  if (score < 800) return { key: 'heavy', word: 'heavy & loud', color: '#a52a5f' }
  return { key: 'consuming', word: 'consuming', color: '#c1216b' }
}

const SPECTRUM = 'linear-gradient(90deg,#6f666c,#7F77DD,#c87c4a,#a52a5f,#c1216b)'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function caption(rec: ScanRecord): string {
  const sig = (rec.signature || '').trim() || 'a situation'
  return `turns out my situation is a "${rec.score} · ${sig}" — take yours → shutap.com`
}

function copyToClipboard(text: string): Promise<void> {
  try {
    return navigator.clipboard.writeText(text)
  } catch {
    return Promise.resolve()
  }
}

const LOGOS: Record<string, string> = {
  sms: '<svg viewBox="0 0 24 24" fill="#fff" style="width:16px;height:16px"><path d="M12 2C6.5 2 2 5.8 2 10.5c0 2.5 1.3 4.7 3.3 6.2-.2 1.4-.9 2.8-1.9 3.9 1.7-.2 3.4-.8 4.8-1.7 1.2.3 2.5.5 3.8.5 5.5 0 10-3.8 10-8.5S17.5 2 12 2z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="#fff" style="width:14px;height:14px"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="#fff" style="width:16px;height:16px"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 01-1.38-.9 3.72 3.72 0 01-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.68A6.16 6.16 0 1018.16 12 6.16 6.16 0 0012 5.84zm0 10.16A4 4 0 1116 12a4 4 0 01-4 4zm6.4-10.4a1.44 1.44 0 11-1.44-1.44 1.44 1.44 0 011.44 1.44z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="#fff" style="width:15px;height:15px"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.04-.1z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="#fff" style="width:16px;height:16px"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448zM6.597 20.13c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
}

export function ScanShareCard({
  record,
  onClose,
  toast,
}: {
  record: ScanRecord
  onClose: () => void
  toast: (m: string) => void
}) {
  const band = useMemo(() => deriveBand(record.score), [record.score])
  const reduced = useMemo(prefersReducedMotion, [])
  const cardRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<SVGCircleElement>(null)
  const url =
    record.url || (typeof window !== 'undefined' ? window.location.origin + '/' : 'https://shutap.com/')

  // gauge geometry — matches preview (R=120, stroke=10, viewBox 280)
  const R = 120
  const STROKE = 10
  const CIRC = 2 * Math.PI * R
  const pct = Math.max(0, Math.min(100, Math.round((record.score / 999) * 100)))

  // count-up + ring fill — kicked off on each mount AND on "replay"
  const [shown, setShown] = useState(reduced ? record.score : 0)
  const [runId, setRunId] = useState(0)

  useEffect(() => {
    // ring fill
    const ring = ringRef.current
    if (ring) {
      const target = (CIRC * (1 - pct / 100)).toFixed(1)
      if (reduced) {
        ring.style.transition = 'none'
        ring.style.strokeDashoffset = target
      } else {
        ring.style.transition = 'none'
        ring.style.strokeDashoffset = CIRC.toFixed(1)
        // next frame -> animate
        requestAnimationFrame(() => {
          ring.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(.2,.9,.25,1)'
          ring.style.strokeDashoffset = target
        })
      }
    }
    if (reduced) {
      setShown(record.score)
      return
    }
    // count-up at ~30ms cadence
    setShown(0)
    let cur = 0
    const step = Math.max(1, Math.ceil(record.score / 52))
    const tk = window.setInterval(() => {
      cur = Math.min(cur + step, record.score)
      setShown(cur)
      if (cur >= record.score) window.clearInterval(tk)
    }, 30)
    return () => window.clearInterval(tk)
  }, [record.score, reduced, CIRC, pct, runId])

  const cap = caption(record)
  const enc = encodeURIComponent

  const onShare = async (kind: ShareChannelKey) => {
    if (kind === 'share') { await onNativeShare(); return }
    const text = cap
    if (kind === 'sms') {
      window.open('sms:?&body=' + enc(text), '_blank')
      return
    }
    if (kind === 'x') {
      window.open('https://twitter.com/intent/tweet?text=' + enc(text) + '&url=' + enc(url), '_blank')
      return
    }
    if (kind === 'whatsapp') {
      window.open('https://wa.me/?text=' + enc(text + '\n' + url), '_blank')
      return
    }
    if (kind === 'instagram') {
      await copyToClipboard(text + '\n' + url)
      toast('caption copied — paste it on your story/post')
      window.open('https://instagram.com', '_blank')
      return
    }
    if (kind === 'tiktok') {
      await copyToClipboard(text + '\n' + url)
      toast('caption copied — paste it on your story/post')
      window.open('https://tiktok.com', '_blank')
      return
    }
    if (kind === 'copy') {
      await copyToClipboard(text + '\n' + url)
      toast('copied to clipboard')
      return
    }
    if (kind === 'download') {
      const node = cardRef.current
      if (!node) return
      try {
        const png = await toPng(node, { pixelRatio: 2, cacheBust: true })
        const a = document.createElement('a')
        a.href = png
        a.download = `shutap-scan-${record.score}.png`
        a.click()
        toast('image saved')
      } catch {
        toast('could not export image')
      }
    }
  }

  const onNativeShare = async () => {
    const text = cap
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> }
    try {
      const node = cardRef.current
      if (node && nav.canShare && nav.share) {
        const png = await toPng(node, { pixelRatio: 2, cacheBust: true })
        const blob = await (await fetch(png)).blob()
        const file = new File([blob], `shutap-scan-${record.score}.png`, { type: 'image/png' })
        if (nav.canShare({ files: [file], text, url })) {
          await nav.share({ files: [file], text, url })
          return
        }
      }
      if (nav.share) { await nav.share({ text, url }); return }
    } catch { /* fall through */ }
    await copyToClipboard(text + '\n' + url)
    toast('copied — paste anywhere')
  }

  const col = band.color

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(10,5,14,.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      {/* shared SVG defs for eye mascot */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <radialGradient id="scEyeG" cx="40%" cy="18%" r="75%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="18%" stopColor="#ffd0e8" />
            <stop offset="48%" stopColor="#a52a5f" />
            <stop offset="78%" stopColor="#c1216b" />
            <stop offset="100%" stopColor="#890041" />
          </radialGradient>
          <radialGradient id="scPupG" cx="50%" cy="55%" r="58%">
            <stop offset="0%" stopColor="#100c14" />
            <stop offset="100%" stopColor="#100c14" />
          </radialGradient>
        </defs>
      </svg>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          width: '100%',
          maxWidth: 360,
        }}
      >
        {/* THE CARD — 9:16 */}
        <div
          ref={cardRef}
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '9 / 16',
            borderRadius: 26,
            overflow: 'hidden',
            background: 'radial-gradient(135% 78% at 50% 0%,#3a1022,#100c14 60%,#120710)',
            border: '.5px solid rgba(255,255,255,.16)',
            boxShadow: '0 36px 80px -26px rgba(0,0,0,.78)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '30px 26px',
            color: '#fdfbf9',
            fontFamily: 'Sora,sans-serif',
            animation: reduced ? undefined : 'scPop .34s ease',
          }}
        >
          {/* aura pulse */}
          <div
            style={{
              position: 'absolute',
              width: 340,
              height: 340,
              left: '50%',
              top: '33%',
              transform: 'translate(-50%,-50%)',
              background: `radial-gradient(circle, ${col}55, transparent 64%)`,
              filter: 'blur(6px)',
              animation: reduced ? undefined : 'scAura 6s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
          {/* conic spin */}
          <div
            style={{
              position: 'absolute',
              width: 430,
              height: 430,
              left: '50%',
              top: '35%',
              transform: 'translate(-50%,-50%)',
              background: `conic-gradient(from 0deg, ${col}00, ${col}3a, ${col}00 42%)`,
              animation: reduced ? undefined : 'scSpin 15s linear infinite',
              opacity: 0.45,
              pointerEvents: 'none',
            }}
          />
          {/* grain */}
          <div
            style={{
              position: 'absolute',
              inset: '-20%',
              opacity: 0.06,
              backgroundImage:
                'radial-gradient(rgba(255,255,255,.8) .5px, transparent .5px)',
              backgroundSize: '4px 4px',
              animation: reduced ? undefined : 'scGrain 8s steps(8) infinite',
              pointerEvents: 'none',
            }}
          />
          {/* sheen */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '55%',
              height: '100%',
              background:
                'linear-gradient(100deg, transparent, rgba(255,255,255,.10), transparent)',
              animation: reduced ? undefined : 'scSheen 4.8s ease-in-out 1s infinite',
              pointerEvents: 'none',
            }}
          />

          {/* HEADER */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CompanionEye size={22} />
              <ShutapWordmark size={15} ink="#fdfbf9" accent="#a52a5f" />
            </div>
            <span
              style={{
                fontFamily: 'Sora,sans-serif',
                fontWeight: 800,
                fontSize: 10,
                letterSpacing: '.34em',
                color: col,
              }}
            >
              SCAN
            </span>
          </div>

          {/* GAUGE */}
          <div
            style={{
              position: 'relative',
              display: 'grid',
              placeItems: 'center',
              margin: '2px 0',
            }}
          >
            <svg
              viewBox="0 0 280 280"
              style={{ width: '80%', maxWidth: 244, transform: 'rotate(-90deg)' }}
            >
              <circle
                cx="140"
                cy="140"
                r={R}
                fill="none"
                stroke="rgba(255,255,255,.08)"
                strokeWidth={STROKE}
              />
              <circle
                ref={ringRef}
                cx="140"
                cy="140"
                r={R}
                fill="none"
                stroke={col}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRC.toFixed(1)}
                strokeDashoffset={CIRC.toFixed(1)}
                style={{ filter: `drop-shadow(0 0 8px ${col}88)` }}
              />
            </svg>
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'Sora,sans-serif',
                  fontWeight: 800,
                  fontSize: 76,
                  lineHeight: 0.9,
                  letterSpacing: '-.04em',
                  color: col,
                }}
              >
                {shown}
              </div>
              <div
                style={{
                  fontFamily: 'Sora,sans-serif',
                  fontWeight: 700,
                  fontSize: 10,
                  letterSpacing: '.2em',
                  textTransform: 'uppercase',
                  color: col,
                  opacity: 0.85,
                  marginTop: 5,
                }}
              >
                {band.word}
              </div>
            </div>
          </div>

          {/* SIGNATURE */}
          <div style={{ textAlign: 'center', position: 'relative' }}>
            {record.signature && (
              <div
                style={{
                  fontFamily: 'Sora,sans-serif',
                  fontWeight: 800,
                  fontSize: 22,
                  color: '#fdfbf9',
                  lineHeight: 1.15,
                }}
              >
                {record.signature}
              </div>
            )}
            {record.pillar && (
              <div style={{ marginTop: 9 }}>
                <span
                  style={{
                    fontFamily: 'Sora,sans-serif',
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    color: col,
                    background: col + '22',
                    border: '.5px solid ' + col + '55',
                    borderRadius: 999,
                    padding: '4px 12px',
                  }}
                >
                  {record.pillar}
                </span>
              </div>
            )}
            {record.read && (
              <div
                style={{
                  marginTop: 11,
                  fontFamily: 'Newsreader,serif',
                  fontStyle: 'italic',
                  fontSize: 14.5,
                  color: '#d6b6c6',
                  lineHeight: 1.5,
                  maxWidth: '26ch',
                  marginLeft: 'auto',
                  marginRight: 'auto',
                }}
              >
                {record.read}
              </div>
            )}
          </div>

          {/* SPECTRUM */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                height: 5,
                borderRadius: 3,
                background: SPECTRUM,
                position: 'relative',
                marginBottom: 13,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: pct + '%',
                  transform: 'translate(-50%,-50%)',
                  width: 13,
                  height: 13,
                  borderRadius: '50%',
                  background: '#fff',
                  border: `2.5px solid ${col}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,.55)',
                  transition: reduced ? undefined : 'left 1.6s cubic-bezier(.2,.9,.25,1)',
                }}
              />
            </div>
            <div
              style={{
                textAlign: 'center',
                fontFamily: 'Newsreader,serif',
                fontStyle: 'italic',
                fontSize: 13,
                color: '#9b8090',
              }}
            >
              what's your number? · shutap.com
            </div>
          </div>
        </div>

        {/* SHARE CHANNELS — Gen-Z chip row, consistent with Mirror sheet */}
        <ShareChannels onPick={(k) => onShare(k)} channels={['sms', 'x', 'whatsapp', 'instagram', 'tiktok', 'copy']} />

        {/* ACTION PILLS — re-read / share / close, consistent with Mirror sheet */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
          <ActionPill onClick={() => setRunId((n) => n + 1)} ariaLabel="Re-read card">
            ↻ re-read
          </ActionPill>
          <ActionPill tone="primary" onClick={onNativeShare} ariaLabel="Share">
            ↗ share
          </ActionPill>
          <ActionPill onClick={onClose} ariaLabel="Close">
            close
          </ActionPill>
        </div>
      </div>

      <style>{`
        @keyframes scPop { from { transform: scale(.94); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes scSheen { 0% { transform: translateX(-130%) skewX(-16deg); } 55%,100% { transform: translateX(240%) skewX(-16deg); } }
        @keyframes scSpin { from { transform: translate(-50%,-50%) rotate(0deg); } to { transform: translate(-50%,-50%) rotate(360deg); } }
        @keyframes scGrain { 0% { transform: translate(0,0); } 25% { transform: translate(-3%,2%); } 50% { transform: translate(2%,-3%); } 75% { transform: translate(-2%,-1%); } 100% { transform: translate(0,0); } }
        @keyframes scAura { 0%,100% { opacity: .5; } 50% { opacity: .85; } }
        @keyframes scEyeBlink { 0%,90%,100% { transform: scaleY(1); } 94% { transform: scaleY(.12); } 97% { transform: scaleY(1); } }
        .sc-eye { transform-origin: center center; animation: scEyeBlink 4.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .sc-eye { animation: none; }
        }
      `}</style>
    </div>
  )
}
