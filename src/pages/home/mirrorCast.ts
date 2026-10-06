// Static demo cast used ONLY inside the labeled "THE MIRROR · DEMO" card on /.
// Numbers are the canonical Agent 12 cast definitions — the demo may not
// invent counts; if you edit here, update the same rows in the mirror spec.
export type DemoPattern = {
  name: string
  emoji: string
  district: 'career' | 'personal' | 'relationship' | 'family' | 'social'
  districtLabel: string
  districtSymbol: string
  districtColor: string
  rarity: string // roman numeral
  depth: 1 | 2 | 3 | 4 | 5
  signals: number
  trend: 'rising' | 'steady' | 'falling'
  trendLabel: string
  trendColor: string
  punch: string
  sources: { spill: number; scan: number; comments: number; likes: number; follows: number; browse: number }
  weekly: number[] // 7 recent weeks, values 0..signals
}

export const DEMO_MIRROR_CAST: DemoPattern[] = [
  {
    name: 'Impostor at the Table',
    emoji: '🎭',
    district: 'career',
    districtLabel: 'Career',
    districtSymbol: '▲',
    districtColor: '#7F77DD',
    rarity: 'V',
    depth: 5,
    signals: 140,
    trend: 'steady',
    trendLabel: '→ steady',
    trendColor: '#bdb8bb',
    punch: '"140 rooms you earned and you still sit like the bouncer is en route."',
    sources: { spill: 42, scan: 21, comments: 28, likes: 19, follows: 6, browse: 24 },
    weekly: [18, 22, 20, 21, 19, 20, 20],
  },
  {
    name: 'Avoidant Texter',
    emoji: '📱',
    district: 'personal',
    districtLabel: 'Personal',
    districtSymbol: '✸',
    districtColor: '#2b2630',
    rarity: 'IV',
    depth: 5,
    signals: 192,
    trend: 'rising',
    trendLabel: '↗ rising',
    trendColor: '#7fd49a',
    punch: '"192 reads, zero replies. not mysterious bestie, just scared with great wifi."',
    sources: { spill: 24, scan: 18, comments: 36, likes: 40, follows: 12, browse: 62 },
    weekly: [14, 18, 22, 26, 28, 40, 44],
  },
  {
    name: 'Heart on Read',
    emoji: '💌',
    district: 'relationship',
    districtLabel: 'Relationship',
    districtSymbol: '♥',
    districtColor: '#17131a',
    rarity: 'III',
    depth: 3,
    signals: 54,
    trend: 'rising',
    trendLabel: '↗ rising',
    trendColor: '#7fd49a',
    punch: '"54 hearts dropped, zero texts back. you flirt like a hit-and-run."',
    sources: { spill: 6, scan: 4, comments: 8, likes: 24, follows: 4, browse: 8 },
    weekly: [3, 5, 6, 7, 9, 11, 13],
  },
]

// Districts for the mini world grid at the bottom of the mirror card.
export const DEMO_DISTRICTS: Array<{
  key: DemoPattern['district']
  label: string
  symbol: string
  color: string
  patterns: Array<{ depth: number; ruined?: boolean }>
}> = [
  { key: 'personal', label: 'personal', symbol: '✸', color: '#2b2630', patterns: [{ depth: 5 }, { depth: 3 }, { depth: 2 }, { depth: 4, ruined: true }] },
  { key: 'career', label: 'career', symbol: '▲', color: '#7F77DD', patterns: [{ depth: 5 }, { depth: 4 }, { depth: 2 }, { depth: 1 }] },
  { key: 'relationship', label: 'relationship', symbol: '♥', color: '#17131a', patterns: [{ depth: 3 }, { depth: 4 }, { depth: 2, ruined: true }] },
  { key: 'family', label: 'family', symbol: '⌂', color: '#c87c4a', patterns: [{ depth: 3 }, { depth: 2 }, { depth: 4 }] },
  { key: 'social', label: 'social', symbol: '✦', color: '#5B8A5E', patterns: [{ depth: 2 }, { depth: 3 }, { depth: 3, ruined: true }] },
]
