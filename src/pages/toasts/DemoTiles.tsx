/* The real toast beside the form on every occasion page (Nov 8 2026, design
 * approved by Candy). The demo is the newest lab toast Candy rated "pick" for
 * this occasion (getToastDemo), shown unedited with names as [roles]. What
 * they typed, then what Shutap built: the speech, cue cards (drawn exactly as
 * the PDF prints them), the 60-second version, rehearse, the text after, the
 * keepsake where the occasion has one, and the prompter running. Each sample
 * PDF opens from the same code a buyer's download uses. The lines the current
 * form step fills light up. Every open is tracked (admin + PostHog). */
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { OCCASION, TONE_LABEL, occasionName, clock, fromPlaceholders, lengthLabel, type Names, type ToastLine } from '@/lib/toasts/shared'
import type { ToastDemo } from '@/lib/toasts/demo.functions'
import { trackEvent } from '@/lib/tracking'
import { phCapture } from '@/lib/posthog'

type Id = 'speech' | 'cards' | 'cut' | 'rehearse' | 'after' | 'keepsake' | 'prompter'
const track = (name: string, props: Record<string, unknown>) => { void trackEvent(name, { product: 'toasts', ...props }); void phCapture(name, { product: 'toasts', ...props }) }

/** the marks, exactly as the toast page shows them */
function marksOf(l: Pick<ToastLine, 'pause' | 'laugh' | 'glass'>): string {
  return [l.pause && '‖ pause', l.laugh && '(wait) let them laugh', l.glass && '↑ glasses up'].filter(Boolean).join(' · ')
}
const mine = (l: ToastLine) => l.source === 'story' || l.source === 'true_thing'
const hasName = (t: string) => /\{(friend|partner|me)\}/.test(t)

/** which lines the form's current step fills */
function lit(l: ToastLine, step: number): boolean {
  if (step === 1) return l.source === 'story'
  if (step === 2) return hasName(l.text)
  if (step === 3) return l.source === 'true_thing'
  return false
}

const STEP_LINE = [
  '',
  'Your locked stories go in word for word; Shutap writes the lines around them.',
  'Names go where the toast says who you are and who it’s for. Shutap only sees placeholders.',
  'Your last line closes the toast, word for word, right before glasses up.',
  'The tone sets how every line around your stories lands.',
]

async function openPdf(kind: 'speech' | 'cards' | 'keepsake', demo: ToastDemo, names: Partial<Names>, page: string) {
  track('sample_pdf_open', { output: kind, page })
  const m = await import('@/lib/toasts/toast-pdf')
  const t = demo.toast
  const blob = kind === 'speech'
    ? m.speechPdf({ name: occasionName(demo.form.occasion, demo.form), occasion: demo.form.occasion, tone: demo.form.tone, length: demo.form.length, lines: t.lines, names, marked: false })
    : kind === 'cards'
      ? m.cueCardsPdf({ name: occasionName(demo.form.occasion, demo.form), occasion: demo.form.occasion, cards: t.cards, names, marked: false, trueThing: t.lines.find((l) => l.source === 'true_thing')?.text })
      : m.keepsakePdf({ occasion: demo.form.occasion, lines: t.lines, names, marked: false })
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank', 'noopener')
  if (!w) m.downloadBlob(blob, `sample-${demo.form.occasion}-${kind}.pdf`)
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function CueCard({ n, total, title, keys, land, isTrue, what, small }: { n: number; total: number; title: string; keys: string[]; land: string; isTrue: boolean; what: string; small?: boolean }) {
  return (
    <span className={`tc-card${small ? ' sm' : ''}`}>
      <span className="tc-t">{n} · {title.toUpperCase()}</span>
      {keys.map((k) => <span key={k} className="tc-k">· {k}</span>)}
      <span className="tc-rule" aria-hidden />
      <span className="tc-l">{isTrue ? 'SAY IT WORD FOR WORD' : 'LAND IT'}</span>
      <span className="tc-land">{land}</span>
      <span className="tc-f">{what} toast · card {n} of {total}</span>
    </span>
  )
}

export function DemoTiles({ demo, roles, step, page, onTry }: { demo: ToastDemo | null; roles: { friend: string; partner?: string; me: string }; step: number; page: string; onTry: () => void }) {
  const [open, setOpen] = useState<Id | null>(null)
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const hoverable = useRef(false)
  const last = useRef<Id | null>(null)
  const names: Partial<Names> = { friend: roles.friend, partner: roles.partner, me: roles.me }
  const shown = (t: string) => fromPlaceholders(t, names)

  useEffect(() => { try { hoverable.current = window.matchMedia('(hover: hover) and (min-width: 900px)').matches } catch { /* noop */ } }, [])
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null) }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open])
  const lines = useMemo(() => demo?.toast.lines ?? [], [demo])
  useEffect(() => {
    if (open !== 'prompter' || paused || !lines.length) return
    const words = lines[i]!.text.split(/\s+/).length
    const t = window.setTimeout(() => setI((x) => Math.min(lines.length - 1, x + 1)), Math.max(2200, (words / 2.4) * 1000 + 700))
    return () => window.clearTimeout(t)
  }, [open, paused, i, lines])

  const show = (id: Id, how: 'hover' | 'tap' | 'focus') => {
    if (how === 'hover' && !hoverable.current) return
    if (id === 'prompter') { setI(0); setPaused(false) }
    setOpen(id)
    if (last.current !== id) { last.current = id; track(id === 'prompter' ? 'sample_prompter_open' : 'sample_tile_open', { output: id, how, page, occasion: demo?.form.occasion }) }
  }
  const close = () => { setOpen(null); last.current = null }
  const tryYours = () => { track('seo_cta_clicked', { page, kind: 'sample_tile', output: open }); close(); onTry() }

  const spec = demo ? OCCASION[demo.form.occasion] : null
  const what = demo ? occasionName(demo.form.occasion, demo.form) : ''
  const trueText = lines.find((l) => l.source === 'true_thing')?.text ?? ''
  const cards = demo?.toast.cards ?? []
  const cut = demo?.toast.cut60 ?? []
  const peek = useMemo(() => {
    if (!lines.length) return []
    const want = lines.map((l, j) => ({ l, j })).filter(({ l }) => lit(l, step)).map(({ j }) => j)
    const base = [0, ...lines.map((l, j) => (l.source === 'story' ? j : -1)).filter((j) => j >= 0), 3, 4]
    const pickIdx = [...new Set([...(want.length ? want : []), ...base])].filter((j) => j < lines.length).slice(0, 4).sort((a, b) => a - b)
    return pickIdx.map((j) => lines[j]!)
  }, [lines, step])
  const glassAt = Math.max(0, lines.findIndex((l) => l.glass))

  if (!demo || !spec) {
    // no picked toast for this occasion yet: say what a toast comes with, nothing made up
    return (
      <section className="st dt" aria-label="What you get">
        <div className="st-head"><p className="rl-kicker" style={{ textAlign: 'left', margin: 0 }}>What you get</p></div>
        <div className="dt-what">
          {[
            ['The speech', 'Your stories word for word, the lines around them, pause and laugh marks, a running clock.'],
            ['Cue cards', 'Four to a Letter page: the cue words to glance at, the line to land in bold.'],
            ['The phone prompter', 'One line at a time, with “skip to the toast”.'],
            ['The 60-second version', 'One tap, made when the room wants it short.'],
            ['Rehearse', 'A timed run-through. Nothing recorded.'],
            ['The text to send after', 'Plus a one-page keepsake for weddings, retirements and birthdays.'],
          ].map(([t, p], k) => <div key={t} className="dt-what-i"><span className="n">{k + 1}</span><div><b>{t}</b><p>{p}</p></div></div>)}
        </div>
      </section>
    )
  }

  const rowsSpeech = lines.map((l) => ({ k: shown(l.section), v: shown(l.text), mine: mine(l), m: marksOf(l), note: l.note ? shown(l.note) : '', lit: lit(l, step) }))
  const rowsCut = cut.map((l) => ({ k: shown(l.section), v: shown(l.text), mine: mine(l), m: marksOf(l), note: '', lit: false }))
  const pop: Partial<Record<Id, { n: number; title: string; use: string; rows?: typeof rowsSpeech; pdf?: 'speech' | 'cards' | 'keepsake' }>> = {
    speech: { n: 1, title: 'The speech', use: `${clock(demo.seconds)} of a ${lengthLabel(demo.form.occasion, demo.form.length)} target · the PDF marks every pause and laugh`, rows: rowsSpeech, pdf: 'speech' },
    cards: { n: 2, title: 'Cue cards', use: 'Print, cut, hold. Four to a Letter page.', pdf: 'cards' },
    cut: { n: 3, title: 'The 60-second version', use: `${demo.cut_seconds ? clock(demo.cut_seconds) : ''} · made with one tap when you need it`, rows: rowsCut },
    rehearse: { n: 4, title: 'Rehearse', use: 'Say it out loud, tap for the next line. Nothing is recorded; your runs stay on your phone.', rows: rowsSpeech },
    after: { n: 5, title: 'The text after', use: 'To send them that night', rows: [{ k: 'text', v: shown(demo.toast.text_after), mine: false, m: '', note: '', lit: false }] },
    keepsake: { n: 6, title: 'Keepsake', use: 'A one-page copy to hand them, with room for a note and your signature.', pdf: 'keepsake', rows: rowsSpeech.filter((r) => r.k !== 'glasses') },
  }
  const cur = open && open !== 'prompter' ? pop[open] : null
  const cardOf = (k: number) => { const c = cards[k]!; return <CueCard n={k + 1} total={cards.length} title={shown(c.title)} keys={c.keys.map(shown)} land={shown(c.land)} isTrue={!!trueText && c.land.trim().toLowerCase().includes(trueText.trim().toLowerCase())} what={what} /> }
  const cardPeek = Math.min(1, cards.length - 1)
  const typed = demo.form.stories
  const tile = (id: Id, n: number, title: string, meta: string, body: ReactNode, wide = false) => (
    <button key={id} type="button" className={`st-tile dt-tile${wide ? ' wide' : ''}`} onMouseEnter={() => show(id, 'hover')} onFocus={() => show(id, 'focus')} onClick={() => show(id, 'tap')} aria-label={`${title}: open it`}>
      <span className="st-t"><span className="ti">{n} · {title}</span><span className="me">{meta}</span></span>
      {body}
    </button>
  )

  return (
    <section className="st dt" aria-label={`A real ${what} toast`}>
      <div className="st-head">
        <p className="rl-kicker" style={{ textAlign: 'left', margin: 0 }}>A real toast</p>
        <p className="rl-note">{what} · {TONE_LABEL[demo.form.tone]} · {lengthLabel(demo.form.occasion, demo.form.length)} · <span className="rl-only-wide">hover to open</span><span className="rl-only-narrow">tap one</span></p>
      </div>
      {step > 1 && STEP_LINE[step] && <p className="dt-step" role="status"><span aria-hidden />{STEP_LINE[step]}</p>}
      <div className="dt-left">
      <div className="dt-typed">
        <p className="dt-lbl">What they typed</p>
        <div className="dt-typed-g">
          {typed.map((s, k) => <Fragment key={k}><span className="g">Story {k + 1}</span><span className="q">“{shown(s)}”</span></Fragment>)}
          <span className="g">The one true thing</span><span className="q">“{shown(demo.form.true_thing)}”</span>
          <span className="m">Picked</span><span className="p">{TONE_LABEL[demo.form.tone]} · {lengthLabel(demo.form.occasion, demo.form.length)}{typed.length < spec.stories ? ` · ${spec.stories - typed.length === 1 ? `story ${spec.stories}` : `stories ${typed.length + 1} and ${spec.stories}`} left empty` : ''}</span>
        </div>
      </div>
      <p className="dt-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 4v16M6 14l6 6 6-6" /></svg>What Shutap built around it · {clock(demo.seconds)}</p>
      </div>
      <div className="st-wrap">
        <div className="st-grid dt-grid">
          {tile('speech', 1, 'The speech', `${lines.length} lines · ${clock(demo.seconds)} of ${lengthLabel(demo.form.occasion, demo.form.length)}`, (
            <>
              {peek.map((l, k) => (
                <span key={k} className={`dt-peek${lit(l, step) ? ' lit' : ''}${mine(l) && lit(l, step) ? ' mine' : ''}`}>
                  <span className="tx">{shown(l.text)}</span>
                  {mine(l) && <span className="dt-chip mine">your words</span>}
                  {marksOf(l) && <span className="dt-chip">{marksOf(l)}</span>}
                </span>
              ))}
              <span className="st-foot">+ delivery notes and the glass-raise cue · PDF</span>
            </>
          ), true)}
          {cards.length > 0 && tile('cards', 2, 'Cue cards', `${cards.length} cards`, (
            <span className="dt-cards"><span className="dt-cardwrap" aria-hidden>{cardOf(cardPeek)}</span><span className="dt-side"><span>One beat a card: the cue words to glance at, the line to land in bold.</span><span className="mu">Prints 4 to a Letter page, exactly like this.</span></span></span>
          ))}
          {cut.length > 0 && tile('cut', 3, '60-second version', demo.cut_seconds ? clock(demo.cut_seconds) : '', (
            <>
              <span className="dt-bar"><span style={{ width: `${Math.round((cut.length / Math.max(1, lines.length)) * 100)}%` }} /></span>
              {cut.filter((_, k) => k % 2 === 0).slice(0, 3).map((l, k) => <span key={k} className="dt-cutl">{shown(l.text)}</span>)}
              <span className="st-foot">One tap, made when the room wants it short</span>
            </>
          ))}
          {tile('rehearse', 4, 'Rehearse', 'timer · nothing recorded', (
            <>
              <span className="dt-clock"><b>{clock(demo.seconds)}</b> / {clock(demo.form.length)}</span>
              <span className="dt-bar dark"><span style={{ width: `${Math.min(100, Math.round((demo.seconds / Math.max(1, demo.form.length)) * 100))}%` }} /></span>
              <span className="dt-small">Say it out loud, tap for the next line. Your real time against the target.</span>
            </>
          ))}
          {demo.toast.text_after && tile('after', 5, 'The text after', 'send that night', <span className="dt-bubble">{shown(demo.toast.text_after)}</span>)}
          {spec.keepsake && tile('keepsake', 6, 'Keepsake', 'one page to hand them', (
            <span className="dt-keep"><span className="h">{fromPlaceholders('{friend}', names)}</span><span className="l">{shown(lines[0]?.text ?? '')}</span><span className="t">“{shown(trueText)}”</span><span className="s">a few words for you ___________</span></span>
          ))}
          <button type="button" className="st-shoot" onMouseEnter={() => show('prompter', 'hover')} onFocus={() => show('prompter', 'focus')} onClick={() => show('prompter', 'tap')}>
            <span className="pl" aria-hidden><svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M7 4l13 8-13 8z" /></svg></span>
            <span className="tx"><b>The prompter</b><span>On your phone, one line at a time, with “skip to the toast”</span></span>
            <span className="go">watch ›</span>
          </button>
        </div>

        {open && <div className="st-scrim" onClick={close} aria-hidden />}

        {cur && (
          <div className="st-pop" role="dialog" aria-label={cur.title} onMouseLeave={() => { if (hoverable.current) close() }}>
            <div className="st-pop-hd">
              <div><p className="ti">{cur.n} · {cur.title}</p><p className="rl-note">{cur.use}</p></div>
              <button type="button" className="st-x" onClick={close} aria-label="Close">×</button>
            </div>
            <div className="st-pop-bd">
              {open === 'cards' ? (
                <div className="dt-cardgrid">{cards.map((_, k) => <span key={k}>{cardOf(k)}</span>)}</div>
              ) : cur.rows!.map((r, j) => (
                <div key={j} className={`st-row${r.lit ? ' dt-lit' : ''}`}>
                  {cur.rows!.length > 1 && <span className="n">{j + 1}</span>}
                  <div>
                    <p className="k">{r.k}{r.mine && <span className="dt-chip mine">your words</span>}{r.m && <span className="dt-chip">{r.m}</span>}</p>
                    <p className="v">{r.v}</p>
                    {r.note && <p className="sub" style={{ fontStyle: 'italic' }}>{r.note}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="st-pop-ft">
              <span>Names hidden. Green: the words they typed.</span>
              <span className="rl-row" style={{ gap: 12 }}>
                {cur.pdf && <button type="button" className="rl-linkbtn" onClick={() => void openPdf(cur.pdf!, demo, names, page)}>Open the sample PDF</button>}
                <button type="button" className="rl-linkbtn" onClick={tryYours}>Try yours ↑</button>
              </span>
            </div>
          </div>
        )}

        {open === 'prompter' && lines.length > 0 && (
          <div className="st-pop st-pr" role="dialog" aria-label="The prompter" onMouseLeave={() => { if (hoverable.current) close() }}>
            <div className="st-pr-hd">
              <span>{clock(Math.round((i / Math.max(1, lines.length - 1)) * demo.seconds))} / {clock(demo.form.length)} · line {i + 1} of {lines.length}</span>
              <span className="b">
                <button type="button" onClick={() => setPaused((p) => !p)}>{paused ? 'play' : 'pause'}</button>
                <button type="button" className="st-x dark" onClick={close} aria-label="Close">×</button>
              </span>
            </div>
            <div className="st-pr-bd" onClick={() => setPaused((p) => !p)}>
              <p className="dim">{i > 0 ? shown(lines[i - 1]!.text) : ' '}</p>
              <div>
                <p className="line">{shown(lines[i]!.text)}</p>
                {marksOf(lines[i]!) && <p className="cue" style={{ marginTop: 10 }}>{marksOf(lines[i]!)}</p>}
              </div>
              <p className="dim">{i < lines.length - 1 ? shown(lines[i + 1]!.text) : ' '}</p>
            </div>
            <div className="st-pr-ft">
              <button type="button" className="rl-btn" onClick={() => { setI(glassAt); track('sample_prompter_skip', { page }) }}>skip to the toast ↓</button>
              <span>tap the text to hold · slower / faster · text size</span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
