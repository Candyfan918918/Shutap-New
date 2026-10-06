// Shared global header used by info/legal routes. Visually identical to the
// SPA Header (Landing/Stream/Profile). Uses TanStack Link so it works inside
// SSR routes; the auth control is client-only.
import { useEffect, useRef, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { EyeMark, ShutapWordmark } from '@/components/EyeMark'
import { useCurrentAlias, useIsAdmin } from '@/hooks/use-current-alias'

type AliasChip = { emoji: string; name: string; admin: boolean }

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const areaRef = useRef<HTMLDivElement>(null)
  const { alias: liveAlias } = useCurrentAlias()
  const isAdmin = useIsAdmin()
  const alias: AliasChip | null = liveAlias
    ? { emoji: liveAlias.emoji ?? '✦', name: liveAlias.name ?? 'you', admin: isAdmin }
    : null

  useEffect(() => { setMounted(true) }, [])


  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const navLink = (href: string, label: string) => {
    const active = pathname === href || (href !== '/' && pathname.startsWith(href))
    return (
      <a
        key={href}
        href={href}
        className={`shutap-nav-link${active ? ' is-active' : ''}`}
        style={{
          fontFamily: 'Newsreader,serif',
          fontStyle: 'italic',
          fontSize: 14,
          color: active ? '#000000' : '#443c42',
          textDecoration: 'none',
          padding: '6px 12px',
          borderRadius: 999,
          transition: 'background .15s, color .15s',
        }}
      >
        {label}
      </a>
    )
  }

  const signOut = async () => {
    setMenuOpen(false)
    try {
      const { signOut: doSignOut } = await import('@/lib/auth')
      doSignOut()
    } catch {
      /* noop */
    }
    if (typeof window !== 'undefined') window.location.href = '/'
    return
  }

  const join = () => {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('shutap.returnTo', window.location.href)
      }
    } catch {
      /* noop */
    }
    if (typeof window !== 'undefined') window.location.href = '/welcome'
  }

  const menuItem: React.CSSProperties = {
    display: 'block',
    padding: '9px 11px',
    borderRadius: 10,
    fontFamily: 'Newsreader,serif',
    fontStyle: 'italic',
    fontSize: 14,
    color: '#383136',
    textDecoration: 'none',
    cursor: 'pointer',
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(246,245,244,.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '.5px solid rgba(11,8,15,.07)',
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: '0 auto',
          padding: '12px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Link
          to="/"
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}
        >
          <EyeMark w={30} />
          <ShutapWordmark size={17} ink="#0b080f" accent="#e7548a" letterSpacing="-.04em" />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} ref={areaRef}>
          {navLink('/', 'write')}
          {navLink('/rooms', 'rooms')}
          {!mounted ? (
            <span style={{ width: 78, height: 34 }} aria-hidden />
          ) : alias ? (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="shutap-auth-pill"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#fff',
                  border: '.5px solid rgba(11,8,15,.10)',
                  borderRadius: 999,
                  padding: '6px 12px 6px 8px',
                  cursor: 'pointer',
                  fontFamily: 'Newsreader,serif',
                  fontStyle: 'italic',
                  fontSize: 13,
                  color: '#100c14',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                  }}
                >
                  {alias.emoji}
                </span>
                {alias.name}
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    width: 210,
                    background: '#fff',
                    border: '.5px solid rgba(11,8,15,.10)',
                    borderRadius: 16,
                    boxShadow: '0 24px 50px -24px rgba(20,16,22,.35)',
                    padding: 7,
                    zIndex: 70,
                  }}
                >
                  <a href="/profile" role="menuitem" className="shutap-menu-item" style={menuItem}>your profile</a>
                  <a href="/profile#settings" role="menuitem" className="shutap-menu-item" style={menuItem}>settings</a>
                  <a href="/mirror" role="menuitem" className="shutap-menu-item" style={{ ...menuItem, color: '#7F77DD' }}>the mirror ✦</a>
                  {alias.admin && <a href="/admin" role="menuitem" className="shutap-menu-item" style={menuItem}>admin dashboard</a>}
                  <div style={{ height: '.5px', background: 'rgba(11,8,15,.08)', margin: '6px 0' }} />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={signOut}
                    className="shutap-menu-item"
                    style={{ ...menuItem, color: '#6f666c', width: '100%', textAlign: 'left', background: 'transparent', border: 0, font: 'inherit' }}
                  >
                    sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={join}
              className="shutap-auth-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#2b2630',
                color: '#fff',
                borderRadius: 999,
                padding: '9px 18px',
                fontFamily: 'Sora,sans-serif',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                border: 0,
              }}
            >
              join →
            </button>
          )}
        </div>
      </div>
      <style>{`
        .shutap-nav-link:hover:not(.is-active) {
          background: rgba(23,19,26,.08);
          color: #000000;
        }
        .shutap-nav-link:focus-visible,
        .shutap-auth-pill:focus-visible {
          outline: 2px solid #2b2630;
          outline-offset: 2px;
          border-radius: 999px;
        }
        .shutap-menu-item:focus-visible {
          outline: 2px solid #2b2630;
          outline-offset: 2px;
          border-radius: 10px;
        }
        .shutap-menu-item:hover {
          background: rgba(23,19,26,.06);
        }
      `}</style>
    </header>
  )
}
