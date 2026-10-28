/**
 * Tiny MegaLaunch launch badge. Same treatment as FazierBadge and
 * LaunchNestBadge: deliberately small (80px wide) and quiet (72% opacity,
 * full on hover) so it never competes with page content.
 */
export function MegaLaunchBadge({
  align = 'flex-start',
}: {
  align?: 'flex-start' | 'flex-end' | 'center'
}) {
  return (
    <a
      href="https://megalaun.ch/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Shutap featured on MegaLaunch"
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
        src="https://megalaun.ch/badges/featured/asset?theme=light"
        width={220}
        height={64}
        alt="Featured on MegaLaunch"
        loading="lazy"
        decoding="async"
        style={{ width: 80, height: 'auto', display: 'block' }}
      />
    </a>
  )
}
