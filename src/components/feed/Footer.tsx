import { Link } from '@tanstack/react-router'
import { LaunchBadges } from '@/components/site/LaunchBadges'
import './feed.css'

const LINKS: Array<[string, string]> = [
  ['/guides', 'guides'],
  ['/funniest', 'the funniest'],
  ['/business', 'enterprise'],
  ['/about', 'about'],
  ['/how-it-works', 'how it works'],
  ['/pricing', 'pricing'],
  ['/faq', 'faq'],
  ['/terms', 'terms'],
  ['/privacy', 'privacy'],
  ['/guidelines', 'guidelines'],
  ['/safety', 'safety'],
  ['/ai-disclosure', 'AI disclosure'],
]

export function Footer() {
  return (
    <footer className="fd" style={{ minHeight: 0, borderTop: '1px solid rgba(0,0,0,.08)' }}>
      <div className="fd-col" style={{ padding: '28px 16px 36px', alignItems: 'center', textAlign: 'center', gap: 12 }}>
        <b style={{ fontSize: 'var(--fs-body, 16px)', letterSpacing: '0' }}>SHUTAP. Say it funnier.</b>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', justifyContent: 'center' }}>
          {LINKS.map(([to, label]) => (
            <Link key={to} to={to} className="fd-link fd-muted">
              {label}
            </Link>
          ))}
          <a href="mailto:hello@shutap.com" className="fd-link fd-muted">
            contact
          </a>
        </nav>
        <span className="fd-faint" data-nosnippet>
          18+ · jokes at the situation, never a person · not therapy or advice · emergency: call or text 988 (US)
        </span>
        <LaunchBadges align="center" />
      </div>
    </footer>
  )
}
