// The homepage poll. Anyone can see the question and options; voting needs
// an account. A guest's tap is kept through the sign-in round trip and
// counted the moment they're back. The split (percentages only, never
// counts) shows only after the person has voted.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { supabase } from '@/integrations/supabase/client'
import { castPollVote, getMyPollState, getPollMeta, savePollFollowUp, type MyPollState, type PollMeta } from '@/lib/poll.functions'
import { FOLLOW_UP_MAX, POLL, pollDate, pollOption, type PollOptionKey } from '@/lib/poll'
import { setDurableReturn } from '@/lib/auth-guard'
import { startOAuth, useOAuthPending, oauthButtonLabel } from '@/lib/oauth-signin'
import { trackEvent } from '@/lib/tracking'
import { SectionHead } from './HomeSection'
import './home-poll.css'

const PENDING_KEY = 'shutap_poll_pending'
const PENDING_MAX_AGE_MS = 60 * 60 * 1000
const VIEWED_KEY = 'shutap_poll_viewed'

function savePending(option: PollOptionKey): void {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify({ option, at: Date.now() })) } catch { /* noop */ }
}
function takePending(): PollOptionKey | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    localStorage.removeItem(PENDING_KEY)
    const p = JSON.parse(raw) as { option?: string; at?: number } | null
    if (!p || typeof p.at !== 'number' || Date.now() - p.at > PENDING_MAX_AGE_MS) return null
    return pollOption(p.option)?.key ?? null
  } catch { return null }
}
function clearPending(): void {
  try { localStorage.removeItem(PENDING_KEY) } catch { /* noop */ }
}

async function hasRealUser(): Promise<boolean> {
  const s = (await supabase.auth.getSession()).data.session
  return !!s?.access_token && s.user.is_anonymous !== true
}

export function HomePoll() {
  const navigate = useNavigate()
  const opening = useOAuthPending()
  const loadMeta = useServerFn(getPollMeta)
  const loadMine = useServerFn(getMyPollState)
  const vote = useServerFn(castPollVote)
  const saveFollow = useServerFn(savePollFollowUp)

  const [meta, setMeta] = useState<PollMeta | null>(null)
  const [real, setReal] = useState(false)
  const [mine, setMine] = useState<MyPollState | null>(null)
  const [changing, setChanging] = useState(false)
  const [busy, setBusy] = useState<PollOptionKey | null>(null)
  const [sheet, setSheet] = useState<PollOptionKey | null>(null)
  const [follow, setFollow] = useState<'open' | 'answered' | 'skipped'>('open')
  const [followBusy, setFollowBusy] = useState(false)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLElement | null>(null)
  const syncing = useRef(false)

  const applyVote = useCallback(async (option: PollOptionKey, from: 'tap' | 'after_signin') => {
    setBusy(option)
    setError(null)
    try {
      const r = await vote({ data: { option } })
      setMine(r)
      setChanging(false)
      setFollow('open')
      setTyped('')
      void trackEvent('poll_voted', { option, from, changed: r.changed })
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setError(msg.includes('poll_closed') ? 'voting has closed.' : "that didn't go through. try again?")
    } finally {
      setBusy(null)
    }
  }, [vote])

  // Who's here, what they've voted, and any pick left from before sign-in.
  const sync = useCallback(async () => {
    if (syncing.current) return
    syncing.current = true
    try {
      const isReal = await hasRealUser()
      setReal(isReal)
      if (!isReal) { setMine(null); return }
      const state = await loadMine()
      setMine(state)
      const pending = takePending()
      if (pending && !state.vote) {
        await applyVote(pending, 'after_signin')
        requestAnimationFrame(() => rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      }
    } catch { /* the poll stays as options */ } finally {
      syncing.current = false
    }
  }, [loadMine, applyVote])

  useEffect(() => {
    let dead = false
    void loadMeta().then((m) => { if (!dead) setMeta(m) }).catch(() => {})
    void sync()
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user.is_anonymous !== true) void sync()
      if (event === 'SIGNED_OUT') { setReal(false); setMine(null) }
    })
    return () => { dead = true; data.subscription.unsubscribe() }
  }, [loadMeta, sync])

  // One "saw the poll" per browser session, when it's actually on screen.
  useEffect(() => {
    const el = rootRef.current
    if (!el || !meta?.open) return
    try { if (sessionStorage.getItem(VIEWED_KEY)) return } catch { /* noop */ }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        try { sessionStorage.setItem(VIEWED_KEY, '1') } catch { /* noop */ }
        void trackEvent('poll_viewed', { signed_in: real })
        io.disconnect()
      }
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [meta?.open, real])

  if (!meta || !meta.open) return null

  function tap(option: PollOptionKey) {
    if (busy) return
    void trackEvent('poll_option_tapped', { option, signed_in: real })
    if (!real) { setSheet(option); return }
    void applyVote(option, 'tap')
  }

  async function signIn(method: 'google' | 'apple' | 'email') {
    if (!sheet) return
    savePending(sheet)
    try { sessionStorage.setItem('shutap_returnTo', '/') } catch { /* noop */ }
    setDurableReturn('/')
    void trackEvent('poll_signin_clicked', { method, option: sheet })
    if (method === 'google' || method === 'apple') {
      const err = await startOAuth(method)
      if (err) setError(err)
      return
    }
    void navigate({ to: '/welcome', search: { method: 'email' } as never })
  }

  function dismissSheet() {
    clearPending()
    setSheet(null)
    void trackEvent('poll_signin_dismissed', {})
  }

  async function answer(text: string) {
    const clean = text.trim().slice(0, FOLLOW_UP_MAX)
    if (!clean || followBusy || !mine?.vote) return
    setFollowBusy(true)
    try {
      await saveFollow({ data: { answer: clean } })
      setFollow('answered')
      void trackEvent('poll_followup', { option: mine.vote.option, answer: clean })
    } catch {
      setError("that didn't save. try again?")
    } finally {
      setFollowBusy(false)
    }
  }

  const voted = !!mine?.vote && !!mine.percents && !changing
  const myOption = mine?.vote ? pollOption(mine.vote.option) : null
  const showFollow = voted && myOption && !mine?.vote?.followUp && follow === 'open'

  return (
    <section id="poll" ref={rootRef} className="hsec hpoll" aria-labelledby="hpoll-title">
      <div className="hsec-col">
      <SectionHead
        id="hpoll-title"
        kicker="quick poll"
        title={POLL.title.includes(':') ? `${POLL.title.split(':')[0]}:` : POLL.title}
        accent={POLL.title.includes(':') ? POLL.title.slice(POLL.title.indexOf(':') + 1).trim() : undefined}
        sub={voted ? undefined : POLL.description}
      />
      <div className="hsec-card hpoll-card">
        {voted && mine?.percents ? (
          <>
            <ul className="hpoll-results" aria-label="results">
              {POLL.options.map((o) => {
                const pct = mine.percents?.[o.key] ?? 0
                const isMine = mine.vote?.option === o.key
                return (
                  <li key={o.key} className="hpoll-row">
                    <div className="hpoll-row-top">
                      <span className="hpoll-row-label">
                        {o.label}
                        {isMine && (
                          <span className="hpoll-mine">
                            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3.2 3L13 4.5" /></svg>
                            your pick
                          </span>
                        )}
                      </span>
                      <span className="hpoll-pct">{pct}%</span>
                    </div>
                    <div className="hpoll-track" aria-hidden="true">
                      <div className={`hpoll-fill${isMine ? ' mine' : ''}`} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="hpoll-meta">
              <span>
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="8" cy="8" r="6.5" /><path d="M8 4.5V8l2.5 1.5" /></svg>
                voting opened {pollDate(meta.openedAt)}
              </span>
              <button type="button" className="hpoll-link" onClick={() => { setChanging(true); setError(null) }}>change my vote</button>
            </div>

            {showFollow && myOption && (
              <>
                <div className="hpoll-rule" />
                <div className="hpoll-follow">
                  <div className="hpoll-follow-head">
                    <div className="hpoll-label">one more</div>
                    <button type="button" className="hpoll-link quiet" onClick={() => { setFollow('skipped'); void trackEvent('poll_followup_skipped', { option: myOption.key }) }}>skip</button>
                  </div>
                  <h3 className="hpoll-follow-q">{myOption.followUp.question}</h3>
                  {myOption.followUp.chips.length > 0 ? (
                    <div className="hpoll-chips">
                      {myOption.followUp.chips.map((c) => (
                        <button key={c} type="button" className="hpoll-chip" disabled={followBusy} onClick={() => void answer(c)}>{c}</button>
                      ))}
                    </div>
                  ) : (
                    <form className="hpoll-typed" onSubmit={(e) => { e.preventDefault(); void answer(typed) }}>
                      <label htmlFor="hpoll-typed" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{myOption.followUp.question}</label>
                      <input
                        id="hpoll-typed"
                        className="hpoll-input"
                        value={typed}
                        maxLength={FOLLOW_UP_MAX}
                        placeholder={myOption.followUp.placeholder}
                        onChange={(e) => setTyped(e.target.value)}
                      />
                      <button type="submit" className="hpoll-btn" disabled={followBusy || !typed.trim()}>send</button>
                    </form>
                  )}
                </div>
              </>
            )}
            {voted && follow === 'answered' && <p className="hpoll-thanks">got it. thanks.</p>}
          </>
        ) : (
          <div className="hpoll-options">
            {POLL.options.map((o) => {
              const current = changing && mine?.vote?.option === o.key
              return (
                <button
                  key={o.key}
                  type="button"
                  className="hpoll-opt"
                  aria-pressed={current || busy === o.key}
                  disabled={!!busy}
                  onClick={() => tap(o.key)}
                >
                  {o.label}
                  <span className="hpoll-radio" aria-hidden="true" />
                </button>
              )
            })}
            {changing && (
              <button type="button" className="hpoll-link quiet" style={{ alignSelf: 'flex-start' }} onClick={() => setChanging(false)}>keep my vote</button>
            )}
          </div>
        )}

        {error && <p className="hpoll-error" role="alert">{error}</p>}

        <p className="hpoll-privacy">
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>
          {POLL.privacy}
        </p>
      </div>
      </div>

      {sheet && (
        <div className="hpoll-scrim" onClick={(e) => { if (e.target === e.currentTarget) dismissSheet() }}>
          <div className="hpoll-sheet" role="dialog" aria-modal="true" aria-labelledby="hpoll-sheet-title">
            <div className="hpoll-grab" aria-hidden="true" />
            <h3 id="hpoll-sheet-title">sign in to lock in your vote</h3>
            <div className="hpoll-pick">
              <span className="hpoll-label">your pick</span>
              <div>{pollOption(sheet)?.label}</div>
            </div>
            <div className="hpoll-sheet-actions">
              <button type="button" className="hpoll-btn block" disabled={!!opening} onClick={() => void signIn('google')}>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82zM12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24zM5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09zM12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
                </svg>
                {oauthButtonLabel('google', opening)}
              </button>
              <button type="button" className="hpoll-btn block ghost" disabled={!!opening} onClick={() => void signIn('apple')}>{oauthButtonLabel('apple', opening)}</button>
              <button type="button" className="hpoll-btn block ghost" onClick={() => void signIn('email')}>continue with email</button>
            </div>
            <p className="hpoll-note">you'll land right back here with your vote counted and the split showing.</p>
            <button type="button" className="hpoll-link quiet" style={{ alignSelf: 'center' }} onClick={dismissSheet}>not now</button>
            <p className="hpoll-fine">by continuing you confirm you're 18+ and agree to the terms and privacy policy</p>
          </div>
        </div>
      )}
    </section>
  )
}
