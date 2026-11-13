/* The home surface: write a story, get a bit.
 *
 *   write    the box and four controls (audience, voice, length, heat)
 *   writing  the story, four steps and a bar while the server works
 *   bit      hook, setup, tags, button, one line on why it works, the
 *            action row. Everyone sees the whole bit, guests included;
 *            a guest signs in (free) to rewrite or save it.
 *
 * New bits a day: guest 1 · free 1 · basic 3 · pro. Nov 12 2026: the box is
 * one big story box; "Make it a bit" cuts what they typed into hook, setup,
 * two tags and button (their words only), and a guest makes that one bit and
 * reads it. Watching, rehearsing, sketch, skit, saving and versions take an
 * account; a guest gets one funnier tap in the box.
 * At the limit, "write" opens the next step instead: a guest gets the
 * sign-in sheet (the story is kept and written right after sign-in), a
 * free account the plans, Pro the fair-use note.
 *
 * Crisis outranks all of it: no bit, no gate, no paywall, the help lines.
 * The server owns the tier, the budget and the text; nothing here can
 * unlock what it did not send. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { supabase } from '@/integrations/supabase/client'
import { claimGuestBits, getBit, listMyBits, splitStory, writeBit, type WriteBitResult } from '@/lib/bits.functions'
import { storyChecks } from '@/lib/bits/split'
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
import { FREE_LINE } from '@/lib/pricing'
import { promptOneTap, cancelOneTap, oneTapAvailable } from '@/lib/google-one-tap'
import { trackEvent } from '@/lib/tracking'
import { setSurfacePage, anonSessionId, jokeTap, jokeTrack } from '../joke/jokeClient'
import { ActionIcon, ACTION_COLORS } from './icons'
import { Versions } from './Versions'
import { Progress } from './Progress'
import { MixYourOwn } from './MixYourOwn'
import { Standup } from './Standup'
import { SkitView, SketchView } from './Layouts'
import { DownloadSheet } from './DownloadSheet'
import { PostSheet } from './PostSheet'
import { PaywallBody, UpgradeBody, type PaywallWhere } from './PlanSheets'
import { VideoCard } from './VideoCard'
import { EditableBit, draftOf, type Draft } from './EditableBit'
import { PerformIt } from './PerformIt'
import { EMPTY_LINES, LinedBox, linesText, writtenSlots } from './LinedBox'
import { getFlags } from '@/lib/flags.functions'
import { NO_FLAGS, type Flags } from '@/lib/flags'
import { readSlot, type Slot } from '@/lib/bits/shared'
import { downloadUsage, type DownloadUsage } from '@/lib/bits.functions'
import { FuelMeter, storyFuel, useTypingPrompt } from './storyBox'
import './bit.css'

const DRAFT_KEY = 'shutap_bit_draft'
const LINES_KEY = 'shutap_bit_lines'
/** Nov 5 2026: a guest's tap on lock / lock all, done once they're signed in */
const PENDING_LOCK_KEY = 'shutap_pending_lock'
const AUTOSTART_KEY = 'shutap_bit_autostart'
const CONTROLS_KEY = 'shutap_bit_controls'
const PENDING_KEY = 'shutap_bit_pending'
const PENDING_TTL = 60 * 60 * 1000
/** A guest's second bit, held across sign-in (localStorage: the email flow
 *  can come back in another tab) and written once, right after it. */
const PENDING_WRITE_KEY = 'shutap_pending_write'
const PENDING_WRITE_TTL = 30 * 60 * 1000

/* A write in progress, visible to every tab (Nov 4 2026). A new account had
   the site open in two tabs: the story they signed in for was written in the
   background tab, and in the tab they were looking at "make it funnier" hit
   the day's limit, which that background write had already used, so the
   paywall showed before their first bit. Now any tab sees a write already
   under way and joins it (same id: the server charges once and hands back
   the same bit) instead of starting a second one. */
const INFLIGHT_KEY = 'shutap_write_inflight'
const INFLIGHT_TTL = 2 * 60 * 1000
type Inflight = { id: string; key: string; story: string; controls: BitControls; at: number; lines?: GivenLines }
function readInflight(): Inflight | null {
  try {
    const raw = localStorage.getItem(INFLIGHT_KEY)
    if (!raw) return null
    const f = JSON.parse(raw) as Partial<Inflight>
    if (typeof f?.id !== 'string' || typeof f.key !== 'string' || typeof f.story !== 'string' || typeof f.at !== 'number' || Date.now() - f.at > INFLIGHT_TTL) {
      localStorage.removeItem(INFLIGHT_KEY)
      return null
    }
    return { id: f.id, key: f.key, story: f.story, controls: { ...DEFAULT_CONTROLS, ...(f.controls ?? {}) }, at: f.at, lines: f.lines && typeof f.lines === 'object' ? f.lines : undefined }
  } catch {
    return null
  }
}
function setInflight(f: Inflight) {
  try { localStorage.setItem(INFLIGHT_KEY, JSON.stringify(f)) } catch { /* noop */ }
}
function clearInflight(id: string) {
  try {
    const raw = localStorage.getItem(INFLIGHT_KEY)
    if (raw && (JSON.parse(raw) as { id?: string }).id === id) localStorage.removeItem(INFLIGHT_KEY)
  } catch { /* noop */ }
}

type ShownBit = Bit & { locked: boolean }

/** The sign-in sheet says what signing in unlocks, in the words of what
 *  they just tapped. The bit comes back with them either way. */
const SIGNIN_COPY: Record<string, { title: string; sub: string }> = {
  rewrite: { title: 'Sign in to rewrite it.', sub: 'Free. Hotter, tighter, a new tag, or mix your own. Your bit comes with you.' },
  lock: { title: 'Sign in to lock your lines.', sub: 'Free. Your lines stay in the box and lock the moment you’re in.' },
  funnier: { title: 'Sign in free for more funnier.', sub: 'You’ve used the free try. Signed in, funnier works on every line, unlimited, yours always first. Your lines stay in the box.' },
  swap: { title: 'Sign in to swap in a crowd-work angle.', sub: 'Free. Your bit comes with you, with all five angles.' },
  standup: { title: 'Sign in to run it as stand-up.', sub: 'Free. The teleprompter, at talking pace, with delivery cues.' },
  mix: { title: 'Sign in to mix your own.', sub: 'Free. Pick your favorite hook, tag and ending. Your bit comes with you.' },
  watch: { title: 'Sign in to watch the video.', sub: 'Free. The 5-second video comes with you.' },
  download: { title: 'Sign in to download it.', sub: 'Free: download it as often as you like, with a shutap.com watermark.' },
  save: { title: 'Sign in to keep it.', sub: 'Free. It goes in My creations with every version you make.' },
  skit: { title: 'Sign in for the skit.', sub: 'Free. A shot list you film alone, every role yours.' },
  sketch: { title: 'Sign in for the sketch.', sub: 'Free. One page in script format.' },
  post: { title: 'Sign in to post it.', sub: 'Free. Your bit comes with you.' },
  sheet: { title: 'Sign in to use this.', sub: 'Free. One tap with Google or Apple.' },
}
type Phase = 'write' | 'writing' | 'bit' | 'mix' | 'skit' | 'sketch' | 'crisis'
type Notice = { text: string; swaps: string[] }

/** Longest a visitor waits on one try. The server's own limits add up to
 *  about 50s in the worst case (scrub + writer race); a normal bit is 10-20s. */
const WRITE_TIME_LIMIT_MS = 60_000

const STEPS = ['reading it · names removed', 'finding the angle', 'writing four, ranking them', 'timing it at talking pace', 'drawing the video']

/* ── the note left before sign-in, so the bit comes back after it ── */
/** What a guest was doing when they were asked to sign in; picked back up
 *  once they're in. */
type SigninFrom = 'funnier' | 'lock' | 'rewrite' | 'swap' | 'mix' | 'download' | 'video' | 'watch' | 'save' | 'standup' | 'skit' | 'sketch' | 'post' | 'sheet' | 'one_tap'
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

/** the lined box's lines, when the write came from it (null slots = the writer's) */
type GivenLines = { hook?: string; setup?: string; tags?: string[]; button?: string }
type PendingWrite = { story: string; controls: BitControls; write_id: string; anon: string; lines?: GivenLines }
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
    return { story: p.story, controls: { ...DEFAULT_CONTROLS, ...(p.controls ?? {}) }, write_id: p.write_id, anon: p.anon, lines: p.lines && typeof p.lines === 'object' ? p.lines : undefined }
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

/** The writer on a guide or funniest page (Oct 30 2026): same box, same
 *  result, no hop to the homepage. The page's own words head it. */
export type BitEmbed = {
  /** page id for events, e.g. guides/best-man-speech */
  page: string
  heading: string
  sub?: string
  placeholder?: string
  preset?: Partial<BitControls>
  /** the page above already says what this is (/bits): no heading here */
  bare?: boolean
  /** Nov 8 2026 (/bits): a second copy of the five-line box lower on the
   *  page. It shares the lines with the main box (shutap:bit-lines) and
   *  "Make my bit" hands over to the main box (shutap:bit-make), so there is
   *  one flow: one sign-in, one write, one result. It never writes itself. */
  mirror?: boolean
  /** the page lays itself out around the box: write vs the result */
  onPhase?: (phase: 'write' | 'result') => void
  /** /bits: the demo's story, for "Stuck? Remix the demo story" */
  demoStory?: string
}

/** the five lines, shared by the boxes on one page */
const LINES_EVENT = 'shutap:bit-lines'
const MAKE_EVENT = 'shutap:bit-make'

export function BitSurface({ embed }: { embed?: BitEmbed } = {}) {
  const navigate = useNavigate()
  const router = useRouter()
  const write = useServerFn(writeBit)
  const fetchBit = useServerFn(getBit)
  const claim = useServerFn(claimGuestBits)
  const whoami = useServerFn(listMyBits)

  // Start from whatever is already in the server-rendered box: a visitor can
  // type before the app loads, and an empty start value made React clear the
  // box under them the moment it took over (the "flash").
  useEffect(() => {
    setSurfacePage(embed?.page ?? 'home')
    return () => setSurfacePage('home')
  }, [embed?.page])

  /* "Use this move on your story" on a funniest page pins that technique
     for the next write. Lives here, not in the saved controls, so it never
     follows the visitor to the homepage. */
  const [move, setMove] = useState<{ id: string; name: string } | null>(null)
  useEffect(() => {
    if (!embed) return
    const onMove = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; name: string }>).detail
      if (d?.id && d?.name) {
        setMove(d)
        jokeTrack('move_pinned', 'guest', { technique: d.id })
      }
    }
    window.addEventListener('shutap:move', onMove)
    return () => window.removeEventListener('shutap:move', onMove)
  }, [embed])

  const [story, setStory] = useState(() =>
    typeof document === 'undefined' ? '' : ((document.getElementById('bit-story') as HTMLTextAreaElement | null)?.value ?? ''),
  )
  const [controls, setControls] = useState<BitControls>(DEFAULT_CONTROLS)
  /** the lined box (slice 4b): the lines typed so far and which are locked */
  const [lines, setLines] = useState<Draft>(EMPTY_LINES)
  /** lines the AI copilot prefilled after the cut, as drafted (Nov 13 2026) */
  const [aiLines, setAiLines] = useState<Partial<Record<Slot, string>>>({})
  const [linesLocked, setLinesLocked] = useState<Slot[]>([])
  const [settingsOpen, setSettingsOpen] = useState(true)
  /** Nov 12 2026: the box starts as one story box; its cut opens the lines */
  const [boxStep, setBoxStep] = useState<'story' | 'lines'>('story')
  const [splitting, setSplitting] = useState(false)
  const split = useServerFn(splitStory)
  const [phase, setPhase] = useState<Phase>('write')
  const [tier, setTier] = useState<BitTier>('guest')
  const [usage, setUsage] = useState<BitUsage | null>(null)
  const [bit, setBit] = useState<ShownBit | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  /** signin: a feature that needs an account · signin_write: a guest's
   *  second bit · paywall: Basic and Pro (free at its limit, or removing the
   *  watermark) · upgrade: Basic at its limit · fair: Pro's fair-use cap */
  const [sheet, setSheet] = useState<null | 'signin' | 'signin_write' | 'paywall' | 'upgrade' | 'rate' | 'fair'>(null)
  const sheetOpenedAt = useRef(0)
  const [paywallWhere, setPaywallWhere] = useState<PaywallWhere>('bit_3')
  const [signinFrom, setSigninFrom] = useState<SigninFrom>('sheet')
  const [error, setError] = useState<string | null>(null)
  const [currentId, setCurrentId] = useState<string | null>(null)
  /** feature flags, read once from the server (AI on demand is behind one) */
  const [flags, setFlags] = useState<Flags>(NO_FLAGS)
  const flagsFn = useServerFn(getFlags)
  useEffect(() => { flagsFn().then(setFlags).catch(() => {}) }, [flagsFn])
  /** The lined box, on the homepage and on every guide / funniest page (Nov 6 2026). */
  const lined = flags.ondemand
  /** AI on demand: the page as edited, which lines are locked, which are theirs */
  const [draft, setDraft] = useState<Draft | null>(null)
  const [locked, setLocked] = useState<Slot[]>([])
  const [yours, setYours] = useState<Slot[]>([])
  const [toast, setToast] = useState<string | null>(null)
  /** a bit from the set list is on its way in: show that, not an empty box */
  const [opening, setOpening] = useState(false)
  const [standup, setStandup] = useState<BitVersion | null>(null)
  const [downloadOpen, setDownloadOpen] = useState(false)
  /** downloads used today, for the labels on the video */
  const [dlUsage, setDlUsage] = useState<DownloadUsage | null>(null)
  const dlFn = useServerFn(downloadUsage)
  const dlRef = useRef(dlFn)
  dlRef.current = dlFn
  const refreshDownloads = useCallback(() => {
    dlRef.current({ data: { anon_session_id: anonSessionId() } }).then(setDlUsage).catch(() => {})
  }, [])
  const downloadsLeft = dlUsage ? (dlUsage.cap === null ? null : Math.max(0, dlUsage.cap - dlUsage.used)) : undefined
  /** a download to finish once the person is back (after sign-in or payment) */
  const [resume, setResume] = useState<'video' | null>(null)
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
  // a new version on the page starts a fresh draft (locks stay: they are the person's choice)
  useEffect(() => { setDraft(version ? draftOf(version) : null); setYours([]) }, [version?.id])

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
    // A hotter/tighter/storytelling can land after the visitor has moved on (to
    // Mix your own, a skit...). Switching the bit then changes what they are
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
    setControls({ ...readControls(), ...(embed?.preset ?? {}), ...preset })
    if (Object.keys(fromUrl).length) {
      jokeTrack('preset_opened', tier, { ...fromUrl })
      try {
        const u = new URL(window.location.href)
        for (const k of PRESET_KEYS) u.searchParams.delete(k)
        window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash)
      } catch { /* noop */ }
    }
  }, [])
  /* Nov 9 2026: the first save runs in the same commit as the restore,
     before the restored text is in state, and wrote the EMPTY starting
     draft over the saved one. A second box on the page (/bits) then read
     that empty draft, and typing in it wiped the lines. The first run of
     an empty draft only replaces a saved one once the person has typed
     (typed.current); the restored value saves on the next render. */
  useEffect(() => {
    if (!typed.current && !story) return
    try { sessionStorage.setItem(DRAFT_KEY, story) } catch { /* noop */ }
  }, [story])
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LINES_KEY)
      if (!raw) return
      const p = JSON.parse(raw) as { lines?: Draft; locked?: Slot[] }
      if (p.lines && typeof p.lines.hook === 'string' && Array.isArray(p.lines.tags)) { const l = { ...EMPTY_LINES, ...p.lines, tags: [p.lines.tags[0] ?? '', p.lines.tags[1] ?? ''] }; setLines(l); setLinesLocked(Array.isArray(p.locked) ? p.locked : []); if (writtenSlots(l).length) setBoxStep('lines') }
    } catch { /* noop */ }
  }, [])
  useEffect(() => {
    if (!typed.current && !writtenSlots(lines).length && !linesLocked.length) return
    try { sessionStorage.setItem(LINES_KEY, JSON.stringify({ lines, locked: linesLocked })) } catch { /* noop */ }
  }, [lines, linesLocked])
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
    if (!pending && !note) {
      // Another tab already started the story they signed in for: show it
      // writing here and join that write (same id, charged once).
      const f = readInflight()
      if (f && !writingRef.current && phaseRef.current === 'write') {
        jokeTrack('bit_write_joined', tier, { age_ms: Date.now() - f.at, via: 'another_tab' })
        typed.current = true
        setStory(f.story)
        setControls(f.controls)
        await onWriteRef.current({ text: f.story, controls: f.controls, writeId: f.id, fromSignIn: true, lines: f.lines })
      }
      return
    }
    // A tab in the background (one they left open) must not take the story:
    // the tab they are looking at writes it. A hidden tab waits until shown.
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      const onShow = () => {
        if (document.visibilityState !== 'visible') return
        document.removeEventListener('visibilitychange', onShow)
        void restoreRef.current?.()
      }
      document.addEventListener('visibilitychange', onShow)
      return
    }
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
        await onWriteRef.current({ text: pending.story, controls: pending.controls, writeId: pending.write_id, fromSignIn: true, lines: pending.lines })
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
        else if (note.from === 'video') setResume(note.from)
        else if (note.from === 'save') say('Kept. It\'s in My creations.')
        else if (note.from === 'rewrite' || note.from === 'swap' || note.from === 'mix') say("You're in. Rewrite away.")
        else if (note.from === 'one_tap') say("You're in. This bit is saved to My creations.")
      }
    } catch {
      restoring.current = false
    }
  }, [claim, fetchBit, refresh, ctx, say])
  const restoreRef = useRef<(() => Promise<void>) | null>(null)
  restoreRef.current = restore

  /* /?bit=<id> reopens a bit from the set list (or a reload). */
  const openFromLink = useCallback(async () => {
    const id = new URLSearchParams(window.location.search).get('bit')
    if (!id || !/^[0-9a-f-]{36}$/i.test(id) || readPending() || readPendingWrite()) return
    // The link opens the bit once; a refresh afterwards lands on a clean box.
    window.history.replaceState(window.history.state, '', window.location.pathname)
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
    // The mirror box only shares lines; the main box writes and restores.
    if (embed?.mirror) { void refresh(); return }
    void refresh().then(() => restore())
    // Nov 6 2026: the homepage no longer holds the box, so /bits (an embed)
    // opens ?bit= links too (My creations links there).
    void openFromLink()
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user.is_anonymous !== true) {
        // Signed in without leaving the page (a popup, as in the preview):
        // the sign-in sheet has done its job, so it goes, and the bit they
        // asked for is written underneath it.
        setSheet((s) => (s === 'signin' || s === 'signin_write' ? null : s))
        // restore() re-reads the tier when a return note exists; One Tap on the
        // write box leaves none, so read it here too.
        void restore().finally(() => void refresh())
      }
    })
    return () => sub.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, restore, openFromLink])

  useEffect(() => {
    if (!autostartRef.current || phase !== 'write' || opening || !story.trim()) return
    autostartRef.current = false
    void onWrite()
    // onWrite reads the current story and controls; run once when they land
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, phase, opening])

  /* Google One Tap. Since Nov 1 2026 signing in comes before the first bit,
     so the card is offered while a guest writes their story: about 1.5s
     after they've typed a line, to anyone already signed in to Google in
     this browser. One tap signs in on the page; the story stays in the box.
     Never over a sign-in sheet or any other sheet (a sheet opening takes the
     card away). */
  const typedALine = story.trim().length >= 12
  useEffect(() => {
    // Nov 12 2026: in the story box a guest makes and reads their bit first; sign-in is asked on the result
    if (lined || phase !== 'write' || tier !== 'guest' || !typedALine || sheet || !oneTapAvailable()) return
    const t = window.setTimeout(() => {
      void promptOneTap({ where: embed ? 'write_box_page' : 'write_box', onCredential: () => {}, onError: (m) => say(m) })
    }, 1500)
    return () => { window.clearTimeout(t); cancelOneTap() }
  }, [embed, phase, tier, typedALine, sheet, say, lined])

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
  function onDownloadLimit(why: 'count' | 'watermark', kind: 'video' = 'video') {
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
    if (note && note.from === 'video') setResume(note.from)
    say("You're on Pro. Write as many as you want.")
  }

  type WriteOpts = { text?: string; controls?: BitControls; writeId?: string; fromSignIn?: boolean; lines?: GivenLines }

  /** which lines the last lined write handed over (for a guest's sign-in return) */
  const linedGiven = useRef<GivenLines | undefined>(undefined)
  function givenFrom(d: Draft, only: Slot[] | null): GivenLines {
    const pick = (s: Slot) => (only === null || only.includes(s)) && readSlot(d, s).trim() ? readSlot(d, s).trim() : undefined
    const tags = [pick('tag0'), pick('tag1')].map((t) => t ?? '')
    return { hook: pick('hook'), setup: pick('setup'), tags: tags.some(Boolean) ? tags : undefined, button: pick('button') }
  }
  /** lock / lock all while signed out: remember the tap, ask for sign-in,
   *  and lock once they're in (the lines themselves are kept in LINES_KEY). */
  function guestLock(what: Slot | 'all') {
    try { sessionStorage.setItem(PENDING_LOCK_KEY, what) } catch { /* noop */ }
    jokeTap('lock_needs_signin', tier, { what })
    openSignin('lock')
  }
  useEffect(() => {
    if (tier === 'guest') return
    let what: string | null = null
    try { what = sessionStorage.getItem(PENDING_LOCK_KEY); sessionStorage.removeItem(PENDING_LOCK_KEY) } catch { /* noop */ }
    if (!what) return
    const written = writtenSlots(lines)
    const add = what === 'all' ? written : written.filter((s) => s === what)
    if (!add.length) return
    setLinesLocked((prev) => Array.from(new Set([...prev, ...add])))
    jokeTrack('lock_after_signin', tier, { what })
    // lines come back from this tab's storage on load; run once the tier lands
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier])
  /** Make my bit (Nov 8 2026): all five lines are the person's, handed over
   *  word for word (Nov 13: empty lines are drafted by the AI copilot). The result lays them out as the
   *  video, stand-up, sketch and skit. A guest signs in first; the lines stay
   *  in the box and the bit is made the moment they're in. */
  function makeLined(typedNow?: Draft) {
    const draft = typedNow ?? lines
    if (embed?.mirror) {
      window.dispatchEvent(new CustomEvent(MAKE_EVENT))
      return
    }
    const given = givenFrom(draft, null)
    linedGiven.current = given
    jokeTap('lined_make', tier, { written: writtenSlots(draft).length, locked: linesLocked.length })
    // Nov 12 2026: a guest's one bit is made here (the server allows one, from
    // their own lines); a second asks them to sign in (writeOnce's cap check).
    void onWrite({ text: linesText(draft), lines: given })
  }
  /** "Make it a bit" (Nov 12 2026): the story cut into five lines, their
   *  words only (the server keeps a line only if it's found in what they
   *  typed). Nothing is stored or counted until "Make my bit". */
  async function splitIntoLines() {
    const text = story.trim()
    const checks = storyChecks(text)
    jokeTap('story_split', tier, { box: embed?.mirror ? 'mid' : embed ? 'top' : 'home', words: text ? text.split(/\s+/).length : 0, checks: checks.filter((c) => c.ok).map((c) => c.id) })
    if (text.length < 12) { setError('Tell a little more: who was there and what happened.'); return }
    setError(null)
    setSplitting(true)
    try {
      const r = await split({ data: { story: text, controls, anon_session_id: anonSessionId() } })
      if (!r.ok) {
        if (r.reason === 'crisis') { setPhase('crisis'); jokeTrack('crisis_route_shown', tier); return }
        setError(r.reason === 'rate_limited' ? 'One at a time · try again in a moment.' : 'That didn’t come back. Press “Make it a bit” again.')
        jokeTrack('story_split_failed', tier, { reason: r.reason })
        return
      }
      const d: Draft = { hook: r.lines.hook, setup: r.lines.setup, tags: [r.lines.tags[0], r.lines.tags[1]], button: r.lines.button }
      setBoxLines(d)
      setBoxLocked([])
      setAiLines(Object.fromEntries((r.drafted ?? []).map((sl) => [sl, readSlot(d, sl)])))
      setBoxStep('lines')
      jokeTrack('story_split_done', tier, { source: r.source, filled: writtenSlots(d).length, drafted: (r.drafted ?? []).length })
      if (r.notice) say(r.notice)
      requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    } catch {
      setError('Couldn’t reach Shutap. Press “Make it a bit” again.')
      jokeTrack('story_split_failed', tier, { reason: 'threw' })
    } finally {
      setSplitting(false)
    }
  }
  function backToStory() {
    setBoxStep('story')
    jokeTap('story_back', tier, {})
  }
  function remixDemo() {
    if (!embed?.demoStory) return
    typed.current = true
    setStory(embed.demoStory)
    setBoxStep('story')
    jokeTap('demo_remix', tier, {})
  }
  const checks = storyChecks(story)

  const onPhase = embed?.onPhase
  useEffect(() => { onPhase?.(phase === 'write' ? 'write' : 'result') }, [phase, onPhase])
  const makeRef = useRef(makeLined)
  makeRef.current = makeLined
  /* one draft for the boxes on a page: each box tells the others its lines */
  const boxId = useRef(Math.random().toString(36).slice(2))
  function shareLines(next: Draft, locked: Slot[]) {
    window.dispatchEvent(new CustomEvent(LINES_EVENT, { detail: { from: boxId.current, lines: next, locked } }))
  }
  function setBoxLines(d: Draft) { typed.current = true; setLines(d); shareLines(d, linesLocked) }
  function setBoxLocked(l: Slot[]) { setLinesLocked(l); shareLines(lines, l) }
  useEffect(() => {
    const onLinesEv = (e: Event) => {
      const d = (e as CustomEvent<{ from: string; lines: Draft; locked: Slot[] }>).detail
      if (!d || d.from === boxId.current) return
      setLines(d.lines)
      setLinesLocked(d.locked)
    }
    const onMake = () => {
      if (embed?.mirror) return
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // the other box's last line lands on blur, a beat before this
      window.setTimeout(() => makeRef.current(), 60)
    }
    window.addEventListener(LINES_EVENT, onLinesEv)
    window.addEventListener(MAKE_EVENT, onMake)
    return () => { window.removeEventListener(LINES_EVENT, onLinesEv); window.removeEventListener(MAKE_EVENT, onMake) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** One write at a time: a double tap (or the sign-in return racing a tap)
   *  must not start two bits. */
  const inflightId = useRef<string | null>(null)
  async function onWrite(opts?: WriteOpts) {
    if (writingRef.current) return
    writingRef.current = true
    try {
      await writeOnce(opts)
    } finally {
      writingRef.current = false
      // However the write ended (bit, limit, crisis, error), it is no longer
      // in progress for the other tabs.
      if (inflightId.current) clearInflight(inflightId.current)
      inflightId.current = null
    }
  }

  async function writeOnce(opts?: WriteOpts) {
    const text = (opts?.text ?? story).trim()
    const ctl = opts?.controls ?? controls
    if (!text || phaseRef.current === 'writing') return
    setError(null)
    const given = opts?.lines
    const key = JSON.stringify([text, ctl, given ?? null])
    // The same story already being written (in this tab or another): join
    // it rather than spending a second bit on it.
    const inflight = readInflight()
    const joining = !opts?.writeId && inflight?.key === key ? inflight : null
    // Right after sign-in the tier and count in state are stale; the server
    // checks the limit either way.
    if (!opts?.fromSignIn && !joining && atCap(usage)) {
      showLimit(tier)
      return
    }
    // One id per press of "write", reused by the silent retry below, so a
    // retry of a write that landed returns the same bit and costs nothing.
    const writeId = opts?.writeId ?? joining?.id ?? (unsureWrite.current?.key === key ? unsureWrite.current.id : newWriteId())
    if (joining) jokeTrack('bit_write_joined', tier, { age_ms: Date.now() - joining.at, via: 'press' })
    setInflight({ id: writeId, key, story: text, controls: ctl, at: joining?.at ?? Date.now(), lines: given })
    inflightId.current = writeId
    unsureWrite.current = null
    setPhase('writing')
    setNotice(null)
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    jokeTrack('bit_submitted', tier, { audience: ctl.audience, voice: ctl.voice, length: ctl.length, heat: ctl.heat, after_signin: !!opts?.fromSignIn, fuel: storyFuel(text).pct, details: storyFuel(text).details, lined: !!given, given: given ? Object.values(given).flat().filter(Boolean).length : 0 })
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
          write({ data: { story: text, lines: given, controls: move ? { ...ctl, move: move.id } : ctl, write_id: writeId, ...ctx() } }),
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
    if (given) { setLines(EMPTY_LINES); setLinesLocked([]); setBoxStep('story') }
    if (res.tier === 'guest') jokeTrack('result_seen_guest', res.tier, {})
    jokeTrack('bit_written', res.tier, { ms: res.ms, seconds: res.bit.versions[0]?.est_seconds ?? null })
  }

  /* The gate, for what needs an account: every action on the result, and a
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
      const given = lined ? linedGiven.current : undefined
      const text = (lined ? linesText(lines) : story).trim()
      if (!text) return
      writePendingWrite({ story: text, controls, write_id: newWriteId(), anon: anonSessionId(), lines: given })
    } else if (bit) {
      writePending(bit.id, anonSessionId(), signinFrom)
    }
    // Nov 5 2026: "funnier" on a line in the box opens this sheet before any
    // bit exists. The old `if (!bit) return` made all three buttons do
    // nothing. With no bit there is nothing to carry: the lines are already
    // kept in this tab (LINES_KEY) and come back in the box after sign-in.
    const back = embed ? window.location.pathname : '/'
    try { sessionStorage.setItem('shutap_returnTo', back) } catch { /* noop */ }
    setDurableReturn(back)
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
    if (window.location.search.includes('bit=')) window.history.replaceState(null, '', window.location.pathname)
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
  // Nov 1 2026: short when empty, grows with what they type (up to the CSS
  // max-height, then it scrolls), shrinks back when cleared.
  const paperRef = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    const el = paperRef.current
    if (!el) return
    el.style.height = ''
    if (!story) return
    const min = el.offsetHeight
    el.style.height = 'auto'
    el.style.height = `${Math.max(min, el.scrollHeight + 2)}px`
  }, [story, phase])

  // Pro has no cap shown (null), so no count.
  const left = usage && usage.cap !== null ? Math.max(0, usage.cap - usage.used) : null

  return (
    <section className={embed?.bare ? "bt bt-bare" : embed && !embed.mirror ? "bt bt-wide" : "bt"} aria-label="Write a bit">
      <div className="bt-col" ref={topRef} style={{ scrollMarginTop: 84 }}>
        {phase === 'write' && opening && (
          <div className="bt-hero" aria-live="polite">
            <p className="bt-sub">opening your bit…</p>
          </div>
        )}
        {phase === 'write' && !opening && (
          <>
            {embed?.bare ? (
              <span id="bit-write" aria-hidden="true" />
            ) : embed ? (
              // Nov 12 2026 (Candy): every guide and funniest page opens its box
              // the way /bits does, "Your turn — write yours.", same width.
              <div className="bt-turn" id="bit-write">
                <h2>Your turn — write yours.</h2>
                <span>free · no sign-in to start · your lines stay word for word</span>
              </div>
            ) : (
              <div className="bt-hero">
                <h1 className="bt-h1">
                  Say it <em>funnier.</em>
                  <span className="bt-h1-kicker">Whatever you have to say.</span>
                </h1>
                <p className="bt-sub">A bit, a listing, a toast, a presentation. Your words, funnier.</p>
              </div>
            )}

            {/* Nov 6 2026: the product pills are gone; the homepage lists the products. */}
            <div className="bt-box">
              <div className="bt-box-head">
                <label htmlFor="bit-story" className="bt-box-title">
                  <span className="bt-rec" aria-hidden="true" />
                  {lined ? (boxStep === 'story' ? 'tell it your way' : 'your bit · your words, word for word · AI drafts only what’s empty') : 'what do you want to say funnier?'}
                </label>
                {lined && boxStep === 'lines' ? (
                  <button type="button" className="bt-btn ghost sm" onClick={backToStory}>← back to my story</button>
                ) : lined && embed?.demoStory ? (
                  <button type="button" className="bt-btn ghost sm" onClick={remixDemo}>Stuck? Remix the demo story</button>
                ) : (
                  <span className="bt-box-aside">names get removed</span>
                )}
              </div>
              {move && (
                <div className="bt-move" role="status">
                  <span>
                    the move: <b>{move.name}</b>
                  </span>
                  <button type="button" className="bt-btn ghost sm" onClick={() => setMove(null)} aria-label="Unpin this move">
                    unpin
                  </button>
                </div>
              )}
              {lined && boxStep === 'story' ? (
                <>
                  <textarea
                    suppressHydrationWarning
                    id="bit-story"
                    ref={paperRef}
                    className="bt-paper"
                    placeholder="What happened? Who was there, what they said, what you did, how it ended…"
                    value={story}
                    maxLength={4000}
                    disabled={splitting}
                    onChange={(e) => { typed.current = true; setStory(e.target.value) }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void splitIntoLines()
                    }}
                  />
                  <div className="bt-checks" aria-label="Checks as you type">
                    <span className="bt-checks-lbl">checks as you type:</span>
                    {checks.map((c) => (
                      <span key={c.id} className={`bt-check${c.ok ? ' ok' : ''}`}>{c.ok ? '✓' : '○'} {c.label}</span>
                    ))}
                  </div>
                </>
              ) : lined ? (
                <LinedBox
                  tier={tier}
                  controls={move ? { ...controls, move: move.id } : controls}
                  lines={lines}
                  onLines={setBoxLines}
                  aiLines={aiLines}
                  locked={linesLocked}
                  onLocked={setBoxLocked}
                  busy={phaseRef.current === 'writing'}
                  onMake={makeLined}
                  box={embed?.mirror ? 'mid' : embed ? 'top' : 'home'}
                  onSignIn={tier === 'guest' ? () => openSignin('funnier') : undefined}
                  onGuestLock={guestLock}
                  onLimit={() => openPaywall('rewrite')}
                  onCrisis={() => { setPhase('crisis'); jokeTrack('crisis_route_shown', tier) }}
                  say={say}
                />
              ) : (
                <>
                  <textarea
                    suppressHydrationWarning
                    id="bit-story"
                    ref={paperRef}
                    className="bt-paper"
                    placeholder={embed?.placeholder ?? prompt}
                    value={story}
                    maxLength={4000}
                    onChange={(e) => { typed.current = true; setStory(e.target.value) }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void onWrite()
                    }}
                  />
                  <FuelMeter fuel={fuel} />
                </>
              )}
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
                {lined && boxStep === 'story' && (
                  <div className="bt-box-go">
                    <button className="bt-btn bt-go" disabled={!story.trim() || splitting} aria-busy={splitting} onClick={() => void splitIntoLines()}>
                      {splitting ? 'cutting it into a bit · drafting any line it didn’t cover…' : 'Make it a bit →'}
                    </button>
                  </div>
                )}
                {!lined && (
                  <div className="bt-box-go">
                    {fuel.words > 0 && <span className="bt-count">{fuel.words} {fuel.words === 1 ? 'word' : 'words'}</span>}
                    <button className="bt-btn bt-go" disabled={!story.trim()} onClick={() => void onWrite()}>
                      make it funnier →
                    </button>
                  </div>
                )}
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
              {tier === 'guest' ? (lined ? 'free · no sign-in to start · ' : `free: ${FREE_LINE} · sign in with Google or Apple · `) : tier !== 'pro' && left !== null ? `${WORDS[left] ?? left} left today · ` : ''}
              names removed before anything is saved · nobody at shutap reads it{lined ? ' · your lines stay word for word' : ' · ⌘↵ to write it'}
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

            <div className="bt-result">
              <div className="bt-result-main">
              <span className="bt-lbl">
                the bit · ~{version.est_seconds}s · wild {version.heat} · {bit.controls.audience}
              </span>

              {flags.ondemand && draft ? (
                <EditableBit
                  bitId={bit.id}
                  version={version}
                  tier={tier}
                  say={say}
                  draft={draft}
                  onDraft={(d) => { setDraft(d); jokeTrack('line_edited', tier, {}) }}
                  locked={locked}
                  onLocked={setLocked}
                  yours={yours}
                  onYours={setYours}
                  onKept={addVersion}
                  onSignIn={tier === 'guest' ? () => openSignin('rewrite') : undefined}
                  onLimit={() => openPaywall('rewrite')}
                />
              ) : (
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
              )}

              <div className="bt-acts" role="group" aria-label="Keep the bit">
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
                  if (tier === 'free') return openPaywall('rewrite')
                  setMixFromId(version.id)
                  setPhase('mix')
                  toTop()
                }}
                say={say}
                onSignIn={tier === 'guest' ? (from) => openSignin(from) : undefined}
                onPaywall={tier === 'free' ? () => openPaywall('rewrite') : undefined}
                onLimit={showLimit}
                left={left}
                onCharged={() => setUsage((u) => (u && u.cap !== null ? { ...u, used: Math.min(u.cap, u.used + 1) } : u))}
                locked={flags.ondemand ? locked : undefined}
              />

              <div className="bt-row">
                <button className="bt-btn ghost" onClick={writeAnother}>
                  write another
                </button>
                {tier !== 'guest' ? (
                  <span className="bt-note">kept in My creations</span>
                ) : (
                  <button className="bt-btn sm" onClick={() => openSignin('save')}>
                    keep it · sign in free
                  </button>
                )}
              </div>
              </div>
              <aside className="bt-result-side" aria-label="Post it">
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
                  period={dlUsage?.period ?? 'day'}
                  onCharged={(r) => setDlUsage((u) => ({ used: r.used, cap: r.cap, tier: r.tier, period: u?.period ?? 'day' }))}
                  resume={resume === 'video'}
                  onResumed={() => setResume(null)}
                />
                {/* Nov 6 2026: the formats as preview tiles built from this version's lines */}
                <PerformIt
                  version={version}
                  onStandup={() => {
                    // Every action on the result takes an account (Oct 30 2026).
                    if (tier === 'guest') return openSignin('standup')
                    setStandup(version)
                    jokeTrack('standup_opened', tier, { kind: version.kind })
                  }}
                  onSketch={() => { if (tier === 'guest') return openSignin('sketch'); setPhase('sketch'); jokeTrack('sketch_opened', tier, { kind: version.kind }); toTop() }}
                  onSkit={() => { if (tier === 'guest') return openSignin('skit'); setPhase('skit'); jokeTrack('skit_opened', tier, { kind: version.kind }); toTop() }}
                />
              </aside>
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
            onStandup={(v) => {
              setStandup(v)
              jokeTrack('standup_opened', tier, { kind: 'mix' })
            }}
          />
        </div>
      )}

      {(phase === 'skit' || phase === 'sketch') && bit && version && (
        <div className="bt-col">
          {phase === 'skit' ? (
            <SkitView bitId={bit.id} version={version} onBack={backToBit} onStandup={() => setStandup(version)} say={say} />
          ) : (
            <SketchView bitId={bit.id} version={version} onBack={backToBit} say={say} watermark={!isPaidTier(tier)} />
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

      {standup && <Standup bit={standup} bitId={bit?.id} versionId={standup.id} onClose={() => setStandup(null)} />}

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
                <h3 id="bit-sheet-title">{sheet === 'signin_write' ? (lined ? 'Sign in free to make another bit.' : 'Sign in to get your bit.') : SIGNIN_COPY[signinFrom].title}</h3>
                <p className="bt-sub" style={{ fontSize: 'var(--fs-body)' }}>
                  {sheet === 'signin_write' ? (lined ? `Free: ${FREE_LINE}. Your lines stay in the box, and your bit is made from them the moment you’re in.` : `Free: ${FREE_LINE}. Your story stays in the box, and the bit is written the moment you’re in.`) : SIGNIN_COPY[signinFrom].sub}
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
