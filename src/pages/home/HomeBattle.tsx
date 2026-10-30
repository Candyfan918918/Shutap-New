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
import { BATTLE, RANKS, rankAvatarPath, type RankKey } from '@/lib/battle'
import { setDurableReturn } from '@/lib/auth-guard'
import { startOAuth, useOAuthPending, oauthButtonLabel } from '@/lib/oauth-signin'
import { trackEvent } from '@/lib/tracking'
import { SectionHead } from './HomeSection'
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
      if (!r.player.signedIn && r.player.rank) void trackEvent('battle_collect_prompt', { rank: r.player.rank.name, picks: r.player.picks })
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
  const picks = player?.picks ?? 0

  return (
    <section id="battle" ref={rootRef} className="hsec hbat" aria-labelledby="hbat-title" onKeyDown={onKey}>
      <div className="hsec-col">
        <SectionHead id="hbat-title" kicker="joke battle" title="Pick the" accent="funniest." sub="One setup, three ways to say it. Every pick teaches Shutap what's funny." />

        <div className="hsec-card hbat-card">
          <div className="hbat-top">
            <span className="hbat-meta">
              <span className="hbat-topic">{round.setup.topic}</span>
            </span>
            <button
              type="button"
              className="hbat-rankchip"
              onClick={() => { setLadder((v) => !v); if (!ladder) void trackEvent('battle_ladder_opened', { picks }) }}
              aria-expanded={ladder}
              aria-controls="hbat-ladder"
            >
              {player?.rank ? (
                <span className="hbat-chipbadge"><RankIcon rank={player.rank.key as RankKey} size={16} /></span>
              ) : null}
              <span className="hbat-chiptext">
                <span className="hbat-chipline">
                  <strong>{player?.rank?.name ?? 'no rank yet'}</strong>
                  <span>{player?.next ? `${player.next.at - (player?.picks ?? 0)} to ${player.next.name}` : player?.rank ? 'top' : ''}</span>
                </span>
                <span className="hbat-chipbar" aria-hidden="true"><span style={{ width: `${Math.max(6, Math.round((player?.progress ?? 0) * 100))}%` }} /></span>
              </span>
              {player && player.streak > 0 && (
                <span className="hbat-streak" title={`${player.streak}-day streak`}><Bolt />{player.streak}</span>
              )}
            </button>
          </div>

          {ladder && <Ladder player={player} cardRef={cardRef} onSave={saveCard} onClose={() => setLadder(false)} />}

          {result?.newRank && (
            <div className="hbat-rankup" role="status">
              <span className="hbat-rankup-badge"><RankIcon rank={result.newRank.key as RankKey} size={20} /></span>
              <span><strong>New rank: {result.newRank.name}.</strong> {result.newRank.line}</span>
            </div>
          )}

          <div className="hbat-setupwrap">
            <p className="hbat-setup">{round.setup.text}</p>
            <p className="hbat-q">Which is funniest?</p>
          </div>

          <ol className="hbat-options" aria-label="Which is funniest?">
            {round.options.map((o, i) => {
              const r = reveal(o.key)
              const mine = chosen === o.key
              const cls = `hbat-opt${mine ? ' mine' : ''}${revealed && !mine ? ' dim' : ''}`
              return (
                <li key={o.key}>
                  {!revealed ? (
                    <button type="button" className={cls} disabled={phase !== 'open'} onClick={() => void choose(o.key)} aria-label={`Pick line ${i + 1}: ${o.text}`}>
                      <span className="hbat-num" aria-hidden="true">{phase === 'picking' && mine ? '…' : i + 1}</span>
                      <span className="hbat-line">{o.text}</span>
                      <span className="hbat-picktag" aria-hidden="true">pick</span>
                    </button>
                  ) : (
                    <div className={cls}>
                      <span className="hbat-num" aria-hidden="true">{mine ? '✓' : i + 1}</span>
                      <span className="hbat-body">
                        <span className="hbat-line">{o.text}</span>
                        {r && (
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
                      </span>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>

          <div className="hbat-foot">
            {revealed && result ? (
              <>
                <span className="hbat-result">
                  <strong>{chosen === 'none' ? 'Noted. All three go back to the writer.' : 'Picked.'}</strong>
                  {player?.humorLabel ? <span> Your humor: {player.humorLabel}.</span> : null}
                </span>
                <button type="button" className="hbat-next" onClick={() => void load()}>Next battle →</button>
              </>
            ) : (
              <>
                <span className="hbat-hint">tap a line, or press 1 · 2 · 3</span>
                <span className="hbat-quiet">
                  <button type="button" disabled={phase !== 'open'} onClick={() => void choose('none')}>None of these</button>
                  <button type="button" disabled={phase !== 'open'} onClick={() => void skip()}>Skip</button>
                </span>
              </>
            )}
          </div>
          {revealed && result && player?.rank && !player.signedIn && (
            <div className="hbat-collect" role="status">
              <img className="hbat-collect-pic" src={rankAvatarPath(player.rank.key as RankKey)} alt="" width={44} height={44} />
              <span className="hbat-collect-text">
                <strong>Sign in to collect your {player.rank.name} badge.</strong>
                <span>It goes on your profile, with a {player.rank.name} profile picture. {player.picks} {player.picks === 1 ? 'pick' : 'picks'} so far.</span>
              </span>
              <button type="button" className="hbat-collect-btn" onClick={() => { setSheet(true); void trackEvent('battle_collect_clicked', { rank: player.rank?.name ?? null, picks: player.picks }) }}>
                Collect
              </button>
            </div>
          )}
          {revealed && result?.newRank && player?.signedIn && (
            <div className="hbat-collect" role="status">
              <img className="hbat-collect-pic" src={rankAvatarPath(result.newRank.key as RankKey)} alt="" width={44} height={44} />
              <span className="hbat-collect-text">
                <strong>{result.newRank.name} badge collected.</strong>
                <span>It's on your profile, with a new profile picture to use.</span>
              </span>
              <a className="hbat-collect-btn" href="/profile#badges" onClick={() => void trackEvent('battle_badge_profile_clicked', { rank: result.newRank?.name ?? null })}>
                See it
              </a>
            </div>
          )}
          {error && phase !== 'error' && <p className="hbat-error" role="alert">{error}</p>}
        </div>

        <p className="hsec-fine">Only your own picks and rank show here. Every pick trains Shutap's joke writer. Battles use jokes we write, never anyone's story.</p>
      </div>

      {sheet && (
        <div className="hbat-scrim" onClick={(e) => { if (e.target === e.currentTarget) { setSheet(false); void trackEvent('battle_signin_dismissed', {}) } }}>
          <div className="hbat-sheet" role="dialog" aria-modal="true" aria-labelledby="hbat-sheet-title">
            <div className="hbat-grab" aria-hidden="true" />
            {player?.rank && <img className="hbat-sheet-pic" src={rankAvatarPath(player.rank.key as RankKey)} alt="" width={72} height={72} />}
            <h3 id="hbat-sheet-title">Collect your {player?.rank?.name ?? 'first'} badge</h3>
            <p>Sign in and your badge goes on your profile, with a {player?.rank?.name ?? 'rank'} profile picture you can use. Every rank you reach adds the next one. Your rank and streak follow you to any device; your picks count either way.</p>
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
    <div className="hbat-ladder" id="hbat-ladder">
      <div className="hbat-ladder-head">
        <div>
          <h3 className="hbat-ladder-title">The humor wisdom ladder</h3>
          <p className="hbat-ladder-sub">
            {picks} {picks === 1 ? 'pick' : 'picks'}
            {player?.next ? ` · ${player.next.at - picks} to ${player.next.name}` : player?.rank ? ' · top of the ladder' : ''}
          </p>
        </div>
        <button type="button" className="hbat-x" onClick={onClose} aria-label="Close the ladder">×</button>
      </div>
      <ol className="hbat-ranks">
        {RANKS.map((r) => {
          const earned = picks >= r.at
          const current = player?.rank?.key === r.key
          return (
            <li key={r.key} className={`hbat-rank${earned ? ' earned' : ''}${current ? ' current' : ''}`}>
              {earned ? (
                <img className="hbat-badge pic" src={rankAvatarPath(r.key)} alt="" width={38} height={38} />
              ) : (
                <span className="hbat-badge"><RankIcon rank={r.key} size={20} /></span>
              )}
              <span className="hbat-rank-body">
                <span className="hbat-rank-top"><strong>{r.name}</strong><span>{current ? 'you' : `${r.at}`}</span></span>
                <span className="hbat-rank-line">{r.line}</span>
              </span>
            </li>
          )
        })}
      </ol>
      {player?.humor.length ? (
        <div className="hbat-styles">
          <span className="hbat-styles-label">your humor: <strong>{player.humorLabel}</strong></span>
          {player.humor.slice(0, 3).map((h) => (
            <span key={h.style} className="hbat-style">{h.style} · {h.n}</span>
          ))}
        </div>
      ) : null}
      {player?.rank && (
        <div className="hbat-share">
          <div ref={cardRef} className="hbat-rankcard">
            <span className="hbat-badge on-dark"><RankIcon rank={player.rank.key as RankKey} size={22} /></span>
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
