import { pageMeta } from '@/lib/seo/page-meta'
// Skit lab (Nov 21 2026): the admin bench for Shutap for small business.
// Type a shop and what happened today, see every candidate set of three
// skits and what the checks flagged, rate the run pick / cut / rewrite.
// Nothing here is counted or shown to anyone else; the product stays dark
// until the skits are good enough.
import { createFileRoute, notFound } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { amIAdmin } from '@/lib/admin.functions'
import { labSkitEvals, labWriteSkits, rateLabSkits } from '@/lib/shops.functions'
import { BUSINESS_TYPES, CAMERAS, COUNTRIES, LENGTHS, OFFERS, VOICES, type BusinessType, type Camera, type Country, type Length, type Offer, type Voice } from '@/lib/shops/shop'
import { SOURCE_LABEL, skitLines } from '@/lib/shops/skit'
import '@/components/feed/feed.css'

export const Route = createFileRoute('/skit-lab')({
  ssr: false,
  head: () => ({ meta: [...pageMeta('Skit lab — Shutap', 'Private bench for the small-business skit writer.', '/skit-lab'), { name: 'robots', content: 'noindex' }] }),
  beforeLoad: async () => {
    try {
      if (!(await amIAdmin())) throw notFound()
    } catch {
      throw notFound()
    }
  },
  component: () => (
    <div data-ph-private style={{ display: 'contents' }}>
      <SkitLab />
    </div>
  ),
})

type Shop = { name: string; city: string; country: Country; business_type: BusinessType; known_for: string; voice: Voice; length: Length; camera: Camera; offer: Offer; offer_text: string }
type Ask = { day: string; promote: string; idea: string; topics: string }
type Result = Awaited<ReturnType<typeof labWriteSkits>>
type Run = { shop: Shop; ask: Ask; busy: boolean; result?: Result; error?: string; rated?: string; notes: string; saved?: 'saving' | 'saved' | 'failed' }

/** Three invented shops to start from. Change anything. */
const SAMPLES: { label: string; shop: Shop; ask: Ask }[] = [
  {
    label: 'café',
    shop: { name: 'Little Fern Coffee', city: 'Menlo Park', country: 'us', business_type: 'cafe', known_for: 'the Saturday line, lavender honey latte, laptop campers, the shop dog, tiny patio', voice: 'dry', length: 15, camera: 'team', offer: 'freebie', offer_text: 'a free cookie' },
    ask: { day: 'A guy sat here four hours with one small drip coffee', promote: '', idea: '', topics: '' },
  },
  {
    label: 'salon',
    shop: { name: 'Velvet Room Salon', city: 'Menlo Park', country: 'us', business_type: 'salon', known_for: '“just a trim”, the inspiration photo, box dye confessions, running ten minutes behind', voice: 'sassy', length: 15, camera: 'me', offer: 'none', offer_text: '' },
    ask: { day: 'She said just a trim and then showed me a photo of a pixie cut', promote: '', idea: '', topics: '' },
  },
  {
    label: 'car shop',
    shop: { name: 'Redwood Auto Care', city: 'Redwood City', country: 'us', business_type: 'auto', known_for: 'the noise that stops at the shop, check engine lights, oil changes, the waiting room coffee', voice: 'warm', length: 30, camera: 'faceless', offer: 'promotion', offer_text: '10% off an oil change' },
    ask: { day: 'The car made the noise all week and went silent the second it rolled in', promote: '', idea: '', topics: '' },
  },
]

const INPUT = { height: 38, borderRadius: 999, border: '1px solid #e9d3dc', padding: '0 14px', font: 'inherit', width: '100%', boxSizing: 'border-box' } as const
const LABEL = { fontSize: 13, fontWeight: 700 } as const
const list = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean)

function SkitLab() {
  const [shop, setShop] = useState<Shop>(SAMPLES[0]!.shop)
  const [ask, setAsk] = useState<Ask>(SAMPLES[0]!.ask)
  const [runs, setRuns] = useState<Run[]>([])
  const [ledger, setLedger] = useState<Awaited<ReturnType<typeof labSkitEvals>> | null>(null)

  useEffect(() => { labSkitEvals({ data: {} }).then(setLedger).catch(() => {}) }, [runs.length])

  async function write() {
    const run: Run = { shop: { ...shop }, ask: { ...ask }, busy: true, notes: '' }
    setRuns((r) => [run, ...r])
    try {
      const result = await labWriteSkits({ data: { shop: { ...shop, known_for: list(shop.known_for).slice(0, 12).map((k) => k.slice(0, 40)) }, ask: { day: ask.day, promote: ask.promote, idea: ask.idea, topics: list(ask.topics).slice(0, 6) } } })
      setRuns((r) => r.map((x) => (x === run ? { ...x, busy: false, result } : x)))
    } catch (e) {
      setRuns((r) => r.map((x) => (x === run ? { ...x, busy: false, error: e instanceof Error ? e.message : 'failed' } : x)))
    }
  }

  async function rate(i: number, rating: 'pick' | 'cut' | 'rewrite') {
    const run = runs[i]
    const id = run?.result && run.result.ok ? run.result.eval_id : null
    if (!run || !id) return
    setRuns((r) => r.map((x, j) => (j === i ? { ...x, rated: rating, saved: 'saving' } : x)))
    try {
      const res = await rateLabSkits({ data: { eval_id: id, rating, notes: run.notes || undefined } })
      setRuns((r) => r.map((x, j) => (j === i ? { ...x, saved: res.ok ? 'saved' : 'failed' } : x)))
      if (res.ok) labSkitEvals({ data: {} }).then(setLedger).catch(() => {})
    } catch {
      setRuns((r) => r.map((x, j) => (j === i ? { ...x, saved: 'failed' } : x)))
    }
  }

  const pick = <T extends string | number>(label: string, value: T, options: readonly { key: T; name: string }[], set: (v: T) => void) => (
    <div>
      <label style={LABEL}>{label}</label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
        {options.map((o) => <button key={String(o.key)} type="button" className="fd-chip" aria-pressed={o.key === value} onClick={() => set(o.key)}>{o.name}</button>)}
      </div>
    </div>
  )

  return (
    <div className="fd">
      <div className="fd-col" style={{ maxWidth: 900 }}>
        <h1 className="fd-h1">Skit lab</h1>
        <p className="fd-muted" style={{ margin: 0 }}>
          Admin only. Shutap for small business, before anyone sees it: type a shop and what happened today, write the three skits, rate the run. Runs the real writer (two models and the checks); nothing is counted. Use invented shops or your own, never a customer’s.
        </p>
        {ledger && (
          <p style={{ margin: 0, fontSize: 13 }}>
            <b>{ledger.total}</b> runs so far · pick {ledger.pick} · cut {ledger.cut} · rewrite {ledger.rewrite} · unrated {ledger.unrated}
            {Object.entries(ledger.by_version).map(([v, n]) => <span key={v} style={{ marginLeft: 10, color: '#8f898d' }}>{v}: {n.pick}/{n.pick + n.cut + n.rewrite} picked</span>)}
          </p>
        )}

        <section className="fd-post" style={{ gap: 12 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={LABEL}>start from</span>
            {SAMPLES.map((s) => <button key={s.label} type="button" className="fd-chip" onClick={() => { setShop(s.shop); setAsk(s.ask) }}>{s.label}</button>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div><label style={LABEL}>shop name</label><input style={INPUT} value={shop.name} onChange={(e) => setShop({ ...shop, name: e.target.value })} /></div>
            <div><label style={LABEL}>city</label><input style={INPUT} value={shop.city} onChange={(e) => setShop({ ...shop, city: e.target.value })} /></div>
          </div>
          {pick('business type', shop.business_type, BUSINESS_TYPES, (v) => setShop({ ...shop, business_type: v }))}
          {pick('country', shop.country, COUNTRIES, (v) => setShop({ ...shop, country: v }))}
          <div><label style={LABEL}>known for (comma-separated, 40 characters each)</label><input style={INPUT} value={shop.known_for} onChange={(e) => setShop({ ...shop, known_for: e.target.value })} /></div>
          {pick('kind of funny', shop.voice, VOICES, (v) => setShop({ ...shop, voice: v }))}
          {pick('length', shop.length, LENGTHS.map((l) => ({ key: l, name: `${l} sec` })), (v) => setShop({ ...shop, length: v }))}
          {pick('who’s on camera', shop.camera, CAMERAS, (v) => setShop({ ...shop, camera: v }))}
          {pick('code word', shop.offer, OFFERS, (v) => setShop({ ...shop, offer: v }))}
          {shop.offer !== 'none' && <div><label style={LABEL}>{shop.offer === 'promotion' ? 'the promotion' : 'the freebie'}</label><input style={INPUT} value={shop.offer_text} onChange={(e) => setShop({ ...shop, offer_text: e.target.value })} /></div>}
          <div><label style={LABEL}>anything fun happen today? (empty = “Surprise me”)</label><textarea rows={2} value={ask.day} onChange={(e) => setAsk({ ...ask, day: e.target.value })} style={{ borderRadius: 12, border: '1px solid #e9d3dc', padding: 10, font: 'inherit', width: '100%', boxSizing: 'border-box' }} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div><label style={LABEL}>promoting today (optional)</label><input style={INPUT} value={ask.promote} onChange={(e) => setAsk({ ...ask, promote: e.target.value })} placeholder="Croissants, fresh at 7" /></div>
            <div><label style={LABEL}>idea tapped (optional)</label><input style={INPUT} value={ask.idea} onChange={(e) => setAsk({ ...ask, idea: e.target.value })} placeholder="Thanksgiving pies" /></div>
          </div>
          <div><label style={LABEL}>today’s topics: news, politics, trends (optional, comma-separated)</label><input style={INPUT} value={ask.topics} onChange={(e) => setAsk({ ...ask, topics: e.target.value })} placeholder="the big game on Sunday, the first frost" /></div>
          <div><button type="button" className="fd-chip" aria-pressed disabled={shop.name.trim().length < 2 || !shop.city.trim()} onClick={() => void write()}>write the three skits</button></div>
        </section>

        {runs.map((run, i) => (
          <section key={i} className="fd-post" style={{ gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13 }}>
              <b>{run.shop.name}</b> · {run.shop.business_type} · {run.shop.voice} · {run.shop.length}s · {run.shop.camera} · {run.shop.offer}
              {run.ask.day ? <> · “{run.ask.day}”</> : <> · surprise me</>}
            </p>
            {run.busy && <p className="fd-muted" style={{ margin: 0 }}>writing… (up to a minute)</p>}
            {run.error && <p style={{ margin: 0, color: '#b3261e' }}>{run.error}</p>}
            {run.result && !run.result.ok && <p style={{ margin: 0, color: '#b3261e' }}>No set passed the checks. An owner would see “try again”. The rejected sets are below.</p>}
            {run.result && run.result.candidates.map((c, ci) => {
              const won = run.result!.ok && run.result!.winner === ci
              return (
                <div key={ci} style={{ border: won ? '2px solid #c2185b' : '1px solid #e9d3dc', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 12.5, color: '#8f898d' }}>
                    {won ? <b style={{ color: '#c2185b' }}>what the owner would see · </b> : null}{c.model} · {(c.ms / 1000).toFixed(1)}s · {c.checks.length ? `${c.checks.length} rule${c.checks.length === 1 ? '' : 's'} broken` : 'passed every check'}
                  </p>
                  {c.checks.map((k, ki) => <p key={ki} style={{ margin: 0, fontSize: 12.5, color: '#b3261e' }}>✕ {k.where}: {k.rule}{k.line ? ` — “${k.line}”` : ''}</p>)}
                  {c.skits.map((s, si) => (
                    <div key={si} style={{ background: '#fdf6f8', borderRadius: 12, padding: 10 }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: '#c2185b' }}>{SOURCE_LABEL[s.source]}</p>
                      <p style={{ margin: '2px 0 0', fontWeight: 700 }}>{s.title}</p>
                      <p style={{ margin: '2px 0 8px', fontSize: 13, color: '#4e4549' }}>{s.pitch}</p>
                      {skitLines(s, run.shop.offer, run.shop.offer_text).map((l) => <p key={l.key} style={{ margin: '2px 0', fontSize: 14 }}><span style={{ color: '#8f898d', fontSize: 12 }}>{l.label}: </span>{l.text}</p>)}
                      <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#4e4549' }}>{s.shots.map((sh, k) => <span key={k} style={{ display: 'block' }}>film {k + 1}: {sh.action}</span>)}</p>
                      <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#8f898d' }}>caption: {s.caption}</p>
                    </div>
                  ))}
                </div>
              )
            })}
            {run.result?.ok && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <input style={{ ...INPUT, flex: '1 1 260px', width: 'auto' }} placeholder="notes: what was good, what was off" value={run.notes} onChange={(e) => setRuns((r) => r.map((x, j) => (j === i ? { ...x, notes: e.target.value } : x)))} />
                {(['pick', 'cut', 'rewrite'] as const).map((r) => <button key={r} type="button" className="fd-chip" aria-pressed={run.rated === r} disabled={!run.result || !run.result.ok || !run.result.eval_id} onClick={() => void rate(i, r)}>{r}</button>)}
                <span className="fd-muted" style={{ fontSize: 12.5 }}>{run.saved === 'saving' ? 'saving…' : run.saved === 'saved' ? 'saved' : run.saved === 'failed' ? 'not saved' : !run.result.eval_id ? 'ratings table not set up yet' : ''}</span>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
