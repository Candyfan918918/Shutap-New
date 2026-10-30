/* The home surface: write a story, get a bit.
 *
 *   write    the box and four controls (audience, voice, length, heat)
 *   writing  the story, four steps and a bar while the server works
 *   bit      hook, setup, tags, button, one line on why it works, the
 *            action row. Everyone sees the whole bit, guests included;
 *            a guest signs in (free) to rewrite or save it.
 *
 * New bits a day: guest 1 · free 2 (counting the guest bit) · basic 5 · pro.
 * At the limit, "write" opens the next step instead: a guest gets the
 * sign-in sheet (the story is kept and written right after sign-in), a
 * free account the plans, Pro the fair-use note.
 *
 * Crisis outranks all of it: no bit, no gate, no paywall, the help lines.
 * The server owns the tier, the budget and the text; nothing here can
 * unlock what it did not send. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { supabase } from '@/integrations/supabase/client'
import { claimGuestBits, getBit, listMyBits, writeBit, type WriteBitResult } from '@/lib/bits.functions'
import {
  AUDIENCES,
  DEFAULT_CONTROLS,
  LENGTHS,
  PRESET_KEYS,
  VOICES,
  presetFromSearch,
  type Bit,
  type BitControls,
  type BitTier,
  type BitUsage,
  type BitVersion,
  atCap,
  isPaidTier,
} from '@/lib/bits/shared'
import { setDurableReturn } from '@/lib/auth-guard'
import { startOAuth, useOAuthPending, oauthButtonLabel } from '@/lib/oauth-signin'
import { trackEvent } from '@/lib/tracking'
import { anonSessionId, jokeTrack } from '../joke/jokeClient'
import { ActionIcon } from './icons'
import { Versions } from './Versions'
import { Progress } from './Progress'
import { MixYourOwn } from './MixYourOwn'
import { Prompter } from './Prompter'
import { SceneView, ScreenplayView } from './Layouts'
import { DownloadSheet } from './DownloadSheet'
import { PostSheet } from './PostSheet'
import { PaywallBody, UpgradeBody, type PaywallWhere } from './PlanSheets'
import { VideoCard } from './VideoCard'
import { CaptionBox } from './CaptionBox'
import { downloadUsage, type DownloadUsage } from '@/lib/bits.functions'
import { FuelMeter, storyFuel, useTypingPrompt } from './storyBox'
import './bit.css'

const DRAFT_KEY = 'shutap_bit_draft'
const AUTOSTART_KEY = 'shutap_bit_autostart'
const CONTROLS_KEY = 'shutap_bit_controls'
const PENDING_KEY = 'shutap_bit_pending'
const PENDING_TTL = 60 * 60 * 1000
/** A guest's second bit, held across sign-in (localStorage: the email flow
 *  can come back in another tab) and written once, right after it. */
const PENDING_WRITE_KEY = 'shutap_pending_write'
const PENDING_WRITE_TTL = 30 * 60 * 1000

type ShownBit = Bit & { locked: boolean }

/** The sign-in sheet says what signing in unlocks, in the words of what
 *  they just tapped. The bit comes back with them either way. */
const SIGNIN_COPY: Record<string, { title: string; sub: string }> = {
  rewrite: { title: 'Sign in to rewrite it.', sub: 'Free. Hotter, tighter, a new tag, or mix your own. Your bit comes with you.' },
  swap: { title: 'Sign in to swap the tag.', sub: 'Free. Your bit comes with you, with all five spare tags.' },
  mix: { title: 'Sign in to mix your own.', sub: 'Free. Pick your favorite hook, tag and ending. Your bit comes with you.' },
  watch: { title: 'Sign in to watch the video.', sub: 'Free. The 5-second video, the caption and the hashtags come with you.' },
  download: { title: 'Sign in to download it.', sub: 'Free: one download a day (the video, or the caption and hashtags, or the picture), with a shutap.com watermark.' },
  save: { title: 'Sign in to keep it.', sub: 'Free. It goes in your set list with every version you make.' },
  scene: { title: 'Sign in to see the scene.', sub: 'Free. Your bit comes with you.' },
  screenplay: { title: 'Sign in for the screenplay.', sub: 'Free. Your bit comes with you.' },
  post: { title: 'Sign in to post it.', sub: 'Free. Your bit comes with you.' },
  sheet: { title: 'Sign in to use this.', sub: 'Free. One tap with Google or Apple.' },
}
type Phase = 'write' | 'writing' | 'bit' | 'mix' | 'scene' | 'screenplay' | 'crisis'
type Notice = { text: string; swaps: string[] }

/** Longest a visitor waits on one try. The server's own limits add up to
 *  about 50s in the worst case (scrub + writer race); a normal bit is 10-20s. */
const WRITE_TIME_LIMIT_MS = 60_000

const STEPS = ['reading it · names removed', 'finding the angle', 'writing four, ranking them', 'timing it at talking pace', 'drawing the video + caption']

/* ── the note left before sign-in, so the bit comes back after it ── */
/** What a guest was doing when they were asked to sign in; picked back up
 *  once they're in. */
type SigninFrom = 'rewrite' | 'swap' | 'mix' | 'download' | 'video' | 'caption' | 'watch' | 'save' | 'scene' | 'screenplay' | 'post' | 'sheet'
function writePending(bitId: string, anon: string, from?: SigninFrom) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ bit_id: bitId, anon, from, at: Date.now() }))
  } catch { /* noop */ }
}
function readPending(): { bit_id: string; anon: string; from?: SigninFrom } | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as { bit_id?: string; anon?: string; from?: SigninFrom; at?: number }
    if (!p?.bit_id || !p.anon || typeof p.at !== 'number' || Date.now() - p.at > PENDING_TTL) {
      localStorage.removeItem(PENDING_KEY)
      return null
    }
    return { bit_id: p.bit_id, anon: p.anon, from: p.from }
  } catch {
    return null
  }
}
function clearPending() {
  try { localStorage.removeItem(PENDING_KEY) } catch { /* noop */ }
}

type PendingWrite = { story: string; controls: BitControls; write_id: string; anon: string }
function writePendingWrite(p: PendingWrite) {
  try {
    localStorage.setItem(PENDING_WRITE_KEY, JSON.stringify({ ...p, at: Date.now() }))
  } catch { /* noop */ }
}
function readPendingWrite(): PendingWrite | null {
  try {
    const raw = localStorage.getItem(PENDING_WRITE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<PendingWrite> & { at?: number }
    if (
      typeof p?.story !== 'string' ||
      !p.story.trim() ||
      typeof p.write_id !== 'string' ||
      typeof p.anon !== 'string' ||
      typeof p.at !== 'number' ||
      Date.now() - p.at > PENDING_WRITE_TTL
    ) {
      localStorage.removeItem(PENDING_WRITE_KEY)
      return null
    }
    return { story: p.story, controls: { ...DEFAULT_CONTROLS, ...(p.controls ?? {}) }, write_id: p.write_id, anon: p.anon }
  } catch {
    return null
  }
}
function clearPendingWrite() {
  try { localStorage.removeItem(PENDING_WRITE_KEY) } catch { /* noop */ }
}

function newWriteId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    // Older browsers: a v4-shaped id from Math.random is enough for this.
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    })
  }
}

/** The controls a preset link arrived with, kept briefly across a remount. */
let arrivedPreset: { at: number; preset: Partial<BitControls> } | null = null

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

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

const SCRIM_GRACE_MS = 900

export function BitSurface() {
  const navigate = useNavigate()
  const router = useRouter()
  const write = useServerFn(writeBit)
  const fetchBit = useServerFn(getBit)
  const claim = useServerFn(claimGuestBits)
  const whoami = useServerFn(listMyBits)

  // Start from whatever is already in the server-rendered box: a visitor can
  // type before the app loads, and an empty start value made React clear the
  // box under them the moment it took over (the "flash").
  const [story, setStory] = useState(() =>
    typeof document === 'undefined' ? '' : ((document.getElementById('bit-story') as HTMLTextAreaElement | null)?.value ?? ''),
  )
  const [controls, setControls] = useState<BitControls>(DEFAULT_CONTROLS)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('write')
  const [tier, setTier] = useState<BitTier>('guest')
  const [usage, setUsage] = useState<BitUsage | null>(null)
  const [bit, setBit] = useState<ShownBit | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  /** signin: a feature that needs an account · signin_write: a guest's
   *  second bit · paywall: Basic and Pro (free at its limit, or removing the
   *  watermark) · upgrade: Basic at its limit · fair: Pro's fair-use cap */
  const [sheet, setSheet] = useState<null | 'signin' | 'signin_write' | 'paywall' | 'upgrade' | 'rate' | 'fair' | 'first_download'>(null)
  const sheetOpenedAt = useRef(0)
  const [paywallWhere, setPaywallWhere] = useState<PaywallWhere>('bit_3')
  const [signinFrom, setSigninFrom] = useState<SigninFrom>('sheet')
  const [error, setError] = useState<string | null>(null)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  /** a bit from the set list is on its way in: show that, not an empty box */
  const [opening, setOpening] = useState(false)
  const [prompter, setPrompter] = useState<BitVersion | null>(null)
  const [downloadOpen, setDownloadOpen] = useState(false)
  /** downloads used today, for the labels on the video and caption */
  const [dlUsage, setDlUsage] = useState<DownloadUsage | null>(null)
  const dlFn = useServerFn(downloadUsage)
  const dlRef = useRef(dlFn)
  dlRef.current = dlFn
  const refreshDownloads = useCallback(() => {
    dlRef.current({ data: { anon_session_id: anonSessionId() } }).then(setDlUsage).catch(() => {})
  }, [])
  const downloadsLeft = dlUsage ? (dlUsage.cap === null ? null : Math.max(0, dlUsage.cap - dlUsage.used)) : undefined
  /** a download to finish once the person is back (after sign-in or payment), or after the first-download confirm */
  const [resume, setResume] = useState<'video' | 'caption' | null>(null)
  /** the first-download-of-the-day confirm: which action asked, so the sheet can finish it */
  const [firstAsk, setFirstAsk] = useState<'video' | 'caption' | null>(null)
  /** Free accounts get one download a day: before the first one, ask which.
   *  Returns true when the sheet took over (the caller stops). */
  const confirmFirst = useCallback(
    (kind: 'video' | 'caption'): boolean => {
      if (tier !== 'free' || !dlUsage || dlUsage.used !== 0 || resume === kind) return false
      setFirstAsk(kind)
      setSheet('first_download')
      jokeTrack('download_first_confirm', tier, { kind })
      return true
    },
    [tier, dlUsage, resume],
  )
  useEffect(() => {
    if (phase === 'bit' && tier !== 'guest') refreshDownloads()
  }, [phase, tier, refreshDownloads])
  const [postOpen, setPostOpen] = useState(false)
  const topRef = useRef<HTMLDivElement | null>(null)
  const restoring = useRef(false)
  const typed = useRef(false)
  const writingRef = useRef(false)
  /** A write whose outcome is unknown (timed out, connection dropped): the
   *  next press with the same story reuses its id, so if it did land, the
   *  same bit comes back and nothing is charged twice. */
  const unsureWrite = useRef<{ key: string; id: string } | null>(null)
  // restore() runs from effects set up on first render; it reaches the
  // current onWrite (with current state) through this ref.
  const onWriteRef = useRef(onWrite)
  onWriteRef.current = onWrite

  const ctx = useCallback(() => ({ anon_session_id: anonSessionId() }), [])
  const version: BitVersion | null = bit ? (bit.versions.find((v) => v.id === currentId) ?? bit.versions[0] ?? null) : null

  const phaseRef = useRef(phase)
  phaseRef.current = phase
  /** the version Mix your own was opened on; fixed for the whole mix */
  const [mixFromId, setMixFromId] = useState<string | null>(null)

  const say = useCallback((m: string) => {
    setToast(m)
    window.setTimeout(() => setToast(null), 3200)
  }, [])

  function addVersion(v: BitVersion) {
    setBit((b) => (b ? { ...b, versions: [...b.versions, v] } : b))
    // A hotter/tighter/escalate can land after the visitor has moved on (to
    // Mix your own, a scene...). Switching the bit then changes what they are
    // working on under their thumb, so it waits in the versions row instead.
    if (phaseRef.current === 'bit') setCurrentId(v.id)
    else say(`${v.kind} version ready · it's in your versions`)
    jokeTrack('version_made', tier, { kind: v.kind })
  }

  /* One scroll per screen change. The old pattern (smooth scroll to the top,
     then a heading .focus() that scrolls again) made the page bounce on
     phones; focus now never scrolls (preventScroll). */
  function toTop() {
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function backToBit() {
    setPhase('bit')
    toTop()
  }

  /* draft + controls survive a reload. A story typed into the writer on a
     guide or funniest page arrives with an autostart flag and is written
     straight away, so the reader never retypes it. */
  const autostartRef = useRef(false)
  useEffect(() => {
    // 1 · a story handed over from a guide or funniest page rides on the
    //     navigation itself (history state), so it arrives even where page
    //     storage is blocked (e.g. inside an embedded preview).
    let handed = ''
    try {
      const hs = (window.history.state ?? {}) as { shutapStory?: unknown; shutapAutostart?: unknown }
      if (typeof hs.shutapStory === 'string' && hs.shutapStory.trim()) {
        handed = hs.shutapStory
        autostartRef.current = hs.shutapAutostart === true
        // Consume it, so a reload doesn't write the same story again.
        window.history.replaceState({ ...hs, shutapStory: null, shutapAutostart: null }, '')
      }
    } catch { /* noop */ }
    // 2 · text typed before the app finished loading is already in state
    //     (see useState above) and on screen.
    const onScreen = (document.getElementById('bit-story') as HTMLTextAreaElement | null)?.value ?? ''
    // 3 · the draft saved in this tab (and the storage copy of a hand-over).
    let saved = ''
    try {
      saved = sessionStorage.getItem(DRAFT_KEY) ?? ''
      if (!handed && sessionStorage.getItem(AUTOSTART_KEY) === '1') autostartRef.current = true
      sessionStorage.removeItem(AUTOSTART_KEY)
    } catch { /* storage blocked: the other sources still apply */ }
    // The box must never be reset to empty under someone who is typing.
    const keep = handed || (onScreen.length >= saved.length ? onScreen : saved)
    if (keep) typed.current = true
    setStory(keep)
    // 4 · a preset link from a tool page (?voice=roast&length=60s...) sets
    //     the controls on top of the saved ones, never the story. The query
    //     is then dropped from the address bar so a reload or a shared link
    //     to the homepage doesn't keep re-applying it.
    const fromUrl = presetFromSearch(window.location.search)
    if (Object.keys(fromUrl).length) arrivedPreset = { at: Date.now(), preset: fromUrl }
    // The surface can mount twice on arrival (dev double-mount, hydration);
    // the second mount sees the query already dropped, so it reuses the
    // preset that arrived a moment ago.
    const preset = arrivedPreset && Date.now() - arrivedPreset.at < 5000 ? arrivedPreset.preset : {}
    setControls({ ...readControls(), ...preset })
    if (Object.keys(fromUrl).length) {
      jokeTrack('preset_opened', tier, { ...fromUrl })
      try {
        const u = new URL(window.location.href)
        for (const k of PRESET_KEYS) u.searchParams.delete(k)
        window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash)
      } catch { /* noop */ }
    }
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

  /* After sign-in: the guest's bits become theirs (and today's guest bit
     counts toward the account's day). Then either the story they were about
     to write is written, once, or the bit they were reading comes back.
     Runs once per return. */
  const restore = useCallback(async () => {
    if (restoring.current) return
    const pending = readPendingWrite()
    const note = readPending()
    if (!pending && !note) return
    // Claimed before the first wait, so a second call (load + SIGNED_IN)
    // can't run alongside this one.
    restoring.current = true
    if (!(await hasRealSession(12))) {
      restoring.current = false
      return
    }
    try {
      const anon = pending?.anon ?? note?.anon
      if (anon) await claim({ data: { anon_session_id: anon } })
      // Cleared before writing, so a second run can never write it again.
      // The write id is reused, so even a doubled call (another tab) makes
      // one bit. The browser keeps its guest id: signing out later must not
      // hand back a fresh guest bit.
      clearPendingWrite()
      clearPending()
      const t = await refresh()
      if (pending) {
        typed.current = true
        setStory(pending.story)
        setControls(pending.controls)
        jokeTrack('bit_after_signin', t, {})
        await onWriteRef.current({ text: pending.story, controls: pending.controls, writeId: pending.write_id, fromSignIn: true })
        return
      }
      if (!note) return
      const r = await fetchBit({ data: { bit_id: note.bit_id, ...ctx() } })
      if (r.bit) {
        setBit(r.bit)
        setCurrentId(r.bit.versions[0]?.id ?? null)
        setPhase('bit')
        jokeTrack('bit_reopened', t, { from: note.from ?? null })
        requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
        // Pick up where they were.
        if (note.from === 'download') setDownloadOpen(true)
        else if (note.from === 'video' || note.from === 'caption') setResume(note.from)
        else if (note.from === 'save') say('Kept. It\'s in your set list.')
        else if (note.from === 'rewrite' || note.from === 'swap' || note.from === 'mix') say("You're in. Rewrite away.")
      }
    } catch {
      restoring.current = false
    }
  }, [claim, fetchBit, refresh, ctx, say])

  /* /?bit=<id> reopens a bit from the set list (or a reload). */
  const openFromLink = useCallback(async () => {
    const id = new URLSearchParams(window.location.search).get('bit')
    if (!id || !/^[0-9a-f-]{36}$/i.test(id) || readPending() || readPendingWrite()) return
    // The link opens the bit once; a refresh afterwards lands on a clean box.
    window.history.replaceState(window.history.state, '', '/')
    setOpening(true)
    try {
      const r = await fetchBit({ data: { bit_id: id, ...ctx() } })
      // Never swap an old bit over a story the visitor has started typing.
      if (r.bit && !typed.current) {
        setBit(r.bit)
        setCurrentId(r.bit.versions[0]?.id ?? null)
        setPhase('bit')
      }
    } catch { /* not theirs, or gone: stay on the box */ }
    finally { setOpening(false) }
  }, [fetchBit, ctx])

  useEffect(() => {
    // The linked bit opens at once, beside the account check, not after it.
    void refresh().then(() => restore())
    void openFromLink()
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user.is_anonymous !== true) {
        // Signed in without leaving the page (a popup, as in the preview):
        // the sign-in sheet has done its job, so it goes, and the bit they
        // asked for is written underneath it.
        setSheet((s) => (s === 'signin' || s === 'signin_write' ? null : s))
        void restore()
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [refresh, restore, openFromLink])

  useEffect(() => {
    if (!autostartRef.current || phase !== 'write' || opening || !story.trim()) return
    autostartRef.current = false
    void onWrite()
    // onWrite reads the current story and controls; run once when they land
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, phase, opening])

  /* A guest's sign-in page is fetched ahead, so the email button opens it
     instantly when the sheet asks for it. */
  useEffect(() => {
    if (tier !== 'guest' || !bit) return
    void router.preloadRoute({ to: '/welcome' }).catch(() => {})
    void import('@/pages/welcome/AuthStep').catch(() => {})
  }, [tier, bit, router])

  /** What the day's limit opens, by tier. The server decides the tier. */
  function showLimit(t: BitTier) {
    if (t === 'guest') {
      sheetOpenedAt.current = Date.now()
      setSheet('signin_write')
      jokeTrack('signin_sheet_opened', t, { from: 'bit_2' })
      void trackEvent('signin_prompt_seen', { where: 'bit_2' })
      return
    }
    if (t === 'pro') return setSheet('fair')
    if (t === 'basic') return openPaywall('daily_limit')
    openPaywall('bit_3')
  }

  /** The plans. 'daily_limit' is a Basic account at its limit: the Pro
   *  upgrade on the same subscription rather than a second checkout. */
  function openPaywall(where: PaywallWhere) {
    setPaywallWhere(where)
    setSheet(where === 'daily_limit' || where === 'download_limit' ? 'upgrade' : 'paywall')
    void trackEvent('paywall_seen', { where, tier })
  }

  /** Out of downloads, or wants the watermark gone. The note makes
   *  /subscribe/return land back here and finish the download. */
  function onDownloadLimit(why: 'count' | 'watermark', kind: 'video' | 'caption' = 'video') {
    if (tier === 'pro') return
    if (bit) writePending(bit.id, anonSessionId(), kind)
    if (why === 'watermark') return openPaywall('download')
    openPaywall(tier === 'basic' ? 'download_limit' : 'download_count')
  }

  async function onUpgraded() {
    setSheet(null)
    const note = readPending()
    clearPending()
    await refresh()
    if (note && (note.from === 'video' || note.from === 'caption')) setResume(note.from)
    say("You're on Pro. Write as many as you want.")
  }

  type WriteOpts = { text?: string; controls?: BitControls; writeId?: string; fromSignIn?: boolean }

  /** One write at a time: a double tap (or the sign-in return racing a tap)
   *  must not start two bits. */
  async function onWrite(opts?: WriteOpts) {
    if (writingRef.current) return
    writingRef.current = true
    try {
      await writeOnce(opts)
    } finally {
      writingRef.current = false
    }
  }

  async function writeOnce(opts?: WriteOpts) {
    const text = (opts?.text ?? story).trim()
    const ctl = opts?.controls ?? controls
    if (!text || phaseRef.current === 'writing') return
    setError(null)
    // Right after sign-in the tier and count in state are stale; the server
    // checks the limit either way.
    if (!opts?.fromSignIn && atCap(usage)) {
      showLimit(tier)
      return
    }
    // One id per press of "write", reused by the silent retry below, so a
    // retry of a write that landed returns the same bit and costs nothing.
    const key = JSON.stringify([text, ctl])
    const writeId = opts?.writeId ?? (unsureWrite.current?.key === key ? unsureWrite.current.id : newWriteId())
    unsureWrite.current = null
    setPhase('writing')
    setNotice(null)
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    jokeTrack('bit_submitted', tier, { audience: ctl.audience, voice: ctl.voice, length: ctl.length, heat: ctl.heat, after_signin: !!opts?.fromSignIn, fuel: storyFuel(text).pct, details: storyFuel(text).details })
    // One silent retry before the visitor ever sees an error: a slow model or
    // a dropped request costs a few seconds, not the bit.
    // A time limit on every try (Oct 22 2026): phones sat on "writing…" for
    // up to two minutes when a request hung, and only gave up when the
    // visitor left. Past the limit the visitor gets the try-again message
    // and the failure is logged with why. A timed-out try is not retried —
    // that would double the wait; quick failures still get one silent retry.
    const started = performance.now()
    let res: WriteBitResult | null = null
    // Set when a try ended without an answer (timeout, dropped connection):
    // that try may still land on the server.
    let unsure = false
    for (let attempt = 1; attempt <= 2; attempt++) {
      const t0 = performance.now()
      let reason = ''
      let timer: number | undefined
      try {
        res = await Promise.race([
          write({ data: { story: text, controls: ctl, write_id: writeId, ...ctx() } }),
          new Promise<never>((_, reject) => {
            timer = window.setTimeout(() => reject(new Error('timeout')), WRITE_TIME_LIMIT_MS)
          }),
        ])
      } catch (e) {
        res = null
        const msg = e instanceof Error ? e.message : String(e)
        reason = msg === 'timeout' ? 'timeout' : `threw: ${msg.slice(0, 120)}`
        unsure = true
      } finally {
        window.clearTimeout(timer)
      }
      if (res && res.status !== 'failed' && res.status !== 'no_session') break
      jokeTrack('bit_write_failed', tier, {
        attempt,
        reason: res ? res.status : reason,
        ms: Math.round(performance.now() - t0),
        hidden: document.visibilityState === 'hidden',
        online: navigator.onLine,
      })
      if (reason === 'timeout') break
    }
    if (!res) {
      // The server may still have written it. Pressing write again with the
      // same story reuses this id: a landed bit comes back, uncharged twice.
      unsureWrite.current = { key, id: writeId }
      setPhase('write')
      setError(
        performance.now() - started >= WRITE_TIME_LIMIT_MS
          ? 'That one took too long. Press write to try again.'
          : "Couldn't reach Shutap. Press write to try again.",
      )
      return
    }
    if (res.status === 'crisis') {
      setPhase('crisis')
      jokeTrack('crisis_route_shown', tier)
      return
    }
    if (res.status === 'limited') {
      setPhase('write')
      setTier(res.tier)
      setUsage(res.usage)
      if (res.reason === 'daily') showLimit(res.tier)
      else setSheet('rate')
      jokeTrack('limit_shown', res.tier, { reason: res.reason })
      return
    }
    if (res.status === 'no_session' || res.status === 'failed') {
      setPhase('write')
      if (unsure) {
        // An earlier try may still land: same id on the next press.
        unsureWrite.current = { key, id: writeId }
        setError("Couldn't write that one. Press write to try again.")
      } else {
        setError("Couldn't write that one. Try again; it didn't count.")
      }
      return
    }
    setTier(res.tier)
    setUsage(res.usage)
    setSheet((s) => (s === 'signin' || s === 'signin_write' ? null : s))
    setBit(res.bit)
    setCurrentId(res.bit.versions[0]?.id ?? null)
    const swaps = res.replacements.map((r) => r.replacement).filter(Boolean)
    setNotice(res.notice || swaps.length ? { text: res.notice, swaps } : null)
    setPhase('bit')
    setStory('')
    jokeTrack('bit_written', res.tier, { ms: res.ms, seconds: res.bit.versions[0]?.est_seconds ?? null })
  }

  /* The gate, for what needs an account: scene, screenplay, posting, and a
     guest's second bit. Google and Apple go straight to the provider; email
     goes to the email form. Either way the visitor comes back to "/" and the
     bit (or the story they were about to write) comes back with them. */
  function openSignin(from: SigninFrom) {
    sheetOpenedAt.current = Date.now()
    setSigninFrom(from)
    setSheet('signin')
    jokeTrack('signin_sheet_opened', tier, { from })
    void trackEvent('signin_prompt_seen', { where: from })
  }

  /* Oct 27 2026: most closes came 0.5–1s after opening, in an open/close
     rhythm: a second tap on "write the bit" landed on the backdrop and shut
     the sheet before it was read. Backdrop taps in the first moment after
     opening are ignored, and every close says how and how fast. */
  function dismissSignin(how: 'backdrop' | 'not_now' | 'escape' = 'not_now') {
    const ms = Date.now() - sheetOpenedAt.current
    if (how === 'backdrop' && ms < SCRIM_GRACE_MS) return
    setSheet(null)
    jokeTrack('signin_dismissed', tier, { how, ms })
  }

  async function signInForBit(method: 'google' | 'apple' | 'email', from: string) {
    if (from === 'bit_2') {
      // The guest's second bit: keep the story, write it right after sign-in.
      const text = story.trim()
      if (!text) return
      writePendingWrite({ story: text, controls, write_id: newWriteId(), anon: anonSessionId() })
    } else {
      if (!bit) return
      writePending(bit.id, anonSessionId(), signinFrom)
    }
    try { sessionStorage.setItem('shutap_returnTo', '/') } catch { /* noop */ }
    setDurableReturn('/')
    jokeTrack('signin_clicked', tier, { method, from })
    // Each button goes straight to its own sign-in: Google and Apple to the
    // provider, email to the email form only. Never to a second chooser.
    if (method === 'google' || method === 'apple') {
      const err = await startOAuth(method)
      if (!err) return
      say(err)
      return
    }
    // In-app navigation: a full page load of /welcome (client-only) showed a
    // blank screen while the whole app downloaded again.
    void navigate({ to: '/welcome', search: { method: 'email' } as never })
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

  /* A bit is shown on "/" itself, so the logo, "write" and any other link to
     the homepage point at the page already open and the router does nothing.
     Treat such a click as "write another": back to an empty box. A bit still
     being written is left alone; it lands when it's done. */
  const writeAnotherRef = useRef(writeAnother)
  writeAnotherRef.current = writeAnother
  useEffect(() => {
    // Capture phase: the router's <Link> calls preventDefault in its own
    // handler, so a bubbling listener would see every link click as handled.
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a')
      if (!a || (a.target && a.target !== '_self')) return
      let url: URL
      try { url = new URL(a.href, window.location.href) } catch { return }
      if (url.origin !== window.location.origin || url.pathname !== '/' || url.search || url.hash) return
      if (window.location.pathname !== '/') return
      if (phaseRef.current === 'write' || phaseRef.current === 'writing') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      writeAnotherRef.current()
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  const fuel = storyFuel(story)
  const prompt = useTypingPrompt(phase === 'write' && !story)

  // Pro has no cap shown (null), so no count.
  const left = usage && usage.cap !== null ? Math.max(0, usage.cap - usage.used) : null

  return (
    <section className="bt" aria-label="Write a bit">
      <div className="bt-col" ref={topRef} style={{ scrollMarginTop: 84 }}>
        {phase === 'write' && opening && (
          <div className="bt-hero" aria-live="polite">
            <p className="bt-sub">opening your bit…</p>
          </div>
        )}
        {phase === 'write' && !opening && (
          <>
            <div className="bt-hero">
              <h1 className="bt-h1">
                Say it <em>funnier.</em>
                <span className="bt-h1-kicker">Your humor, amplified.</span>
              </h1>
              <p className="bt-sub">Type what happened. Get the video, the caption, the bit. In your voice.</p>
            </div>

            <div className="bt-box">
              <div className="bt-box-head">
                <label htmlFor="bit-story" className="bt-box-title">
                  <span className="bt-rec" aria-hidden="true" />
                  tell it like you'd tell your funniest friend
                </label>
                <span className="bt-box-aside">names get removed</span>
              </div>
              <textarea
                suppressHydrationWarning
                id="bit-story"
                className="bt-paper"
                placeholder={prompt}
                value={story}
                maxLength={4000}
                onChange={(e) => { typed.current = true; setStory(e.target.value) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void onWrite()
                }}
              />
              <FuelMeter fuel={fuel} />
              <div className="bt-box-foot">
                <button
                  type="button"
                  className="bt-settings"
                  aria-expanded={settingsOpen}
                  aria-controls="bit-settings"
                  onClick={() => { setSettingsOpen((v) => !v); if (!settingsOpen) jokeTrack('write_settings_opened', tier, {}) }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h10" /><path d="M18 7h2" /><circle cx="16" cy="7" r="2" /><path d="M4 17h4" /><path d="M12 17h8" /><circle cx="10" cy="17" r="2" /></svg>
                  <span>{controls.audience} · {controls.voice} · {controls.length} · wild {controls.heat}</span>
                  <span className="bt-chev" aria-hidden="true">{settingsOpen ? '▴' : '▾'}</span>
                </button>
                <div className="bt-box-go">
                  {fuel.words > 0 && <span className="bt-count">{fuel.words} {fuel.words === 1 ? 'word' : 'words'}</span>}
                  <button className="bt-btn bt-go" disabled={!story.trim()} onClick={() => void onWrite()}>
                    make it funnier →
                  </button>
                </div>
              </div>
              {settingsOpen && (
                <div className="bt-ctl" id="bit-settings">
                  <Choice label="audience" options={AUDIENCES} value={controls.audience} onPick={(v) => setControls((c) => ({ ...c, audience: v }))} />
                  <Choice label="voice" options={VOICES} value={controls.voice} onPick={(v) => setControls((c) => ({ ...c, voice: v }))} />
                  <Choice wide label="length" options={LENGTHS} value={controls.length} onPick={(v) => setControls((c) => ({ ...c, length: v }))} />
                  <Choice
                    wide
                    label="wild"
                    hint="1 true to your story · 5 goes wild"
                    options={['1', '2', '3', '4', '5'] as const}
                    value={String(controls.heat) as '1'}
                    onPick={(v) => setControls((c) => ({ ...c, heat: Number(v) as BitControls['heat'] }))}
                  />
                </div>
              )}
            </div>
            {error && (
              <p role="alert" className="bt-note" style={{ textAlign: 'center', color: 'var(--rose-ink)', fontSize: 'var(--fs-small)' }}>
                {error}
              </p>
            )}
            <p className="bt-note" style={{ textAlign: 'center' }}>
              {tier === 'guest' ? (left === 0 ? 'sign in free for your next bit · ' : 'first bit free, no account needed · ') : tier !== 'pro' && left !== null ? `${WORDS[left] ?? left} left today · ` : ''}
              names removed before anything is saved · ⌘↵ to write it
            </p>
          </>
        )}

        {phase === 'writing' && (
          <div className="bt-card" style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 22, marginTop: 'clamp(8px, 4vh, 40px)' }}>
            <span className="bt-lbl r">writing your bit</span>
            <p data-ph-private style={{ margin: 0, fontFamily: 'var(--news)', fontSize: 'var(--fs-body)', lineHeight: 1.45, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>
              {story.trim().slice(0, 600)}
            </p>
            <Progress steps={STEPS} expectSec={12} note="usually 10 to 15 seconds" />
          </div>
        )}

        {phase === 'crisis' && (
          <div className="bt-card bt-help" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 24, marginTop: 'clamp(8px, 4vh, 40px)' }}>
            <h2 className="bt-h2" style={{ color: 'var(--ink)' }}>No jokes for this one.</h2>
            <p style={{ margin: 0, fontSize: 'var(--fs-body)', lineHeight: 1.55, color: 'var(--ink-2)' }}>
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
              <div className="bt-notice" data-ph-private>
                <div className="bt-between">
                  <span className="bt-lbl r">before we saved it</span>
                  <button className="bt-btn ghost sm" onClick={() => setNotice(null)}>
                    looks right
                  </button>
                </div>
                {notice.text && <p style={{ margin: 0, fontSize: 'var(--fs-body)', lineHeight: 1.45 }}>{notice.text}</p>}
                {notice.swaps.length > 0 && (
                  <div className="bt-swaps">
                    {notice.swaps.map((s, i) => (
                      <span key={i} className="bt-swap">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <VideoCard
              bitId={bit.id}
              version={version}
              story={bit.story}
              tier={tier}
              say={say}
              onSignIn={tier === 'guest' ? () => openSignin('video') : undefined}
              onWatch={tier === 'guest' ? () => openSignin('watch') : undefined}
              onLimit={(why) => onDownloadLimit(why, 'video')}
              onFallbackPicture={() => setDownloadOpen(true)}
              downloadsLeft={downloadsLeft}
              onCharged={(r) => setDlUsage({ used: r.used, cap: r.cap, tier: r.tier })}
              beforeDownload={() => confirmFirst('video')}
              resume={resume === 'video'}
              onResumed={() => setResume(null)}
              right={(downloadButton, note) => (
                <CaptionBox
                  embedded
                  actions={downloadButton}
                  note={note}
                  bitId={bit.id}
                  versionId={version.id}
                  tier={tier}
                  say={say}
                  onSignIn={tier === 'guest' ? () => openSignin('caption') : undefined}
                  onLimit={() => onDownloadLimit('count', 'caption')}
                  downloadsLeft={downloadsLeft}
                  onCharged={(used, cap) => setDlUsage((u) => (u ? { ...u, used, cap } : { used, cap, tier }))}
                  beforeCopy={() => confirmFirst('caption')}
                  resume={resume === 'caption'}
                  onResumed={() => setResume(null)}
                />
              )}
            />

            <span className="bt-lbl">
              the bit · ~{version.est_seconds}s · wild {version.heat} · {bit.controls.audience}
            </span>

            <article className="bt-card" aria-label="The bit" data-ph-private style={{ paddingTop: 8 }}>
              <div className="bt-slot">
                <span className="bt-lbl r">hook · on screen, first 2 seconds</span>
                <p className="bt-v hook">{version.hook}</p>
              </div>
              <div className="bt-slot">
                <span className="bt-lbl">setup</span>
                <p className="bt-v">{version.setup}</p>
              </div>
              {version.tags.map((t, i) => (
                <div key={i} className={`bt-slot${i === 0 && version.kind === 'tag_swap' ? ' new' : ''}`}>
                  <span className={`bt-lbl${i === 0 && version.kind === 'tag_swap' ? ' r' : ''}`}>tag {i + 1}{i === 0 && version.kind === 'tag_swap' ? ' · swapped' : ''}</span>
                  <p className="bt-v">{t}</p>
                </div>
              ))}
              <div className="bt-slot">
                <span className="bt-lbl r">button</span>
                <p className="bt-v" style={{ fontWeight: 400 }}>{version.button}</p>
              </div>
            </article>

            <div className="bt-acts" role="group" aria-label="Use the bit">
              <button
                className="bt-act"
                onClick={() => {
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
                    // Scene and screenplay are written on request: account only.
                    if (tier === 'guest') return openSignin(k)
                    setPhase(k)
                    jokeTrack(`${k}_opened`, tier, { kind: version.kind })
                    toTop()
                  }}
                >
                  <ActionIcon name={k} />
                  {k}
                </button>
              ))}
              <button
                className="bt-act"
                onClick={() => {
                  if (tier === 'guest') return openSignin('download')
                  setDownloadOpen(true)
                }}
              >
                <ActionIcon name="download" />
                save
              </button>
              <button
                className="bt-act"
                onClick={() => {
                  if (tier === 'guest') return openSignin('post')
                  setPostOpen(true)
                }}
              >
                <ActionIcon name="post" />
                post
              </button>
            </div>

            <Versions
              bit={bit}
              current={version}
              onSelect={(id) => setCurrentId(id)}
              onAdd={addVersion}
              onMix={() => {
                setMixFromId(version.id)
                setPhase('mix')
                toTop()
              }}
              say={say}
              onSignIn={tier === 'guest' ? (from) => openSignin(from) : undefined}
              onLimit={showLimit}
              left={left}
              onCharged={() => setUsage((u) => (u && u.cap !== null ? { ...u, used: Math.min(u.cap, u.used + 1) } : u))}
            />

            <div className="bt-row">
              <button className="bt-btn ghost" onClick={writeAnother}>
                write another
              </button>
              {tier !== 'guest' ? (
                <span className="bt-note">kept to your set list</span>
              ) : (
                <button className="bt-btn sm" onClick={() => openSignin('save')}>
                  keep it · sign in free
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {phase === 'mix' && bit && version && (
        <div className="bt-col" style={{ marginTop: 0 }}>
          <MixYourOwn
            bit={bit}
            from={bit.versions.find((v) => v.id === mixFromId) ?? version}
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
            <ScreenplayView bitId={bit.id} version={version} onBack={backToBit} say={say} watermark={!isPaidTier(tier)} />
          )}
        </div>
      )}

      {postOpen && bit && version && (
        <PostSheet bitId={bit.id} version={version} audience={bit.controls.audience} tier={tier} onClose={() => setPostOpen(false)} />
      )}

      {downloadOpen && bit && version && (
        <DownloadSheet bitId={bit.id} version={version} tier={tier}
          onClose={() => setDownloadOpen(false)}
          onUpgrade={() => {
            setDownloadOpen(false)
            openPaywall('download')
          }}
          say={say}
        />
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
            if (e.target === e.currentTarget) {
              if (sheet === 'signin' || sheet === 'signin_write') dismissSignin('backdrop')
              else {
                if (sheet === 'paywall' || sheet === 'upgrade') clearPending()
                setSheet(null)
              }
            }
          }}
        >
          <div className={`bt-sheet${sheet === 'paywall' ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="bit-sheet-title">
            {(sheet === 'signin' || sheet === 'signin_write') && (
              <>
                <h3 id="bit-sheet-title">{sheet === 'signin_write' ? 'Sign in to write this one.' : SIGNIN_COPY[signinFrom].title}</h3>
                <p className="bt-sub" style={{ fontSize: 'var(--fs-body)' }}>
                  {sheet === 'signin_write' ? 'Free. Your story stays in the box.' : SIGNIN_COPY[signinFrom].sub}
                </p>
                <GoogleButton onClick={() => void signInForBit('google', sheet === 'signin_write' ? 'bit_2' : 'sheet')} />
                <AppleButton onClick={() => void signInForBit('apple', sheet === 'signin_write' ? 'bit_2' : 'sheet')} />
                <button className="bt-btn ghost block" onClick={() => void signInForBit('email', sheet === 'signin_write' ? 'bit_2' : 'sheet')}>
                  continue with email
                </button>
                <button className="bt-btn ghost block" onClick={() => dismissSignin('not_now')}>
                  not now
                </button>
                <p className="bt-note" style={{ textAlign: 'center' }}>by continuing you confirm you're 18+ and agree to the terms and privacy policy</p>
              </>
            )}
            {sheet === 'paywall' && (
              <PaywallBody
                where={paywallWhere}
                onPick={(plan) => void trackEvent('plan_chosen', { plan, where: paywallWhere })}
                onClose={() => {
                  clearPending()
                  setSheet(null)
                }}
              />
            )}
            {sheet === 'upgrade' && (
              <UpgradeBody
                why={paywallWhere === 'download_limit' ? 'downloads' : 'bits'}
                onChoose={() => void trackEvent('plan_chosen', { plan: 'pro', where: paywallWhere })}
                onUpgraded={() => void onUpgraded()}
                onClose={() => {
                  clearPending()
                  setSheet(null)
                }}
              />
            )}
            {sheet === 'first_download' && (
              <>
                <h3 id="bit-sheet-title">Your one free download today.</h3>
                <p className="bt-sub" style={{ fontSize: 'var(--fs-body)' }}>
                  Free accounts get one a day: the video (with the shutap.com watermark), or the caption and hashtags. Which one?
                </p>
                <button
                  className="bt-btn block"
                  onClick={() => {
                    setSheet(null)
                    setResume('video')
                  }}
                >
                  {firstAsk === 'video' ? 'download the video' : 'the video instead'}
                </button>
                <button
                  className="bt-btn ghost block"
                  onClick={() => {
                    setSheet(null)
                    setResume('caption')
                  }}
                >
                  {firstAsk === 'caption' ? 'copy caption + hashtags' : 'the caption + hashtags instead'}
                </button>
                <p className="bt-note" style={{ textAlign: 'center' }}>Basic gets 3 a day with no watermark · Pro has no limit</p>
                <button className="bt-btn ghost sm block" onClick={() => setSheet(null)}>
                  not now
                </button>
              </>
            )}
            {sheet === 'fair' && (
              <>
                <h3 id="bit-sheet-title">That's a lot of bits for one day.</h3>
                <p className="bt-sub" style={{ fontSize: 'var(--fs-body)' }}>More at midnight Pacific. Your story stays in the box.</p>
                <button className="bt-btn block" onClick={() => setSheet(null)}>
                  ok
                </button>
              </>
            )}
            {sheet === 'rate' && (
              <>
                <h3 id="bit-sheet-title">Too many from this network.</h3>
                <p className="bt-sub" style={{ fontSize: 'var(--fs-body)' }}>Try again in a bit. Your story stays in the box.</p>
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
  hint,
}: {
  label: string
  /** one short line under the chips */
  hint?: string
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
      {hint && <span className="bt-note" style={{ fontSize: 'var(--fs-label)', marginTop: 6, display: 'block' }}>{hint}</span>}
    </fieldset>
  )
}

function AppleButton({ onClick }: { onClick: () => void }) {
  const opening = useOAuthPending()
  return (
    <button className="bt-btn ghost block" disabled={!!opening} onClick={onClick}>
      {oauthButtonLabel('apple', opening)}
    </button>
  )
}

function GoogleButton({ onClick }: { onClick: () => void }) {
  const opening = useOAuthPending()
  return (
    <button className="bt-btn block" disabled={!!opening} onClick={onClick}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#fff" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82zM12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24zM5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09zM12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
      </svg>
      {oauthButtonLabel('google', opening)}
    </button>
  )
}
