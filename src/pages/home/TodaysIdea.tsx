// "what to post today" — one daily idea under the write box.
import { useState } from 'react'
import type { DailyIdea } from '@/lib/daily-idea.functions'

const ACCENT = '#c1216b'
const label: React.CSSProperties = {
  fontFamily: "'Sora',system-ui,sans-serif",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '.16em',
  textTransform: 'uppercase',
}
const words: React.CSSProperties = {
  fontFamily: "'Newsreader',Georgia,serif",
  margin: '6px 0 0',
  overflowWrap: 'anywhere',
}

function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function TodaysIdea({ idea }: { idea: DailyIdea | null }) {
  const [copied, setCopied] = useState(false)
  if (!idea) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`HOOK: ${idea.hook}\n\n${idea.bit}\n\nTAG: ${idea.tag}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked; leave button as is */
    }
  }

  const writeYours = (e: React.MouseEvent) => {
    e.preventDefault()
    const box = document.querySelector('textarea') as HTMLTextAreaElement | null
    if (!box) return
    box.scrollIntoView({ behavior: 'smooth', block: 'center' })
    box.focus({ preventScroll: true })
  }

  return (
    <section className="todays-idea" aria-label="what to post today">
      <div className="ti-card">
        <div style={{ ...label, display: 'flex', flexWrap: 'wrap', gap: '4px 8px' }}>
          <span style={{ color: ACCENT }}>what to post today</span>
          <span aria-hidden>·</span>
          <span>{formatDay(idea.day)}</span>
          <span aria-hidden>·</span>
          <span className="ti-muted" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>{idea.topic}</span>
        </div>

        <div className="ti-block">
          <div style={label} className="ti-muted">hook</div>
          <p style={{ ...words, fontWeight: 700, fontSize: 22, lineHeight: 1.25 }}>{idea.hook}</p>
        </div>
        <div className="ti-block">
          <div style={label} className="ti-muted">the bit</div>
          <p style={{ ...words, fontSize: 18, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{idea.bit}</p>
        </div>
        <div className="ti-block">
          <div style={label} className="ti-muted">tag</div>
          <p style={{ ...words, fontSize: 18, lineHeight: 1.5 }}>{idea.tag}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 18 }}>
          <button type="button" className="ti-copy" onClick={copy}>
            {copied ? 'copied' : 'copy'}
          </button>
          <a href="#" onClick={writeYours} style={{ ...label, color: ACCENT, textDecoration: 'none' }}>
            write yours ↑
          </a>
        </div>

        <p className="ti-muted" style={{ fontFamily: "'Sora',system-ui,sans-serif", fontSize: 12, margin: '16px 0 0' }}>
          new one every morning. film it, it's yours.
        </p>
      </div>
    </section>
  )
}
