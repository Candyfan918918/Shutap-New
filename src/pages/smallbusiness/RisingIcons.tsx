// The small-business signature (Nov 21 2026, approved by Candy): hearts,
// likes and followers building into a rising curve. Decoration and progress,
// never a promised result. Three uses: the big one on the first screen, the
// small one in the top corner that fills as the owner moves forward, and
// five columns as the week's tracker (one column per posted video).
const HEART = 'M12 21s-7.5-4.7-9.6-9.3C.9 8.3 2.8 4.5 6.5 4.5c2.1 0 3.6 1.1 5.5 3.3 1.900-2.200 3.400-3.300 5.500-3.300 3.700 0 5.600 3.800 4.100 7.200C19.5 16.3 12 21 12 21z'
const LIKE = 'M2 10h4v11H2zM8 21h8.6c1 0 1.9-.6 2.2-1.6l2.1-6.400c.5-1.500-.6-3-2.200-3H14.5l.7-3.600C15.5 4.9 14.4 3.5 13 3.5L8 10z'
const SHADES = ['#F7C4D6', '#F4B2CA', '#F09DBB', '#EB86AB', '#E87AA3', '#E56E9A', '#DE5689', '#D53F79', '#CC2A69', '#C2185B', '#C2185B']
const OFF = '#EBD9E1'

function Icon({ kind, style }: { kind: number; style: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden style={style}>
      {kind === 0 ? <path d={HEART} /> : kind === 1 ? <path d={LIKE} /> : <><circle cx="12" cy="7.5" r="4.5" /><path d="M3.5 21.5a8.5 8.5 0 0 1 17 0z" /></>}
    </svg>
  )
}

type Props =
  | { variant: 'hero' }
  /** lit: how many of the 15 icons are on (0..15) */
  | { variant: 'mini'; lit: number; label: string }
  /** posted: how many of the 5 columns are on (0..5) */
  | { variant: 'week'; posted: number; label: string }

export function RisingIcons(props: Props) {
  const hero = props.variant === 'hero'
  const columns = hero ? [1, 1, 2, 2, 3, 4, 5, 7, 9, 11, 13] : [1, 2, 3, 4, 5]
  const size = hero ? 17 : props.variant === 'mini' ? 10 : 28
  const [px, py] = hero ? [27, 22] : props.variant === 'mini' ? [13, 11] : [48, 34]
  const icons: React.ReactNode[] = []
  let n = 0
  columns.forEach((count, c) => {
    for (let r = 0; r < count; r++) {
      const on = hero ? true : props.variant === 'mini' ? n < props.lit : c < props.posted
      const color = !on ? OFF : hero ? SHADES[c]! : props.variant === 'mini' ? SHADES[Math.min(10, 6 + c)]! : SHADES[2 + c * 2]!
      icons.push(
        <Icon
          key={`${c}-${r}`}
          kind={(c * 2 + r) % 3}
          style={{ position: 'absolute', left: c * px, bottom: r * py, width: size, height: size, color, transition: 'color .4s', ...(hero ? { opacity: 0, animation: `sb-grow 6s ease ${(c * 0.22 + r * 0.05).toFixed(2)}s infinite` } : null) }}
        />,
      )
      n++
    }
  })
  const width = (columns.length - 1) * px + size
  const height = (Math.max(...columns) - 1) * py + size
  return (
    <div role="img" aria-label={hero ? 'Hearts, likes and followers building into a rising curve' : props.label} className={`sb-icons sb-icons-${props.variant}`} style={{ position: 'relative', width, height, flexShrink: 0 }}>
      {icons}
    </div>
  )
}
