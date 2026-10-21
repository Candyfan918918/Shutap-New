/* Home: the write box, then the latest posts, FAQ and footer. The site
 * header comes from the root layout. */
import { Suspense } from 'react'
import { Await } from '@tanstack/react-router'
import { EyeGradients } from './sections/EyeGradients'
import { BitSurface } from './bit/BitSurface'
import { HomeRest } from './HomeRest'
import type { NewestRoom } from '@/lib/newest-rooms.functions'
import type { DailyIdea } from '@/lib/daily-idea.functions'
import { TodaysIdea } from './TodaysIdea'

export function HomeImmersive({ dailyIdea = null }: { openRoomsCount?: number; newestRooms?: NewestRoom[]; dailyIdea?: DailyIdea | null | Promise<DailyIdea | null> } = {}) {
  return (
    <>
      <EyeGradients />
      <main>
        <BitSurface />
        {/* Only this section waits for its data; the write box above never does. */}
        {dailyIdea instanceof Promise ? (
          <Suspense fallback={null}>
            <Await promise={dailyIdea}>{(idea) => <TodaysIdea idea={idea} />}</Await>
          </Suspense>
        ) : (
          <TodaysIdea idea={dailyIdea} />
        )}
        <HomeRest />
      </main>
    </>
  )
}
