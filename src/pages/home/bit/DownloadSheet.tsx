/* Download: the bit as a 9:16 picture, the hook alone, or the script as a
 * PDF. The picture is drawn on the server, which decides the mark from the
 * tier: guest and free files carry the heavy Shutap watermark, Basic and Pro
 * files are clean. Everyone's file carries the whole bit. On a phone the file goes to the share sheet (save to Photos,
 * straight into TikTok); elsewhere it downloads. */
import { useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { exportBit } from '@/lib/bits.functions'
import { isPaidTier, type BitTier, type BitVersion } from '@/lib/bits/shared'
import { PLANS, usd } from '@/lib/pricing'
import { anonSessionId, canShareFiles, isShareAbort, jokeTrack, saveBlob, svgToPng } from '../joke/jokeClient'
import { scriptPdf } from './screenplay-pdf'
import { CaptionBox } from './CaptionBox'

type Format = 'bit' | 'hook' | 'pdf'
const FORMATS: { key: Format; label: string }[] = [
  { key: 'bit', label: '9:16 image' },
  { key: 'hook', label: 'hook only' },
  { key: 'pdf', label: 'script PDF' },
]

type Ready = { blob: Blob; name: string; url: string; watermarked: boolean }

export function DownloadSheet({
  bitId,
  version,
  tier,
  onClose,
  onUpgrade,
  say,
}: {
  bitId: string
  version: BitVersion
  tier: BitTier
  onClose: () => void
  /** opens the plans (Basic and Pro) in place of this sheet */
  onUpgrade: () => void
  say: (m: string) => void
}) {
  const exportFn = useServerFn(exportBit)
  const exportRef = useRef(exportFn)
  exportRef.current = exportFn
  const [format, setFormat] = useState<Format>('bit')
  const [ready, setReady] = useState<Ready | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState(false)
  const formats = FORMATS
  const paid = isPaidTier(tier)

  useEffect(() => {
    let live = true
    let url = ''
    setBusy(true)
    setError(false)
    setReady(null)
    ;(async () => {
      try {
        if (format === 'pdf') {
          const blob = scriptPdf(version, !paid)
          url = URL.createObjectURL(blob)
          const slug = version.hook.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'bit'
          if (live) setReady({ blob, name: `${slug}-script.pdf`, url, watermarked: !paid })
          return
        }
        const r = await exportRef.current({ data: { bit_id: bitId, version_id: version.id, format, anon_session_id: anonSessionId() } })
        if (!r.ok) throw new Error(r.reason)
        const blob = await svgToPng(r.svg, 1080, 1920)
        url = URL.createObjectURL(blob)
        if (live) setReady({ blob, name: r.filename, url, watermarked: r.watermarked })
      } catch {
        if (live) setError(true)
      } finally {
        if (live) setBusy(false)
      }
    })()
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [format, bitId, version, paid])

  async function save() {
    if (!ready) return
    jokeTrack('download', tier, { format, watermarked: ready.watermarked })
    const file = new File([ready.blob], ready.name, { type: ready.blob.type })
    if (canShareFiles([file])) {
      try {
        await navigator.share({ files: [file] })
        return
      } catch (e) {
        if (isShareAbort(e)) return
      }
    }
    saveBlob(ready.blob, ready.name)
    say(ready.watermarked ? 'Saved, with the Shutap watermark.' : 'Saved. No watermark.')
  }

  const note =
    paid ? `${tier === 'pro' ? 'Pro' : 'Basic'} · clean, no watermark` : tier === 'guest' ? 'guest download · Shutap watermark' : 'free download · Shutap watermark'

  return (
    <div
      className="bt-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bt-sheet" role="dialog" aria-modal="true" aria-labelledby="dl-title" style={{ maxHeight: '92vh', overflow: 'auto' }}>
        <div className="bt-between">
          <h3 id="dl-title">Download</h3>
          <button className="bt-btn ghost sm" onClick={onClose}>
            close
          </button>
        </div>
        <div className="bt-dl-prev" aria-live="polite">
          {busy && <span className="bt-note">drawing it…</span>}
          {error && <span className="bt-note" style={{ color: 'var(--rose-ink)' }}>Couldn't draw that one. Try again.</span>}
          {ready && format !== 'pdf' && <img src={ready.url} alt={`Preview: ${version.hook}`} />}
          {ready && format === 'pdf' && (
            <div className="bt-dl-pdf">
              <b>script PDF</b>
              <span>hook, setup, tags and button on one page, in Courier</span>
            </div>
          )}
        </div>
        <p className="bt-note" style={{ textAlign: 'center' }}>
          {note}
        </p>
        <div className="bt-chips" style={{ justifyContent: 'center' }} role="group" aria-label="Format">
          {formats.map((f) => (
            <button key={f.key} className="bt-chip" aria-pressed={format === f.key} onClick={() => setFormat(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <button className="bt-btn block" disabled={!ready} onClick={() => void save()}>
          save
        </button>
        <CaptionBox bitId={bitId} versionId={version.id} tier={tier} say={say} />
        {!paid && (
          <button
            className="bt-btn ghost block"
            onClick={() => {
              jokeTrack('upgrade_shown', tier, { after: 'download' })
              onUpgrade()
            }}
          >
            remove the watermark · from {usd(PLANS.basic.amount)}/mo
          </button>
        )}
      </div>
    </div>
  )
}
