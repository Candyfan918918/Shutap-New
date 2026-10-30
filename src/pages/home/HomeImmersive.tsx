/* Home (Oct 29 2026): the write box, then the joke battle, "what to post
 * today" and the poll, then the footer. Every section under the write box
 * shares one shell (HomeSection / home-section.css). The rooms strip and the
 * FAQ are off the homepage (the FAQ lives at /faq). The site header comes
 * from the root layout. */
import { Suspense } from 'react'
import { Await } from '@tanstack/react-router'
import { EyeGradients } from './sections/EyeGradients'
import { BitSurface } from './bit/BitSurface'
import { HomeBattle } from './HomeBattle'
import { TodaysIdea } from './TodaysIdea'
import { HomePoll } from './HomePoll'
import { Footer } from '@/components/feed/Footer'
import type { DailyIdea } from '@/lib/daily-idea.functions'
import '@/components/feed/feed.css'

export function HomeImmersive({ dailyIdea = null }: { dailyIdea?: DailyIdea | null | Promise<DailyIdea | null> } = {}) {
  return (
    <>
      <EyeGradients />
      <main>
        <BitSurface />
        <HomeBattle />
        {/* Only this section waits for its data; the write box above never does. */}
        {dailyIdea instanceof Promise ? (
          <Suspense fallback={null}>
            <Await promise={dailyIdea}>{(idea) => <TodaysIdea idea={idea} />}</Await>
          </Suspense>
        ) : (
          <TodaysIdea idea={dailyIdea} />
        )}
        <HomePoll />
      </main>
      <div className="fd" style={{ minHeight: 0 }}>
        <Footer />
      </div>
    </>
  )
}
