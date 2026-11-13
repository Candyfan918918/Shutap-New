/* What you type, what Shutap does, what it never does (Nov 2 2026). The one
 * block that answers "are you taking my material?" before anyone has to ask.
 * Used on how-it-works, the AI disclosure and about. */
const COLS: { title: string; lines: string[] }[] = [
  {
    title: 'You type',
    lines: [
      'Your story, told your way: your lines stay word for word.',
      'A listing link, or your stories about the person for a toast.',
      'Whatever you write stays yours, word for word.',
    ],
  },
  {
    title: 'Shutap does',
    lines: [
      'Removes names and places before anything is saved.',
      'On a bit, drafts only the lines your story didn’t cover, marked as AI drafts, and offers other ways to say a line when you tap “funnier”. Drafts realtor kits and toasts from what you give it.',
      'Lays it out as a video, stand-up, a sketch, a skit, a shoot kit or a toast.',
    ],
  },
  {
    title: 'Shutap never',
    lines: [
      'Reads what you make: no person at Shutap sees it.',
      'Puts your words into its dataset, its examples, or any model’s training.',
      'Shows your material to anyone else. Only you see it unless you post it.',
    ],
  },
]

export function WhoDoesWhat({ compact = false }: { compact?: boolean }) {
  return (
    <section
      aria-label="What you type, what Shutap does, what it never does"
      style={{
        display: 'grid',
        gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
        margin: '0 0 36px',
      }}
    >
      {COLS.map((c) => (
        <div
          key={c.title}
          style={{
            background: '#fff',
            border: '1px solid rgba(11,8,15,.10)',
            borderRadius: 16,
            padding: '16px 18px',
            display: 'grid',
            gap: 8,
            alignContent: 'start',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: c.title === 'Shutap never' ? '#b8456b' : '#8a7680' }}>{c.title}</h3>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 15, lineHeight: 1.5, color: '#2e1a26', display: 'grid', gap: 4 }}>
            {c.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
