/* Shutap Toasts, the form (Nov 8 2026 redesign, approved by Candy): four steps
 * in one box, in the first screen of every occasion page.
 *   1 your stories → 2 who it's for → 3 the last line → 4 tone & length
 *   → "write my free toast" → sign-in (each button straight to its provider;
 *   the toast is written as soon as they are back, on this same page)
 *   → the paywall if past the plan's toasts → the toast.
 * Every line the person types has "funnier" and "lock"; both stay gray until
 * the line has text, and say so when tapped. Story 1 is required, 2 and 3
 * are recommended (left empty they get a bridge, never a made-up story); a
 * typed story must be locked before Next. The names, the last line and the
 * relation are required.
 * The form is kept on this device while they type (and across sign-in and the
 * $12.99 checkout). The server only ever sees {friend}, {partner}, {me}. */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { useCurrentAlias } from '@/hooks/use-current-alias'
import { getStripe, getStripeEnvironment } from '@/lib/stripe'
import { confirmToastPrepay, createToastPrepayCheckout } from '@/lib/payments.functions'
import { myToastUsage, touchMyStory, writeMyToast } from '@/lib/toasts.functions'
import { OCCASION, STORY_PROMPTS, TONES, TONE_LABEL, TONE_SUB, lengthLabel, toPlaceholders, fromPlaceholders, type Names, type Occasion, type Pronoun, type Tone, type ToastForm as Form } from '@/lib/toasts/shared'
import type { ToastUsage } from '@/lib/toasts/usage.server'
import { PLANS, TOAST_ONCE, usd } from '@/lib/pricing'
import { saveNames } from '@/lib/toasts/names-store'
import { setDurableReturn } from '@/lib/auth-guard'
import { startOAuth, useOAuthPending, oauthButtonLabel } from '@/lib/oauth-signin'
import { trackEvent } from '@/lib/tracking'
import { phCapture } from '@/lib/posthog'
import '@/pages/realtors/realtors.css'
import './toasts.css'

const DRAFT_KEY = 'shutap_toast_draft'
/** set before sign-in: write the toast as soon as they are back */
const AUTOWRITE_KEY = 'shutap_toast_autowrite'
/** the mid-page box hands its story to this form */
export const TOAST_STORY_EVENT = 'shutap:toast-story'

const track = (name: string, props: Record<string, unknown> = {}) => { void phCapture(name, { product: 'toasts', ...props }); void trackEvent(name, { product: 'toasts', ...props }) }

type Story = { text: string; locked: boolean }
type Draft = {
  occasion: Occasion
  names: Names
  relation: string
  what: string
  pronouns: { friend: Pronoun; partner: Pronoun }
  stories: Story[]
  true_thing: string
  true_locked: boolean
  tone: Tone
  length: number
  must_say: string[]
  never_say: string[]
}
type Preset = { relation?: string; pronoun?: Pronoun }

function freshDraft(o: Occasion, keep?: Draft, preset?: Preset): Draft {
  const spec = OCCASION[o]
  return {
    occasion: o,
    names: keep?.names ?? { friend: '', partner: '', me: '' },
    relation: keep && keep.occasion === o && keep.relation ? keep.relation : preset?.relation ?? '',
    what: keep?.what ?? '',
    pronouns: keep?.pronouns ?? { friend: preset?.pronoun ?? (o === 'maid_of_honor' ? 'she' : o === 'best_man' ? 'he' : 'they'), partner: o === 'best_man' ? 'she' : o === 'maid_of_honor' ? 'he' : 'they' },
    stories: Array.from({ length: spec.stories }, (_, i) => keep?.stories[i] ?? { text: '', locked: false }),
    true_thing: keep?.true_thing ?? '',
    true_locked: keep?.true_locked ?? false,
    tone: keep?.tone ?? 'warm_funny',
    length: spec.defaultLength,
    must_say: keep?.must_say ?? [],
    never_say: [...spec.neverSay],
  }
}

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    const d = raw ? (JSON.parse(raw) as Draft) : null
    if (!d || !OCCASION[d.occasion]) return null
    // drafts from before Nov 8 had the last line always locked
    if (d.true_locked === undefined) d.true_locked = !!d.true_thing?.trim()
    return d
  } catch { return null }
}

/** What the server gets: the names swapped out, here in the browser. */
function formOf(d: Draft): Form {
  const spec = OCCASION[d.occasion]
  const ph = (t: string) => toPlaceholders(t, d.names)
  return {
    occasion: d.occasion,
    ...(d.occasion === 'other' && d.what.trim() ? { what: ph(d.what.trim()) } : {}),
    relation: ph(d.relation.trim()),
    pronouns: { friend: d.pronouns.friend, ...(spec.partner ? { partner: d.pronouns.partner } : {}) },
    stories: d.stories.slice(0, spec.stories).map((s) => ph(s.text.trim())),
    true_thing: ph(d.true_thing.trim()),
    tone: d.tone,
    length: d.length,
    must_say: d.must_say.map(ph),
    never_say: d.never_say,
  }
}

const STEPS = ['Your stories', 'Who it’s for', 'The last line', 'Tone & length'] as const

/** What is missing before this step's Next, in one line, or null. */
function missing(d: Draft, step: number): string | null {
  const spec = OCCASION[d.occasion]
  if (step === 1) {
    if (d.occasion === 'other' && !d.what.trim()) return 'Say what the occasion is to continue.'
    if (!d.stories[0]?.text.trim()) return 'Type story 1 to continue: one thing that happened, the way you’d tell it.'
    const open = d.stories.findIndex((s) => s.text.trim() && !s.locked)
    if (open >= 0) return `Lock story ${open + 1} to continue. Locked lines stay word for word.`
    return null
  }
  if (step === 2) {
    if (!d.names.friend.trim()) return `Add ${spec.who} to continue.`
    if (!d.relation.trim()) return `Add ${spec.relation === 'you are their' ? 'who you are to them' : 'who they are to you'} to continue.`
    if (spec.partner && !d.names.partner?.trim()) return 'Add who they’re marrying to continue.'
    if (!d.names.me.trim()) return 'Add your first name to continue: the opener says who you are.'
    return null
  }
  if (step === 3) {
    if (!d.true_thing.trim()) return 'Type the last line to continue: the sentence the toast ends on.'
    if (!d.true_locked) return 'Lock the last line to continue. Locked lines stay word for word.'
    return null
  }
  return null
}

function Chips({ label, hint, value, onChange }: { label: string; hint: string; value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState('')
  const add = () => { const t = text.trim().slice(0, 60); if (t && !value.includes(t) && value.length < 8) onChange([...value, t]); setText('') }
  const key = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ font: '600 13px var(--sora)', color: 'var(--ink-2)' }}>{label}</span>
      <div className="rl-row">
        {value.map((v) => (
          <span key={v} className="rl-chip soft" aria-pressed>
            {v}<button type="button" className="x" aria-label={`remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit', padding: 0 }}>×</button>
          </span>
        ))}
        <label style={{ display: 'contents' }}>
          <span style={{ position: 'absolute', left: -9999 }}>add to {label}</span>
          <input className="rl-input" style={{ height: 40, width: 'auto', flex: '1 1 120px', fontSize: 14 }} placeholder={hint} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={key} onBlur={add} />
        </label>
      </div>
    </div>
  )
}

const LockIcon = ({ open, color }: { open?: boolean; color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d={open ? 'M8 11V7a4 4 0 0 1 7.5-2' : 'M8 11V7a4 4 0 0 1 8 0v4'} /></svg>
)

/** One line the person types: the box, "funnier" and "lock" (gray until
 *  there is text), the three ways when funnier is open, the example. */
function Line(p: {
  id: string; label: string; sub: string; status?: string; example: string; placeholder: string; big?: boolean
  value: string; locked: boolean; onChange: (v: string) => void; onLock: () => void; onFunnier: () => void; onEmpty: () => void
  touch?: { busy: boolean; options?: { line: string; move: string }[]; error?: string } | null; onKeep: () => void; onPick: (line: string, k: number, move: string) => void; onMore: () => void
}) {
  const filled = !!p.value.trim()
  const state = p.locked ? 'locked' : filled ? 'typing' : 'empty'
  return (
    <div className="tf-line">
      <div className="tf-line-head">
        <label htmlFor={p.id}><b>{p.label}</b> <span>· {p.sub}</span></label>
        <i className={state}>{p.locked ? 'locked · kept word for word' : filled ? 'not locked yet' : p.status ?? 'required'}</i>
      </div>
      <div className={`tf-box ${state}${p.big ? ' big' : ''}`}>
        <textarea id={p.id} rows={2} maxLength={400} value={p.value} readOnly={p.locked} placeholder={p.placeholder} onChange={(e) => p.onChange(e.target.value.replace(/\n/g, ' '))} />
        <div className="tf-pills">
          <button type="button" className={`tf-pill funnier${filled ? '' : ' off'}`} aria-disabled={!filled || p.locked} onClick={() => (filled ? (p.locked ? p.onEmpty() : p.onFunnier()) : p.onEmpty())}>{p.touch?.busy ? 'three ways…' : 'funnier'}</button>
          {p.locked
            ? <button type="button" className="tf-pill locked" aria-pressed="true" aria-label={`unlock ${p.label}`} onClick={p.onLock}><LockIcon color="#fff" />locked</button>
            : <button type="button" className={`tf-pill lock${filled ? '' : ' off'}`} aria-pressed="false" aria-disabled={!filled} onClick={() => (filled ? p.onLock() : p.onEmpty())}><LockIcon open color={filled ? '#2f6a45' : '#8f878b'} />lock</button>}
        </div>
      </div>
      {p.touch && !p.touch.busy && (
        <div className="rl-pop" style={{ margin: 0 }}>
          <span className="rl-lbl">three ways · nothing changes until you pick</span>
          <button type="button" className="rl-opt keep" onClick={p.onKeep}><b style={{ color: '#2f6a45' }}>1</b><span>keep it as it is</span></button>
          {p.touch.error ? <p className="rl-note" role="alert">{p.touch.error}</p> : p.touch.options?.map((o, k) => (
            <button key={k} type="button" className="rl-opt" onClick={() => p.onPick(o.line, k, o.move)}>
              <b>{k + 2}</b><span>{o.line}<small>{o.move}</small></span>
            </button>
          ))}
          {!p.touch.error && <button type="button" className="rl-mini" style={{ alignSelf: 'flex-start' }} onClick={p.onMore}>three more</button>}
        </div>
      )}
      <span className="tf-help">Example: {p.example}</span>
    </div>
  )
}

export function ToastForm({ occasionIn, preset, prepaidSession, otherChoice, onStep }: { occasionIn: Occasion; preset?: Preset; prepaidSession?: string; otherChoice?: boolean; onStep?: (n: number) => void }) {
  const { userId, ready } = useCurrentAlias()
  const navigate = useNavigate()
  const opening = useOAuthPending()
  const [d, setD] = useState<Draft>(() => freshDraft(occasionIn, undefined, preset))
  const [step, setStep] = useState(1)
  const [loaded, setLoaded] = useState(false)
  const [usage, setUsage] = useState<ToastUsage | null>(null)
  const [writing, setWriting] = useState(false)
  const [sheet, setSheet] = useState<null | 'signin' | 'limit' | 'prebuy' | 'crisis' | 'off'>(null)
  const [choice, setChoice] = useState<'once' | 'basic' | 'pro'>('once')
  const [checkoutError, setCheckoutError] = useState('')
  const [touch, setTouch] = useState<{ index: number; busy: boolean; options?: { line: string; move: string }[]; error?: string } | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [signinErr, setSigninErr] = useState('')
  const noteTimer = useRef<number | undefined>(undefined)
  const boxRef = useRef<HTMLFormElement | null>(null)
  const say = (m: string) => { setNote(m); window.clearTimeout(noteTimer.current); noteTimer.current = window.setTimeout(() => setNote(null), 3600) }
  const spec = OCCASION[d.occasion]
  const here = () => (typeof window === 'undefined' ? '/toasts' : window.location.pathname)

  // the draft kept on this device; this page's occasion wins over an old draft's
  useEffect(() => {
    const saved = readDraft()
    let next = saved
    if (saved && saved.occasion !== occasionIn && !(otherChoice && (saved.occasion === 'other' || saved.occasion === 'toastmasters'))) next = freshDraft(occasionIn, saved, preset)
    if (next) {
      setD(next)
      // back with a finished form (after sign-in or checkout): open on the last step
      if (!missing(next, 1) && !missing(next, 2) && !missing(next, 3)) setStep(4)
    }
    setLoaded(true)
    track('toast_form_viewed', { occasion: next?.occasion ?? occasionIn, resumed: !!saved, page: here() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { if (loaded) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)) } catch { /* noop */ } } }, [d, loaded])
  useEffect(() => {
    if (!ready || !userId) return
    myToastUsage({ data: {} }).then((r) => setUsage(r.usage)).catch(() => {})
  }, [ready, userId])

  // the mid-page box: its story goes into story 1, and the form comes into view
  useEffect(() => {
    const on = (e: Event) => {
      const text = String((e as CustomEvent<string>).detail ?? '').replace(/\n/g, ' ').slice(0, 400)
      setD((x) => (text.trim() && !x.stories[0]?.locked ? { ...x, stories: x.stories.map((s, i) => (i === 0 ? { ...s, text } : s)) } : x))
      setStep(1)
      boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    window.addEventListener(TOAST_STORY_EVENT, on)
    return () => window.removeEventListener(TOAST_STORY_EVENT, on)
  }, [])

  // back from sign-in or from buying a toast: write it now, on this page.
  // Nov 8 2026: this was a ref, so the $12.99 confirm (which resolves after
  // the page has settled) set it without a re-render and the toast was never
  // written. It is state now, so the write runs the moment it is set.
  const [pendingWrite, setPendingWrite] = useState(false)
  useEffect(() => {
    if (!ready || !userId) return
    let flagged = false
    try { flagged = sessionStorage.getItem(AUTOWRITE_KEY) === '1' || localStorage.getItem(AUTOWRITE_KEY) === '1'; sessionStorage.removeItem(AUTOWRITE_KEY); localStorage.removeItem(AUTOWRITE_KEY) } catch { /* noop */ }
    if (flagged) { setPendingWrite(true); track('toast_autowrite_after_signin', {}) }
    if (!prepaidSession) return
    confirmToastPrepay({ data: { sessionId: prepaidSession, environment: getStripeEnvironment() } })
      .then((r) => {
        if (!r.paid) return say('payment not confirmed yet · if you were charged, your toast is saved for your next write')
        track('toast_prepaid_seen', {})
        setPendingWrite(true)
      })
      .catch(() => say('could not confirm the payment · if you were charged, your toast is saved for your next write'))
      .finally(() => { void navigate({ to: here() as never, search: {} as never, replace: true }) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, prepaidSession])
  const complete = loaded && !missing(d, 1) && !missing(d, 2) && !missing(d, 3)
  useEffect(() => {
    if (!pendingWrite || !loaded || writing || !userId) return
    setPendingWrite(false)
    if (!complete) {
      // paid or signed in, but the form isn't finished: the toast waits for them
      const s = [1, 2, 3].find((n) => missing(d, n)) ?? 1
      setStep(s)
      say('Your toast is ready to write. Finish this step and tap write.')
      return
    }
    setStep(4)
    void write()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingWrite, loaded, complete, userId, writing])

  useEffect(() => { onStep?.(step) }, [step, onStep])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const setStory = (i: number, s: Partial<Story>) => setD((x) => ({ ...x, stories: x.stories.map((y, j) => (j === i ? { ...y, ...s } : y)) }))
  const emptyTap = () => say('Type something first to make it funnier or lock it.')
  const lockedTap = () => say('Unlock it first to make it funnier.')

  function gate() {
    try { sessionStorage.setItem('shutap_returnTo', here()) } catch { /* noop */ }
    setDurableReturn(here())
    setSigninErr('')
    setSheet('signin')
    track('signin_prompt_seen', { where: 'toasts_form', page: here() })
  }
  async function signIn(method: 'google' | 'apple' | 'email') {
    try { localStorage.setItem(AUTOWRITE_KEY, '1'); sessionStorage.setItem('shutap_returnTo', here()) } catch { /* noop */ }
    setDurableReturn(here())
    track('signin_clicked', { method, from: 'toasts_form', page: here() })
    // each button goes straight to its own sign-in, never to a second chooser
    if (method === 'google' || method === 'apple') {
      const err = await startOAuth(method)
      if (err) setSigninErr(err)
      return
    }
    void navigate({ to: '/welcome', search: { method: 'email' } as never })
  }

  /** index 0–2: a story; -1: the last line */
  async function funnier(i: number) {
    if (!userId) return gate()
    const avoid = touch?.index === i ? (touch.options ?? []).map((o) => o.line) : []
    setTouch({ index: i, busy: true })
    track('toast_story_funnier_opened', { occasion: d.occasion, story: i < 0 ? 'true_thing' : i + 1 })
    try {
      const r = await touchMyStory({ data: { form: formOf(d), index: i, avoid } })
      if (!r.ok) {
        if (r.reason === 'sign_in') { setTouch(null); return gate() }
        if (r.reason === 'off') { setTouch(null); return setSheet('off') }
        track('toast_story_funnier_failed', { occasion: d.occasion, story: i < 0 ? 'true_thing' : i + 1, reason: r.reason })
        return setTouch({ index: i, busy: false, error: 'no new ways this time · tap three more' })
      }
      setTouch({ index: i, busy: false, options: r.options })
    } catch {
      track('toast_story_funnier_failed', { occasion: d.occasion, story: i < 0 ? 'true_thing' : i + 1, reason: 'network' })
      setTouch({ index: i, busy: false, error: 'could not reach Shutap · try again' })
    }
  }
  function next() {
    const m = missing(d, step)
    if (m) { say(m); track('toast_step_blocked', { step, occasion: d.occasion }); return }
    setTouch(null)
    if (step < 4) { setStep(step + 1); track('toast_step_next', { step: step + 1, occasion: d.occasion }); boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return }
    void write()
  }
  async function write() {
    for (const s of [1, 2, 3]) { const m = missing(d, s); if (m) { setStep(s); say(m); return } }
    if (!userId) return gate()
    setWriting(true)
    const form = formOf(d)
    track('toast_write_started', { occasion: d.occasion, tone: d.tone, length: d.length, stories: form.stories.filter(Boolean).length, page: here() })
    try {
      const r = await writeMyToast({ data: { form } })
      if (!r.ok) {
        if (r.reason === 'sign_in') return gate()
        if (r.reason === 'off') return setSheet('off')
        if (r.reason === 'crisis') { track('toast_guard_shown', {}); return setSheet('crisis') }
        if (r.reason === 'limited') { setUsage(r.usage); setChoice('once'); setSheet('limit'); track('toast_limit_shown', { tier: r.usage.tier, occasion: d.occasion }); return }
        return say('could not write the toast · try again, it did not count')
      }
      saveNames(r.id, d.names)
      setUsage(r.usage)
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* noop */ }
      track('toast_written', { occasion: d.occasion, tone: d.tone, length: d.length })
      void navigate({ to: '/toasts/edit/$id', params: { id: r.id } })
    } catch {
      say('could not reach Shutap · try again, it did not count')
    } finally {
      setWriting(false)
    }
  }
  async function fetchPrepaySecret(): Promise<string> {
    const r = await createToastPrepayCheckout({ data: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}${here()}?prepaid={CHECKOUT_SESSION_ID}` } })
    if ('error' in r && r.error) { setCheckoutError('checkout could not open · try again'); throw new Error(r.error) }
    return (r as { clientSecret: string }).clientSecret
  }
  function pay() {
    if (choice === 'once') { setCheckoutError(''); setSheet('prebuy'); track('toast_prebuy_opened', { tier: usage?.tier ?? null }); return }
    track('plan_clicked', { plan: choice, where: 'toasts_limit' })
    window.location.href = `/subscribe?plan=${choice}&from=toasts`
  }

  const firstFree = !usage || (usage.tier === 'free' && (usage.toasts.cap ?? 1) > usage.toasts.used)
  const left = usage && usage.toasts.cap !== null ? Math.max(0, usage.toasts.cap - usage.toasts.used) : null
  const footLeft = !usage ? 'First toast free, watermarked · then $12.99'
    : usage.toasts.cap === null ? 'Unlimited toasts on Pro'
    : left! > 0 ? (usage.tier === 'free' ? 'Your first toast is free, watermarked' : `${left} toast left this month`)
    : usage.credits > 0 ? `${usage.credits} toast bought, ready` : `Next toast ${usd(TOAST_ONCE.amount)}`
  const names = d.names
  const shown = (t: string) => fromPlaceholders(t, names)
  const stepLine = useMemo(() => missing(d, step), [d, step])
  const nextLabel = writing ? 'writing your toast… 20–60s' : step === 1 ? 'Next: who it’s for →' : step === 2 ? 'Next: the last line →' : step === 3 ? 'Next: tone →' : firstFree ? 'Write my free toast →' : 'Write my toast →'
  const hint = step === 1 ? 'Step 1 of 4 · about 3 minutes in all' : step === 4 ? (userId ? 'Your form is kept on this device' : 'Next: sign up free · your form is kept') : `Step ${step} of 4`
  const tp = (i: number) => (touch?.index === i ? touch : null)
  const pick = (i: number) => (line: string, k: number, move: string) => {
    if (i < 0) set('true_thing', shown(line)); else setStory(i, { text: shown(line) })
    setTouch(null); track('toast_story_funnier_picked', { story: i < 0 ? 'true_thing' : i + 1, option: k + 1, move })
  }
  const keep = (i: number) => () => { setTouch(null); track('toast_story_funnier_kept', { story: i < 0 ? 'true_thing' : i + 1 }) }

  return (
    <>
      <form ref={boxRef} id="ts-form" className="tf" onSubmit={(e) => { e.preventDefault(); next() }} aria-label="Write your toast">
        <ol className="tf-steps">
          {STEPS.map((label, i) => {
            const n = i + 1
            const state = n === step ? 'cur' : n < step ? 'done' : 'todo'
            return (
              <li key={label}>
                <button type="button" className={state} aria-current={n === step ? 'step' : undefined} disabled={n > step} onClick={() => { setStep(n); setTouch(null) }}>
                  <span>Step {n}</span><b>{label}</b>
                </button>
              </li>
            )
          })}
        </ol>

        <div className="tf-body">
          {step === 1 && (
            <>
              {otherChoice && (
                <div className="tf-other">
                  <div className="ts-seg" role="group" aria-label="the occasion">
                    {(['other', 'toastmasters'] as Occasion[]).map((o) => <button key={o} type="button" aria-pressed={d.occasion === o} onClick={() => { if (d.occasion !== o) { setD((x) => freshDraft(o, x)); track('toast_occasion_picked', { occasion: o }) } }}>{o === 'other' ? 'something else' : 'Toastmasters'}</button>)}
                  </div>
                  {d.occasion === 'other' && (
                    <label className="tf-field">What’s the occasion?
                      <input className={`tf-input${d.what.trim() ? ' ok' : ''}`} value={d.what} maxLength={120} placeholder="the end-of-season team dinner" onChange={(e) => set('what', e.target.value)} />
                    </label>
                  )}
                </div>
              )}
              {d.stories.map((s, i) => {
                const p = STORY_PROMPTS[d.occasion][i] ?? { sub: 'one more', example: '' }
                return (
                  <Line key={`${d.occasion}-${i}`} id={`ts-s${i + 1}`} big={i === 0} label={`Story ${i + 1}`} sub={shown(p.sub).replace(/\s*\(optional\)$/, '')} status={i === 0 ? 'required' : 'recommended'}
                    example={shown(p.example)} placeholder={i === 0 ? 'Type it the way you’d tell it…' : `Type story ${i + 1} here…`}
                    value={s.text} locked={s.locked} onChange={(v) => setStory(i, { text: v })}
                    onLock={() => { const to = !s.locked; setStory(i, { locked: to }); if (touch?.index === i) setTouch(null); track(to ? 'toast_story_locked' : 'toast_story_unlocked', { occasion: d.occasion, story: i + 1 }) }}
                    onFunnier={() => void funnier(i)} onEmpty={s.locked ? lockedTap : emptyTap} touch={tp(i)} onKeep={keep(i)} onPick={pick(i)} onMore={() => void funnier(i)} />
                )
              })}
              {spec.stories > 1 && <p className="tf-help">Stories 2 and 3 are recommended. Left empty, Shutap writes a bridge from your other stories. It never makes one up.</p>}
            </>
          )}

          {step === 2 && (
            <>
              <div className="tf-grid">
                <label className="tf-field">{spec.who}
                  <input className={`tf-input${names.friend.trim() ? ' ok' : ''}`} value={names.friend} maxLength={40} autoComplete="off" onChange={(e) => set('names', { ...names, friend: e.target.value })} />
                </label>
                <label className="tf-field">{spec.relation === 'you are their' ? 'who you are to them' : 'who they are to you'}
                  <input className={`tf-input${d.relation.trim() ? ' ok' : ''}`} value={d.relation} maxLength={80} placeholder={d.occasion === 'parent' ? 'dad' : 'my college roommate'} onChange={(e) => set('relation', e.target.value)} />
                </label>
                <div className="tf-field">their pronouns
                  <div className="ts-seg" role="group" aria-label="their pronouns">{(['he', 'she', 'they'] as Pronoun[]).map((p) => <button key={p} type="button" aria-pressed={d.pronouns.friend === p} onClick={() => set('pronouns', { ...d.pronouns, friend: p })}>{p}</button>)}</div>
                </div>
                <label className="tf-field">your first name
                  <input className={`tf-input${names.me.trim() ? ' ok' : ''}`} value={names.me} maxLength={40} autoComplete="given-name" onChange={(e) => set('names', { ...names, me: e.target.value })} />
                </label>
                {spec.partner && (
                  <>
                    <label className="tf-field">who they’re marrying
                      <input className={`tf-input${names.partner?.trim() ? ' ok' : ''}`} value={names.partner ?? ''} maxLength={40} autoComplete="off" onChange={(e) => set('names', { ...names, partner: e.target.value })} />
                    </label>
                    <div className="tf-field">their partner’s pronouns
                      <div className="ts-seg" role="group" aria-label="their partner's pronouns">{(['he', 'she', 'they'] as Pronoun[]).map((p) => <button key={p} type="button" aria-pressed={d.pronouns.partner === p} onClick={() => set('pronouns', { ...d.pronouns, partner: p })}>{p}</button>)}</div>
                    </div>
                  </>
                )}
              </div>
              <div className="ts-names">
                <LockIcon color="#2f6a45" />
                <span><b>Names stay on this device.</b> Shutap only ever sees placeholders. Your browser puts the names back on screen, in the prompter and in the PDFs.</span>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="tf-help" style={{ fontSize: 13.5 }}>The sentence the toast ends on. Not a joke. Funnier offers other ways to say it, yours first; lock keeps it word for word.</p>
              <Line id="ts-true" big label="The one true thing" sub="the line it ends on" example={d.occasion === 'best_man' ? '“He’s the guy who shows up. Every time.”' : '“Every one of you is the reason I cook.”'} placeholder="The sentence the toast ends on…"
                value={d.true_thing} locked={d.true_locked} onChange={(v) => set('true_thing', v)}
                onLock={() => { const to = !d.true_locked; set('true_locked', to); if (touch?.index === -1) setTouch(null); track(to ? 'toast_true_locked' : 'toast_true_unlocked', { occasion: d.occasion }) }}
                onFunnier={() => void funnier(-1)} onEmpty={d.true_locked ? lockedTap : emptyTap} touch={tp(-1)} onKeep={keep(-1)} onPick={pick(-1)} onMore={() => void funnier(-1)} />
            </>
          )}

          {step === 4 && (
            <>
              <div className="ts-tones">
                {TONES.map((t) => <button key={t} type="button" aria-pressed={d.tone === t} onClick={() => { set('tone', t); track('toast_tone_picked', { tone: t }) }}><b>{TONE_LABEL[t]}</b><span>{TONE_SUB[t]}</span></button>)}
              </div>
              <div className="tf-len">
                <span>Length</span>
                <div className="ts-lens">
                  {spec.lengths.map((s) => <button key={s} type="button" aria-pressed={d.length === s} onClick={() => set('length', s)}>{lengthLabel(d.occasion, s)}</button>)}
                </div>
              </div>
              <p className="tf-help" style={{ margin: 0 }}>Running short on the day? A 60-second version is one tap on your toast, made when you need it.</p>
              <details className="tf-more">
                <summary>More: must say · never say</summary>
                <div className="ts-two" style={{ gap: 14, paddingBottom: 12 }}>
                  <Chips label="must say" hint="+ add" value={d.must_say} onChange={(v) => set('must_say', v)} />
                  <Chips label={spec.neverSay.length ? `never say · ${spec.label} defaults, tap × to drop` : 'never say'} hint="+ add" value={d.never_say} onChange={(v) => set('never_say', v)} />
                </div>
              </details>
            </>
          )}

          {note && <p role="alert" className="tf-note">{note}</p>}
          {!note && stepLine && step > 1 && <p className="tf-help" style={{ margin: 0 }}>{stepLine}</p>}

          <div className="tf-nav">
            {step > 1 && <button type="button" className="tf-back" onClick={() => { setStep(step - 1); setTouch(null) }}>← Back</button>}
            <span className="tf-hint">{hint}</span>
            <button type="submit" className="rl-btn tf-next" disabled={writing}>{nextLabel}</button>
          </div>
        </div>
        <div className="tf-foot">
          <span>{footLeft}</span>
          <a href="#price" onClick={() => track('toast_price_link', { from: 'form_foot' })}>What {usd(TOAST_ONCE.amount)} buys</a>
        </div>
      </form>

      {sheet && (
        <div className="rl-sheet-scrim" onClick={() => setSheet(null)}>
          <div className="rl-sheet ts-sheet" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
            {sheet === 'signin' && (
              <>
                <h3 style={{ margin: 0, font: '800 21px/1.2 var(--sora)', color: 'var(--wine)' }}>Sign up to write your free toast.</h3>
                <p className="rl-note" style={{ fontSize: 14 }}>Your form is saved on this device. Shutap writes your toast the moment you’re back.</p>
                <div className="tf-free">
                  <span className="tf-free-card" aria-hidden><span>SHUTAP.COM · SHUTAP.COM</span><span>SHUTAP.COM · SHUTAP.COM</span><span>SHUTAP.COM · SHUTAP.COM</span><span>SHUTAP.COM · SHUTAP.COM</span><span>SHUTAP.COM · SHUTAP.COM</span></span>
                  <span><b>Free: everything, with a shutap.com watermark</b><span>Across every PDF page: the speech, the cue cards{spec.keepsake ? ', the keepsake' : ''}. A clean toast is {usd(TOAST_ONCE.amount)}.</span></span>
                </div>
                <button type="button" className="rl-btn ghost tf-auth" disabled={!!opening} onClick={() => void signIn('google')}>{oauthButtonLabel('google', opening)}</button>
                <button type="button" className="rl-btn tf-auth dark" disabled={!!opening} onClick={() => void signIn('apple')}>{oauthButtonLabel('apple', opening)}</button>
                <button type="button" className="rl-btn tf-auth" onClick={() => void signIn('email')}>continue with email</button>
                {signinErr && <p className="rl-note" role="alert" style={{ color: 'var(--rose-ink)' }}>{signinErr}</p>}
                <div className="rl-row" style={{ justifyContent: 'space-between' }}>
                  <span className="rl-note">No card. 18+.</span>
                  <button type="button" className="rl-mini" onClick={() => setSheet(null)}>not now</button>
                </div>
              </>
            )}
            {sheet === 'limit' && usage && (
              <>
                <p className="rl-lbl r" style={{ margin: 0 }}>your {usage.tier === 'free' ? 'second' : 'next'} toast · {spec.label}</p>
                <h3 style={{ margin: 0, font: '800 22px/1.15 var(--sora)', color: 'var(--wine)' }}>{usage.tier === 'free' ? `Your first toast was free. This one is ${usd(TOAST_ONCE.amount)}.` : `That's your toast this month. This one is ${usd(TOAST_ONCE.amount)}.`}</h3>
                <p className="rl-note" style={{ fontSize: 14 }}>Your form is saved. Pay once and Shutap writes the toast now. You edit it until you lock; once locked, it's final, no more edits.</p>
                <button type="button" className="ts-plan" aria-pressed={choice === 'once'} onClick={() => setChoice('once')}>
                  <span className="top"><b>This toast</b><em>{usd(TOAST_ONCE.amount)} <small>one time, no subscription</small></em></span>
                  <span className="tf-buys">
                    {['The speech, written around your stories', 'Speech PDF with pause and laugh marks', 'Cue cards, 4 to a page', 'The phone prompter', 'The 60-second version', 'Rehearse timer', spec.keepsake ? 'Keepsake + the text to send after' : 'The text to send after', 'No watermark, downloads with no limit'].map((x) => <span key={x}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2f6a45" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12l5 5 9-10" /></svg>{x}</span>)}
                  </span>
                  <p>After it's written, edit and tap funnier as much as you like. When you lock, that's the final version: no more edits. A change after the lock is a new toast. Always in profile › My creations.</p>
                </button>
                {usage.tier === 'free' && (
                  <button type="button" className="ts-plan" aria-pressed={choice === 'basic'} onClick={() => setChoice('basic')}>
                    <span className="top"><b>Basic</b><em>{usd(PLANS.basic.amount)} <small>a month</small></em></span>
                    <p>1 toast a month, each with everything in “This toast”. More that month: {usd(TOAST_ONCE.amount)} each. Also 3 bits a day and 20 realtor kits a month.</p>
                  </button>
                )}
                <button type="button" className="ts-plan" aria-pressed={choice === 'pro'} onClick={() => setChoice('pro')}>
                  <span className="top"><b>Pro</b><em>{usd(PLANS.pro.amount)} <small>a month</small></em></span>
                  <p>Unlimited toasts, each with everything in “This toast”. A change after a lock is free. Unlimited bits and realtor kits.</p>
                </button>
                <button type="button" className="rl-btn" style={{ height: 50 }} onClick={pay}>{choice === 'once' ? `pay ${usd(TOAST_ONCE.amount)} & write my toast` : choice === 'basic' ? `get Basic · ${usd(PLANS.basic.amount)}/mo` : `get Pro · ${usd(PLANS.pro.amount)}/mo`}</button>
                <div className="rl-row" style={{ justifyContent: 'space-between' }}>
                  <button type="button" className="rl-mini" onClick={() => setSheet(null)}>back to my form</button>
                  <span className="rl-note">secure checkout by Stripe · tax may be added</span>
                </div>
              </>
            )}
            {sheet === 'prebuy' && (
              <>
                <h3 style={{ margin: 0, font: '800 20px var(--sora)', color: 'var(--wine)' }}>This toast · {usd(TOAST_ONCE.amount)}</h3>
                <p className="rl-note">Pay once and Shutap writes it right after: clean, no watermark. Edit it until it sounds like you; once you lock it, it's the final version, no more edits. Every download, copy and the prompter are unlimited, forever, under profile › My creations › toasts. No subscription. Tax may be added.</p>
                {checkoutError ? <p className="rl-note" role="alert" style={{ color: 'var(--rose-ink)' }}>{checkoutError}</p> : (
                  <div style={{ minHeight: 420 }}>
                    <EmbeddedCheckoutProvider key="toast-prepay" stripe={getStripe()} options={{ fetchClientSecret: fetchPrepaySecret }}>
                      <EmbeddedCheckout />
                    </EmbeddedCheckoutProvider>
                  </div>
                )}
                <button type="button" className="rl-btn ghost" onClick={() => setSheet(null)}>back to my form</button>
              </>
            )}
            {sheet === 'crisis' && (
              <div className="ts-crisis" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h3 style={{ margin: 0, font: '800 20px var(--sora)', color: 'var(--wine)' }}>This sounds heavy. Talk to a person now, free, any hour.</h3>
                <ul>
                  <li>US: call or text 988</li>
                  <li>UK &amp; Ireland: Samaritans 116 123</li>
                  <li>US: text HOME to 741741</li>
                  <li>Elsewhere: findahelpline.com</li>
                </ul>
                <button type="button" className="rl-btn ghost" onClick={() => setSheet(null)}>back to the form</button>
              </div>
            )}
            {sheet === 'off' && (
              <>
                <h3 style={{ margin: 0, font: '800 20px var(--sora)', color: 'var(--wine)' }}>Shutap Toasts opens later today.</h3>
                <p className="rl-note">Your form is kept on this device. Come back and tap write my toast.</p>
                <button type="button" className="rl-btn ghost" onClick={() => setSheet(null)}>close</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
