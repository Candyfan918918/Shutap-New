// Shared edit / preview surface for rooms + journals.
// Lets the owner edit by hand or by AI instruction, flip privacy, or delete.
import { useState, useEffect } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { updateSituation, deleteSituation, aiEditPost } from '@/lib/situations.functions'

type Situation = {
  id: string
  title: string | null
  body: string | null
  clean_text: string
  pillar: string
  is_public: boolean
  room_id: string | null
  tags: string[]
  kind: string | null
}

interface Props {
  situation: Situation
  onClose: () => void
  onSaved?: (next: { id: string; is_public: boolean; room_id: string | null }) => void
}

export function SituationEditor({ situation, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(situation.title ?? '')
  const [body, setBody] = useState(situation.body ?? situation.clean_text ?? '')
  const [instruction, setInstruction] = useState('')
  const [needsInfo, setNeedsInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState<null | 'save' | 'ai' | 'delete' | 'flip'>(null)
  const [error, setError] = useState<string | null>(null)

  const update = useServerFn(updateSituation)
  const del = useServerFn(deleteSituation)
  const aiEdit = useServerFn(aiEditPost)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleAiEdit() {
    if (!instruction.trim()) return
    setBusy('ai'); setError(null); setNeedsInfo(null)
    try {
      const r = await aiEdit({ data: { id: situation.id, currentTitle: title, currentBody: body, instruction: instruction.trim() } })
      if (r.needs_info) setNeedsInfo(r.needs_info)
      else { setTitle(r.title); setBody(r.body); setInstruction('') }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ai edit failed')
    } finally { setBusy(null) }
  }

  async function handleSave() {
    setBusy('save'); setError(null)
    try {
      const r = await update({ data: { id: situation.id, title, body } })
      onSaved?.(r); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'save failed') }
    finally { setBusy(null) }
  }

  async function handleFlip(makePublic: boolean) {
    setBusy('flip'); setError(null)
    try {
      const r = await update({ data: { id: situation.id, title, body, is_public: makePublic } })
      onSaved?.(r); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'flip failed') }
    finally { setBusy(null) }
  }

  async function handleDelete() {
    if (!confirm('delete this? you can\'t undo.')) return
    setBusy('delete'); setError(null)
    try {
      await del({ data: { id: situation.id } })
      onSaved?.({ id: situation.id, is_public: false, room_id: null }); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'delete failed') }
    finally { setBusy(null) }
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <div style={head}>
          <span style={kicker}>{situation.is_public ? 'editing your room' : 'editing your journal'}</span>
          <button style={closeBtn} onClick={onClose} aria-label="close">×</button>
        </div>

        <label style={lbl}>title</label>
        <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="your hook" maxLength={140} />

        <label style={lbl}>your post</label>
        <textarea style={textarea} value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="the whole thing, your words" />

        <div style={aiRow}>
          <input
            style={{ ...input, flex: 1 }}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder='ask the spill to edit: "make it shorter", "soften the ending"...'
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiEdit() } }}
          />
          <button style={ghost} onClick={handleAiEdit} disabled={busy === 'ai' || !instruction.trim()}>
            {busy === 'ai' ? 'editing…' : 'edit with spill'}
          </button>
        </div>
        {needsInfo && (
          <div style={notice}>spill asks: {needsInfo}</div>
        )}

        {error && <div style={{ ...notice, background: '#eeeeee', color: '#17131a' }}>{error}</div>}

        <div style={actions}>
          <button style={primary} onClick={handleSave} disabled={busy !== null}>
            {busy === 'save' ? 'saving…' : 'save'}
          </button>
          {situation.is_public ? (
            <button style={ghost} onClick={() => handleFlip(false)} disabled={busy !== null}>
              {busy === 'flip' ? 'flipping…' : 'move to private journal'}
            </button>
          ) : (
            <button style={ghost} onClick={() => handleFlip(true)} disabled={busy !== null}>
              {busy === 'flip' ? 'posting…' : 'post to a room'}
            </button>
          )}
          <button style={danger} onClick={handleDelete} disabled={busy !== null}>
            {busy === 'delete' ? 'deleting…' : 'delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ----- styles (match the prototype palette) -----
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(11, 8, 15, 0.45)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000,
}
const sheet: React.CSSProperties = {
  width: '100%', maxWidth: 640, background: '#ffffff', borderRadius: '18px 18px 0 0',
  padding: '20px 22px 28px', maxHeight: '92vh', overflow: 'auto',
  fontFamily: '-apple-system, "Sora", system-ui, sans-serif',
  boxShadow: '0 -8px 30px rgba(11,8,15,0.18)',
}
const head: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }
const kicker: React.CSSProperties = { fontSize: 12, color: '#17131a', textTransform: 'lowercase', letterSpacing: '.04em' }
const closeBtn: React.CSSProperties = { border: 'none', background: 'transparent', fontSize: 28, color: '#0b080f', cursor: 'pointer', lineHeight: 1 }
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#575757', marginTop: 12, marginBottom: 4, textTransform: 'lowercase', letterSpacing: '.05em' }
const input: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e4dfe2',
  background: '#fff', fontSize: 15, color: '#0b080f', outline: 'none',
}
const textarea: React.CSSProperties = {
  ...input, resize: 'vertical', minHeight: 140, fontFamily: '"Newsreader", Georgia, serif', fontStyle: 'italic', lineHeight: 1.55,
}
const aiRow: React.CSSProperties = { display: 'flex', gap: 8, marginTop: 14, alignItems: 'stretch' }
const notice: React.CSSProperties = { marginTop: 10, padding: '8px 12px', background: '#fff', borderRadius: 8, fontSize: 13, color: '#0b080f' }
const actions: React.CSSProperties = { display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }
const primary: React.CSSProperties = {
  flex: '1 1 auto', padding: '12px 16px', borderRadius: 999, background: '#2b2630', color: '#fff',
  border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 14,
}
const ghost: React.CSSProperties = {
  padding: '12px 16px', borderRadius: 999, background: 'transparent', color: '#17131a',
  border: '1px solid #e4dfe2', fontWeight: 500, cursor: 'pointer', fontSize: 14,
}
const danger: React.CSSProperties = {
  padding: '12px 16px', borderRadius: 999, background: 'transparent', color: '#575757',
  border: '1px solid #dadada', fontWeight: 500, cursor: 'pointer', fontSize: 14,
}
