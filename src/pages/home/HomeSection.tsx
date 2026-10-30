// Shared head for every homepage section under the write box (battle, what to
// post today, poll): hairline, kicker, title with an italic accent, one line.
// Same column and palette as the write box; see home-section.css.
import type { ReactNode } from 'react'
import './home-section.css'

export function SectionHead({ id, kicker, title, accent, sub }: { id: string; kicker: ReactNode; title: ReactNode; accent?: ReactNode; sub?: ReactNode }) {
  return (
    <header className="hsec-head">
      <span className="hsec-kicker">{kicker}</span>
      <h2 id={id} className="hsec-title">
        {title}
        {accent ? <> <em>{accent}</em></> : null}
      </h2>
      {sub ? <p className="hsec-sub">{sub}</p> : null}
    </header>
  )
}
