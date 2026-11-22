/* The small-business box on a guide or funniest page (Nov 21 2026, Candy):
 * the owner types their business name and city, and /smallbusiness opens
 * with both already in (it reads ?name= and ?city=). Shown only while
 * /smallbusiness is open to this visitor (flag on, or an admin); until then
 * the page keeps the box it had, so nobody lands on a page they cannot open. */
import { useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { trackEvent } from '@/lib/tracking'
import { useSmallBusinessOpen } from '@/hooks/use-smallbusiness-open'
import '@/pages/realtors/realtors.css'

export function SmallBusinessEmbed({ page, fallback }: { page: string; fallback: ReactNode }) {
  const open = useSmallBusinessOpen()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [note, setNote] = useState('')
  if (!open) return <>{fallback}</>
  const go = () => {
    const n = name.trim()
    const c = city.trim()
    if (n.length < 2) { setNote('type your business name first'); return }
    if (!c) { setNote('and the city it’s in'); return }
    void trackEvent('seo_cta_clicked', { page, product: 'smallbusiness', kind: 'business_form' })
    void navigate({ to: '/smallbusiness', search: { name: n.slice(0, 120), city: c.slice(0, 80) } as never })
  }
  return (
    <div className="rl" id="bit-write" style={{ margin: '0 0 44px' }}>
      <div className="rl-box rl-box2">
        <div className="rl-box-body rl-steps">
          <p className="rl-step-t" style={{ font: '800 18px/1.3 var(--sora)', color: 'var(--wine)' }}>The creative team your small business doesn’t have.</p>
          <p className="rl-note" style={{ margin: '-4px 0 4px' }}>Three funny skits about your own business, then Shutap tells you what to film, shot by shot, on your phone.</p>
          <div className="rl-step">
            <span className="rl-num" aria-hidden>1</span>
            <div className="rl-step-b">
              <label htmlFor={`sbe-name-${page}`} className="rl-step-t">Your business name</label>
              <div className="rl-paste-row"><input id={`sbe-name-${page}`} className="rl-input rl-input-lg sbe-input" placeholder="e.g. Maple Street Bakery" value={name} maxLength={120} autoComplete="organization" onChange={(e) => { setName(e.target.value); if (note) setNote('') }} onKeyDown={(e) => { if (e.key === 'Enter') go() }} /></div>
            </div>
          </div>
          <div className="rl-step">
            <span className="rl-num" aria-hidden>2</span>
            <div className="rl-step-b">
              <label htmlFor={`sbe-city-${page}`} className="rl-step-t">City</label>
              <div className="rl-paste-row">
                <input id={`sbe-city-${page}`} className="rl-input rl-input-lg" placeholder="e.g. Palo Alto" value={city} maxLength={80} autoComplete="address-level2" onChange={(e) => { setCity(e.target.value); if (note) setNote('') }} onKeyDown={(e) => { if (e.key === 'Enter') go() }} />
                <button type="button" className="rl-btn rl-btn-lg" onClick={go}>Make my first video →</button>
              </div>
              {note && <p className="rl-note" role="alert" style={{ color: 'var(--rose-ink)' }}>{note}</p>}
            </div>
          </div>
        </div>
        <div className="rl-box-foot rl-box2-foot">
          <span>First 3 videos free · made on your phone</span>
        </div>
      </div>
    </div>
  )
}
