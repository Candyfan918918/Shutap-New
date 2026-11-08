/* The realtor box on a guide or funniest page (Nov 6 2026; Nov 8 2026: the
 * same two-step box and words as the /realtors first screen). A link field,
 * so a page about listings sends an agent straight to their kit with the
 * link already in; /realtors reads it (sign-in there, as on /realtors). */
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { trackEvent } from '@/lib/tracking'
import '@/pages/realtors/realtors.css'

export function RealtorEmbed({ page }: { page: string }) {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const go = (text?: boolean) => {
    const v = url.trim()
    if (!text && !/^https?:\/\//i.test(v)) { setNote(v ? "that doesn't look like a web address · it starts with https://" : 'paste your listing link first · it starts with https://'); return }
    void trackEvent('seo_cta_clicked', { page, product: 'realtors', kind: text ? 'paste_text' : 'listing_link' })
    void navigate({ to: '/realtors', search: (text ? { text: '1' } : { url: v }) as never })
  }
  return (
    <div className="rl" id="bit-write" style={{ margin: '0 0 44px' }}>
      <div className="rl-box rl-box2">
        <div className="rl-box-body rl-steps">
          <p className="rl-step-t" style={{ font: '800 18px/1.3 var(--sora)', color: 'var(--wine)' }}>Paste a listing. Get a video script and every post to go with it.</p>
          <div className="rl-step">
            <span className="rl-num" aria-hidden>1</span>
            <div className="rl-step-b">
              <p className="rl-step-t">Copy your listing’s web address</p>
              <p className="rl-note">Zillow · Redfin · Realtor.com · MLS · brokerage site</p>
            </div>
          </div>
          <div className="rl-step">
            <span className="rl-num" aria-hidden>2</span>
            <div className="rl-step-b">
              <label htmlFor={`rl-embed-${page}`} className="rl-step-t">Paste it</label>
              <div className="rl-paste-row">
                <input id={`rl-embed-${page}`} className="rl-input rl-input-lg" placeholder="https://…" value={url} onChange={(e) => { setUrl(e.target.value); if (note) setNote('') }} onKeyDown={(e) => { if (e.key === 'Enter') go() }} inputMode="url" autoComplete="off" />
                <button type="button" className="rl-btn rl-btn-lg" onClick={() => go()}>Get my free kit →</button>
              </div>
              {note && <p className="rl-note" role="alert" style={{ color: 'var(--rose-ink)' }}>{note}</p>}
            </div>
          </div>
        </div>
        <div className="rl-box-foot rl-box2-foot">
          <span>First kit free · fair-housing checked · nothing made up</span>
          <button type="button" className="rl-linkbtn" onClick={() => go(true)}>No link? Paste the text</button>
        </div>
      </div>
    </div>
  )
}
