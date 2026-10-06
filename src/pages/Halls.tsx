/* Hall of Fame hub — presentation matches Shutap_Hall_of_Fame_standalone.html.
 * Data / links / navigation unchanged (rows link to /stream, seed values kept). */
import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'

import { SiteFooter } from '@/components/site/SiteFooter'
import { Words } from '@/components/motion'
import { useToast } from '@/components/Toast'
import type { HallSlug } from '@/lib/seo/halls'

type TabKey =
  | 'loving' | 'bravest' | 'healing' | 'relatable' | 'hardest' | 'funniest'
type WinKey = 'daily' | 'weekly' | 'all'
type Band = 'held' | 'honored' | 'legend'

interface HubEntry {
  rank: number
  emoji: string
  title: string
  alias: string
  same: number
  restedDaysAgo: number
  resonance: number
  band: Band
}

const TABS: Array<{ k: TabKey; emoji: string; label: string; deep: HallSlug | null }> = [
  { k: 'loving',    emoji: '🤍', label: 'Most Loving',    deep: 'best-outcomes' },
  { k: 'bravest',   emoji: '💪', label: 'Bravest',        deep: 'longest-thread' },
  { k: 'healing',   emoji: '🌿', label: 'Most Healing',   deep: null },
  { k: 'relatable', emoji: '🫂', label: 'Most Relatable', deep: 'most-related' },
  { k: 'hardest',   emoji: '🪨', label: 'Hardest-Won',    deep: null },
  { k: 'funniest',  emoji: '😭', label: 'Funniest',       deep: null },
]

const WINDOWS: Array<{ k: WinKey; label: string }> = [
  { k: 'daily',  label: 'daily' },
  { k: 'weekly', label: 'weekly' },
  { k: 'all',    label: 'all time' },
]

// Seed leaderboards — one small deck per hall. All entries link to /stream.
const SEED: Record<TabKey, HubEntry[]> = {
  loving: [
    { rank: 1, emoji: '🤍', title: "my dad wrote me a letter after 12 years of silence.",        alias: 'Quiet Nigerian Swan', same: 812, restedDaysAgo: 3, resonance: 847, band: 'legend' },
    { rank: 2, emoji: '🌸', title: 'my mom finally said she was proud of me.',                    alias: 'Soft Japanese Fox',    same: 604, restedDaysAgo: 6, resonance: 634, band: 'honored' },
    { rank: 3, emoji: '💌', title: 'I told my grandma I loved her before she went.',              alias: 'Tender Greek Deer',    same: 511, restedDaysAgo: 9, resonance: 521, band: 'honored' },
    { rank: 4, emoji: '🕯', title: 'my brother apologized. we cried in the driveway.',            alias: 'Gentle Kenyan Ibis',   same: 402, restedDaysAgo: 12, resonance: 478, band: 'held' },
    { rank: 5, emoji: '☕️', title: "my ex reached out to say she's sober now.",                   alias: 'Steady Chilean Hare',  same: 318, restedDaysAgo: 14, resonance: 411, band: 'held' },
  ],
  bravest: [
    { rank: 1, emoji: '🪨', title: 'I quit the job that was killing me. no offer waiting.',       alias: 'Defiant Italian Owl',  same: 921, restedDaysAgo: 2, resonance: 932, band: 'legend' },
    { rank: 2, emoji: '💪', title: "I told my parents I'm not going back to med school.",         alias: 'Loud Filipino Bear',   same: 688, restedDaysAgo: 5, resonance: 741, band: 'honored' },
    { rank: 3, emoji: '🚪', title: "I left the marriage. it took me nine years to.",              alias: 'Weary Turkish Wolf',   same: 542, restedDaysAgo: 8, resonance: 612, band: 'honored' },
    { rank: 4, emoji: '🛑', title: 'I called out my boss in the meeting. hands shaking.',         alias: 'Bright Indian Otter',  same: 407, restedDaysAgo: 11, resonance: 488, band: 'held' },
    { rank: 5, emoji: '📞', title: "I called the hotline. I'd never done that before.",           alias: 'Small Polish Lark',    same: 296, restedDaysAgo: 13, resonance: 355, band: 'held' },
  ],
  healing: [
    { rank: 1, emoji: '🌿', title: 'six months sober today. no one at home knows yet.',           alias: 'Patient Pakistani Hedgehog', same: 764, restedDaysAgo: 4, resonance: 812, band: 'legend' },
    { rank: 2, emoji: '🌱', title: "I finally started therapy. it's not what I feared.",          alias: 'Careful Mexican Wren',       same: 522, restedDaysAgo: 7, resonance: 604, band: 'honored' },
    { rank: 3, emoji: '🕊', title: "I stopped talking to the friend who kept draining me.",       alias: 'Restless Indian Lion',       same: 448, restedDaysAgo: 9, resonance: 511, band: 'honored' },
    { rank: 4, emoji: '💊', title: 'my meds are finally working. I laughed today.',                alias: 'Wistful Brazilian Fox',      same: 356, restedDaysAgo: 12, resonance: 402, band: 'held' },
    { rank: 5, emoji: '🛁', title: "I let myself rest for a whole weekend and didn't apologize.", alias: 'Quiet Filipino Owl',         same: 271, restedDaysAgo: 15, resonance: 318, band: 'held' },
  ],
  relatable: [
    { rank: 1, emoji: '🫂', title: "my brother and I haven't spoken in two years over a parking spot.", alias: 'Quiet Filipino Owl', same: 1204, restedDaysAgo: 1, resonance: 1044, band: 'legend' },
    { rank: 2, emoji: '🍞', title: "I babysat for free for a neighbor who dropped me the second she could.", alias: 'Wistful Brazilian Fox', same: 812, restedDaysAgo: 4, resonance: 877, band: 'honored' },
    { rank: 3, emoji: '💼', title: "my coworker takes credit for my ideas in the exact meetings I can't attend.", alias: 'Defiant Kenyan Bear', same: 611, restedDaysAgo: 6, resonance: 703, band: 'honored' },
    { rank: 4, emoji: '🚌', title: 'I gave my seat to an old man on the train and he told me a story I can\'t forget.', alias: 'Restless Indian Lion', same: 458, restedDaysAgo: 10, resonance: 522, band: 'held' },
    { rank: 5, emoji: '📱', title: "she left me on read for four days. we live together.",         alias: 'Patient Pakistani Hedgehog', same: 341, restedDaysAgo: 13, resonance: 411, band: 'held' },
  ],
  hardest: [
    { rank: 1, emoji: '🪨', title: 'we buried my dad on tuesday. I went back to work wednesday.',  alias: 'Heavy Egyptian Crane',  same: 702, restedDaysAgo: 5, resonance: 793, band: 'legend' },
    { rank: 2, emoji: '⛰',  title: "I miscarried a second time. no one knows I was pregnant.",     alias: 'Silent Korean Hare',    same: 587, restedDaysAgo: 8, resonance: 641, band: 'honored' },
    { rank: 3, emoji: '🌧', title: "my kid told me they hate me. I didn't have a good answer.",   alias: 'Tired French Stag',     same: 456, restedDaysAgo: 11, resonance: 522, band: 'honored' },
    { rank: 4, emoji: '🕳', title: "I lost the house. we're staying with my mother-in-law.",       alias: 'Weary Turkish Wolf',    same: 372, restedDaysAgo: 13, resonance: 411, band: 'held' },
    { rank: 5, emoji: '🩹', title: "the diagnosis came back. I haven't told anyone yet.",          alias: 'Small Polish Lark',    same: 258, restedDaysAgo: 15, resonance: 322, band: 'held' },
  ],
  funniest: [
    { rank: 1, emoji: '😭', title: 'my roommate labels her cheese. all seven kinds.',              alias: 'Loud Filipino Bear',   same: 634, restedDaysAgo: 2, resonance: 812, band: 'legend' },
    { rank: 2, emoji: '🤣', title: "I sent 'i love you' to my boss instead of my partner.",       alias: 'Bright Indian Otter',  same: 512, restedDaysAgo: 5, resonance: 641, band: 'honored' },
    { rank: 3, emoji: '🙈', title: 'my toddler told the pediatrician I said the s-word.',          alias: 'Gentle Kenyan Ibis',   same: 421, restedDaysAgo: 7, resonance: 522, band: 'honored' },
    { rank: 4, emoji: '🎂', title: "I forgot my own birthday. my mom called at midnight in tears.", alias: 'Steady Chilean Hare',  same: 318, restedDaysAgo: 12, resonance: 411, band: 'held' },
    { rank: 5, emoji: '🚿', title: 'I sang in the shower. my apartment has no walls apparently.',  alias: 'Soft Japanese Fox',    same: 244, restedDaysAgo: 14, resonance: 322, band: 'held' },
  ],
}

const STATS = [
  { n: '3,841', label: 'inducted all time' },
  { n: '312',   label: 'rested this week' },
  { n: '71%',   label: 'tellers felt heard' },
  { n: '11',    label: 'Legend inductees', accent: true },
]

const BAND_STYLE: Record<Band, { bg: string; color: string; label: string }> = {
  held:    { bg: 'rgba(11,8,15,.06)',                                                   color: '#443c42', label: 'Held' },
  honored: { bg: 'rgba(23,19,26,.10)',                                                color: '#17131a', label: 'Honored' },
  legend:  { bg: 'linear-gradient(92deg,rgba(23,19,26,.2),rgba(23,19,26,.15))',     color: '#2b2630', label: 'Legend' },
}

function resonanceColor(band: Band): string {
  if (band === 'legend') return '#2b2630'
  if (band === 'honored') return '#17131a'
  return '#6f666c'
}

export function HallOfFamePageNative() {
  const [tab, setTab] = useState<TabKey>('loving')
  const [win, setWin] = useState<WinKey>('daily')
  const { toast, ToastHost } = useToast()

  const active = useMemo(() => TABS.find((t) => t.k === tab)!, [tab])
  const rows = SEED[tab]

  const onShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      if (navigator.share) { await navigator.share({ title: `shutap · ${active.label}`, url }); return }
      await navigator.clipboard.writeText(url)
      toast('link copied.')
    } catch { /* dismissed */ }
  }

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', color: '#0b080f', fontFamily: "'Sora',system-ui,sans-serif" }}>
      <main style={{ maxWidth: 740, margin: '0 auto', padding: '32px 22px 80px' }}>
        {/* eyebrow */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: '#2b2630', marginBottom: 14 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2b2630', display: 'block' }} />
          Hall of Fame
        </div>

        <Words as="h1" style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(26px,5vw,36px)', lineHeight: 1.2, margin: '0 0 10px', color: '#0b080f' }}>
          rooms the world remembered.
        </Words>
        <p style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 16, color: '#443c42', margin: '0 0 28px', maxWidth: '46ch' }}>
          rooms that rested with enough resonance to be inducted. six halls. real stories. real people.
        </p>

        {/* stats strip */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 28, padding: '20px 22px', background: '#fff', border: '.5px solid rgba(11,8,15,.08)', borderRadius: 18 }}>
          {STATS.map((s) => (
            <div key={s.label}>
              <b style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 24, color: s.accent ? '#17131a' : '#0b080f', display: 'block', letterSpacing: '-.02em' }}>{s.n}</b>
              <span style={{ fontSize: 12, color: '#6f666c' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* hall tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none', marginBottom: 20 }}>
          {TABS.map((t) => {
            const isActive = t.k === tab
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '9px 16px', borderRadius: 999,
                  border: `1.5px solid ${isActive ? '#0b080f' : 'rgba(11,8,15,.10)'}`,
                  background: isActive ? '#0b080f' : '#fff',
                  color: isActive ? '#fdfbf9' : '#443c42',
                  fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 14,
                  cursor: 'pointer', transition: '.18s', whiteSpace: 'nowrap',
                }}
              >
                <span aria-hidden>{t.emoji}</span> {t.label}
              </button>
            )
          })}
        </div>

        {/* window mini-pills */}
        <div style={{ display: 'flex', gap: 7, marginBottom: 18 }}>
          {WINDOWS.map((w) => {
            const on = w.k === win
            return (
              <button
                key={w.k}
                onClick={() => setWin(w.k)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 999,
                  border: `1px solid ${on ? '#0b080f' : 'rgba(11,8,15,.10)'}`,
                  background: on ? '#0b080f' : '#fff',
                  color: on ? '#fdfbf9' : '#443c42',
                  fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: '.06em',
                  cursor: 'pointer', transition: '.18s',
                }}
              >{w.label}</button>
            )
          })}
        </div>

        {/* board */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* share row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
            <button
              onClick={onShare}
              style={{
                background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                color: '#17131a', borderBottom: '1px solid rgba(23,19,26,.3)',
                fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 13,
              }}
            >🔗 share this hall</button>
          </div>

          {rows.map((r, i) => {
            const bs = BAND_STYLE[r.band]
            const top = i === 0
            const isLegend = r.band === 'legend'
            const rowBg = isLegend
              ? 'linear-gradient(180deg,#f4f4f4,#fff)'
              : top
                ? 'linear-gradient(180deg,#ffffff,#fff)'
                : '#fff'
            const rowBorder = isLegend
              ? '.5px solid rgba(23,19,26,.4)'
              : top
                ? '.5px solid rgba(23,19,26,.28)'
                : '.5px solid rgba(11,8,15,.08)'
            return (
              <Link
                key={r.rank}
                to="/stream"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: rowBg, border: rowBorder,
                  borderRadius: 16, padding: '14px 17px',
                  textDecoration: 'none', color: 'inherit',
                  animation: `hall-fadeup .35s ease ${i * 0.06}s both`,
                }}
              >
                <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 14, color: top ? '#2b2630' : '#6f666c', width: 28, flex: 'none' }}>#{r.rank}</div>
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#fdfbf9', display: 'grid', placeItems: 'center', fontSize: 18, flex: 'none' }}>{r.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.3, color: '#0b080f', margin: '0 0 6px' }}>{r.title}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 12, color: '#6f666c' }}>{r.alias}</span>
                    <span style={{ fontSize: 11, color: '#6f666c' }}>·</span>
                    <span style={{ fontSize: 12, color: '#6f666c', fontFamily: "'Newsreader',serif", fontStyle: 'italic' }}>
                      <b style={{ color: '#17131a', fontStyle: 'normal' }}>{r.same.toLocaleString()}</b> said 'omg same'
                    </span>
                    <span style={{ fontSize: 11, color: '#6f666c' }}>·</span>
                    <span style={{ fontSize: 11.5, color: '#6f666c', fontFamily: "'Newsreader',serif", fontStyle: 'italic' }}>rested {r.restedDaysAgo}d ago</span>
                  </div>
                </div>
                <div style={{ flex: 'none', textAlign: 'right' }}>
                  <b style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 18, color: resonanceColor(r.band), display: 'block', fontVariantNumeric: 'tabular-nums' }}>{r.resonance}</b>
                  <span style={{ display: 'inline-block', marginTop: 4, padding: '3px 9px', borderRadius: 999, background: bs.bg, fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: bs.color }}>{bs.label}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
      <SiteFooter />
      {ToastHost}
    </div>
  )
}
