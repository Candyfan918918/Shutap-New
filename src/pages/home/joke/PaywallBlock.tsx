/* The one offer, in the one place.
 *
 * Below the deck, after the revealed card. Never above the cards, never
 * between them, never over them. The unflipped cards themselves stay exactly
 * as they were — no lock, no blur, no dimming, no countdown — because one
 * honest offer in one place beats locks scattered across a surface.
 *
 * Tapping a spent card doesn't change the card; it pulses this block. That is
 * the whole of the spent state.
 *
 * Register: what you get, stated as behaviour. No wellness vocabulary, no
 * urgency, no timer. */
import { Button, INK, INTER } from './ui'

export const PAYWALL_ID = 'joke-paywall'

export function PaywallBlock({
  line,
  cta,
  onCta,
  /** Set briefly when a spent card is tapped. */
  pulsing,
}: {
  line: string
  cta: string
  onCta: () => void
  pulsing?: boolean
}) {
  return (
    <>
      <div
        id={PAYWALL_ID}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, flexWrap: 'wrap',
          background: '#fdfbf9', border: '1px solid rgba(11,8,15,.08)',
          borderRadius: 22, padding: '20px 22px',
          animation: pulsing ? 'shutapPaywallPulse 1.4s ease-in-out' : 'none',
        }}
      >
        <span style={{ flex: '1 1 300px', minWidth: 0, fontFamily: INTER, fontSize: 15, lineHeight: 1.5, color: INK }}>
          {line}
        </span>
        <Button size="sm" onClick={onCta}>{cta}</Button>
      </div>
      <style>{`
        @keyframes shutapPaywallPulse{
          0%,100%{border-color:rgba(11,8,15,.08)}
          40%{border-color:#8f898d}
        }
        @media (prefers-reduced-motion: reduce){
          #${PAYWALL_ID}{animation:none!important}
        }
      `}</style>
    </>
  )
}
