/* Home: the write box, then the latest posts, FAQ and footer. The site
 * header comes from the root layout. */
import { EyeGradients } from './sections/EyeGradients'
import { BitSurface } from './bit/BitSurface'
import { HomeRest } from './HomeRest'
import type { NewestRoom } from '@/lib/newest-rooms.functions'

export function HomeImmersive(_: { openRoomsCount?: number; newestRooms?: NewestRoom[] } = {}) {
  return (
    <>
      <EyeGradients />
      <main>
        <BitSurface />
        <HomeRest />
      </main>
    </>
  )
}
