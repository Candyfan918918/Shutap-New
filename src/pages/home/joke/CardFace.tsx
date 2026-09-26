/* One joke card, as it looks on screen.
 *
 * Two faces. The headline is off-white: the joke set big in Sora, one phrase
 * lit in plum. The stack is ink: the setup in the voice, then the punchline
 * one word to a line. Which one a card turns over to is the writer's call
 * (`card.layout`); resolveFace settles the fallbacks. A newline in the text
 * is a hard break: the clapback's stage direction sits on its own line above
 * the quote.
 *
 * This is the same composition the export renders, at the same 9:16 — so what
 * someone saves is what they were just looking at, the mark included. Sizes
 * are container-query units against the card's own width, which is what keeps
 * the deck, the export preview and a phone-width column all in proportion. */
import type { JokeCard } from '@/lib/jokes/deck'
import { angleSubtitle, resolveFace } from '@/lib/jokes/deck'
import { STACK_RAMP, headlineSize, stackSize, stackWords } from '@/lib/jokes/card-art'
import {
  CARD_DARK,
  CARD_DARK_EDGE,
  CARD_DARK_SHADOW,
  CARD_GRAIN,
  CARD_LIGHT,
  CARD_LIGHT_EDGE,
  CARD_LIGHT_SHADOW,
  CardLockup,
  CardWatermark,
  DARK_RULE,
  DARK_TEXT,
  DARK_TEXT_2,
  DARK_TEXT_3,
  LIGHT_EYEBROW,
  LIGHT_INK,
  LIGHT_INK_STRONG,
  LIGHT_MUTED,
  LIGHT_RULE,
  LIT,
  WATERMARK_DARK,
  WATERMARK_LIGHT,
} from './ui'

export function CardFace({
  card,
  mark,
  loading = false,
}: {
  card: JokeCard
  mark: boolean
  loading?: boolean
}) {
  const face = resolveFace(card)
  const dark = face.layout === 'stack'
  const subtitle = angleSubtitle(card.angle)
  return (
    // The container is the wrapper, not the card: cqw resolves against the
    // nearest ANCESTOR container's content box, so a card that is its own
    // container sizes its radius and padding off the viewport instead.
    <div style={{ containerType: 'inline-size', width: '100%' }}>
    <div
      style={{
        position: 'relative', width: '100%', aspectRatio: '9/16',
        borderRadius: '7cqw', overflow: 'hidden',
        background: dark ? CARD_DARK : CARD_LIGHT,
        border: dark ? CARD_DARK_EDGE : CARD_LIGHT_EDGE,
        boxShadow: dark ? CARD_DARK_SHADOW : CARD_LIGHT_SHADOW,
        display: 'flex', flexDirection: 'column',
        // A safe area, not a margin: at 9:16 the card is posted to TikTok and
        // Reels, whose caption and chrome sit over the edges. The export in
        // card-art.ts keeps the same insets in viewBox units.
        padding: '13cqw 8.5cqw', color: dark ? DARK_TEXT : LIGHT_INK,
      }}
    >
      {dark ? <div style={CARD_GRAIN} /> : null}
      {mark ? <CardWatermark color={dark ? WATERMARK_DARK : WATERMARK_LIGHT} /> : null}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3cqw', minWidth: 0 }}>
        <CardLockup ink={dark ? DARK_TEXT : LIGHT_INK} eyes={dark} />
        <span
          style={
            dark
              ? { font: '800 3.6cqw/1 Sora,sans-serif', letterSpacing: '.28em', textTransform: 'uppercase', color: DARK_TEXT_2 }
              : { font: '600 3.4cqw/1 Sora,sans-serif', letterSpacing: '.2em', textTransform: 'uppercase', color: LIGHT_EYEBROW }
          }
        >
          {card.angleLabel}
        </span>
      </div>

      <div
        style={{
          position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: dark ? 0 : '5cqw', opacity: loading ? 0.35 : 1, transition: 'opacity .25s',
        }}
      >
        {face.layout === 'headline' ? (
          <>
            {subtitle ? (
              <span style={{ font: 'italic 400 5cqw/1.2 Newsreader,serif', color: LIGHT_MUTED }}>{subtitle}</span>
            ) : null}
            <p style={{ margin: 0, font: `700 ${headlineSize(face.text)}cqw/1.04 Sora,sans-serif`, letterSpacing: '-.045em', color: LIGHT_INK_STRONG, textWrap: 'pretty', whiteSpace: 'pre-line' }}>
              {loading ? 'shuffling…' : <HeadlineText text={face.text} lit={face.lit} />}
            </p>
          </>
        ) : (
          <StackText setup={face.setup} punchline={face.punchline} />
        )}
      </div>

      {/* The foot. The slogan and the address never move: a screenshot that
          travels without the app still says where it came from. */}
      <div
        style={{
          position: 'relative', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '3cqw',
          paddingTop: '4cqw', borderTop: dark ? `.5px solid ${DARK_RULE}` : `1px solid ${LIGHT_RULE}`,
        }}
      >
        <span style={{ font: '700 3.8cqw/1 Sora,sans-serif', letterSpacing: '-.02em' }}>SHUTAP. Joke about it.</span>
        <span style={{ font: 'italic 400 4.4cqw/1 Newsreader,serif', color: dark ? DARK_TEXT_3 : LIGHT_MUTED }}>shutap.com</span>
      </div>
    </div>
    </div>
  )
}

function HeadlineText({ text, lit }: { text: string; lit: string }) {
  const i = lit ? text.indexOf(lit) : -1
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <span style={{ color: LIT }}>{lit}</span>
      {text.slice(i + lit.length)}
    </>
  )
}

function StackText({ setup, punchline }: { setup: string; punchline: string }) {
  const words = stackWords(punchline)
  const size = stackSize(words)
  return (
    <>
      {setup ? (
        <span style={{ font: 'italic 400 5.6cqw/1.3 Newsreader,serif', color: DARK_TEXT_2, marginBottom: '5cqw', textWrap: 'pretty', whiteSpace: 'pre-line' }}>
          {setup}
        </span>
      ) : null}
      {words.map((w, k) => (
        <span
          key={k}
          style={{ font: `700 ${size}cqw/.92 Sora,sans-serif`, letterSpacing: '-.06em', color: STACK_RAMP[Math.min(k, STACK_RAMP.length - 1)] }}
        >
          {w}
        </span>
      ))}
    </>
  )
}
