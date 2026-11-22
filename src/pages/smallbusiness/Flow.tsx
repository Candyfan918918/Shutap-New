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
import { countCodeWord, deleteMyVideo, findMyShop, getMyWeek, setShopReminder, getMyCreations, getMyShop, getMySkits, keepSkitLine, pickMyShop, pickMySkit, saveMyShop, touchMySkitLine, writeMySkits, type Creation, type MyWeek, type Shop, type SkitSet } from '@/lib/shops.functions'
import { WEEK_GOAL, BUSINESS_TYPES, CAMERAS, COUNTRIES, DEFAULT_LENGTH, LENGTHS, OFFERS, VOICES, type BusinessType, type Camera, type Country, type Length, type Offer, type Voice } from '@/lib/shops/shop'
import { SOURCE_LABEL, skitLines, type LineKey } from '@/lib/shops/skit'
import type { ShopMatch } from '@/lib/shops/places.server'
import type { ShopUsage } from '@/lib/shops/allowance'
import { PLANS, usd } from '@/lib/pricing'
import { RisingIcons } from './RisingIcons'
import { Film, fileName, give } from './Film'
import { DeskGate, isDesk } from './Desk'
import { amIAdmin } from '@/lib/admin.functions'
import './smallbusiness.css'

type Step = 'welcome' | 'type' | 'where' | 'which' | 'confirm' | 'signin' | 'funny' | 'look' | 'code' | 'day' | 'promote' | 'pick' | 'lines' | 'film' | 'done' | 'creations' | 'week' | 'limit' | 'crisis'

/** The order the top-corner icons fill in (15 icons across the whole product;
 *  filming and after take the rest). */
const PROGRESS: Record<Step, number> = { welcome: 0, type: 1, where: 2, which: 3, confirm: 3, signin: 4, funny: 5, look: 6, code: 7, day: 8, promote: 9, pick: 10, lines: 11, film: 12, done: 13, creations: 13, week: 13, limit: 10, crisis: 8 }
const BACK: Partial<Record<Step, Step>> = { type: 'welcome', where: 'type', which: 'where', confirm: 'where', signin: 'confirm', funny: 'confirm', look: 'funny', code: 'look', promote: 'day', pick: 'day', lines: 'pick', film: 'lines', creations: 'day', week: 'day', limit: 'day', crisis: 'day' }

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
  /** a logo photo the owner just picked on this phone (small data: image) */
  logo: string | null
}
const EMPTY: Draft = { step: 'welcome', business_type: null, name: '', city: '', country: null, website: '', place_id: null, address: null, kind: null, known_for: [], voice: 'warm', length: DEFAULT_LENGTH, camera: 'me', offer: 'freebie', offer_text: '', logo: null }

/** A photo from the phone, made small enough to keep: 256 px at most, the
 *  whole picture kept (never cropped), see-through corners left as they are. */
async function smallLogo(file: File): Promise<string | null> {
  try {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.src = url
    await img.decode()
    const k = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(img.naturalWidth * k))
    c.height = Math.max(1, Math.round(img.naturalHeight * k))
    const x = c.getContext('2d')!
    x.imageSmoothingQuality = 'high'
    x.drawImage(img, 0, 0, c.width, c.height)
    URL.revokeObjectURL(url)
    let out = c.toDataURL('image/png')
    if (out.length > 200_000) { x.globalCompositeOperation = 'destination-over'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); out = c.toDataURL('image/jpeg', 0.85) }
    return out.length <= 200_000 ? out : null
  } catch { return null }
}
const DRAFT_KEY = 'shutap_sb_draft'
const AFTER_SETUP: Step[] = ['day', 'promote', 'pick', 'lines', 'film', 'done', 'creations', 'week', 'limit', 'crisis']
const AFTER_SIGNIN: Step[] = ['funny', 'look', 'code', ...AFTER_SETUP]

function readDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) }
  } catch { /* a draft is a convenience, never required */ }
  return EMPTY
}

const ev = (name: string, props: Record<string, unknown> = {}) => { void trackEvent(name, { product: 'smallbusiness', ...props }) }

type Recognizer = { start: () => void; stop: () => void; onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: ((e: any) => void) | null; onaudiostart: (() => void) | null; onsoundstart: (() => void) | null; onsoundend: (() => void) | null; onspeechstart: (() => void) | null; onspeechend: (() => void) | null; lang: string; interimResults: boolean; continuous: boolean }
function recognizer(): Recognizer | null {
  const w = window as any
  const R = w.SpeechRecognition ?? w.webkitSpeechRecognition
  if (!R) return null
  try { return new R() as Recognizer } catch { return null }
}

const WRITING = 'Writing your three skits…'
/** What is happening while the skits are written, in the order it happens. */
const WAIT_STEPS = ['Reading what you said', 'Two writers are drafting three skits each', 'Checking every line against your business', 'Picking the funnier ones']
/** Usually done in under this many seconds (measured Nov 21 2026: 6 to 20). */
const WAIT_SECONDS = 30

/** The wait for the skits (Candy, Nov 21 2026: show progress or the wait, or
 *  people leave here): what is happening now, how long it usually takes, and
 *  a bar that moves. The bar is an honest estimate from the clock, and never
 *  reaches the end before the skits do. */
export function SkitWait() {
  const [s, setS] = useState(0)
  useEffect(() => { const t0 = Date.now(); const id = window.setInterval(() => setS((Date.now() - t0) / 1000), 250); return () => window.clearInterval(id) }, [])
  const part = Math.min(0.94, 1 - Math.exp(-s / (WAIT_SECONDS / 2.6)))
  const at = Math.min(WAIT_STEPS.length - 1, Math.floor((s / WAIT_SECONDS) * WAIT_STEPS.length))
  return (
    <div className="sb-screen">
      <div className="sb-head"><h1 className="sb-h1">Writing your <b>three skits</b></h1><p className="sb-sub">{s < WAIT_SECONDS ? `Usually under ${WAIT_SECONDS} seconds. Keep this screen open.` : 'Taking longer than usual. Still working, keep this screen open.'}</p></div>
      <div className="sb-mid">
        <div className="sb-waitbar" role="progressbar" aria-label="Writing your three skits" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(part * 100)}><i style={{ width: `${part * 100}%` }} /></div>
        <ol className="sb-waitsteps">{WAIT_STEPS.map((w, i) => <li key={w} className={i < at ? 'done' : i === at ? 'on' : ''}>{w}</li>)}</ol>
        <p className="sb-note" aria-live="off">{Math.floor(s)} seconds</p>
      </div>
    </div>
  )
}

export function SmallBusinessFlow({ onStep }: { /** told which screen is showing ('desk' for the computer screen), so the page can show its information only under the first one */ onStep?: (at: string) => void } = {}) {
  // a computer gets the send-to-your-phone screen (admins may carry on)
  const [desk, setDesk] = useState<'unknown' | 'desk' | 'phone'>('unknown')
  const [admin, setAdmin] = useState(false)
  useEffect(() => {
    const d = isDesk()
    setDesk(d ? 'desk' : 'phone')
    if (d) void amIAdmin().then((a) => setAdmin(Boolean(a))).catch(() => {})
  }, [])
  const { userId, ready } = useCurrentAlias()
  const [d, setD] = useState<Draft>(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const [shop, setShop] = useState<Shop | null>(null)
  const [matches, setMatches] = useState<ShopMatch[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [chip, setChip] = useState('')
  const [day, setDay] = useState('')
  const [dayMode, setDayMode] = useState<'idle' | 'listening' | 'type' | 'done' | 'micoff'>('idle')
  const [week, setWeek] = useState<MyWeek | null>(null)
  const [creations, setCreations] = useState<Creation[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [askDelete, setAskDelete] = useState<string | null>(null)
  const [live, setLive] = useState('')
  const [loud, setLoud] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const micStop = useRef(false)
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
  useEffect(() => { onStep?.(desk === 'desk' ? 'desk' : desk === 'unknown' ? 'welcome' : step) }, [desk, step, onStep])
  const go = (s: Step) => { setNote(null); setD((x) => ({ ...x, step: s })); ev('sb_step', { step: s }) }
  const patch = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))

  // the draft comes back after a sign-in round trip, and is saved as it changes
  useEffect(() => {
    let draft = readDraft()
    // from a guide or funniest page (Nov 21 2026): ?name= and ?city= come in
    // already typed; the owner starts at the kind of business
    try {
      const q = new URLSearchParams(window.location.search)
      const name = (q.get('name') ?? '').trim().slice(0, 120)
      const city = (q.get('city') ?? '').trim().slice(0, 80)
      if (name || city) {
        const early: Step[] = ['welcome', 'type', 'where', 'which', 'confirm']
        draft = { ...draft, ...(name ? { name, place_id: null, address: null, kind: null } : {}), ...(city ? { city } : {}), step: early.includes(draft.step) ? 'type' : draft.step }
        ev('sb_prefilled', { name: !!name, city: !!city })
        try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) } catch { /* noop */ }
        q.delete('name'); q.delete('city')
        const rest = q.toString()
        window.history.replaceState(window.history.state, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash)
      }
    } catch { /* a prefilled name is a convenience */ }
    setD(draft); setLoaded(true)
  }, [])
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
        void loadWeek()
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
    // what the listing and its reviews mention goes in as a start; the owner removes what is wrong
    const known = [...d.known_for, ...(r?.ok ? r.suggested : [])].filter((k, i, a) => a.findIndex((x) => x.toLowerCase() === k.toLowerCase()) === i).slice(0, 12)
    patch({ place_id: s.place_id, name: s.name, address: s.address, kind: s.kind, website: d.website || s.website || '', known_for: known })
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
    const r = await saveMyShop({ data: { shop: { place_id: d.place_id, name: d.name.trim(), city: d.city.trim(), country: d.country, address: d.address, kind: d.kind, website: d.website.trim() || null, business_type: d.business_type, known_for: d.known_for, voice: d.voice, length: d.length, camera: d.camera, offer: d.offer, offer_text: d.offer_text.trim(), logo: d.logo } } }).catch(() => null)
    setBusy(null)
    if (!r?.ok) { setNote(r?.reason === 'sign_in' ? 'Please sign in first.' : 'That didn’t save. Try again.'); if (r?.reason === 'sign_in') go('signin'); return }
    setShop(r.shop)
    patch({ logo: null })
    go('day')
  }

  // The phone's own speech-to-text. On iPhone it stops itself after a short
  // quiet, so while the owner has not tapped stop we start it again and keep
  // what was already heard. The words show as they are heard, and the bars
  // move only when the phone reports sound: that is the proof it works.
  /** A returning owner changes their business, logo or choices: the saved
   *  business goes back into the setup screens, starting at "Is this your
   *  business?". */
  function editBusiness() {
    if (!shop) return
    setD((x) => ({ ...x, business_type: shop.business_type, name: shop.name, city: shop.city, country: shop.country, website: shop.website ?? '', place_id: shop.place_id, address: shop.address, kind: shop.kind, known_for: shop.known_for, voice: shop.voice, length: shop.length, camera: shop.camera, offer: shop.offer, offer_text: shop.offer_text, logo: null }))
    ev('sb_edit_business')
    go('confirm')
  }

  async function pickLogo(file: File | undefined) {
    if (!file) return
    const small = await smallLogo(file)
    if (!small) { setNote('That picture didn’t work. Try another one.'); return }
    setNote(null)
    patch({ logo: small })
    ev('sb_logo_picked')
  }

  async function loadWeek() {
    const r = await getMyWeek({ data: {} }).catch(() => null)
    if (r?.week) setWeek(r.week)
  }
  function openWeek() { go('week'); void loadWeek(); ev('sb_week') }
  async function codeSaid(by: 1 | -1) {
    if (!week) return
    setWeek({ ...week, code_says: Math.max(0, week.code_says + by) })
    const r = await countCodeWord({ data: { by } }).catch(() => null)
    if (r?.ok) setWeek((w) => (w ? { ...w, code_says: r.code_says } : w))
  }
  async function remindMe(on: boolean) {
    if (!week) return
    setWeek({ ...week, remind: on })
    const r = await setShopReminder({ data: { on } }).catch(() => null)
    setWeek((w) => (w ? { ...w, remind: r?.ok ? r.remind : !on } : w))
    ev('sb_remind', { on })
  }

  async function openCreations() {
    go('creations')
    setCreations(null)
    const r = await getMyCreations({ data: {} }).catch(() => null)
    setCreations(r?.ok ? r.videos : [])
    ev('sb_creations', { n: r?.videos.length ?? 0 })
  }
  async function downloadCreation(v: Creation) {
    if (!v.url || !v.ext) return
    setBusyId(v.id)
    try {
      const blob = await fetch(v.url).then((r) => (r.ok ? r.blob() : Promise.reject(new Error('gone'))))
      const how = await give(blob, fileName(v.title, v.ext))
      if (how !== 'cancelled') ev('sb_creation_saved', { how })
    } catch { setNote('That video didn’t download. Try again.') }
    setBusyId(null)
  }
  async function removeCreation(v: Creation) {
    if (askDelete !== v.id) { setAskDelete(v.id); return }
    setBusyId(v.id)
    const r = await deleteMyVideo({ data: { video_id: v.id } }).catch(() => null)
    if (r?.ok) setCreations((c) => (c ?? []).filter((x) => x.id !== v.id))
    else setNote('That didn’t delete. Try again.')
    setAskDelete(null)
    setBusyId(null)
  }

  function mic() {
    if (dayMode === 'listening') { micStop.current = true; rec.current?.stop(); return }
    micStop.current = false
    const kept: string[] = []
    let tries = 0
    let blocked = false
    const began = Date.now()
    const finish = () => {
      const heard = kept.join(' ').replace(/\s+/g, ' ').trim()
      setLive(''); setLoud(false); setMicOn(false)
      if (heard) { setDay(heard.slice(0, 600)); setDayMode('done'); ev('sb_mic', { how: 'heard' }) }
      else { setDayMode((m) => (m === 'listening' ? 'idle' : m)); setNote('I didn’t hear anything. Tap and try again, or type it.'); ev('sb_mic', { how: 'silent' }) }
    }
    const listen = () => {
      const r = recognizer()
      if (!r) { setDayMode('type'); ev('sb_mic', { how: 'unsupported' }); return }
      rec.current = r
      r.lang = 'en-US'; r.interimResults = true; r.continuous = true
      let done = ''
      let part = ''
      r.onaudiostart = () => setMicOn(true)
      r.onsoundstart = () => setLoud(true)
      r.onspeechstart = () => setLoud(true)
      r.onsoundend = () => setLoud(false)
      r.onspeechend = () => setLoud(false)
      r.onresult = (e) => {
        done = ''; part = ''
        for (const x of Array.from(e.results as ArrayLike<any>)) { const t = x[0]?.transcript ?? ''; if (x.isFinal) done += ' ' + t; else part += ' ' + t }
        setMicOn(true); setLoud(true)
        setLive([...kept, done, part].join(' ').replace(/\s+/g, ' ').trim())
      }
      r.onerror = (e) => {
        const why = String(e?.error ?? '')
        if (why === 'not-allowed' || why === 'service-not-allowed' || why === 'audio-capture') { blocked = true; micStop.current = true; setLive(''); setLoud(false); setMicOn(false); setDayMode('micoff'); setNote(null); ev('sb_mic', { how: 'blocked', why }) }
      }
      r.onend = () => {
        if (blocked) return
        const got = (done + ' ' + part).trim()
        if (got) kept.push(got)
        if (!micStop.current && tries < 8 && Date.now() - began < 60000) { tries += 1; try { listen(); return } catch { /* fall through */ } }
        finish()
      }
      r.start()
    }
    try { listen(); setDayMode('listening'); setNote(null); setLive('') } catch { setDayMode('type') }
  }

  async function write(again?: string) {
    setBusy(WRITING)
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

  async function keep(text: string, how: 'edit' | 'funnier', at = li) {
    const line = lines[at]
    if (!set || !line) return
    const r = await keepSkitLine({ data: { set_id: set.id, key: line.key as LineKey, text, how } }).catch(() => null)
    if (r?.ok) { setSet(r.set); setEditing(null); setOptions(null); setNote(null); return }
    setNote(r && !r.ok && r.reason === 'rule' && r.rule ? `That line needs a change: ${r.rule}.` : 'That didn’t save. Try again.')
  }

  async function funnier(at = li) {
    const line = lines[at]
    setLi(at); setEditing(null); setOptions(null); setNote(null)
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

  if (desk === 'desk') return <DeskGate admin={admin} name={d.name} city={d.city} onContinue={() => setDesk('phone')} />

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
          busy === WRITING ? <SkitWait /> : <div className="sb-screen"><div className="sb-mid" style={{ alignItems: 'center' }}><LoadingDots label={busy} /><p className="sb-small">{busy}</p></div></div>
        ) : step === 'welcome' ? (
          <div className="sb-screen">
            <div className="sb-hero"><RisingIcons variant="hero" /></div>
            <div className="sb-sheet">
              <p className="sb-eyebrow">SAY IT FUNNIER</p>
              <h1 className="sb-h1" style={{ marginBottom: 26 }}>The <b>creative team</b> your small business doesn’t have.</h1>
              <button type="button" className="sb-btn" style={{ alignSelf: 'stretch' }} onClick={() => go('type')}>Make my first video</button>
              <p className="sb-note" style={{ marginTop: 16 }}>First 3 videos free · <a href="#how" className="sb-link" onClick={() => ev('sb_how_link')}>how it works</a></p>
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
              {d.place_id && d.known_for.length > 0 && <p className="sb-note" style={{ textAlign: 'left', margin: 0 }}>From your Google listing. Tap any that are wrong to remove them.</p>}
              <div className="sb-pills">
                {d.known_for.map((k) => <button key={k} type="button" className="sb-pill" style={{ minHeight: 40, fontSize: 14 }} aria-label={`Remove ${k}`} onClick={() => patch({ known_for: d.known_for.filter((x) => x !== k) })}>{k}<span aria-hidden style={{ color: '#8a8490', fontSize: 17 }}>×</span></button>)}
                {!d.known_for.length && <p className="sb-note" style={{ textAlign: 'left' }}>What are you known for? A best seller, a regular joke, the thing every customer says.</p>}
              </div>
              <form style={{ display: 'flex', gap: 8 }} onSubmit={(e) => { e.preventDefault(); addChip() }}>
                <input className="sb-input" style={{ fontSize: 16, padding: '12px 16px' }} value={chip} maxLength={40} placeholder="Add your own" aria-label="Add something your business is known for" onChange={(e) => setChip(e.target.value)} />
                <button type="submit" className="sb-white" style={{ background: '#1d1a22', color: '#fff', minHeight: 48 }}>Add</button>
              </form>
            </div>
            <div className="sb-logo">
              <div className="pic" aria-hidden>{(d.logo ?? shop?.logo) ? <img src={(d.logo ?? shop?.logo)!} alt="" /> : <span>Logo</span>}</div>
              <div className="how">
                <b>Your logo, at the end of every video</b>
                <label className="sb-label" style={{ gap: 6 }}>Website<input className="sb-input" style={{ fontSize: 16, padding: '12px 16px' }} type="url" inputMode="url" value={d.website} maxLength={300} placeholder="yourbusiness.com" onChange={(e) => patch({ website: e.target.value })} /></label>
                <p className="sb-note" style={{ textAlign: 'left', margin: 0 }}>{d.logo ? 'Using the photo you picked.' : shop?.logo_from === 'upload' ? 'Using your own photo.' : 'We fetch your logo from your website when you save.'}</p>
                <label className="sb-white sb-file">{d.logo || shop?.logo_from === 'upload' ? 'Pick a different photo' : 'Or use a photo from this phone'}<input type="file" accept="image/*" onChange={(e) => { void pickLogo(e.target.files?.[0]); e.target.value = '' }} /></label>
              </div>
            </div>
            <div className="sb-foot"><button type="button" className="sb-btn" onClick={() => go(userId ? 'funny' : 'signin')}>Yes, that’s us</button>{!d.place_id && note && <button type="button" className="sb-quiet" onClick={() => { setNote(null); go('where') }}>Try another name</button>}</div>
          </div>
        ) : step === 'signin' ? (
          <div className="sb-screen">
            <div className="sb-head"><h1 className="sb-h1">Sign in <b>free</b></h1><p className="sb-sub">It saves your business, so your skits and videos are here tomorrow.</p><ul className="sb-free"><li>Free to sign in</li><li>No card</li><li>First 3 videos free</li></ul></div>
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
            <div className="sb-head">{shop && <p className="sb-tag" style={{ marginBottom: 8 }}>Hey, {shop.name} · <button type="button" className="sb-link" onClick={editBusiness}>edit business</button> · <button type="button" className="sb-link" onClick={() => void openCreations()}>my creations</button></p>}{shop && week && <button type="button" className="sb-weekchip" onClick={openWeek}>{week.badge ? `${week.posted} this week · badge earned` : `${week.posted} of ${WEEK_GOAL} this week`}</button>}<h1 className="sb-h1">Anything fun <b>happen today?</b></h1><p className="sb-sub">Crazy customer? Weird order? Those are our favorite.</p></div>
            {dayMode === 'micoff' ? (
              <>
                <div className="sb-mid">
                  <p className="sb-tag">Your mic is off. Turn it on, or just type what happened.</p>
                  <div className="sb-card" style={{ cursor: 'default' }}><p className="src">IPHONE</p><span style={{ color: '#1d1a22', fontSize: 15 }}>Open Settings, find Safari, and set Camera and Microphone to Allow.</span></div>
                  <div className="sb-card" style={{ cursor: 'default' }}><p className="src">ANDROID</p><span style={{ color: '#1d1a22', fontSize: 15 }}>Tap the icon beside the web address, then Permissions, and allow Camera and Microphone.</span></div>
                </div>
                <div className="sb-foot"><button type="button" className="sb-btn" onClick={() => setDayMode('type')}>Type it instead</button><button type="button" className="sb-quiet" onClick={() => { setDayMode('idle'); mic() }}>Try the mic again</button></div>
              </>
            ) : dayMode === 'idle' || dayMode === 'listening' ? (
              <>
                <div className="sb-mid" style={{ alignItems: 'center' }}>
                  <div className="sb-mic"><button type="button" className={dayMode === 'listening' ? 'on' : ''} aria-label={dayMode === 'listening' ? 'Stop listening' : 'Tap and tell me what happened'} onClick={mic}><svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></svg></button></div>
                  {dayMode === 'listening' && <div className={'sb-wave' + (loud ? ' loud' : '') + (micOn ? ' live' : '')} aria-hidden>{[0, 1, 2, 3, 4, 5, 6].map((i) => <i key={i} style={{ animationDelay: `${i * 0.09}s` }} />)}</div>}
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{dayMode !== 'listening' ? 'Tap and tell me' : loud ? 'I hear you… tap when you’re done' : micOn ? 'Mic is on. Go ahead.' : 'Turning on your mic…'}</p>
                  {dayMode === 'listening' && live && <p className="sb-heard" aria-live="polite">{live}</p>}
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
            <div className="sb-head"><h1 className="sb-h1">Make it <b>sound like you</b></h1><p className="sb-sub">Every line of your video. Change any of them, or film it as it is.</p></div>
            {/* all the lines on one screen (Candy, Nov 21 2026); the list scrolls when it is long */}
            <div className="sb-mid top sb-lines">
              {lines.map((l, i) => {
                const on = i === li
                return (
                  <div key={l.key} className="sb-card sb-linecard" style={{ cursor: 'default' }}>
                    <p className="src">{l.label.toUpperCase()}</p>
                    {on && editing !== null ? (
                      <textarea className="sb-input" rows={3} maxLength={200} aria-label={`Edit ${l.label}`} value={editing} onChange={(e) => setEditing(e.target.value)} />
                    ) : on && options ? (
                      <>{options.map((o) => <button key={o} type="button" className="sb-opt" onClick={() => void keep(o, 'funnier', i)}>{o}</button>)}<button type="button" className="sb-quiet" onClick={() => setOptions(null)}>Keep mine: {l.text}</button></>
                    ) : (
                      <b className="say">{l.text}</b>
                    )}
                    {on && note && <p className="sb-err">{note}</p>}
                    {!(on && options) && (
                      <div className="sb-grid2">
                        <button type="button" className="sb-white" style={{ color: '#8e1043', fontWeight: 700 }} disabled={l.key === 'code' || (on && editing !== null)} onClick={() => void funnier(i)}>Funnier</button>
                        <button type="button" className="sb-white" onClick={() => { if (on && editing !== null) { if (editing.trim() && editing.trim() !== l.text) void keep(editing.trim(), 'edit', i); else setEditing(null) } else { setLi(i); setOptions(null); setNote(null); setEditing(l.text) } }}>{on && editing !== null ? 'Done' : 'Edit'}</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="sb-foot"><button type="button" className="sb-btn" disabled={editing !== null || !!options} onClick={() => go('film')}>Looks good, film it</button></div>
          </div>
        ) : step === 'film' && set && skit ? (
          <Film
            setId={set.id}
            title={skit.title}
            actions={skit.shots.map((s) => s.action)}
            texts={{
              hook: lines.find((l) => l.key === 'hook')?.text ?? skit.hook,
              shots: [1, 2, 3].map((n) => lines.find((l) => l.key === `shot${n}`)?.text ?? skit.shots[n - 1]?.text ?? ''),
              name: shop?.name ?? d.name,
              place: shop?.address ?? shop?.city ?? '',
              code: lines.find((l) => l.key === 'code')?.text ?? '',
              logo: shop?.logo ?? null,
              // no Shutap mark on any plan's video (Candy, Nov 21 2026): it is the owner's video
              marked: false,
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
            <div className="sb-foot">{!made && <button type="button" className="sb-btn" onClick={() => go('film')}>Film it now</button>}<button type="button" className="sb-quiet" onClick={() => { setDay(''); setDayMode('idle'); setPromote(''); go('day') }}>Start another skit</button>{made && <button type="button" className="sb-quiet" onClick={openWeek}>See my week</button>}{made && <button type="button" className="sb-quiet" onClick={() => void openCreations()}>My creations</button>}</div>
          </div>
        ) : step === 'creations' ? (
          <div className="sb-screen">
            <div className="sb-head"><h1 className="sb-h1">My <b>creations</b></h1><p className="sb-sub">We keep each video for 30 days, then delete it. Download the ones you want to keep.</p></div>
            <div className="sb-mid top">
              {creations === null ? <p className="sb-note">One moment…</p> : !creations.length ? <p className="sb-note">No videos yet. Your next one will be kept here.</p> : creations.map((v) => (
                <div key={v.id} className="sb-card sb-made" style={{ cursor: 'default' }}>
                  <b>{v.title || 'Your video'}</b>
                  <span className={v.deletes.soon ? 'soon' : ''}>{v.deletes.text}</span>
                  <div className="sb-grid2">
                    <button type="button" className="sb-white" disabled={!v.url || busyId === v.id} onClick={() => void downloadCreation(v)}>{v.url ? (busyId === v.id ? 'One moment…' : 'Download') : 'Not kept here'}</button>
                    <button type="button" className="sb-white" disabled={busyId === v.id} onClick={() => void removeCreation(v)}>{askDelete === v.id ? 'Yes, delete it' : 'Delete'}</button>
                  </div>
                </div>
              ))}
              {note && <p className="sb-err">{note}</p>}
            </div>
            <div className="sb-foot"><p className="sb-note">Only you can see these. <a href="/privacy" style={{ color: 'inherit' }}>Privacy</a></p><button type="button" className="sb-quiet" onClick={() => go('day')}>Back</button></div>
          </div>
        ) : step === 'week' ? (
          <div className="sb-screen">
            <div className="sb-head"><h1 className="sb-h1">Your <b>week</b></h1><p className="sb-sub">{!week ? 'One moment…' : week.badge ? 'Five videos this week. That’s the badge.' : week.goalMet ? `Goal met. ${week.toBadge} more for this week’s badge.` : `${week.toGoal} more to reach this week’s goal of ${WEEK_GOAL}.`}</p></div>
            <div className="sb-mid">
              <div style={{ alignSelf: 'center' }}><RisingIcons variant="week" posted={week?.posted ?? 0} label={`${week?.posted ?? 0} videos saved to post this week`} /></div>
              {week?.badge && <div className="sb-badge" role="img" aria-label="This week’s badge">★ 5 in a week</div>}
              <p className="sb-note">A video counts when you save it to post. A new week starts Monday.</p>
              {week?.has_code && (
                <div className="sb-card sb-tally" style={{ cursor: 'default' }}>
                  <div><b>Customers who said the code word</b><span>Tap + each time someone says it.</span></div>
                  <div className="row"><button type="button" aria-label="One fewer" disabled={!week.code_says} onClick={() => void codeSaid(-1)}>−</button><output aria-live="polite">{week.code_says}</output><button type="button" aria-label="One more" onClick={() => void codeSaid(1)}>+</button></div>
                </div>
              )}
              {week && (
                <label className="sb-card sb-switch" style={{ cursor: 'pointer' }}>
                  <div><b>Remind me tomorrow</b><span>One email in the morning to your sign-up address, on days you haven’t made a video. Turn it off here any time.</span></div>
                  <input type="checkbox" role="switch" checked={week.remind} onChange={(e) => void remindMe(e.target.checked)} />
                </label>
              )}
            </div>
            <div className="sb-foot"><button type="button" className="sb-btn" onClick={() => go('day')}>Make a video</button><button type="button" className="sb-quiet" onClick={() => void openCreations()}>My creations</button></div>
          </div>
        ) : step === 'limit' ? (
          <div className="sb-screen">
            <div className="sb-head">{free ? <><h1 className="sb-h1">That’s your <b>3 free videos</b></h1><p className="sb-sub">They stay yours to download. Pick a plan to keep going.</p></> : <><h1 className="sb-h1">Today’s video <b>is done</b></h1><p className="sb-sub">A new one unlocks tomorrow.</p></>}</div>
            <div className="sb-mid">
              <div style={{ alignSelf: 'center' }}><RisingIcons variant="week" posted={5} label={free ? 'All three free videos used' : 'Today’s video made'} /></div>
              {free && <div className="sb-card" aria-pressed="true" style={{ cursor: 'default' }}><b>Basic · {usd(PLANS.basic.amount)} / month</b><span>1 new video every day, just you</span></div>}
            </div>
            <div className="sb-foot">{free ? <><Link to="/pricing" className="sb-btn" onClick={() => ev('sb_limit_cta', { tier: 'free' })}>Choose Basic</Link><button type="button" className="sb-quiet" onClick={() => void openCreations()}>Not now</button></> : <><button type="button" className="sb-btn" onClick={openWeek}>See my week</button><button type="button" className="sb-quiet" onClick={() => void openCreations()}>My creations</button></>}</div>
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
