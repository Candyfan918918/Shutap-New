// Shutap for small business: the five looks for the words on the video
// (Nov 21 2026; the same five as the approved design). Pure data, drawn by
// compose.ts. The fonts are open-licensed and served from /fonts/sb; Classic
// uses the site's own Sora, so it never waits on a download.
export type TextStyleKey = 'classic' | 'caps' | 'marker' | 'comic' | 'type'

export type TextStyle = {
  key: TextStyleKey
  name: string
  family: string
  weight: number
  /** the file under /fonts/sb, when it is not the site's own font */
  file?: string
  /** sizes to try, biggest first, on the 720-wide frame */
  sizes: number[]
  lineHeight: number
  upper: boolean
  color: string
  /** a dark line round each letter, as a share of the size */
  outline?: number
  /** a hard coloured shadow under each letter */
  shadow?: { color: string; dy: number }
  /** a box behind the words: one for the block, or one per row */
  box?: { fill: string; radius: number; padX: number; padY: number; perRow?: boolean; stroke?: string; strokeWidth?: number }
}

export const TEXT_STYLES: TextStyle[] = [
  { key: 'caps', name: 'Big caps', family: 'Anton', weight: 400, file: 'anton-latin-400-normal.woff2', sizes: [84, 72, 62, 52, 44], lineHeight: 1.14, upper: true, color: '#ffffff', outline: 0.1, shadow: { color: '#c2185b', dy: 0.09 } },
  { key: 'classic', name: 'Classic', family: 'Sora', weight: 700, sizes: [46, 40, 36, 32], lineHeight: 1.3, upper: false, color: '#1d1a22', box: { fill: '#ffffff', radius: 26, padX: 28, padY: 22 } },
  { key: 'marker', name: 'Marker', family: 'Permanent Marker', weight: 400, file: 'permanent-marker-latin-400-normal.woff2', sizes: [54, 48, 42, 36], lineHeight: 1.25, upper: false, color: '#1d1a22', box: { fill: '#ffe14d', radius: 10, padX: 24, padY: 16 } },
  { key: 'comic', name: 'Comic', family: 'Bangers', weight: 400, file: 'bangers-latin-400-normal.woff2', sizes: [68, 60, 52, 44], lineHeight: 1.15, upper: false, color: '#ffffff', box: { fill: '#c2185b', radius: 26, padX: 28, padY: 16, stroke: '#ffffff', strokeWidth: 6 } },
  { key: 'type', name: 'Typewriter', family: 'Space Mono', weight: 700, file: 'space-mono-latin-700-normal.woff2', sizes: [38, 34, 30, 26], lineHeight: 1.5, upper: false, color: '#ffffff', box: { fill: '#000000', radius: 0, padX: 16, padY: 6, perRow: true } },
]

export const DEFAULT_TEXT_STYLE: TextStyleKey = 'caps'
export function textStyle(key: string | null | undefined): TextStyle {
  return TEXT_STYLES.find((s) => s.key === key) ?? TEXT_STYLES[0]!
}
