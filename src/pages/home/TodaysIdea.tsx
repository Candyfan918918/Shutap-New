import { useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { DailyIdea, Interest, Platform, SignalTopic } from '@/lib/daily-idea.functions'
import { momentum, rankTopics } from './trend-data'

const PLATFORMS: { key: Platform; name: string }[] = [
  { key: 'news', name: 'News' }, { key: 'tiktok', name: 'TikTok' }, { key: 'instagram', name: 'Instagram' },
  { key: 'youtube', name: 'YouTube' }, { key: 'x', name: 'X' }, { key: 'reddit', name: 'Reddit' },
]
const LEVELS = ['quiet', 'some', 'busy', 'hot']
const ARROWS = { rising: '↑', peaking: '▲', steady: '→', cooling: '↓' }
const number = (n: number) => n.toLocaleString('en-US')
const formatDay = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const titleCase = (text: string) => text.replace(/\b\w/g, (c) => c.toUpperCase())

function ChangeBadge({ topic }: { topic: SignalTopic }) {
  const direction = topic.direction ?? 'steady'
  const change = topic.interest?.change
  return <span className={`ti-badge ti-${direction}`} aria-label={`${direction}${change == null ? '' : `, ${change}%`}`}>
    {ARROWS[direction]} {change == null ? direction : `${Math.abs(change)}%`}
  </span>
}

function AreaChart({ interest, hero = false }: { interest: Interest; hero?: boolean }) {
  const id = useId().replaceAll(':', '')
  const width = hero ? 1000 : 120
  const height = hero ? 140 : 32
  const bottom = hero ? 116 : 30
  const top = hero ? 26 : 4
  const right = hero ? 60 : 4
  const max = Math.max(...interest.series.map((i) => i.views), 1)
  const points = interest.series.map((i, n) => ({ x: 4 + n / Math.max(1, interest.series.length - 1) * (width - right - 4), y: bottom - i.views / max * (bottom - top) }))
  const last = points.at(-1)
  const reading = interest.series.at(-1)
  if (!last || !reading) return null
  const path = points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')
  return <div className={hero ? 'ti-hero-chart' : 'ti-spark'}>
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${hero ? '14-day interest' : 'Interest trend'}: ${number(reading.views)} views on ${formatDay(reading.date)}`}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" className="ti-gradient-start" /><stop offset="100%" className="ti-gradient-end" /></linearGradient></defs>
      {hero ? <rect x={width / 2} y="0" width={width / 2} height={bottom} className="ti-week-band" /> : null}
      <path d={`${path} L ${last.x} ${bottom} L 4 ${bottom} Z`} fill={`url(#${id})`} />
      <path d={path} className="ti-chart-line" vectorEffect="non-scaling-stroke" />
      <circle cx={last.x} cy={last.y} r={hero ? 4 : 2.5} className="ti-chart-dot" />
    </svg>
    {hero ? <><span className="ti-chart-value" style={{ top: `${last.y / height * 100}%` }}>{number(reading.views)}</span><div className="ti-week-labels"><span>last week</span><span>this week</span></div></> : null}
  </div>
}

function Leaderboard({ topics }: { topics: SignalTopic[] }) {
  return <section className="ti-leaderboard"><h3 className="ti-label">trending now</h3>
    {topics.map((topic, i) => <div key={topic.topic} className={`ti-ranked ${topic.chosen ? 'ti-picked' : ''}`}>
      <span className="ti-rank">{i + 1}</span>
      <div className="ti-topic-name"><strong>{topic.topic}</strong>{topic.chosen ? <span className="ti-pick">today's pick</span> : null}{topic.note ? <p className="ti-note">{topic.note}</p> : null}</div>
      <div className="ti-row-stats">{topic.interest ? <AreaChart interest={topic.interest} /> : null}<ChangeBadge topic={topic} /></div>
      {topic.interest?.change != null ? <div className={`ti-momentum ${topic.interest.change < 0 ? 'ti-down' : ''}`} aria-hidden><span style={{ width: `${momentum(topic.interest.change)}%` }} /></div> : null}
    </div>)}
  </section>
}

function Attention({ topics }: { topics: SignalTopic[] }) {
  const series = topics.find((topic) => topic.interest)?.interest?.series
  if (!series) return null
  return <section className="ti-attention"><h3 className="ti-label">the last 14 days</h3>
    <div className="ti-dates"><span />{series.map((day, i) => <span key={day.date} className={i === series.length - 1 ? 'ti-latest' : ''}>{new Date(`${day.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' })}</span>)}</div>
    {topics.map((topic) => { const max = Math.max(...(topic.interest?.series.map((d) => d.views) ?? [1]), 1)
      return <div key={topic.topic} className="ti-heat-row"><span className="ti-heat-name">{topic.topic}</span>{topic.interest ? series.map((date) => { const day = topic.interest?.series.find((d) => d.date === date.date); return day ? <span key={day.date} className={`ti-heat ti-level-${Math.min(4, Math.floor(day.views / max * 4))}`} title={`${formatDay(day.date)}: ${number(day.views)} views`} aria-label={`${formatDay(day.date)}: ${number(day.views)} views`} /> : <span key={date.date} /> }) : <span className="ti-no-reading">no reading</span>}</div>
    })}<p className="ti-heat-legend">fewer → more views (per topic)</p>
  </section>
}

function ShowingUp({ topics }: { topics: SignalTopic[] }) {
  const rows = topics.map((topic) => ({ topic, levels: PLATFORMS.filter((p) => { const v = topic.heat?.[p.key]; return v != null && Number.isInteger(v) && v >= 0 && v <= 3 }) })).filter((row) => row.levels.length)
  if (!rows.length) return null
  return <section className="ti-showing"><h3 className="ti-label">where it's showing up</h3>{rows.map(({ topic, levels }) => <div key={topic.topic} className="ti-platform-row"><strong>{topic.topic}</strong><div>{levels.map((p) => <span className="ti-platform-chip" key={p.key}>{p.name} · {LEVELS[topic.heat?.[p.key] ?? 0]}</span>)}</div></div>)}</section>
}

export function TodaysIdea({ idea }: { idea: DailyIdea | null }) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  useEffect(() => { if (idea && window.location.hash === '#today') requestAnimationFrame(() => document.getElementById('today')?.scrollIntoView()) }, [idea])
  if (!idea) return null
  const topics = rankTopics(idea.signals?.topics?.filter((t) => t && t.topic) ?? [])
  const chosen = topics.find((t) => t.chosen) ?? topics[0] ?? { topic: idea.topic }
  const copy = async () => { try { await navigator.clipboard.writeText(`HOOK: ${idea.hook}\n\n${idea.bit}\n\nTAG: ${idea.tag}`); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* clipboard blocked */ } }
  const writeYours = (e: React.MouseEvent) => { e.preventDefault(); const box = document.querySelector('textarea'); if (!box) return; box.scrollIntoView({ behavior: 'smooth', block: 'center' }); box.focus({ preventScroll: true }) }
  return <section id="today" className="todays-idea" aria-label="what to post today"><div className="ti-inner">
    <header className="ti-header"><div className="ti-eyebrow">what to post today · {formatDay(idea.day)}</div><h2 className="ti-headline">{titleCase(chosen.topic)}</h2>
      <div className="ti-stats"><ChangeBadge topic={chosen} />{chosen.interest ? <>{chosen.interest.change != null ? <span>interest this week vs last</span> : null}<span>people reading about it this week: <strong>{number(chosen.interest.thisWeek)}</strong></span></> : null}</div>
      {chosen.interest ? <AreaChart interest={chosen.interest} hero /> : null}
      {idea.why_now ? <><div className="ti-label">why today</div><p className="ti-why">{idea.why_now}</p></> : null}
    </header>
    <div className="ti-content"><div className="ti-insights">{topics.length ? <Leaderboard topics={topics} /> : null}<Attention topics={topics} /><ShowingUp topics={topics} />
      {chosen.sources?.length ? <div className="ti-sources">{chosen.sources.map((s, i) => <a key={i} href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>)}</div> : null}
      <p className="ti-foot">interest = English Wikipedia page views, read live, updated daily. topics and notes from this morning's search of public coverage.</p>
    </div>
    <aside className="ti-demo"><h3 className="ti-label">demo: today's bit</h3><p className="ti-demo-hook">{idea.hook}</p><div className={`ti-demo-text ${expanded ? 'ti-expanded' : ''}`}><p>{idea.bit}</p></div><Button variant="ghost" className="ti-read-all" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'read less' : 'read all'}</Button><p className="ti-tag">{idea.tag}</p><div className="ti-actions"><Button className="ti-copy" onClick={copy}>{copied ? 'copied' : 'copy'}</Button><a href="#" className="ti-write" onClick={writeYours}>write yours ↑</a></div><p className="ti-foot">new one every morning. film it, it's yours.</p></aside>
    </div></div></section>
}
