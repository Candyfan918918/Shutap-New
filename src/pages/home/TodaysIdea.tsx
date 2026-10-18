// "what to post today": a quiet trend panel under the write box.
// Matches the write box: white cards, hairline borders, Sora UI, Newsreader
// for the words people read, pink only as an accent (badges, the line, one CTA).
import { useEffect, useId, useState } from 'react'
import type { DailyIdea, Interest, SignalTopic } from '@/lib/daily-idea.functions'
import { rankTopics } from './trend-data'
import './todays-idea.css'

const ARROW = { rising: '↑', peaking: '↑', steady: '→', cooling: '↓' } as const
const num = (n: number) => n.toLocaleString('en-US')
const dayLabel = (day: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' })
const sentence = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

function Badge({ topic, long = false }: { topic: SignalTopic; long?: boolean }) {
  const dir = topic.direction ?? 'steady'
  const change = topic.interest?.change ?? null
  const arrow = change != null && change < 0 ? '↓' : ARROW[dir]
  const pct = change == null ? null : `${change > 0 ? '+' : ''}${change}%`
  const text = long ? [dir, pct && `${pct} this week`].filter(Boolean).join(' · ') : pct ?? dir
  const tone = change != null ? (change > 0 ? 'up' : change < 0 ? 'down' : 'flat') : dir === 'cooling' ? 'down' : dir === 'steady' ? 'flat' : 'up'
  return <span className={`tdi-badge tdi-${tone}`}>{arrow} {text}</span>
}

function Chart({ interest, hero = false }: { interest: Interest; hero?: boolean }) {
  const id = useId().replace(/:/g, '')
  const s = interest.series
  const w = hero ? 600 : 96
  const h = hero ? 96 : 28
  const max = Math.max(...s.map((d) => d.views), 1)
  const pts = s.map((d, i) => [(i / Math.max(1, s.length - 1)) * w, h - 4 - (d.views / max) * (h - 12)] as const)
  const last = s.at(-1)
  if (!last || pts.length < 2) return null
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <div className={hero ? 'tdi-hero-chart' : 'tdi-spark'}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img"
        aria-label={`Interest over ${s.length} days; ${num(last.views)} views on ${dayLabel(last.date, { month: 'short', day: 'numeric' })}`}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--tdi-pink)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--tdi-pink)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {hero ? <rect x={w / 2} y="0" width={w / 2} height={h} className="tdi-week" /> : null}
        <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
        <path d={line} className="tdi-line" vectorEffect="non-scaling-stroke" />
      </svg>
      {hero ? (
        <div className="tdi-chart-legend">
          <span>last week</span>
          <span>this week · {num(interest.thisWeek)} views</span>
        </div>
      ) : null}
    </div>
  )
}

function Heatmap({ topics }: { topics: SignalTopic[] }) {
  const dates = topics.find((t) => t.interest)?.interest?.series.map((d) => d.date)
  if (!dates) return null
  return (
    <div className="tdi-block">
      <div className="tdi-block-head">
        <h4 className="tdi-label">the last 14 days</h4>
        <span className="tdi-meta">lighter = fewer views, per topic</span>
      </div>
      <div className="tdi-heat" role="table" aria-label="Daily interest per topic">
        {topics.map((t) => {
          const series = t.interest?.series ?? []
          const max = Math.max(...series.map((d) => d.views), 1)
          return (
            <div className="tdi-heat-row" role="row" key={t.topic}>
              <span className={`tdi-heat-name ${t.chosen ? 'tdi-strong' : ''}`} role="rowheader">{t.topic}</span>
              {t.interest ? (
                dates.map((date) => {
                  const d = series.find((x) => x.date === date)
                  const lvl = d ? Math.min(4, Math.floor((d.views / max) * 4.999)) : -1
                  const label = d ? `${dayLabel(date, { month: 'short', day: 'numeric' })}: ${num(d.views)} views` : 'no reading'
                  return <span key={date} role="cell" className={`tdi-cell tdi-l${lvl}`} title={label} aria-label={label} />
                })
              ) : (
                <span className="tdi-meta tdi-none" role="cell">no reading</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function TodaysIdea({ idea }: { idea: DailyIdea | null }) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (idea && window.location.hash === '#today') requestAnimationFrame(() => document.getElementById('today')?.scrollIntoView())
  }, [idea])
  if (!idea) return null

  const topics = rankTopics(idea.signals?.topics?.filter((t) => t && t.topic) ?? [])
  const pick: SignalTopic = topics.find((t) => t.chosen) ?? topics[0] ?? { topic: idea.topic }
  const others = topics.filter((t) => t !== pick)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`HOOK: ${idea.hook}\n\n${idea.bit}\n\nTAG: ${idea.tag}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked */ }
  }
  const writeYours = (e: React.MouseEvent) => {
    e.preventDefault()
    const box = document.querySelector('textarea')
    if (!box) return
    box.scrollIntoView({ behavior: 'smooth', block: 'center' })
    box.focus({ preventScroll: true })
  }

  return (
    <section id="today" className="tdi" aria-labelledby="tdi-title">
      <div className="tdi-inner">
        <header className="tdi-head">
          <div>
            <div className="tdi-label">what to post today · {dayLabel(idea.day, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
            <h2 id="tdi-title" className="tdi-title">What people are talking about</h2>
          </div>
          <span className="tdi-meta">updated every morning</span>
        </header>

        <div className="tdi-grid">
          <article className="tdi-card tdi-main">
            <div className="tdi-pick">
              <div className="tdi-row">
                <span className="tdi-label tdi-accent">today's pick</span>
                <Badge topic={pick} long />
              </div>
              <h3 className="tdi-topic">{sentence(pick.topic)}</h3>
              {idea.why_now ? <p className="tdi-why">{idea.why_now}</p> : null}
            </div>

            {pick.interest ? <Chart interest={pick.interest} hero /> : null}

            {pick.sources?.length ? (
              <div className="tdi-sources">
                <span className="tdi-meta">sources</span>
                {pick.sources.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
                ))}
              </div>
            ) : null}

            {others.length ? (
              <div className="tdi-block">
                <h4 className="tdi-label">also trending</h4>
                <ol className="tdi-list">
                  {others.map((t, i) => (
                    <li key={t.topic} className="tdi-item">
                      <span className="tdi-rank">{i + 2}</span>
                      <div className="tdi-item-text">
                        <span className="tdi-item-name">{sentence(t.topic)}</span>
                        {t.note ? <span className="tdi-item-note">{t.note}</span> : null}
                      </div>
                      {t.interest ? <Chart interest={t.interest} /> : <span className="tdi-spark" />}
                      <Badge topic={t} />
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            <Heatmap topics={[pick, ...others]} />
          </article>

          <aside className="tdi-card tdi-demo" aria-label="demo: today's bit">
            <div className="tdi-label">demo · today's bit</div>
            <div className="tdi-stack">
              <span className="tdi-label tdi-accent">hook</span>
              <p className="tdi-hook">{idea.hook}</p>
            </div>
            <p className={`tdi-bit ${open ? 'tdi-open' : ''}`}>{idea.bit}</p>
            <button type="button" className="tdi-more" aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? 'show less ↑' : 'read all ↓'}
            </button>
            <div className="tdi-tag">
              <span className="tdi-label">tag</span>
              <p>{idea.tag}</p>
            </div>
            <div className="tdi-actions">
              <button type="button" className="tdi-btn" onClick={copy}>{copied ? 'copied' : 'copy'}</button>
              <a href="#" className="tdi-btn tdi-btn-primary" onClick={writeYours}>write yours ↑</a>
            </div>
            <span className="tdi-meta">new one every morning. film it, it's yours.</span>
          </aside>
        </div>

        <p className="tdi-foot">Interest = English Wikipedia page views, read live. Topics and notes from this morning's search of public coverage.</p>
      </div>
    </section>
  )
}
