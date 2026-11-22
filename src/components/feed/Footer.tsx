import { Link } from '@tanstack/react-router'
import { LaunchBadges } from '@/components/site/LaunchBadges'
import { useSmallBusinessOpen } from '@/hooks/use-smallbusiness-open'
import './feed.css'

const LINKS: Array<[string, string]> = [
  ['/bits', 'bits'],
  ['/realtors', 'realtors'],
  ['/toasts', 'toasts'],
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
  // small business shows once /smallbusiness is open to this visitor
  const sbOpen = useSmallBusinessOpen()
  const links: Array<[string, string]> = sbOpen ? [['/smallbusiness', 'small business'], ...LINKS] : LINKS
  return (
    <footer className="fd" style={{ minHeight: 0, borderTop: '1px solid rgba(0,0,0,.08)' }}>
      <div className="fd-col" style={{ padding: '28px 16px 36px', alignItems: 'center', textAlign: 'center', gap: 12 }}>
        <b style={{ fontSize: 'var(--fs-body, 16px)', letterSpacing: '0' }}>SHUTAP. Say it funnier.</b>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', justifyContent: 'center' }}>
          {links.map(([to, label]) => (
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
