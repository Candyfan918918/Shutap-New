// Shared footer for info/legal pages. Link order matches DocLayout's doc-nav.
const INFO_LINKS: { href: string; label: string }[] = [
  { href: '/terms', label: 'terms' },
  { href: '/privacy', label: 'privacy' },
  { href: '/guidelines', label: 'house rules' },
  { href: '/safety', label: "if it's heavy" },
  { href: '/about', label: 'what shutap is' },
  { href: '/how-it-works', label: 'how it works' },
  { href: '/contact', label: 'contact' },
  { href: '/ai-disclosure', label: 'ai disclosure' },
  { href: '/disclaimer', label: 'disclaimer' },
]

export function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: '.5px solid rgba(11,8,15,.08)',
        background: '#ffffff',
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: '0 auto',
          padding: '26px 22px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: '8px 20px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
          {INFO_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="shutap-footer-link"
              style={{
                fontFamily: 'Sora,sans-serif',
                fontSize: 12.5,
                color: '#443c42',
                textDecoration: 'none',
                padding: '2px 4px',
                borderRadius: 6,
                transition: 'color .15s',
              }}
            >
              {l.label}
            </a>
          ))}
        </div>
        <div
          style={{
            fontFamily: 'Newsreader,serif',
            fontStyle: 'italic',
            fontSize: 12,
            color: '#443c42',
          }}
        >
          shutap writes jokes, not prescriptions. 18+ · pseudonymous · not therapy, not advice.
        </div>
      </div>
      <style>{`
        .shutap-footer-link:hover { color: #000000; }
        .shutap-footer-link:focus-visible {
          outline: 2px solid #2b2630;
          outline-offset: 2px;
          border-radius: 6px;
        }
      `}</style>
    </footer>
  )
}
