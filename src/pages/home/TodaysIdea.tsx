// "what to post today" — its own band on the home page, with the day's trend reading.
import { useEffect, useState } from 'react'
import type { DailyIdea, Heat, Platform, SignalTopic } from '@/lib/daily-idea.functions'

const PLATFORMS: { key: Platform; name: string; short: string }[] = [
  { key: 'tiktok', name: 'TikTok', short: 'TT' },
  { key: 'instagram', name: 'Instagram', short: 'IG' },
  { key: 'youtube', name: 'YouTube', short: 'YT' },
  { key: 'x', name: 'X', short: 'X' },
  { key: 'reddit', name: 'Reddit', short: 'R' },
]
const LEVELS = ['quiet', 'some', 'busy', 'hot'] as const
const DIRECTION: Record<string, string> = {
  rising: 'rising ↑',
  peaking: 'peaking ▲',
  steady: 'steady →',
  cooling: 'cooling ↓',
}

function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function clampHeat(v: unknown): Heat {
  const n = Math.round(Number(v))
  return (n >= 0 && n <= 3 ? n : 0) as Heat
}

function Trend({ topics }: { topics: SignalTopic[] }) {
  const sorted = [...topics].sort((a, b) => Number(!!b.chosen) - Number(!!a.chosen))
  const chosen = sorted.find((t) => t.chosen)
  return (
    <div className="ti-trend">
      <div className="ti-grid" role="table">
        <div className="ti-row ti-head" role="row">
          <span role="columnheader" />
          {PLATFORMS.map((p) => (
            <span key={p.key} role="columnheader" className="ti-col" title={p.name}>
              <span className="ti-long">{p.name}</span>
              <span className="ti-short">{p.short}</span>
            </span>
          ))}
        </div>
        {sorted.map((t, i) => (
          <div key={i} className="ti-topic">
            <div className="ti-row" role="row">
              <span role="rowheader" className={t.chosen ? 'ti-name ti-chosen' : 'ti-name'}>
                {t.topic}
                {t.chosen ? <span className="ti-pill ti-pick">today's pick</span> : null}
              </span>
              {PLATFORMS.map((p) => {
                const h = clampHeat(t.heat?.[p.key])
                return (
                  <span key={p.key} role="cell" className="ti-cellwrap">
                    <span className={`ti-cell ti-h${h}`} aria-label={`${p.name}: ${LEVELS[h]}`} title={`${p.name}: ${LEVELS[h]}`} />
                  </span>
                )
              })}
            </div>
            {t.direction || t.note ? (
              <div className="ti-meta">
                {t.direction && DIRECTION[t.direction] ? (
                  <span className={`ti-pill ti-dir ti-${t.direction}`}>{DIRECTION[t.direction]}</span>
                ) : null}
                {t.note ? <span className="ti-note">{t.note}</span> : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="ti-legend">
        {LEVELS.map((l, h) => (
          <span key={l}>
            <span className={`ti-cell ti-h${h}`} aria-hidden /> {l}
          </span>
        ))}
      </div>

      {chosen?.sources?.length ? (
        <div className="ti-sources">
          {chosen.sources.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer">
              {s.label}
            </a>
          ))}
        </div>
      ) : null}

      <p className="ti-foot">
        a reading of what search turned up this morning across public posts and coverage — levels, not platform numbers.
      </p>
    </div>
  )
}

export function TodaysIdea({ idea }: { idea: DailyIdea | null }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (idea && window.location.hash === '#today') {
      requestAnimationFrame(() => document.getElementById('today')?.scrollIntoView())
    }
  }, [idea])

  if (!idea) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`HOOK: ${idea.hook}\n\n${idea.bit}\n\nTAG: ${idea.tag}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked */
    }
  }

  const writeYours = (e: React.MouseEvent) => {
    e.preventDefault()
    const box = document.querySelector('textarea') as HTMLTextAreaElement | null
    if (!box) return
    box.scrollIntoView({ behavior: 'smooth', block: 'center' })
    box.focus({ preventScroll: true })
  }

  const topics = idea.signals?.topics?.filter((t) => t && t.topic) ?? []

  return (
    <section id="today" className="todays-idea" aria-label="what to post today">
      <div className="ti-inner">
        <div className="ti-eyebrow">
          what to post today · {formatDay(idea.day)} · {idea.topic}
        </div>
        <h2 className="ti-hook">{idea.hook}</h2>

        <div className="ti-cols">
          <div className="ti-left">
            <div className="ti-label">the bit</div>
            <p className="ti-bit">{idea.bit}</p>

            <div className="ti-tag">
              <div className="ti-label">tag</div>
              <p>{idea.tag}</p>
            </div>

            <div className="ti-actions">
              <button type="button" className="ti-copy" onClick={copy}>
                {copied ? 'copied' : 'copy'}
              </button>
              <a href="#" onClick={writeYours} className="ti-write">
                write yours ↑
              </a>
            </div>
            <p className="ti-muted ti-small">new one every morning. film it, it's yours.</p>
          </div>

          {idea.why_now || topics.length ? (
            <div className="ti-right">
              {idea.why_now ? (
                <>
                  <div className="ti-label">why today</div>
                  <p className="ti-why">{idea.why_now}</p>
                </>
              ) : null}
              {topics.length ? <Trend topics={topics} /> : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
