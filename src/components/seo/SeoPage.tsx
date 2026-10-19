import { Link } from "@tanstack/react-router";
import { FazierBadge } from "@/components/site/FazierBadge";
import type { ReactNode } from "react";

/**
 * Minimal SSR-rendered shell for content/SEO pages. The site-wide header
 * comes from the root layout; this shell must not add a second one.
 * Blush design surface, Newsreader italic headings via child content.
 */
export function SeoPage({ children }: { children: ReactNode }) {
  const footLink = { fontFamily: "'Newsreader',serif" as const, fontStyle: 'italic' as const, fontSize: 13, color: '#443c42', textDecoration: 'none' };
  return (
    <div style={{ minHeight: '100vh', background: 'transparent', color: '#0b080f' }}>
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
            <Link to="/business" style={footLink}>Enterprise</Link>
            <Link to="/contact" style={footLink}>Contact</Link>
          </div>
          <FazierBadge />
        </div>
      </footer>
    </div>
  );
}
