/* GlobalHeader — single sticky header rendered by the root layout for
 * every page (landing, stream, room, halls, mirror, subscribe, legal,
 * profile, welcome, admin, 404). Consolidates the previous Header and
 * SiteHeader. Auto-derives light/dark variant from pathname, hides the
 * "join →" pill on /welcome, and mounts a slim admin sub-nav under the
 * bar on /admin/* routes for real admins. */
import { useEffect, useRef, useState } from 'react'
import { Link, useRouterState, useNavigate } from '@tanstack/react-router'
import { rememberReturnTo, signOut as doSignOut } from '@/lib/auth'
import { useCurrentAlias, useIsAdmin } from '@/hooks/use-current-alias'
import { EyeMark, ShutapWordmark } from './EyeMark'
import { aliasSlug } from '@/lib/feed-shared'
import { myAlias } from '@/lib/feed.functions'

type Variant = 'light' | 'dark'

// Routes that render on dark surfaces get the dark chrome.
function variantFor(pathname: string): Variant {
  if (pathname === '/welcome') return 'dark'
  if (pathname === '/mirror' || pathname.startsWith('/mirror/')) return 'dark'
  return 'light'
}


function parseRgb(s: string): [number, number, number, number] | null {
  const m = s.match(/rgba?\(([^)]+)\)/i)
  if (!m) return null
  const parts = m[1].split(',').map((p) => parseFloat(p.trim()))
  if (parts.length < 3) return null
  const [r, g, b, a = 1] = parts
  return [r, g, b, a]
}

function luminance(r: number, g: number, b: number) {
  const toLin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b)
}

function sampleVariantBehindHeader(headerEl: HTMLElement | null): Variant | null {
  if (typeof window === 'undefined' || !headerEl) return null
  const rect = headerEl.getBoundingClientRect()
  const x = Math.max(4, Math.min(window.innerWidth - 4, window.innerWidth / 2))
  const y = Math.max(1, rect.bottom + 6)
  // Temporarily let the header pass-through so we don't pick itself.
  const prevPE = headerEl.style.pointerEvents
  headerEl.style.pointerEvents = 'none'
  const el = document.elementFromPoint(x, y) as HTMLElement | null
  headerEl.style.pointerEvents = prevPE
  let node: HTMLElement | null = el
  while (node && node !== document.body) {
    const cs = getComputedStyle(node)
    const rgba = parseRgb(cs.backgroundColor)
    const bgImg = cs.backgroundImage
    if (rgba && rgba[3] > 0.1) {
      return luminance(rgba[0], rgba[1], rgba[2]) < 0.35 ? 'dark' : 'light'
    }
    if (bgImg && bgImg !== 'none') {
      // Assume gradients/images are dark unless the color is also opaque light.
      return 'dark'
    }
    node = node.parentElement
  }
  const bodyBg = parseRgb(getComputedStyle(document.body).backgroundColor)
  if (bodyBg && bodyBg[3] > 0.1) {
    return luminance(bodyBg[0], bodyBg[1], bodyBg[2]) < 0.35 ? 'dark' : 'light'
  }
  return null
}

export function GlobalHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const routeVariant = variantFor(pathname)
  const [variant, setVariant] = useState<Variant>(routeVariant)
  const dark = variant === 'dark'
  const navigate = useNavigate()
  const { alias } = useCurrentAlias()
  const admin = useIsAdmin()
  const [menuOpen, setMenuOpen] = useState(false)
  const areaRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const isWelcome = pathname === '/welcome'

  // The immersive homepage ("/") ships with its own header inside the
  // reference markup; suppress the global one so we don't stack two bars.
  const isHome = pathname === '/'
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    if (!alias) { setUnread(0); return }
    let live = true
    myAlias().then((r) => { if (live) setUnread(r.unread) }).catch(() => {})
    const clear = () => setUnread(0)
    window.addEventListener('shutap:activity-read', clear)
    return () => { live = false; window.removeEventListener('shutap:activity-read', clear) }
  }, [alias?.name, pathname])


  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  // Adapt header chrome to whatever section is currently under it.
  useEffect(() => {
    if (isHome) return
    let raf = 0
    const sample = () => {
      raf = 0
      const v = sampleVariantBehindHeader(headerRef.current)
      setVariant((prev) => (v && v !== prev ? v : prev ?? routeVariant))
    }
    const schedule = () => {
      if (raf) return
      raf = requestAnimationFrame(sample)
    }
    // Initial sample after mount / route change.
    setVariant(routeVariant)
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [pathname, routeVariant, isHome])


  const join = () => {
    try { rememberReturnTo(window.location.href) } catch { /* noop */ }
    navigate({ to: '/welcome' })
  }
  const signOut = async () => {
    setMenuOpen(false)
    await doSignOut()
    navigate({ to: '/' })
  }

  const inkStrong = dark ? '#ffffff' : '#111111'
  const inkMuted = dark ? '#b5b5b5' : '#6b6b6b'
  const inkActive = dark ? '#ffffff' : '#111111'
  const barBg = dark ? '#111111' : 'rgba(251,246,247,.92)'
  const barBorder = dark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(90,30,50,.09)'
  const pillBorder = dark ? '1px solid rgba(255,255,255,.14)' : '1px solid rgba(0,0,0,.14)'
  const menuBg = dark ? '#1b1b1b' : '#fff'
  const menuBorder = dark ? '1px solid rgba(255,255,255,.10)' : '1px solid rgba(0,0,0,.10)'
  const menuDivider = dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)'
  const menuInk = dark ? '#ffffff' : '#111111'
  const slug = alias?.name ? aliasSlug(alias.name) : null

  const navLink = (to: string, label: string) => {
    const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
    return (
      <Link
        to={to}
        style={{
          fontFamily: "'Sora',system-ui,sans-serif",
          fontWeight: 600,
          fontSize: 14,
          color: active ? inkActive : inkMuted,
          textDecoration: 'none',
          padding: '6px 10px',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Link>
    )
  }

  const menuItem: React.CSSProperties = {
    display: 'block',
    padding: '9px 11px',
    borderRadius: 10,
    fontFamily: "'Sora',system-ui,sans-serif",
    fontSize: 14,
    color: menuInk,
    textDecoration: 'none',
    cursor: 'pointer',
  }

  return (
    <header
      ref={headerRef}
      data-hdr-variant={variant}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: barBg,
        backdropFilter: dark ? undefined : 'blur(8px)',
        borderBottom: barBorder,
        transition: 'background-color .35s ease, border-color .35s ease, color .35s ease',
      }}
    >

      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: 'clamp(10px,2vw,11px) clamp(12px,3vw,22px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Link
          to="/"
          style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'inherit', flexShrink: 0 }}
        >
          <EyeMark size={32} />
          <ShutapWordmark size={19} ink={inkStrong} letterSpacing="-.04em" />
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <style>{`@media (max-width: 640px){[data-gh-nav] a{padding:6px 5px !important;font-size:13px !important}}@media (max-width: 420px){[data-gh-nav] a{padding:6px 3px !important;font-size:12.5px !important}}@media (max-width: 420px){[data-gh-pill]{padding:7px 12px !important}}`}</style>
          <span data-gh-nav="" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {navLink('/', 'write')}
            {navLink('/rooms', 'rooms')}
          </span>
          {alias ? (
            <Link to="/activity" aria-label={unread ? `activity, ${unread} new` : 'activity'} style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 999, color: pathname.startsWith('/activity') ? inkActive : inkMuted }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" strokeLinejoin="round" /><path d="M10 20.5a2 2 0 0 0 4 0" /></svg>
              {unread ? <span style={{ position: 'absolute', top: 6, right: 7, width: 8, height: 8, borderRadius: 99, background: '#e7548a', border: `2px solid ${barBg}` }} /> : null}
            </Link>
          ) : null}

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
                    border: pillBorder,
                    borderRadius: 999,
                    padding: '4px',
                    cursor: 'pointer',
                    transition: '.18s',
                  }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: dark ? '#2a2a2a' : '#f6e9ee',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 14,
                      flex: 'none',
                    }}
                  >
                    {alias.emoji || '🐣'}
                  </span>
                </div>
                {menuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 9px)',
                      right: 0,
                      width: 220,
                      background: menuBg,
                      border: menuBorder,
                      borderRadius: 16,
                      boxShadow: '0 20px 40px -20px rgba(0,0,0,.35)',
                      padding: 7,
                      zIndex: 70,
                    }}
                  >
                    <div style={{ ...menuItem, cursor: 'default', color: inkMuted, fontSize: 12.5 }}>{alias.name}</div>
                    {slug ? <Link to="/u/$pseudonym" params={{ pseudonym: slug }} style={menuItem} onClick={() => setMenuOpen(false)}>profile</Link> : null}
                    <Link to="/rooms" search={{ tab: 'saved' }} style={menuItem} onClick={() => setMenuOpen(false)}>saved</Link>
                    <Link to="/profile" style={menuItem} onClick={() => setMenuOpen(false)}>set list</Link>
                    <Link to="/mirror" style={menuItem} onClick={() => setMenuOpen(false)}>the mirror</Link>
                    {admin && (
                      <Link to="/admin" style={menuItem} onClick={() => setMenuOpen(false)}>
                        admin
                      </Link>
                    )}
                    <div style={{ height: '.5px', background: menuDivider, margin: '6px 0' }} />
                    <div
                      role="button"
                      style={{ ...menuItem, color: inkMuted }}
                      onClick={signOut}
                    >
                      sign out
                    </div>
                  </div>
                )}
              </>
            ) : isWelcome ? (
              // On /welcome the user is already inside the join flow —
              // render an inert placeholder so header spacing stays stable
              // and there's no "join → welcome" tautology.
              <span aria-hidden style={{ width: 72, height: 34, display: 'inline-block' }} />
            ) : (
              <button
                type="button"
                onClick={join}
                data-gh-pill=""
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#b8456b',
                  color: '#fff',
                  border: 0,
                  borderRadius: 999,
                  padding: '9px 18px',
                  fontFamily: 'Sora,sans-serif',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                sign in
              </button>
            )}
          </div>
        </div>
      </div>

    </header>
  )
}
