/**
 * Tiny LaunchNest launch badge. Same treatment as FazierBadge: deliberately
 * small (80px wide) and quiet (72% opacity, full on hover) so it never
 * competes with page content.
 */
export function LaunchNestBadge({
  align = 'flex-start',
}: {
  align?: 'flex-start' | 'flex-end' | 'center'
}) {
  return (
    <a
      href="https://launchnest.io/p/shutap"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Shutap launch page on LaunchNest"
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
        src="https://launchnest.io/badge/shutap.svg?variant=featured&theme=light"
        width={590}
        height={150}
        alt="Featured on LaunchNest"
        loading="lazy"
        decoding="async"
        style={{ width: 80, height: 'auto', display: 'block' }}
      />
    </a>
  )
}
