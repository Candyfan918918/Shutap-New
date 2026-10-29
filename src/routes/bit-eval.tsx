// Bit eval: admin-only blind A/B of two pipeline variants over thirty frozen
// stories. Run the pairs (one story at a time, from the browser), then rate
// each pair left / right / neither without knowing which is which. The
// scoreboard and the reveal appear only after a verdict.
import { pageMeta } from '@/lib/seo/page-meta'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { amIAdmin } from '@/lib/admin.functions'
import { evalSummary, listEvalPairs, rateEvalPair, runEvalPair, type EvalPair } from '@/lib/bit-eval.functions'
import type { BitDraft } from '@/lib/bits/shared'
import '@/components/feed/feed.css'

export const Route = createFileRoute('/bit-eval')({
  ssr: false,
  head: () => ({ meta: [...pageMeta('Bit eval — Shutap', 'Blind A/B of the bit pipeline over thirty frozen stories.', '/bit-eval'), { name: 'robots', content: 'noindex' }] }),
  beforeLoad: async () => {
    try {
      if (!(await amIAdmin())) throw notFound()
    } catch {
      throw notFound()
    }
  },
  component: () => (
    <div data-ph-private style={{ display: 'contents' }}>
      <BitEval />
    </div>
  ),
})

type Summary = Awaited<ReturnType<typeof evalSummary>>

function BitEval() {
  const [pairs, setPairs] = useState<EvalPair[]>([])
  const [todo, setTodo] = useState<string[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [running, setRunning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const stop = useRef(false)

  async function refresh() {
    try {
      const [l, s] = await Promise.all([listEvalPairs(), evalSummary()])
      setPairs(l.pairs)
      setTodo(l.todo)
      setSummary(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load')
    }
  }
  useEffect(() => {
    void refresh()
  }, [])

  async function runAll() {
    stop.current = false
    setError(null)
    for (const id of todo) {
      if (stop.current) break
      setRunning(id)
      try {
        const pair = await runEvalPair({ data: { story_id: id } })
        setPairs((p) => [...p.filter((x) => x.story_id !== pair.story_id), pair])
        setTodo((t) => t.filter((x) => x !== id))
      } catch (e) {
        setError(`${id}: ${e instanceof Error ? e.message : 'failed'}`)
        break
      }
    }
    setRunning(null)
    void refresh()
  }

  async function rate(id: string, verdict: 'left' | 'right' | 'neither', note: string) {
    try {
      const pair = await rateEvalPair({ data: { id, verdict, note } })
      setPairs((p) => p.map((x) => (x.id === pair.id ? pair : x)))
      setSummary(await evalSummary())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to save')
    }
  }

  const unrated = pairs.filter((p) => !p.rated_at)
  const rated = pairs.filter((p) => p.rated_at)

  return (
    <div className="fd">
      <div className="fd-col" style={{ maxWidth: 820 }}>
        <h1 className="fd-h1">Bit eval</h1>
        <p className="fd-muted" style={{ margin: 0 }}>
          Thirty frozen stories, two pipelines each, shown blind. Pick the funnier side. Which side was which is revealed only after you pick.
        </p>

        {summary && (
          <div className="fd-card" style={{ display: 'grid', gap: 6 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              new pipeline {summary.newWins} · old pipeline {summary.oldWins} · neither {summary.neither}
            </div>
            <div className="fd-muted">
              {summary.rated} of {summary.total} rated · {pairs.length} written · {todo.length} still to write
            </div>
          </div>
        )}

        <div className="fd-row" style={{ flexWrap: 'wrap' }}>
          <button className="fd-btn" disabled={!!running || todo.length === 0} onClick={runAll}>
            {running ? `writing ${running}…` : todo.length ? `write the ${todo.length} remaining` : 'all written'}
          </button>
          {running && (
            <button className="fd-btn ghost sm" onClick={() => (stop.current = true)}>
              stop after this one
            </button>
          )}
          <button className="fd-btn ghost sm" onClick={refresh}>
            refresh
          </button>
        </div>
        {error && <p style={{ color: 'var(--wine)', margin: 0 }}>{error}</p>}

        {unrated.map((p) => (
          <PairCard key={p.id} pair={p} onRate={rate} />
        ))}
        {rated.length > 0 && <h2 className="fd-h2" style={{ marginTop: 24 }}>rated</h2>}
        {rated.map((p) => (
          <PairCard key={p.id} pair={p} onRate={rate} />
        ))}
      </div>
    </div>
  )
}

function Bit({ b }: { b: BitDraft | null }) {
  if (!b) return <p className="fd-muted">no bit (the pipeline returned nothing)</p>
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ fontWeight: 800, fontSize: 19, color: 'var(--wine)', letterSpacing: '-.02em' }}>{b.hook}</div>
      <p style={{ margin: 0, fontFamily: 'var(--news)', fontSize: 16 }}>{b.setup}</p>
      {b.tags.map((t, i) => (
        <p key={i} style={{ margin: 0, fontFamily: 'var(--news)', fontSize: 16 }}>
          {t}
        </p>
      ))}
      <p style={{ margin: 0, fontFamily: 'var(--news)', fontSize: 16, fontWeight: 600 }}>{b.button}</p>
    </div>
  )
}

function PairCard({ pair, onRate }: { pair: EvalPair; onRate: (id: string, v: 'left' | 'right' | 'neither', note: string) => Promise<void> }) {
  const [note, setNote] = useState(pair.note ?? '')
  const rated = !!pair.rated_at
  const side = (which: 'left' | 'right') => {
    const variant = which === 'left' ? pair.left_variant : pair.left_variant === 'old' ? 'new' : 'old'
    const meta = which === 'left' ? pair.left_meta : pair.right_meta
    const won = pair.verdict === which
    return (
      <div
        style={{
          flex: '1 1 300px',
          border: `2px solid ${rated && won ? 'var(--wine)' : 'var(--line, #eadbe2)'}`,
          borderRadius: 14,
          padding: 14,
          display: 'grid',
          gap: 10,
          alignContent: 'start',
        }}
      >
        <div className="fd-faint" style={{ fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>
          {which}
          {rated && pair.left_variant ? ` · ${variant === 'new' ? 'new pipeline' : 'old pipeline'}` : ''}
        </div>
        <Bit b={which === 'left' ? pair.left_bit : pair.right_bit} />
        {rated && meta && (
          <div className="fd-muted" style={{ fontSize: 12 }}>
            {meta.writer ?? ''}
            {meta.techniques?.length ? ` · ${meta.techniques.join(', ')}` : ''}
          </div>
        )}
        {!rated && (
          <button className="fd-btn sm" onClick={() => onRate(pair.id, which, note)}>
            {which} is funnier
          </button>
        )}
      </div>
    )
  }
  return (
    <div className="fd-card" style={{ display: 'grid', gap: 12 }}>
      <p className="fd-situation" style={{ margin: 0 }}>
        <span className="fd-faint">{pair.story_id} · </span>
        {pair.story}
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {side('left')}
        {side('right')}
      </div>
      {!rated ? (
        <div className="fd-row" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="fd-input"
            style={{ flex: '1 1 240px' }}
            placeholder="note (optional): what was off, or your rewrite"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={400}
          />
          <button className="fd-btn ghost sm" onClick={() => onRate(pair.id, 'neither', note)}>
            neither is funny
          </button>
        </div>
      ) : (
        <p className="fd-muted" style={{ margin: 0 }}>
          verdict: {pair.verdict}
          {pair.note ? ` · ${pair.note}` : ''}
        </p>
      )}
    </div>
  )
}
