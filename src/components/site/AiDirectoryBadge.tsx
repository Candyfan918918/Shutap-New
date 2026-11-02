/**
 * Tiny The AI Directory launch badge, using the markup the directory
 * supplies (dark card, "listed in" label over its logo image). Same quiet
 * treatment as the other launch badges: faint until hover so it never
 * competes with page content.
 */
export function AiDirectoryBadge({
  align = 'flex-start',
}: {
  align?: 'flex-start' | 'flex-end' | 'center'
}) {
  return (
    <a
      href="https://theaidirectory.ai"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Shutap listed in The AI Directory"
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        background: '#0a0a0a',
        borderRadius: 6,
        padding: '4px 8px 5px',
        textDecoration: 'none',
        border: '1px solid #2a2a2a',
        alignSelf: align,
        opacity: 0.72,
        transition: 'opacity .15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.72')}
    >
      <span
        style={{
          fontFamily: 'Arial, sans-serif',
          fontSize: 6,
          color: '#888',
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          lineHeight: 1,
          marginBottom: 3,
          display: 'block',
        }}
      >
        listed in
      </span>
      <img
        src="https://theaidirectory.ai/assets/boton.png"
        alt="The AI Directory"
        height={12}
        loading="lazy"
        decoding="async"
        style={{ display: 'block', height: 12, width: 'auto' }}
      />
    </a>
  )
}
