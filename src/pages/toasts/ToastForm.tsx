/* Shutap Toasts, the form (board 1) and paywall 1 (board 10). Nov 6 2026.
 *   occasion → who it's for (names stay on this device) → story lines in
 *   their words → the one true thing → tone → length → must-say / never-say
 *   → "write my toast" → the paywall if past the plan's toasts → the speech.
 * The form is kept on this device while they type (and across sign-in and
 * the $12.99 checkout). The server only ever sees {friend}, {partner}, {me}. */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import { useCurrentAlias } from '@/hooks/use-current-alias'
import { getStripe, getStripeEnvironment } from '@/lib/stripe'
import { confirmToastPrepay, createToastPrepayCheckout } from '@/lib/payments.functions'
import { myToastUsage, touchMyStory, writeMyToast } from '@/lib/toasts.functions'
import { OCCASION, OCCASIONS, STORY_PROMPTS, TONES, TONE_LABEL, TONE_SUB, fromPlaceholders, lengthLabel, toPlaceholders, type Names, type Occasion, type Pronoun, type Tone, type ToastForm as Form } from '@/lib/toasts/shared'
import type { ToastUsage } from '@/lib/toasts/usage.server'
import { PLANS, TOAST_ONCE, usd } from '@/lib/pricing'
import { saveNames } from '@/lib/toasts/names-store'
import { setDurableReturn } from '@/lib/auth-guard'
import { trackEvent } from '@/lib/tracking'
import { phCapture } from '@/lib/posthog'
import '@/pages/realtors/realtors.css'
import './toasts.css'

const DRAFT_KEY = 'shutap_toast_draft'

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
  tone: Tone
  length: number
  must_say: string[]
  never_say: string[]
}

function freshDraft(o: Occasion, keep?: Draft): Draft {
  const spec = OCCASION[o]
  return {
    occasion: o,
    names: keep?.names ?? { friend: '', partner: '', me: '' },
    relation: keep && keep.occasion === o ? keep.relation : '',
    what: '',
    pronouns: keep?.pronouns ?? { friend: o === 'maid_of_honor' ? 'she' : o === 'best_man' ? 'he' : 'they', partner: o === 'best_man' ? 'she' : o === 'maid_of_honor' ? 'he' : 'they' },
    stories: Array.from({ length: spec.stories }, (_, i) => keep?.stories[i] ?? { text: '', locked: false }),
    true_thing: keep?.true_thing ?? '',
    tone: keep?.tone ?? 'warm_funny',
    length: spec.defaultLength,
    must_say: keep?.must_say ?? [],
    never_say: [...spec.neverSay],
  }
}

function readDraft(): Draft | null {
  try { const raw = localStorage.getItem(DRAFT_KEY); const d = raw ? (JSON.parse(raw) as Draft) : null; return d && OCCASION[d.occasion] ? d : null } catch { return null }
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

/** The one thing to do next, for the bar above the lines and the button. */
function nextStep(d: Draft): { bar: string; why: string | null } {
  const spec = OCCASION[d.occasion]
  if (!d.names.friend.trim()) return { bar: `Start with ${spec.who}. Names stay on this device.`, why: 'add their name to continue' }
  if (spec.partner && !d.names.partner?.trim()) return { bar: 'Add who they’re marrying.', why: 'add the partner’s name to continue' }
  if (!d.names.me.trim()) return { bar: 'Add your first name: the opener says who you are.', why: 'add your name to continue' }
  const first = d.stories[0]
  if (!first?.text.trim()) return { bar: 'Type story 1 in your words: one thing, one line, the way you’d tell it.', why: 'type story 1 to continue' }
  const open = d.stories.findIndex((s) => s.text.trim() && !s.locked)
  if (open >= 0) {
    const after = d.stories.findIndex((s, i) => i > open && !s.text.trim())
    return { bar: `Lock story ${open + 1} when it reads right. Locked lines stay word for word.${after >= 0 ? ` Then story ${after + 1}, or leave it empty.` : ''}`, why: `lock story ${open + 1} to continue` }
  }
  const empty = d.stories.findIndex((s) => !s.text.trim())
  if (!d.true_thing.trim()) return { bar: `${empty >= 0 ? `Story ${empty + 1} is optional: empty gets a bridge from your other stories, never a made-up one. ` : ''}Now the one true thing: the sentence the toast ends on.`, why: 'add the one true thing to continue' }
  return { bar: 'All set. Tap write my toast.', why: null }
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
          <input className="rl-input" style={{ height: 32, width: 'auto', flex: '1 1 120px', fontSize: 13 }} placeholder={hint} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={key} onBlur={add} />
        </label>
      </div>
    </div>
  )
}

const LockIcon = ({ open, color }: { open?: boolean; color: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d={open ? 'M8 11V7a4 4 0 0 1 7.5-2' : 'M8 11V7a4 4 0 0 1 8 0v4'} /></svg>
)

export function ToastForm({ occasionIn, prepaidSession, kicker, h1, lead }: { occasionIn?: Occasion; prepaidSession?: string; kicker?: string; h1?: [string, string]; lead?: string }) {
  const { userId, ready } = useCurrentAlias()
  const navigate = useNavigate()
  const [d, setD] = useState<Draft>(() => freshDraft(occasionIn ?? 'best_man'))
  const [loaded, setLoaded] = useState(false)
  const [focus, setFocus] = useState<number | null>(null)
  const [usage, setUsage] = useState<ToastUsage | null>(null)
  const [writing, setWriting] = useState(false)
  const [sheet, setSheet] = useState<null | 'signin' | 'limit' | 'prebuy' | 'crisis' | 'off'>(null)
  const [choice, setChoice] = useState<'once' | 'basic' | 'pro'>('once')
  const [checkoutError, setCheckoutError] = useState('')
  const [touch, setTouch] = useState<{ index: number; busy: boolean; options?: { line: string; move: string }[]; error?: string } | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const noteTimer = useRef<number | undefined>(undefined)
  const say = (m: string) => { setNote(m); window.clearTimeout(noteTimer.current); noteTimer.current = window.setTimeout(() => setNote(null), 3200) }
  const spec = OCCASION[d.occasion]
  const step = useMemo(() => nextStep(d), [d])

  // the draft kept on this device; a landing page's occasion wins over an old draft's
  useEffect(() => {
    const saved = readDraft()
    if (saved) setD(occasionIn && occasionIn !== saved.occasion ? freshDraft(occasionIn, saved) : saved)
    setLoaded(true)
    track('toast_form_viewed', { occasion: occasionIn ?? saved?.occasion ?? 'best_man', resumed: !!saved })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { if (loaded) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)) } catch { /* noop */ } } }, [d, loaded])

  useEffect(() => {
    if (!ready || !userId) return
    myToastUsage({ data: {} }).then((r) => setUsage(r.usage)).catch(() => {})
  }, [ready, userId])

  // back from buying a toast before it's written: confirm, then write it now
  const autoWrite = useRef(false)
  useEffect(() => {
    if (!ready || !userId || !prepaidSession) return
    confirmToastPrepay({ data: { sessionId: prepaidSession, environment: getStripeEnvironment() } })
      .then((r) => {
        if (!r.paid) return say('payment not confirmed yet · if you were charged, your toast is saved for your next write')
        track('toast_prepaid_seen', {})
        autoWrite.current = true
      })
      .catch(() => {})
      .finally(() => { void navigate({ to: '/toasts', search: {} as never, replace: true }) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, prepaidSession])
  useEffect(() => {
    if (!autoWrite.current || !loaded || writing || step.why) return
    autoWrite.current = false
    void write()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, step.why])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const setStory = (i: number, s: Partial<Story>) => setD((x) => ({ ...x, stories: x.stories.map((y, j) => (j === i ? { ...y, ...s } : y)) }))
  function pickOccasion(o: Occasion) {
    if (o === d.occasion) return
    setD((x) => freshDraft(o, x)); setTouch(null)
    track('toast_occasion_picked', { occasion: o })
  }

  function gate() {
    setDurableReturn('/toasts')
    try { sessionStorage.setItem('shutap_returnTo', '/toasts') } catch { /* noop */ }
    setSheet('signin')
    track('signin_prompt_seen', { where: 'toasts_form' })
  }

  async function funnier(i: number) {
    if (!userId) return gate()
    const avoid = touch?.index === i ? (touch.options ?? []).map((o) => o.line) : []
    setTouch({ index: i, busy: true })
    track('toast_story_funnier_opened', { occasion: d.occasion, story: i + 1 })
    try {
      const r = await touchMyStory({ data: { form: formOf(d), index: i, avoid } })
      if (!r.ok) {
        if (r.reason === 'sign_in') { setTouch(null); return gate() }
        if (r.reason === 'off') { setTouch(null); return setSheet('off') }
        return setTouch({ index: i, busy: false, error: 'no new ways this time · tap funnier again' })
      }
      setTouch({ index: i, busy: false, options: r.options })
    } catch {
      setTouch({ index: i, busy: false, error: 'could not reach Shutap · try again' })
    }
  }

  async function write() {
    if (step.why) return
    if (!userId) return gate()
    setWriting(true)
    const form = formOf(d)
    track('toast_write_started', { occasion: d.occasion, tone: d.tone, length: d.length, stories: form.stories.filter(Boolean).length })
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
    const r = await createToastPrepayCheckout({ data: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/toasts?prepaid={CHECKOUT_SESSION_ID}` } })
    if ('error' in r && r.error) { setCheckoutError('checkout could not open · try again'); throw new Error(r.error) }
    return (r as { clientSecret: string }).clientSecret
  }

  function pay() {
    if (choice === 'once') { setCheckoutError(''); setSheet('prebuy'); track('toast_prebuy_opened', { tier: usage?.tier ?? null }); return }
    track('plan_clicked', { plan: choice, where: 'toasts_limit' })
    window.location.href = `/subscribe?plan=${choice}&from=toasts`
  }

  const left = usage && usage.toasts.cap !== null ? Math.max(0, usage.toasts.cap - usage.toasts.used) : null
  const headRight = !usage ? 'about 3 minutes to fill · kept on this device while you type'
    : usage.toasts.cap === null ? 'unlimited toasts on Pro'
    : left! > 0 ? (usage.tier === 'free' ? 'your first toast is free' : `${left} toast left this month`)
    : usage.credits > 0 ? `${usage.credits} toast bought, ready` : `next toast ${usd(TOAST_ONCE.amount)}`
  const priceLine = usage?.tier === 'pro' ? 'Unlimited toasts on Pro, no mark.'
    : usage?.tier === 'basic' ? `Basic includes 1 toast a month, no mark. Another is ${usd(TOAST_ONCE.amount)}.`
    : 'Your first toast is free (every page ends “— shutap.com”). Basic includes 1 a month. Unlimited with Pro.'

  const names = d.names
  const shown = (t: string) => fromPlaceholders(t, names)

  return (
    <div className="rl">
      <div className="ts-wrap">
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <p className="rl-kicker">{kicker ?? `shutap toasts · ${spec.label}`}</p>
          <h1 className="rl-h1">{h1 ? <>{h1[0]}<em>{h1[1]}</em></> : <>Your toast, <em>funnier.</em></>}</h1>
          <p className="rl-lead">{lead ?? 'Your stories, in your words. Shutap builds the toast around them, and only touches a line when you tap it.'}</p>
        </div>

        <div className="ts-cols">
          <form className="rl-box" onSubmit={(e) => { e.preventDefault(); void write() }}>
            <div className="rl-box-head"><span>● write your toast</span><span style={{ fontWeight: 500, color: 'var(--muted)' }}>{headRight}</span></div>
            <div className="rl-box-body" style={{ gap: 26, padding: 22 }}>

              <fieldset className="ts-sec">
                <legend>1 · the occasion</legend>
                <div className="rl-row">
                  {OCCASIONS.map((o) => <button key={o} type="button" className="rl-chip" aria-pressed={o === d.occasion} onClick={() => pickOccasion(o)} style={{ height: 38 }}>{OCCASION[o].label}</button>)}
                </div>
                {d.occasion === 'other' && (
                  <label className="ts-field">what the occasion is
                    <input className="rl-input" value={d.what} maxLength={120} placeholder="the end-of-season team dinner" onChange={(e) => set('what', e.target.value)} />
                  </label>
                )}
              </fieldset>

              <fieldset className="ts-sec">
                <legend>2 · who it's for</legend>
                <div className="ts-grid3">
                  <label className="ts-field">{spec.who}
                    <input className="rl-input" value={names.friend} maxLength={40} autoComplete="off" onChange={(e) => set('names', { ...names, friend: e.target.value })} />
                  </label>
                  <label className="ts-field">{spec.relation}
                    <input className="rl-input" value={d.relation} maxLength={80} placeholder={d.occasion === 'parent' ? 'mom' : 'my college roommate'} onChange={(e) => set('relation', e.target.value)} />
                  </label>
                  <div className="ts-field">pronouns
                    <div className="ts-seg" role="group" aria-label="their pronouns">{(['he', 'she', 'they'] as Pronoun[]).map((p) => <button key={p} type="button" aria-pressed={d.pronouns.friend === p} onClick={() => set('pronouns', { ...d.pronouns, friend: p })}>{p}</button>)}</div>
                  </div>
                  {spec.partner && (
                    <label className="ts-field">who they're marrying
                      <input className="rl-input" value={names.partner ?? ''} maxLength={40} autoComplete="off" onChange={(e) => set('names', { ...names, partner: e.target.value })} />
                    </label>
                  )}
                  <label className="ts-field">your first name
                    <input className="rl-input" value={names.me} maxLength={40} autoComplete="given-name" onChange={(e) => set('names', { ...names, me: e.target.value })} />
                  </label>
                  {spec.partner && (
                    <div className="ts-field">their partner's pronouns
                      <div className="ts-seg" role="group" aria-label="their partner's pronouns">{(['he', 'she', 'they'] as Pronoun[]).map((p) => <button key={p} type="button" aria-pressed={d.pronouns.partner === p} onClick={() => set('pronouns', { ...d.pronouns, partner: p })}>{p}</button>)}</div>
                    </div>
                  )}
                </div>
                <div className="ts-names">
                  <LockIcon color="#2f6a45" />
                  <span><b>Names stay on this device.</b> Shutap only ever sees {'{friend}'}{spec.partner ? ', {partner}' : ''} and {'{me}'}. Your browser puts {[names.friend, spec.partner ? names.partner : '', names.me].filter((n) => n?.trim()).join(', ') || 'the names'} back on screen, in the prompter and in the PDFs.</span>
                </div>
              </fieldset>

              <fieldset className="ts-sec">
                <legend>3 · {spec.stories === 1 ? 'one story, in your words' : `${spec.stories === 3 ? 'three' : spec.stories} stories, in your words`}</legend>
                <div role="status" className={`ts-bar${step.why ? '' : ' done'}`}><b className="dot">{step.why ? '→' : '✓'}</b><span>{step.bar}</span></div>
                {d.stories.map((s, i) => {
                  const p = STORY_PROMPTS[d.occasion][i] ?? { sub: 'one more', example: '' }
                  const state = s.locked ? 'locked' : s.text.trim() || focus === i ? 'typing' : 'empty'
                  return (
                    <div key={`${d.occasion}-${i}`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="ts-line-head">
                        <b>Story {i + 1} <span>· {shown(p.sub)}</span></b>
                        <i>{s.locked ? 'locked · kept word for word' : s.text.trim() ? 'not locked yet' : i > 0 ? 'empty · optional' : 'empty'}</i>
                      </div>
                      <div className={`ts-box ${state}`} style={state === 'empty' ? { gridTemplateColumns: 'minmax(0, 1fr) auto' } : undefined}>
                        <textarea
                          aria-label={`story ${i + 1}`}
                          rows={1}
                          maxLength={400}
                          value={s.text}
                          readOnly={s.locked}
                          placeholder={`type story ${i + 1} here…`}
                          onFocus={() => setFocus(i)}
                          onBlur={() => setFocus((f) => (f === i ? null : f))}
                          onChange={(e) => setStory(i, { text: e.target.value.replace(/\n/g, ' ') })}
                        />
                        {state === 'empty' ? <span className="ts-optional">{i === 0 ? 'required' : 'optional'}</span> : (
                          <>
                            <button type="button" className="ts-pill funnier" disabled={!s.text.trim() || touch?.busy} onClick={() => void funnier(i)}>{touch?.index === i && touch.busy ? 'three ways…' : 'funnier'}</button>
                            {s.locked
                              ? <button type="button" className="ts-pill locked" aria-pressed="true" aria-label={`unlock story ${i + 1}`} onClick={() => setStory(i, { locked: false })}><LockIcon color="#fff" />locked</button>
                              : <button type="button" className="ts-pill lock" aria-pressed="false" aria-label={`lock story ${i + 1}`} disabled={!s.text.trim()} onClick={() => { setStory(i, { locked: true }); if (touch?.index === i) setTouch(null); track('toast_story_locked', { occasion: d.occasion, story: i + 1 }) }}><LockIcon open color="#2f6a45" />lock</button>}
                          </>
                        )}
                      </div>
                      {touch?.index === i && !touch.busy && (
                        <div className="rl-pop" style={{ margin: 0 }}>
                          <span className="rl-lbl">three ways · nothing changes until you pick</span>
                          <button type="button" className="rl-opt keep" onClick={() => { setTouch(null); track('toast_story_funnier_kept', { story: i + 1 }) }}><b style={{ color: '#2f6a45' }}>✓</b><span>keep it as it is</span></button>
                          {touch.error ? <p className="rl-note" role="alert">{touch.error}</p> : touch.options?.map((o, k) => (
                            <button key={k} type="button" className="rl-opt" onClick={() => { setStory(i, { text: shown(o.line) }); setTouch(null); track('toast_story_funnier_picked', { story: i + 1, option: k + 1, move: o.move }) }}>
                              <b>{k + 1}</b><span>{shown(o.line)}<small>{o.move}</small></span>
                            </button>
                          ))}
                          {!touch.error && <button type="button" className="rl-mini" style={{ alignSelf: 'flex-start' }} onClick={() => void funnier(i)}>three more</button>}
                        </div>
                      )}
                      <span className="ts-help">Example: {shown(p.example)}</span>
                    </div>
                  )
                })}
                {spec.stories > 1 && <p className="ts-help" style={{ margin: 0 }}>Leave story {spec.stories} empty and Shutap writes a bridge from your other stories. It never makes up a story.</p>}
              </fieldset>

              <fieldset className="ts-sec">
                <legend>4 · the one true thing</legend>
                <span className="ts-help" style={{ fontSize: 13.5 }}>The sentence the toast ends on. Not a joke. Always kept word for word, so it's locked as soon as you type it.</span>
                <div className={`ts-box ${d.true_thing.trim() ? 'locked' : 'empty'}`} style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
                  <textarea aria-label="the one true thing" rows={1} maxLength={300} value={d.true_thing} placeholder={d.occasion === 'best_man' ? "He's the guy who shows up. Every time." : 'the sentence it ends on…'} onChange={(e) => set('true_thing', e.target.value.replace(/\n/g, ' '))} />
                  {d.true_thing.trim() ? <span className="ts-pill locked" style={{ cursor: 'default' }}><LockIcon color="#fff" />always locked</span> : <span className="ts-optional">required</span>}
                </div>
              </fieldset>

              <div className="ts-two">
                <fieldset className="ts-sec">
                  <legend>5 · tone</legend>
                  <div className="ts-tones">
                    {TONES.map((t) => <button key={t} type="button" aria-pressed={d.tone === t} onClick={() => { set('tone', t); track('toast_tone_picked', { tone: t }) }}><b>{TONE_LABEL[t]}</b><span>{TONE_SUB[t]}</span></button>)}
                  </div>
                </fieldset>
                <fieldset className="ts-sec">
                  <legend>6 · length</legend>
                  <div className="ts-lens">
                    {spec.lengths.map((s) => <button key={s} type="button" aria-pressed={d.length === s} onClick={() => set('length', s)}>{lengthLabel(d.occasion, s)}</button>)}
                  </div>
                  <p className="ts-help" style={{ margin: 0 }}>Running short on the day? A 60-second version is one tap on your toast, made when you need it.</p>
                </fieldset>
              </div>

              <fieldset className="ts-sec">
                <legend>7 · must say · never say</legend>
                <div className="ts-two" style={{ gap: 14 }}>
                  <Chips label="must say" hint="+ add" value={d.must_say} onChange={(v) => set('must_say', v)} />
                  <Chips label={spec.neverSay.length ? `never say · ${spec.label} defaults, tap × to drop` : 'never say'} hint="+ add" value={d.never_say} onChange={(v) => set('never_say', v)} />
                </div>
              </fieldset>
            </div>

            <div className="ts-foot">
              <p>18+. Built only from what you typed; nothing made up. Your stories are never read by staff or used to train anything.</p>
              <div className="ts-go">
                <button type="submit" className="rl-btn" disabled={!!step.why || writing}>{writing ? 'writing your toast… 20–60s' : 'write my toast →'}</button>
                {step.why && <span>{step.why}</span>}
              </div>
            </div>
          </form>

          <aside className="ts-side">
            <div className="rl-card">
              <span className="rl-lbl r">what you get</span>
              {[
                ['1', 'The speech', 'Pause marks, “wait for the laugh”, a running clock, the glass-raise cue.'],
                ['2', 'Cue cards', 'Print, cut, hold. One story per card, punchline in bold.'],
                ['3', 'The prompter', 'On your phone, one line at a time, with a “skip to the toast” button.'],
                ['4', 'The 60-second version', 'For when the DJ says keep it short: one tap, made when you need it.'],
                ['5', 'Rehearse', 'A timed run-through: your real time against the target.'],
                ['6', 'Keepsake + the text after', spec.keepsake ? 'A one-page copy to give them, and the text to send that night.' : 'The text to send them that night.'],
              ].map(([n, t, p]) => <div key={n} className="ts-gets"><span>{n}</span><div><b>{t}</b><p>{p}</p></div></div>)}
            </div>
            <div className="ts-how">
              <span className="rl-lbl r" style={{ color: 'var(--wine)' }}>how a toast works</span>
              <p><b>1 · write.</b> Fill this in. Shutap writes around your lines.</p>
              <p><b>2 · edit.</b> Change any word, tap funnier on any line, as much as you like, until you lock.</p>
              <p><b>3 · lock.</b> The words are final and everything above unlocks. Changing a line after that is a new toast.</p>
              <div style={{ height: 1, background: 'rgba(142,28,76,.18)' }} />
              <p className="ts-price">{usd(TOAST_ONCE.amount)} <span>a toast · one time</span></p>
              <p style={{ fontSize: 13 }}>{priceLine} <Link to="/pricing" className="rl-note" style={{ textDecoration: 'underline' }}>pricing</Link></p>
            </div>
          </aside>
        </div>
      </div>

      {note && <div className="rl-toast" role="status">{note}</div>}

      {sheet && (
        <div className="rl-sheet-scrim" onClick={() => setSheet(null)}>
          <div className="rl-sheet ts-sheet" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
            {sheet === 'signin' && (
              <>
                <h3 style={{ margin: 0, font: '800 20px var(--sora)', color: 'var(--wine)' }}>Sign in to write your toast.</h3>
                <p className="rl-note">Your first toast is free, with “— shutap.com” at the end of each page. Your form is kept on this device for after.</p>
                <Link to="/welcome" className="rl-btn">sign in with Google or Apple</Link>
                <button type="button" className="rl-btn ghost" onClick={() => setSheet(null)}>not now</button>
              </>
            )}
            {sheet === 'limit' && usage && (
              <>
                <p className="rl-lbl r" style={{ margin: 0 }}>your {usage.tier === 'free' ? 'second' : 'next'} toast · {spec.label}</p>
                <h3 style={{ margin: 0, font: '800 22px/1.15 var(--sora)', color: 'var(--wine)' }}>{usage.tier === 'free' ? `Your first toast was free. This one is ${usd(TOAST_ONCE.amount)}.` : `That's your toast this month. This one is ${usd(TOAST_ONCE.amount)}.`}</h3>
                <p className="rl-note" style={{ fontSize: 14 }}>Your form is saved. Pay once and Shutap writes the toast now.</p>
                <button type="button" className="ts-plan" aria-pressed={choice === 'once'} onClick={() => setChoice('once')}>
                  <span className="top"><b>This toast</b><em>{usd(TOAST_ONCE.amount)} <small>one time</small></em></span>
                  <p>Edit as much as you like until you lock. Then every download, copy, the prompter and rehearse: unlimited, forever. No “— shutap.com” mark. Always in your profile → My creations → toasts.</p>
                </button>
                {usage.tier === 'free' && (
                  <button type="button" className="ts-plan" aria-pressed={choice === 'basic'} onClick={() => setChoice('basic')}>
                    <span className="top"><b>Basic</b><em>{usd(PLANS.basic.amount)} <small>a month</small></em></span>
                    <p>1 toast a month included, no mark. More that month: {usd(TOAST_ONCE.amount)} each. Also 3 bits a day and 20 realtor kits a month.</p>
                  </button>
                )}
                <button type="button" className="ts-plan" aria-pressed={choice === 'pro'} onClick={() => setChoice('pro')}>
                  <span className="top"><b>Pro</b><em>{usd(PLANS.pro.amount)} <small>a month</small></em></span>
                  <p>Unlimited toasts, bits and realtor kits. No marks. A change after locking is just a new toast.</p>
                </button>
                <button type="button" className="rl-btn" style={{ height: 50 }} onClick={pay}>{choice === 'once' ? `pay ${usd(TOAST_ONCE.amount)} & write my toast` : choice === 'basic' ? `get Basic · ${usd(PLANS.basic.amount)}/mo` : `get Pro · ${usd(PLANS.pro.amount)}/mo`}</button>
                <div className="rl-row" style={{ justifyContent: 'space-between' }}>
                  <button type="button" className="rl-mini" onClick={() => setSheet(null)}>back to my form</button>
                  <span className="rl-note">secure checkout by Stripe{choice === 'once' ? ' · no subscription' : ''}</span>
                </div>
              </>
            )}
            {sheet === 'prebuy' && (
              <>
                <h3 style={{ margin: 0, font: '800 20px var(--sora)', color: 'var(--wine)' }}>This toast · {usd(TOAST_ONCE.amount)}</h3>
                <p className="rl-note">Pay once and Shutap writes it right after: clean, no mark. Every download, copy and the prompter are unlimited, forever, under profile → My creations → toasts. No subscription. Tax may be added.</p>
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
                <p className="rl-note">Your form is kept on this device. Come back tonight and tap write my toast.</p>
                <button type="button" className="rl-btn ghost" onClick={() => setSheet(null)}>close</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
