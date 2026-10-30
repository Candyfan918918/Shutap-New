// Daily humor training: today's /funniest techniques × three fresh stories
// (plus hers), one bit per technique. She keeps, cuts or rewrites each one
// and can mark the funniest line. Kept and rewritten bits teach the live
// writer her taste; keep rates decide how often each technique is dealt.
import { createFileRoute, notFound } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { amIAdmin } from '@/lib/admin.functions'
import { addDailyStory, getDaily, rateDaily, runDailyStory, type DailyBit, type DailyState } from '@/lib/bit-daily.functions'
import '@/components/feed/feed.css'

export const Route = createFileRoute('/bit-daily')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Daily humor training — Shutap' }, { name: 'robots', content: 'noindex' }] }),
  beforeLoad: async () => {
    try {
      if (!(await amIAdmin())) throw notFound()
    } catch {
      throw notFound()
    }
  },
  component: () => (
    <div data-ph-private style={{ display: 'contents' }}>
      <BitDaily />
    </div>
  ),
})

function BitDaily() {
  const [s, setS] = useState<DailyState | null>(null)
  const [running, setRunning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [own, setOwn] = useState('')
  const started = useRef(false)

  async function load(): Promise<DailyState | null> {
    try {
      const next = await getDaily()
      setS(next)
      return next
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load')
      return null
    }
  }

  async function write(ids: string[]) {
    setError(null)
    for (const id of ids) {
      setRunning(id)
      try {
        const bits = await runDailyStory({ data: { story_id: id } })
        setS((cur) => (cur ? { ...cur, bits: [...cur.bits.filter((b) => b.story_id !== id), ...bits], todo: cur.todo.filter((t) => t !== id) } : cur))
      } catch (e) {
        setError(`${id}: ${e instanceof Error ? e.message : 'failed'}`)
      }
    }
    setRunning(null)
  }

  // Today's set writes itself the first time the page opens each day.
  useEffect(() => {
    void load().then((next) => {
      if (next && next.todo.length && !started.current) {
        started.current = true
        void write(next.todo)
      }
    })
  }, [])

  async function addOwn() {
    if (own.trim().length < 10) return
    setError(null)
    try {
      const story = await addDailyStory({ data: { story: own } })
      setOwn('')
      setS((cur) => (cur ? { ...cur, stories: [...cur.stories, story] } : cur))
      await write([story.id])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed')
    }
  }

  async function rate(b: DailyBit, verdict: 'keep' | 'cut' | 'rewrite', extra: { rewrite?: string; best_line?: string; note?: string }) {
    try {
      const saved = await rateDaily({ data: { id: b.id, verdict, ...extra } })
      setS((cur) => (cur ? { ...cur, bits: cur.bits.map((x) => (x.id === saved.id ? saved : x)) } : cur))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to save')
    }
  }

  const unrated = s?.bits.filter((b) => !b.rated_at).length ?? 0

  return (
    <div className="fd">
      <div className="fd-col" style={{ maxWidth: 820 }}>
        <h1 className="fd-h1">Daily humor training</h1>
        <p className="fd-muted" style={{ margin: 0 }}>
          Today's /funniest techniques on fresh stories, one bit per technique. Keep what's funny, cut what isn't, rewrite what's close. Tap the funniest line. What you keep teaches the writer.
        </p>
        <div className="fd-row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <a className="fd-faint" href="/bit-lab">bit lab</a>
          <a className="fd-faint" href="/bit-eval">blind eval</a>
        </div>

        {s && (
          <div className="fd-card" style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {s.day}
              {s.page ? ` · funniest ${s.page.category} (${s.page.pick})` : ''}
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>
              {s.techniques.map((t) => (
                <li key={t.id}>
                  <strong>{t.name.toLowerCase()}</strong>
                  <span className="fd-muted"> · {t.op}</span>
                </li>
              ))}
            </ol>
            <div className="fd-muted">
              {running ? `writing ${running}…` : unrated ? `${unrated} to rate` : s.bits.length ? 'all rated for today' : ''}
            </div>
          </div>
        )}

        {s && <Stats s={s} />}

        <div className="fd-card" style={{ display: 'grid', gap: 8 }}>
          <label className="fd-faint" style={{ fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>
            add your own story
          </label>
          <textarea className="fd-input" rows={3} value={own} onChange={(e) => setOwn(e.target.value)} maxLength={1200} placeholder="something that happened…" />
          <div>
            <button className="fd-btn sm" disabled={!!running || own.trim().length < 10} onClick={addOwn}>
              write today's techniques on it
            </button>
          </div>
        </div>

        {error && <p style={{ color: 'var(--wine)', margin: 0 }}>{error}</p>}

        {s?.stories.map((story) => {
          const bits = s.bits.filter((b) => b.story_id === story.id)
          return (
            <section key={story.id} style={{ display: 'grid', gap: 10 }}>
              <p className="fd-situation" style={{ margin: 0 }}>
                <span className="fd-faint">{story.own ? 'yours · ' : ''}</span>
                {story.story}
              </p>
              {!bits.length && <p className="fd-muted">{running === story.id ? 'writing…' : s.todo.includes(story.id) ? 'waiting…' : 'no bits'}</p>}
              {bits.map((b) => (
                <BitCard key={b.id} b={b} onRate={rate} />
              ))}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Stats({ s }: { s: DailyState }) {
  const st = s.stats
  if (!st.rated) return null
  return (
    <details className="fd-card">
      <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
        last 60 days: {st.rated} rated · {st.kept} kept · {st.rewritten} rewritten · {st.cut} cut · the writer is learning from your {st.feeding} latest keeps
      </summary>
      <table style={{ width: '100%', marginTop: 8, fontSize: 14, borderCollapse: 'collapse' }}>
        <tbody>
          {st.techniques.map((t) => (
            <tr key={t.id}>
              <td style={{ padding: '3px 0' }}>{t.name.toLowerCase()}</td>
              <td className="fd-muted" style={{ textAlign: 'right' }}>
                kept {t.kept} of {t.rated}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

function BitCard({ b, onRate }: { b: DailyBit; onRate: (b: DailyBit, v: 'keep' | 'cut' | 'rewrite', extra: { rewrite?: string; best_line?: string; note?: string }) => Promise<void> }) {
  const [best, setBest] = useState<string | null>(b.best_line)
  const [note, setNote] = useState(b.note ?? '')
  const [editing, setEditing] = useState(false)
  const lines = b.bit ? [b.bit.hook, b.bit.setup, ...b.bit.tags, b.bit.button] : []
  const [rewrite, setRewrite] = useState(b.rewrite ?? lines.join('\n'))
  const rated = !!b.rated_at
  const extra = () => ({ best_line: best ?? undefined, note: note || undefined })

  return (
    <div
      className="fd-card"
      style={{ display: 'grid', gap: 8, opacity: rated && b.verdict === 'cut' ? 0.55 : 1, borderColor: rated && b.verdict !== 'cut' ? 'var(--wine)' : undefined }}
    >
      <div className="fd-faint" style={{ fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', fontSize: 12 }}>
        {b.technique_name.toLowerCase()}
        {b.rule ? ` · missed a rule: ${b.rule}` : ''}
      </div>
      {lines.map((l, i) => (
        <p
          key={i}
          onClick={() => !rated && setBest(best === l ? null : l)}
          style={{
            margin: 0,
            cursor: rated ? 'default' : 'pointer',
            fontFamily: i === 0 ? undefined : 'var(--news)',
            fontWeight: i === 0 ? 800 : i === lines.length - 1 ? 600 : 400,
            fontSize: i === 0 ? 18 : 16,
            color: i === 0 ? 'var(--wine)' : undefined,
            background: best === l ? 'rgba(224,80,138,.14)' : undefined,
            borderRadius: 6,
            padding: '1px 4px',
          }}
        >
          {l}
        </p>
      ))}

      {!rated && editing && (
        <textarea className="fd-input" rows={6} value={rewrite} onChange={(e) => setRewrite(e.target.value)} maxLength={1200} />
      )}

      {!rated ? (
        <div className="fd-row" style={{ flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          {editing ? (
            <>
              <button className="fd-btn sm" onClick={() => onRate(b, 'rewrite', { ...extra(), rewrite })}>
                save my rewrite
              </button>
              <button className="fd-btn ghost sm" onClick={() => setEditing(false)}>
                back
              </button>
            </>
          ) : (
            <>
              <button className="fd-btn sm" onClick={() => onRate(b, 'keep', extra())}>
                keep
              </button>
              <button className="fd-btn ghost sm" onClick={() => setEditing(true)}>
                rewrite
              </button>
              <button className="fd-btn ghost sm" onClick={() => onRate(b, 'cut', extra())}>
                cut
              </button>
            </>
          )}
          <input className="fd-input" style={{ flex: '1 1 200px' }} placeholder="why (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={400} />
        </div>
      ) : (
        <p className="fd-muted" style={{ margin: 0 }}>
          {b.verdict}
          {b.best_line ? ` · funniest: "${b.best_line}"` : ''}
          {b.note ? ` · ${b.note}` : ''}
          {b.verdict === 'rewrite' && b.rewrite ? (
            <span style={{ display: 'block', whiteSpace: 'pre-wrap', marginTop: 6, fontFamily: 'var(--news)', color: 'inherit' }}>{b.rewrite}</span>
          ) : null}
        </p>
      )}
    </div>
  )
}
