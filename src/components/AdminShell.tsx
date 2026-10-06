// Shared admin console shell: one nav row, two theme variants.
// Every admin page wraps its content in <AdminShell>.
import { Link, useRouterState } from '@tanstack/react-router'
import { useNoIndex } from '@/components/NoIndex'

export type AdminVariant = 'dark' | 'light'

const NAV: Array<{ to: string; label: string }> = [
  { to: '/admin', label: 'analytics' },
  { to: '/admin/overview', label: 'overview' },
  { to: '/admin/users', label: 'users' },
  { to: '/admin/events', label: 'events' },
  { to: '/admin/feedback', label: 'feedback' },
  { to: '/admin/relate', label: 'relate SLA' },
]


interface Props {
  variant?: AdminVariant
  title: string
  subtitle?: string
  right?: React.ReactNode
  children: React.ReactNode
}

export function AdminShell({ variant = 'light', title, subtitle, right, children }: Props) {
  useNoIndex()
  const pathname = useRouterState({ select: (r) => r.location.pathname })
  const dark = variant === 'dark'

  const bg = dark ? '#0f0916' : '#ffffff'
  const ink = dark ? '#e6e3e4' : '#0b080f'
  const dim = dark ? '#6f666c' : '#443c42'
  const chipBg = dark ? 'rgba(255,255,255,.06)' : '#fff'
  const chipBorder = dark ? 'rgba(255,255,255,.10)' : 'rgba(11,8,15,.12)'
  const activeBg = dark ? '#2b2630' : '#0b080f'
  const activeInk = '#fff'

  return (
    <div style={{ minHeight: '100vh', background: bg, color: ink, fontFamily: "'Sora',sans-serif" }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px 80px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
          {NAV.map((n) => {
            const active = pathname === n.to || (n.to !== '/admin' && pathname.startsWith(n.to))
            return (
              <Link
                key={n.to}
                to={n.to}
                style={{
                  padding: '7px 14px',
                  borderRadius: 999,
                  border: `.5px solid ${active ? 'transparent' : chipBorder}`,
                  background: active ? activeBg : chipBg,
                  color: active ? activeInk : dim,
                  fontFamily: "'Sora',sans-serif",
                  fontWeight: 700,
                  fontSize: 11.5,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                }}
              >
                {n.label}
              </Link>
            )
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
          <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-.02em' }}>{title}</h1>
          {right && <div style={{ marginLeft: 'auto' }}>{right}</div>}
        </div>
        {subtitle && <p style={{ color: dim, fontSize: 13, margin: '0 0 22px' }}>{subtitle}</p>}
        {!subtitle && <div style={{ height: 18 }} />}

        {children}
      </div>
    </div>
  )
}
