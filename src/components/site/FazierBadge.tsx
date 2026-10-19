/**
 * Tiny Fazier launch badge. Kept deliberately small (64px wide) and quiet
 * (72% opacity, full on hover) so it never competes with page content.
 */
export function FazierBadge({
  align = 'flex-start',
}: {
  align?: 'flex-start' | 'flex-end' | 'center'
}) {
  return (
    <a
      href="https://fazier.com/launches/shutap.com"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Shutap launch page on Fazier"
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
        src="https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&theme=neutral"
        width={64}
        alt="Fazier badge"
        loading="lazy"
        decoding="async"
        style={{ width: 64, height: 'auto', display: 'block' }}
      />
    </a>
  )
}
