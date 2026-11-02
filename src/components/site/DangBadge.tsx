/**
 * Tiny DANG! launch badge. Same treatment as the other launch-directory
 * badges: deliberately small (~80px wide) and quiet (72% opacity, full on
 * hover) so it never competes with page content.
 */
export function DangBadge({
  align = 'flex-start',
}: {
  align?: 'flex-start' | 'flex-end' | 'center'
}) {
  return (
    <a
      href="https://dang.ai"
      target="_blank"
      rel="dofollow noopener"
      aria-label="Verified on DANG!"
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
        src="https://assets.dang.ai/badges/dang-verified-light.png"
        width={260}
        height={94}
        alt="Verified on DANG!"
        loading="lazy"
        decoding="async"
        style={{ width: 80, height: 'auto', display: 'block' }}
      />
    </a>
  )
}
