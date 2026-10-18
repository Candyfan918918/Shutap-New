import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { DailyIdea, Interest, Platform, SignalTopic } from '@/lib/daily-idea.functions'

const PLATFORMS: { key: Platform; name: string }[] = [
  { key: 'news', name: 'News' }, { key: 'tiktok', name: 'TikTok' },
  { key: 'instagram', name: 'Instagram' }, { key: 'youtube', name: 'YouTube' },
  { key: 'x', name: 'X' }, { key: 'reddit', name: 'Reddit' },
]
const LEVELS = ['quiet', 'some', 'busy', 'hot'] as const
const DIRECTION: Record<string, string> = {
  rising: 'rising ↑', peaking: 'peaking ▲', steady: 'steady →', cooling: 'cooling ↓',
}
const number = (value: number) => value.toLocaleString('en-US')
const titleCase = (value: string) => value.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase())
const changeText = (value: number | null | undefined) => value == null ? '–' : `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value)}%`
function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}
function Direction({ topic }: { topic?: SignalTopic }) {
  return topic?.direction && DIRECTION[topic.direction]
    ? <span className={`ti-pill ti-dir ti-${topic.direction}`}>{DIRECTION[topic.direction]}</span> : null
}
function Sparkline({ interest }: { interest: Interest }) {
  const values = interest.series.map((day) => day.views)
  const min = Math.min(...values), max = Math.max(...values)
  const points = values.map((value, i) => ({ x: 3 + i * 114 / Math.max(1, values.length - 1), y: max === min ? 16 : 29 - (value - min) / (max - min) * 26 }))
  const last = points.at(-1)
  return <svg className="ti-spark" viewBox="0 0 120 32" width="120" height="32" aria-hidden="true">
    <polyline points={points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    {last ? <circle cx={last.x} cy={last.y} r="3" fill="currentColor" /> : null}
  </svg>
}
function Leaderboard({ topics }: { topics: SignalTopic[] }) {
  return <section className="ti-board" aria-label="trending now">
    <h3 className="ti-label">trending now</h3>
    <ol className="ti-ranking">
      {topics.map((topic, index) => {
        const href = topic.wiki ? `https://en.wikipedia.org/wiki/${encodeURIComponent(topic.wiki)}` : topic.sources?.find((source) => /^https?:\/\//.test(source.url))?.url
        const content = <>
          <span className="ti-rank">{index + 1}</span>
          <div className="ti-row-words"><div className="ti-name">{topic.topic}{topic.chosen ? <span className="ti-pill ti-pick">today's pick</span> : null}</div>
            {topic.note ? <p className="ti-note">{topic.note}</p> : null}</div>
          <div className="ti-reading">{topic.interest ? <><Sparkline interest={topic.interest} /><span className={`ti-change ${(topic.interest.change ?? 0) > 0 ? 'ti-up' : ''}`}>{changeText(topic.interest.change)}</span></> : null}</div>
          <div className="ti-row-direction"><Direction topic={topic} /></div>
        </>
        return <li key={`${topic.topic}-${index}`} className={topic.chosen ? 'ti-ranked ti-selected' : 'ti-ranked'}>
          {href ? <a className="ti-rank-link" href={href} target="_blank" rel="noopener noreferrer">{content}</a> : <div className="ti-rank-link">{content}</div>}
        </li>
      })}
    </ol>
  </section>
}
function Attention({ topics }: { topics: SignalTopic[] }) {
  const dates = [...new Set(topics.flatMap((topic) => topic.interest?.series.map((day) => day.date) ?? []))].sort().slice(-14)
  if (!dates.length) return null
  return <section className="ti-attention" aria-label="the last 14 days">
    <h3 className="ti-label">the last 14 days</h3>
    <div className="ti-days" aria-hidden="true">{dates.map((date, index) => <span key={date} className={index === dates.length - 1 ? 'ti-latest' : ''} title={formatDay(date)}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(`${date}T00:00:00Z`).getUTCDay()]}</span>)}</div>
    {topics.map((topic, index) => {
      const max = Math.max(...(topic.interest?.series.map((day) => day.views) ?? [0]))
      return <div className="ti-history" key={`${topic.topic}-${index}`}>
        <div className="ti-history-name">{topic.topic}</div>
        {topic.interest ? <div className="ti-tiles">{dates.map((date) => {
          const day = topic.interest?.series.find((value) => value.date === date)
          if (!day) return <span key={date} className="ti-tile ti-unavailable" />
          const level = max > 0 ? Math.min(4, Math.floor(day.views / max * 4)) : 0
          const label = `${formatDay(date)}: ${number(day.views)} views`
          return <span key={date} className={`ti-tile ti-level-${level}`} title={label} aria-label={label} role="img" />
        })}</div> : <p className="ti-no-reading">no reading</p>}
      </div>
    })}
    <p className="ti-scale"><span className="ti-scale-swatches" aria-hidden="true">{[0, 1, 2, 3, 4].map((level) => <span key={level} className={`ti-tile ti-level-${level}`} />)}</span>fewer → more views (per topic)</p>
  </section>
}
function ShowingUp({ topics }: { topics: SignalTopic[] }) {
  const rows = topics.map((topic) => ({ topic, platforms: PLATFORMS.filter((platform) => {
    const heat = topic.heat?.[platform.key]
    return typeof heat === 'number' && Number.isInteger(heat) && heat >= 0 && heat <= 3
  }) })).filter((row) => row.platforms.length)
  if (!rows.length) return null
  return <section className="ti-showing" aria-label="where it's showing up"><h3 className="ti-label">where it's showing up</h3>
    {rows.map(({ topic, platforms }, index) => <div className="ti-platform-topic" key={`${topic.topic}-${index}`}>
      <span className="ti-history-name">{topic.topic}</span><div className="ti-chips">{platforms.map((platform) => <span className="ti-platform-chip" key={platform.key}>{platform.name} · {LEVELS[topic.heat?.[platform.key] ?? 0]}</span>)}</div>
    </div>)}
  </section>
}
export function TodaysIdea({ idea }: { idea: DailyIdea | null }) {
  const [copied, updateCopied] = useState(false)
  const [expanded, updateExpanded] = useState(false)
  useEffect(() => {
    if (idea && window.location.hash === '#today') requestAnimationFrame(() => document.getElementById('today')?.scrollIntoView())
  }, [idea])
  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => updateCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])
  if (!idea) return null
  const topics = [...(idea.signals?.topics?.filter((topic) => topic && topic.topic) ?? [])].sort((a, b) =>
    Number(Boolean(b.chosen)) - Number(Boolean(a.chosen)) || (b.interest?.change ?? -Infinity) - (a.interest?.change ?? -Infinity))
  const chosen = topics.find((topic) => topic.chosen)
  const interest = chosen?.interest
  const copy = async () => {
    try { await navigator.clipboard.writeText(`HOOK: ${idea.hook}\n\n${idea.bit}\n\nTAG: ${idea.tag}`); updateCopied(true) } catch { /* clipboard blocked */ }
  }
  const writeYours = (event: React.MouseEvent) => {
    event.preventDefault()
    const box = document.querySelector('textarea')
    if (!box) return
    box.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
    box.focus({ preventScroll: true })
  }
  return <section id="today" className="todays-idea" aria-label="what to post today">
    <div className="ti-inner">
      <header className="ti-header">
        <div className="ti-eyebrow">what to post today · {formatDay(idea.day)}</div>
        <h2 className="ti-headline">{titleCase(chosen?.topic ?? idea.topic)}</h2>
        <div className="ti-stats">
          {interest && interest.change !== null ? <div className="ti-stat"><strong className="ti-stat-number">{changeText(interest.change)}</strong><span>interest this week vs last</span></div> : null}
          <Direction topic={chosen} />
          {interest ? <p className="ti-readers">people reading about it this week: <strong>{number(interest.thisWeek)}</strong></p> : null}
        </div>
        {idea.why_now ? <div className="ti-why-wrap"><h3 className="ti-label">why today</h3><p className="ti-why">{idea.why_now}</p></div> : null}
      </header>
      <div className="ti-layout">
        <div className="ti-insights">
          <Leaderboard topics={topics} />
          <Attention topics={topics} />
          <ShowingUp topics={topics} />
          <div className="ti-sources">{chosen?.sources?.filter((source) => /^https?:\/\//.test(source.url)).map((source, index) => <a key={index} href={source.url} target="_blank" rel="noopener noreferrer">{source.label} ↗</a>)}</div>
          <p className="ti-foot">interest = English Wikipedia page views, read live, updated daily. topics and notes from this morning's search of public coverage.</p>
        </div>
        <aside className="ti-demo" aria-label="demo: today's bit">
          <h3 className="ti-label">demo: today's bit</h3>
          <p className="ti-demo-hook">{idea.hook}</p>
          <div id="ti-demo-words" className={`ti-demo-words ${expanded ? 'ti-expanded' : ''}`}><p className="ti-bit">{idea.bit}</p></div>
          <Button variant="ghost" size="sm" className="ti-expand" aria-expanded={expanded} aria-controls="ti-demo-words" onClick={() => updateExpanded(!expanded)}>{expanded ? 'read less' : 'read all'}</Button>
          <p className="ti-tag">{idea.tag}</p>
          <div className="ti-actions"><Button size="sm" className="ti-copy" onClick={copy}>{copied ? 'copied' : 'copy'}</Button><Button variant="link" size="sm" asChild className="ti-write"><a href="#" onClick={writeYours}>write yours ↑</a></Button></div>
          <p className="ti-small">new one every morning. film it, it's yours.</p>
        </aside>
      </div>
    </div>
  </section>
}
