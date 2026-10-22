/* One avatar everywhere: the profile picture when there is one (Google photo
 * or an upload), else a legacy emoji, else the first letter of the name. */
export function UserAvatar({
  name,
  avatar,
  emoji,
  size = 28,
  dark = false,
}: {
  name?: string | null
  avatar?: string | null
  emoji?: string | null
  size?: number
  dark?: boolean
}) {
  const base: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flex: 'none',
    display: 'grid',
    placeItems: 'center',
    overflow: 'hidden',
    background: dark ? '#2a2a2a' : '#f6e9ee',
    color: dark ? '#f2eef0' : '#8a2d52',
    fontFamily: 'Sora,sans-serif',
    fontWeight: 700,
    fontSize: Math.round(size * 0.45),
    lineHeight: 1,
  }
  if (avatar) {
    return (
      <span style={base}>
        <img
          src={avatar}
          alt=""
          referrerPolicy="no-referrer"
          width={size}
          height={size}
          style={{ width: size, height: size, objectFit: 'cover', display: 'block' }}
        />
      </span>
    )
  }
  if (emoji) return <span style={{ ...base, fontSize: Math.round(size * 0.55) }}>{emoji}</span>
  const initial = (name ?? '').trim().charAt(0).toUpperCase() || '·'
  return <span style={base} aria-hidden>{initial}</span>
}
