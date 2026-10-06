// Themed document surface for the info/legal pages: sticky doc-nav on the
// left, main content on the right. Wraps SiteHeader + SiteFooter so every
// route using DocLayout has identical chrome.
import { useEffect, type ReactNode } from 'react'
import { useRouterState } from '@tanstack/react-router'

import { SiteFooter } from './SiteFooter'

const DOC_NAV: { href: string; label: string }[] = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/guidelines', label: 'Community Guidelines' },
  { href: '/safety', label: 'Crisis & Safety' },
  { href: '/contact', label: 'Contact' },
  { href: '/ai-disclosure', label: 'AI Disclosure' },
  { href: '/disclaimer', label: 'Medical / Legal Disclaimer' },
]

export function DocLayout({
  active,
  title,
  subline,
  children,
}: {
  active: string
  title: string
  subline?: string
  children: ReactNode
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // Scroll restoration: land at the top on route change between doc pages.
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div style={{ background: '#fbf6f7', minHeight: '100vh', color: '#100c14' }}>
      
      <div
        style={{
          maxWidth: 980,
          margin: '0 auto',
          padding: '0 22px',
          display: 'flex',
          gap: 40,
        }}
      >
        <aside
          className="shutap-doc-nav"
          style={{
            width: 188,
            flexShrink: 0,
            position: 'sticky',
            top: 58,
            alignSelf: 'flex-start',
            padding: '34px 0 40px',
          }}
        >
          <div
            style={{
              fontFamily: 'Sora,sans-serif',
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: '.16em',
              textTransform: 'uppercase',
              color: '#6f666c',
              padding: '0 12px 12px',
              marginBottom: 8,
              borderBottom: '1px solid rgba(11,8,15,.06)',
            }}
          >
            trust &amp; legal
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {DOC_NAV.map((l) => {
              const isActive = l.href === active
              return (
                <a
                  key={l.href}
                  href={l.href}
                  className={`shutap-doc-link${isActive ? ' is-active' : ''}`}
                  style={{
                    display: 'block',
                    padding: '8px 12px',
                    borderRadius: 999,
                    fontFamily: 'Sora,sans-serif',
                    fontSize: 13.5,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#000000' : '#443c42',
                    background: isActive ? '#fff' : 'transparent',
                    boxShadow: isActive ? '0 1px 2px rgba(11,8,15,.05)' : 'none',
                    textDecoration: 'none',
                    transition: 'color .15s, background .15s',
                  }}
                >
                  {l.label}
                </a>
              )
            })}
          </nav>
        </aside>
        <main
          style={{
            flex: 1,
            maxWidth: 680,
            padding: '34px 0 80px',
            minWidth: 0,
          }}
        >
          <header
            style={{
              animation: 'shutap-doc-in .5s ease both',
              marginBottom: 12,
            }}
          >
            <h1
              style={{
                fontFamily: 'Sora,sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(24px, 5vw, 32px)',
                letterSpacing: '-.02em',
                color: '#0b080f',
                margin: '0 0 8px',
                lineHeight: 1.15,
              }}
            >
              {title}
            </h1>
            {subline && (
              <p
                style={{
                  fontFamily: 'Newsreader,serif',
                  fontStyle: 'italic',
                  fontSize: 15,
                  color: '#443c42',
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                {subline}
              </p>
            )}
          </header>
          <div className="shutap-doc-body">{children}</div>
        </main>
      </div>
      <SiteFooter />
      <style>{`
        .shutap-doc-body > h3:first-child,
        .shutap-doc-body > *:first-child > h3:first-child {
          margin-top: 8px;
        }
        .shutap-doc-body h3 {
          font-family: 'Sora', sans-serif;
          font-weight: 700;
          font-size: 15px;
          color: #0b080f;
          margin: 26px 0 8px;
          letter-spacing: -.005em;
        }
        .shutap-doc-body p, .shutap-doc-body li {
          font-family: 'Sora', sans-serif;
          font-size: 14.5px;
          line-height: 1.7;
          color: #2b2730;
          margin: 0 0 10px;
        }
        .shutap-doc-body b { color: #100c14; }
        .shutap-doc-body ul { padding-left: 20px; margin: 0 0 10px; }
        .shutap-doc-body a { color: #17131a; text-decoration: none; border-bottom: 1px solid rgba(23,19,26,.25); }
        .shutap-doc-body a:hover { color: #000000; }
        .shutap-doc-link:hover:not(.is-active) {
          background: rgba(23,19,26,.06);
          color: #000000;
        }
        .shutap-doc-link:focus-visible {
          outline: 2px solid #2b2630;
          outline-offset: 2px;
          border-radius: 999px;
        }
        @keyframes shutap-doc-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 880px) {
          .shutap-doc-nav { display: none; }
        }
      `}</style>
    </div>
  )
}
