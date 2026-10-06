/* Support lines — always free, never behind a signup or a price. The crisis
 * route links straight here. */
const SORA = "'Sora',system-ui,sans-serif"
const NEWS = "'Newsreader',Georgia,serif"

const LINES = [
  'US · 988 Suicide & Crisis Lifeline',
  'UK · Samaritans 116 123',
  'Text HOME to 741741',
  'findahelpline.com',
]

export function SupportLines() {
  return (
    <section id="support" style={{ background: 'var(--cream,#f7f7f6)', padding: 'clamp(20px,3vh,40px) clamp(16px,4vw,28px) clamp(40px,6vh,70px)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', background: '#fff', border: '1px solid rgba(23,19,26,.1)', borderRadius: 22, padding: '22px 24px' }}>
        <h2 style={{ fontFamily: SORA, fontWeight: 700, fontSize: 17 }}>if it's heavier than a card</h2>
        <p style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 16, lineHeight: 1.6, color: '#443c42', marginTop: 6 }}>
          these reach people, any hour, free. shutap never puts a price or a signup in front of this.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {LINES.map((l) => (
            <span key={l} className="tag" style={{ fontFamily: SORA, fontSize: 12.5, color: '#3a3638', background: 'rgba(23,19,26,.08)', border: '.5px solid rgba(23,19,26,.22)', borderRadius: 999, padding: '6px 12px' }}>
              {l}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
