/* Shutap for Realtors, the kit page (Nov 6 2026).
 *   1. paste the listing link (or the listing text) → the facts read back
 *   2. the one thing about it, tone, roast toggles, must-say / never-say
 *   3. write the kit → KitView (copy, PDF, shoot mode, edits, rewrite)
 * ?kit=<id> opens a kit already written. Signed in only; a guest sees the
 * box and is sent to sign in on the first write, the link kept for after. */
import type React from 'react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useCurrentAlias } from '@/hooks/use-current-alias'
import { getRealtorKit, listMyKits, readListing, writeRealtorKit, type KitSummary, type KitUsage, type KitView as KitData } from '@/lib/realtors.functions'
import { DEFAULT_LISTING_CONTROLS, TONES, TONE_LABEL, listingFacts, type Listing, type ListingControls, type Tone } from '@/lib/realtors/listing'
import { KIT_ONCE, PLANS, usd } from '@/lib/pricing'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { getStripe, getStripeEnvironment } from '@/lib/stripe'
import { confirmKitPrepay, createKitCheckout, createKitPrepayCheckout, kitPaidStatus } from '@/lib/payments.functions'
import { setDurableReturn } from '@/lib/auth-guard'
import { trackEvent } from '@/lib/tracking'
import { phCapture } from '@/lib/posthog'
import { KitView } from './KitView'
import './realtors.css'

const DRAFT_KEY = 'shutap_realtor_draft'
/** the listing read and the choices made, held across the $12.99 checkout (Nov 6 2026) */
const PREPAY_KEY = 'shutap_realtor_prepay'
type Prepay = { listing: Listing; note: string; controls: ListingControls }
const TONE_HINT: Record<Tone, string> = { professional: 'facts first, one dry line', funny: 'the honest listing, full roast', luxury: 'understated, a wink at the end', young: 'fast cuts, POV, text on screen' }

const track = (name: string, props: Record<string, unknown> = {}) => { void phCapture(name, { product: 'realtors', ...props }); void trackEvent(name, { product: 'realtors', ...props }) }

type Draft = { url: string; text: string; note: string; controls: ListingControls }
function readDraft(): Draft | null {
  try { const raw = sessionStorage.getItem(DRAFT_KEY); return raw ? (JSON.parse(raw) as Draft) : null } catch { return null }
}

/** Chips you can add with Enter and remove with ×. */
function Chips({ label, hint, value, onChange }: { label: string; hint: string; value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState('')
  const add = () => { const t = text.trim().slice(0, 60); if (t && !value.includes(t) && value.length < 12) onChange([...value, t]); setText('') }
  const key = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="rl-lbl">{label}</span>
      <div className="rl-row">
        {value.map((v) => (
          <span key={v} className="rl-chip soft" aria-pressed>
            {v}<button type="button" className="x" aria-label={`remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit', padding: 0 }}>×</button>
          </span>
        ))}
        <input className="rl-input" style={{ height: 32, width: 'auto', flex: '1 1 160px', fontSize: 13 }} placeholder={hint} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={key} onBlur={add} />
      </div>
    </div>
  )
}

export function KitPage({ kitId, sessionId, prepaidSession, urlIn, textIn, children }: { kitId?: string; sessionId?: string; prepaidSession?: string; urlIn?: string; textIn?: boolean; /** the demos and the page's own sections, shown under the box while nothing is open */ children?: React.ReactNode }) {
  const { userId, ready } = useCurrentAlias()
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [pasteText, setPasteText] = useState(false)
  const [note, setNote] = useState('')
  const [controls, setControls] = useState<ListingControls>({ ...DEFAULT_LISTING_CONTROLS, must_say: [], never_say: [] })
  const [listing, setListing] = useState<Listing | null>(null)
  const [reading, setReading] = useState(false)
  const [readNote, setReadNote] = useState('')
  const [writing, setWriting] = useState(false)
  const [kit, setKit] = useState<KitData | null>(null)
  const [usage, setUsage] = useState<KitUsage | null>(null)
  const [mine, setMine] = useState<KitSummary[]>([])
  const [sheet, setSheet] = useState<null | 'signin' | 'limit' | 'touch_limit' | 'off' | 'buy' | 'prebuy'>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)
  const topRef = useRef<HTMLDivElement | null>(null)

  const say = (m: string) => { setToast(m); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(null), 2800) }

  // a draft held across sign-in; a link handed over by a guide page wins
  useEffect(() => {
    const d = readDraft()
    if (d) { setUrl(d.url); setText(d.text); setPasteText(!!d.text); setNote(d.note); setControls({ ...DEFAULT_LISTING_CONTROLS, ...d.controls }) }
    if (urlIn && /^https?:\/\//i.test(urlIn)) { setUrl(urlIn); setPasteText(false); autoRead.current = urlIn }
    if (textIn) setPasteText(true)
  }, [urlIn, textIn])
  const autoRead = useRef<string | null>(null)
  useEffect(() => {
    if (!ready || !userId || !autoRead.current || autoRead.current !== url) return
    autoRead.current = null
    void read()
    void navigate({ to: '/realtors', replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, url])
  useEffect(() => {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ url, text, note, controls } satisfies Draft)) } catch { /* noop */ }
  }, [url, text, note, controls])

  // a kit by id, and the list of mine
  useEffect(() => {
    if (!ready || !userId) return
    listMyKits({ data: {} }).then((r) => { setMine(r.kits); setUsage(r.usage) }).catch(() => {})
    if (kitId) {
      const load = () => getRealtorKit({ data: { kit_id: kitId } }).then((r) => { if (r.kit) { setKit(r.kit); if (r.usage) setUsage(r.usage) } }).catch(() => {})
      if (sessionId) {
        // back from the one-kit checkout: the webhook usually got here first
        kitPaidStatus({ data: { kitId, sessionId, environment: getStripeEnvironment() } })
          .then((r) => { if (r.paid) { say('this kit is yours · no limits, no marks'); track('kit_bought_seen', {}) } })
          .catch(() => {})
          .finally(() => { void load(); void navigate({ to: '/realtors', search: { kit: kitId } as never, replace: true }) })
      } else void load()
    }
  }, [ready, userId, kitId, sessionId])

  // back from buying a kit before it's written: confirm the credit, put the
  // listing back, and write it straight away (it's paid, so it's clean)
  const autoWrite = useRef(false)
  useEffect(() => {
    if (!ready || !userId || !prepaidSession) return
    confirmKitPrepay({ data: { sessionId: prepaidSession, environment: getStripeEnvironment() } })
      .then((r) => {
        if (!r.paid) return say('payment not confirmed yet · if you were charged, your kit is saved for your next write')
        track('kit_prepaid_seen', {})
        let p: Prepay | null = null
        try { const raw = sessionStorage.getItem(PREPAY_KEY); p = raw ? (JSON.parse(raw) as Prepay) : null } catch { /* noop */ }
        if (!p) return say('your kit is paid · read the listing and write it')
        setListing(p.listing); setNote(p.note); setControls({ ...DEFAULT_LISTING_CONTROLS, ...p.controls })
        autoWrite.current = true
      })
      .catch(() => {})
      .finally(() => { void navigate({ to: '/realtors', replace: true }) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, prepaidSession])
  useEffect(() => {
    if (!autoWrite.current || !listing || writing) return
    autoWrite.current = false
    say('paid · writing your kit')
    void write()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing])

  function openPrebuy() {
    if (listing) { try { sessionStorage.setItem(PREPAY_KEY, JSON.stringify({ listing, note, controls } satisfies Prepay)) } catch { /* noop */ } }
    setCheckoutError(''); setSheet('prebuy'); track('kit_prebuy_opened', { tier: usage?.tier ?? null })
  }

  async function fetchPrepaySecret(): Promise<string> {
    const r = await createKitPrepayCheckout({ data: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/realtors?prepaid={CHECKOUT_SESSION_ID}` } })
    if ('error' in r && r.error) { setCheckoutError('checkout could not open · try again'); throw new Error(r.error) }
    if (!('clientSecret' in r) || !r.clientSecret) throw new Error('no client secret')
    return r.clientSecret
  }

  async function fetchClientSecret(): Promise<string> {
    if (!kit) throw new Error('no kit')
    const r = await createKitCheckout({ data: { kitId: kit.id, environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/realtors?kit=${kit.id}&session_id={CHECKOUT_SESSION_ID}` } })
    if ('error' in r && r.error) { setCheckoutError(r.error === 'already_paid' ? 'this kit is already yours' : 'checkout could not open · try again'); throw new Error(r.error) }
    if (!('clientSecret' in r) || !r.clientSecret) throw new Error('no client secret')
    return r.clientSecret
  }

  async function read() {
    const u = url.trim()
    const t = text.trim()
    if (!u && t.length < 40) return
    if (!userId) return gate()
    setReading(true); setListing(null); setReadNote('')
    track('listing_read_started', { how: u ? 'url' : 'text' })
    try {
      const r = await readListing({ data: u ? { url: u } : { text: t } })
      if (!r.ok) {
        if (r.reason === 'off') return setSheet('off')
        setReadNote(r.reason === 'blocked' ? `${r.host} refuses automated reads · paste the listing text instead` : r.reason === 'fetch_failed' ? `could not open that page · paste the listing text` : r.reason === 'bad_url' ? 'that is not a link · paste the full listing URL' : 'no listing facts on that page · paste the listing text instead')
        setPasteText(true)
        track('listing_read_failed', { reason: r.reason, host: r.host ?? null })
        return
      }
      setListing({ ...r.listing, note })
      track('listing_read', { how: r.how, facts: listingFacts(r.listing).length, host: r.listing.source })
    } catch {
      setReadNote('could not read that · try again, or paste the text')
    } finally {
      setReading(false)
    }
  }

  function gate() {
    setDurableReturn('/realtors')
    try { sessionStorage.setItem('shutap_returnTo', '/realtors') } catch { /* noop */ }
    setSheet('signin')
    track('signin_prompt_seen', { where: 'realtors_kit' })
  }

  async function write(existing?: KitData) {
    if (!userId) return gate()
    if (!listing && !existing) return
    setWriting(true)
    track('kit_write_started', { tone: controls.tone, rewrite: !!existing })
    try {
      const r = await writeRealtorKit({ data: existing ? { listing_id: existing.listing_id, listing: { ...existing.listing, note }, controls } : { listing: { ...listing!, note }, controls } })
      if (!r.ok) {
        if (r.reason === 'off') return setSheet('off')
        if (r.reason === 'limited') { setUsage(r.usage); setSheet('limit'); track('kit_limit_shown', { tier: r.usage.tier }); return }
        if (r.reason === 'sign_in') return gate()
        return say('could not write the kit · try again, it did not count')
      }
      setKit(r.kit); setUsage(r.usage)
      try { sessionStorage.removeItem(PREPAY_KEY) } catch { /* noop */ }
      setMine((m) => [{ id: r.kit.id, address: r.kit.listing.address, city: r.kit.listing.city, price: r.kit.listing.price, tone: r.kit.tone, created_at: r.kit.created_at }, ...m])
      try { sessionStorage.removeItem(DRAFT_KEY) } catch { /* noop */ }
      void navigate({ to: '/realtors', search: { kit: r.kit.id } as never, replace: true })
      requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
      track('kit_written', { tone: r.kit.tone, rewrite: !!existing, shots: r.kit.versions[0]?.content.walkthrough.shots.length ?? 0 })
    } finally {
      setWriting(false)
    }
  }

  const kitsLeft = usage && usage.kits.cap !== null ? Math.max(0, usage.kits.cap - usage.kits.used) : null
  const toneBtn = (t: Tone) => (
    <button key={t} type="button" aria-pressed={controls.tone === t} onClick={() => setControls((c) => ({ ...c, tone: t }))}><b>{TONE_LABEL[t]}</b><span>{TONE_HINT[t]}</span></button>
  )
  const toggle = (k: 'roast_house' | 'roast_neighborhood' | 'mention_price', label: string) => (
    <button type="button" className="rl-chip soft" aria-pressed={controls[k]} onClick={() => setControls((c) => ({ ...c, [k]: !c[k] }))}>{label}: {controls[k] ? 'on' : 'off'}</button>
  )

  return (
    <div className="rl">
      <div className="rl-col" ref={topRef}>
        <div>
          <p className="rl-kicker">shutap for realtors</p>
          <h1 className="rl-h1">Your listing, <em>funnier.</em></h1>
          {!kit && !listing && <p className="rl-lead">One link in. The walkthrough, voiceover, hooks, open-house kit, posts and straight copy out, in your tone.</p>}
        </div>

        {kit ? (
          <>
            <div data-ph-private style={{ display: 'contents' }}><KitView data={kit} usage={usage ?? { tier: 'free', kits: { used: 0, cap: 1, period: 'ever' }, credits: 0, downloads: { used: 0, cap: null, period: 'month' } }} onUsage={setUsage} onLimit={() => setSheet('limit')} onBuy={() => { setCheckoutError(''); setSheet('buy') }} onTouchLimit={() => setSheet('touch_limit')} onRewrite={() => { setListing(kit.listing); setNote(kit.listing.note); setControls(kit.controls); setKit(null); void navigate({ to: '/realtors', replace: true }); track('kit_rewrite_opened', {}) }} say={say} /></div>
            <div className="rl-row" style={{ justifyContent: 'space-between' }}>
              <button className="rl-btn ghost sm" onClick={() => { setKit(null); setListing(null); setUrl(''); setText(''); setNote(''); void navigate({ to: '/realtors', replace: true }) }}>another listing</button>
              {usage && <span className="rl-note">{usage.kits.cap === null ? 'kits: unlimited' : `kits: ${usage.kits.used} of ${usage.kits.cap}${usage.kits.period === 'month' ? ' this month' : ' free'}`}{usage.credits > 0 ? ` · ${usage.credits} bought, ready` : ''} · copies and downloads: unlimited</span>}
            </div>
          </>
        ) : (
          <div className="rl-box" data-ph-private>
            <div className="rl-box-head">
              <span>● {listing ? 'the listing' : pasteText ? 'paste the listing text' : 'paste the listing link'}</span>
              <span style={{ fontWeight: 500, color: 'var(--muted)' }}>{usage ? (usage.kits.cap === null ? 'unlimited kits' : `${kitsLeft} of ${usage.kits.cap} kit${usage.kits.cap === 1 ? '' : 's'} left${usage.kits.period === 'month' ? ' this month' : ''}${usage.credits > 0 ? ` · +${usage.credits} bought` : ''}`) : 'first kit free'}</span>
            </div>
            <div className="rl-box-body">
              {!listing ? (
                <>
                  {!pasteText ? (
                    <>
                      <p className="rl-note" style={{ fontSize: 14, color: 'var(--ink-2)' }}>Open the listing in your browser, copy the web address from the address bar (it starts with <b>https://</b>) and paste it here. MLS portal links, your brokerage page, Zillow, Redfin, Realtor.com all work.</p>
                      <div className="rl-row">
                        <input className="rl-input" style={{ flex: '1 1 320px' }} placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void read() }} inputMode="url" autoComplete="off" />
                        <button className="rl-btn" disabled={reading || !/^https?:\/\//i.test(url.trim())} onClick={() => void read()}>{reading ? 'reading…' : 'read the listing →'}</button>
                      </div>
                      {url.trim() && !/^https?:\/\//i.test(url.trim()) && <p className="rl-note" role="alert" style={{ color: 'var(--rose-ink)' }}>that doesn't look like a web address · it should start with https://</p>}
                    </>
                  ) : (
                    <>
                      <textarea className="rl-textarea" placeholder="paste the listing text: address, price, beds, baths, sqft, the description, the open house…" value={text} onChange={(e) => setText(e.target.value)} />
                      <div className="rl-row"><button className="rl-btn" disabled={reading || text.trim().length < 40} onClick={() => void read()}>{reading ? 'reading…' : 'read the listing'}</button><button className="rl-mini" onClick={() => setPasteText(false)}>paste a link instead</button></div>
                    </>
                  )}
                  {readNote && <p className="rl-note" role="alert" style={{ color: 'var(--rose-ink)' }}>{readNote}</p>}
                  {!pasteText && <p className="rl-note">No link? <button type="button" className="rl-mini" onClick={() => setPasteText(true)}>paste the listing text instead</button></p>}
                </>
              ) : (
                <>
                  <div className="rl-row" style={{ justifyContent: 'space-between' }}>
                    <span className="rl-lbl r">read from {listing.source} · nothing added</span>
                    <button className="rl-mini" onClick={() => setListing(null)}>read another</button>
                  </div>
                  <div className="rl-facts">{listingFacts(listing).map((f) => <span key={f} className="rl-fact">{f}</span>)}</div>
                  <div>
                    <span className="rl-lbl">the one thing about it</span>
                    <textarea className="rl-textarea" style={{ minHeight: 56 }} placeholder="the thing a buyer notices first: the balcony that fits one chair, the train, the 1957 kitchen…" value={note} onChange={(e) => setNote(e.target.value.slice(0, 600))} />
                  </div>
                  <div>
                    <span className="rl-lbl">tone · one per kit</span>
                    <div className="rl-tone" style={{ marginTop: 6 }}>{TONES.map(toneBtn)}</div>
                  </div>
                  <button type="button" className="rl-mini" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)} style={{ alignSelf: 'flex-start' }}>{moreOpen ? 'fewer options ▴' : 'more options: roast, must say, never say ▾'}</button>
                  {moreOpen && (
                    <>
                      <div className="rl-row">{toggle('roast_house', 'roast the house')}{toggle('roast_neighborhood', 'roast the neighborhood')}{toggle('mention_price', 'mention the price in the jokes')}</div>
                      <Chips label="must say" hint="type and press Enter: the brokerage, the open house, a feature…" value={controls.must_say} onChange={(v) => setControls((c) => ({ ...c, must_say: v }))} />
                      <Chips label="never say" hint="words that must not appear" value={controls.never_say} onChange={(v) => setControls((c) => ({ ...c, never_say: v }))} />
                    </>
                  )}
                </>
              )}
            </div>
            <div className="rl-box-foot">
              <span>{listing ? 'fair-housing check on every line · nothing added beyond the listing' : 'nobody at shutap reads your listings · nothing is made up'}</span>
              {listing && <button className="rl-btn" disabled={writing} onClick={() => void write()}>{writing ? 'writing the kit… 20–40s' : 'write the kit →'}</button>}
            </div>
          </div>
        )}

        {/* Nov 6 2026: kits live in My creations, under the profile */}
        {!kit && !listing && mine.length > 0 && (
          <p className="rl-note" style={{ textAlign: 'center' }}>
            {mine.length} {mine.length === 1 ? 'kit' : 'kits'} of yours · <Link to="/creations" search={{ show: 'kits' } as never} className="rl-note" style={{ textDecoration: 'underline' }}>open them in My creations →</Link>
          </p>
        )}

        {!listing && <p className="rl-note" style={{ textAlign: 'center' }}>
          first kit free with an account · one kit {usd(KIT_ONCE.amount)} · Basic {usd(PLANS.basic.amount)}/mo: 20 kits a month · Pro {usd(PLANS.pro.amount)}/mo: unlimited · copies and downloads always unlimited · <Link to="/pricing" className="rl-note">pricing</Link>
        </p>}
        {!kit && !listing && children}
      </div>

      {toast && <div className="rl-toast" role="status">{toast}</div>}

      {sheet && (
        <div className="rl-sheet-scrim" onClick={() => setSheet(null)}>
          <div className="rl-sheet" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
            {sheet === 'signin' && (
              <>
                <h3 style={{ margin: 0, font: '800 20px var(--sora)', color: 'var(--wine)' }}>Sign in to write the kit.</h3>
                <p className="rl-note">Free: your first kit, all six outputs, with "— shutap.com" at the end of each. Your link is kept for after.</p>
                <Link to="/welcome" className="rl-btn">sign in with Google or Apple</Link>
                <button className="rl-btn ghost" onClick={() => setSheet(null)}>not now</button>
              </>
            )}
            {sheet === 'limit' && (
              <>
                <h3 style={{ margin: 0, font: '800 20px var(--sora)', color: 'var(--wine)' }}>{usage?.tier === 'free' ? 'That was your free kit.' : `That's your ${usage?.kits.cap ?? 20} kits this month.`}</h3>
                <p className="rl-note">Buy this one for {usd(KIT_ONCE.amount)} and Shutap writes it now, clean. Then every copy, the PDF and shoot mode are yours, unlimited, forever: find it under profile → My creations.{usage?.tier === 'free' ? ` Or Basic, ${usd(PLANS.basic.amount)} a month: 20 kits a month.` : ''} Pro, {usd(PLANS.pro.amount)} a month: unlimited.</p>
                <button className="rl-btn" onClick={openPrebuy}>buy this kit · {usd(KIT_ONCE.amount)}</button>
                {usage?.tier === 'free' && <a href="/subscribe?plan=basic&from=realtors" className="rl-btn ghost" onClick={() => track('plan_clicked', { plan: 'basic', where: 'realtors_limit' })}>get Basic · {usd(PLANS.basic.amount)}/mo · 20 kits</a>}
                <a href="/subscribe?plan=pro&from=realtors" className="rl-btn ghost" onClick={() => track('plan_clicked', { plan: 'pro', where: 'realtors_limit' })}>get Pro · {usd(PLANS.pro.amount)}/mo · unlimited</a>
                <button className="rl-btn ghost" onClick={() => setSheet(null)}>not now</button>
              </>
            )}
            {sheet === 'touch_limit' && (
              <>
                <h3 style={{ margin: 0, font: '800 20px var(--sora)', color: 'var(--wine)' }}>That's a lot of "funnier" for one day.</h3>
                <p className="rl-note">"funnier" is unlimited on every plan; this pause only stops runaway use. It's back tomorrow, and you can type any line yourself now.</p>
                <button className="rl-btn ghost" onClick={() => setSheet(null)}>not now</button>
              </>
            )}
            {sheet === 'prebuy' && (
              <>
                <h3 style={{ margin: 0, font: '800 20px var(--sora)', color: 'var(--wine)' }}>This kit · {usd(KIT_ONCE.amount)}</h3>
                <p className="rl-note">Pay once and Shutap writes it right after: clean, no marks. Every copy, the PDF and shoot mode are unlimited, forever, under profile → My creations. A rewrite in a new tone is a new kit. No subscription. Tax may be added.</p>
                {checkoutError ? <p className="rl-note" role="alert" style={{ color: 'var(--rose-ink)' }}>{checkoutError}</p> : (
                  <div style={{ minHeight: 420 }}>
                    <EmbeddedCheckoutProvider key="prepay" stripe={getStripe()} options={{ fetchClientSecret: fetchPrepaySecret }}>
                      <EmbeddedCheckout />
                    </EmbeddedCheckoutProvider>
                  </div>
                )}
                <button className="rl-btn ghost" onClick={() => setSheet(null)}>close</button>
              </>
            )}
            {sheet === 'buy' && kit && (
              <>
                <h3 style={{ margin: 0, font: '800 20px var(--sora)', color: 'var(--wine)' }}>Remove the mark · {usd(KIT_ONCE.amount)}</h3>
                <p className="rl-note">This kit, clean: no "— shutap.com" on any copy, the PDF or the voiceover file, forever. It stays in profile → My creations. A rewrite in a new tone is a new kit. No subscription. Tax may be added.</p>
                {checkoutError ? <p className="rl-note" role="alert" style={{ color: 'var(--rose-ink)' }}>{checkoutError}</p> : (
                  <div style={{ minHeight: 420 }}>
                    <EmbeddedCheckoutProvider key={kit.id} stripe={getStripe()} options={{ fetchClientSecret }}>
                      <EmbeddedCheckout />
                    </EmbeddedCheckoutProvider>
                  </div>
                )}
                <button className="rl-btn ghost" onClick={() => setSheet(null)}>close</button>
              </>
            )}
            {sheet === 'off' && (
              <>
                <h3 style={{ margin: 0, font: '800 20px var(--sora)', color: 'var(--wine)' }}>Shutap for Realtors opens soon.</h3>
                <p className="rl-note">The kits are being rated in-house first. Leave your email on the enterprise page and you'll hear the day it opens.</p>
                <Link to="/business" className="rl-btn">tell me when</Link>
                <button className="rl-btn ghost" onClick={() => setSheet(null)}>close</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
