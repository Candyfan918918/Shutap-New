import { pageMeta } from '@/lib/seo/page-meta'
// JokeNet admin: the Lab's in-house joke dataset, inside Shutap (Nov 16 2026,
// replaces jokenet Master.xlsx). Rate the unrated queue with the keyboard,
// add rows, paste rows straight from Excel, tag with AI, export, and see the
// exact lines the bit writer is shown for a story. Lines rated 4 or 5 feed
// the writer and the judge live.
//
// In-house only: users' stories and bits never go in.
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { AdminShell } from '@/components/AdminShell'
import {
  JOKENET_TAXONOMY,
  adminJokenetEmbed,
  adminJokenetExport,
  adminJokenetImport,
  adminJokenetList,
  adminJokenetNightly,
  adminJokenetPatch,
  adminJokenetPreview,
  adminJokenetSave,
  adminJokenetTag,
  type JokenetRow,
  type JokenetStats,
} from '@/lib/jokenet.functions'
import { parseSheet, toCsv } from '@/lib/jokenet-sheet'

export const Route = createFileRoute('/_authenticated/admin/jokenet')({
  head: () => ({ meta: [...pageMeta('Admin · JokeNet — Shutap', 'Rate, tag and grow the Lab’s in-house joke dataset in the private administration area.', '/admin/jokenet'), { name: 'robots', content: 'noindex' }] }),
  component: () => (
    <div data-ph-private style={{ display: 'contents' }}>
      <JokenetPage />
    </div>
  ),
})

type Tab = 'rate' | 'browse' | 'add' | 'writer'
type Filters = { q: string; rating: string; source: string; archetype: string; view: 'active' | 'archived'; sort: 'newest' | 'oldest' | 'rating' | 'situation'; page: number }

const PINK = '#e7548a'
const RATING_WORD: Record<number, string> = { 1: 'dead', 2: 'meh', 3: 'fine', 4: 'good', 5: 'would send unedited' }

function JokenetPage() {
  const list = useServerFn(adminJokenetList)
  const [tab, setTab] = useState<Tab>('rate')
  const [stats, setStats] = useState<JokenetStats | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const refreshStats = useCallback(async () => {
    try {
      const r = await list({ data: { pageSize: 10, rating: 'unrated' } })
      setStats(r.stats)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
    }
  }, [list])
  useEffect(() => { void refreshStats() }, [refreshStats])

  return (
    <AdminShell
      title="jokenet"
      subtitle="the Lab’s in-house joke dataset · lines rated 4–5 feed the bit writer and judge live, matched to each story"
      right={<ExportButton onError={setErr} />}
    >
      {err && <div style={{ color: '#c1216b', marginBottom: 12 }}>{err}</div>}
      <StatsRow stats={stats} />
      <div style={{ display: 'flex', gap: 6, margin: '18px 0 16px', flexWrap: 'wrap' }}>
        {([['rate', `rate${stats ? ` · ${stats.unrated} unrated` : ''}`], ['browse', 'browse & edit'], ['add', 'add & import'], ['writer', 'what the writer sees']] as [Tab, string][]).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} style={{ ...pill, ...(tab === k ? pillOn : {}) }}>{label}</button>
        ))}
      </div>
      {tab === 'rate' && <RateQueue onChange={refreshStats} onError={setErr} />}
      {tab === 'browse' && <Browse onChange={refreshStats} onError={setErr} />}
      {tab === 'add' && <AddImport onChange={refreshStats} onError={setErr} stats={stats} />}
      {tab === 'writer' && <WriterPreview onError={setErr} />}
    </AdminShell>
  )
}

function feedLabel(r: JokenetRow): string {
  if (r.origin?.startsWith('nightly:')) return 'nightly writer'
  if (r.origin?.startsWith('bit_daily:')) return '/bit-daily'
  return r.source === 'me' ? 'yours' : r.source
}

/* ── stats ── */

function StatsRow({ stats }: { stats: JokenetStats | null }) {
  const items: [string, string | number, string?][] = stats
    ? [
        ['jokes', stats.total],
        ['rated', stats.rated, `${stats.total ? Math.round((stats.rated / stats.total) * 100) : 0}%`],
        ['feed the writer', stats.feedsWriter, 'rated 4–5, own'],
        ['5 · send unedited', stats.byRating['5'] ?? 0],
        ['added this week', stats.addedThisWeek, `${stats.autoThisWeek.nightly} nightly · ${stats.autoThisWeek.bitDaily} from /bit-daily`],
        ['untagged', stats.untagged],
      ]
    : []
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
      {!stats && <div style={{ color: '#443c42' }}>loading…</div>}
      {items.map(([label, n, sub]) => (
        <div key={label} style={card}>
          <div style={{ fontSize: 12, color: '#6b4a5c' }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{n}</div>
          {sub && <div style={{ fontSize: 11, color: '#6b4a5c', marginTop: 2 }}>{sub}</div>}
        </div>
      ))}
    </div>
  )
}

/* ── rate: one joke at a time, keys 1–5 ── */

function RateQueue({ onChange, onError }: { onChange: () => void; onError: (e: string) => void }) {
  const list = useServerFn(adminJokenetList)
  const patch = useServerFn(adminJokenetPatch)
  const [queue, setQueue] = useState<JokenetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(0)
  const [last, setLast] = useState<{ row: JokenetRow; rating: number | null } | null>(null)
  const skipped = useRef(new Set<number>())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // likely-funny first: the nightly judge's score orders the queue
      const r = await list({ data: { rating: 'unrated', sort: 'queue', pageSize: 60 } })
      setQueue(r.rows.filter((x) => !skipped.current.has(x.id)))
    } catch (e) {
      onError(e instanceof Error ? e.message : 'load failed')
    } finally {
      setLoading(false)
    }
  }, [list, onError])
  useEffect(() => { void load() }, [load])

  const cur = queue[0]
  const rate = useCallback(
    async (rating: number | 'skip' | 'archive') => {
      if (!cur) return
      setQueue((q) => q.slice(1))
      if (rating === 'skip') {
        skipped.current.add(cur.id)
      } else {
        try {
          await patch({ data: rating === 'archive' ? { ids: [cur.id], archived: true } : { ids: [cur.id], rating } })
          setDone((d) => d + 1)
          setLast({ row: cur, rating: rating === 'archive' ? null : rating })
          onChange()
        } catch (e) {
          onError(e instanceof Error ? e.message : 'save failed')
        }
      }
      if (queue.length <= 5) void load()
    },
    [cur, patch, queue.length, load, onChange, onError],
  )

  async function undo() {
    if (!last) return
    try {
      await patch({ data: last.rating == null ? { ids: [last.row.id], archived: false } : { ids: [last.row.id], rating: null } })
      setQueue((q) => [last.row, ...q])
      setDone((d) => Math.max(0, d - 1))
      setLast(null)
      onChange()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'undo failed')
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.metaKey || e.ctrlKey) return
      if (/^[1-5]$/.test(e.key)) void rate(Number(e.key))
      else if (e.key === 's' || e.key === 'ArrowRight') void rate('skip')
      else if (e.key === 'x') void rate('archive')
      else if (e.key === 'z') void undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (loading && !cur) return <div style={{ color: '#443c42' }}>loading…</div>
  if (!cur) return <div style={{ ...card, color: '#443c42' }}>Nothing unrated. Every joke in JokeNet has your rating{done ? ` (${done} this session)` : ''}.</div>

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ ...card, padding: 28, borderRadius: 20 }}>
        <div style={label}>situation · #{cur.id}{cur.archetype ? ` · ${cur.archetype}` : ''} · {feedLabel(cur)}{cur.ai_score ? ` · judge ${cur.ai_score}/10` : ''}</div>
        <div style={{ fontSize: 15, lineHeight: 1.5, color: '#443c42', marginTop: 6 }}>{cur.situation}</div>
        <div style={{ ...label, marginTop: 22 }}>joke</div>
        <div style={{ fontSize: 22, lineHeight: 1.4, fontWeight: 700, marginTop: 6, whiteSpace: 'pre-wrap' }}>{cur.joke}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
          {[cur.move, cur.mechanism, cur.tone, cur.source].filter(Boolean).map((t) => <span key={t} style={tag}>{t}</span>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 24 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => void rate(n)} style={{ ...rateBtn, ...(n >= 4 ? { borderColor: PINK } : {}) }}>
              <span style={{ fontSize: 20, fontWeight: 800 }}>{n}</span>
              <span style={{ fontSize: 11, color: '#6b4a5c' }}>{RATING_WORD[n]}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => void rate('skip')} style={btn}>skip (s)</button>
          <button type="button" onClick={() => void rate('archive')} style={btn}>archive (x)</button>
          {last && <button type="button" onClick={() => void undo()} style={btn}>undo #{last.row.id} (z)</button>}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6b4a5c' }}>{done} rated this session · keys 1–5</span>
        </div>
      </div>
    </div>
  )
}

/* ── browse & edit ── */

function Browse({ onChange, onError }: { onChange: () => void; onError: (e: string) => void }) {
  const list = useServerFn(adminJokenetList)
  const patch = useServerFn(adminJokenetPatch)
  const tagFn = useServerFn(adminJokenetTag)
  const [f, setF] = useState<Filters>({ q: '', rating: 'all', source: 'all', archetype: 'all', view: 'active', sort: 'newest', page: 0 })
  const [rows, setRows] = useState<JokenetRow[]>([])
  const [total, setTotal] = useState(0)
  const [editing, setEditing] = useState<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const PAGE = 50

  const load = useCallback(async () => {
    try {
      const r = await list({ data: { ...f, pageSize: PAGE } })
      setRows(r.rows)
      setTotal(r.total)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'load failed')
    }
  }, [list, f, onError])
  useEffect(() => {
    const t = setTimeout(() => void load(), f.q ? 250 : 0)
    return () => clearTimeout(t)
  }, [load, f.q])

  const set = (p: Partial<Filters>) => setF((x) => ({ ...x, page: 0, ...p }))

  async function rateRow(r: JokenetRow, rating: number) {
    const next = r.rating === rating ? null : rating
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, rating: next } : x)))
    try {
      await patch({ data: { ids: [r.id], rating: next } })
      onChange()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'save failed')
    }
  }
  async function archiveRow(r: JokenetRow) {
    try {
      await patch({ data: { ids: [r.id], archived: !r.archived_at } })
      setRows((rs) => rs.filter((x) => x.id !== r.id))
      onChange()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'save failed')
    }
  }
  async function tagPage() {
    setBusy('tagging…')
    try {
      const ids = rows.filter((r) => !r.archetype || !r.mechanism || !r.tone).map((r) => r.id).slice(0, 40)
      const r = ids.length ? await tagFn({ data: { ids } }) : { tagged: 0 }
      if ('error' in r && r.error) onError(`tagging: ${r.error}`)
      await load()
      onChange()
      setBusy(`tagged ${r.tagged}`)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'tagging failed')
      setBusy(null)
    }
  }

  const pages = Math.max(1, Math.ceil(total / PAGE))
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <input value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="search situations, jokes, notes" style={{ ...input, flex: '1 1 260px' }} />
        <select value={f.rating} onChange={(e) => set({ rating: e.target.value })} style={select}>
          <option value="all">any rating</option>
          <option value="unrated">unrated</option>
          <option value="4+">4–5 (feeds the writer)</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={String(n)}>{n} · {RATING_WORD[n]}</option>)}
        </select>
        <select value={f.archetype} onChange={(e) => set({ archetype: e.target.value })} style={select}>
          <option value="all">any archetype</option>
          <option value="untagged">untagged</option>
          {JOKENET_TAXONOMY.archetype.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={f.source} onChange={(e) => set({ source: e.target.value })} style={select}>
          <option value="all">any source</option>
          {JOKENET_TAXONOMY.source.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={f.sort} onChange={(e) => set({ sort: e.target.value as Filters['sort'] })} style={select}>
          <option value="newest">newest</option>
          <option value="oldest">oldest</option>
          <option value="rating">highest rated</option>
          <option value="situation">by situation</option>
        </select>
        <select value={f.view} onChange={(e) => set({ view: e.target.value as Filters['view'] })} style={select}>
          <option value="active">in use</option>
          <option value="archived">archived</option>
        </select>
        <button type="button" onClick={() => void tagPage()} disabled={!!busy && busy.endsWith('…')} style={btn}>AI-tag untagged on this page</button>
        {busy && <span style={{ fontSize: 12, color: '#6b4a5c' }}>{busy}</span>}
      </div>
      <div style={{ fontSize: 12, color: '#6b4a5c', marginBottom: 8 }}>{total} {total === 1 ? 'joke' : 'jokes'} · page {f.page + 1} of {pages}</div>
      <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...th, width: 60 }}>#</th>
              <th style={th}>situation</th>
              <th style={th}>joke</th>
              <th style={{ ...th, width: 190 }}>rating</th>
              <th style={{ ...th, width: 210 }}>tags</th>
              <th style={{ ...th, width: 110 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) =>
              editing === r.id ? (
                <tr key={r.id}>
                  <td colSpan={6} style={{ ...td, background: '#fdf3f7' }}>
                    <RowForm
                      initial={r}
                      onCancel={() => setEditing(null)}
                      onSaved={(row) => {
                        setRows((rs) => rs.map((x) => (x.id === row.id ? row : x)))
                        setEditing(null)
                        onChange()
                      }}
                      onError={onError}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={r.id}>
                  <td style={{ ...td, color: '#6b4a5c', fontVariantNumeric: 'tabular-nums' }}>{r.id}{r.founder ? <div title="your own line" style={{ color: PINK, fontSize: 11, fontWeight: 700 }}>yours</div> : null}</td>
                  <td style={{ ...td, color: '#443c42', maxWidth: 360 }}>{r.situation}</td>
                  <td style={{ ...td, fontWeight: 600, maxWidth: 420, whiteSpace: 'pre-wrap' }}>{r.joke}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button" title={RATING_WORD[n]} onClick={() => void rateRow(r, n)} style={{ ...dot, ...(r.rating === n ? { background: n >= 4 ? PINK : '#0b080f', color: '#fff', borderColor: 'transparent' } : {}) }}>{n}</button>
                      ))}
                    </div>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {[r.archetype, r.move, r.mechanism, r.tone, r.heat ? `heat ${r.heat}` : null, r.source !== 'shutap' ? r.source : null].filter(Boolean).map((t) => <span key={String(t)} style={tag}>{t}</span>)}
                    </div>
                  </td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>
                    <button type="button" onClick={() => setEditing(r.id)} style={link}>edit</button>
                    <button type="button" onClick={() => void archiveRow(r)} style={link}>{r.archived_at ? 'restore' : 'archive'}</button>
                  </td>
                </tr>
              ),
            )}
            {!rows.length && (
              <tr><td colSpan={6} style={{ ...td, color: '#6b4a5c' }}>No jokes match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" disabled={f.page === 0} onClick={() => setF((x) => ({ ...x, page: x.page - 1 }))} style={btn}>← prev</button>
        <button type="button" disabled={f.page + 1 >= pages} onClick={() => setF((x) => ({ ...x, page: x.page + 1 }))} style={btn}>next →</button>
      </div>
    </div>
  )
}

/* ── one row's form (add and edit) ── */

type FormState = { situation: string; joke: string; rating: number | null; archetype: string; move: string; mechanism: string; tone: string; heat: number | null; target: string; source: string; license: 'own' | 'CC-BY' | 'CC0' | 'unclear'; notes: string; founder: boolean }

function RowForm({ initial, onSaved, onCancel, onError, compact }: { initial?: JokenetRow; onSaved: (r: JokenetRow) => void; onCancel?: () => void; onError: (e: string) => void; compact?: boolean }) {
  const save = useServerFn(adminJokenetSave)
  const blank: FormState = { situation: '', joke: '', rating: null, archetype: '', move: '', mechanism: '', tone: '', heat: null, target: '', source: 'me', license: 'own', notes: '', founder: true }
  const [s, setS] = useState<FormState>(
    initial
      ? { situation: initial.situation, joke: initial.joke, rating: initial.rating, archetype: initial.archetype ?? '', move: initial.move ?? '', mechanism: initial.mechanism ?? '', tone: initial.tone ?? '', heat: initial.heat, target: initial.target ?? '', source: initial.source, license: (initial.license as FormState['license']) ?? 'own', notes: initial.notes ?? '', founder: initial.founder }
      : blank,
  )
  const [more, setMore] = useState(!!initial)
  const [saving, setSaving] = useState(false)
  const jokeRef = useRef<HTMLTextAreaElement>(null)
  const up = (p: Partial<FormState>) => setS((x) => ({ ...x, ...p }))

  async function submit(keepSituation: boolean) {
    if (!s.situation.trim() || !s.joke.trim()) return
    setSaving(true)
    try {
      const { row } = await save({
        data: {
          ...(initial ? { id: initial.id } : {}),
          situation: s.situation,
          joke: s.joke,
          rating: s.rating,
          archetype: s.archetype || null,
          move: s.move || null,
          mechanism: s.mechanism || null,
          tone: s.tone || null,
          heat: s.heat,
          target: s.target || null,
          source: s.source,
          license: s.license,
          notes: s.notes || null,
          founder: s.founder,
        },
      })
      onSaved(row)
      if (!initial) {
        // several jokes on one situation: keep it, clear the joke
        setS(keepSituation ? { ...blank, situation: s.situation, rating: null } : blank)
        jokeRef.current?.focus()
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : 'save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 10 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={label}>situation · names as roles (my boss, my sister)</span>
          <textarea value={s.situation} onChange={(e) => up({ situation: e.target.value })} rows={3} style={area} placeholder="My manager booked a meeting to discuss why we have too many meetings." />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={label}>joke</span>
          <textarea
            ref={jokeRef}
            value={s.joke}
            onChange={(e) => up({ joke: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit(true) }}
            rows={3}
            style={{ ...area, fontWeight: 600 }}
            placeholder="The meeting about meetings ended with a meeting."
          />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={label}>rating</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" title={RATING_WORD[n]} onClick={() => up({ rating: s.rating === n ? null : n })} style={{ ...dot, ...(s.rating === n ? { background: n >= 4 ? PINK : '#0b080f', color: '#fff', borderColor: 'transparent' } : {}) }}>{n}</button>
        ))}
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, marginLeft: 10 }}>
          <input type="checkbox" checked={s.founder} onChange={(e) => up({ founder: e.target.checked })} /> my own line
        </label>
        <button type="button" onClick={() => setMore((m) => !m)} style={link}>{more ? 'fewer fields' : 'tags & notes (optional, AI can fill)'}</button>
      </div>
      {more && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
          <Pick label="archetype" value={s.archetype} options={JOKENET_TAXONOMY.archetype} onChange={(v) => up({ archetype: v })} />
          <Pick label="move" value={s.move} options={JOKENET_TAXONOMY.move} onChange={(v) => up({ move: v })} />
          <Pick label="mechanism" value={s.mechanism} options={JOKENET_TAXONOMY.mechanism} onChange={(v) => up({ mechanism: v })} />
          <Pick label="tone" value={s.tone} options={JOKENET_TAXONOMY.tone} onChange={(v) => up({ tone: v })} />
          <Pick label="heat" value={s.heat ? String(s.heat) : ''} options={['1', '2', '3']} onChange={(v) => up({ heat: v ? Number(v) : null })} />
          <label style={{ display: 'grid', gap: 4 }}><span style={label}>target</span><input value={s.target} onChange={(e) => up({ target: e.target.value })} style={input} placeholder="boss" /></label>
          <Pick label="source" value={s.source} options={JOKENET_TAXONOMY.source} onChange={(v) => up({ source: v || 'me' })} />
          <Pick label="license" value={s.license} options={JOKENET_TAXONOMY.license} onChange={(v) => up({ license: (v || 'own') as FormState['license'] })} />
          <label style={{ display: 'grid', gap: 4, gridColumn: '1 / -1' }}><span style={label}>notes</span><input value={s.notes} onChange={(e) => up({ notes: e.target.value })} style={input} /></label>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => void submit(true)} disabled={saving || !s.situation.trim() || !s.joke.trim()} style={{ ...btn, background: '#0b080f', color: '#fff' }}>
          {saving ? 'saving…' : initial ? 'save' : 'add joke (⌘/Ctrl + Enter)'}
        </button>
        {!initial && <button type="button" onClick={() => void submit(false)} disabled={saving || !s.situation.trim() || !s.joke.trim()} style={btn}>add & new situation</button>}
        {onCancel && <button type="button" onClick={onCancel} style={btn}>cancel</button>}
      </div>
    </div>
  )
}

function Pick({ label: l, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span style={label}>{l}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={select}>
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
        {value && !options.includes(value) && <option value={value}>{value}</option>}
      </select>
    </label>
  )
}

/* ── add & import ── */

function AddImport({ onChange, onError, stats }: { onChange: () => void; onError: (e: string) => void; stats: JokenetStats | null }) {
  const importFn = useServerFn(adminJokenetImport)
  const tagFn = useServerFn(adminJokenetTag)
  const embedFn = useServerFn(adminJokenetEmbed)
  const nightlyFn = useServerFn(adminJokenetNightly)
  const [added, setAdded] = useState<JokenetRow[]>([])
  const [paste, setPaste] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const parsed = paste.trim() ? parseSheet(paste) : null

  async function runImport() {
    if (!parsed?.rows.length) return
    setBusy('importing…')
    try {
      let a = 0, u = 0, s = 0
      for (let i = 0; i < parsed.rows.length; i += 500) {
        const r = await importFn({ data: { rows: parsed.rows.slice(i, i + 500) } })
        a += r.added; u += r.updated; s += r.skipped
      }
      setBusy(`added ${a} · updated ${u} · skipped ${s} already in JokeNet`)
      setPaste('')
      onChange()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'import failed')
      setBusy(null)
    }
  }
  async function onFile(file: File) {
    setPaste(await file.text())
  }
  async function tagAll() {
    setBusy('tagging…')
    try {
      let total = 0
      for (let i = 0; i < 20; i++) {
        const r = await tagFn({ data: {} })
        if (r.error) { onError(`tagging: ${r.error}`); break }
        total += r.tagged
        setBusy(`tagged ${total} · ${r.remaining} left…`)
        if (!r.tagged || r.remaining <= 0) break
      }
      setBusy(`tagged ${total}`)
      onChange()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'tagging failed')
      setBusy(null)
    }
  }
  async function writeBatch() {
    setBusy('writing tonight’s batch… (about a minute)')
    try {
      const r = await nightlyFn()
      if (r.errors.length) onError(`nightly: ${r.errors.join(' · ')}`)
      setBusy(`${r.situations} situations · ${r.written} lines written · ${r.kept} kept for your queue`)
      onChange()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'nightly failed')
      setBusy(null)
    }
  }
  async function embedAll() {
    setBusy('matching…')
    try {
      let total = 0
      for (let i = 0; i < 10; i++) {
        const r = await embedFn({ data: { limit: 256 } })
        total += r.embedded
        setBusy(`indexed ${total} · ${r.remaining} left…`)
        if (!r.embedded || r.remaining <= 0) break
      }
      setBusy(`indexed ${total}`)
      onChange()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'indexing failed')
      setBusy(null)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={card}>
        <h2 style={h2}>add a joke</h2>
        <RowForm onSaved={(r) => { setAdded((a) => [r, ...a].slice(0, 8)); onChange() }} onError={onError} />
        {added.length > 0 && (
          <div style={{ marginTop: 14, fontSize: 12, color: '#443c42' }}>
            just added: {added.map((r) => `#${r.id}`).join(' · ')}
          </div>
        )}
      </div>

      <div style={card}>
        <h2 style={h2}>paste from Excel or upload a CSV</h2>
        <div style={{ fontSize: 12, color: '#6b4a5c', marginBottom: 8 }}>
          Copy rows in Excel (with the header row) and paste here, or choose a .csv. Columns it reads: situation, joke, rating, and any of archetype, move, mechanism, tone, heat, target, source, license, notes, id. No header? It reads situation · joke · rating in that order. A joke already in JokeNet is skipped; a row with an existing id updates it.
        </div>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={6} style={{ ...area, fontFamily: 'ui-monospace, monospace', fontSize: 12 }} placeholder={'situation\tjoke\trating\nMy boss…\tThe meeting…\t5'} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
          <label style={{ ...btn, display: 'inline-flex', alignItems: 'center' }}>
            choose .csv
            <input type="file" accept=".csv,.tsv,.txt,text/csv" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f) }} />
          </label>
          {parsed && <span style={{ fontSize: 12, color: '#443c42' }}>{parsed.rows.length} rows read · columns: {parsed.columns.join(', ') || '—'}{parsed.dropped ? ` · ${parsed.dropped} without a situation or joke left out` : ''}</span>}
          <button type="button" onClick={() => void runImport()} disabled={!parsed?.rows.length || !!busy?.endsWith('…')} style={{ ...btn, background: '#0b080f', color: '#fff' }}>import {parsed?.rows.length ?? 0} rows</button>
        </div>
        {parsed && parsed.rows.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#443c42' }}>
            first row: <b>{parsed.rows[0]!.situation.slice(0, 80)}</b> → {parsed.rows[0]!.joke.slice(0, 80)}{parsed.rows[0]!.rating ? ` · ${parsed.rows[0]!.rating}` : ''}
          </div>
        )}
      </div>

      <div style={card}>
        <h2 style={h2}>housekeeping</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" onClick={() => void writeBatch()} disabled={!!busy?.endsWith('…') || !!busy?.endsWith(')')} style={btn}>write a batch now</button>
          <button type="button" onClick={() => void tagAll()} disabled={!!busy?.endsWith('…')} style={btn}>AI-tag untagged ({stats?.untagged ?? '…'})</button>
          <button type="button" onClick={() => void embedAll()} disabled={!!busy?.endsWith('…')} style={btn}>index for story matching ({stats?.noVector ?? '…'} waiting)</button>
          {busy && <span style={{ fontSize: 12, color: '#6b4a5c' }}>{busy}</span>}
        </div>
        <div style={{ fontSize: 12, color: '#6b4a5c', marginTop: 8 }}>JokeNet fills itself: every night at 3:23am a batch of new in-house lines is written, scored by a judge and put in your rating queue, and everything you rate on /bit-daily lands here too. AI tags only fill empty labels; yours are never overwritten. New and edited rows are indexed automatically.</div>
      </div>
    </div>
  )
}

/* ── what the writer sees ── */

function WriterPreview({ onError }: { onError: (e: string) => void }) {
  const preview = useServerFn(adminJokenetPreview)
  const [story, setStory] = useState('')
  const [res, setRes] = useState<{ from: 'jokenet' | 'static'; lines: { s: string; l: string; m: string; f?: boolean }[] } | null>(null)
  const [busy, setBusy] = useState(false)
  async function run() {
    if (!story.trim()) return
    setBusy(true)
    try {
      setRes(await preview({ data: { story } }))
    } catch (e) {
      onError(e instanceof Error ? e.message : 'preview failed')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 900 }}>
      <div style={card}>
        <div style={{ fontSize: 12, color: '#6b4a5c', marginBottom: 8 }}>Type a story the way a user would. These are the six lines the bit writer is shown as the bar for it (the judge sees the first four). Each pick is rated 4–5, from a different situation, nearest in meaning first, with two top-rated lines from elsewhere for range. Rows that tell the same story, the blind-eval stories and the style catalogs are left out.</div>
        <textarea value={story} onChange={(e) => setStory(e.target.value)} rows={3} style={area} placeholder="My sister borrowed my car for a week and returned it with an empty tank and a parking ticket." />
        <button type="button" onClick={() => void run()} disabled={busy || !story.trim()} style={{ ...btn, background: '#0b080f', color: '#fff', marginTop: 8 }}>{busy ? 'matching…' : 'show what the writer sees'}</button>
      </div>
      {res && (
        <div style={card}>
          <div style={{ fontSize: 12, color: res.from === 'jokenet' ? '#2c7a4b' : '#c1216b', fontWeight: 700, marginBottom: 10 }}>
            {res.from === 'jokenet' ? 'live from JokeNet' : 'JokeNet didn’t answer (no index yet, or the AI gateway was slow): the writer fell back to the Nov 1 frozen list'}
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 12 }}>
            {res.lines.map((t, i) => (
              <li key={i}>
                <div style={{ fontSize: 12, color: '#6b4a5c' }}>{t.s}</div>
                <div style={{ fontWeight: 700, marginTop: 2 }}>{t.l}{t.f ? <span style={{ color: PINK, fontSize: 11, marginLeft: 6 }}>yours</span> : null}</div>
                {t.m && <div style={{ fontSize: 11, color: '#6b4a5c', marginTop: 2 }}>{t.m}</div>}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

/* ── export ── */

function ExportButton({ onError }: { onError: (e: string) => void }) {
  const exp = useServerFn(adminJokenetExport)
  const [busy, setBusy] = useState(false)
  async function run() {
    setBusy(true)
    try {
      const { rows } = await exp()
      const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `jokenet-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'export failed')
    } finally {
      setBusy(false)
    }
  }
  return <button type="button" onClick={() => void run()} disabled={busy} style={btn}>{busy ? 'exporting…' : 'export csv (opens in Excel)'}</button>
}

/* ── styles ── */

const btn: React.CSSProperties = { minHeight: 36, padding: '0 14px', borderRadius: 999, border: '.5px solid rgba(11,8,15,.16)', background: '#fff', color: '#0b080f', fontFamily: "'Sora',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }
const pill: React.CSSProperties = { ...btn, minHeight: 34 }
const pillOn: React.CSSProperties = { background: PINK, color: '#fff', borderColor: 'transparent' }
const card: React.CSSProperties = { background: '#fff', border: '.5px solid rgba(11,8,15,.10)', borderRadius: 14, padding: 16 }
const h2: React.CSSProperties = { fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, color: '#0b080f', margin: '0 0 10px' }
const select: React.CSSProperties = { minHeight: 34, padding: '0 10px', borderRadius: 10, border: '.5px solid rgba(11,8,15,.16)', background: '#fff', color: '#0b080f', fontFamily: "'Sora',sans-serif", fontSize: 12 }
const input: React.CSSProperties = { minHeight: 34, padding: '0 12px', borderRadius: 10, border: '.5px solid rgba(11,8,15,.16)', background: '#fff', color: '#0b080f', fontFamily: "'Sora',sans-serif", fontSize: 13 }
const area: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 12, border: '.5px solid rgba(11,8,15,.16)', background: '#fff', color: '#0b080f', fontFamily: "'Sora',sans-serif", fontSize: 14, lineHeight: 1.45, resize: 'vertical' }
const th: React.CSSProperties = { textAlign: 'left', padding: '12px 14px', fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6b4a5c', borderBottom: '.5px solid rgba(11,8,15,.10)' }
const td: React.CSSProperties = { padding: '12px 14px', borderBottom: '.5px solid rgba(11,8,15,.06)', verticalAlign: 'top' }
const label: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: '#6b4a5c' }
const tag: React.CSSProperties = { fontSize: 11, padding: '3px 8px', borderRadius: 999, background: '#f7eef2', color: '#6b4a5c' }
const dot: React.CSSProperties = { width: 30, height: 30, borderRadius: 999, border: '.5px solid rgba(11,8,15,.2)', background: '#fff', color: '#0b080f', fontFamily: "'Sora',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }
const rateBtn: React.CSSProperties = { display: 'grid', gap: 2, justifyItems: 'center', padding: '12px 4px', borderRadius: 14, border: '1px solid rgba(11,8,15,.14)', background: '#fff', color: '#0b080f', fontFamily: "'Sora',sans-serif", cursor: 'pointer' }
const link: React.CSSProperties = { background: 'none', border: 0, color: PINK, fontFamily: "'Sora',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '0 6px' }
