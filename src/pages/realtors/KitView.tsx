/* The kit on the page. Nov 20 2026 (Candy): the same two panels as the bit
 * result. 1 · Your kit: the six pieces as picture cards (to film / to
 * post), the open piece's lines below, each editable by typing and with
 * "funnier". 2 · Use it: 3 ways, all in view: Teleprompter (to shoot),
 * Copy (to post), Kit PDF (to print or send). A changed line is saved at
 * once, so what is copied, downloaded or read on the teleprompter always
 * matches the page. Every copy and download goes through
 * chargeKitDownload first. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { chargeKitDownload, keepKitEdit, touchKitLine, type KitDownloadKind, type KitUsage, type KitView as KitData } from '@/lib/realtors.functions'
import { KIT_ONCE, usd } from '@/lib/pricing'
import { OUTPUT_LABEL, OUTPUTS, TONE_LABEL, listingFacts, type Kit, type Output } from '@/lib/realtors/listing'
import { copyText, fileStem, kitTitle, voiceoverTxt } from '@/lib/realtors/kit-text'
import { trackEvent } from '@/lib/tracking'
import QRCode from 'qrcode'

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

const PIECES: { group: string; items: { o: Output; name: string; use: string; thumb: 'list' | 'lines' | 'card' | 'page' }[] }[] = [
  { group: 'To film', items: [{ o: 'walkthrough', name: 'Walkthrough', use: 'shot by shot', thumb: 'list' }, { o: 'voiceover', name: 'Voiceover', use: 'to read out', thumb: 'lines' }, { o: 'hooks', name: 'Hooks', use: 'first 2 seconds', thumb: 'lines' }] },
  { group: 'To post', items: [{ o: 'open_house', name: 'Open house', use: 'sign and invite', thumb: 'card' }, { o: 'posts', name: 'Posts', use: 'just listed to sold', thumb: 'lines' }, { o: 'straight', name: 'MLS copy', use: 'no jokes', thumb: 'page' }] },
]
type Use = 'prompter' | 'copy' | 'pdf'
const USES: { id: Use; name: string; use: string; thumb: 'dark' | 'lines' | 'page' }[] = [
  { id: 'prompter', name: 'Teleprompter', use: 'to shoot', thumb: 'dark' },
  { id: 'copy', name: 'Copy', use: 'to post', thumb: 'lines' },
  { id: 'pdf', name: 'Kit PDF', use: 'to print or send', thumb: 'page' },
]
const nextUse = (u: Use): Use => USES[(USES.findIndex((x) => x.id === u) + 1) % USES.length]!.id

/** the small picture on a card: what you get, drawn with bars */
export function Thumb({ kind }: { kind: 'list' | 'lines' | 'card' | 'page' | 'dark' }) {
  const bars: Record<string, [number, number, string?][]> = {
    list: [[7, 14, '#b8456b'], [13, 4], [22, 14, '#b8456b'], [28, 4], [37, 14, '#b8456b']],
    lines: [[8, 4], [15, 8], [22, 4], [29, 10], [36, 4]],
    dark: [[10, 4, '#5d5157'], [19, 4, '#fff'], [28, 4, '#cfc5ca'], [36, 9, '#cfc5ca']],
    page: [[6, 12, '#3a3236'], [13, 4], [20, 7], [27, 4], [34, 9]],
    card: [[9, 10, '#3a3236'], [18, 4], [27, 7]],
  }
  return (
    <span className={`rl-thumb ${kind}`} aria-hidden>
      {bars[kind]!.map(([top, right, bg], i) => <i key={i} style={{ top, right, background: bg }} />)}
    </span>
  )
}

/** The QR for a second device, with the steps. */
export function SendSheet({ title, url, steps, onClose }: { title: string; url: string; steps: string[]; onClose: () => void }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (!ref.current) return
    QRCode.toCanvas(ref.current, url, { width: 200, margin: 1, color: { dark: '#1a1418', light: '#ffffff' } }).catch(() => {})
  }, [url])
  return (
    <div className="rl-sheet-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="rl-sheet" role="dialog" aria-modal="true" aria-label={title} style={{ maxWidth: 420 }}>
        <h3 style={{ margin: 0, font: '800 20px/1.2 var(--sora)', color: 'var(--wine)' }}>{title}</h3>
        <canvas ref={ref} width={200} height={200} aria-label="QR code" style={{ alignSelf: 'center', borderRadius: 12 }} />
        <ol className="rl-send-steps">{steps.map((t) => <li key={t}>{t}</li>)}</ol>
        <button type="button" className="rl-btn" onClick={onClose}>Done</button>
      </div>
    </div>
  )
}

export function KitView({ data, usage, onUsage, onLimit, onRewrite, onBuy, onTouchLimit, say }: Props) {
  const latest = data.versions[data.versions.length - 1]!
  const [versionId, setVersionId] = useState(latest.id)
  const [kit, setKit] = useState<Kit>(latest.content)
  const [tab, setTab] = useState<Output>('walkthrough')
  const [use, setUse] = useState<Use>('prompter')
  const [qr, setQr] = useState(false)
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  /** the kit as typed this instant, the version it is saved as, and the saves in flight */
  const kitRef = useRef<Kit>(latest.content)
  const verRef = useRef<{ id: string; edited: boolean }>({ id: latest.id, edited: latest.kind === 'edited' })
  const chain = useRef<Promise<void>>(Promise.resolve())
  const seq = useRef(0)
  const failed = useRef(false)
  const [busy, setBusy] = useState<string | null>(null)
  /** "funnier" on one line: which line is open, its options, the pick */
  const [touch, setTouch] = useState<{ key: string; where: string; apply: (k: Kit, t: string) => void; current: string } | null>(null)
  const [options, setOptions] = useState<{ line: string; move: string }[] | null>(null)
  const [picked, setPicked] = useState(-1)
  const [touching, setTouching] = useState(false)
  const offered = useRef<Record<string, string[]>>({})
  const free = usage.tier === 'free' && !data.paid
  const marked = free

  // another kit on the page (not a save of this one): start from its newest version
  useEffect(() => {
    setKit(latest.content); kitRef.current = latest.content
    setVersionId(latest.id); verRef.current = { id: latest.id, edited: latest.kind === 'edited' }
    setSaved('idle'); failed.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id])


  /** the ledger first; false means stop */
  async function charge(output: KitDownloadKind): Promise<{ ok: true; watermarked: boolean } | { ok: false }> {
    setBusy(output)
    try {
      // a line just changed: wait for it to be saved, so the file matches the page
      await chain.current
      if (failed.current) { say('your last change is not saved yet · try again in a moment'); queueSave(); return { ok: false } }
      const r = await chargeKitDownload({ data: { kit_id: data.id, version_id: verRef.current.id, output } })
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

  /** Save the kit as it stands. One save at a time; the latest wins. */
  function queueSave() {
    const mine = ++seq.current
    setSaved('saving')
    chain.current = chain.current.then(async () => {
      if (mine !== seq.current) return
      try {
        const r = await keepKitEdit({ data: { kit_id: data.id, content: kitRef.current, replace_version_id: verRef.current.edited ? verRef.current.id : undefined } })
        if (!r.ok) {
          failed.current = true
          setSaved('failed')
          track('kit_edit_save_failed', { reason: r.reason })
          say(r.reason === 'too_many' ? 'this kit has all the versions it can hold' : 'could not save that line · try again')
          return
        }
        failed.current = false
        const i = data.versions.findIndex((v) => v.id === r.version.id)
        if (i >= 0) data.versions[i] = r.version
        else data.versions.push(r.version)
        verRef.current = { id: r.version.id, edited: true }
        setVersionId(r.version.id)
        track('kit_edit_kept', { tone: data.tone, auto: true, replaced: i >= 0 })
        if (mine === seq.current) setSaved('saved')
      } catch {
        failed.current = true
        setSaved('failed')
        say('could not reach Shutap · your change is not saved yet')
      }
    })
  }

  /** a typed or picked line: the kit on the page changes and is saved at once */
  function edit(update: (k: Kit) => Kit) {
    const before = JSON.stringify(kitRef.current)
    const next = update(structuredClone(kitRef.current))
    if (JSON.stringify(next) === before) return
    kitRef.current = next
    setKit(next)
    queueSave()
  }
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
        track('kit_line_funnier_failed', { where, reason: r.reason })
        return say(r.reason === 'rate_limited' ? 'one at a time · try again in a moment' : 'that one did not come back · try again')
      }
      setOptions(r.options)
      offered.current[key] = [...(offered.current[key] ?? []), ...r.options.map((o) => o.line)].slice(-12)
    } catch {
      setTouch(null)
      track('kit_line_funnier_failed', { where, reason: 'network' })
      say('could not reach Shutap · try again')
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
    <button className={`rl-mini fb${touch?.key === key ? ' on' : ''}`} disabled={touching} onClick={() => void funnier(key, where, current, apply)}>{touching && touch?.key === key ? '…' : 'funnier'}</button>
  )

  const piece = PIECES.flatMap((g) => g.items).find((x) => x.o === tab)!
  const shootUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/realtors/shoot/${data.id}`
  const openUse = (u: Use, how: 'card' | 'next') => { setUse(u); track('kit_use_opened', { use: u, how }) }
  const nextLink = <button type="button" className="rl-next" onClick={() => openUse(nextUse(use), 'next')}>Next: {USES.find((x) => x.id === nextUse(use))!.name} →</button>
  const markNote = free
    ? <span className="rl-note">Free kit: every copy ends with “— shutap.com” and the PDF carries the mark. <button type="button" className="rl-linkish" onClick={() => { track('kit_buy_clicked', { tier: usage.tier }); onBuy() }}>Remove the mark on this kit: {usd(KIT_ONCE.amount)}</button></span>
    : <span className="rl-note">Yours to keep: copy, download and shoot as often as you like.</span>

  return (
    <div className="rl-k2" data-ph-private>
      <div className="rl-ready">
        <h1>Your kit is ready.</h1>
        <p>{kitTitle(data.listing)} · {TONE_LABEL[data.tone]}. Change any line on the left. Everything on the right updates with it.</p>
        <div className="rl-facts">{listingFacts(data.listing).map((f) => <span key={f} className="rl-fact">{f}</span>)}</div>
      </div>
      <div className="rl-two tall">
        <section className="rl-card rl-panel" aria-label="Your kit">
          <div className="rl-panel-h"><b>1 · Your kit: 6 pieces</b><span>tap one to open it</span></div>
          <div className="rl-groups">
            {PIECES.map((g) => (
              <div key={g.group}>
                <span className="rl-grp">{g.group}</span>
                <div className="rl-cards" role="tablist" aria-label={g.group}>
                  {g.items.map((x) => (
                    <button key={x.o} type="button" role="tab" aria-selected={tab === x.o} className={`rl-cd${tab === x.o ? ' on' : ''}`} onClick={() => { setTab(x.o); setTouch(null); track('kit_tab', { output: x.o }) }}>
                      <Thumb kind={x.thumb} /><span><b>{x.name}</b><small>{x.use}</small></span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {tab !== 'straight' && (
            <div className="rl-key"><span className="rl-mini fb" aria-hidden>funnier</span><span>Shows 3 new ways to say that line, in your tone. Yours stays first: pick one or keep yours. You can also type in any line.</span></div>
          )}

      {tab === 'walkthrough' && (
        <div>
          <p className="rl-note">{kit.walkthrough.shots.length} shots · one take on a phone · say the line, then move</p>
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
              <div className="ctl">{fun(`${tab}${i}`, `${OUTPUT_LABEL[tab]} · ${x.label}`, x.text, (k, t) => { (tab === 'posts' ? k.posts : k.open_house)[i]!.text = t })}<button className="rl-mini" disabled={busy !== null} onClick={async () => { const r = await charge(tab); if (!r.ok) return; const now = (tab === 'posts' ? kitRef.current.posts : kitRef.current.open_house)[i]?.text ?? x.text; const ok = await toClipboard((r.watermarked ? now + ' — shutap.com' : now)); say(ok ? 'copied' : 'copy blocked · select the text') }}>copy</button></div>
              {pop(`${tab}${i}`)}
            </div>
          ))}
        </div>
      )}
      {tab === 'straight' && (
        <div>
          <p className="rl-note">the MLS-ready description, no jokes, so the kit is complete · type in it to change it</p>
          <div className="rl-item solo">{line(kit.straight, (k, t) => { k.straight = t }, 'rl-line sm')}</div>
        </div>
      )}

          <span className="rl-note" role="status" style={{ minHeight: '1.5em' }}>
            {saved === 'saving' ? 'saving your change…' : saved === 'saved' ? 'Saved. The teleprompter, copy and PDF now use your new line.' : saved === 'failed' ? 'That change is not saved yet.' : 'Changes save by themselves.'}
          </span>
          <div className="rl-panel-foot">
            <div className="rl-panel-h sm"><b>Want a different tone?</b><span>a new tone is a new kit · now: {TONE_LABEL[data.tone]}</span></div>
            <button type="button" className="rl-btn ghost" style={{ alignSelf: 'flex-start' }} onClick={onRewrite}>Change the tone or controls</button>
          </div>
        </section>

        <section className="rl-card rl-panel rl-use" aria-label="Use it: 3 ways">
          <div className="rl-panel-h"><b>2 · Use it: 3 ways</b><span>tap one to open it</span></div>
          <div className="rl-cards three" role="tablist" aria-label="The three ways to use your kit">
            {USES.map((u) => (
              <button key={u.id} type="button" role="tab" aria-selected={use === u.id} className={`rl-cd${use === u.id ? ' on' : ''}`} onClick={() => openUse(u.id, 'card')}>
                <Thumb kind={u.thumb} /><span><b>{u.name}</b><small>{u.use}</small></span>
              </button>
            ))}
          </div>

          {use === 'prompter' && (
            <div className="rl-use-body">
              <div className="rl-phone dark" aria-label="Your walkthrough on the teleprompter">
                <div>
                  {kit.walkthrough.shots.map((s, i) => (
                    <div key={i}>{s.delivery && <em>{s.delivery}</em>}<p className={i === 0 ? 'lit' : undefined}>{s.line}</p></div>
                  ))}
                </div>
              </div>
              <div className="rl-use-side">
                <b className="rl-use-h">Read your walkthrough while you film.</b>
                <p className="rl-use-p"><b>Best with two devices:</b> film with your phone and show the teleprompter on a second phone or tablet, right under the camera lens. Say the line, then move to the next shot.</p>
                <button type="button" className="rl-btn big" onClick={() => { setQr(true); track('kit_use_send_device', {}) }}>Send to my other device</button>
                <Link to="/realtors/shoot/$id" params={{ id: data.id }} className="rl-btn ghost big" onClick={() => track('kit_shoot_opened_from_kit', {})}>Start here</Link>
                {markNote}
                {nextLink}
              </div>
            </div>
          )}

          {use === 'copy' && (
            <div className="rl-use-body">
              <div className="rl-phone" aria-label={`${piece.name}, the text you copy`}>
                <div className="txt"><span className="rl-grp">{piece.name}</span><p>{copyText(kit, tab, false)}</p></div>
              </div>
              <div className="rl-use-side">
                <b className="rl-use-h">Copy {piece.name}, then paste it where you post.</b>
                <p className="rl-use-p">This copies the piece that is open on the left. Paste it into Instagram, Facebook, TikTok, your MLS or an email. Open another piece on the left to copy that one.</p>
                <button type="button" className="rl-btn big" disabled={busy !== null} onClick={() => void copyOutput(tab)}>Copy {piece.name}</button>
                {tab === 'voiceover' && <button type="button" className="rl-btn ghost big" disabled={busy !== null} onClick={() => void voiceoverFile()}>Save voiceover as .txt</button>}
                {markNote}
                {nextLink}
              </div>
            </div>
          )}

          {use === 'pdf' && (
            <div className="rl-use-body">
              <div className="rl-desk">
                <div className="rl-paper" aria-label="The kit PDF, cover page">
                  <b>{kitTitle(data.listing)}</b>
                  <span>{TONE_LABEL[data.tone]}</span>
                  <ol>{PIECES.flatMap((g) => g.items).map((x) => <li key={x.o}>{x.name}</li>)}</ol>
                  <span>one piece per page · text you can copy</span>
                </div>
              </div>
              <div className="rl-use-side">
                <b className="rl-use-h">The whole kit in one PDF.</b>
                <p className="rl-use-p">A cover and one piece per page, Letter size. Print it for the open house, or send it to your team or your seller.</p>
                <button type="button" className="rl-btn big" disabled={busy !== null} onClick={() => void pdf()}>Download kit PDF</button>
                {markNote}
                {nextLink}
              </div>
            </div>
          )}
        </section>
      </div>
      <p className="rl-note">Find this kit any time under profile → My creations · nobody at Shutap reads your listings</p>
      {qr && <SendSheet title="Open the teleprompter on another device" url={shootUrl} steps={["Point the other device's camera at this code and open the link.", 'Sign in there with the same account. Your kit opens by itself.', 'Prop it right under the lens of the phone that films, then press record.']} onClose={() => setQr(false)} />}
    </div>
  )
}
