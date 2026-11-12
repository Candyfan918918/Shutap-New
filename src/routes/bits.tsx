import { createFileRoute } from '@tanstack/react-router'
import { SITE_URL } from '@/lib/site'
import { breadcrumbScript } from '@/lib/seo/breadcrumbs'
import { BitsLanding, BITS_FAQ } from '@/pages/bits/BitsLanding'
import { getBitDemo } from '@/lib/bits/demo.functions'

// Shutap Bits (Nov 12 2026 redesign, approved by Candy): the demo's four
// outputs first (video, stand-up with cues, sketch, skit), then the story
// box; Shutap cuts the story into a bit, their words only. Server-rendered
// and indexed.
const PATH = '/bits'
const TITLE = 'Shutap Bits — tell it your way, get a video, a teleprompter with cues, a sketch and a skit'
const DESCRIPTION = 'For creators and comedians: tell your story your way and Shutap cuts it into a bit (hook, setup, two tags, button), every word yours. Tap funnier on any line for three other ways to say it. Post it as a 5-second video, or rehearse and perform it as stand-up with delivery cues, a sketch or a skit. Free, no sign-in to start.'

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
