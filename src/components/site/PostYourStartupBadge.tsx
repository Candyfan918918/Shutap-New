/**
 * Tiny PostYourStartup launch badge. Same treatment as FazierBadge,
 * LaunchNestBadge and MegaLaunchBadge: deliberately small (80px wide) and
 * quiet (72% opacity, full on hover) so it never competes with page content.
 */
export function PostYourStartupBadge({
  align = 'flex-start',
}: {
  align?: 'flex-start' | 'flex-end' | 'center'
}) {
  return (
    <a
      href="https://postyourstartup.co/startup/shutap?ref=badge"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Shutap featured on PostYourStartup"
      style={{
        display: 'inline-block',
        width: 'fit-content',
        alignSelf: align,
        opacity: 0.72,
        transition: 'opacity .15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.72')}
    >
      <img
        src="https://postyourstartup.co/api/badge/shutap?theme=light"
        width={212}
        height={55}
        alt="Featured on PostYourStartup"
        loading="lazy"
        decoding="async"
        style={{ width: 80, height: 'auto', display: 'block' }}
      />
    </a>
  )
}
