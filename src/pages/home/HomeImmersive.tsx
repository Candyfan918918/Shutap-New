/* Home (Oct 29 2026): two sections only. The write box first, the joke
 * battle second, then the footer. The poll, "what to post today", the rooms
 * strip and the FAQ are off the homepage (the FAQ lives at /faq). The site
 * header comes from the root layout. */
import { EyeGradients } from './sections/EyeGradients'
import { BitSurface } from './bit/BitSurface'
import { HomeBattle } from './HomeBattle'
import { Footer } from '@/components/feed/Footer'
import '@/components/feed/feed.css'

export function HomeImmersive() {
  return (
    <>
      <EyeGradients />
      <main>
        <BitSurface />
        <HomeBattle />
      </main>
      <div className="fd" style={{ minHeight: 0 }}>
        <Footer />
      </div>
    </>
  )
}
