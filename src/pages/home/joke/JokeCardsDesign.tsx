/* The joke-card surface, annotated.
 *
 * A design page, not a product page: the deck at the top is live — tap to
 * flip, switch tier to see the gates — and it walks the exact same machine
 * the real surface does (useDeck, CardBack, CardFace, CardActions,
 * PaywallBlock, SetList). Below it the same surface is held still, one state
 * at a time, so each can be read on its own.
 *
 * Nothing here touches the server. The three cards are authored, the tier is
 * a switch, the sign-in sheet is a picture of one. That is the point: this is
 * where the surface can be argued about without spending a model call. */
import { useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { EyeMark, ShutapWordmark } from '@/components/brand/EyeMark'
import { SLOTS, type JokeCard, type JokeTier, type SlotKey } from '@/lib/jokes/deck'
import { CardFace } from './CardFace'
import { CardBack, CardBackStyles } from './CardBack'
import { FlipCard } from './FlipCard'
import { CardActions } from './CardActions'
import { PaywallBlock, PAYWALL_ID } from './PaywallBlock'
import { SetList, type SetGroup } from './SetList'
import { useDeck } from './useDeck'
import { Button, INK, INTER, MUTED, NEWS, PROSE, SORA } from './ui'

/* ─────────────────────────── the authored set ─────────────────────────── */

const SITUATION = '“he said 50/50, then laminated a chart with only my name on it.”'

type Face = Pick<JokeCard, 'text' | 'layout' | 'lit' | 'setup' | 'punchline'>

/** The live set: two headlines and a stack, the way the writer deals them. */
const FACES: Record<SlotKey, Face> = {
  the_take: {
    text: "he didn't make a chore chart. he made an org chart. and babe — you're the whole org.",
    layout: 'headline',
    lit: "you're the whole org.",
  },
  the_clapback: {
    text: 'obsessed with the chart. i\'ve added a column — it\'s called “him.”',
    layout: 'headline',
    lit: '“him.”',
  },
  the_roast: {
    text: "a 50/50 split where one person holds both halves isn't math. it's a hostage situation. laminated.",
    layout: 'stack',
    setup: "a 50/50 split where one person holds both halves isn't math.",
    punchline: 'hostage situation. laminated.',
  },
}

/** The roast as a headline, for the headline specimens. */
const ROAST_HEADLINE: Face = {
  text: "a 50/50 split where one person holds both halves isn't math. it's a hostage situation with a laminator.",
  layout: 'headline',
  lit: 'a hostage situation with a laminator.',
}

/** Stack specimens: two, three and four words — the last one steps down. */
const STACKS: { words: string; face: Face }[] = [
  {
    words: 'two words · 20cqw',
    face: { text: 'he asked why i\'m “so quiet lately.” saving breath.', layout: 'stack', setup: 'he asked why i\'m “so quiet lately.”', punchline: 'saving breath.' },
  },
  {
    words: 'three words · 20cqw',
    face: { text: 'the landlord says the heat is “working as designed.” so was titanic.', layout: 'stack', setup: 'the landlord says the heat is “working as designed.”', punchline: 'so was titanic.' },
  },
  {
    words: 'four words · 60 ÷ 4 = 15cqw',
    face: { text: 'the ex texted “hope you\'re well.” i was. past tense.', layout: 'stack', setup: 'the ex texted “hope you\'re well.”', punchline: 'i was. past tense.' },
  },
]

const NOTES: Record<SlotKey, string> = {
  the_take: 'names the situation back to you. the one people flip when they want to feel sane.',
  the_clapback: 'short enough to actually say out loud. flipped most when someone came for revenge.',
  the_roast: 'aimed at the setup, never the person. the subtitle is deliberately the plainest of the three.',
}

function authored(slot: SlotKey, position: number, face: Face = FACES[slot]): JokeCard {
  const s = SLOTS.find((x) => x.key === slot)!
  return {
    id: `design-${slot}`,
    position,
    angle: slot,
    angleLabel: s.label,
    used_fallback: false,
    judge_score: null,
    saved: false,
    ...face,
  }
}

const EARLIER: SetGroup = {
  id: 'earlier',
  situation: '“my sister announced my pregnancy at her own engagement party.”',
  cards: [
    {
      id: 'design-earlier',
      position: 0,
      angle: 'the_clapback',
      angleLabel: 'the clapback',
      text: 'congratulations to you both, and to the news you just broke on my behalf.',
      layout: 'headline',
      lit: 'the news you just broke on my behalf.',
      used_fallback: false,
      judge_score: null,
      saved: false,
    },
  ],
}

const RULES = [
  {
    title: 'the flip is the latency budget',
    body: 'generation fires on flip, so the card is written while it turns. ~450ms, ease-out, content swaps at the halfway point. never a spinner, never skeleton text — a quiet hold on the mid-flip edge, capped at 8s before the authored fallback.',
  },
  {
    title: 'no card count in the copy',
    body: 'deck size is a product parameter, not a brand claim. nothing on the surface says “three.”',
  },
  {
    title: 'the deck is the response',
    body: 'it sits directly under the entry box with no section header between them. stacked on mobile — a carousel would hide two of the three labeled choices.',
  },
  {
    title: 'reachable without sight',
    body: 'cards are buttons with “flip the roast — the joke”. the revealed line lives in a live region, spent cards point at the paywall via aria-describedby, and prefers-reduced-motion swaps instantly.',
  },
  {
    title: 'one plum',
    body: 'off-white, ink and white surfaces do the work. plum survives as one lit phrase on a headline and the outline pill on a back — nowhere else. the slogan and shutap.com never move.',
  },
]

const BANS = ['no lock icon', 'no blur', 'no dimming', 'no countdown', 'no tooltip on tap']

const TIERS: { id: JokeTier; label: string }[] = [
  { id: 'guest', label: 'guest' },
  { id: 'free', label: 'free' },
  { id: 'paying', label: 'member' },
]

/* ─────────────────────────── small chrome ─────────────────────────── */

/** The design system's "trust label": Sora caps in the soft pink. */
function TrustLabel({ children }: { children: ReactNode }) {
  return (
    <span style={{ fontFamily: SORA, fontWeight: 800, fontSize: 10, lineHeight: 1, letterSpacing: '.16em', textTransform: 'uppercase', color: '#e7548a' }}>
      {children}
    </span>
  )
}

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <span style={{ fontFamily: SORA, fontWeight: 800, fontSize: 11, lineHeight: 1, letterSpacing: '.2em', textTransform: 'uppercase', color: '#c1216b' }}>
      {children}
    </span>
  )
}

function Lede({ children }: { children: ReactNode }) {
  return (
    <span style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 15, lineHeight: 1.4, color: MUTED }}>{children}</span>
  )
}

function Note({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span style={{ fontFamily: INTER, fontSize: 13, lineHeight: 1.55, color: MUTED, ...style }}>{children}</span>
  )
}

function Badge({ tone, children }: { tone: 'neutral' | 'brand'; children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', padding: '4px 11px',
        background: tone === 'brand' ? 'rgba(231,84,138,.10)' : '#f7f6f4',
        color: tone === 'brand' ? '#c1216b' : PROSE,
        fontFamily: INTER, fontWeight: 700, fontSize: 11, lineHeight: 1, letterSpacing: '.02em',
        borderRadius: 999, whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

/** A still action pill, for the specimens — the live row is CardActions. */
function StillPill({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
        height: 36, padding: '0 14px', borderRadius: 999,
        border: strong ? '1.5px solid rgba(11,8,15,.16)' : '1px solid rgba(11,8,15,.08)',
        color: strong ? INK : MUTED, fontFamily: SORA, fontWeight: 800, fontSize: 12, lineHeight: 1,
      }}
    >
      {children}
    </span>
  )
}

function Panel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, background: '#fff', border: '1px solid rgba(11,8,15,.08)', borderRadius: 22, padding: 18, ...style }}>
      {children}
    </div>
  )
}

function Section({ eyebrow, lede, children }: { eyebrow: string; lede?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <SectionEyebrow>{eyebrow}</SectionEyebrow>
        {lede ? <Lede>{lede}</Lede> : null}
      </div>
      {children}
    </div>
  )
}

/** A specimen: a card at a fixed column width, a caption under it. */
function Specimen({ children, caption }: { children: ReactNode; caption: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11, minWidth: 0 }}>
      {children}
      <Note>{caption}</Note>
    </div>
  )
}

const SPECIMENS: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 18, alignItems: 'start' }

/* ─────────────────────────── the page ─────────────────────────── */

export function JokeCardsDesign() {
  const [tier, setTier] = useState<JokeTier>('free')
  const [sheet, setSheet] = useState(false)
  const [toast, setToast] = useState('')
  // A fresh shuffle per visit, like a fresh set would get.
  const [seed, setSeed] = useState(() => `design-${Math.random().toString(36).slice(2)}`)

  const written = useMemo(() => new Set<string>(SLOTS.map((s) => s.key)), [])

  const deck = useDeck({
    seed,
    tier,
    written,
    onSpentTap: () =>
      document.getElementById(PAYWALL_ID)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
  })

  function say(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(''), 1800)
  }

  function act(kind: 'share' | 'download' | 'post') {
    if (tier === 'guest') { setSheet(true); return }
    say(kind === 'share' ? 'shared · 1080×1920' : kind === 'post' ? 'posted — your room is live' : 'saved to your photos')
  }

  function pickTier(next: JokeTier) {
    setTier(next)
    setSheet(false)
    setToast('')
    // A new tier deals a new set, face-down, so the gates can be walked again.
    setSeed(`design-${next}-${Math.random().toString(36).slice(2)}`)
  }

  const groups = useMemo<SetGroup[]>(() => {
    const live: SetGroup = {
      id: seed,
      situation: SITUATION,
      cards: deck.revealedSlots.map((s) => authored(s.key, deck.order.findIndex((o) => o.key === s.key))),
    }
    return live.cards.length ? [live, EARLIER] : [EARLIER]
  }, [deck.revealedSlots, deck.order, seed])

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: INTER, padding: '28px 20px 72px', color: INK }}>
      <CardBackStyles />

      {/* ══ the live surface ══ */}
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 26 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <EyeMark size={28} />
            <ShutapWordmark size={16} letterSpacing="-.04em" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <TrustLabel>preview as</TrustLabel>
            <div style={{ display: 'flex', gap: 5, background: '#f7f6f4', border: '.5px solid rgba(11,8,15,.08)', borderRadius: 999, padding: 4 }}>
              {TIERS.map((t) => {
                const on = tier === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => pickTier(t.id)}
                    aria-pressed={on}
                    style={{
                      border: 'none', cursor: 'pointer', height: 30, padding: '0 14px', borderRadius: 999,
                      background: on ? 'linear-gradient(92deg,#e7548a 0%,#890041 70%)' : 'transparent',
                      color: on ? '#fff' : MUTED, fontFamily: SORA, fontWeight: 800, fontSize: 11.5, lineHeight: 1,
                    }}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* The entry box is the existing composer on the home page and is not
            redesigned here. The deck is what appears under it, so this page
            starts with the situation already said. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <TrustLabel>what happened</TrustLabel>
          <span style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 17, lineHeight: 1.45, color: PROSE, textWrap: 'pretty', maxWidth: '64ch' }}>
            {SITUATION}
          </span>
        </div>

        {/* the deck */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 18, alignItems: 'start' }}>
          {deck.order.map((slot) => {
            const phase = deck.phaseOf(slot.key)
            const revealed = phase === 'edge' || phase === 'in'
            const card = authored(slot.key, deck.order.findIndex((o) => o.key === slot.key))
            return (
              <div key={slot.key} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <FlipCard
                  phase={phase}
                  onTap={() => deck.tap(slot.key)}
                  label={slot.label}
                  hint={revealed ? card.text : slot.subtitle}
                  spent={deck.isSpent(slot.key)}
                  describedBy={PAYWALL_ID}
                >
                  {revealed ? (
                    <div aria-live="polite">
                      <CardFace card={card} mark={tier !== 'paying'} loading={false} />
                    </div>
                  ) : (
                    <CardBack label={slot.label} subtitle={slot.subtitle} holding={phase === 'hold'} spent={deck.isSpent(slot.key)} />
                  )}
                </FlipCard>
                {revealed ? (
                  <CardActions
                    label={slot.label}
                    onPost={() => act('post')}
                    onShare={() => act('share')}
                    onDownload={() => act('download')}
                  />
                ) : null}
              </div>
            )
          })}
        </div>

        {tier === 'guest' && deck.used >= 1 ? (
          <PaywallBlock
            pulsing={deck.pulsing}
            line="you flipped one. the other two are written and waiting — an alias flips all three, and keeps them."
            cta="flip all three — free"
            onCta={() => setSheet(true)}
          />
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
          <TrustLabel>your cards</TrustLabel>
          <SetList groups={groups} />
        </div>
      </div>

      {/* ══ the surface, annotated ══ */}
      <div style={{ maxWidth: 1100, margin: '56px auto 0', display: 'flex', flexDirection: 'column', gap: 44 }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 28, borderTop: '.5px solid rgba(11,8,15,.08)' }}>
          <TrustLabel>the surface, annotated</TrustLabel>
          <h2 style={{ margin: 0, fontFamily: SORA, fontWeight: 800, fontSize: 26, lineHeight: 1.1, letterSpacing: '-.03em', color: INK }}>
            every state a card can be in
          </h2>
          <p style={{ margin: 0, fontFamily: NEWS, fontStyle: 'italic', fontSize: 17, lineHeight: 1.45, color: PROSE, maxWidth: '58ch', textWrap: 'pretty' }}>
            the deck above is live — tap to flip, switch tier to see the gates. below is the same surface held still, so each state can be read on its own.
          </p>
        </div>

        {/* 1 · the backs */}
        <Section eyebrow="1 · the backs" lede="off-white, identical across slots — label, permanent subtitle, one plum outline pill. no per-slot glyph, no per-slot accent, no hint of which face is underneath — or the choice is biased.">
          <div style={SPECIMENS}>
            {SLOTS.map((s) => (
              <Specimen key={s.key} caption={NOTES[s.key]}>
                <CardBack label={s.label} subtitle={s.subtitle} interactive={false} />
              </Specimen>
            ))}
          </div>
          <div style={SPECIMENS}>
            <Specimen caption="idle. the pill is the instruction; hover lifts 3px and nothing else.">
              <CardBack label="the take" subtitle="what actually happened here" interactive={false} />
            </Specimen>
            <Specimen caption="holding. turned over before the writer finished — it waits on its edge, pulsing, and says so in words.">
              <CardBack label="the clapback" subtitle="what you wish you'd said" holding interactive={false} />
            </Specimen>
            <Specimen caption="spent. a guest's other two: same card, the pill changes its line. a tap points at the block below the deck.">
              <CardBack label="the roast" subtitle="the joke" spent interactive={false} />
            </Specimen>
          </div>
          <Note style={{ fontSize: 13.5, color: PROSE, maxWidth: '70ch' }}>
            position is shuffled per set — the label carries identity, so first-flip preference data stays free of a positional confound.
          </Note>
        </Section>

        {/* 2 · the headline face */}
        <Section eyebrow="2 · the headline face" lede="off-white. the slot's subtitle, then the joke big in Sora with one phrase lit in plum — the turn the judge marked. never truncated: long jokes step down 11.5 → 9.6 → 8.2 → 7cqw and on.">
          <div style={SPECIMENS}>
            <Specimen caption="the take · 84 characters, 9.6cqw.">
              <CardFace card={authored('the_take', 0)} mark={false} />
            </Specimen>
            <Specimen caption="the clapback · the lit phrase can carry its own quotes.">
              <CardFace card={authored('the_clapback', 1)} mark={false} />
            </Specimen>
            <Specimen caption="the roast · ~100 characters. the lit phrase can run across a line break.">
              <CardFace card={authored('the_roast', 2, ROAST_HEADLINE)} mark={false} />
            </Specimen>
          </div>
        </Section>

        {/* 3 · the stack face */}
        <Section eyebrow="3 · the stack face" lede="ink, grain, the eyes. the setup in the voice, then the punchline one word a line, ramping white → mauve → dusk. two to four words; more than three share 60cqw between them.">
          <div style={SPECIMENS}>
            {STACKS.map((s, i) => (
              <Specimen key={s.words} caption={s.words}>
                <CardFace card={authored('the_roast', i, s.face)} mark={false} />
              </Specimen>
            ))}
          </div>
        </Section>

        {/* 4 · the mark */}
        <Section eyebrow="4 · the mark" lede="a guest's and a free card carry the name, three rows at -22°, in each surface's own ink. part of the picture, never a corner badge.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: 24 }}>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ width: 200, flex: 'none' }}>
                <CardFace card={authored('the_clapback', 0)} mark />
              </div>
              <div style={{ width: 200, flex: 'none' }}>
                <CardFace card={authored('the_roast', 1)} mark />
              </div>
              <div style={{ flex: '1 1 180px', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 9 }}>
                <Badge tone="neutral">guest · free</Badge>
                <Note>quiet enough to read the joke through, loud enough that a screenshot is obviously marked. 5% ink on off-white, 8.5% white on ink.</Note>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <StillPill strong>
                    <span style={{ fontFamily: INTER, fontWeight: 400, fontSize: 13 }}>◎</span>post as a room
                  </StillPill>
                  <StillPill>share</StillPill>
                  <StillPill>download</StillPill>
                </div>
                <Note>all three are present, never disabled. for a guest, tapping any of them opens the alias sheet — a guest who wants a room should meet the gate holding the thing they asked for, not a row with the ask missing from it.</Note>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ width: 200, flex: 'none' }}>
                <CardFace card={authored('the_clapback', 0)} mark={false} />
              </div>
              <div style={{ flex: '1 1 180px', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 9 }}>
                <Badge tone="brand">member</Badge>
                <Note>no mark, 1080×1920. the slogan and shutap.com stay either way — they&apos;re the card&apos;s job, not a tier perk.</Note>
                <Note>post as a room is the only action that touches other people, so it leads the row and carries a word instead of a glyph.</Note>
              </div>
            </div>
          </div>
        </Section>

        {/* 5 · spent */}
        <Section eyebrow="5 · spent" lede="a guest's two unflipped cards do not change. they are the sign-up wall — and a strong one, because the two labelled backs they cannot turn are right there. one honest ask in one place beats locks scattered across the surface.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                {(['the_take', 'the_roast'] as SlotKey[]).map((k) => {
                  const s = SLOTS.find((x) => x.key === k)!
                  return (
                    <div key={k} style={{ flex: 1, minWidth: 0 }}>
                      <CardBack label={s.label} subtitle={s.subtitle} spent interactive={false} />
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', background: '#f7f6f4', border: '.5px solid #e7548a', borderRadius: 22, padding: '16px 18px' }}>
                <span style={{ flex: '1 1 200px', minWidth: 0, fontFamily: INTER, fontSize: 14, lineHeight: 1.5, color: INK }}>
                  you flipped one. the other two are written and waiting — an alias flips all three, and keeps them.
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', height: 38, padding: '0 16px', borderRadius: 999, background: 'linear-gradient(92deg,#e7548a 0%,#890041 70%)', color: '#fff', fontFamily: SORA, fontWeight: 800, fontSize: 12, lineHeight: 1 }}>
                  flip all three — free
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Note style={{ fontSize: 13.5, color: PROSE }}>
                tapping a spent card does nothing on the card itself — it highlights the block below. the card tree carries none of these:
              </Note>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {BANS.map((b) => (
                  <span key={b} style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', height: 30, padding: '0 12px', borderRadius: 999, background: '#fff', border: '.5px solid rgba(11,8,15,.08)', fontFamily: INTER, fontWeight: 700, fontSize: 11.5, lineHeight: 1, color: MUTED }}>
                    {b}
                  </span>
                ))}
              </div>
              <Note style={{ fontSize: 13.5, color: PROSE }}>
                the paywall never appears above or between cards, and never overlays the deck. one panel, one line, one action, stated as behavior.
              </Note>
            </div>
          </div>
        </Section>

        {/* 6 · the rules underneath */}
        <Section eyebrow="6 · the rules underneath">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 18 }}>
            {RULES.map((r) => (
              <Panel key={r.title}>
                <span style={{ fontFamily: SORA, fontWeight: 800, fontSize: 12.5, lineHeight: 1.2, letterSpacing: '-.01em', color: INK }}>{r.title}</span>
                <Note>{r.body}</Note>
              </Panel>
            ))}
          </div>
        </Section>
      </div>

      {/* the alias sheet, as a picture of one */}
      {sheet ? (
        <div
          onClick={() => setSheet(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(10,5,14,.42)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 40 }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: '22px 22px 0 0', padding: '24px 22px 28px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, boxShadow: '0 -24px 70px -30px rgba(80,10,45,.60)' }}
          >
            <div style={{ width: 38, height: 4, borderRadius: 999, background: 'rgba(11,8,15,.14)', alignSelf: 'center' }} />
            <EyeMark size={30} />
            <span style={{ fontFamily: SORA, fontWeight: 800, fontSize: 21, lineHeight: 1.15, letterSpacing: '-.03em', color: INK }}>the other two need a name.</span>
            <span style={{ fontFamily: NEWS, fontStyle: 'italic', fontSize: 16, lineHeight: 1.45, color: PROSE }}>a fake one. that&apos;s the whole point of this place.</span>
            <Note style={{ fontSize: 13.5 }}>30 seconds, no real name. then all three are yours to flip, keep and send.</Note>
            <div style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: 9, marginTop: 4 }}>
              {/* Signing in keeps the deck as it stands — the card already
                  turned over stays turned over, and the wall lifts off the
                  other two. That is the product's behaviour, so the page
                  shows it rather than dealing a fresh set. */}
              <Button full onClick={() => { setSheet(false); setTier('free'); say('the other two are yours now — flip them.') }}>get my alias — flip all three</Button>
              <Button full variant="ghost" size="sm" onClick={() => setSheet(false)}>not yet</Button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div style={{ position: 'fixed', left: '50%', bottom: 26, transform: 'translateX(-50%)', background: INK, color: '#fff', borderRadius: 999, padding: '11px 20px', fontFamily: INTER, fontWeight: 700, fontSize: 13, lineHeight: 1, zIndex: 50, boxShadow: '0 18px 40px -14px rgba(80,10,45,.55)' }}>
          {toast}
        </div>
      ) : null}
    </div>
  )
}
