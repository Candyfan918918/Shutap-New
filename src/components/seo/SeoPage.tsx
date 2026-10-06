import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * Minimal SSR-rendered shell for content/SEO pages.
 * Blush design surface, Newsreader italic headings via child content.
 */
export function SeoPage({ children }: { children: ReactNode }) {
  const navLink = { fontFamily: "'Newsreader',serif" as const, fontStyle: 'italic' as const, fontSize: 14, color: '#443c42', textDecoration: 'none' };
  const footLink = { fontFamily: "'Newsreader',serif" as const, fontStyle: 'italic' as const, fontSize: 13, color: '#443c42', textDecoration: 'none' };
  return (
    <div style={{ minHeight: '100vh', background: 'transparent', color: '#0b080f' }}>
      <header style={{ borderBottom: '.5px solid rgba(11,8,15,.08)' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/" style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 15, letterSpacing: '-.01em', color: '#0b080f', textDecoration: 'none' }}>shutap</Link>
          <nav style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <Link to="/" style={navLink}>Write</Link>
            <Link to="/rooms" style={navLink}>Rooms</Link>
            <Link to="/faq" style={navLink}>FAQ</Link>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 780, margin: '0 auto', padding: '32px 22px 80px' }}>{children}</main>

      <footer style={{ borderTop: '.5px solid rgba(11,8,15,.08)' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 13, color: '#443c42' }}>SHUTAP. Say it funnier.</span>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Link to="/about" style={footLink}>About</Link>
              <Link to="/methodology" style={footLink}>Methodology</Link>
              <Link to="/trust" style={footLink}>Trust</Link>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', paddingTop: 10, borderTop: '.5px solid rgba(11,8,15,.06)' }}>
            <Link to="/terms" style={footLink}>Terms</Link>
            <Link to="/privacy" style={footLink}>Privacy</Link>
            <Link to="/guidelines" style={footLink}>Guidelines</Link>
            <Link to="/safety" style={footLink}>Safety</Link>
            <Link to="/ai-disclosure" style={footLink}>AI disclosure</Link>
            <Link to="/report" style={footLink}>Report</Link>
            <Link to="/contact" style={footLink}>Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
