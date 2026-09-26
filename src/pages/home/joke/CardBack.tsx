/* A card, face-down.
 *
 * Off-white, the wordmark in the corner, the slot label and its subtitle in
 * the middle, and one plum outline pill that says what to do with it. The
 * subtitle is permanent rather than a tooltip: a guest is making their single
 * most important choice on their first visit and cannot be asked to discover
 * what "the take" means.
 *
 * All three backs are identical apart from that text — same surface, same
 * weight, no per-slot glyph, no per-slot accent. If the roast back looked
 * louder than the take back the choice would be biased, and the first-flip
 * distribution this deck exists to measure would be worthless. That holds
 * even though the faces differ: which face a card turns over to is never
 * signalled on its back. */
import { useState } from 'react'
import {
  CARD_BACK_EDGE,
  CARD_LIGHT,
  CARD_LIGHT_SHADOW,
  CARD_LIGHT_SHADOW_HOVER,
  CardLockup,
  LIGHT_INK,
  LIGHT_INK_STRONG,
  LIGHT_MUTED,
  LIT,
} from './ui'

export function CardBack({
  label,
  subtitle,
  /** Mid-flip, waiting on the writer: a quiet hold, never a spinner. */
  holding = false,
  /** A guest's used-up card: still face-down, still theirs, won't turn. */
  spent = false,
  interactive = true,
}: {
  label: string
  subtitle: string
  holding?: boolean
  spent?: boolean
  interactive?: boolean
}) {
  const [hover, setHover] = useState(false)
  return (
    <div style={{ containerType: 'inline-size', width: '100%' }}>
      <div
        onMouseEnter={interactive ? () => setHover(true) : undefined}
        onMouseLeave={interactive ? () => setHover(false) : undefined}
        style={{
          position: 'relative', width: '100%', aspectRatio: '9/16',
          borderRadius: '7cqw', overflow: 'hidden',
          background: CARD_LIGHT, border: CARD_BACK_EDGE,
          boxShadow: hover ? CARD_LIGHT_SHADOW_HOVER : CARD_LIGHT_SHADOW,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'stretch',
          padding: '7cqw 6.5cqw', color: LIGHT_INK,
          // A lift on hover, and nothing else. No rotation, no glow — a back
          // that reacts more than that starts advertising itself.
          transform: hover ? 'translateY(-3px)' : 'none',
          transition: 'box-shadow .3s cubic-bezier(.2,.8,.2,1), transform .3s cubic-bezier(.2,.8,.2,1)',
          animation: holding ? 'shutapHold .9s ease-in-out infinite' : 'none',
        }}
      >
        <CardLockup ink={LIGHT_INK} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2.4cqw', textAlign: 'center' }}>
          <span style={{ font: '700 10cqw/1.1 Sora,sans-serif', letterSpacing: '-.04em', color: LIGHT_INK_STRONG }}>
            {label}
          </span>
          <span style={{ font: 'italic 400 5.4cqw/1.3 Newsreader,serif', color: LIGHT_MUTED, textWrap: 'pretty' }}>
            {subtitle}
          </span>
          {holding ? (
            // Said in words as well as shown, so a held card is never mistaken
            // for a broken one: it is being written, and it will turn.
            <span aria-live="polite" style={{ font: 'italic 400 4.4cqw/1.4 Newsreader,serif', color: LIGHT_MUTED, marginTop: '1.5cqw' }}>
              writing this one…
            </span>
          ) : null}
        </div>

        <span
          style={{
            display: 'inline-flex', alignSelf: 'center', alignItems: 'center',
            height: '9cqw', padding: '0 4.5cqw', borderRadius: 999,
            border: `1.5px solid ${LIT}`, font: '700 3.8cqw/1 Sora,sans-serif', color: LIT, whiteSpace: 'nowrap',
          }}
        >
          {spent ? 'face down. still yours.' : 'tap to flip →'}
        </span>
      </div>
    </div>
  )
}

/* The hold's pulse. Kept with the deck rather than in global.css — nothing
   else on the site draws a card back. */
export function CardBackStyles() {
  return <style>{`@keyframes shutapHold{0%,100%{opacity:.55}50%{opacity:1}}`}</style>
}
