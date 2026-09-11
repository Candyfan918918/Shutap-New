/* What you can do with a revealed card.
 *
 * Three rules the row obeys:
 *   · it sits UNDER the card, never on the art — the card travels as an image
 *     and must not carry chrome that means nothing outside this page.
 *   · nothing here is ever disabled or hidden, at any tier, guests included.
 *     Sharing is the growth mechanism; a guest tapping share opens the alias
 *     sheet at that moment rather than finding a lock beforehand.
 *   · they are words, not glyphs. An arrow is not a label.
 *
 * "post as a room" is the only one that touches other people, so it leads the
 * row and sits opposite the two that don't. */
import { useState } from 'react'
import type { ReactNode } from 'react'
import { INK, MUTED, SORA } from './ui'

function Pill({
  children,
  onClick,
  ariaLabel,
  strong,
}: {
  children: ReactNode
  onClick?: () => void
  ariaLabel: string
  /** The one action with consequences outside this screen. */
  strong?: boolean
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      aria-label={ariaLabel}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        whiteSpace: 'nowrap', height: 36, padding: '0 14px',
        borderRadius: 999, cursor: 'pointer',
        marginRight: strong ? 'auto' : undefined,
        background: !strong && hover ? 'rgba(11,8,15,.04)' : 'transparent',
        border: strong ? '1.5px solid rgba(11,8,15,.16)' : '1px solid rgba(11,8,15,.08)',
        borderColor: strong && hover ? '#e7548a' : undefined,
        color: strong || hover ? INK : MUTED,
        fontFamily: SORA, fontWeight: 800, fontSize: 12, lineHeight: 1,
        transition: 'color .2s, background .2s, border-color .2s',
      }}
    >
      {children}
    </button>
  )
}

export function CardActions({
  label,
  canPost,
  posted,
  onPost,
  onShare,
  onDownload,
}: {
  label: string
  /** Guests don't see it — a room needs a name on it. */
  canPost: boolean
  /** This card is already a room. The pill stops offering to open a second
   *  one and becomes the way into the one that exists — it is never removed,
   *  because a row that loses a button reads as an action that failed. */
  posted?: boolean
  onPost: () => void
  onShare: () => void
  onDownload: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {canPost ? (
        <Pill strong onClick={onPost} ariaLabel={posted ? `open the room ${label} is in` : `post ${label} as a room`}>
          <span aria-hidden style={{ fontFamily: 'Inter,sans-serif', fontWeight: 400, fontSize: 13 }}>◎</span>
          {posted ? 'open its room' : 'post as a room'}
        </Pill>
      ) : null}
      <Pill onClick={onShare} ariaLabel={`share ${label}`}>share</Pill>
      <Pill onClick={onDownload} ariaLabel={`download ${label}`}>download</Pill>
    </div>
  )
}
