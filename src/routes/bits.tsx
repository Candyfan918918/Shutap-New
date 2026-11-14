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
const TITLE = 'Shutap Bits — create, refine, practice and rehearse your bit'
const DESCRIPTION = 'Create your bit from one line: Shutap cuts what you type into a hook, setup, two tags and a button, your words word for word, and the AI copilot drafts any line your story didn’t cover. Refine it with funnier on any line, practice on a teleprompter with delivery cues, rehearse it as a sketch or a skit, and post the 5-second video. Free, no sign-in to start.'

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
