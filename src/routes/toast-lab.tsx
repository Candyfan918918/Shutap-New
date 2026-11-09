import { pageMeta } from '@/lib/seo/page-meta'
// Toast lab (Nov 6 2026): the admin bench for Shutap Toasts. Fill a form (or
// load the sample for an occasion), write the toast with the real pipeline,
// see every candidate the judge ranked and what the checks flagged, try
// "funnier" on a line, rate it pick / cut / rewrite. Names stay in this
// browser: the server sees {friend}, {partner}, {me}. Nothing is charged and
// nothing is shown to anyone else; Toasts stays dark until every occasion
// has toasts good enough to give.
import { createFileRoute, notFound } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { amIAdmin } from '@/lib/admin.functions'
import { labCutEval, labCutToast, labToastEvals, labTouchToast, labWriteToast, rateLabToast, type ToastLedger } from '@/lib/toasts.functions'
import { OCCASION, OCCASIONS, TONES, TONE_LABEL, clock, fromPlaceholders, toPlaceholders, toastSeconds, type Names, type Occasion, type Pronoun, type Tone, type ToastForm, type ToastLine } from '@/lib/toasts/shared'
import '@/components/feed/feed.css'

export const Route = createFileRoute('/toast-lab')({
  ssr: false,
  head: () => ({ meta: [...pageMeta('Toast lab — Shutap', 'Private bench for the toast writer.', '/toast-lab'), { name: 'robots', content: 'noindex' }] }),
  beforeLoad: async () => {
    try {
      if (!(await amIAdmin())) throw notFound()
    } catch {
      throw notFound()
    }
  },
  component: () => (
    <div data-ph-private style={{ display: 'contents' }}>
      <ToastLab />
    </div>
  ),
})

type Draft = { names: Names; relation: string; what: string; pronouns: { friend: Pronoun; partner: Pronoun }; stories: string[]; true_thing: string; tone: Tone; length: number; must: string; never: string }

/** One invented sample per occasion, to rate every occasion quickly. */
const SAMPLES: Record<Occasion, Omit<Draft, 'tone' | 'length' | 'never'>> = {
  best_man: { names: { friend: 'Dave', partner: 'Priya', me: 'Sam' }, relation: 'college roommate', what: '', pronouns: { friend: 'he', partner: 'she' }, stories: ['In college he color-coded his fridge.', 'He once spent 40 minutes parallel parking outside my place, then took the bus.', "The night he met Priya he called me from the bathroom to ask if 'nice to meet you' was too formal."], true_thing: "He's the guy who shows up. Every time.", must: 'thank the hosts, Go Bruins' },
  maid_of_honor: { names: { friend: 'Jess', partner: 'Marco', me: 'Ana' }, relation: 'best friend since sixth grade', what: '', pronouns: { friend: 'she', partner: 'he' }, stories: ['In sixth grade she ran for class president on a platform of longer lunch and won.', 'She has a spreadsheet for every trip we have ever taken, including the one to the mall.', 'When she met Marco she told me he was "fine" and then talked about him for three hours.'], true_thing: 'She has never once let me feel alone.', must: '' },
  parent: { names: { friend: 'Leo', partner: 'Maya', me: 'Carol' }, relation: 'mom', what: '', pronouns: { friend: 'he', partner: 'she' }, stories: ['When he was seven he tried to sell our lawn to the neighbors.', 'He called home every Sunday in college, mostly to ask how to do laundry.', ''], true_thing: 'Maya, we have loved you since the first dinner you came to.', must: 'welcome to the family' },
  thanksgiving: { names: { friend: 'the family', me: 'Grandpa Joe' }, relation: 'family', what: '', pronouns: { friend: 'they', partner: 'they' }, stories: ['Last year the turkey caught fire and we ate pizza on the good plates.', 'Every year Grandpa carves, and every year he asks who brought the good knife.', 'This is the first year we all fit at one table.'], true_thing: 'Every one of you is the reason I cook.', must: '' },
  christmas: { names: { friend: 'the family', me: 'Nina' }, relation: 'family', what: '', pronouns: { friend: 'they', partner: 'they' }, stories: ['The year Dad assembled the bike on Christmas Eve and had three screws left over.', 'Every year Mom hides one present so well we find it in March.', 'This is the first Christmas the cousins all made it home.'], true_thing: 'Being in this room is the present.', must: '' },
  holiday_party: { names: { friend: 'the team', me: 'Priya' }, relation: 'team lead', what: '', pronouns: { friend: 'they', partner: 'they' }, stories: ['We shipped the new app in March and the servers stayed up.', 'The day the coffee machine broke and we held stand-up in the parking lot.', 'You covered for each other every time someone was out.'], true_thing: 'I would build anything with this team.', must: 'thank you to the ops crew' },
  new_years: { names: { friend: 'everybody', me: 'Ken' }, relation: 'friends', what: '', pronouns: { friend: 'they', partner: 'they' }, stories: ['This year half of us moved, two of us got engaged and one of us learned to make sourdough.', 'We booked the cabin for the wrong weekend and slept in the car.', 'Next year, one trip together. On the right weekend.'], true_thing: 'Same people next year. That is the whole wish.', must: '' },
  retirement: { names: { friend: 'Linda', me: 'Tom' }, relation: 'manager for twelve years', what: '', pronouns: { friend: 'she', partner: 'they' }, stories: ['She has answered every email within four minutes since 2009.', 'She keeps a drawer of snacks for anyone having a bad day.', 'She trained half the people in this room, including me.'], true_thing: 'Most of us are good at this job because of you.', must: 'enjoy the boat' },
  birthday: { names: { friend: 'Mike', me: 'Rosa' }, relation: 'husband', what: '', pronouns: { friend: 'he', partner: 'they' }, stories: ['He reads the instructions after he has built the furniture.', 'He waves at every dog like it knows him.', ''], true_thing: 'Every year with you is my favorite one so far.', must: 'happy 40th' },
  toastmasters: { names: { friend: 'my group chat', me: 'Dana' }, relation: 'friends', what: '', pronouns: { friend: 'they', partner: 'they' }, stories: ['I asked my group chat to help me name my dog and got 140 messages and no name.', 'One friend made a poll, another made a counter-poll.', 'The dog answered to "hey" for six weeks.'], true_thing: 'Some decisions are better made alone, but I would not trade the chat.', must: '' },
  other: { names: { friend: 'Coach Reyes', me: 'Jamie' }, relation: 'coach', what: 'end-of-season team dinner', pronouns: { friend: 'he', partner: 'they' }, stories: ['He made us run laps for being early because early was "showing off".', 'He knows every kid’s middle name and uses it when we mess up.', ''], true_thing: 'He made all of us want to be on time for something.', must: '' },
}

function draftFor(o: Occasion): Draft {
  const s = SAMPLES[o]
  return { ...s, stories: [...s.stories], tone: 'warm_funny', length: OCCASION[o].defaultLength, never: OCCASION[o].neverSay.join(', ') }
}

type Run = { label: string; names: Names; busy: boolean; result?: Awaited<ReturnType<typeof labWriteToast>>; error?: string; rated?: string; saved?: 'saving' | 'saved' | 'failed'; touch?: { index: number; busy: boolean; options?: { line: string; move: string }[]; error?: string } }

const box = { height: 38, borderRadius: 12, border: '1px solid #e9d3dc', padding: '0 12px', boxSizing: 'border-box', width: '100%', font: 'inherit' } as const

function ToastLab() {
  const [occasion, setOccasion] = useState<Occasion>('best_man')
  const [d, setD] = useState<Draft>(() => draftFor('best_man'))
  const [runs, setRuns] = useState<Run[]>([])
  const [ledger, setLedger] = useState<ToastLedger | null>(null)
  const [storyTouch, setStoryTouch] = useState<{ index: number; busy: boolean; options?: { line: string; move: string }[] } | null>(null)
  const spec = OCCASION[occasion]

  useEffect(() => { labToastEvals({ data: {} }).then(setLedger).catch(() => {}) }, [runs.length])

  function pick(o: Occasion) { setOccasion(o); setD(draftFor(o)); setStoryTouch(null) }
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  /** What the server gets: the names swapped out, here in the browser. */
  function formOf(x: Draft): ToastForm {
    const ph = (t: string) => toPlaceholders(t, x.names)
    return {
      occasion,
      what: occasion === 'other' ? ph(x.what) : undefined,
      relation: ph(x.relation),
      pronouns: { friend: x.pronouns.friend, ...(spec.partner ? { partner: x.pronouns.partner } : {}) },
      stories: x.stories.slice(0, spec.stories).map(ph),
      true_thing: ph(x.true_thing),
      tone: x.tone,
      length: x.length,
      must_say: x.must.split(',').map((s) => ph(s.trim())).filter(Boolean),
      never_say: x.never.split(',').map((s) => s.trim()).filter(Boolean),
    }
  }

  async function write(tones: Tone[]) {
    const start = runs.length
    const names = { ...d.names }
    setRuns((r) => [...r, ...tones.map((t) => ({ label: `${spec.label} · ${TONE_LABEL[t]} · ${clock(d.length)}`, names, busy: true }))])
    await Promise.all(tones.map(async (tone, i) => {
      try {
        const result = await labWriteToast({ data: { form: formOf({ ...d, tone }) } })
        setRuns((r) => r.map((x, j) => (j === start + i ? { ...x, busy: false, result } : x)))
      } catch (e) {
        setRuns((r) => r.map((x, j) => (j === start + i ? { ...x, busy: false, error: e instanceof Error ? e.message : 'failed' } : x)))
      }
    }))
  }

  async function rate(i: number, rating: 'pick' | 'cut' | 'rewrite') {
    const run = runs[i]
    if (!run?.result?.ok || !run.result.eval_id) return
    const evalId = run.result.eval_id
    setRuns((r) => r.map((x, j) => (j === i ? { ...x, rated: rating, saved: 'saving' } : x)))
    try {
      const res = await rateLabToast({ data: { eval_id: evalId, rating } })
      setRuns((r) => r.map((x, j) => (j === i ? { ...x, saved: res.ok ? 'saved' : 'failed' } : x)))
      if (res.ok) labToastEvals({ data: {} }).then(setLedger).catch(() => {})
    } catch {
      setRuns((r) => r.map((x, j) => (j === i ? { ...x, saved: 'failed' } : x)))
    }
  }

  async function touchLine(i: number, index: number) {
    const run = runs[i]
    if (!run?.result?.ok) return
    const { form, result } = run.result
    setRuns((r) => r.map((x, j) => (j === i ? { ...x, touch: { index, busy: true } } : x)))
    try {
      const res = await labTouchToast({ data: { form, kind: 'speech', index, lines: result.toast.lines } })
      setRuns((r) => r.map((x, j) => (j === i ? { ...x, touch: { index, busy: false, ...(res.ok ? { options: res.options } : { error: 'no options passed the checks' }) } } : x)))
    } catch (e) {
      setRuns((r) => r.map((x, j) => (j === i ? { ...x, touch: { index, busy: false, error: e instanceof Error ? e.message : 'failed' } } : x)))
    }
  }

  async function touchStory(index: number) {
    setStoryTouch({ index, busy: true })
    try {
      const res = await labTouchToast({ data: { form: formOf(d), kind: 'story', index } })
      setStoryTouch({ index, busy: false, options: res.ok ? res.options : [] })
    } catch {
      setStoryTouch({ index, busy: false, options: [] })
    }
  }

  return (
    <div className="fd">
      <div className="fd-col" style={{ maxWidth: 940 }}>
        <h1 className="fd-h1">Toast lab</h1>
        <p className="fd-muted" style={{ margin: 0 }}>
          Admin only. Shutap Toasts, before anyone sees it: load an occasion's sample (or type your own), write it, rate it. The real pipeline runs: the Guard, the Scrubber, two writers, the checks, the judge. Names stay in this browser. Nothing charged.
        </p>
        {ledger && (
          <p style={{ margin: 0, fontSize: 13 }}>
            <b>{ledger.total}</b> toasts so far · pick {ledger.pick} · cut {ledger.cut} · rewrite {ledger.rewrite} · unrated {ledger.unrated}
            <br />
            {OCCASIONS.map((o) => { const b = ledger.by_occasion[o]; return <span key={o} style={{ marginRight: 12, color: b?.pick ? '#2e8b57' : '#8f898d' }}>{OCCASION[o].label}: {b ? `${b.pick} pick / ${b.pick + b.cut + b.rewrite} rated` : '—'}</span> })}
          </p>
        )}
        {ledger && ledger.uncut.length > 0 && <UncutPicks list={ledger.uncut} onDone={() => labToastEvals({ data: {} }).then(setLedger).catch(() => {})} />}

        <section className="fd-post" style={{ gap: 12 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {OCCASIONS.map((o) => <button key={o} type="button" className="fd-chip" aria-pressed={o === occasion} onClick={() => pick(o)}>{OCCASION[o].label}</button>)}
          </div>
          <p className="fd-muted" style={{ margin: 0, fontSize: 12.5 }}>{spec.structure.join(' → ')}{spec.check ? ` · check: ${spec.check}` : ''}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>{spec.who}<input style={box} value={d.names.friend} onChange={(e) => set('names', { ...d.names, friend: e.target.value })} /></label>
            <label style={{ fontSize: 13, fontWeight: 700 }}>{spec.relation}<input style={box} value={d.relation} onChange={(e) => set('relation', e.target.value)} /></label>
            <label style={{ fontSize: 13, fontWeight: 700 }}>your first name<input style={box} value={d.names.me} onChange={(e) => set('names', { ...d.names, me: e.target.value })} /></label>
            {spec.partner && <label style={{ fontSize: 13, fontWeight: 700 }}>who they're marrying<input style={box} value={d.names.partner ?? ''} onChange={(e) => set('names', { ...d.names, partner: e.target.value })} /></label>}
            {occasion === 'other' && <label style={{ fontSize: 13, fontWeight: 700 }}>what the occasion is<input style={box} value={d.what} onChange={(e) => set('what', e.target.value)} /></label>}
            <div style={{ fontSize: 13, fontWeight: 700 }}>pronouns
              <div style={{ display: 'flex', gap: 4 }}>{(['he', 'she', 'they'] as Pronoun[]).map((p) => <button key={p} type="button" className="fd-chip" aria-pressed={d.pronouns.friend === p} onClick={() => set('pronouns', { ...d.pronouns, friend: p })}>{p}</button>)}</div>
            </div>
            {spec.partner && <div style={{ fontSize: 13, fontWeight: 700 }}>their partner's
              <div style={{ display: 'flex', gap: 4 }}>{(['he', 'she', 'they'] as Pronoun[]).map((p) => <button key={p} type="button" className="fd-chip" aria-pressed={d.pronouns.partner === p} onClick={() => set('pronouns', { ...d.pronouns, partner: p })}>{p}</button>)}</div>
            </div>}
          </div>

          {Array.from({ length: spec.stories }, (_, i) => (
            <div key={i} style={{ display: 'grid', gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 700 }}>story {i + 1}{spec.stories > 1 && i === spec.stories - 1 ? ' (optional: empty gets a bridge)' : ''}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={box} value={d.stories[i] ?? ''} onChange={(e) => { const s = [...d.stories]; s[i] = e.target.value; set('stories', s) }} />
                <button type="button" className="fd-chip" disabled={!d.stories[i]?.trim() || storyTouch?.busy} onClick={() => void touchStory(i)}>funnier</button>
              </div>
              {storyTouch?.index === i && (
                <div style={{ fontSize: 13, display: 'grid', gap: 4, paddingLeft: 8 }}>
                  {storyTouch.busy ? <span className="fd-muted">three ways…</span> : storyTouch.options?.length ? (
                    <>
                      <span className="fd-muted">keep it as it is, or:</span>
                      {storyTouch.options.map((o, k) => <button key={k} type="button" className="fd-chip" style={{ textAlign: 'left', height: 'auto', padding: '6px 10px' }} onClick={() => { const s = [...d.stories]; s[i] = fromPlaceholders(o.line, d.names); set('stories', s); setStoryTouch(null) }}>{fromPlaceholders(o.line, d.names)} <span className="fd-muted">· {o.move}</span></button>)}
                    </>
                  ) : <span style={{ color: '#b3261e' }}>no options passed the checks</span>}
                </div>
              )}
            </div>
          ))}

          <label style={{ fontSize: 13, fontWeight: 700 }}>the one true thing (the ending, word for word)<input style={box} value={d.true_thing} onChange={(e) => set('true_thing', e.target.value)} /></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>must say (comma-separated)<input style={box} value={d.must} onChange={(e) => set('must', e.target.value)} /></label>
            <label style={{ fontSize: 13, fontWeight: 700 }}>never say<input style={box} value={d.never} onChange={(e) => set('never', e.target.value)} /></label>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>length</span>
            {spec.lengths.map((s) => <button key={s} type="button" className="fd-chip" aria-pressed={d.length === s} onClick={() => set('length', s)}>{spec.range ? `${clock(spec.range[0])}–${clock(spec.range[1])}` : s < 60 ? `${s}s` : clock(s)}</button>)}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TONES.map((t) => <button key={t} type="button" className="fd-chip" onClick={() => void write([t])}>write · {TONE_LABEL[t]}</button>)}
            <button type="button" className="fd-chip" aria-pressed onClick={() => void write([...TONES])}>write all four tones</button>
          </div>
        </section>

        {runs.map((run, i) => (
          <section key={i} className="fd-post" style={{ gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <b>{run.label}</b>
              {run.busy ? <span className="fd-muted">writing… (Guard, Scrubber, two writers, the judge)</span>
                : run.error ? <span style={{ color: '#b3261e' }}>{run.error}</span>
                : run.result && !run.result.ok ? <span style={{ color: '#b3261e' }}>{run.result.reason === 'crisis' ? 'the Guard stopped it (crisis)' : 'no speech passed the checks'}</span>
                : run.result?.ok ? <span className="fd-muted" style={{ fontSize: 12.5 }}>{Math.round(run.result.result.ms / 1000)}s to write · {run.result.prompt_version} · winner: {run.result.result.candidates[run.result.result.winner]?.model} · {run.result.result.why}</span> : null}
            </div>
            {run.result && !run.result.ok && run.result.form && <p className="fd-muted" style={{ margin: 0, fontSize: 12.5 }}>scrubbed form: {run.result.form.stories.join(' · ')}</p>}
            {run.result?.ok && <Result run={run} onTouch={(index) => void touchLine(i, index)} onRate={(r) => void rate(i, r)} />}
          </section>
        ))}
      </div>
    </div>
  )
}

const serif = { fontFamily: 'Newsreader, Georgia, serif', fontSize: 17, lineHeight: 1.45, margin: 0 } as const

function Lines({ lines, names, onTouch, touchIndex }: { lines: ToastLine[]; names: Names; onTouch?: (i: number) => void; touchIndex?: number }) {
  let t = 0
  return (
    <div style={{ display: 'grid', gap: 2 }}>
      {lines.map((l, k) => {
        const at = t
        t += toastSeconds([l])
        const mine = l.source === 'story' || l.source === 'true_thing'
        return (
          <div key={k} style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 8, padding: '6px 0', borderBottom: '1px solid #f3e3ea', alignItems: 'start' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#c1216b' }}>{clock(at)}</span>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#8f898d' }}>{fromPlaceholders(l.section, names)}{mine ? ' · theirs, word for word' : l.source === 'bridge' ? ' · bridge' : ''}</div>
              <p style={{ ...serif, ...(mine ? { background: '#f3f8f4', border: '1.5px solid #2f8a55', borderRadius: 8, padding: '2px 8px' } : {}) }}>
                {fromPlaceholders(l.text, names)}
                {l.pause && <b style={{ color: '#c1216b' }}> ‖</b>}
                {l.laugh && <b style={{ color: '#c1216b', fontSize: 13 }}> (wait)</b>}
                {l.glass && <b style={{ color: '#c1216b', fontSize: 13 }}> ↑ glasses</b>}
              </p>
              {l.note && <div style={{ fontSize: 12, color: '#9b3559' }}>{fromPlaceholders(l.note, names)}</div>}
            </div>
            {onTouch && !mine ? <button type="button" className="fd-chip" aria-pressed={touchIndex === k} onClick={() => onTouch(k)}>funnier</button> : <span />}
          </div>
        )
      })}
    </div>
  )
}

/** Picks with no 60-second version: the page demo shows one only once it is made and kept. */
function UncutPicks({ list, onDone }: { list: ToastLedger['uncut']; onDone: () => void }) {
  const [state, setState] = useState<Record<string, string>>({})
  async function make(id: string) {
    setState((s) => ({ ...s, [id]: 'cutting…' }))
    try {
      const r = await labCutEval({ data: { eval_id: id } })
      setState((s) => ({ ...s, [id]: r.ok ? `kept · ${clock(r.seconds)}` : `failed: ${r.checks.map((c) => c.rule + (c.line ? ` (“${c.line.slice(0, 50)}”)` : '')).join(' · ')}` }))
      if (r.ok) onDone()
    } catch (e) { setState((s) => ({ ...s, [id]: e instanceof Error ? e.message : 'failed' })) }
  }
  return (
    <div className="fd-post" style={{ gap: 6, fontSize: 13 }}>
      <b>Picks with no 60-second version (the page demo needs one)</b>
      {list.map((p) => (
        <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{OCCASION[p.occasion as Occasion]?.label ?? p.occasion}{p.relation ? ` · ${p.relation}` : ''}</span>
          <button type="button" className="fd-chip" data-cut-eval={p.id} disabled={state[p.id] === 'cutting…'} onClick={() => void make(p.id)}>make it</button>
          {state[p.id] && <span data-cut-state={p.id} style={{ color: state[p.id]!.startsWith('kept') ? '#2e8b57' : state[p.id] === 'cutting…' ? '#8f898d' : '#b3261e' }}>{state[p.id]}</span>}
        </div>
      ))}
    </div>
  )
}

/** On demand: the cut is written only when this is tapped (as in the product). */
function Cut({ form, lines, names }: { form: ToastForm; lines: ToastLine[]; names: Names }) {
  const [state, setState] = useState<{ busy: boolean; res?: Awaited<ReturnType<typeof labCutToast>>; error?: string }>({ busy: false })
  async function make() {
    setState({ busy: true })
    try { setState({ busy: false, res: await labCutToast({ data: { form, lines } }) }) } catch (e) { setState({ busy: false, error: e instanceof Error ? e.message : 'failed' }) }
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="fd-chip" aria-pressed disabled={state.busy} onClick={() => void make()}>{state.busy ? 'cutting…' : state.res ? 'make it again' : 'make a 60-second version'}</button>
        {state.res?.ok && <span className="fd-muted" style={{ fontSize: 12.5 }}>{clock(state.res.cut.seconds)} · {state.res.cut.model}{state.res.cut.checks.length ? ` · ${state.res.cut.checks.map((c) => c.rule).join(' · ')}` : ''}</span>}
        {state.res && !state.res.ok && <span style={{ color: '#b3261e', fontSize: 12.5 }}>no cut passed the checks{state.res.checks?.length ? `: ${state.res.checks.filter((c) => c.fatal).map((c) => c.rule + (c.line ? ` (“${c.line.slice(0, 60)}”)` : '')).join(' · ')}` : ''}</span>}
        {state.error && <span style={{ color: '#b3261e', fontSize: 12.5 }}>{state.error}</span>}
      </div>
      {state.res?.ok && <Lines lines={state.res.cut.lines} names={names} />}
    </div>
  )
}

function Result({ run, onTouch, onRate }: { run: Run; onTouch: (i: number) => void; onRate: (r: 'pick' | 'cut' | 'rewrite') => void }) {
  const [tab, setTab] = useState<'speech' | 'cut60' | 'cards' | 'after'>('speech')
  if (!run.result?.ok) return null
  const { result, form, eval_id } = run.result
  const { toast } = result
  const names = run.names
  const winner = result.candidates[result.winner]
  return (
    <>
      <p style={{ margin: 0, fontSize: 13 }}>
        <b>{clock(result.seconds)}</b> of {clock(form.length)} target
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(['speech', 'cut60', 'cards', 'after'] as const).map((t) => <button key={t} type="button" className="fd-chip" aria-pressed={tab === t} onClick={() => setTab(t)}>{t === 'speech' ? 'the speech' : t === 'cut60' ? '60-second cut' : t === 'cards' ? 'cue cards' : 'the text after'}</button>)}
      </div>
      {tab === 'speech' && <Lines lines={toast.lines} names={names} onTouch={onTouch} touchIndex={run.touch?.index} />}
      {tab === 'speech' && run.touch && (
        <div style={{ border: '1.5px solid #c1216b', borderRadius: 12, padding: 10, display: 'grid', gap: 6 }}>
          <span className="fd-muted" style={{ fontSize: 12 }}>funnier on line {run.touch.index + 1} · keep it as it is, or:</span>
          {run.touch.busy ? <span className="fd-muted">three ways…</span> : run.touch.error ? <span style={{ color: '#b3261e' }}>{run.touch.error}</span> : run.touch.options?.map((o, k) => <p key={k} style={serif}>{k + 1}. {fromPlaceholders(o.line, names)} <span className="fd-muted" style={{ fontSize: 12 }}>· {o.move}</span></p>)}
        </div>
      )}
      {tab === 'cut60' && <Cut form={form} lines={toast.lines} names={names} />}
      {tab === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {toast.cards.map((c, k) => (
            <div key={k} style={{ border: '1px dashed #b9a9b0', borderRadius: 8, padding: 10 }}>
              <b style={{ color: '#c1216b' }}>{k + 1} · {fromPlaceholders(c.title, names)}</b>
              {c.keys.map((x, j) => <div key={j} style={{ fontSize: 13 }}>· {fromPlaceholders(x, names)}</div>)}
              <p style={{ ...serif, fontWeight: 700, fontSize: 15, marginTop: 6 }}>{fromPlaceholders(c.land, names)}</p>
            </div>
          ))}
        </div>
      )}
      {tab === 'after' && <p style={serif}>{fromPlaceholders(toast.text_after, names)}</p>}
      {toast.flags.length > 0 && <p style={{ margin: 0, fontSize: 12.5, color: '#9b3559' }}>writer's flags: {toast.flags.map((f) => `${fromPlaceholders(f.line, names)} — ${f.why}`).join(' · ')}</p>}
      <details>
        <summary style={{ fontSize: 13, cursor: 'pointer' }}>candidates and checks</summary>
        {result.candidates.map((c, k) => (
          <p key={k} style={{ margin: '4px 0', fontSize: 12.5 }}>
            <b>{k === result.winner ? '★ ' : ''}{c.model}</b> · {Math.round(c.ms / 1000)}s · {clock(c.seconds)} · {c.checks.length ? c.checks.map((f) => `${f.fatal ? '✗' : '·'} ${f.rule} (${f.where})`).join(' · ') : 'all checks passed'}
          </p>
        ))}
        {winner && <p className="fd-muted" style={{ margin: '4px 0', fontSize: 12 }}>✗ = rejected the speech · = noted only</p>}
      </details>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, fontWeight: 700 }}>rate this toast:</span>
        {(['pick', 'cut', 'rewrite'] as const).map((r) => (
          <button key={r} type="button" className="fd-chip" aria-pressed={run.rated === r} disabled={run.saved === 'saving' || !eval_id} onClick={() => onRate(r)} style={run.rated === r ? { background: '#c1216b', color: '#fff', borderColor: '#c1216b' } : undefined}>
            {run.rated === r ? '✓ ' : ''}{r}
          </button>
        ))}
        {run.saved === 'saving' && <span className="fd-muted" style={{ fontSize: 12.5 }}>saving…</span>}
        {run.saved === 'saved' && <span style={{ fontSize: 12.5, color: '#2e8b57', fontWeight: 700 }}>saved</span>}
        {run.saved === 'failed' && <span style={{ fontSize: 12.5, color: '#b00020', fontWeight: 700 }}>not saved · tap again</span>}
        {!eval_id && <span className="fd-muted" style={{ fontSize: 12.5 }}>not stored</span>}
      </div>
      <p className="fd-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>pick = you'd stand up and say it as written · rewrite = right idea, you'd change lines · cut = not funny, not true to the stories, or not sayable.</p>
    </>
  )
}
