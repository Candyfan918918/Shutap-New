import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { pageMeta } from '@/lib/seo/page-meta'
import { joinWaitlist } from '@/lib/waitlist.functions'
import { trackEvent } from '@/lib/tracking'
import { Footer } from '@/components/feed/Footer'
import '@/components/feed/feed.css'
import '@/pages/realtors/realtors.css'

// Shutap Toasts (Nov 6 2026): the product is next; this page is the list.
const TITLE = 'Shutap Toasts — your wedding speech, best man or maid of honor toast, funnier. Coming soon'
const DESC = 'Shutap Toasts: your stories about them, said funnier, with a teleprompter and a running clock. Best man, maid of honor, parent of the bride or groom, retirement, birthday. Join the list to hear the day it opens.'

export const Route = createFileRoute('/toasts')({
  head: () => ({ meta: pageMeta(TITLE, DESC, '/toasts') }),
  component: Toasts,
})

const OCCASIONS = [['best_man', 'best man'], ['maid_of_honor', 'maid of honor'], ['parent', 'parent of the bride or groom'], ['retirement', 'retirement'], ['birthday', 'birthday'], ['toastmasters', 'Toastmasters'], ['other', 'something else']] as const

function Toasts() {
  const [email, setEmail] = useState('')
  const [occasion, setOccasion] = useState<(typeof OCCASIONS)[number][0] | ''>('')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'already' | 'failed'>('idle')
  async function join() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setState('failed')
    setState('busy')
    try {
      const r = await joinWaitlist({ data: { product: 'toasts', email, occasion: occasion || undefined } })
      setState(r.ok ? (r.already ? 'already' : 'done') : 'failed')
      if (r.ok) void trackEvent('waitlist_joined', { product: 'toasts', occasion: occasion || null })
    } catch { setState('failed') }
  }
  return (
    <div className="fd rl">
      <div className="rl-col" style={{ gap: 24 }}>
        <div>
          <p className="rl-kicker">shutap toasts · soon</p>
          <h1 className="rl-h1">Your toast, <em>funnier.</em></h1>
          <p className="rl-lead">The stories only you can tell about them, said funnier, in your words. A teleprompter for the night and a clock that keeps you under three minutes. Best man, maid of honor, parents, retirements, birthdays.</p>
        </div>
        <div className="rl-box">
          <div className="rl-box-head"><span>● join the list</span><span style={{ fontWeight: 500, color: 'var(--muted)' }}>you hear the day it opens · nothing else</span></div>
          <div className="rl-box-body">
            {state === 'done' || state === 'already' ? (
              <p className="rl-note" style={{ fontSize: 15, color: 'var(--ink)' }}>{state === 'already' ? 'You are already on the list.' : 'You are on the list.'} Until then, the box on the homepage writes a toast from what happened: pick the <b>live</b> audience.</p>
            ) : (
              <>
                <div className="rl-row">
                  <input className="rl-input" style={{ flex: '1 1 260px' }} type="email" placeholder="your email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void join() }} />
                  <button className="rl-btn" disabled={state === 'busy'} onClick={() => void join()}>{state === 'busy' ? 'joining…' : 'join the list'}</button>
                </div>
                <div className="rl-row">{OCCASIONS.map(([k, l]) => <button key={k} type="button" className="rl-chip soft" aria-pressed={occasion === k} onClick={() => setOccasion(occasion === k ? '' : k)}>{l}</button>)}</div>
                {state === 'failed' && <p className="rl-note" role="alert" style={{ color: 'var(--rose-ink)' }}>that did not go through · check the email and try again</p>}
              </>
            )}
          </div>
        </div>
        <div className="rl-grid">
          {[['Your stories, not a template', 'You type the three stories everyone knows and the one only you know. Shutap writes the toast around them, in your words, and only touches the lines you point at.'], ['The teleprompter', 'Big text on your phone, one line at a time, scrolls at your pace. A clock that turns red at two minutes thirty.'], ['Yours to keep', 'Edit it until it sounds like you, then lock it. The speech, cue cards and prompter download as often as you like, forever, from My creations. Basic includes 1 toast a month; Pro, unlimited.']].map(([h, p]) => <div key={h} className="rl-tile"><h3>{h}</h3><p>{p}</p></div>)}
        </div>
      </div>
      <Footer />
    </div>
  )
}
