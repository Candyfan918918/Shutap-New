// The homepage joke battle: one in-house setup, three ways to say it, pick
// the funniest. Endless. Players see only their own rank, streak and humor
// type; the room's results are admin-only. Every pick is tracked (our DB +
// PostHog) and feeds the joke writer.
//
// Guests play without signing in (a random ID in this browser). After
// BATTLE.signInAt picks, a guest is asked once to sign in to keep their rank.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { supabase } from '@/integrations/supabase/client'
import { battleLink, battleMe, battleNext, battlePick, type BattlePickResult, type BattlePlayer, type BattleRound } from '@/lib/battle.functions'
import { BATTLE, RANKS, type RankKey } from '@/lib/battle'
import { setDurableReturn } from '@/lib/auth-guard'
import { startOAuth, useOAuthPending, oauthButtonLabel } from '@/lib/oauth-signin'
import { trackEvent } from '@/lib/tracking'
import './home-battle.css'

const PLAYER_KEY = 'shutap_battle_player'
const PROMPTED_KEY = 'shutap_battle_signin_prompted'
const VIEWED_KEY = 'shutap_battle_viewed'

function playerId(): string {
  try {
    let id = localStorage.getItem(PLAYER_KEY)
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      id = crypto.randomUUID()
      localStorage.setItem(PLAYER_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

async function hasRealUser(): Promise<boolean> {
  const s = (await supabase.auth.getSession()).data.session
  return !!s?.access_token && s.user.is_anonymous !== true
}

/* ── badges ── */

export function RankIcon({ rank, size = 26 }: { rank: RankKey; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (rank) {
    case 'jester':
      return <svg {...common}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /><path d="M12 3v2" /></svg>
    case 'wit':
      return <svg {...common}><path d="M20 4c-6 0-11 4-13 11l-2 5" /><path d="M20 4c0 6-4 10-10 11" /><path d="M7 15h3" /></svg>
    case 'wise-fool':
      return <svg {...common}><path d="M4 5c5 2 11 2 16 0v6a8 8 0 0 1-16 0z" /><path d="M8 10.5c.6-.7 1.6-.7 2.2 0" /><path d="M13.8 10.5c.6-.7 1.6-.7 2.2 0" /><path d="M8.5 14c2 2 5 2 7 0" /></svg>
    case 'sage':
      return <svg {...common}><path d="M5 4l3 3" /><path d="M19 4l-3 3" /><circle cx="9" cy="11" r="2.6" /><circle cx="15" cy="11" r="2.6" /><path d="M12 14l-1 1.5h2z" /><path d="M6 9c0 7 3 11 6 11s6-4 6-11" /></svg>
    case 'oracle':
      return <svg {...common}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /><path d="M12 2v1.5" /><path d="M5 4l1 1.2" /><path d="M19 4l-1 1.2" /></svg>
    case 'legend':
      return <svg {...common}><path d="M7 20C3 16 3 9 7 5" /><path d="M17 20c4-4 4-11 0-15" /><path d="M5.5 15.5l-2 .5" /><path d="M4.6 11.5l-2-.3" /><path d="M5.2 7.6l-1.8-1" /><path d="M18.5 15.5l2 .5" /><path d="M19.4 11.5l2-.3" /><path d="M18.8 7.6l1.8-1" /><path d="M12 8l1.2 2.5 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4z" /></svg>
  }
}

function Bolt() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  )
}

/* ── the section ── */

type Phase = 'idle' | 'loading' | 'open' | 'picking' | 'revealed' | 'empty' | 'error'

export function HomeBattle() {
  const navigate = useNavigate()
  const opening = useOAuthPending()
  const next = useServerFn(battleNext)
  const pick = useServerFn(battlePick)
  const me = useServerFn(battleMe)
  const link = useServerFn(battleLink)

  const [player, setPlayer] = useState<BattlePlayer | null>(null)
  const [round, setRound] = useState<BattleRound | null>(null)
  const [result, setResult] = useState<BattlePickResult | null>(null)
  const [chosen, setChosen] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [ladder, setLadder] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rootRef = useRef<HTMLElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const pid = useRef<string | null>(null)
  const started = useRef(false)

  const getPid = () => (pid.current ??= playerId())

  const load = useCallback(async () => {
    setPhase('loading')
    setError(null)
    setResult(null)
    setChosen(null)
    try {
      const r = await next({ data: { player: getPid() } })
      if (!r) {
        setRound(null)
        setPhase('empty')
        return
      }
      setRound(r)
      setPlayer(r.player)
      setPhase('open')
      void trackEvent('battle_round_served', { setup: r.setup.n, topic: r.setup.topic })
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setError(msg.includes('rate_limited') ? "that's a lot of battles for one day. come back tomorrow." : "couldn't load a battle. try again?")
      setPhase('error')
    }
  }, [next])

  // Start when the section is about to scroll into view: no server calls for
  // visitors who never get this far down.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || started.current) return
        started.current = true
        io.disconnect()
        void (async () => {
          if (await hasRealUser()) {
            try { setPlayer(await link({ data: { player: getPid() } })) } catch { /* plays as a guest */ }
          } else {
            try { setPlayer(await me({ data: { player: getPid() } })) } catch { /* noop */ }
          }
          await load()
        })()
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [load, link, me])

  // Coming back from sign-in: attach this browser's picks to the account.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user.is_anonymous !== true && started.current) {
        void link({ data: { player: getPid() } }).then(setPlayer).catch(() => {})
      }
    })
    return () => data.subscription.unsubscribe()
  }, [link])

  // One "saw the battle" per browser session, when it's actually on screen.
  useEffect(() => {
    const el = rootRef.current
    if (!el || !round) return
    try { if (sessionStorage.getItem(VIEWED_KEY)) return } catch { /* noop */ }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        try { sessionStorage.setItem(VIEWED_KEY, '1') } catch { /* noop */ }
        void trackEvent('battle_viewed', { picks: player?.picks ?? 0, signed_in: !!player?.signedIn })
        io.disconnect()
      }
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [round, player])

  async function choose(key: string) {
    if (!round || phase !== 'open') return
    setPhase('picking')
    setChosen(key)
    try {
      const r = await pick({ data: { player: getPid(), round: round.roundId, choice: key } })
      setResult(r)
      setPlayer(r.player)
      setPhase('revealed')
      const mine = r.reveal.find((x) => x.key === key)
      if (key === 'none') void trackEvent('battle_none', { setup: round.setup.n, counted: r.counted })
      else void trackEvent('battle_pick', { setup: round.setup.n, topic: round.setup.topic, technique: mine?.technique, guide: mine?.guideSlug, control: !!mine?.control, counted: r.counted, picks: r.player.picks, rank: r.player.rank?.name ?? null })
      if (r.newRank) void trackEvent('battle_rank_up', { rank: r.newRank.name, picks: r.player.picks })
      // A guest who just reached the sign-in mark is asked once.
      if (!r.player.signedIn && r.player.picks >= BATTLE.signInAt) {
        let asked = false
        try { asked = !!localStorage.getItem(PROMPTED_KEY) } catch { /* noop */ }
        if (!asked) {
          try { localStorage.setItem(PROMPTED_KEY, '1') } catch { /* noop */ }
          setSheet(true)
          void trackEvent('battle_signin_prompt', { picks: r.player.picks })
        }
      }
    } catch {
      setError("that pick didn't go through. try again?")
      setChosen(null)
      setPhase('open')
    }
  }

  async function skip() {
    if (!round || phase !== 'open') return
    void trackEvent('battle_skip', { setup: round.setup.n })
    setPhase('loading')
    try { await pick({ data: { player: getPid(), round: round.roundId, choice: 'skip' } }) } catch { /* the next round still loads */ }
    await load()
  }

  async function signIn(method: 'google' | 'apple' | 'email') {
    try { sessionStorage.setItem('shutap_returnTo', '/#battle') } catch { /* noop */ }
    setDurableReturn('/#battle')
    void trackEvent('battle_signin_clicked', { method })
    if (method === 'google' || method === 'apple') {
      const err = await startOAuth(method)
      if (err) setError(err)
      return
    }
    void navigate({ to: '/welcome', search: { method: 'email' } as never })
  }

  async function saveCard() {
    if (!cardRef.current || !player?.rank) return
    try {
      const { toPng } = await import('html-to-image')
      const url = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true })
      const a = document.createElement('a')
      a.href = url
      a.download = `shutap-${player.rank.key}.png`
      a.click()
      void trackEvent('battle_rank_card_saved', { rank: player.rank.name })
    } catch {
      setError("couldn't save the card. try again?")
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (phase !== 'open' || !round) return
    const t = e.target as HTMLElement
    if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return
    const i = ['1', '2', '3'].indexOf(e.key)
    if (i >= 0 && round.options[i]) { e.preventDefault(); void choose(round.options[i]!.key) }
  }

  // Nothing shows until a round has loaded: an empty bank, a missing table or
  // a failed first load leaves the homepage exactly as it was.
  if (!round) return <section id="battle" ref={rootRef} className="hbat-pending" aria-hidden="true" />

  const revealed = phase === 'revealed' && !!result
  const reveal = (key: string) => result?.reveal.find((x) => x.key === key)

  return (
    <section id="battle" ref={rootRef} className="hbat" aria-labelledby="hbat-title" onKeyDown={onKey}>
      <div className="hbat-wrap">
        <div className="hbat-head">
          <div className="hbat-titles">
            <h2 id="hbat-title" className="hbat-title">Joke battle</h2>
            <p className="hbat-sub">One setup, three ways to say it. Pick the funniest.</p>
          </div>
          <div className="hbat-stats">
            {player && player.streak > 0 && (
              <span className="hbat-streak"><Bolt /><strong>{player.streak}</strong> {player.streak === 1 ? 'day' : 'day streak'}</span>
            )}
            <button type="button" className="hbat-rankbtn" onClick={() => { setLadder((v) => !v); if (!ladder) void trackEvent('battle_ladder_opened', { picks: player?.picks ?? 0 }) }} aria-expanded={ladder}>
              <span className="hbat-rankline">
                <strong>{player?.rank?.name ?? 'no rank yet'}</strong>
                <span>{player?.next ? `${player.next.at - player.picks} to ${player.next.name}` : player?.rank ? 'top of the ladder' : ''}</span>
              </span>
              <span className="hbat-bar" aria-hidden="true"><span style={{ width: `${Math.max(4, Math.round((player?.progress ?? 0) * 100))}%` }} /></span>
            </button>
          </div>
        </div>

        {ladder && (
          <Ladder player={player} cardRef={cardRef} onSave={saveCard} onClose={() => setLadder(false)} />
        )}

        <div className="hbat-grid">
          <div className="hbat-card">
            {result?.newRank && (
              <div className="hbat-rankup" role="status">
                <span className="hbat-rankup-badge"><RankIcon rank={result.newRank.key as RankKey} size={22} /></span>
                <span><strong>New rank: {result.newRank.name}.</strong> {result.newRank.line}</span>
              </div>
            )}

            {round ? (
              <>
                <div className="hbat-meta">
                  <span className="hbat-topic">{round.setup.topic}</span>
                  <span>setup {round.setup.n} of {round.total}</span>
                </div>
                <div className="hbat-setup">
                  <p className="hbat-setup-text">{round.setup.text}</p>
                  <p className="hbat-q">Which is funniest?</p>
                </div>
                <ol className="hbat-options">
                  {round.options.map((o, i) => {
                    const r = reveal(o.key)
                    const mine = chosen === o.key
                    return (
                      <li key={o.key} className={`hbat-opt${mine ? ' mine' : ''}${revealed && !mine ? ' dim' : ''}`}>
                        <div className="hbat-opt-row">
                          <span className="hbat-line">{o.text}</span>
                          {!revealed ? (
                            <button type="button" className="hbat-pick" disabled={phase !== 'open'} onClick={() => void choose(o.key)} aria-label={`Pick line ${i + 1}`}>
                              {phase === 'picking' && mine ? '…' : 'Pick'}
                            </button>
                          ) : mine ? (
                            <span className="hbat-mine">your pick</span>
                          ) : null}
                        </div>
                        {revealed && r && (
                          <span className="hbat-tech">
                            {r.technique}
                            {r.guideSlug && (
                              <>
                                {' · '}
                                <a href={`/guides/${r.guideSlug}`} onClick={() => void trackEvent('battle_learn_clicked', { guide: r.guideSlug, technique: r.technique })}>learn it</a>
                              </>
                            )}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ol>

                {revealed && result && (
                  <div className="hbat-after">
                    <span className="hbat-after-main">
                      {chosen === 'none' ? 'Noted. All three go back to the writer.' : `Picked. You chose ${reveal(chosen ?? '')?.technique ?? 'that one'}.`}
                    </span>
                    {player?.humorLabel && <span className="hbat-after-sub">Your humor: {player.humorLabel}.</span>}
                  </div>
                )}
              </>
            ) : (
              <div className="hbat-loading" aria-live="polite">{phase === 'error' ? error : 'loading a battle…'}</div>
            )}

            <div className="hbat-actions">
              {revealed ? (
                <button type="button" className="hbat-btn dark" onClick={() => void load()}>Next battle</button>
              ) : round ? (
                <>
                  <button type="button" className="hbat-btn" disabled={phase !== 'open'} onClick={() => void choose('none')}>None of these</button>
                  <button type="button" className="hbat-btn quiet" disabled={phase !== 'open'} onClick={() => void skip()}>Skip</button>
                </>
              ) : phase === 'error' ? (
                <button type="button" className="hbat-btn" onClick={() => void load()}>Try again</button>
              ) : null}
            </div>
            {error && phase !== 'error' && <p className="hbat-error" role="alert">{error}</p>}
          </div>

          <aside className="hbat-side" aria-label="your humor type">
            <span className="hbat-label">your humor type</span>
            <div className="hbat-panel">
              {player?.humor.length ? (
                <>
                  <strong className="hbat-type">{player.humorLabel}</strong>
                  <ul className="hbat-styles">
                    {player.humor.slice(0, 3).map((h) => {
                      const max = player.humor[0]!.n
                      return (
                        <li key={h.style}>
                          <span className="hbat-style-top"><span>{h.style}</span><span>{h.n} {h.n === 1 ? 'pick' : 'picks'}</span></span>
                          <span className="hbat-bar" aria-hidden="true"><span style={{ width: `${Math.round((h.n / max) * 100)}%` }} /></span>
                        </li>
                      )
                    })}
                  </ul>
                </>
              ) : (
                <p className="hbat-empty">Pick a few lines and your type shows up here.</p>
              )}
            </div>
            <p className="hbat-fine">Only your own picks show here. Every pick trains Shutap's joke writer. Battles use jokes we write, never anyone's story.</p>
          </aside>
        </div>
      </div>

      {sheet && (
        <div className="hbat-scrim" onClick={(e) => { if (e.target === e.currentTarget) { setSheet(false); void trackEvent('battle_signin_dismissed', {}) } }}>
          <div className="hbat-sheet" role="dialog" aria-modal="true" aria-labelledby="hbat-sheet-title">
            <div className="hbat-grab" aria-hidden="true" />
            <h3 id="hbat-sheet-title">Keep your rank and your streak</h3>
            <p>Sign in so your {player?.rank?.name ?? 'rank'} badge and streak follow you to any device. Your picks count either way.</p>
            <button type="button" className="hbat-btn block" disabled={!!opening} onClick={() => void signIn('google')}>{oauthButtonLabel('google', opening)}</button>
            <button type="button" className="hbat-btn block dark" disabled={!!opening} onClick={() => void signIn('apple')}>{oauthButtonLabel('apple', opening)}</button>
            <button type="button" className="hbat-btn block" onClick={() => void signIn('email')}>continue with email</button>
            <button type="button" className="hbat-btn quiet block" onClick={() => { setSheet(false); void trackEvent('battle_signin_dismissed', {}) }}>keep playing as a guest</button>
            <p className="hbat-fine">by continuing you confirm you're 18+ and agree to the terms and privacy policy</p>
          </div>
        </div>
      )}
    </section>
  )
}

function Ladder({ player, cardRef, onSave, onClose }: { player: BattlePlayer | null; cardRef: React.RefObject<HTMLDivElement | null>; onSave: () => void; onClose: () => void }) {
  const picks = player?.picks ?? 0
  return (
    <div className="hbat-ladder">
      <div className="hbat-ladder-head">
        <div>
          <span className="hbat-label">Shutap Humor Amplifier Lab</span>
          <h3 className="hbat-ladder-title">The humor wisdom ladder</h3>
          <p className="hbat-ladder-sub">Humor is wisdom. Every pick is a lesson.</p>
        </div>
        <button type="button" className="hbat-btn quiet" onClick={onClose}>close</button>
      </div>
      <ol className="hbat-ranks">
        {RANKS.map((r) => {
          const earned = picks >= r.at
          const current = player?.rank?.key === r.key
          return (
            <li key={r.key} className={`hbat-rank${earned ? ' earned' : ''}${current ? ' current' : ''}`}>
              <span className="hbat-badge"><RankIcon rank={r.key} /></span>
              <span className="hbat-rank-body">
                <span className="hbat-rank-top"><strong>{r.name}</strong><span>{current ? 'you are here' : `${r.at} ${r.at === 1 ? 'pick' : 'picks'}`}</span></span>
                <span className="hbat-rank-line">{r.line}</span>
                {!earned && player?.next?.name === r.name && (
                  <span className="hbat-bar" aria-hidden="true"><span style={{ width: `${Math.max(4, Math.round(player.progress * 100))}%` }} /></span>
                )}
              </span>
            </li>
          )
        })}
      </ol>
      {player?.rank && (
        <div className="hbat-share">
          <div ref={cardRef} className="hbat-rankcard">
            <span className="hbat-badge on-dark"><RankIcon rank={player.rank.key as RankKey} /></span>
            <span className="hbat-rankcard-body">
              <span className="hbat-rankcard-kicker">SHUTAP · HUMOR WISDOM</span>
              <strong>{player.rank.name}</strong>
              <span>{[player.humorLabel, 'shutap.com'].filter(Boolean).join(' · ')}</span>
            </span>
          </div>
          <button type="button" className="hbat-btn dark" onClick={onSave}>Save my rank card</button>
        </div>
      )}
    </div>
  )
}
