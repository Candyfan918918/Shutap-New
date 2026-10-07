/* The home surface: write a story, get a bit.
 *
 *   write    the box and four controls (audience, voice, length, heat)
 *   writing  the story, four steps and a bar while the server works
 *   bit      hook, setup, tags, button, one line on why it works, the
 *            action row. A guest reads the hook and setup; the tags and the
 *            button arrive masked from the server and sit behind sign-in.
 *
 * Crisis outranks all of it: no bit, no gate, no paywall, the help lines.
 * The server owns the tier, the budget and the text; nothing here can
 * unlock what it did not send. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { supabase } from '@/integrations/supabase/client'
import { claimGuestBits, getBit, listMyBits, writeBit, type WriteBitResult } from '@/lib/bits.functions'
import {
  AUDIENCES,
  DEFAULT_CONTROLS,
  LENGTHS,
  VOICES,
  type Bit,
  type BitControls,
  type BitTier,
  type BitUsage,
  type BitVersion,
} from '@/lib/bits/shared'
import { setDurableReturn } from '@/lib/auth-guard'
import { anonSessionId, clearAnonSessionId, jokeTrack } from '../joke/jokeClient'
import { ActionIcon } from './icons'
import { Versions } from './Versions'
import { MixYourOwn } from './MixYourOwn'
import { Prompter } from './Prompter'
import { SceneView, ScreenplayView } from './Layouts'
import { DownloadSheet } from './DownloadSheet'
import { PostSheet } from './PostSheet'
import './bit.css'

const DRAFT_KEY = 'shutap_bit_draft'
const CONTROLS_KEY = 'shutap_bit_controls'
const PENDING_KEY = 'shutap_bit_pending'
const PENDING_TTL = 60 * 60 * 1000

type ShownBit = Bit & { locked: boolean }
type Phase = 'write' | 'writing' | 'bit' | 'mix' | 'scene' | 'screenplay' | 'crisis'
type Notice = { text: string; swaps: string[] }

const STEPS = ['reading it · names removed', 'finding the angle', 'writing four, ranking them', 'timing it at talking pace']

/* ── the note left before sign-in, so the bit comes back after it ── */
function writePending(bitId: string, anon: string) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ bit_id: bitId, anon, at: Date.now() }))
  } catch { /* noop */ }
}
function readPending(): { bit_id: string; anon: string } | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as { bit_id?: string; anon?: string; at?: number }
    if (!p?.bit_id || !p.anon || typeof p.at !== 'number' || Date.now() - p.at > PENDING_TTL) {
      localStorage.removeItem(PENDING_KEY)
      return null
    }
    return { bit_id: p.bit_id, anon: p.anon }
  } catch {
    return null
  }
}
function clearPending() {
  try { localStorage.removeItem(PENDING_KEY) } catch { /* noop */ }
}

function readControls(): BitControls {
  try {
    const raw = localStorage.getItem(CONTROLS_KEY)
    if (raw) return { ...DEFAULT_CONTROLS, ...(JSON.parse(raw) as Partial<BitControls>) }
  } catch { /* noop */ }
  return DEFAULT_CONTROLS
}

async function hasRealSession(tries = 1): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    const s = (await supabase.auth.getSession()).data.session
    if (s?.access_token && s.user.is_anonymous !== true) return true
    if (i < tries - 1) await new Promise((r) => setTimeout(r, 250))
  }
  return false
}

function resetLabel(iso: string | undefined): string {
  const t = iso ? Date.parse(iso) : NaN
  if (!Number.isFinite(t)) return 'tomorrow'
  const d = new Date(t)
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return d.toDateString() === new Date().toDateString() ? `at ${time}` : `tomorrow at ${time}`
}













const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

export function BitSurface() {
  const navigate = useNavigate()
  const write = useServerFn(writeBit)
  const fetchBit = useServerFn(getBit)
  const claim = useServerFn(claimGuestBits)
  const whoami = useServerFn(listMyBits)

  const [story, setStory] = useState('')
  const [controls, setControls] = useState<BitControls>(DEFAULT_CONTROLS)
  const [phase, setPhase] = useState<Phase>('write')
  const [elapsed, setElapsed] = useState(0)
  const [tier, setTier] = useState<BitTier>('guest')
  const [usage, setUsage] = useState<BitUsage | null>(null)
  const [bit, setBit] = useState<ShownBit | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [sheet, setSheet] = useState<null | 'signin' | 'limit' | 'rate'>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [prompter, setPrompter] = useState<BitVersion | null>(null)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [postOpen, setPostOpen] = useState(false)
  const topRef = useRef<HTMLDivElement | null>(null)
  const restoring = useRef(false)

  const ctx = useCallback(() => ({ anon_session_id: anonSessionId() }), [])
  const version: BitVersion | null = bit ? (bit.versions.find((v) => v.id === currentId) ?? bit.versions[0] ?? null) : null

  const say = useCallback((m: string) => {
    setToast(m)
    window.setTimeout(() => setToast(null), 3200)
  }, [])

  function addVersion(v: BitVersion) {
    setBit((b) => (b ? { ...b, versions: [...b.versions, v] } : b))
    setCurrentId(v.id)
    jokeTrack('version_made', tier, { kind: v.kind })
  }

  function backToBit() {
    setPhase('bit')
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  /* draft + controls survive a reload */
  useEffect(() => {
    try { setStory(sessionStorage.getItem(DRAFT_KEY) ?? '') } catch { /* noop */ }
    setControls(readControls())
  }, [])
  useEffect(() => {
    try { sessionStorage.setItem(DRAFT_KEY, story) } catch { /* noop */ }
  }, [story])
  useEffect(() => {
    try { localStorage.setItem(CONTROLS_KEY, JSON.stringify(controls)) } catch { /* noop */ }
  }, [controls])

  /* who is here, and how many stories are left today */
  const refresh = useCallback(async () => {
    try {
      const r = await whoami({ data: ctx() })
      setTier(r.tier)
      setUsage(r.usage)
      return r.tier
    } catch {
      return 'guest' as BitTier
    }
  }, [whoami, ctx])

  /* After sign-in: the guest's bits become theirs, and the bit they were
     reading comes back unlocked. Runs once per return. */
  const restore = useCallback(async () => {
    if (restoring.current) return
    const note = readPending()
    if (!note) return
    if (!(await hasRealSession(12))) return
    restoring.current = true
    try {
      await claim({ data: { anon_session_id: note.anon } })
      clearPending()
      clearAnonSessionId()
      const t = await refresh()
      const r = await fetchBit({ data: { bit_id: note.bit_id, ...ctx() } })
      if (r.bit) {
        setBit(r.bit)
        setCurrentId(r.bit.versions[0]?.id ?? null)
        setPhase('bit')
        jokeTrack('bit_unlocked', t, {})
        requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
      }
    } catch {
      restoring.current = false
    }
  }, [claim, fetchBit, refresh, ctx])

  /* /?bit=<id> reopens a bit from the set list (or a reload). */
  const openFromLink = useCallback(async () => {
    const id = new URLSearchParams(window.location.search).get('bit')
    if (!id || !/^[0-9a-f-]{36}$/i.test(id) || readPending()) return
    try {
      const r = await fetchBit({ data: { bit_id: id, ...ctx() } })
      if (r.bit) {
        setBit(r.bit)
        setCurrentId(r.bit.versions[0]?.id ?? null)
        setPhase('bit')
      }
    } catch { /* not theirs, or gone: stay on the box */ }
  }, [fetchBit, ctx])

  useEffect(() => {
    void refresh().then(() => restore()).then(() => openFromLink())
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user.is_anonymous !== true) void restore()
    })
    return () => sub.subscription.unsubscribe()
  }, [refresh, restore, openFromLink])

  /* the writing clock */
  useEffect(() => {
    if (phase !== 'writing') return
    setElapsed(0)
    const t = window.setInterval(() => setElapsed((n) => n + 1), 1000)
    return () => window.clearInterval(t)
  }, [phase])

  async function onWrite() {
    const text = story.trim()
    if (!text || phase === 'writing') return
    setError(null)
    if (usage && usage.used >= usage.cap) {
      setSheet('limit')
      return
    }
    setPhase('writing')
    setNotice(null)
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    jokeTrack('bit_submitted', tier, { audience: controls.audience, voice: controls.voice, length: controls.length, heat: controls.heat })
    let res: WriteBitResult
    try {
      res = await write({ data: { story: text, controls, ...ctx() } })
    } catch {
      setPhase('write')
      setError("Couldn't write that one. Try again; it didn't count.")
      return
    }
    if (res.status === 'crisis') {
      setPhase('crisis')
      jokeTrack('crisis_route_shown', tier)
      return
    }
    if (res.status === 'limited') {
      setPhase('write')
      setUsage(res.usage)
      setSheet(res.reason === 'daily' ? 'limit' : 'rate')
      jokeTrack('limit_shown', res.tier, { reason: res.reason })
      return
    }
    if (res.status === 'no_session' || res.status === 'failed') {
      setPhase('write')
      setError("Couldn't write that one. Try again; it didn't count.")
      return
    }
    setTier(res.tier)
    setUsage(res.usage)
    setBit(res.bit)
    setCurrentId(res.bit.versions[0]?.id ?? null)
    const swaps = res.replacements.map((r) => r.replacement).filter(Boolean)
    setNotice(res.notice || swaps.length ? { text: res.notice, swaps } : null)
    setPhase('bit')
    setStory('')
    jokeTrack('bit_written', res.tier, { ms: res.ms, seconds: res.bit.versions[0]?.est_seconds ?? null })
  }

  function signInForBit() {
    if (!bit) return
    writePending(bit.id, anonSessionId())
    try { sessionStorage.setItem('shutap_returnTo', '/') } catch { /* noop */ }
    setDurableReturn('/')
    jokeTrack('alias_gate_shown', tier, { trigger: 'bit_locked' })
    void navigate({ to: '/welcome' })
  }

  function writeAnother() {
    if (window.location.search.includes('bit=')) window.history.replaceState(null, '', '/')
    setBit(null)
    setNotice(null)
    setPhase('write')
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      ;(document.getElementById('bit-story') as HTMLTextAreaElement | null)?.focus()
    })
  }

  const step = Math.min(STEPS.length - 1, Math.floor(elapsed / 2.5))
  const left = usage ? Math.max(0, usage.cap - usage.used) : null

  return (
    <section className="bt" aria-label="Write a bit">
      <div className="bt-col" ref={topRef} style={{ scrollMarginTop: 84 }}>
        {phase === 'write' && (
          <>
            <div className="bt-hero">
              <h1 className="bt-h1">
                Say it <em>funnier.</em>
              </h1>
              <p className="bt-sub">Write your story. Get the bit. Film it.</p>
            </div>

            <div className="bt-box">
              <label htmlFor="bit-story" className="bt-lbl">your story</label>
              <textarea
                id="bit-story"
                placeholder="write your story…"
                value={story}
                maxLength={4000}
                onChange={(e) => setStory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void onWrite()
                }}
              />
              <div className="bt-ctl">
                <Choice label="audience" options={AUDIENCES} value={controls.audience} onPick={(v) => setControls((c) => ({ ...c, audience: v }))} />
                <Choice label="voice" options={VOICES} value={controls.voice} onPick={(v) => setControls((c) => ({ ...c, voice: v }))} />
                <Choice wide label="length" options={LENGTHS} value={controls.length} onPick={(v) => setControls((c) => ({ ...c, length: v }))} />
                <Choice
                  wide
                  label="heat"
                  options={['1', '2', '3', '4', '5'] as const}
                  value={String(controls.heat) as '1'}
                  onPick={(v) => setControls((c) => ({ ...c, heat: Number(v) as BitControls['heat'] }))}
                />
              </div>
              <button className="bt-btn block" disabled={!story.trim()} onClick={() => void onWrite()}>
                write the bit
              </button>
            </div>
            {error && (
              <p role="alert" className="bt-note" style={{ textAlign: 'center', color: 'var(--rose-ink)', fontSize: 14 }}>
                {error}
              </p>
            )}
            <p className="bt-note" style={{ textAlign: 'center' }}>
              {tier === 'guest' ? 'no account needed · ' : left !== null ? `${WORDS[left] ?? left} left today · ` : ''}
              names removed before anything is saved
            </p>
          </>
        )}

        {phase === 'writing' && (
          <div className="bt-card" style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 22, marginTop: 'clamp(8px, 4vh, 40px)' }}>
            <span className="bt-lbl r">writing your bit</span>
            <p style={{ margin: 0, fontFamily: 'var(--news)', fontSize: 17, lineHeight: 1.45, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>
              {story.trim().slice(0, 600)}
            </p>
            <div className="bt-steps" aria-live="polite">
              {STEPS.map((s, i) => (
                <span key={s} className={`bt-step${i < step ? ' done' : i === step ? ' on' : ''}`}>
                  {s}
                </span>
              ))}
            </div>
            <div className="bt-bar" aria-hidden="true">
              {STEPS.map((s, i) => (
                <i key={s} className={i < step ? 'done' : i === step ? 'on' : ''} />
              ))}
            </div>
            <span className="bt-note">{elapsed < 14 ? 'about ten seconds' : 'almost there'}</span>
          </div>
        )}

        {phase === 'crisis' && (
          <div className="bt-card bt-help" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24, marginTop: 'clamp(8px, 4vh, 40px)' }}>
            <h2 className="bt-h2" style={{ color: 'var(--ink)' }}>No jokes for this one.</h2>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: 'var(--ink-2)' }}>
              This sounds heavy. Talk to a person now, free, any hour.
            </p>
            <ul>
              <li>US: call or text 988</li>
              <li>UK &amp; Ireland: Samaritans 116 123</li>
              <li>US: text HOME to 741741</li>
              <li>Elsewhere: findahelpline.com</li>
            </ul>
            <button className="bt-btn ghost" style={{ alignSelf: 'flex-start' }} onClick={writeAnother}>
              back to the box
            </button>
          </div>
        )}

        {phase === 'bit' && bit && version && (
          <>
            {notice && (
              <div className="bt-notice">
                <div className="bt-between">
                  <span className="bt-lbl r">before we saved it</span>
                  <button className="bt-btn ghost sm" onClick={() => setNotice(null)}>
                    looks right
                  </button>
                </div>
                {notice.text && <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45 }}>{notice.text}</p>}
                {notice.swaps.length > 0 && (
                  <div className="bt-swaps">
                    {notice.swaps.map((s, i) => (
                      <span key={i} className="bt-swap">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <span className="bt-lbl">
              the bit · ~{version.est_seconds}s · heat {version.heat} · {bit.controls.audience}
            </span>

            <article className="bt-card" aria-label="The bit" style={{ paddingTop: 8 }}>
              <div className="bt-slot">
                <span className="bt-lbl r">hook · on screen, first 2 seconds</span>
                <p className="bt-v hook">{version.hook}</p>
              </div>
              <div className="bt-slot">
                <span className="bt-lbl">setup</span>
                <p className="bt-v">{version.setup}</p>
              </div>
              {version.tags.map((t, i) => (
                <div key={i} className={`bt-slot${bit.locked ? ' locked' : ''}${i === 0 && version.kind === 'tag_swap' ? ' new' : ''}`}>
                  <span className={`bt-lbl${i === 0 && version.kind === 'tag_swap' ? ' r' : ''}`}>tag {i + 1}{i === 0 && version.kind === 'tag_swap' ? ' · swapped' : ''}</span>
                  <p className="bt-v" aria-hidden={bit.locked || undefined}>{t}</p>
                </div>
              ))}
              <div className={`bt-slot${bit.locked ? ' locked' : ''}`}>
                <span className="bt-lbl r">button</span>
                <p className="bt-v" style={{ fontWeight: 500 }} aria-hidden={bit.locked || undefined}>{version.button}</p>
              </div>
              {bit.locked ? (
                <button className="bt-btn block" style={{ marginTop: 8 }} onClick={() => setSheet('signin')}>
                  sign in free to see the tags and button
                </button>
              ) : (
                version.why && <p className="bt-why">{version.why}</p>
              )}
            </article>

            <div className="bt-acts" role="group" aria-label="Use the bit">
              <button
                className="bt-act"
                onClick={() => {
                  if (bit.locked) return setSheet('signin')
                  setPrompter(version)
                  jokeTrack('prompter_opened', tier, { kind: version.kind })
                }}
              >
                <ActionIcon name="prompter" />
                prompter
              </button>
              {(['scene', 'screenplay'] as const).map((k) => (
                <button
                  key={k}
                  className="bt-act"
                  onClick={() => {
                    if (bit.locked) return setSheet('signin')
                    setPhase(k)
                    jokeTrack(`${k}_opened`, tier, { kind: version.kind })
                    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
                  }}
                >
                  <ActionIcon name={k} />
                  {k}
                </button>
              ))}
              <button className="bt-act" onClick={() => setDownloadOpen(true)}>
                <ActionIcon name="download" />
                download
              </button>
              <button
                className="bt-act"
                onClick={() => {
                  if (bit.locked) return setSheet('signin')
                  setPostOpen(true)
                }}
              >
                <ActionIcon name="post" />
                post
              </button>
            </div>

            {!bit.locked && (
              <Versions
                bit={bit}
                current={version}
                onSelect={(id) => setCurrentId(id)}
                onAdd={addVersion}
                onMix={() => {
                  setPhase('mix')
                  requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
                }}
                say={say}
              />
            )}

            <div className="bt-row">
              <button className="bt-btn ghost" onClick={writeAnother}>
                write another
              </button>
              {!bit.locked && <span className="bt-note">kept to your set list</span>}
            </div>
          </>
        )}
      </div>

      {phase === 'mix' && bit && version && (
        <div className="bt-col" style={{ marginTop: 0 }}>
          <MixYourOwn
            bit={bit}
            from={version}
            onSaved={(v) => {
              setBit((b) => (b ? { ...b, versions: [...b.versions, v] } : b))
              setCurrentId(v.id)
              jokeTrack('mix_done', tier)
            }}
            onBack={backToBit}
            onPrompter={(v) => {
              setPrompter(v)
              jokeTrack('prompter_opened', tier, { kind: 'mix' })
            }}
          />
        </div>
      )}

      {(phase === 'scene' || phase === 'screenplay') && bit && version && (
        <div className="bt-col">
          {phase === 'scene' ? (
            <SceneView bitId={bit.id} version={version} onBack={backToBit} onPrompter={() => setPrompter(version)} say={say} />
          ) : (
            <ScreenplayView bitId={bit.id} version={version} onBack={backToBit} say={say} watermark={tier !== 'paying'} />
          )}
        </div>
      )}

      {postOpen && bit && version && (
        <PostSheet bitId={bit.id} version={version} audience={bit.controls.audience} tier={tier} onClose={() => setPostOpen(false)} />
      )}

      {downloadOpen && bit && version && (
        <DownloadSheet bitId={bit.id} version={version} tier={tier} locked={bit.locked} onClose={() => setDownloadOpen(false)} say={say} />
      )}

      {prompter && <Prompter bit={prompter} onClose={() => setPrompter(null)} />}

      {toast && (
        <div role="status" className="bt-toast">
          {toast}
        </div>
      )}

      {sheet && (
        <div
          className="bt-scrim"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSheet(null)
          }}
        >
          <div className="bt-sheet" role="dialog" aria-modal="true" aria-labelledby="bit-sheet-title">
            {sheet === 'signin' && (
              <>
                <h3 id="bit-sheet-title">Keep this bit.</h3>
                <p className="bt-sub" style={{ fontSize: 15 }}>
                  Free. You get a made-up name; your real one never shows. The tags and button are waiting.
                </p>
                <button className="bt-btn block" onClick={signInForBit}>
                  sign in free
                </button>
                <button className="bt-btn ghost block" onClick={() => setSheet(null)}>
                  not now
                </button>
                <p className="bt-note" style={{ textAlign: 'center' }}>18+ · by continuing you agree to the terms and privacy policy</p>
              </>
            )}
            {sheet === 'limit' && (
              <>
                <h3 id="bit-sheet-title">That's {WORDS[usage?.cap ?? 5] ?? usage?.cap} for today.</h3>
                <p className="bt-sub" style={{ fontSize: 15 }}>
                  Resets {resetLabel(usage?.resets_at)}. Your story stays in the box. Shutap+ doesn't add more; it removes the watermark.
                </p>
                <button className="bt-btn block" onClick={() => setSheet(null)}>
                  ok
                </button>
              </>
            )}
            {sheet === 'rate' && (
              <>
                <h3 id="bit-sheet-title">Too many from this network.</h3>
                <p className="bt-sub" style={{ fontSize: 15 }}>Try again in a bit. Your story stays in the box.</p>
                <button className="bt-btn block" onClick={() => setSheet(null)}>
                  ok
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function Choice<T extends string>({
  label,
  options,
  value,
  onPick,
  wide,
}: {
  label: string
  options: readonly T[]
  value: T
  onPick: (v: T) => void
  wide?: boolean
}) {
  return (
    <fieldset className={wide ? 'wide' : undefined}>
      <legend className="bt-lbl">{label}</legend>
      <div className="bt-chips">
        {options.map((o) => (
          <button key={o} type="button" className="bt-chip" aria-pressed={value === o} onClick={() => onPick(o)}>
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
