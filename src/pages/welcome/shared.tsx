import { EyeMark as BrandEyeMark } from '@/components/brand/EyeMark'

export const BG = '#100c14'
export const TEXT = '#fdfbf9'
export const SOFT = '#bdb8bb'
export const MUTED = '#6f666c'
export const ACCENT = '#2b2630'

export const CREATURES = [
  { n: 'Owl', e: '🦉' }, { n: 'Fox', e: '🦊' }, { n: 'Bear', e: '🐻' }, { n: 'Lion', e: '🦁' },
  { n: 'Butterfly', e: '🦋' }, { n: 'Hedgehog', e: '🦔' }, { n: 'Swan', e: '🦢' }, { n: 'Wolf', e: '🐺' },
  { n: 'Hawk', e: '🦅' }, { n: 'Crane', e: '🕊' }, { n: 'Fawn', e: '🦌' }, { n: 'Hare', e: '🐇' },
  { n: 'Dove', e: '🕊' }, { n: 'Otter', e: '🦦' }, { n: 'Robin', e: '🐦' }, { n: 'Heron', e: '🪿' },
]
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function EyeMark({ size = 52 }: { size?: number }) {
  return (
    <span style={{ display: 'block', width: size, margin: '0 auto' }}>
      <BrandEyeMark size={size} />
    </span>
  )
}

export const oauthBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  width: '100%', padding: '15px 20px', borderRadius: 14,
  border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.05)',
  cursor: 'pointer', fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 15,
  color: TEXT, transition: '.18s',
}
export const primaryBtn: React.CSSProperties = {
  width: '100%', padding: '15px 20px', background: ACCENT, border: 'none',
  borderRadius: 14, color: '#fff', fontFamily: "'Sora',sans-serif",
  fontWeight: 700, fontSize: 15, cursor: 'pointer',
}
export const ghostBtn: React.CSSProperties = {
  width: '100%', padding: '15px 20px', background: 'rgba(23,19,26,.12)',
  border: '1.5px solid rgba(23,19,26,.35)', borderRadius: 14, color: '#e2dde0',
  fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, cursor: 'pointer',
}
export const wheelSelect: React.CSSProperties = {
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  background:
    'linear-gradient(180deg, rgba(239,237,235,0.06) 0%, rgba(239,237,235,0.18) 45%, rgba(23,19,26,0.28) 50%, rgba(239,237,235,0.18) 55%, rgba(239,237,235,0.06) 100%)',
  border: '1px solid rgba(23,19,26,.30)',
  borderRadius: 14,
  color: TEXT,
  fontFamily: "'Sora', system-ui, sans-serif",
  fontStyle: 'normal',
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
  fontSize: 17,
  letterSpacing: '.02em',
  padding: '14px 14px',
  minWidth: 84,
  textAlign: 'center',
  textAlignLast: 'center',
  cursor: 'pointer',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,.06), 0 0 0 1px rgba(23,19,26,.10), 0 6px 16px -10px rgba(23,19,26,.35)',
}

export type Msg = { kind: 'err' | 'ok'; text: string } | null
