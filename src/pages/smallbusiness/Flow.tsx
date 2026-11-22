// Shutap for small business (Nov 21 2026, approved by Candy): the phone flow,
// first half. Welcome → kind of business → where it is → "Which one is
// yours?" → "Is this your business?" → sign up → kind of funny → how the
// videos look → code word → "Anything fun happen today?" → promote → pick a
// skit → the lines, one at a time (Funnier, Edit, Looks good).
//
// Then filming and the finished video (Film.tsx). My creations and the week
// come in the next slices; until then the flow ends on a short "today's
// video" screen.
// The whole page is dark behind the smallbusiness flag (admins see it).
//
// What the owner typed before signing up is kept in this browser (the draft)
// so a Google or Apple round trip brings them back to where they were.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useCurrentAlias } from '@/hooks/use-current-alias'
import { rememberReturnTo } from '@/lib/auth'
import { trackEvent } from '@/lib/tracking'
import { anonSessionId } from '@/pages/home/joke/jokeClient'
import { LoadingDots, SignInButtons, SignInLegal } from '@/components/signin/SignIn'
import { findMyShop, getMyShop, getMySkits, keepSkitLine, pickMyShop, pickMySkit, saveMyShop, touchMySkitLine, writeMySkits, type Shop, type SkitSet } from '@/lib/shops.functions'
import { BUSINESS_TYPES, CAMERAS, COUNTRIES, DEFAULT_LENGTH, LENGTHS, OFFERS, VOICES, type BusinessType, type Camera, type Country, type Length, type Offer, type Voice } from '@/lib/shops/shop'
import { SOURCE_LABEL, skitLines, type LineKey } from '@/lib/shops/skit'
import type { ShopMatch } from '@/lib/shops/places.server'
import type { ShopUsage } from '@/lib/shops/allowance'
import { PLANS, usd } from '@/lib/pricing'
import { RisingIcons } from './RisingIcons'
import { Film } from './Film'
import './smallbusiness.css'

type Step = 'welcome' | 'type' | 'where' | 'which' | 'confirm' | 'signin' | 'funny' | 'look' | 'code' | 'day' | 'promote' | 'pick' | 'lines' | 'film' | 'done' | 'limit' | 'crisis'

/** The order the top-corner icons fill in (15 icons across the whole product;
 *  filming and after take the rest). */
const PROGRESS: Record<Step, number> = { welcome: 0, type: 1, where: 2, which: 3, confirm: 3, signin: 4, funny: 5, look: 6, code: 7, day: 8, promote: 9, pick: 10, lines: 11, film: 12, done: 13, limit: 10, crisis: 8 }
const BACK: Partial<Record<Step, Step>> = { type: 'welcome', where: 'type', which: 'where', confirm: 'where', signin: 'confirm', funny: 'confirm', look: 'funny', code: 'look', promote: 'day', pick: 'day', lines: 'pick', film: 'lines', limit: 'day', crisis: 'day' }

type Draft = {
  step: Step
  business_type: BusinessType | null
  name: string
  city: string
  country: Country | null
  website: string
  place_id: string | null
  address: string | null
  kind: string | null
  known_for: string[]
  voice: Voice
  length: Length
  camera: Camera
  offer: Offer
  offer_text: string
}
const EMPTY: Draft = { step: 'welcome', business_type: null, name: '', city: '', country: null, website: '', place_id: null, address: null, kind: null, known_for: [], voice: 'warm', length: DEFAULT_LENGTH, camera: 'me', offer: 'freebie', offer_text: '' }
const DRAFT_KEY = 'shutap_sb_draft'
const AFTER_SETUP: Step[] = ['day', 'promote', 'pick', 'lines', 'film', 'done', 'limit', 'crisis']
const AFTER_SIGNIN: Step[] = ['funny', 'look', 'code', ...AFTER_SETUP]

function readDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) }
  } catch { /* a draft is a convenience, never required */ }
  return EMPTY
}

const ev = (name: string, props: Record<string, unknown> = {}) => { void trackEvent(name, { product: 'smallbusiness', ...props }) }

type Recognizer = { start: () => void; stop: () => void; onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; lang: string; interimResults: boolean; continuous: boolean }
function recognizer(): Recognizer | null {
  const w = window as any
  const R = w.SpeechRecognition ?? w.webkitSpeechRecognition
  if (!R) return null
  try { return new R() as Recognizer } catch { return null }
}

export function SmallBusinessFlow() {
  const { userId, ready } = useCurrentAlias()
  const [d, setD] = useState<Draft>(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const [shop, setShop] = useState<Shop | null>(null)
  const [matches, setMatches] = useState<ShopMatch[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [chip, setChip] = useState('')
  const [day, setDay] = useState('')
  const [dayMode, setDayMode] = useState<'idle' | 'listening' | 'type' | 'done'>('idle')
  const [promote, setPromote] = useState('')
  const [set, setSet] = useState<SkitSet | null>(null)
  const [usage, setUsage] = useState<ShopUsage | null>(null)
  const [li, setLi] = useState(0)
  const [editing, setEditing] = useState<string | null>(null)
  const [options, setOptions] = useState<string[] | null>(null)
  const [tried, setTried] = useState<string[]>([])
  const [made, setMade] = useState(false)
  const rec = useRef<Recognizer | null>(null)

  const step = d.step
  const go = (s: Step) => { setNote(null); setD((x) => ({ ...x, step: s })); ev('sb_step', { step: s }) }
  const patch = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))

  // the draft comes back after a sign-in round trip, and is saved as it changes
  useEffect(() => { setD(readDraft()); setLoaded(true) }, [])
  useEffect(() => { if (loaded) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)) } catch { /* noop */ } } }, [d, loaded])

  // a signed-in owner: their business, and today's skits if they have any
  useEffect(() => {
    if (!ready || !loaded || !userId) return
    let off = false
    void (async () => {
      const [mine, skits] = await Promise.all([getMyShop({ data: {} }).catch(() => null), getMySkits({ data: {} }).catch(() => null)])
      if (off) return
      if (skits?.usage) setUsage(skits.usage)
      if (mine?.shop) {
        setShop(mine.shop)
        const latest = skits?.sets[0] ?? null
        if (latest) setSet(latest)
        setD((x) => ({ ...x, step: latest ? (latest.picked === null ? 'pick' : 'lines') : 'day' }))
        return
      }
      // just signed up, part-way through setup: carry on; a draft that says
      // "your day" with no saved business goes back to the start of setup
      setD((x) => (x.step === 'signin' ? { ...x, step: 'funny' } : AFTER_SETUP.includes(x.step) ? { ...x, step: x.name ? 'funny' : 'type' } : x))
    })()
    return () => { off = true }
  }, [ready, loaded, userId])

  // signed out with a draft that is past sign-up (another browser tab signed
  // out, an old draft): back to the last screen a guest can use
  useEffect(() => {
    if (!ready || !loaded || userId) return
    setD((x) => (AFTER_SIGNIN.includes(x.step) ? { ...x, step: x.name ? 'confirm' : 'welcome' } : x))
  }, [ready, loaded, userId])

  const skit = set && set.picked !== null ? set.skits[set.picked] ?? null : null
  const offer = shop?.offer ?? d.offer
  const gift = shop?.offer_text ?? d.offer_text
  const lines = useMemo(() => {
    if (!skit) return []
    return skitLines(skit, offer, gift).map((l) => ({ ...l, text: set?.lines[l.key as LineKey] ?? l.text }))
  }, [skit, set, offer, gift])
  const line = lines[Math.min(li, Math.max(0, lines.length - 1))]

  async function find() {
    if (!d.country || d.name.trim().length < 2 || !d.city.trim()) return
    setBusy('Looking for your business…')
    const r = await findMyShop({ data: { name: d.name, city: d.city, country: d.country, anon_session_id: anonSessionId() } }).catch(() => null)
    setBusy(null)
    ev('sb_lookup', { ok: !!r?.ok, reason: r && !r.ok ? r.reason : null })
    if (r?.ok) { setMatches(r.matches); go('which'); return }
    patch({ place_id: null, address: null, kind: null })
    go('confirm')
    setNote('We couldn’t find it. No problem: lots of businesses aren’t listed. Tell us about it yourself.')
  }

  async function choose(m: ShopMatch) {
    setBusy('One moment…')
    const r = await pickMyShop({ data: { place_id: m.place_id, anon_session_id: anonSessionId() } }).catch(() => null)
    setBusy(null)
    ev('sb_shop_picked', { details: !!r?.ok })
    const s = r?.ok ? r.shop : { ...m, website: null }
    patch({ place_id: s.place_id, name: s.name, address: s.address, kind: s.kind, website: d.website || s.website || '' })
    go('confirm')
  }

  function addChip() {
    const t = chip.trim().slice(0, 40)
    if (!t || d.known_for.length >= 12 || d.known_for.some((k) => k.toLowerCase() === t.toLowerCase())) { setChip(''); return }
    patch({ known_for: [...d.known_for, t] })
    setChip('')
    ev('sb_chip_added')
  }

  async function save() {
    if (!d.business_type || !d.country) return
    setBusy('Saving your business…')
    const r = await saveMyShop({ data: { shop: { place_id: d.place_id, name: d.name.trim(), city: d.city.trim(), country: d.country, address: d.address, website: d.website.trim() || null, business_type: d.business_type, known_for: d.known_for, voice: d.voice, length: d.length, camera: d.camera, offer: d.offer, offer_text: d.offer_text.trim() } } }).catch(() => null)
    setBusy(null)
    if (!r?.ok) { setNote(r?.reason === 'sign_in' ? 'Please sign in first.' : 'That didn’t save. Try again.'); if (r?.reason === 'sign_in') go('signin'); return }
    setShop(r.shop)
    go('day')
  }

  function mic() {
    if (dayMode === 'listening') { rec.current?.stop(); return }
    const r = recognizer()
    if (!r) { setDayMode('type'); ev('sb_mic', { how: 'unsupported' }); return }
    rec.current = r
    r.lang = 'en-US'; r.interimResults = false; r.continuous = false
    let heard = ''
    r.onresult = (e) => { heard = Array.from(e.results as ArrayLike<any>).map((x: any) => x[0]?.transcript ?? '').join(' ').trim() }
    r.onerror = () => { setDayMode('type'); setNote('Your mic is off. Turn it on, or just type what happened.'); ev('sb_mic', { how: 'blocked' }) }
    r.onend = () => { if (heard) { setDay(heard.slice(0, 600)); setDayMode('done'); ev('sb_mic', { how: 'heard' }) } else setDayMode((m) => (m === 'listening' ? 'idle' : m)) }
    try { r.start(); setDayMode('listening'); setNote(null) } catch { setDayMode('type') }
  }

  async function write(again?: string) {
    setBusy('Writing your three skits…')
    const r = await writeMySkits({ data: { day: dayMode === 'idle' ? '' : day, promote, idea: '', ...(again ? { again } : {}) } }).catch(() => null)
    setBusy(null)
    if (!r) { setNote('That didn’t work. Try again.'); return }
    if (r.ok) { setSet(r.set); setUsage(r.usage); setLi(0); go('pick'); ev('sb_skits_shown', { again: !!again }); return }
    if (r.reason === 'crisis') { go('crisis'); return }
    if (r.reason === 'limited') { setUsage(r.usage); go('limit'); return }
    if (r.reason === 'enough_today') { setNote('That’s all the fresh ones for today. Pick from these.'); return }
    if (r.reason === 'no_shop') { go('type'); return }
    if (r.reason === 'sign_in') { go('signin'); return }
    setNote('We couldn’t write good ones just now. Try again.')
  }

  async function pick(i: number) {
    if (!set) return
    setBusy('One moment…')
    const r = await pickMySkit({ data: { set_id: set.id, index: i } }).catch(() => null)
    setBusy(null)
    if (!r?.ok || !r.set) { setNote('That didn’t work. Try again.'); return }
    setSet(r.set); setLi(0); setEditing(null); setOptions(null); setTried([])
    go('lines')
  }

  async function keep(text: string, how: 'edit' | 'funnier') {
    if (!set || !line) return
    const r = await keepSkitLine({ data: { set_id: set.id, key: line.key as LineKey, text, how } }).catch(() => null)
    if (r?.ok) { setSet(r.set); setEditing(null); setOptions(null); setNote(null); return }
    setNote(r && !r.ok && r.reason === 'rule' && r.rule ? `That line needs a change: ${r.rule}.` : 'That didn’t save. Try again.')
  }

  async function funnier() {
    if (!set || !line || line.key === 'code') return
    setBusy('Making it funnier…')
    const r = await touchMySkitLine({ data: { set_id: set.id, key: line.key as 'hook' | 'shot1' | 'shot2' | 'shot3', tried } }).catch(() => null)
    setBusy(null)
    if (r?.ok) { setOptions(r.options); setTried((t) => [...t, ...r.options].slice(-12)); return }
    setNote(r && !r.ok && r.reason === 'enough_today' ? 'That’s a lot of rewrites for one day. Edit it yourself, or keep it.' : 'No funnier version came back. Try again, or edit it yourself.')
  }

  function nextLine() {
    setEditing(null); setOptions(null); setTried([]); setNote(null)
    if (li + 1 >= lines.length) { go('film'); return }
    setLi(li + 1)
  }

  const back = BACK[step]
  const lit = PROGRESS[step]
  const free = !usage || usage.tier === 'free'

  return (
    <div className="sb" data-ph-private>
      <div className="sb-phone">
        <div className="sb-top">
          {back ? (
            <button type="button" className="sb-back" aria-label="Back" onClick={() => go(back)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
            </button>
          ) : <span />}
          {step !== 'welcome' && <RisingIcons variant="mini" lit={lit} label={`Step ${lit + 1} of 16`} />}
        </div>

        {busy ? (
          <div className="sb-screen"><div className="sb-mid" style={{ alignItems: 'center' }}><LoadingDots label={busy} /><p className="sb-small">{busy}</p></div></div>
        ) : step === 'welcome' ? (
          <div className="sb-screen">
            <div className="sb-hero"><RisingIcons variant="hero" /></div>
            <div className="sb-sheet">
              <p className="sb-eyebrow">SAY IT FUNNIER</p>
              <h1 className="sb-h1" style={{ marginBottom: 26 }}>The <b>creative team</b> your shop doesn’t have.</h1>
              <button type="button" className="sb-btn" style={{ alignSelf: 'stretch' }} onClick={() => go('type')}>Make my first video</button>
              <p className="sb-note" style={{ marginTop: 16 }}>First 3 videos free</p>
            </div>
          </div>
        ) : step === 'type' ? (
          <div className="sb-screen">
            <div className="sb-head"><h1 className="sb-h1">What kind of <b>business?</b></h1></div>
            <div className="sb-mid"><div className="sb-grid2">{BUSINESS_TYPES.map((t) => <button key={t.key} type="button" className="sb-tile" aria-pressed={d.business_type === t.key} onClick={() => { patch({ business_type: t.key }); go('where') }}>{t.name}</button>)}</div></div>
          </div>
        ) : step === 'where' ? (
          <div className="sb-screen">
            <div className="sb-head"><h1 className="sb-h1">Where is <b>your business?</b></h1></div>
            <div className="sb-mid">
              <label className="sb-label">Business name<input className="sb-input" value={d.name} maxLength={120} onChange={(e) => patch({ name: e.target.value })} autoComplete="organization" /></label>
              <label className="sb-label">City<input className="sb-input" value={d.city} maxLength={80} onChange={(e) => patch({ city: e.target.value })} autoComplete="address-level2" /></label>
              <div className="sb-label">Country<div className="sb-pills">{COUNTRIES.map((c) => <button key={c.key} type="button" className="sb-pill" aria-pressed={d.country === c.key} onClick={() => patch({ country: c.key })}>{c.name}</button>)}</div></div>
              <label className="sb-label">Website (optional)<input className="sb-input" type="url" inputMode="url" value={d.website} maxLength={300} placeholder="yourbusiness.com" onChange={(e) => patch({ website: e.target.value })} /></label>
            </div>
            <div className="sb-foot"><button type="button" className="sb-btn" disabled={!d.country || d.name.trim().length < 2 || !d.city.trim()} onClick={() => void find()}>{d.country ? 'Find my business' : 'Pick your country'}</button></div>
          </div>
        ) : step === 'which' ? (
          <div className="sb-screen">
            <div className="sb-head"><h1 className="sb-h1">Which one <b>is yours?</b></h1><p className="sb-sub">More than one location? Pick the one you film at.</p></div>
            <div className="sb-mid">
              {matches.slice(0, 4).map((m) => <button key={m.place_id} type="button" className="sb-card" onClick={() => void choose(m)}><b>{m.name}</b><span>{[m.kind, m.address].filter(Boolean).join(' · ')}</span></button>)}
              <p className="sb-note" style={{ fontSize: 13 }}>Business details from Google</p>
            </div>
            <div className="sb-foot"><button type="button" className="sb-quiet" onClick={() => { patch({ place_id: null, address: null, kind: null }); go('confirm') }}>None of these, I’ll type it in</button></div>
          </div>
        ) : step === 'confirm' ? (
          <div className="sb-screen">
            <div className="sb-head"><h1 className="sb-h1">Is this <b>your business?</b></h1>{note && <p className="sb-sub">{note}</p>}</div>
            <div className="sb-mid">
              <div className="sb-card" style={{ cursor: 'default' }}><b style={{ fontSize: 19 }}>{d.name}</b><span>{[d.kind, d.address ?? d.city].filter(Boolean).join(' · ')}</span></div>
              <p className="sb-small">Your videos can mention</p>
              <div className="sb-pills">
                {d.known_for.map((k) => <button key={k} type="button" className="sb-pill" style={{ minHeight: 40, fontSize: 14 }} aria-label={`Remove ${k}`} onClick={() => patch({ known_for: d.known_for.filter((x) => x !== k) })}>{k}<span aria-hidden style={{ color: '#8a8490', fontSize: 17 }}>×</span></button>)}
                {!d.known_for.length && <p className="sb-note" style={{ textAlign: 'left' }}>What are you known for? A best seller, a regular joke, the thing every customer says.</p>}
              </div>
              <form style={{ display: 'flex', gap: 8 }} onSubmit={(e) => { e.preventDefault(); addChip() }}>
                <input className="sb-input" style={{ fontSize: 16, padding: '12px 16px' }} value={chip} maxLength={40} placeholder="Add your own" aria-label="Add something your business is known for" onChange={(e) => setChip(e.target.value)} />
                <button type="submit" className="sb-white" style={{ background: '#1d1a22', color: '#fff', minHeight: 48 }}>Add</button>
              </form>
            </div>
            <div className="sb-foot"><button type="button" className="sb-btn" onClick={() => go(userId ? 'funny' : 'signin')}>Yes, that’s us</button></div>
          </div>
        ) : step === 'signin' ? (
          <div className="sb-screen">
            <div className="sb-head"><h1 className="sb-h1">Save <b>your business</b></h1><p className="sb-sub">So your videos and your week are here tomorrow.</p></div>
            <div className="sb-mid"><SignInButtons where="smallbusiness" onBefore={() => rememberReturnTo('/smallbusiness')} onSignedIn={() => go('funny')} /><SignInLegal /></div>
          </div>
        ) : step === 'funny' ? (
          <div className="sb-screen">
            <div className="sb-head"><h1 className="sb-h1">Pick your <b>kind of funny</b></h1></div>
            <div className="sb-mid">{VOICES.map((v) => <button key={v.key} type="button" className="sb-card" aria-pressed={d.voice === v.key} onClick={() => patch({ voice: v.key })}><b>{v.name}</b></button>)}</div>
            <div className="sb-foot"><button type="button" className="sb-btn" onClick={() => go('look')}>Next</button></div>
          </div>
        ) : step === 'look' ? (
          <div className="sb-screen">
            <div className="sb-head"><h1 className="sb-h1">How should <b>your videos look?</b></h1></div>
            <div className="sb-mid">
              <p className="sb-small">Length</p>
              <div className="sb-grid3">{LENGTHS.map((l) => <button key={l} type="button" className="sb-tile" aria-pressed={d.length === l} onClick={() => patch({ length: l })}>{l} sec</button>)}</div>
              <p className="sb-small" style={{ marginTop: 14 }}>Who’s on camera</p>
              <div className="sb-grid3">{CAMERAS.map((c) => <button key={c.key} type="button" className="sb-tile" aria-pressed={d.camera === c.key} onClick={() => patch({ camera: c.key })}>{c.name}</button>)}</div>
            </div>
            <div className="sb-foot"><button type="button" className="sb-btn" onClick={() => go('code')}>Next</button></div>
          </div>
        ) : step === 'code' ? (
          <div className="sb-screen">
            <div className="sb-head"><h1 className="sb-h1">Want a <b>code word?</b></h1><p className="sb-sub">Customers say it when they come in, so you see who the video brought in.</p></div>
            <div className="sb-mid">
              {OFFERS.map((o) => <button key={o.key} type="button" className="sb-tile" aria-pressed={d.offer === o.key} onClick={() => patch({ offer: o.key })}>{o.name}</button>)}
              {d.offer !== 'none' && <label className="sb-label" style={{ marginTop: 8 }}>{d.offer === 'promotion' ? 'What’s the promotion?' : 'What do they get for free?'}<input className="sb-input" value={d.offer_text} maxLength={80} placeholder={d.offer === 'promotion' ? '10% off…' : 'a free…'} onChange={(e) => patch({ offer_text: e.target.value })} /></label>}
              {note && <p className="sb-err">{note}</p>}
            </div>
            <div className="sb-foot"><button type="button" className="sb-btn" disabled={d.offer !== 'none' && !d.offer_text.trim()} onClick={() => void save()}>Looks good</button></div>
          </div>
        ) : step === 'day' ? (
          <div className="sb-screen">
            <div className="sb-head">{shop && <p className="sb-tag" style={{ marginBottom: 8 }}>Hey, {shop.name}</p>}<h1 className="sb-h1">Anything fun <b>happen today?</b></h1><p className="sb-sub">Crazy customer? Weird order? Those are our favorite.</p></div>
            {dayMode === 'idle' || dayMode === 'listening' ? (
              <>
                <div className="sb-mid" style={{ alignItems: 'center' }}>
                  <div className="sb-mic"><button type="button" className={dayMode === 'listening' ? 'on' : ''} aria-label={dayMode === 'listening' ? 'Stop listening' : 'Tap and tell me what happened'} onClick={mic}><svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></svg></button></div>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{dayMode === 'listening' ? 'I’m listening… tap when you’re done' : 'Tap and tell me'}</p>
                  {note && <p className="sb-err">{note}</p>}
                </div>
                <div className="sb-foot"><div className="sb-grid2"><button type="button" className="sb-white" onClick={() => setDayMode('type')}>Type it</button><button type="button" className="sb-white" onClick={() => { setDay(''); setDayMode('idle'); go('promote') }}>Surprise me</button></div></div>
              </>
            ) : (
              <>
                <div className="sb-mid">
                  {dayMode === 'done' && <p className="sb-tag">Ha. We can work with that.</p>}
                  <textarea className="sb-input" rows={4} maxLength={600} aria-label="What happened" placeholder="A customer…" value={day} onChange={(e) => setDay(e.target.value)} />
                  {note && <p className="sb-err">{note}</p>}
                </div>
                <div className="sb-foot"><button type="button" className="sb-btn" disabled={!day.trim()} onClick={() => go('promote')}>Make it funny</button><button type="button" className="sb-quiet" onClick={() => { setDay(''); setDayMode('idle') }}>Talk instead</button></div>
              </>
            )}
          </div>
        ) : step === 'promote' ? (
          <div className="sb-screen">
            <div className="sb-head"><h1 className="sb-h1">Anything to <b>promote today?</b></h1><p className="sb-sub">Optional. Your video will work it in.</p></div>
            <div className="sb-mid"><input className="sb-input" value={promote} maxLength={120} aria-label="What to promote today" placeholder="Something new, a special, an event" onChange={(e) => setPromote(e.target.value)} />{note && <p className="sb-err">{note}</p>}</div>
            <div className="sb-foot"><button type="button" className="sb-btn" onClick={() => void write()}>Make my skits</button><button type="button" className="sb-quiet" onClick={() => { setPromote(''); void write() }}>Skip</button></div>
          </div>
        ) : step === 'pick' && set ? (
          <div className="sb-screen">
            <div className="sb-head"><h1 className="sb-h1">Pick <b>today’s skit</b></h1></div>
            <div className="sb-mid">
              {set.skits.map((s, i) => <button key={i} type="button" className="sb-card" onClick={() => void pick(i)}><p className="src">{SOURCE_LABEL[s.source]}</p><b className="title">{s.title}</b><span style={{ fontSize: 15 }}>{s.pitch}</span></button>)}
              {note && <p className="sb-note">{note}</p>}
            </div>
            <div className="sb-foot"><button type="button" className="sb-quiet" onClick={() => void write(set.id)}>Show 3 different ones</button></div>
          </div>
        ) : step === 'lines' && skit && line ? (
          <div className="sb-screen">
            <div className="sb-head"><h1 className="sb-h1">Make it <b>sound like you</b></h1></div>
            <div className="sb-mid">
              <p className="sb-tag">Line {li + 1} of {lines.length} · {line.label}</p>
              {editing !== null ? (
                <textarea className="sb-input" rows={4} maxLength={200} aria-label="Edit this line" value={editing} onChange={(e) => setEditing(e.target.value)} />
              ) : options ? (
                <>{options.map((o) => <button key={o} type="button" className="sb-card" onClick={() => void keep(o, 'funnier')}><b style={{ fontWeight: 500 }}>{o}</b></button>)}<button type="button" className="sb-quiet" onClick={() => setOptions(null)}>Keep mine</button></>
              ) : (
                <p className="sb-line">{line.text}</p>
              )}
              {note && <p className="sb-err">{note}</p>}
              {!options && (
                <div className="sb-grid2">
                  <button type="button" className="sb-white" style={{ color: '#8e1043', fontWeight: 700 }} disabled={line.key === 'code' || editing !== null} onClick={() => void funnier()}>Funnier</button>
                  <button type="button" className="sb-white" onClick={() => (editing !== null ? (editing.trim() && editing.trim() !== line.text ? void keep(editing.trim(), 'edit') : setEditing(null)) : setEditing(line.text))}>{editing !== null ? 'Done' : 'Edit'}</button>
                </div>
              )}
            </div>
            <div className="sb-foot"><button type="button" className="sb-btn" disabled={editing !== null || !!options} onClick={nextLine}>{li + 1 >= lines.length ? 'Looks good, film it' : 'Looks good'}</button>{li + 1 < lines.length && <button type="button" className="sb-quiet" onClick={() => go('film')}>Keep the rest, go film</button>}</div>
          </div>
        ) : step === 'film' && set && skit ? (
          <Film
            setId={set.id}
            title={skit.title}
            actions={skit.shots.map((s) => s.action)}
            texts={{
              hook: lines.find((l) => l.key === 'hook')?.text ?? skit.hook,
              shots: [1, 2, 3].map((n) => lines.find((l) => l.key === `shot${n}`)?.text ?? skit.shots[n - 1]?.text ?? ''),
              end: lines.find((l) => l.key === 'code')?.text ?? shop?.name ?? '',
              endSmall: lines.some((l) => l.key === 'code') ? shop?.name ?? '' : shop?.city ?? '',
              // Free's videos carry the shutap.com mark, like every free download
              marked: !usage || usage.tier === 'free',
            }}
            camera={shop?.camera ?? d.camera}
            length={shop?.length ?? d.length}
            onDone={(v) => { if (v) setMade(true); go('done') }}
            onBack={() => go('lines')}
          />
        ) : step === 'done' ? (
          <div className="sb-screen">
            <div className="sb-head">{made ? <><h1 className="sb-h1">That’s <b>today’s video</b></h1><p className="sb-sub">Post it while it’s fresh. Come back when something else happens.</p></> : <><h1 className="sb-h1">Your skit <b>is saved</b></h1><p className="sb-sub">Film it whenever you’re ready. It will be waiting here today.</p></>}</div>
            <div className="sb-mid">{skit && <div className="sb-card" style={{ cursor: 'default' }}><p className="src">TODAY’S SKIT</p><b className="title">{skit.title}</b><span style={{ fontSize: 15 }}>{skit.pitch}</span></div>}</div>
            <div className="sb-foot">{!made && <button type="button" className="sb-btn" onClick={() => go('film')}>Film it now</button>}<button type="button" className="sb-quiet" onClick={() => { setDay(''); setDayMode('idle'); setPromote(''); go('day') }}>Start another skit</button></div>
          </div>
        ) : step === 'limit' ? (
          <div className="sb-screen">
            <div className="sb-head">{free ? <><h1 className="sb-h1">That’s your <b>3 free videos</b></h1><p className="sb-sub">They stay yours to download. Pick a plan to keep going.</p></> : <><h1 className="sb-h1">Today’s video <b>is done</b></h1><p className="sb-sub">A new one unlocks tomorrow.</p></>}</div>
            <div className="sb-mid">
              <div style={{ alignSelf: 'center' }}><RisingIcons variant="week" posted={5} label={free ? 'All three free videos used' : 'Today’s video made'} /></div>
              {free && <div className="sb-card" aria-pressed="true" style={{ cursor: 'default' }}><b>Basic · {usd(PLANS.basic.amount)} / month</b><span>1 new video every day, just you</span></div>}
            </div>
            <div className="sb-foot">{free ? <Link to="/pricing" className="sb-btn" onClick={() => ev('sb_limit_cta', { tier: 'free' })}>Choose Basic</Link> : <Link to="/creations" className="sb-btn">My creations</Link>}</div>
          </div>
        ) : step === 'crisis' ? (
          <div className="sb-screen">
            <div className="sb-mid">
              <div className="sb-crisis">
                <h1 className="sb-h1" style={{ fontSize: 22 }}><b>This sounds heavy. Talk to a person now, free, any hour.</b></h1>
                <ul><li>US: call or text 988</li><li>UK &amp; Ireland: Samaritans 116 123</li><li>US: text HOME to 741741</li><li>Elsewhere: findahelpline.com</li></ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="sb-screen"><div className="sb-mid" style={{ alignItems: 'center' }}><LoadingDots label="Loading" /></div></div>
        )}
      </div>
    </div>
  )
}
