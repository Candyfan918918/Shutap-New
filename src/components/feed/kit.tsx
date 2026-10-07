import { useEffect, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { rememberReturnTo } from '@/lib/auth'
import { reportPost, toggleLike, toggleSave, toggleFollow, deletePost } from '@/lib/feed.functions'
import { REPORT_REASONS, TOPIC_LABEL, ago, type FeedPost, type ReportReason } from '@/lib/feed-shared'
import { Prompter } from '@/pages/home/bit/Prompter'
import './feed.css'

export function goSignIn() {
  try {
    rememberReturnTo(window.location.href)
  } catch {
    /* noop */
  }
  window.location.assign('/welcome')
}

export function useToast(): [string | null, (m: string) => void] {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2200)
    return () => clearTimeout(t)
  }, [msg])
  return [msg, setMsg]
}

export function Toast({ msg }: { msg: string | null }) {
  return msg ? (
    <div className="fd-toast" role="status">
      {msg}
    </div>
  ) : null
}

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fd-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fd-sheet" role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  )
}

const I = {
  prompter: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M7 9h10M7 12h6M9 21h6M12 17v4" />
    </svg>
  ),
  heart: (on: boolean) => (
    <svg viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 4 4.5 7.3 4.5c2 0 3.4 1.1 4.7 2.8 1.3-1.7 2.7-2.8 4.7-2.8 3.3 0 5.7 3.1 4.5 6.6-1.7 4.8-9.2 9.4-9.2 9.4z" strokeLinejoin="round" />
    </svg>
  ),
  comment: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 5h16v11H9l-5 4z" strokeLinejoin="round" />
    </svg>
  ),
  save: (on: boolean) => (
    <svg viewBox="0 0 24 24" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 3.5h12v17l-6-4.2-6 4.2z" strokeLinejoin="round" />
    </svg>
  ),
  share: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3v13M7 8l5-5 5 5M5 14v6h14v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  ),
}

export function FollowButton({
  slug,
  following,
  onChange,
  signedIn,
}: {
  slug: string
  following: boolean
  signedIn: boolean
  onChange?: (following: boolean, followers: number) => void
}) {
  const follow = useServerFn(toggleFollow)
  const [on, setOn] = useState(following)
  const [busy, setBusy] = useState(false)
  useEffect(() => setOn(following), [following])
  return (
    <button
      type="button"
      className={'fd-btn sm' + (on ? ' ghost' : '')}
      disabled={busy}
      onClick={async () => {
        if (!signedIn) return goSignIn()
        setBusy(true)
        setOn(!on)
        try {
          const r = await follow({ data: { slug } })
          setOn(r.following)
          onChange?.(r.following, r.followers)
        } catch {
          setOn(on)
        } finally {
          setBusy(false)
        }
      }}
    >
      {on ? 'following' : 'follow'}
    </button>
  )
}

export function ReportSheet({
  open,
  roomId,
  commentId,
  onClose,
  onDone,
}: {
  open: boolean
  roomId: string
  commentId?: string | null
  onClose: () => void
  onDone: () => void
}) {
  const report = useServerFn(reportPost)
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="fd-between">
        <b style={{ fontSize: 17 }}>Report</b>
        <button className="fd-link fd-muted" onClick={onClose}>
          cancel
        </button>
      </div>
      {REPORT_REASONS.map(([k, label]) => (
        <button key={k} className="fd-opt" aria-pressed={reason === k} onClick={() => setReason(k)}>
          {label}
        </button>
      ))}
      <button
        className="fd-btn block"
        disabled={!reason || busy}
        onClick={async () => {
          if (!reason) return
          setBusy(true)
          try {
            await report({ data: { room_id: roomId, comment_id: commentId ?? null, reason } })
          } finally {
            setBusy(false)
            setReason(null)
            onDone()
          }
        }}
      >
        send report
      </button>
    </Sheet>
  )
}

export async function sharePost(id: string, joke: string, say: (m: string) => void) {
  const url = `${window.location.origin}/rooms/${id}`
  try {
    if (navigator.share) {
      await navigator.share({ text: joke, url })
      return
    }
    await navigator.clipboard.writeText(url)
    say('link copied')
  } catch {
    /* cancelled */
  }
}

/** A bit post: the four parts, labelled. A scene post: the numbered beats. */
export function PostBody({ post }: { post: FeedPost }) {
  if (post.kind === 'scene' && post.scene) {
    const sc = post.scene
    return (
      <div className="fd-bit">
        <span className="fd-pill">scene · ~{sc.secs}s</span>
        <p className="fd-hook">{sc.hook}</p>
        <ol className="fd-beats">
          {sc.beats.map((b, i) => (
            <li key={i}>
              <span className="n" aria-hidden="true">{i + 1}</span>
              <div>
                <span className="shot">
                  {b.shot} · {b.speaker}
                </span>
                <span className="line">{b.line}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    )
  }
  if (post.kind === 'bit' && post.bit) {
    const b = post.bit
    return (
      <div className="fd-bit">
        <span className="fd-pill">bit · ~{b.secs}s</span>
        <div className="fd-part">
          <span className="lb r">hook</span>
          <p className="fd-hook">{b.hook}</p>
        </div>
        <div className="fd-part">
          <span className="lb">setup</span>
          <p className="v">{b.setup}</p>
        </div>
        {b.tags.map((t, i) => (
          <div key={i} className="fd-part">
            <span className="lb">tag {i + 1}</span>
            <p className="v">{t}</p>
          </div>
        ))}
        <div className="fd-part">
          <span className="lb r">button</span>
          <p className="v">{b.button}</p>
        </div>
      </div>
    )
  }
  return null
}

export function PostCard({
  post,
  signedIn,
  say,
  linkJoke = true,
  hideFollow = false,
  onGone,
}: {
  post: FeedPost
  signedIn: boolean
  say: (m: string) => void
  linkJoke?: boolean
  hideFollow?: boolean
  onGone?: (id: string) => void
}) {
  const like = useServerFn(toggleLike)
  const save = useServerFn(toggleSave)
  const del = useServerFn(deletePost)
  const [p, setP] = useState(post)
  const [menu, setMenu] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [prompting, setPrompting] = useState(false)
  useEffect(() => setP(post), [post])

  const onLike = async () => {
    if (!signedIn) return goSignIn()
    setP((x) => ({ ...x, liked: !x.liked, likes: x.likes + (x.liked ? -1 : 1) }))
    try {
      const r = await like({ data: { room_id: p.id } })
      setP((x) => ({ ...x, liked: r.liked, likes: r.likes }))
    } catch {
      /* keep optimistic */
    }
  }
  const onSave = async () => {
    if (!signedIn) return goSignIn()
    setP((x) => ({ ...x, saved: !x.saved }))
    try {
      const r = await save({ data: { room_id: p.id } })
      setP((x) => ({ ...x, saved: r.saved }))
      say(r.saved ? 'saved' : 'removed from saved')
    } catch {
      /* noop */
    }
  }

  const joke = (
    <p className="fd-joke" style={{ fontSize: p.joke.length > 160 ? 19 : 22 }}>
      {p.joke}
    </p>
  )

  return (
    <article className="fd-post">
      <div className="fd-between">
        <div className="fd-row" style={{ minWidth: 0 }}>
          <Link to="/u/$pseudonym" params={{ pseudonym: p.slug }} className="fd-av" style={{ textDecoration: 'none' }}>
            {p.emoji}
          </Link>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Link to="/u/$pseudonym" params={{ pseudonym: p.slug }} className="fd-name">
              {p.alias}
            </Link>
            <span className="fd-faint">
              {p.topic ? (
                <Link to="/rooms" search={{ topic: p.topic }} className="fd-topic">
                  {TOPIC_LABEL[p.topic]}
                </Link>
              ) : null}
              {p.topic ? ' · ' : ''}
              {ago(p.created_at)}
            </span>
          </div>
        </div>
        {!hideFollow && !p.mine && !p.following ? (
          <FollowButton slug={p.slug} following={p.following} signedIn={signedIn} onChange={(f) => setP((x) => ({ ...x, following: f }))} />
        ) : null}
      </div>

      {p.kind !== 'card' ? (
        linkJoke ? (
          <Link to="/rooms/$id" params={{ id: p.id }} style={{ textDecoration: 'none', color: 'inherit' }}>
            <PostBody post={p} />
          </Link>
        ) : (
          <PostBody post={p} />
        )
      ) : (
        <>
          {p.situation ? <p className="fd-situation">{p.situation}</p> : null}
          {linkJoke ? (
            <Link to="/rooms/$id" params={{ id: p.id }} style={{ textDecoration: 'none' }}>
              {joke}
            </Link>
          ) : (
            joke
          )}
        </>
      )}

      <div className="fd-actions">
        <button className="fd-act" aria-pressed={p.liked} aria-label="like" onClick={onLike}>
          {I.heart(p.liked)}
          {p.likes}
        </button>
        <Link to="/rooms/$id" params={{ id: p.id }} className="fd-act" aria-label="comments">
          {I.comment}
          {p.comments}
        </Link>
        <button className="fd-act" aria-pressed={p.saved} aria-label="save" onClick={onSave}>
          {I.save(p.saved)}
        </button>
        <button className="fd-act" aria-label="share" onClick={() => void sharePost(p.id, p.joke, say)}>
          {I.share}
        </button>
        <span className="fd-spacer" />
        {p.kind !== 'card' ? (
          <button className="fd-act" aria-label="open in teleprompter" onClick={() => setPrompting(true)}>
            {I.prompter}
          </button>
        ) : null}
        <button className="fd-act" aria-label="more" onClick={() => setMenu(true)}>
          {I.more}
        </button>
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)}>
        {p.mine ? (
          <button
            className="fd-opt"
            onClick={async () => {
              setMenu(false)
              await del({ data: { room_id: p.id } })
              say('post deleted')
              onGone?.(p.id)
            }}
          >
            delete post
          </button>
        ) : (
          <button
            className="fd-opt"
            onClick={() => {
              setMenu(false)
              setReporting(true)
            }}
          >
            report
          </button>
        )}
        <button className="fd-opt" onClick={() => setMenu(false)}>
          cancel
        </button>
      </Sheet>
      {prompting && (p.bit || p.scene) ? (
        <Prompter
          bit={
            p.bit ?? {
              hook: p.scene!.hook,
              setup: '',
              tags: p.scene!.beats.filter((b) => /^me\b/i.test(b.speaker)).map((b) => b.line),
              button: '',
            }
          }
          onClose={() => setPrompting(false)}
        />
      ) : null}
      <ReportSheet
        open={reporting}
        roomId={p.id}
        onClose={() => setReporting(false)}
        onDone={() => {
          setReporting(false)
          say('reported. thanks.')
        }}
      />
    </article>
  )
}
