import { createFileRoute } from '@tanstack/react-router'
import { SITE_URL } from '@/lib/site'
import { breadcrumbScript } from '@/lib/seo/breadcrumbs'
import { BitsLanding, BITS_FAQ } from '@/pages/bits/BitsLanding'
import { getBitDemo } from '@/lib/bits/demo.functions'

// Shutap Bits (Nov 8 2026 redesign, approved by Candy): the person writes
// all five lines; Shutap helps only where they tap "funnier", and lays the
// finished bit out as the video, stand-up, sketch and skit. The box, the
// trust row and a live preview of what the lines become are in the first
// screen. Server-rendered and indexed.
const PATH = '/bits'
const TITLE = 'Shutap Bits — write your bit line by line, funnier only where you ask'
const DESCRIPTION = 'For creators and comedians: write your hook, setup, two tags and button in your own words. Tap funnier on any line for three other ways to say it, yours first. Then post it as a 5-second video, or rehearse and perform it as stand-up with delivery cues, a sketch or a skit. Free to start.'

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: BITS_FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}

export const Route = createFileRoute('/bits')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: `${SITE_URL}${PATH}` },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: TITLE },
      { name: 'twitter:description', content: DESCRIPTION },
    ],
    links: [{ rel: 'canonical', href: `${SITE_URL}${PATH}` }],
    scripts: [breadcrumbScript([{ name: 'Shutap Bits', path: PATH }]), { type: 'application/ld+json', children: JSON.stringify(faqSchema) }],
  }),
  // the demo: the newest bit Candy picked in /bit-lab (null until there is one)
  loader: () => getBitDemo(),
  staleTime: 5 * 60 * 1000,
  component: BitsRoute,
})

function BitsRoute() {
  const demo = Route.useLoaderData()
  return <BitsLanding demo={demo} />
}
