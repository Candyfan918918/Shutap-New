import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from '@/compat/router'
import { rememberReturnTo, signOut as doSignOut } from '../lib/auth'
import { useCurrentAlias, useIsAdmin } from '../hooks/use-current-alias'
import { EyeMark, ShutapWordmark } from './EyeMark'
import { useMagnetic } from './motion'

/* Canonical sticky header — identical across Landing, Stream, Halls, Profile.
   Alias pill is driven by the real Supabase session; sign-out clears both
   the Supabase session AND cached alias/role. */
export function Header({ onToast }: { onToast?: (m: string) => void }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { alias, userId } = useCurrentAlias()
  const admin = useIsAdmin()
  const [menuOpen, setMenuOpen] = useState(false)
  const areaRef = useRef<HTMLDivElement>(null)
  const joinRef = useMagnetic<HTMLAnchorElement>()

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const join = () => {
    rememberReturnTo(window.location.href)
    navigate('/welcome')
  }
  const signOut = async () => {
    setMenuOpen(false)
    await doSignOut()
    onToast?.('signed out.')
    navigate('/')
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
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(246,245,244,.88)',
        backdropFilter: 'blur(18px)',
        borderBottom: '.5px solid rgba(11,8,15,.07)',
      }}
    >
      <div
        style={{
          maxWidth: 740,
          margin: '0 auto',
          padding: '11px 22px',
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
          <EyeMark size={32} />
          <ShutapWordmark size={19} ink="#0b080f" letterSpacing="-.04em" />
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            to="/stream"
            style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 14, color: pathname.startsWith('/stream') || pathname.startsWith('/room') ? '#0b080f' : '#443c42', textDecoration: 'none', padding: '6px 12px' }}
          >
            rooms
          </Link>

          <div ref={areaRef} style={{ position: 'relative' }}>
            {alias ? (
              <>
                <div
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen((v) => !v)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    background: '#fff',
                    border: '.5px solid rgba(11,8,15,.12)',
                    borderRadius: 999,
                    padding: '5px 12px 5px 5px',
                    cursor: 'pointer',
                    transition: '.18s',
                  }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg,#2b2630,#2b2630)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 14,
                      flex: 'none',
                    }}
                  >
                    {alias.emoji || '🐣'}
                  </span>
                  <span style={{ fontFamily: 'Newsreader,serif', fontStyle: 'italic', fontSize: 13, color: '#383136' }}>
                    {alias.name || ''}
                  </span>
                </div>
                {menuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 9px)',
                      right: 0,
                      width: 210,
                      background: '#fff',
                      border: '.5px solid rgba(11,8,15,.10)',
                      borderRadius: 16,
                      boxShadow: '0 24px 50px -24px rgba(20,16,22,.35)',
                      padding: 7,
                      zIndex: 70,
                      animation: 'pop .16s ease',
                    }}
                  >
                    <Link to="/profile" className="menu-item" style={menuItem} onClick={() => setMenuOpen(false)}>
                      your profile
                    </Link>
                    <Link to="/profile#settings" className="menu-item" style={menuItem} onClick={() => setMenuOpen(false)}>
                      settings
                    </Link>
                    <Link to="/mirror" className="menu-item" style={{ ...menuItem, color: '#7F77DD' }} onClick={() => setMenuOpen(false)}>
                      the mirror ✦
                    </Link>
                    {admin && (
                      <Link to="/admin" className="menu-item" style={menuItem} onClick={() => setMenuOpen(false)}>
                        admin dashboard
                      </Link>
                    )}
                    <div style={{ height: '.5px', background: 'rgba(11,8,15,.08)', margin: '6px 0' }} />
                    <div
                      className="menu-item"
                      role="button"
                      style={{ ...menuItem, color: '#6f666c', cursor: 'pointer' }}
                      onClick={signOut}
                    >
                      sign out
                    </div>

                  </div>
                )}
              </>
            ) : (
              <a
                href="/welcome"
                ref={joinRef}
                role="button"
                onClick={(e) => {
                  // Preserve returnTo; still allow real anchor to navigate
                  // reliably even if the SPA nav handler is intercepted.
                  try { rememberReturnTo(window.location.href) } catch { /* noop */ }
                  if (!e.metaKey && !e.ctrlKey && e.button === 0) {
                    e.preventDefault()
                    navigate('/welcome')
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#2b2630',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: 999,
                  padding: '9px 18px',
                  fontFamily: 'Sora,sans-serif',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                join →
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
