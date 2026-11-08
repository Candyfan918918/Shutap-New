import { pageMeta } from '@/lib/seo/page-meta'
// Bit lab: an admin-only bench for the bit engine. Write a bit from any
// story (or the three samples at once), see every candidate the judge
// ranked, what the rules threw out and why, and how long each stage took.
// Lab runs are not charged to the daily five.
import { createFileRoute, notFound } from '@tanstack/react-router'
import { useState } from 'react'
import { amIAdmin } from '@/lib/admin.functions'
import { labWriteBit, varyBit } from '@/lib/bits.functions'
import { saveBitDemo, type DemoFunnier } from '@/lib/bits/demo.functions'
import { EMPTY_LINES, LinedBox, missingSlots } from '@/pages/home/bit/LinedBox'
import type { Draft } from '@/pages/home/bit/EditableBit'
import type { Slot } from '@/lib/bits/shared'
import '@/pages/home/bit/bit.css'
import { AUDIENCES, LENGTHS, VOICES, type BitControls, type BitDraft, type BitVersion, type VaryKind } from '@/lib/bits/shared'
import '@/components/feed/feed.css'

export const Route = createFileRoute('/bit-lab')({
  ssr: false,
  head: () => ({ meta: [...pageMeta("Bit lab — Shutap", "Review candidate comedy bits, writing checks and timing in the private bit-engine lab.", "/bit-lab"), { name: 'robots', content: 'noindex' }] }),
  beforeLoad: async () => {
    try {
      if (!(await amIAdmin())) throw notFound()
    } catch {
      throw notFound()
    }
  },
  // Session replay hides all text on this page.
  component: () => (
    <div data-ph-private style={{ display: 'contents' }}>
      <BitLab />
    </div>
  ),
})

const SAMPLES = [
  "My roommate's girlfriend has been staying with us since June. She's never paid rent. Last night at 11pm she knocked on my door and asked me to keep it down.",
  'My manager booked a 30-minute meeting to discuss why we have too many meetings. At the end of it he said we should circle back, and sent a calendar invite for the follow-up while we were still in the room.',
  "My coworker Dave microwaves salmon at 9am every day in the shared kitchen. When I mentioned the smell he said \"it's brain food\" and did it again the next morning, with the door open.",
]

type LabResult = Awaited<ReturnType<typeof labWriteBit>>

function BitLab() {
  const [story, setStory] = useState('')
  const [controls, setControls] = useState<BitControls>({ audience: 'social', voice: 'deadpan', length: '30s', heat: 3 })
  const [runs, setRuns] = useState<{ story: string; busy: boolean; result?: LabResult; error?: string }[]>([])

  async function run(stories: string[]) {
    const start = runs.length
    setRuns((r) => [...r, ...stories.map((s) => ({ story: s, busy: true }))])
    await Promise.all(
      stories.map(async (s, i) => {
        try {
          const result = await labWriteBit({ data: { story: s, controls } })
          setRuns((r) => r.map((x, j) => (j === start + i ? { ...x, busy: false, result } : x)))
        } catch (e) {
          const error = e instanceof Error ? e.message : 'failed'
          setRuns((r) => r.map((x, j) => (j === start + i ? { ...x, busy: false, error } : x)))
        }
      }),
    )
  }

  const chip = <K extends keyof BitControls>(key: K, value: BitControls[K]) => (
    <button
      key={String(value)}
      type="button"
      className="fd-chip"
      aria-pressed={controls[key] === value}
      onClick={() => setControls((c) => ({ ...c, [key]: value }))}
    >
      {String(value)}
    </button>
  )

  return (
    <div className="fd">
      <div className="fd-col" style={{ maxWidth: 760 }}>
        <h1 className="fd-h1">Bit lab</h1>
        <p className="fd-muted" style={{ margin: 0 }}>
          Admin only. Runs the real pipeline (scrub, guard, premises, four bits, judge) without charging the daily five.
        </p>
        <p style={{ margin: 0, fontWeight: 700 }}>
          To rate jokes: <a href="/bit-daily">daily humor training</a> (every day) · <a href="/bit-eval">blind eval</a> (to measure)
        </p>

        <label htmlFor="lab-story" className="fd-faint" style={{ fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' }}>
          story
        </label>
        <textarea id="lab-story" className="fd-input" rows={5} value={story} onChange={(e) => setStory(e.target.value)} />

        <div style={{ display: 'grid', gap: 8 }}>
          <div className="fd-chips" style={{ flexWrap: 'wrap' }}>{AUDIENCES.map((a) => chip('audience', a))}</div>
          <div className="fd-chips" style={{ flexWrap: 'wrap' }}>{VOICES.map((v) => chip('voice', v))}</div>
          <div className="fd-chips" style={{ flexWrap: 'wrap' }}>
            {LENGTHS.map((l) => chip('length', l))}
            <span style={{ width: 10 }} />
            {([1, 2, 3, 4, 5] as const).map((h) => chip('heat', h))}
          </div>
        </div>

        <div className="fd-row" style={{ flexWrap: 'wrap' }}>
          <button className="fd-btn" disabled={!story.trim()} onClick={() => run([story.trim()])}>
            make it funnier
          </button>
          <button className="fd-btn ghost" onClick={() => run(SAMPLES)}>
            run the 3 samples
          </button>
          {runs.length > 0 && (
            <button className="fd-btn ghost sm" onClick={() => setRuns([])}>
              clear
            </button>
          )}
        </div>

        <DemoMaker controls={controls} />

        {runs
          .map((r, i) => ({ r, i }))
          .reverse()
          .map(({ r, i }) => (
            <RunCard key={i} story={r.story} busy={r.busy} result={r.result} error={r.error} />
          ))}
      </div>
    </div>
  )
}

function Slots({ b, heat }: { b: BitDraft; heat?: number }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--wine)', letterSpacing: '-.03em' }}>{b.hook}</div>
      <p className="fd-situation" style={{ color: 'var(--ink)', fontFamily: 'var(--news)', fontSize: 17 }}>{b.setup}</p>
      {b.tags.map((t, i) => (
        <p key={i} style={{ margin: 0, fontFamily: 'var(--news)', fontSize: 17 }}>
          <span className="fd-faint">tag {i + 1} · </span>
          {t}
        </p>
      ))}
      <p style={{ margin: 0, fontFamily: 'var(--news)', fontSize: 17, fontWeight: 500 }}>
        <span className="fd-faint">button · </span>
        {b.button}
      </p>
      {b.why && <p className="fd-muted" style={{ margin: 0, fontStyle: 'italic' }}>{b.why}{heat ? ` · heat ${heat}` : ''}</p>}
    </div>
  )
}

function RunCard({ story, busy, result, error }: { story: string; busy: boolean; result?: LabResult; error?: string }) {
  const [versions, setVersions] = useState<BitVersion[]>([])
  const [varying, setVarying] = useState<VaryKind | null>(null)
  const ok = result && result.status === 'ok' ? result : null

  async function vary(kind: VaryKind) {
    if (!ok) return
    setVarying(kind)
    try {
      const r = await varyBit({ data: { bit_id: ok.bit.id, kind } })
      if (r.ok) setVersions((v) => [...v, r.version])
    } finally {
      setVarying(null)
    }
  }

  return (
    <article className="fd-post" style={{ gap: 14 }}>
      <p className="fd-situation">{story}</p>
      {busy && <p className="fd-muted" style={{ margin: 0 }}>writing…</p>}
      {error && <p style={{ margin: 0, color: 'var(--rose-ink)' }}>error: {error}</p>}
      {result && result.status !== 'ok' && <p style={{ margin: 0, color: 'var(--rose-ink)' }}>status: {result.status}</p>}
      {ok && ok.lab && (
        <>
          <div className="fd-faint">
            {(ok.ms / 1000).toFixed(1)}s total · scrub {ok.lab.timings.scrub_ms}ms · guard {ok.lab.timings.guard_ms}ms · premises{' '}
            {ok.lab.timings.premises_ms}ms · write {ok.lab.timings.write_ms}ms · judge {ok.lab.timings.judge_ms}ms
          </div>
          {ok.notice && <div className="fd-muted">scrubber: {ok.notice}</div>}
          <Slots b={ok.lab.ranked[0]!} />
          {ok.lab.judge_why && <div className="fd-muted">judge: {ok.lab.judge_why}</div>}

          <div className="fd-row" style={{ flexWrap: 'wrap' }}>
            {(['hotter', 'tighter', 'storytelling'] as const).map((k) => (
              <button key={k} className="fd-btn ghost sm" disabled={!!varying} onClick={() => vary(k)}>
                {varying === k ? '…' : k}
              </button>
            ))}
          </div>
          {versions.map((v) => (
            <div key={v.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <div className="fd-faint" style={{ marginBottom: 6 }}>{v.kind} · ~{v.est_seconds}s</div>
              <Slots b={v} heat={v.heat} />
            </div>
          ))}

          <details>
            <summary className="fd-muted" style={{ cursor: 'pointer' }}>
              other candidates ({ok.lab.ranked.length - 1}), rejected ({ok.lab.rejected.length}), premises
            </summary>
            <div style={{ display: 'grid', gap: 14, marginTop: 10 }}>
              {ok.lab.ranked.slice(1).map((b, i) => (
                <div key={i} style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                  <div className="fd-faint">rank {i + 2}</div>
                  <Slots b={b} />
                </div>
              ))}
              {ok.lab.rejected.map((r, i) => (
                <div key={i} className="fd-muted">
                  rejected “{r.hook}”: {r.rule}
                </div>
              ))}
              <ol className="fd-muted" style={{ margin: 0, paddingLeft: 18 }}>
                {ok.lab.premises.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
              <div className="fd-faint">
                crowd-work angles: {ok.bit.crowd_work.join(' / ') || 'none'} · writer {ok.lab.writer_model} · judge {ok.lab.judge_model}
              </div>
            </div>
          </details>
        </>
      )}
    </article>
  )
}

/** The /bits demo (Nov 8 2026): type five lines in-house, the way a visitor
 *  would, use funnier where it helps, then make it the demo. /bits shows the
 *  newest one, with the lines that used funnier marked. */
function DemoMaker({ controls }: { controls: BitControls }) {
  const [lines, setLines] = useState<Draft>(EMPTY_LINES)
  const [locked, setLocked] = useState<Slot[]>([])
  const [funnier, setFunnier] = useState<DemoFunnier[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  async function make(lines: Draft) {
    if (missingSlots(lines).length) return
    setBusy(true); setMsg('')
    try {
      // keep only the funnier picks still on the line as it stands
      const now = (s: Slot) => (s === 'tag0' ? lines.tags[0] : s === 'tag1' ? lines.tags[1] : (lines as unknown as Record<string, string>)[s])
      const kept = funnier.filter((f) => now(f.slot)?.trim() === f.picked.trim())
      const r = await saveBitDemo({ data: { lines: { hook: lines.hook, setup: lines.setup, tags: [lines.tags[0] ?? '', lines.tags[1] ?? ''], button: lines.button }, funnier: kept, controls } })
      setMsg(r.ok ? 'Saved. shutap.com/bits shows it now (sketch and skit written).' : `Not saved: ${r.error}`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'failed')
    } finally { setBusy(false) }
  }
  return (
    <section className="fd-card" style={{ display: 'grid', gap: 10 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>The /bits demo</h2>
      <p className="fd-muted" style={{ margin: 0 }}>Type the five lines in-house, the way a visitor would. Tap funnier on a line where it helps and pick one; those lines show as “funnier · picked” on /bits, the rest as their words. Then make it the demo.</p>
      <div className="bt bt-bare"><div className="bt-box">
        <LinedBox tier="pro" controls={controls} lines={lines} onLines={setLines} locked={locked} onLocked={setLocked} busy={busy} onMake={(l) => void make(l)} box="lab"
          onLimit={() => setMsg('funnier limit reached')} onCrisis={() => setMsg('the crisis check stopped this line')} say={setMsg}
          onPicked={(slot, typed, picked, move) => setFunnier((f) => [...f.filter((x) => x.slot !== slot), { slot: slot as DemoFunnier['slot'], typed: f.find((x) => x.slot === slot)?.typed ?? typed, picked, move }])} />
      </div></div>
      {msg && <p style={{ margin: 0, fontWeight: 700 }}>{msg}</p>}
    </section>
  )
}
