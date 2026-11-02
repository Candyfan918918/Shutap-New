// The bit's action row icons (Nov 2 2026): flat colour, no tiles, in the
// video's palette so the row matches the post kit. Decorative: the label
// sits beside. Each icon carries its own colour; the button's `color` is
// not used.
export type ActionName = 'standup' | 'skit' | 'sketch' | 'download' | 'post'

export const ACTION_COLORS: Record<ActionName, string> = {
  standup: '#c1216b',
  sketch: '#f2a93b',
  skit: '#2f6db5',
  download: '#0b6b45',
  post: '#6b4fa0',
}

export function ActionIcon({ name }: { name: ActionName }) {
  const common = { viewBox: '0 0 24 24', 'aria-hidden': true } as const
  switch (name) {
    case 'standup':
      // a microphone
      return (
        <svg {...common}>
          <rect x="9" y="2.5" width="6" height="11" rx="3" fill="#c1216b" />
          <path d="M6 11a6 6 0 0 0 12 0" stroke="#c1216b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M12 17v3.5M8.5 20.5h7" stroke="#c1216b" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      )
    case 'sketch':
      // a script page
      return (
        <svg {...common}>
          <path d="M6 3h8l5 5v13H6z" fill="#f2a93b" />
          <path d="M14 3v5h5" fill="#d9a441" />
          <path d="M9 12h7M9 15.5h7M9 19h4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'skit':
      // a phone, playing
      return (
        <svg {...common}>
          <rect x="6" y="2.5" width="12" height="19" rx="3" fill="#2f6db5" />
          <path d="M10.5 8.5v7l5.5-3.5z" fill="#fff" />
        </svg>
      )
    case 'download':
      // into the tray
      return (
        <svg {...common}>
          <path d="M12 3v10" stroke="#0b6b45" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M8 9.5l4 4 4-4" stroke="#0b6b45" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" stroke="#0b6b45" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </svg>
      )
    case 'post':
      // a paper plane
      return (
        <svg {...common}>
          <path d="M3.5 11.5L20.5 4l-4.5 16-4.5-6.5z" fill="#6b4fa0" />
          <path d="M11.5 13.5L20.5 4" stroke="#fff" strokeWidth="1.6" />
        </svg>
      )
  }
}
