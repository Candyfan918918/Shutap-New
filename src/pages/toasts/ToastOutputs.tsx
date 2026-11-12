/* The top of every Shutap Toasts occasion page (Nov 12 2026, design approved
 * by Candy): the page's in-house demo toast as four outputs side by side, the
 * same size: the speech (their words in green, pause and laugh marks), a cue
 * card (the printed card's lined design), the phone prompter running, and the
 * keepsake page (the whole page, laid out like the PDF) where the occasion has
 * one, the text to send after where it doesn't. Under them: what else every
 * toast comes with, and what the writer typed. On a phone the four swipe,
 * prompter first. Every tile opens the sample PDF from the same code a
 * buyer's download uses (or the prompter, full size). Nothing here is drawn
 * from anything but the demo toast. */
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { OCCASION, TONE_LABEL, occasionName, clock, fromPlaceholders, lengthLabel, type Names, type ToastLine } from '@/lib/toasts/shared'
import { KEEPSAKE_LABEL, toastTitle } from '@/lib/toasts/toast-text'
import type { ToastDemo } from '@/lib/toasts/demo.functions'
import { trackEvent } from '@/lib/tracking'
import { phCapture } from '@/lib/posthog'
import { CueCard, openPdf } from './DemoTiles'

const track = (name: string, props: Record<string, unknown>) => { void trackEvent(name, { product: 'toasts', ...props }); void phCapture(name, { product: 'toasts', ...props }) }
const mine = (l: ToastLine) => l.source === 'story' || l.source === 'true_thing'
/** the marks, exactly as the toast page shows them */
function marksOf(l: Pick<ToastLine, 'pause' | 'laugh' | 'glass'>): string {
  return [l.pause && '‖ pause', l.laugh && '(wait) let them laugh', l.glass && '↑ glasses up'].filter(Boolean).join(' · ')
}
const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** The keepsake page as the PDF lays it out (toast-pdf keepsakePdf): label,
 *  "For …", the date line, the toast as paragraphs (a story and its tags read
 *  as one), the true thing centered, room for a note and a signature. */
function KeepsakePage({ demo, names }: { demo: ToastDemo; names: Partial<Names> }) {
  const o = demo.form.occasion
  const paras = useMemo(() => {
    const base = (s: string) => s.split(' · ')[0]!.trim()
    const out: { text: string; true_thing: boolean; sec?: string }[] = []
    for (const l of demo.toast.lines) {
      const text = fromPlaceholders(l.text, names).replace(/\s*‖\s*/g, ' ').trim()
      if (l.source === 'true_thing') { out.push({ text, true_thing: true }); continue }
      const prev = out[out.length - 1]
      const sec = base(l.section)
      if (prev && !prev.true_thing && prev.sec === sec) prev.text += ` ${text}`
      else out.push({ text, true_thing: false, sec })
    }
    return out
  }, [demo, names])
  const role = o === 'best_man' ? ', best man' : o === 'maid_of_honor' ? ', maid of honor' : ''
  return (
    <span className="to-page" aria-hidden>
      <span className="lbl">{(KEEPSAKE_LABEL[o] ?? 'a toast').toUpperCase()}</span>
      <span className="ti">{toastTitle(o, names)}</span>
      <span className="dt">date ____________________</span>
      {paras.map((p, k) => <span key={k} className={p.true_thing ? 'tt' : 'p'}>{p.text}</span>)}
      <span className="rule" />
      <span className="few">A FEW WORDS FOR YOU</span>
      <span className="ln" /><span className="ln" /><span className="ln" />
      <span className="bw">Best wishes,</span>
      <span className="sig">signed - {fromPlaceholders('{me}', names)}{role}</span>
    </span>
  )
}

/** The phone prompter, running through the demo's lines with their marks. */
function Prompter({ lines, shown, page }: { lines: ToastLine[]; shown: (t: string) => string; page: string }) {
  const [i, setI] = useState(0)
  const [on, setOn] = useState(true)
  const glassAt = Math.max(0, lines.findIndex((l) => l.glass))
  useEffect(() => {
    if (!on || reduceMotion() || !lines.length) return
    const words = lines[i]!.text.split(/\s+/).length
    const t = window.setTimeout(() => setI((x) => (x + 1) % lines.length), Math.max(2200, (words / 2.4) * 1000 + 700))
    return () => window.clearTimeout(t)
  }, [on, i, lines])
  const m = lines[i] ? marksOf(lines[i]!) : ''
  return (
    <span className="to-prompt">
      <span className="h">one line at a time · line {i + 1} of {lines.length}</span>
      <span className="g" aria-hidden />
      <span className="dim">{i > 0 ? shown(lines[i - 1]!.text) : ''}</span>
      <span className="lit">{lines[i] ? shown(lines[i]!.text) : ''}</span>
      {m && <span className="cue">{m}</span>}
      <span className="dim">{i < lines.length - 1 ? shown(lines[i + 1]!.text) : ''}</span>
      <span className="b">
        <button type="button" className="go" onClick={(e) => { e.stopPropagation(); setOn((v) => !v); track('sample_prompter_open', { page, action: on ? 'pause' : 'play' }) }}>{on ? 'pause' : 'play'}</button>
        <button type="button" onClick={(e) => { e.stopPropagation(); setI(glassAt); track('sample_prompter_skip', { page }) }}>skip to the toast</button>
      </span>
    </span>
  )
}

export function ToastOutputs({ demo, roles, page }: { demo: ToastDemo; roles: { friend: string; partner?: string; me: string }; page: string }) {
  const names: Partial<Names> = useMemo(() => ({ friend: roles.friend, partner: roles.partner, me: roles.me }), [roles])
  const shown = (t: string) => fromPlaceholders(t, names)
  const spec = OCCASION[demo.form.occasion]
  const what = occasionName(demo.form.occasion, demo.form)
  const lines = demo.toast.lines
  const cards = demo.toast.cards ?? []
  const trueText = lines.find((l) => l.source === 'true_thing')?.text ?? ''
  const cardAt = Math.min(1, Math.max(0, cards.length - 1))
  const open = (id: string, pdf?: 'speech' | 'cards' | 'keepsake') => {
    track('sample_tile_open', { output: id, how: 'tap', page, occasion: demo.form.occasion })
    if (pdf) void openPdf(pdf, demo, names, page)
  }
  const tile = (id: string, title: string, meta: string, foot: string, body: ReactNode, opts: { pdf?: 'speech' | 'cards' | 'keepsake'; lead?: boolean } = {}) => (
    <div key={id} className={`to-tile${opts.lead ? ' lead' : ''}`} data-tile={id}>
      <span className="to-h"><b>{title}</b><span>{meta}</span></span>
      {opts.pdf ? (
        <button type="button" className="to-body" onClick={() => open(id, opts.pdf)} aria-label={`${title}: open the sample PDF`}>{body}</button>
      ) : (
        <div className="to-body">{body}</div>
      )}
      <span className="to-foot">{foot}</span>
    </div>
  )

  const speech = tile('speech', 'The speech', `${clock(demo.seconds)} of ${lengthLabel(demo.form.occasion, demo.form.length)}`, 'To practice. Pause and laugh marks where they go.', (
    <span className="to-speech">
      {lines.slice(0, 9).map((l, k) => (
        <Fragment key={k}>
          <span className={mine(l) ? 'l mine' : 'l'}>{shown(l.text)}</span>
          {marksOf(l) && <span className="mk">{marksOf(l)}</span>}
        </Fragment>
      ))}
      <span className="more">{lines.length} lines · green = their words · open the PDF</span>
    </span>
  ), { pdf: 'speech' })
  const cardsTile = cards.length > 0 && tile('cards', 'Cue cards', `${cards.length} cards`, 'To give it. Prints 4 to a Letter page, exactly like this.', (
    <span className="to-card">
      <CueCard n={cardAt + 1} total={cards.length} title={shown(cards[cardAt]!.title)} keys={cards[cardAt]!.keys.map(shown)} land={shown(cards[cardAt]!.land)} isTrue={!!trueText && cards[cardAt]!.land.trim().toLowerCase().includes(trueText.trim().toLowerCase())} what={what} />
    </span>
  ), { pdf: 'cards' })
  const prompter = tile('prompter', 'Phone prompter', 'on the day', 'On your phone at the mic, with the marks.', <Prompter lines={lines} shown={shown} page={page} />, { lead: true })
  const fourth = spec.keepsake
    ? tile('keepsake', 'Keepsake', 'one page to hand them', 'The whole toast on one page, to print and hand them after.', <span className="to-keep"><KeepsakePage demo={demo} names={names} /></span>, { pdf: 'keepsake' })
    : demo.toast.text_after
      ? tile('after', 'The text after', 'send that night', 'A short message to send them after.', <span className="to-after"><span className="bub">{shown(demo.toast.text_after)}</span></span>)
      : null

  return (
    <section className="to" aria-label={`A realistic demo of a ${what} toast`}>
      <div className="to-row">
        {speech}
        {cardsTile}
        {prompter}
        {fourth}
      </div>
      <p className="to-also">
        <span>Also in every toast: <b>the 60-second version</b> · <b>a rehearse timer</b>{demo.seconds ? ` (${clock(demo.seconds)} / ${clock(demo.form.length)})` : ''}{spec.keepsake && demo.toast.text_after ? <> · <b>the text to send after</b></> : null}</span>
        <span className="mu">names shown as [roles] · {TONE_LABEL[demo.form.tone]} · {lengthLabel(demo.form.occasion, demo.form.length)}</span>
      </p>
      <div className="to-typed">
        <span className="lb">What they typed</span>
        {demo.form.stories.map((s, k) => <span key={k} className="it"><b>Story {k + 1}</b>“{shown(s)}”</span>)}
        <span className="it"><b>The last line</b>“{shown(demo.form.true_thing)}”</span>
      </div>
    </section>
  )
}
