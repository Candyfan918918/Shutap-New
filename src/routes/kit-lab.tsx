import { pageMeta } from '@/lib/seo/page-meta'
// Kit lab (Nov 5 2026): the admin bench for Shutap for Realtors. Paste a
// listing link or text, pick a tone, see every candidate kit the judge
// ranked and what the checks flagged, rate it pick / cut / rewrite. Nothing
// here is charged or shown to anyone else; the product stays dark until the
// kits are good enough.
import { createFileRoute, notFound } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { amIAdmin } from '@/lib/admin.functions'
import { labKitEvals, labWriteKit, rateLabKit, readListing } from '@/lib/realtors.functions'
import { DEFAULT_LISTING_CONTROLS, OUTPUT_LABEL, OUTPUTS, TONES, TONE_LABEL, listingFacts, type Kit, type Listing, type ListingControls, type Output } from '@/lib/realtors/listing'
import '@/components/feed/feed.css'

export const Route = createFileRoute('/kit-lab')({
  ssr: false,
  head: () => ({ meta: [...pageMeta('Kit lab — Shutap', 'Private bench for the realtor kit writer.', '/kit-lab'), { name: 'robots', content: 'noindex' }] }),
  beforeLoad: async () => {
    try {
      if (!(await amIAdmin())) throw notFound()
    } catch {
      throw notFound()
    }
  },
  component: () => (
    <div data-ph-private style={{ display: 'contents' }}>
      <KitLab />
    </div>
  ),
})

const SAMPLE = `4B Alder Court, San Mateo, CA 94401. $749,000. 2 bed 1 bath condo, 870 sq ft, built 1987. Original hardwood floors throughout, kitchen with a window over the sink, private balcony off the living room. HOA $410/month. Four-minute walk to Caltrain. Garage with EV charger. Open house Sunday 1-4.`

type Run = { listing: Listing; controls: ListingControls; busy: boolean; result?: Awaited<ReturnType<typeof labWriteKit>>; error?: string; rated?: string; saved?: 'saving' | 'saved' | 'failed'; tab: Output }

function KitLab() {
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [note, setNote] = useState('')
  const [listing, setListing] = useState<Listing | null>(null)
  const [how, setHow] = useState<string>('')
  const [seen, setSeen] = useState<string>('')
  const [reading, setReading] = useState(false)
  const [controls, setControls] = useState<ListingControls>({ ...DEFAULT_LISTING_CONTROLS, must_say: [], never_say: [] })
  const [must, setMust] = useState('')
  const [never, setNever] = useState('')
  const [runs, setRuns] = useState<Run[]>([])
  const [ledger, setLedger] = useState<Awaited<ReturnType<typeof labKitEvals>> | null>(null)

  useEffect(() => { labKitEvals({ data: {} }).then(setLedger).catch(() => {}) }, [runs.length])

  async function read() {
    setReading(true); setListing(null); setHow(''); setSeen('')
    try {
      const r = await readListing({ data: url.trim() ? { url: url.trim() } : { text } })
      setSeen(r.seen ?? '')
      if (!r.ok) {
        setHow(r.reason === 'blocked' ? `${r.host} refuses automated reads · paste the listing text instead` : r.reason === 'fetch_failed' ? `could not fetch ${r.host ?? 'that page'} · paste the text` : r.reason === 'nothing_found' ? 'no listing facts found on that page · paste the text' : r.reason === 'not_a_listing' ? 'that text has no price, beds or address' : r.reason)
        return
      }
      setListing({ ...r.listing, note })
      setHow(`read via ${r.how} from ${r.listing.source}`)
    } catch (e) {
      setHow(e instanceof Error ? e.message : 'failed')
    } finally {
      setReading(false)
    }
  }

  async function write(tones: ListingControls['tone'][]) {
    if (!listing) return
    const c: ListingControls = { ...controls, must_say: must.split(',').map((s) => s.trim()).filter(Boolean), never_say: never.split(',').map((s) => s.trim()).filter(Boolean) }
    const l = { ...listing, note }
    const start = runs.length
    setRuns((r) => [...r, ...tones.map((tone) => ({ listing: l, controls: { ...c, tone }, busy: true, tab: 'walkthrough' as Output }))])
    await Promise.all(
      tones.map(async (tone, i) => {
        try {
          const result = await labWriteKit({ data: { listing: l, controls: { ...c, tone } } })
          setRuns((r) => r.map((x, j) => (j === start + i ? { ...x, busy: false, result } : x)))
        } catch (e) {
          setRuns((r) => r.map((x, j) => (j === start + i ? { ...x, busy: false, error: e instanceof Error ? e.message : 'failed' } : x)))
        }
      }),
    )
  }

  async function rate(i: number, rating: 'pick' | 'cut' | 'rewrite') {
    const run = runs[i]
    if (!run?.result || !run.result.ok || !run.result.eval_id) return
    const evalId = run.result.eval_id
    // the tap shows at once; the save is confirmed (or not) after
    setRuns((r) => r.map((x, j) => (j === i ? { ...x, rated: rating, saved: 'saving' } : x)))
    try {
      const res = await rateLabKit({ data: { eval_id: evalId, rating } })
      setRuns((r) => r.map((x, j) => (j === i ? { ...x, saved: res.ok ? 'saved' : 'failed' } : x)))
      if (res.ok) labKitEvals({ data: {} }).then(setLedger).catch(() => {})
    } catch {
      setRuns((r) => r.map((x, j) => (j === i ? { ...x, saved: 'failed' } : x)))
    }
  }

  const toggle = (k: 'roast_house' | 'roast_neighborhood' | 'mention_price') => (
    <button type="button" className="fd-chip" aria-pressed={controls[k]} onClick={() => setControls((c) => ({ ...c, [k]: !c[k] }))}>
      {k.replace(/_/g, ' ')}: {controls[k] ? 'on' : 'off'}
    </button>
  )

  return (
    <div className="fd">
      <div className="fd-col" style={{ maxWidth: 900 }}>
        <h1 className="fd-h1">Kit lab</h1>
        <p className="fd-muted" style={{ margin: 0 }}>
          Admin only. Shutap for Realtors, before anyone sees it: paste a listing, write the kit in each tone, rate it. Runs the real writer (two models, the checks, the judge), nothing charged.
        </p>
        {ledger && (
          <p style={{ margin: 0, fontSize: 13 }}>
            <b>{ledger.total}</b> kits rated so far · pick {ledger.pick} · cut {ledger.cut} · rewrite {ledger.rewrite} · unrated {ledger.unrated}
            {Object.entries(ledger.by_version).map(([v, n]) => <span key={v} style={{ marginLeft: 10, color: '#8f898d' }}>{v}: {n.pick}/{n.pick + n.cut + n.rewrite} picked</span>)}
          </p>
        )}

        <section className="fd-post" style={{ gap: 10 }}>
          <label style={{ fontSize: 13, fontWeight: 700 }}>listing link</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… (a brokerage page works best; Zillow and Redfin usually refuse)" style={{ height: 40, borderRadius: 999, border: '1px solid #e9d3dc', padding: '0 14px' }} />
          <label style={{ fontSize: 13, fontWeight: 700 }}>or paste the listing text</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder={SAMPLE} style={{ borderRadius: 12, border: '1px solid #e9d3dc', padding: 10, font: 'inherit' }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="fd-chip" onClick={() => setText(SAMPLE)}>use the sample</button>
            <button className="fd-chip" aria-pressed disabled={reading || (!url.trim() && text.trim().length < 40)} onClick={() => void read()}>{reading ? 'reading…' : 'read the listing'}</button>
            <span className="fd-muted" style={{ fontSize: 13 }}>{how}</span>
          </div>
          {seen && <p className="fd-muted" style={{ margin: 0, fontSize: 12, wordBreak: 'break-word' }}>what the server saw: {seen}</p>}
        </section>

        {listing && (
          <section className="fd-post" style={{ gap: 10 }}>
            <b>read back</b>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{listingFacts(listing).map((f) => <span key={f} className="fd-chip" aria-pressed>{f}</span>)}</div>
            <p style={{ margin: 0, fontSize: 13, color: '#4e4549' }}>{listing.description.slice(0, 500)}{listing.description.length > 500 ? '…' : ''}</p>
            {listing.photos.length > 0 && <p className="fd-muted" style={{ margin: 0, fontSize: 12.5 }}>photos: {listing.photos.join(' · ')}</p>}
            <label style={{ fontSize: 13, fontWeight: 700 }}>the one thing about it (the agent's note)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="balcony fits exactly one chair; Caltrain is a 4-minute walk" style={{ height: 40, borderRadius: 999, border: '1px solid #e9d3dc', padding: '0 14px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><label style={{ fontSize: 13, fontWeight: 700 }}>must say (comma-separated)</label><input value={must} onChange={(e) => setMust(e.target.value)} placeholder="$749,000, open house Sunday 1–4, Compass" style={{ width: '100%', height: 36, borderRadius: 999, border: '1px solid #e9d3dc', padding: '0 12px', boxSizing: 'border-box' }} /></div>
              <div><label style={{ fontSize: 13, fontWeight: 700 }}>never say</label><input value={never} onChange={(e) => setNever(e.target.value)} placeholder="cozy, must see, starter home" style={{ width: '100%', height: 36, borderRadius: 999, border: '1px solid #e9d3dc', padding: '0 12px', boxSizing: 'border-box' }} /></div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{toggle('roast_house')}{toggle('roast_neighborhood')}{toggle('mention_price')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TONES.map((t) => <button key={t} className="fd-chip" onClick={() => void write([t])}>write · {TONE_LABEL[t]}</button>)}
              <button className="fd-chip" aria-pressed onClick={() => void write([...TONES])}>write all four tones</button>
            </div>
          </section>
        )}

        {runs.map((run, i) => (
          <section key={i} className="fd-post" style={{ gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <b>{run.listing.address ?? run.listing.source} · {TONE_LABEL[run.controls.tone]}</b>
              {run.busy ? <span className="fd-muted">writing… (two models, then the judge)</span> : run.error ? <span style={{ color: '#b3261e' }}>{run.error}</span> : run.result && !run.result.ok ? <span style={{ color: '#b3261e' }}>no kit passed the checks</span> : run.result?.ok ? <span className="fd-muted" style={{ fontSize: 12.5 }}>{Math.round(run.result.result.ms / 1000)}s · {run.result.prompt_version} · winner: {run.result.result.candidates[run.result.result.winner]?.model} · {run.result.result.why}</span> : null}
            </div>
            {run.result?.ok && run.result.result && (
              <>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {OUTPUTS.map((o) => <button key={o} className="fd-chip" aria-pressed={run.tab === o} onClick={() => setRuns((r) => r.map((x, j) => (j === i ? { ...x, tab: o } : x)))}>{OUTPUT_LABEL[o]}</button>)}
                </div>
                <KitView kit={run.result.result.kit} tab={run.tab} />
                {run.result.result.skipped.length > 0 && <p className="fd-muted" style={{ margin: 0, fontSize: 12.5 }}>skipped: {run.result.result.skipped.map((s) => `${s.where} — ${s.what}`).join(' · ')}</p>}
                <details>
                  <summary style={{ fontSize: 13, cursor: 'pointer' }}>candidates and checks</summary>
                  {run.result.result.candidates.map((c, k) => (
                    <p key={k} style={{ margin: '4px 0', fontSize: 12.5 }}>
                      <b>{run.result?.ok && k === run.result.result.winner ? '★ ' : ''}{c.model}</b> · {Math.round(c.ms / 1000)}s · {c.checks.length ? c.checks.map((f) => `${f.rule} (${f.where})`).join(' · ') : 'all checks passed'}
                    </p>
                  ))}
                </details>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>rate this {TONE_LABEL[run.controls.tone]} kit on its own:</span>
                  {(['pick', 'cut', 'rewrite'] as const).map((r) => (
                    <button key={r} type="button" className="fd-chip" aria-pressed={run.rated === r} disabled={run.saved === 'saving'} onClick={() => void rate(i, r)} style={run.rated === r ? { background: '#c1216b', color: '#fff', borderColor: '#c1216b' } : undefined}>
                      {run.rated === r ? '✓ ' : ''}{r}
                    </button>
                  ))}
                  {run.saved === 'saving' && <span className="fd-muted" style={{ fontSize: 12.5 }}>saving…</span>}
                  {run.saved === 'saved' && <span style={{ fontSize: 12.5, color: '#2e8b57', fontWeight: 700 }}>saved</span>}
                  {run.saved === 'failed' && <span style={{ fontSize: 12.5, color: '#b00020', fontWeight: 700 }}>not saved · tap again</span>}
                  {!run.result.eval_id && <span className="fd-muted" style={{ fontSize: 12.5 }}>not stored (run the realtors migration to rate)</span>}
                </div>
                <p className="fd-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>pick = a realtor could post it as-is · rewrite = right idea, you'd change lines · cut = wrong tone, wrong facts or unusable. Judge it against its own tone, not the other kits.</p>
              </>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

function KitView({ kit, tab }: { kit: Kit; tab: Output }) {
  const serif = { fontFamily: 'Newsreader, Georgia, serif', fontSize: 16, lineHeight: 1.45, margin: 0 } as const
  if (tab === 'walkthrough')
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        {kit.walkthrough.shots.map((s, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 60px', gap: 8, borderBottom: '1px solid #f0d6e0', paddingBottom: 8 }}>
            <b style={{ color: '#c1216b' }}>{i + 1}</b>
            <div><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8f898d' }}>{s.where}</div><div style={{ fontSize: 13, color: '#6b6260' }}>{s.action}</div><p style={serif}>"{s.line}"</p>{s.fact && <div style={{ fontSize: 11.5, color: '#8f898d' }}>on: {s.fact}</div>}</div>
            <span style={{ fontSize: 12, color: '#8f898d', textAlign: 'right' }}>{s.seconds}</span>
          </div>
        ))}
        <p className="fd-muted" style={{ margin: 0, fontSize: 12.5 }}>15s cut: {kit.walkthrough.cut15} · 60s: {kit.walkthrough.cut60}</p>
      </div>
    )
  if (tab === 'hooks') return <div style={{ display: 'grid', gap: 8 }}>{kit.hooks.map((h, i) => <div key={i}><p style={serif}>"{h.line}"</p><div style={{ fontSize: 11.5, color: '#8f898d' }}>{h.move}</div></div>)}</div>
  if (tab === 'straight') return <p style={serif}>{kit.straight}</p>
  const rows = tab === 'voiceover' ? kit.voiceover : tab === 'open_house' ? kit.open_house : kit.posts
  return <div style={{ display: 'grid', gap: 8 }}>{rows.map((r, i) => <div key={i}><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8f898d' }}>{r.label}</div><p style={serif}>{r.text}</p></div>)}</div>
}
