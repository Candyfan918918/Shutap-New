import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { KitPage } from '@/pages/realtors/KitPage'
import { PrompterDemo } from '@/pages/realtors/PrompterDemo'
import { pageMeta } from '@/lib/seo/page-meta'
import { KIT_ONCE, PLANS, usd } from '@/lib/pricing'
import { Footer } from '@/components/feed/Footer'
import { SampleKit } from '@/pages/realtors/SampleKit'
import '@/components/feed/feed.css'
import '@/pages/realtors/realtors.css'

// Shutap for Realtors, the landing (Nov 6 2026). Public and indexed; the
// kit page behind it is dark until the realtors flag is on.
const TITLE = 'Shutap for Realtors — your listing, funnier. The walkthrough, voiceover, hooks, open-house kit and posts from one link'
const DESC = 'Paste the listing link. Shutap writes the walkthrough to shoot, the voiceover for text-to-voice, the hooks, the open-house kit, the posts and the straight copy, in your tone: professional, funny, luxury or young. Fair-housing checked, nothing made up. First kit free.'

export const Route = createFileRoute('/realtors/')({
  // Nov 6 2026: /realtors is the tool; /realtors/kit is gone.
  validateSearch: (s: Record<string, unknown>) => z.object({ kit: z.string().uuid().optional(), session_id: z.string().max(200).optional(), prepaid: z.string().max(200).optional(), url: z.string().max(2000).optional(), text: z.string().max(2).optional() }).parse(s),
  head: () => ({ meta: pageMeta(TITLE, DESC, '/realtors') }),
  component: Landing,
})

const OUTS = [
  ['The walkthrough', '8–12 shots: where to stand, what is in frame, the one line, the seconds. 15s, 30s and 60s cuts.'],
  ['The voiceover', 'Clean narration timed to the cut, for text-to-voice or your own voice over B-roll.'],
  ['Hooks', 'Three first-two-second openers, on screen and spoken.'],
  ['Open-house kit', 'Invite post, 3-frame story, the A-frame line, the day-before reminder, the thank-you text.'],
  ['Posts', 'Just listed, price improvement, pending, sold: Instagram, TikTok, Facebook, LinkedIn lengths.'],
  ['Straight copy', 'The MLS-ready description with no jokes, so the kit is complete.'],
]
const QA = [
  ['Is it fair-housing safe?', 'Every line is checked: nothing about who lives nearby, no "families", "safe" or "quiet neighborhood". The jokes are about the house, the market, the commute and the buyer\'s life, never a person.'],
  ['Will it make something up?', 'No. The kit uses only what the listing says and what you add. No invented renovations, no invented views. Every number in the kit is a number on the listing.'],
  ['Who sees my listings?', 'You. Kits are private to your account; nobody at Shutap reads them and they never train anything.'],
  ['How do I film it?', 'Open shoot mode on the phone you read from: big text, one line at a time, scrolls by itself. Record with a second phone or a laptop. Shutap never opens your camera.'],
]

function Landing() {
  const { kit, session_id, prepaid, url, text } = Route.useSearch()
  return (
    <div className="fd rl">
      <KitPage kitId={kit} sessionId={session_id} prepaidSession={prepaid} urlIn={url} textIn={text === '1'}>
        <div className="rl-demos">
          <div>
            <p className="rl-kicker" style={{ textAlign: 'left' }}>the demo · a real listing, all six outputs</p>
            <div style={{ marginTop: 8 }}><SampleKit /></div>
          </div>
          <div>
            <p className="rl-kicker" style={{ textAlign: 'left' }}>the demo · shoot mode on your phone</p>
            <div style={{ marginTop: 8 }}><PrompterDemo /></div>
          </div>
        </div>

        <div>
          <p className="rl-kicker" style={{ textAlign: 'left' }}>four tones · one per kit</p>
          <div className="rl-grid" style={{ marginTop: 8 }}>
            {[['Professional & trustworthy', 'facts first, one dry line'], ['Funny & relatable', 'the honest listing, full roast'], ['Sophisticated & luxury', 'understated, a wink at the end'], ['Young & trend-aware', 'fast cuts, POV, text on screen']].map(([h, p]) => (
              <div key={h} className="rl-tile"><h3>{h}</h3><p>{p}</p></div>
            ))}
          </div>
          <p className="rl-note" style={{ marginTop: 8 }}>roast the house · roast the neighborhood · mention the price, each on or off · must-say and never-say words · fair-housing check on every line · never the seller or a buyer by name</p>
        </div>

        <div>
          <p className="rl-kicker" style={{ textAlign: 'left' }}>one link · six things to shoot and post</p>
          <div className="rl-grid" style={{ marginTop: 8 }}>{OUTS.map(([h, p]) => <div key={h} className="rl-tile"><h3>{h}</h3><p>{p}</p></div>)}</div>
        </div>

        <div>
          <p className="rl-kicker" style={{ textAlign: 'left' }}>pricing</p>
          <div className="rl-grid" style={{ marginTop: 8 }}>
            <div className="rl-tile"><h3>First kit · free</h3><p>One listing, all six outputs, every tone to try. Each output ends with "— shutap.com". Sign in with Google or Apple.</p></div>
            <div className="rl-tile"><h3>Basic · {usd(PLANS.basic.amount)}/month</h3><p>20 kits a month. Every copy, the PDF and shoot mode: unlimited, nothing marked. Plus everything in Shutap for creators.</p></div>
            <div className="rl-tile"><h3>Pro · {usd(PLANS.pro.amount)}/month</h3><p>Unlimited kits, rewrites and downloads, nothing marked.</p></div>
            <div className="rl-tile"><h3>One kit · {usd(KIT_ONCE.amount)}</h3><p>One listing, no subscription. Copy and download it without limits or marks, and rewrite it for 30 days.</p></div>
          </div>
        </div>

        <div>
          <p className="rl-kicker" style={{ textAlign: 'left' }}>questions</p>
          {QA.map(([q, a]) => <div key={q} style={{ marginTop: 10 }}><h3 style={{ margin: '0 0 3px', font: '700 15px var(--sora)', color: 'var(--wine)' }}>{q}</h3><p className="rl-note" style={{ fontSize: 14, color: 'var(--ink-2)' }}>{a}</p></div>)}
        </div>
      </KitPage>
      <Footer />
    </div>
  )
}
