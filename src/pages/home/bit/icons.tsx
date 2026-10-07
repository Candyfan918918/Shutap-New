// Stroke icons for the bit's action row. Decorative: the label sits beside.
export type ActionName = 'prompter' | 'scene' | 'screenplay' | 'download' | 'post'

export function ActionIcon({ name }: { name: ActionName }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, 'aria-hidden': true } as const
  switch (name) {
    case 'prompter':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M7 9h10M7 12h6M9 21h6M12 17v4" />
        </svg>
      )
    case 'scene':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="14" height="12" rx="2" />
          <path d="M17 10l4-2v8l-4-2" />
        </svg>
      )
    case 'screenplay':
      return (
        <svg {...common}>
          <path d="M6 3h9l4 4v14H6z" />
          <path d="M9 11h7M9 15h5" />
        </svg>
      )
    case 'download':
      return (
        <svg {...common}>
          <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
        </svg>
      )
    case 'post':
      return (
        <svg {...common}>
          <path d="M4 12l16-8-6 16-3-6z" />
        </svg>
      )
  }
}
