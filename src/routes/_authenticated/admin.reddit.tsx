import { pageMeta } from '@/lib/seo/page-meta'
// Reddit leads: today's drafted replies to post by hand, the subreddit rules,
// the keyword searches and the daily runs. Admin-only. Nothing here posts to
// Reddit: Candy copies a reply, posts it from her own account, then marks it.
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { AdminShell } from '@/components/AdminShell'
import {
  adminRedditKeyword,
  adminRedditMark,
  adminRedditReport,
  adminRedditRunNow,
  adminRedditSetSubreddit,
  type LinksAllowed,
  type RedditLead,
  type RedditReport,
} from '@/lib/reddit-leads/admin.functions'
import { looksComplete } from '@/lib/reddit-leads/rules'

export const Route = createFileRoute('/_authenticated/admin/reddit')({
  head: () => ({ meta: [...pageMeta('Admin · Reddit — Shutap', 'Review drafted Reddit replies in the private administration area.', '/admin/reddit'), { name: 'robots', content: 'noindex' }] }),
  component: () => (
    <div data-ph-private style={{ display: 'contents' }}>
      <AdminRedditPage />
    </div>
  ),
})

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

const LINK_LABEL: Record<LinksAllowed, string> = { yes: 'links ok', no: 'no links', unknown: 'links: not set' }

function AdminRedditPage() {
  const load = useServerFn(adminRedditReport)
  const mark = useServerFn(adminRedditMark)
  const setSub = useServerFn(adminRedditSetSubreddit)
  const keyword = useServerFn(adminRedditKeyword)
  const runNow = useServerFn(adminRedditRunNow)
  const [data, setData] = useState<RedditReport | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [newQuery, setNewQuery] = useState('')
  const [newTheme, setNewTheme] = useState<'humor' | 'toast'>('humor')

  const refresh = useCallback(async () => {
    try {
      setData(await load())
      setErr(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
    }
  }, [load])

  useEffect(() => { void refresh() }, [refresh])

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn()
      await refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'update failed')
    }
  }

  async function onRunNow() {
    if (!window.confirm('Search Reddit now? This uses about 30 searches from your Serper credits.')) return
    setRunning(true)
    await act(() => runNow())
    setRunning(false)
  }

  const warmup = data ? data.day < data.mentionsFrom : true
  const lastRun = data?.runs[0]

  return (
    <AdminShell
      title="reddit"
      subtitle="Replies to post by hand from your own account. Read each thread first; nothing here posts for you."
      right={<button type="button" onClick={() => void onRunNow()} disabled={running || !data} style={btn}>{running ? 'searching… (1–2 min)' : 'run search now'}</button>}
    >
      {err && <div style={{ color: '#c1216b', marginBottom: 12, whiteSpace: 'pre-wrap' }}>{err}</div>}
      {!data ? (
        <div style={{ color: '#443c42' }}>loading…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            <Stat label="drafts waiting" value={String(data.stats.waiting)} note={`up to ${data.maxDraftsPerDay} new a day`} />
            <Stat label="posted today" value={String(data.stats.postedToday)} note="one reply per subreddit a day" />
            <Stat
              label="Shutap mentions"
              value={`${data.stats.postedWithMention} of ${data.stats.postedTotal}`}
              note={warmup ? `none until ${data.mentionsFrom} (warm-up)` : `keep at or under 1 in ${data.mentionOneIn}`}
            />
            <Stat
              label="last search"
              value={lastRun ? when(lastRun.startedAt) : 'never'}
              note={lastRun ? (lastRun.error ? `problem: ${lastRun.error.slice(0, 120)}` : `${lastRun.newThreads} new threads · ${lastRun.drafted} drafted`) : 'runs daily ~7am'}
              alert={!!lastRun?.error}
            />
          </div>

          <h2 style={h2}>to post</h2>
          {data.drafts.length === 0 ? (
            <div style={{ ...card, color: '#6b4a5c', marginBottom: 24 }}>No drafts waiting. New ones arrive each morning.</div>
          ) : (
            <div style={{ display: 'grid', gap: 14, marginBottom: 28 }}>
              {data.drafts.map((l) => (
                <DraftCard key={l.id} lead={l} onMark={(action, body, reason) => act(() => mark({ data: { id: l.id, action, body, reason } }))} />
              ))}
            </div>
          )}

          <h2 style={h2}>subreddits <span style={dimSpan}>set links ok only after reading the subreddit's rules</span></h2>
          <div style={{ ...tableWrap, marginBottom: 28 }}>
            <table style={table}>
              <thead><tr>{['subreddit', 'found', 'posted', 'links', 'block'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {data.subreddits.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...td, color: '#6b4a5c', fontStyle: 'italic' }}>none yet</td></tr>
                ) : data.subreddits.map((s) => (
                  <tr key={s.name} style={{ opacity: s.blocked ? 0.5 : 1 }}>
                    <td style={td}><a href={`https://www.reddit.com/r/${s.name}/about/rules`} target="_blank" rel="noreferrer" style={link}>r/{s.name}</a></td>
                    <td style={tdNum}>{s.found}</td>
                    <td style={tdNum}>{s.posted}</td>
                    <td style={td}>
                      <select
                        value={s.linksAllowed}
                        onChange={(e) => void act(() => setSub({ data: { name: s.name, linksAllowed: e.target.value as LinksAllowed, blocked: s.blocked, notes: s.notes } }))}
                        style={select}
                      >
                        <option value="unknown">not set (no links)</option>
                        <option value="no">no links</option>
                        <option value="yes">links ok</option>
                      </select>
                    </td>
                    <td style={td}>
                      <input
                        type="checkbox"
                        checked={s.blocked}
                        onChange={() => void act(() => setSub({ data: { name: s.name, linksAllowed: s.linksAllowed, blocked: !s.blocked, notes: s.notes } }))}
                        aria-label={`block r/${s.name}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={h2}>searches</h2>
          <div style={{ ...card, marginBottom: 28 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {data.keywords.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => void act(() => keyword({ data: { id: k.id, active: !k.active } }))}
                  title={k.active ? 'on: click to pause' : 'paused: click to switch on'}
                  style={{ ...chip, opacity: k.active ? 1 : 0.45, textDecoration: k.active ? 'none' : 'line-through' }}
                >
                  <span style={{ color: '#6b4a5c', marginRight: 6 }}>{k.theme}</span>{k.query}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const q = newQuery.trim()
                if (q.length < 3) return
                void act(() => keyword({ data: { query: q, theme: newTheme } })).then(() => setNewQuery(''))
              }}
              style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
            >
              <input value={newQuery} onChange={(e) => setNewQuery(e.target.value)} placeholder='add a search, e.g. "funny wedding speech" help' style={{ ...select, flex: '1 1 280px' }} />
              <select value={newTheme} onChange={(e) => setNewTheme(e.target.value as 'humor' | 'toast')} style={select}>
                <option value="humor">humor</option>
                <option value="toast">toast</option>
              </select>
              <button type="submit" style={btn}>add</button>
            </form>
          </div>

          <h2 style={h2}>posted</h2>
          <div style={{ ...tableWrap, marginBottom: 28 }}>
            <table style={table}>
              <thead><tr>{['when', 'thread', 'mention', ''].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {data.posted.length === 0 ? (
                  <tr><td colSpan={4} style={{ ...td, color: '#6b4a5c', fontStyle: 'italic' }}>nothing posted yet</td></tr>
                ) : data.posted.map((l) => (
                  <tr key={l.id}>
                    <td style={{ ...td, whiteSpace: 'nowrap', color: '#6b4a5c' }}>{l.postedAt ? when(l.postedAt) : '—'}</td>
                    <td style={td}>
                      <a href={l.url} target="_blank" rel="noreferrer" style={link}>r/{l.subreddit} · {l.title}</a>
                    </td>
                    <td style={td}>{l.mentionsShutap ? 'yes' : '—'}</td>
                    <td style={td}><button type="button" onClick={() => void act(() => mark({ data: { id: l.id, action: 'undo' } }))} style={smallBtn}>undo</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={h2}>daily searches</h2>
          <div style={tableWrap}>
            <table style={table}>
              <thead><tr>{['started', 'searches', 'threads', 'new', 'drafted', 'problem'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {data.runs.length === 0 ? (
                  <tr><td colSpan={6} style={{ ...td, color: '#6b4a5c', fontStyle: 'italic' }}>no runs yet</td></tr>
                ) : data.runs.map((r) => (
                  <tr key={r.startedAt}>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{when(r.startedAt)}{!r.finishedAt && ' (running or stopped)'}</td>
                    <td style={tdNum}>{r.queries}</td>
                    <td style={tdNum}>{r.found}</td>
                    <td style={tdNum}>{r.newThreads}</td>
                    <td style={tdNum}>{r.drafted}</td>
                    <td style={{ ...td, color: r.error ? '#c1216b' : '#6b4a5c', fontSize: 12 }}>{r.error ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminShell>
  )
}

function Stat({ label, value, note, alert }: { label: string; value: string; note: string; alert?: boolean }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 12, color: '#6b4a5c' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 12, color: alert ? '#c1216b' : '#6b4a5c', marginTop: 4 }}>{note}</div>
    </div>
  )
}

function DraftCard({ lead, onMark }: { lead: RedditLead; onMark: (action: 'posted' | 'skipped', body?: string, reason?: string) => Promise<void> }) {
  const [body, setBody] = useState(lead.draft ?? '')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const mentions = /shutap/i.test(body)
  const cutOff = !looksComplete(body)

  async function copy() {
    try {
      await navigator.clipboard.writeText(body)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked: the text is still selectable */
    }
  }

  async function run(action: 'posted' | 'skipped') {
    let reason: string | undefined
    if (action === 'posted' && cutOff && !window.confirm('This reply looks cut off mid-sentence. Did you finish it before posting?')) return
    if (action === 'skipped') reason = window.prompt('Why skip? (optional, helps tune the search)') ?? undefined
    setBusy(true)
    await onMark(action, action === 'posted' ? body : undefined, reason)
    setBusy(false)
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={chip}>r/{lead.subreddit}</span>
        <span style={{ ...chip, color: lead.linksAllowed === 'yes' ? '#0b080f' : '#6b4a5c' }}>{LINK_LABEL[lead.linksAllowed]}</span>
        {lead.score !== null && <span style={{ ...chip, background: '#fdeef4', border: 0, color: '#c1216b' }}>{lead.score}/10</span>}
        {lead.scoreReason && <span style={{ fontSize: 12, color: '#6b4a5c' }}>{lead.scoreReason}</span>}
      </div>
      <a href={lead.url} target="_blank" rel="noreferrer" style={{ ...link, fontWeight: 700, fontSize: 15, display: 'block', marginBottom: 4 }}>{lead.title}</a>
      {lead.snippet && <div style={{ fontSize: 13, color: '#443c42', marginBottom: 10, lineHeight: 1.45 }}>{lead.snippet}</div>}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={Math.min(14, Math.max(5, body.split('\n').length + 2))}
        style={{ width: '100%', boxSizing: 'border-box', padding: 12, borderRadius: 10, border: '.5px solid rgba(11,8,15,.16)', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.5, resize: 'vertical' }}
      />
      {cutOff && <div style={{ fontSize: 12, color: '#c1216b', marginTop: 6 }}>This reply looks cut off. Finish the last sentence before you post it.</div>}
      {mentions && <div style={{ fontSize: 12, color: '#c1216b', marginTop: 6 }}>This reply mentions Shutap. Keep the "I made this" part.</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        <button type="button" onClick={() => void copy()} style={btnDark}>{copied ? 'copied' : 'copy reply'}</button>
        <a href={lead.url} target="_blank" rel="noreferrer" style={{ ...btn, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>open thread</a>
        <button type="button" disabled={busy} onClick={() => void run('posted')} style={btn}>I posted it</button>
        <button type="button" disabled={busy} onClick={() => void run('skipped')} style={{ ...btn, color: '#6b4a5c' }}>skip</button>
      </div>
    </div>
  )
}

const btn: React.CSSProperties = { minHeight: 36, padding: '0 14px', borderRadius: 999, border: '.5px solid rgba(11,8,15,.16)', background: '#fff', color: '#0b080f', fontFamily: "'Sora',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }
const btnDark: React.CSSProperties = { ...btn, background: '#0b080f', color: '#fff', border: 0 }
const smallBtn: React.CSSProperties = { ...btn, minHeight: 28, padding: '0 10px', fontSize: 11 }
const card: React.CSSProperties = { background: '#fff', border: '.5px solid rgba(11,8,15,.10)', borderRadius: 14, padding: 16 }
const chip: React.CSSProperties = { padding: '4px 10px', borderRadius: 999, border: '.5px solid rgba(11,8,15,.12)', background: '#fff', fontSize: 12, fontWeight: 600, color: '#0b080f', fontFamily: "'Sora',sans-serif", cursor: 'default' }
const h2: React.CSSProperties = { fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, color: '#0b080f', margin: '0 0 10px' }
const dimSpan: React.CSSProperties = { fontWeight: 500, color: '#6b4a5c', fontSize: 12 }
const select: React.CSSProperties = { minHeight: 34, padding: '0 10px', borderRadius: 10, border: '.5px solid rgba(11,8,15,.16)', background: '#fff', color: '#0b080f', fontFamily: "'Sora',sans-serif", fontSize: 12 }
const tableWrap: React.CSSProperties = { border: '.5px solid rgba(11,8,15,.12)', borderRadius: 14, overflowX: 'auto' }
const table: React.CSSProperties = { width: '100%', minWidth: 640, borderCollapse: 'collapse', fontSize: 13 }
const th: React.CSSProperties = { textAlign: 'left', padding: '12px 14px', fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6b4a5c', borderBottom: '.5px solid rgba(11,8,15,.10)' }
const td: React.CSSProperties = { padding: '10px 14px', borderBottom: '.5px solid rgba(11,8,15,.06)', verticalAlign: 'top' }
const tdNum: React.CSSProperties = { ...td, fontVariantNumeric: 'tabular-nums' }
const link: React.CSSProperties = { color: '#0b080f', textDecoration: 'underline', textDecorationColor: 'rgba(11,8,15,.25)' }
