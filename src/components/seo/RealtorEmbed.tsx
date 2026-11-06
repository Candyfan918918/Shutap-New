/* The realtor box on a guide or funniest page (Nov 6 2026): the same thing
 * the kit page starts with, a link field, so a page about listings sends
 * an agent straight to their kit with the link already in. */
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { trackEvent } from '@/lib/tracking'
import '@/pages/realtors/realtors.css'

export function RealtorEmbed({ page }: { page: string }) {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const ok = /^https?:\/\//i.test(url.trim())
  const go = (text?: boolean) => {
    void trackEvent('seo_cta_clicked', { page, product: 'realtors', kind: text ? 'paste_text' : 'listing_link' })
    void navigate({ to: '/realtors', search: (ok && !text ? { url: url.trim() } : text ? { text: '1' } : {}) as never })
  }
  return (
    <div className="rl" id="bit-write" style={{ margin: '0 0 44px' }}>
      <div className="rl-box">
        <div className="rl-box-head"><span>● paste the listing link</span><span style={{ fontWeight: 500, color: 'var(--muted)' }}>shutap for realtors · first kit free</span></div>
        <div className="rl-box-body">
          <p className="rl-note" style={{ fontSize: 14, color: 'var(--ink-2)' }}>Open the listing in your browser, copy the web address from the address bar (it starts with <b>https://</b>) and paste it here. You get the walkthrough to shoot, the voiceover, the hooks, the open-house kit, the posts and the straight copy, in your tone.</p>
          <div className="rl-row">
            <input className="rl-input" style={{ flex: '1 1 300px' }} placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && ok) go() }} inputMode="url" autoComplete="off" />
            <button className="rl-btn" disabled={!ok} onClick={() => go()}>read the listing →</button>
          </div>
          <p className="rl-note">No link? <button type="button" className="rl-mini" onClick={() => go(true)}>paste the listing text instead</button> · fair-housing check on every line · nothing made up</p>
        </div>
      </div>
    </div>
  )
}
