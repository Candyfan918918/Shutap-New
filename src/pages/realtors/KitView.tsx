/* The kit on the page (Nov 6 2026): six tabs, every line editable by typing,
 * copy per output, the voiceover as .txt, the whole kit as one Letter PDF,
 * and the shoot-mode link + QR for the phone. Every copy and download goes
 * through chargeKitDownload first; the number left shows after each. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { chargeKitDownload, keepKitEdit, touchKitLine, type KitDownloadKind, type KitUsage, type KitView as KitData } from '@/lib/realtors.functions'
import { KIT_ONCE, usd } from '@/lib/pricing'
import { OUTPUT_LABEL, OUTPUTS, TONE_LABEL, listingFacts, type Kit, type Output } from '@/lib/realtors/listing'
import { copyText, fileStem, kitTitle, voiceoverTxt } from '@/lib/realtors/kit-text'
import { trackEvent } from '@/lib/tracking'
import { phCapture } from '@/lib/posthog'

type Props = {
  data: KitData
  usage: KitUsage
  onUsage: (u: KitUsage) => void
  onLimit: () => void
  onRewrite: () => void
  /** open the one-kit checkout */
  onBuy: () => void
  onTouchLimit: () => void
  say: (m: string) => void
}

const track = (name: string, props: Record<string, unknown>) => {
  void phCapture(name, { product: 'realtors', ...props })
  void trackEvent(name, { product: 'realtors', ...props })
}

/** the lines around the one being touched, so the writer keeps the thread */
function outputContext(kit: Kit, o: Output): string {
  switch (o) {
    case 'walkthrough': return kit.walkthrough.shots.map((s, i) => `${i + 1}. ${s.where}: "${s.line}"`).join('\n')
    case 'voiceover': return kit.voiceover.map((v) => v.text).join('\n')
    case 'hooks': return kit.hooks.map((h) => h.line).join('\n')
    case 'open_house': return kit.open_house.map((x) => `${x.label}: ${x.text}`).join('\n')
    case 'posts': return kit.posts.map((x) => `${x.label}: ${x.text}`).join('\n')
    case 'straight': return kit.straight
  }
}

function download(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 2000)
}

async function toClipboard(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}

export function KitView({ data, usage, onUsage, onLimit, onRewrite, onBuy, onTouchLimit, say }: Props) {
  const latest = data.versions[data.versions.length - 1]!
  const [versionId, setVersionId] = useState(latest.id)
  const [kit, setKit] = useState<Kit>(latest.content)
  const [tab, setTab] = useState<Output>('walkthrough')
  const [dirty, setDirty] = useState(false)
  const [keeping, setKeeping] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  /** "funnier" on one line: which line is open, its options, the pick */
  const [touch, setTouch] = useState<{ key: string; where: string; apply: (k: Kit, t: string) => void; current: string } | null>(null)
  const [options, setOptions] = useState<{ line: string; move: string }[] | null>(null)
  const [picked, setPicked] = useState(-1)
  const [touching, setTouching] = useState(false)
  const offered = useRef<Record<string, string[]>>({})
  const free = usage.tier === 'free' && !data.paid
  const marked = free

  useEffect(() => { setKit(latest.content); setVersionId(latest.id); setDirty(false) }, [data.id, latest.id, latest.content])


  /** the ledger first; false means stop */
  async function charge(output: KitDownloadKind): Promise<{ ok: true; watermarked: boolean } | { ok: false }> {
    if (dirty) { say('keep your edits first (the button below the kit)'); return { ok: false } }
    setBusy(output)
    try {
      const r = await chargeKitDownload({ data: { kit_id: data.id, version_id: versionId, output } })
      if (!r.ok) {
        if (r.reason === 'limited') { track('kit_download_blocked', { output, used: r.used, cap: r.cap, tier: r.tier }); onLimit(); return { ok: false } }
        say('could not count that · try again')
        return { ok: false }
      }
      onUsage({ ...usage, downloads: { ...usage.downloads, used: r.used } })
      track('kit_download', { output, tier: r.tier, watermarked: r.watermarked, repeat: r.repeat })
      return { ok: true, watermarked: r.watermarked }
    } finally {
      setBusy(null)
    }
  }

  async function copyOutput(o: Output) {
    const r = await charge(o)
    if (!r.ok) return
    const ok = await toClipboard(copyText(kit, o, r.watermarked))
    say(ok ? `${OUTPUT_LABEL[o]} copied${left()}` : 'copy blocked by the browser · select the text and copy')
  }

  async function voiceoverFile() {
    const r = await charge('txt')
    if (!r.ok) return
    download(new Blob([voiceoverTxt(kit, r.watermarked)], { type: 'text/plain' }), `${fileStem(data.listing)} - voiceover.txt`)
    say(`voiceover .txt saved${left()}`)
  }

  async function pdf() {
    const r = await charge('pdf')
    if (!r.ok) return
    const { kitPdf } = await import('@/lib/realtors/kit-pdf')
    download(kitPdf(kit, data.listing, data.controls, { marked: r.watermarked }), `${fileStem(data.listing)} - the kit.pdf`)
    say(`the kit PDF saved${left()}`)
  }

  function left(): string {
    return ''
  }

  async function keep() {
    setKeeping(true)
    try {
      const r = await keepKitEdit({ data: { kit_id: data.id, content: kit } })
      if (!r.ok) return say(r.reason === 'too_many' ? 'this kit has all the versions it can hold' : 'could not keep it · try again')
      data.versions.push(r.version)
      setVersionId(r.version.id)
      setKit(r.version.content)
      setDirty(false)
      track('kit_edit_kept', { tone: data.tone })
      say('kept · your edits are the kit now')
    } finally {
      setKeeping(false)
    }
  }

  /** a typed line: the kit on the page changes; nothing is sent until kept */
  function edit(update: (k: Kit) => Kit) { setKit((k) => update(structuredClone(k))); setDirty(true) }
  const onLine = (apply: (k: Kit, text: string) => void) => (e: React.FocusEvent<HTMLElement>) => {
    const text = (e.currentTarget.innerText ?? '').replace(/\s+/g, ' ').trim()
    edit((k) => { apply(k, text); return k })
  }
  const line = (text: string, apply: (k: Kit, t: string) => void, cls = 'rl-line') => (
    <p className={cls} contentEditable suppressContentEditableWarning spellCheck={false} onBlur={onLine(apply)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur() } }}>{text}</p>
  )

  async function funnier(key: string, where: string, current: string, apply: (k: Kit, t: string) => void) {
    setTouch({ key, where, apply, current }); setOptions(null); setPicked(-1); setTouching(true)
    track('kit_line_funnier', { where })
    try {
      const context = outputContext(kit, tab)
      const r = await touchKitLine({ data: { kit_id: data.id, where, context, line: current, avoid: offered.current[key] ?? [] } })
      if (!r.ok) {
        setTouch(null)
        if (r.reason === 'limited') return onTouchLimit()
        return say(r.reason === 'rate_limited' ? 'one at a time · try again in a moment' : 'that one did not come back · try again')
      }
      setOptions(r.options)
      offered.current[key] = [...(offered.current[key] ?? []), ...r.options.map((o) => o.line)].slice(-12)
    } finally {
      setTouching(false)
    }
  }
  function useOption() {
    if (!touch) return
    if (picked >= 0 && options) {
      const t = touch
      const line = options[picked]!.line
      edit((k) => { t.apply(k, line); return k })
      track('kit_line_picked', { where: t.where, move: options[picked]!.move })
    }
    setTouch(null)
  }
  const pop = (key: string) => touch?.key === key && (
    <div className="rl-pop" role="dialog" aria-label="three ways">
      <span className="rl-lbl r">funnier · {touch.where} · three ways, {TONE_LABEL[data.tone]}</span>
      {touching && !options && <p className="rl-note">writing three…</p>}
      {options && (
        <>
          <button className={`rl-opt keep${picked === -1 ? ' on' : ''}`} onClick={() => setPicked(-1)}><b>✓</b><span>{touch.current || <i>leave it empty</i>}<small>keep mine</small></span></button>
          {options.map((o, i) => <button key={i} className={`rl-opt${picked === i ? ' on' : ''}`} onClick={() => setPicked(i)}><b>{i + 1}</b><span>{o.line}<small>{o.move}</small></span></button>)}
        </>
      )}
      <div className="rl-row">
        <button className="rl-btn sm" disabled={!options} onClick={useOption}>{picked < 0 ? 'keep mine' : 'use this one'}</button>
        <button className="rl-mini" disabled={touching} onClick={() => void funnier(key, touch.where, touch.current, touch.apply)}>three more</button>
        <button className="rl-mini" onClick={() => setTouch(null)}>close</button>
      </div>
    </div>
  )
  const fun = (key: string, where: string, current: string, apply: (k: Kit, t: string) => void) => (
    <button className={`rl-mini${touch?.key === key ? ' on' : ''}`} disabled={touching} onClick={() => void funnier(key, where, current, apply)}>{touching && touch?.key === key ? '…' : 'funnier'}</button>
  )

  const count = 'yours to keep · copy, download and shoot as often as you like · in My creations'

  return (
    <section className="rl-card" aria-label="The kit" data-ph-private>
      <div className="rl-row" style={{ justifyContent: 'space-between' }}>
        <div>
          <span className="rl-lbl r">the kit · {TONE_LABEL[data.tone]}</span>
          <h2 style={{ margin: '2px 0 0', font: '800 22px var(--sora)', color: 'var(--wine)', letterSpacing: '-0.03em' }}>{kitTitle(data.listing)}</h2>
        </div>
        <span className="rl-note">{free ? 'free kit · every output ends with "— shutap.com"' : count}</span>
      </div>
      <div className="rl-facts">{listingFacts(data.listing).map((f) => <span key={f} className="rl-fact">{f}</span>)}</div>

      <div className="rl-tabs" role="tablist">
        {OUTPUTS.map((o) => <button key={o} role="tab" className="rl-tab" aria-selected={tab === o} onClick={() => { setTab(o); track('kit_tab', { output: o }) }}>{OUTPUT_LABEL[o]}</button>)}
      </div>

      {tab === 'walkthrough' && (
        <div>
          <p className="rl-note">{kit.walkthrough.shots.length} shots · one take on a phone · say the line, then move · tap any line to change it</p>
          {kit.walkthrough.shots.map((s, i) => (
            <div key={i} className="rl-item">
              <span className="n">{i + 1}</span>
              <div>
                <div className="meta">{s.where} · {s.seconds}s{s.fact ? ` · ${s.fact}` : ''}</div>
                {line(s.action, (k, t) => { k.walkthrough.shots[i]!.action = t }, 'rl-line sm')}
                {line(`“${s.line}”`, (k, t) => { k.walkthrough.shots[i]!.line = t.replace(/^[“"]|[”"]$/g, '') })}
              </div>
              <div className="ctl">{fun(`w${i}`, `walkthrough shot ${i + 1} · ${s.where}`, s.line, (k, t) => { k.walkthrough.shots[i]!.line = t })}</div>
              {pop(`w${i}`)}
            </div>
          ))}
          {kit.walkthrough.cut15 && <p className="rl-note" style={{ marginTop: 8 }}><b>15s cut:</b> {kit.walkthrough.cut15}</p>}
          {kit.walkthrough.cut60 && <p className="rl-note"><b>60s cut:</b> {kit.walkthrough.cut60}</p>}
        </div>
      )}
      {tab === 'voiceover' && (
        <div>
          <p className="rl-note">read it on camera, or paste it into text-to-voice</p>
          {kit.voiceover.map((v, i) => (
            <div key={i} className="rl-item"><span className="n">{i + 1}</span><div>{v.label && <div className="meta">{v.label}</div>}{line(v.text, (k, t) => { k.voiceover[i]!.text = t })}</div><div className="ctl">{fun(`v${i}`, `voiceover · ${v.label || i + 1}`, v.text, (k, t) => { k.voiceover[i]!.text = t })}</div>{pop(`v${i}`)}</div>
          ))}
        </div>
      )}
      {tab === 'hooks' && (
        <div>
          <p className="rl-note">the first two seconds, on screen and spoken</p>
          {kit.hooks.map((h, i) => (
            <div key={i} className="rl-item"><span className="n">{i + 1}</span><div>{line(h.line, (k, t) => { k.hooks[i]!.line = t })}{h.move && <div className="meta" style={{ marginTop: 4 }}>{h.move}</div>}</div><div className="ctl">{fun(`h${i}`, `hook ${i + 1}`, h.line, (k, t) => { k.hooks[i]!.line = t })}</div>{pop(`h${i}`)}</div>
          ))}
        </div>
      )}
      {(tab === 'open_house' || tab === 'posts') && (
        <div>
          {(tab === 'posts' ? kit.posts : kit.open_house).map((x, i) => (
            <div key={i} className="rl-item"><span className="n">{i + 1}</span><div><div className="meta">{x.label}</div>{line(x.text, (k, t) => { (tab === 'posts' ? k.posts : k.open_house)[i]!.text = t }, 'rl-line sm')}</div>
              <div className="ctl">{fun(`${tab}${i}`, `${OUTPUT_LABEL[tab]} · ${x.label}`, x.text, (k, t) => { (tab === 'posts' ? k.posts : k.open_house)[i]!.text = t })}<button className="rl-mini" disabled={busy !== null} onClick={async () => { const r = await charge(tab); if (!r.ok) return; const ok = await toClipboard((r.watermarked ? x.text + ' — shutap.com' : x.text)); say(ok ? `copied${left()}` : 'copy blocked · select the text') }}>copy</button></div>
              {pop(`${tab}${i}`)}
            </div>
          ))}
        </div>
      )}
      {tab === 'straight' && (
        <div>
          <p className="rl-note">the MLS-ready description, no jokes, so the kit is complete</p>
          {line(kit.straight, (k, t) => { k.straight = t }, 'rl-line sm')}
        </div>
      )}

      {dirty && (
        <div className="rl-row" style={{ justifyContent: 'space-between', background: 'var(--surface)', borderRadius: 12, padding: '8px 12px' }}>
          <span className="rl-note">you changed a line · keep it to copy or download this version</span>
          <button className="rl-btn sm" disabled={keeping} onClick={() => void keep()}>{keeping ? 'keeping…' : 'keep my edits'}</button>
        </div>
      )}

      <div className="rl-dl">
        <button className="rl-btn" disabled={busy !== null} onClick={() => void copyOutput(tab)}>copy {OUTPUT_LABEL[tab]}<small>this tab · unlimited</small></button>
        {tab === 'voiceover' && <button className="rl-btn ghost" disabled={busy !== null} onClick={() => void voiceoverFile()}>voiceover .txt<small>for text-to-voice</small></button>}
        <button className="rl-btn ghost" disabled={busy !== null} onClick={() => void pdf()}>kit PDF<small>all six, one file</small></button>
        <Link to="/realtors/shoot/$id" params={{ id: data.id }} className="rl-btn ghost" onClick={() => track('kit_shoot_opened_from_kit', {})}>▶ shoot mode<small>opens the teleprompter</small></Link>
        <button className="rl-btn ghost" onClick={onRewrite}>rewrite<small>new tone or controls · a new kit</small></button>
        {free && <button className="rl-btn ghost" onClick={() => { track('kit_buy_clicked', { tier: usage.tier }); onBuy() }}>remove the mark · {usd(KIT_ONCE.amount)}<small>this kit, clean, forever</small></button>}
      </div>
      <p className="rl-note">copies, the PDF and shoot mode are unlimited · find this kit any time under profile → My creations · "funnier" rewrites that one line only · nobody at shutap reads your listings · saved to your kits</p>
    </section>
  )
}
