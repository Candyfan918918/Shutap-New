/* Home: the write box, then the latest posts, FAQ and footer. The site
 * header comes from the root layout. */
import { EyeGradients } from './sections/EyeGradients'
import { JokeSurface } from './joke/JokeSurface'
import { HomeRest } from './HomeRest'
import type { NewestRoom } from '@/lib/newest-rooms.functions'

export function HomeImmersive(_: { openRoomsCount?: number; newestRooms?: NewestRoom[] } = {}) {
  return (
    <>
      <EyeGradients />
      <main>
        <JokeSurface />
        <HomeRest />
      </main>
    </>
  )
}
