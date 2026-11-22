// Shutap for small business on a computer (Nov 21 2026, build brief Part 1):
// nothing is made or filmed on a computer, so a desktop visitor gets one
// screen that sends them to their phone: a code to scan, or the address to
// type. Admins can carry on here to test.
import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { trackEvent } from '@/lib/tracking'
import { RisingIcons } from './RisingIcons'

const PHONE_URL = 'https://shutap.com/smallbusiness?utm_source=desktop&utm_medium=qr'

export function DeskGate({ admin, onContinue, name = '', city = '' }: { admin: boolean; onContinue: () => void; name?: string; city?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    // carry the business name and city typed on a guide page over to the phone
    let url = PHONE_URL
    if (name) url += `&name=${encodeURIComponent(name)}`
    if (city) url += `&city=${encodeURIComponent(city)}`
    if (ref.current) QRCode.toCanvas(ref.current, url, { width: 196, margin: 1, color: { dark: '#1d1a22', light: '#ffffff' } }).catch(() => {})
  }, [name, city])
  useEffect(() => { void trackEvent('sb_desk_view', { product: 'smallbusiness' }) }, [])
  return (
    <div className="sb sb-desk" data-ph-private>
      <div className="sb-desk-in">
        <div className="sb-desk-txt">
          <p className="sb-eyebrow">SHUTAP FOR SMALL BUSINESS</p>
          <h1 className="sb-h1">Made on <b>your phone.</b></h1>
          <p className="sb-sub">You film your video with your phone’s camera, so Shutap for small business works on your phone, not on a computer.</p>
          <ol className="sb-desk-steps">
            <li><b>1</b>Open the camera on your phone</li>
            <li><b>2</b>Point it at the code</li>
            <li><b>3</b>Tap the link. Your first 3 videos are free.</li>
          </ol>
          <p className="sb-note" style={{ textAlign: 'left' }}>Or type <b>shutap.com/smallbusiness</b> on your phone.</p>
          {admin && <button type="button" className="sb-quiet" style={{ justifyContent: 'flex-start', padding: 0 }} onClick={() => { void trackEvent('sb_desk_continue', { product: 'smallbusiness' }); onContinue() }}>Admin: continue on this computer</button>}
        </div>
        <div className="sb-desk-card">
          <div className="sb-desk-icons"><RisingIcons variant="hero" /></div>
          <canvas ref={ref} width={196} height={196} aria-label="Code to open shutap.com/smallbusiness on your phone" />
          <p className="sb-small" style={{ textAlign: 'center' }}>Scan with your phone</p>
        </div>
      </div>
    </div>
  )
}

/** A computer: a fine pointer that can hover, and a wide screen. */
export function isDesk(): boolean {
  if (typeof window === 'undefined') return false
  return !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches && window.innerWidth >= 900
}
