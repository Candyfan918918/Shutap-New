import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@/compat/router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import type { Room } from '../data/types'
import { REACTIONS } from '../data/constants'
import { complete, extractJSON } from '../lib/ai'
import { EyeMark } from './EyeMark'
import { track } from '../lib/feedback'
import { CommentsThread } from './CommentsThread'
import { ScanShareCard } from './ScanShareCard'
import { RoomShareSheet } from './RoomShareSheet'
import { createComment } from '@/lib/situations.functions'
import { supabase } from '@/integrations/supabase/client'
import { ActionPill } from './ShareChannels'
import { requireRealUser, type PendingIntent } from '@/lib/auth-guard'
import { recordMirrorEvent } from '@/lib/mirror-events.functions'

type MirrorDistrict = 'self' | 'career' | 'love' | 'family' | 'social'
function pillarToDistrict(pillar: string | null | undefined): MirrorDistrict | undefined {
  if (!pillar) return undefined
  if (pillar === 'career') return 'career'
  if (pillar === 'family') return 'family'
  if (pillar === 'marriage' || pillar === 'relationships') return 'love'
  return undefined
}
function fireMirror(input: {
  source: 'likes' | 'follows' | 'browse' | 'scan'
  ref_id: string
  raw_text?: string
  district_hint?: MirrorDistrict
}) {
  try { void recordMirrorEvent({ data: input }) } catch { /* never block */ }
}

const PENDING_COMMENT_KEY = 'shutap_pending_comment'


const BAND_COLOR: Record<string, string> = {
  settling: '#5B8A5E',
  sitting: '#7F77DD',
  weighing: '#c1a02b',
  heavy: '#c87c4a',
  consuming: '#17131a',
}
const BAND_LABEL: Record<string, string> = {
  settling: 'settling',
  sitting: 'sitting with it',
  weighing: 'weighing',
  heavy: 'heavy / loud',
  consuming: 'consuming',
}

interface Guide {
  guide: string
  starters: string[]
}

function guideFallback(r: Room): Guide {
  const heard = r.support === 'heard'
  const byHall: Record<string, Guide> = {
    love: { guide: "this one's about love and the mess it leaves. what did it stir in you?", starters: ["i've been here too…", 'reading this, i felt…', 'the part that got me…'] },
    family: { guide: 'family stories cut deep. say the thing this brings up — gently.', starters: ['in my family…', "what i'd want to hear…", 'this reminds me…'] },
    work: { guide: 'they put something at risk here. tell them how it lands.', starters: ['i did something like this…', 'honestly, i think…', 'what helped me…'] },
    home: { guide: 'small stakes, big feelings. vent it however it comes out.', starters: ["i'd have…", 'the part i sat with…', 'i once…'] },
  }
  return (
    byHall[r.hall] || {
      guide: heard ? 'they asked just to be heard. how does this land with you?' : "they're open to advice — but start with what you felt.",
      starters: heard ? ["i've been exactly here…", 'reading this, i felt…', 'the part that got me…'] : ['if it were me…', "one thing i'd say…", 'what helped me…'],
    }
  )
}

/* Full-screen room detail (the #room-<id> page). Reactions, presence seats,
   companion reflection, relate/add-your-side/share, and an AI-guided comment
   composer — faithful to Stream.dc.html's openRoomPage(). */
export function RoomDetail({
  room,
  onBack,
  toast,
}: {
  room: Room
  onBack: () => void
  toast: (m: string) => void
}) {
  const [active, setActive] = useState<Set<string>>(new Set())
  const [related, setRelated] = useState(false)
  const [scanShareOpen, setScanShareOpen] = useState(false)
  const [roomShareOpen, setRoomShareOpen] = useState(false)
  const [guide, setGuide] = useState<string | null>(null)
  const [chips, setChips] = useState<string[]>([])
  const [helpText, setHelpText] = useState('seen without your real name.')
  const cmtRef = useRef<HTMLTextAreaElement>(null)
  const helpTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const n = Math.min(room.sitting, 16)
  const seatGlyphs = ['🩷', '✨', '🫧', '🌷', '🦋']
  const isScan = room.kind === 'scan' && typeof room.initial_scan === 'number'
  const scanAccent = BAND_COLOR[(room.scan_band || 'sitting') as keyof typeof BAND_COLOR] || '#7F77DD'

  // ── companion-offered "not alone" share at the resonance peak (§22 T4) ──
  const offerShare = () => {
    const count = (room.relates || 0) + 1
    if (!window.ShutapShare) return
    window.ShutapShare.offer('T4', {
      valence: 'positive',
      kind: 'relate',
      big: '+' + count,
      headline: 'i wasn’t the only one.',
      companion:
        'you’re not the only one — ' + count + ' people have been exactly here. want to show that someone else isn’t alone either?',
      caption: 'turns out i wasn’t the only one. ' + count + ' people have been here too 🤍 you’re not alone either →',
      loopLabel: 'you’re not alone either →',
      url: 'https://shutap.com/room/' + room.id,
      privacy: 'only the resonance leaves — never the story or any name.',
    })
  }

  const shareRoom = async () => {
    if (!(await requireRealUser({ kind: 'custom', url: window.location.href }))) return
    if (isScan) {
      setScanShareOpen(true)
      return
    }
    setRoomShareOpen(true)
  }



  // ── AI-guided comment nudge + starters (with deterministic fallback) ──
  useEffect(() => {
    let cancelled = false
    setGuide(null)
    setChips([])
    ;(async () => {
      let res: Guide
      try {
        const prompt =
          'You are the companion on Shutap — warm, perceptive, never clinical. A room is open on this story (teller ' +
          (room.support === 'heard' ? 'asked just to be heard, no advice' : 'is open to advice') +
          '):\n"' +
          room.title +
          '"\n' +
          room.body.slice(0, 280) +
          '\n\nWrite a SHORT guiding nudge (one sentence, lowercase) inviting people to vent/respond in a way that fits this specific story. Then 3 first-person opener phrases (3-6 words each, lowercase, ending with …) that someone could tap to start their comment about THIS story.\n\nReturn STRICT JSON: {"guide":"…","starters":["…","…","…"]}'
        const raw = await complete({ messages: [{ role: 'user', content: prompt }] })
        res = extractJSON<Guide>(raw)
        if (!res || !res.guide) res = guideFallback(room)
      } catch {
        res = guideFallback(room)
      }
      if (cancelled) return
      setGuide(res.guide)
      setChips((res.starters || []).slice(0, 3))
    })()
    return () => {
      cancelled = true
    }
  }, [room])

  // ── room dwell tracking for the feedback loop ──
  useEffect(() => {
    track('room_open', { target: `room:${room.id}` })
    const start = Date.now()
    // 15s browse signal — fire once per room per session
    const browseKey = 'shutap_browsed_' + room.id
    let browseTimer: ReturnType<typeof setTimeout> | null = null
    try {
      if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem(browseKey)) {
        browseTimer = setTimeout(() => {
          try { sessionStorage.setItem(browseKey, '1') } catch { /* ignore */ }
          fireMirror({
            source: 'browse',
            ref_id: room.id,
            raw_text: (room.title || '').slice(0, 200),
            district_hint: pillarToDistrict(room.pillar),
          })
        }, 15000)
      }
    } catch { /* ignore */ }
    return () => {
      if (browseTimer) clearTimeout(browseTimer)
      const sec = Math.round((Date.now() - start) / 1000)
      const type = sec < 4 ? 'room_bounce' : sec >= 20 ? 'room_dwell_long' : 'room_dwell'
      track(type, { target: `room:${room.id}`, sec })
    }
  }, [room.id, room.title, room.pillar])

  // ── room structured data (SEO) + page title ──
  useEffect(() => {
    try {
      let s = document.getElementById('_roomld') as HTMLScriptElement | null
      if (!s) {
        s = document.createElement('script')
        s.type = 'application/ld+json'
        s.id = '_roomld'
        document.head.appendChild(s)
      }
      const top = (room.comments && room.comments[0]) || null
      const ld: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'DiscussionForumPosting',
        headline: room.title,
        articleBody: room.body || room.clean_text || '',
        author: { '@type': 'Person', name: room.alias, description: 'pseudonymous member of Shutap' },
        interactionStatistic: [
          { '@type': 'InteractionCounter', interactionType: 'https://schema.org/LikeAction', userInteractionCount: room.relates },
          { '@type': 'InteractionCounter', interactionType: 'https://schema.org/CommentAction', userInteractionCount: room.comments ? room.comments.length : 0 },
        ],
        isPartOf: { '@type': 'WebSite', name: 'Shutap', url: 'https://shutap.com/' },
      }
      if (top) ld.comment = [{ '@type': 'Comment', text: top.text, author: { '@type': 'Person', name: top.alias } }]
      s.textContent = JSON.stringify(ld)
      const prev = document.title
      document.title = room.title.replace(/\.$/, '') + ' — a room on Shutap'
      return () => {
        document.title = prev
      }
    } catch {
      /* noop */
    }
  }, [room])

  const autosize = () => {
    const t = cmtRef.current
    if (!t) return
    t.style.height = 'auto'
    t.style.height = Math.min(160, t.scrollHeight) + 'px'
  }

  const qc = useQueryClient()
  const navigate = useNavigate()
  const createCommentFn = useServerFn(createComment)
  const post = useMutation({
    mutationFn: (text: string) => createCommentFn({ data: { roomId: room.id, text } }),
  })

  const onPosted = (text: string) => {
    track('comment_post', { target: `room:${room.id}`, text: text.slice(0, 200) })
    setHelpText('offered. the room felt that.')
    if (helpTimer.current) clearTimeout(helpTimer.current)
    helpTimer.current = setTimeout(() => setHelpText('seen without your real name.'), 3200)
    toast('🤍 offered to the room.')
    qc.invalidateQueries({ queryKey: ['comments', room.id] })
  }

  const submitComment = async () => {
    const t = cmtRef.current
    if (!t) return
    const text = t.value.trim()
    if (!text) return

    // Auth gate — anonymous-only users still have a session; only true sign-out triggers this.
    const { data: sess } = await supabase.auth.getSession()
    const isAnon = !sess.session || (sess.session.user as { is_anonymous?: boolean } | undefined)?.is_anonymous
    if (isAnon) {
      try {
        sessionStorage.setItem(
          PENDING_COMMENT_KEY,
          JSON.stringify({ roomId: room.id, text }),
        )
      } catch { /* storage unavailable */ }
      toast('sign in to offer this — your draft is saved.')
      navigate('/welcome')
      return
    }

    try {
      await post.mutateAsync(text)
      t.value = ''
      t.style.height = 'auto'
      onPosted(text)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'could not post'
      toast('couldn’t offer that just yet — ' + msg)
    }
  }

  // Resume a pending comment after sign-in (mirrors shutap_pending_save).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const raw = sessionStorage.getItem(PENDING_COMMENT_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw) as { roomId?: string; text?: string }
        if (!parsed || parsed.roomId !== room.id || !parsed.text) return
        const { data: sess } = await supabase.auth.getSession()
        const user = sess.session?.user as { is_anonymous?: boolean } | undefined
        if (!sess.session || user?.is_anonymous) return
        sessionStorage.removeItem(PENDING_COMMENT_KEY)
        if (cancelled) return
        await post.mutateAsync(parsed.text)
        if (!cancelled) onPosted(parsed.text)
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id])

  const gate = async (intent: PendingIntent): Promise<boolean> => requireRealUser(intent)

  const bars = REACTIONS.map((rx) => (
    <span key={rx.k} style={{ flex: room.reactions[rx.k], background: rx.color }} />
  ))

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#ffffff', overflowY: 'auto' }}
    >
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '24px 22px 90px' }}>
        <div
          role="button"
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontFamily: 'Newsreader,serif',
            fontStyle: 'italic',
            fontSize: 13.5,
            color: '#443c42',
            cursor: 'pointer',
            marginBottom: 20,
          }}
        >
          ← back to rooms
        </div>

        {isScan ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginBottom: 14 }}>
              <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 10, letterSpacing: '.14em', color: scanAccent, background: scanAccent + '15', border: '.5px solid ' + scanAccent + '30', padding: '4px 10px', borderRadius: 999 }}>
                SCAN · {BAND_LABEL[(room.scan_band || 'sitting') as keyof typeof BAND_LABEL]}
              </span>
              <span style={{ fontSize: 12.5, color: '#6f666c', fontFamily: 'Newsreader,serif', fontStyle: 'italic' }}>{room.hours} ago</span>
            </div>
            {/* --- SCAN SCORE CARD HERO --- */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginBottom: 18 }}>
              <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 88, lineHeight: 1, letterSpacing: '-.04em', color: scanAccent }}>
                {room.initial_scan}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontFamily: 'Cormorant Garamond,Newsreader,serif', fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(22px,4vw,30px)', lineHeight: 1.15, margin: 0, color: '#100c14' }}>
                  {room.scan_signature || room.title}
                </h2>
                {room.pillar && (
                  <div style={{ marginTop: 10, display: 'inline-block', fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#443c42', background: '#fdfbf9', padding: '3px 10px', borderRadius: 999 }}>
                    {room.pillar}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#fdfbf9', display: 'grid', placeItems: 'center', fontSize: 16, flex: 'none' }}>
                {room.emoji}
              </span>
              <span style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 14, color: '#443c42' }}>{room.alias}</span>
            </div>
          </>
        ) : (
          /* --- CINEMATIC STORY COVER --- */
          <div
            style={{
              position: 'relative',
              background: 'linear-gradient(165deg,#100c14,#0e0e0e 65%)',
              borderRadius: 26,
              padding: '34px 30px 30px',
              marginBottom: 30,
              overflow: 'hidden',
              boxShadow: '0 40px 90px -40px rgba(20,16,22,.65)',
            }}
          >
            <div style={{ position: 'absolute', width: 340, height: 340, left: '70%', top: 0, background: 'radial-gradient(circle,rgba(23,19,26,.24),transparent 64%)', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: '-2%', bottom: '-46%', fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 'clamp(200px,34vw,380px)', lineHeight: 1, color: 'rgba(23,19,26,.09)', pointerEvents: 'none', userSelect: 'none' }}>”</div>
            <div style={{ position: 'absolute', top: 0, left: '12%', right: '12%', height: 1.5, background: 'linear-gradient(90deg,transparent,#2b2630,#e2dde0,transparent)', opacity: 0.5, pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginBottom: 18 }}>
                <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '.24em', textTransform: 'uppercase', color: '#e2dde0' }}>the room is holding —</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '5px 13px',
                    borderRadius: 999,
                    fontFamily: 'Sora,sans-serif',
                    fontWeight: 600,
                    fontSize: 10.5,
                    letterSpacing: '.05em',
                    background: room.support === 'heard' ? 'rgba(23,19,26,.14)' : 'rgba(91,138,94,.18)',
                    color: room.support === 'heard' ? '#e2dde0' : '#a9d4ac',
                    border: '.5px solid ' + (room.support === 'heard' ? 'rgba(226,221,224,.28)' : 'rgba(169,212,172,.30)'),
                  }}
                >
                  {room.support === 'heard' ? 'looking to be heard' : 'open to advice'}
                </span>
                <span style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 13, color: '#6f666c' }}>{room.hours} ago</span>
              </div>
              <h1
                style={{
                  fontFamily: 'Sora,sans-serif',
                  fontWeight: 800,
                  fontSize: 'clamp(28px,6vw,50px)',
                  lineHeight: 1.02,
                  margin: '0 0 22px',
                  color: '#fdfbf9',
                  letterSpacing: '-.045em',
                }}
              >
                {room.title}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(23,19,26,.2)', display: 'grid', placeItems: 'center', fontSize: 19, flex: 'none' }}>{room.emoji}</span>
                <div>
                  <div style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 14.5, color: '#e2dde0' }}>{room.alias}</div>
                  <div style={{ fontSize: 11.5, color: '#6f666c', fontFamily: 'Newsreader,serif', fontStyle: 'italic' }}>teller · this is their account of it</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {(room.body || room.clean_text) && (
          <p style={{ fontFamily: 'Newsreader,serif', fontSize: 18.5, lineHeight: 1.72, color: '#100c14', margin: '0 0 28px', whiteSpace: 'pre-line' }}>
            {room.body || room.clean_text}
          </p>
        )}

        {/* companion reflection */}
        <div
          style={{
            background: 'linear-gradient(160deg,#100c14,#100c14)',
            borderRadius: 16,
            padding: '18px 20px',
            marginBottom: 26,
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <span style={{ display: 'inline-flex', flex: 'none' }}><EyeMark size={22} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: '#e2dde0', marginBottom: 6 }}>
              companion
            </div>
            <div style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 15, lineHeight: 1.55, color: '#fdfbf9' }}>{room.reflection}</div>
          </div>
        </div>

        {/* presence */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#5DCAA5', animation: 'breathe 2.8s ease-in-out infinite', display: 'block' }} />
            <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: '#443c42' }}>
              {room.sitting} sitting in right now
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {Array.from({ length: n }, (_, i) => (
              <span
                key={i}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg,rgba(23,19,26,.15),rgba(23,19,26,.25))',
                  border: '.5px solid rgba(23,19,26,.2)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 15,
                  animation: `breathe ${2.4 + i * 0.18}s ease-in-out infinite`,
                }}
              >
                {seatGlyphs[i % 5]}
              </span>
            ))}
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'auto',
                padding: '0 10px',
                height: 28,
                borderRadius: 14,
                background: '#fdfbf9',
                fontFamily: 'Newsreader,serif',
                fontStyle: 'italic',
                fontSize: 12,
                color: '#6f666c',
              }}
            >
              and {room.sitting - n} more
            </span>
          </div>
        </div>

        {/* reactions */}
        {(() => {
          const totalReactions = REACTIONS.reduce((s, rx) => s + (room.reactions[rx.k] || 0), 0)
          return (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6f666c', marginBottom: 9 }}>
                {totalReactions === 0 ? 'be the first to feel this' : 'how the room is holding this'}
              </div>
              {totalReactions === 0 ? (
                <div style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 13.5, color: '#443c42', marginBottom: 13 }}>
                  nobody has reacted yet. your one tap says "i'm here."
                </div>
              ) : (
                <div style={{ height: 10, borderRadius: 5, overflow: 'hidden', display: 'flex', gap: 1, marginBottom: 13 }}>{bars}</div>
              )}
            </div>
          )
        })()}
        <div style={{ marginBottom: 22, marginTop: -22 }}>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {REACTIONS.map((rx) => {
              const isActive = active.has(rx.k)
              return (
                <button
                  key={rx.k}
                  className={'react-btn' + (isActive ? ' active' : '')}
                  style={{ color: rx.color }}
                  onClick={async () => {
                    if (!(await gate({ kind: 'react', roomId: room.id, reaction: rx.k }))) return
                    setActive((prev) => {
                      const next = new Set(prev)
                      if (next.has(rx.k)) next.delete(rx.k)
                      else next.add(rx.k)
                      return next
                    })
                    const nowActive = !isActive
                    toast(nowActive ? 'reaction added.' : 'reaction withdrawn.')
                    if (nowActive) {
                      track('react', { target: `room:${room.id}`, kind: rx.k })
                      fireMirror({
                        source: 'likes',
                        ref_id: room.id,
                        raw_text: (room.title || room.body || '').slice(0, 200),
                        district_hint: pillarToDistrict(room.pillar),
                      })
                      offerShare()
                    }
                  }}
                >
                  <span>{rx.emoji}</span>
                  <span>{rx.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* relate / side / share */}
        <div
          style={{
            borderTop: '.5px solid rgba(11,8,15,.08)',
            paddingTop: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <ActionPill
              surface="light"
              tone={related ? 'accent' : 'ghost'}
              ariaLabel="Relate to this"
              onClick={async () => {
                if (!(await gate({ kind: 'relate', roomId: room.id }))) return
                setRelated(true)
                toast("added. the room knows you're there.")
                track('relate', { target: `room:${room.id}` })
                fireMirror({
                  source: 'likes',
                  ref_id: room.id,
                  raw_text: (room.title || room.body || '').slice(0, 200),
                  district_hint: pillarToDistrict(room.pillar),
                })
                offerShare()
              }}
            >
              🫂 omg same{' '}
              <b style={{ fontFamily: 'Sora', fontWeight: 700, color: '#17131a' }}>{room.relates}</b>
            </ActionPill>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <ActionPill
              surface="light"
              ariaLabel="Add your side"
              onClick={() => toast('add-your-side coming soon.')}
            >
              💬 add your side
            </ActionPill>
            <ActionPill
              surface="light"
              tone="primary"
              ariaLabel={isScan ? 'share your score' : 'share this room'}
              title={isScan ? 'share your score' : 'share this room'}
              onClick={shareRoom}
            >
              ↗ {isScan ? 'share score' : 'share'}
            </ActionPill>
          </div>
        </div>

        {/* comments */}
        <div style={{ marginTop: 28, paddingTop: 22, borderTop: '.5px solid rgba(11,8,15,.08)' }}>
          <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', marginBottom: 14 }}>
            <span style={{ display: 'inline-flex', flex: 'none', marginTop: 2 }}>
              <EyeMark size={26} />
            </span>
            <div>
              <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: '#17131a', marginBottom: 5 }}>
                companion
              </div>
              <div style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.5, color: '#0b080f' }}>
                {guide === null ? (
                  <span style={{ display: 'inline-flex', gap: 4 }}>
                    <i style={{ width: 5, height: 5, borderRadius: '50%', background: '#2b2630', display: 'block', animation: 'blinkdot 1.2s infinite' }} />
                    <i style={{ width: 5, height: 5, borderRadius: '50%', background: '#2b2630', display: 'block', animation: 'blinkdot 1.2s .2s infinite' }} />
                    <i style={{ width: 5, height: 5, borderRadius: '50%', background: '#2b2630', display: 'block', animation: 'blinkdot 1.2s .4s infinite' }} />
                  </span>
                ) : (
                  guide
                )}
              </div>
            </div>
          </div>

          <div style={{ marginLeft: 35 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 11 }}>
              {chips.map((s, i) => (
                <button
                  key={i}
                  onClick={async () => {
                    if (!(await gate({ kind: 'comment', roomId: room.id }))) return
                    const t = cmtRef.current
                    if (t) {
                      t.value = s + ' '
                      t.focus()
                      autosize()
                    }
                  }}
                  onMouseOver={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#ffffff')}
                  onMouseOut={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#fff')}
                  style={{
                    background: '#fff',
                    border: '1px solid rgba(23,19,26,.3)',
                    borderRadius: 999,
                    padding: '7px 13px',
                    cursor: 'pointer',
                    fontFamily: 'Newsreader,serif',
                    fontStyle: 'italic',
                    fontSize: 12.5,
                    color: '#17131a',
                    transition: '.15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            <CommentField cmtRef={cmtRef} autosize={autosize} onSend={submitComment} onGate={() => gate({ kind: 'comment', roomId: room.id })} />

            <div style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 12.5, color: '#6f666c', marginTop: 8 }}>{helpText}</div>

            {room.id && <CommentsThread roomId={room.id} />}
          </div>
        </div>
      </div>
      {scanShareOpen && isScan && (
        <ScanShareCard
          record={{
            score: room.initial_scan as number,
            signature: room.scan_signature ?? room.title,
            read: room.reflection ?? null,
            pillar: room.pillar ?? null,
            url: (typeof window !== 'undefined' ? window.location.origin : 'https://shutap.com') + '/room?id=' + room.id,
          }}
          onClose={() => setScanShareOpen(false)}
          toast={toast}
        />
      )}
      <RoomShareSheet
        open={roomShareOpen && !isScan}
        onClose={() => setRoomShareOpen(false)}
        room={{ id: room.id, emoji: room.emoji, title: room.title }}
        url={(typeof window !== 'undefined' ? window.location.origin : 'https://shutap.com') + '/room?id=' + room.id}
      />
    </div>
  )
}

function CommentField({
  cmtRef,
  autosize,
  onSend,
  onGate,
}: {
  cmtRef: React.RefObject<HTMLTextAreaElement | null>
  autosize: () => void
  onSend: () => void
  onGate: () => Promise<boolean>
}) {
  const [focused, setFocused] = useState(false)
  const [gated, setGated] = useState(false)
  const ensureGate = async () => {
    if (gated) return true
    const ok = await onGate()
    if (ok) setGated(true)
    return ok
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 9,
        background: '#fff',
        border: '1px solid ' + (focused ? '#2b2630' : 'rgba(11,8,15,.10)'),
        borderRadius: 14,
        padding: '13px 15px',
        transition: 'border-color .18s',
      }}
    >
      <textarea
        ref={cmtRef}
        rows={2}
        placeholder="vent here — it doesn't have to be advice. say how it lands for you…"
        onInput={autosize}
        onMouseDown={(e) => {
          if (!gated) {
            e.preventDefault()
            void ensureGate()
          }
        }}
        onFocus={() => { setFocused(true); void ensureGate() }}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSend()
          }
        }}
        style={{
          flex: 1,
          background: 'none',
          border: 'none',
          outline: 'none',
          color: '#0b080f',
          fontFamily: 'Newsreader,serif',
          fontStyle: 'italic',
          fontSize: 15,
          resize: 'none',
          maxHeight: 160,
          lineHeight: 1.5,
        }}
      />
      <div
        role="button"
        onClick={onSend}
        style={{
          fontFamily: 'Sora,sans-serif',
          fontWeight: 700,
          fontSize: 12,
          color: '#fff',
          background: '#2b2630',
          borderRadius: 999,
          padding: '7px 14px',
          cursor: 'pointer',
          flex: 'none',
        }}
      >
        offer it →
      </div>
    </div>
  )
}
