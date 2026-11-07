/* The sample kit on /realtors (Nov 6 2026): the six outputs of one real
 * kit, read-only, so an agent sees exactly what they get before pasting a
 * link. Same tabs and rows as the kit page, no buttons. */
import { useState } from 'react'
import { OUTPUT_LABEL, OUTPUTS, TONE_LABEL, listingFacts, type Output } from '@/lib/realtors/listing'
import { SAMPLE_CONTROLS, SAMPLE_KIT, SAMPLE_LISTING } from '@/lib/realtors/sample-kit'
import { trackEvent } from '@/lib/tracking'

export function SampleKit() {
  const [tab, setTab] = useState<Output>('walkthrough')
  const k = SAMPLE_KIT
  return (
    <section className="rl-card rl-demo-kit" aria-label="A sample kit">
      <div className="rl-row" style={{ justifyContent: 'space-between' }}>
        <div>
          <span className="rl-lbl r">a real kit · {TONE_LABEL[SAMPLE_CONTROLS.tone]}</span>
          <h2 style={{ margin: '2px 0 0', font: '800 22px var(--sora)', color: 'var(--wine)', letterSpacing: '-0.03em' }}>A {SAMPLE_LISTING.beds}-bed in {SAMPLE_LISTING.city}</h2>
        </div>
        <span className="rl-note">written by Shutap from the listing page · rated by the Lab · nothing added · address and price hidden here</span>
      </div>
      <div className="rl-facts">{listingFacts(SAMPLE_LISTING).map((f) => <span key={f} className="rl-fact">{f}</span>)}</div>
      <div className="rl-tabs" role="tablist">
        {OUTPUTS.map((o) => <button key={o} role="tab" className="rl-tab" aria-selected={tab === o} onClick={() => { setTab(o); void trackEvent('sample_kit_tab', { product: 'realtors', output: o }) }}>{OUTPUT_LABEL[o]}</button>)}
      </div>
      <div className="rl-demo-body">
      {tab === 'walkthrough' && (
        <div>
          <p className="rl-note">{k.walkthrough.shots.length} shots · one take on a phone · say the line, then move</p>
          {k.walkthrough.shots.map((s, i) => (
            <div key={i} className="rl-item" style={{ gridTemplateColumns: '26px 1fr' }}>
              <span className="n">{i + 1}</span>
              <div><div className="meta">{s.where} · {s.seconds}s</div><p className="rl-line sm" style={{ color: 'var(--ink-2)' }}>{s.action}</p><p className="rl-line">“{s.line}”</p></div>
            </div>
          ))}
          <p className="rl-note" style={{ marginTop: 8 }}><b>15s cut:</b> shots {k.walkthrough.cut15} · <b>60s cut:</b> {k.walkthrough.cut60}</p>
        </div>
      )}
      {tab === 'voiceover' && <div><p className="rl-note">read it on camera, or paste it into text-to-voice</p>{k.voiceover.map((v, i) => <div key={i} className="rl-item" style={{ gridTemplateColumns: '26px 1fr' }}><span className="n">{i + 1}</span><div><div className="meta">{v.label}</div><p className="rl-line">{v.text}</p></div></div>)}</div>}
      {tab === 'hooks' && <div><p className="rl-note">the first two seconds, on screen and spoken</p>{k.hooks.map((h, i) => <div key={i} className="rl-item" style={{ gridTemplateColumns: '26px 1fr' }}><span className="n">{i + 1}</span><div><p className="rl-line">{h.line}</p><div className="meta" style={{ marginTop: 4 }}>{h.move}</div></div></div>)}</div>}
      {(tab === 'open_house' || tab === 'posts') && <div>{(tab === 'posts' ? k.posts : k.open_house).map((x, i) => <div key={i} className="rl-item" style={{ gridTemplateColumns: '26px 1fr' }}><span className="n">{i + 1}</span><div><div className="meta">{x.label}</div><p className="rl-line sm">{x.text}</p></div></div>)}</div>}
      {tab === 'straight' && <div><p className="rl-note">the MLS-ready description, no jokes, so the kit is complete</p><p className="rl-line sm">{k.straight}</p></div>}
      </div>
      <div className="rl-row" style={{ justifyContent: 'space-between' }}>
        <span className="rl-note">on your kit every line is editable, “funnier” rewrites one line, and copy, PDF and shoot mode sit under it</span>
        <button type="button" className="rl-btn" onClick={() => { void trackEvent('seo_cta_clicked', { page: 'realtors', product: 'realtors', kind: 'sample_kit' }); window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => (document.querySelector('.rl-box input, .rl-box textarea') as HTMLElement | null)?.focus(), 400) }}>paste your listing ↑</button>
      </div>
    </section>
  )
}
