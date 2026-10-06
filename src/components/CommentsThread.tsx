// Auth-owned comments thread for a room. The list server function returns
// enriched rows (is_mine + display_name + emoji) so the raw alias_id (auth
// user id) never reaches the browser, preserving pseudonymity.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import {
  listRoomComments,
  updateComment,
  deleteComment,
} from '@/lib/situations.functions'

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function CommentsThread({ roomId }: { roomId: string }) {
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchComments = useServerFn(listRoomComments)
  const update = useServerFn(updateComment)
  const remove = useServerFn(deleteComment)

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomId)
  const { data: comments = [] } = useQuery({
    queryKey: ['comments', roomId],
    queryFn: () => fetchComments({ data: { roomId } }),
    enabled: isUuid,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['comments', roomId] })
  const surfaceError = (action: string) => (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    setErrorMsg(`couldn't ${action} — ${msg}`)
  }

  const save = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      update({ data: { id, text } }),
    onSuccess: () => {
      setEditingId(null)
      setEditDraft('')
      setErrorMsg(null)
      invalidate()
    },
    onError: surfaceError('save edit'),
  })
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => { setErrorMsg(null); invalidate() },
    onError: surfaceError('delete comment'),
  })

  return (
    <section style={{ marginTop: 28 }}>
      <div
        style={{
          fontFamily: 'Sora, sans-serif',
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: '.14em',
          color: '#6f666c',
          marginBottom: 12,
        }}
      >
        WHAT OTHERS SAID
      </div>

      {errorMsg && (
        <div
          role="alert"
          style={{
            marginBottom: 12,
            padding: '10px 14px',
            borderRadius: 12,
            background: '#f4f4f4',
            border: '.5px solid rgba(23,19,26,.35)',
            color: '#17131a',
            fontFamily: 'Sora, sans-serif',
            fontSize: 13,
          }}
        >
          {errorMsg}
        </div>
      )}



      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {comments.length === 0 && (
          <p style={{ fontFamily: 'Newsreader, serif', fontStyle: 'italic', color: '#443c42' }}>
            nobody yet. you can be the first.
          </p>
        )}
        {comments.map((c) => {
          const mine = c.is_mine
          const isCompanion = c.is_companion
          const editing = editingId === c.id
          const who = isCompanion ? 'the companion' : mine ? 'you' : (c.display_name || 'someone')
          const emoji = isCompanion ? '👁' : (c.emoji || (mine ? '🩷' : '🙂'))
          return (
            <div
              key={c.id}
              style={{
                background: isCompanion ? '#ffffff' : '#fff',
                border: isCompanion ? '.5px solid rgba(23,19,26,.35)' : '.5px solid rgba(11,8,15,.08)',
                borderRadius: 14,
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                  fontFamily: 'Sora, sans-serif',
                  fontSize: 11,
                  color: '#6f666c',
                }}
              >
                <span>
                  <span aria-hidden style={{ marginRight: 6 }}>{emoji}</span>
                  {who}
                  {isCompanion && (
                    <span
                      style={{
                        marginLeft: 8,
                        padding: '2px 7px',
                        borderRadius: 999,
                        background: 'rgba(23,19,26,.14)',
                        color: '#17131a',
                        fontSize: 10,
                        letterSpacing: '.06em',
                        textTransform: 'uppercase',
                      }}
                    >
                      house AI
                    </span>
                  )}
                  {c.edited ? ' · edited' : ''} · {timeAgo(c.created_at)}
                </span>
                {mine && !isCompanion && !editing && (
                  <span style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        setEditingId(c.id)
                        setEditDraft(c.clean_text)
                      }}
                      style={{ background: 'none', border: 0, color: '#17131a', cursor: 'pointer', fontSize: 12 }}
                    >
                      edit
                    </button>
                    <button
                      onClick={() => del.mutate(c.id)}
                      style={{ background: 'none', border: 0, color: '#6f666c', cursor: 'pointer', fontSize: 12 }}
                    >
                      delete
                    </button>
                  </span>
                )}
              </div>
              {editing ? (
                <>
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      border: '.5px solid rgba(11,8,15,.18)',
                      borderRadius: 10,
                      padding: 10,
                      fontFamily: 'Sora, sans-serif',
                      fontSize: 14,
                      resize: 'vertical',
                    }}
                  />
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <button
                      disabled={save.isPending || editDraft.trim().length < 1}
                      onClick={() => save.mutate({ id: c.id, text: editDraft.trim() })}
                      style={{ background: '#2b2630', color: '#fff', border: 0, borderRadius: 999, padding: '6px 14px', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                    >
                      save
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditDraft('') }}
                      style={{ background: 'none', border: 0, color: '#443c42', cursor: 'pointer', fontSize: 12 }}
                    >
                      cancel
                    </button>
                  </div>
                </>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontFamily: 'Sora, sans-serif',
                    fontSize: 14,
                    color: '#0b080f',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {c.clean_text}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
