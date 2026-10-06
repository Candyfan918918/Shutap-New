import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { addComment, deleteComment, getPost } from '@/lib/feed.functions'
import { ago, type FeedComment, type FeedPost } from '@/lib/feed-shared'
import { PostCard, ReportSheet, Toast, goSignIn, useToast } from '@/components/feed/kit'

export function PostPage({ id }: { id: string }) {
  const load = useServerFn(getPost)
  const send = useServerFn(addComment)
  const remove = useServerFn(deleteComment)
  const [post, setPost] = useState<FeedPost | null | undefined>(undefined)
  const [comments, setComments] = useState<FeedComment[]>([])
  const [signedIn, setSignedIn] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [reporting, setReporting] = useState<string | null>(null)
  const [crisis, setCrisis] = useState(false)
  const [toast, say] = useToast()

  useEffect(() => {
    load({ data: { id } })
      .then((r) => {
        setPost(r.post)
        setComments(r.comments)
        setSignedIn(r.signedIn)
      })
      .catch(() => setPost(null))
  }, [id])

  const submit = async () => {
    if (!signedIn) return goSignIn()
    const t = text.trim()
    if (!t) return
    setBusy(true)
    try {
      const r = await send({ data: { room_id: id, text: t } })
      if (r.crisis) {
        setCrisis(true)
        return
      }
      if (r.ok) {
        setComments((c) => [...c, r.comment])
        setText('')
        if (r.scrubbed) say('names removed')
      }
    } catch {
      say('could not post. try again.')
    } finally {
      setBusy(false)
    }
  }

  if (post === undefined)
    return (
      <div className="fd">
        <div className="fd-col">
          <p className="fd-muted">loading…</p>
        </div>
      </div>
    )
  if (post === null)
    return (
      <div className="fd">
        <div className="fd-col">
          <div className="fd-empty">
            <b>This post is gone.</b>
            <Link to="/rooms" className="fd-btn">
              back to rooms
            </Link>
          </div>
        </div>
      </div>
    )

  return (
    <div className="fd">
      <div className="fd-col">
        <Link to="/rooms" className="fd-link fd-muted">
          ← rooms
        </Link>
        <PostCard post={post} signedIn={signedIn} say={say} linkJoke={false} onGone={() => setPost(null)} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            className="fd-input"
            rows={2}
            maxLength={1000}
            placeholder={signedIn ? 'add a comment' : 'sign in to comment'}
            value={text}
            onFocus={() => !signedIn && goSignIn()}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="fd-between">
            <span className="fd-faint">no real names</span>
            <button className="fd-btn sm" disabled={busy || !text.trim()} onClick={() => void submit()}>
              {busy ? 'posting…' : 'post'}
            </button>
          </div>
        </div>

        {crisis ? (
          <div className="fd-empty" style={{ textAlign: 'left', alignItems: 'flex-start' }}>
            <b>This sounds heavy. Talk to someone now.</b>
            <span className="fd-muted">
              US: call or text 988 · UK &amp; IE: Samaritans 116 123 · elsewhere: findahelpline.com
            </span>
          </div>
        ) : null}

        <div>
          {comments.length === 0 ? <p className="fd-faint">No comments yet.</p> : null}
          {comments.map((c) => (
            <div key={c.id} className="fd-comment">
              <Link to="/u/$pseudonym" params={{ pseudonym: c.slug }} className="fd-av" style={{ width: 30, height: 30, fontSize: 15, textDecoration: 'none' }}>
                {c.emoji}
              </Link>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="fd-between">
                  <span>
                    <Link to="/u/$pseudonym" params={{ pseudonym: c.slug }} className="fd-name" style={{ fontSize: 13 }}>
                      {c.alias}
                    </Link>{' '}
                    <span className="fd-faint">{ago(c.created_at)}</span>
                  </span>
                  {c.mine ? (
                    <button
                      className="fd-link fd-faint"
                      onClick={async () => {
                        await remove({ data: { id: c.id } })
                        setComments((cs) => cs.filter((x) => x.id !== c.id))
                      }}
                    >
                      delete
                    </button>
                  ) : (
                    <button className="fd-link fd-faint" onClick={() => setReporting(c.id)}>
                      report
                    </button>
                  )}
                </div>
                <p>{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ReportSheet
        open={!!reporting}
        roomId={id}
        commentId={reporting}
        onClose={() => setReporting(null)}
        onDone={() => {
          setReporting(null)
          say('reported. thanks.')
        }}
      />
      <Toast msg={toast} />
    </div>
  )
}
