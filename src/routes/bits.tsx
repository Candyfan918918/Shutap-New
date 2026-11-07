import { createFileRoute } from '@tanstack/react-router'
import { ContentPage } from '@/components/seo/ContentPage'
import { SITE_URL } from '@/lib/site'
import { breadcrumbScript } from '@/lib/seo/breadcrumbs'

// Shutap Bits (Nov 6 2026): the product page for the box, for creators and
// comedians. The box itself stays on the homepage; this page embeds it.
const PATH = '/bits'
const TITLE = 'Shutap Bits — your voice, your call. Funnier only where you ask | for creators and comedians'
const DESCRIPTION = 'Your voice, your call. Build your bit line by line, in your own voice: Shutap only touches a line when you tap "funnier", and you decide what stays. With the 5-second video, stand-up on the prompter, a sketch page and a skit. Free to start.'

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
    scripts: [breadcrumbScript([{ name: 'Shutap Bits', path: PATH }])],
  }),
  component: BitsPage,
})

function BitsPage() {
  return (
    <ContentPage
      tryIt="humor-amplifier"
      breadcrumbs={[{ name: 'Shutap Bits', path: PATH }]}
      h1="Your bit, funnier."
      capsule="Your voice, your call. Funnier only where you ask. A clearer way to build your bit, in your own voice. Shutap only touches a line when you tap “funnier”, and you decide what stays. For creators and comedians."
      hero={{ kicker: 'shutap bits · for creators and comedians', h1: ['Your bit, ', 'funnier.'], lead: 'Your voice, your call. A clearer way to build your bit, in your own voice: Shutap only touches a line when you tap “funnier”, and you decide what stays.' }}
      cta={{ label: 'Write a bit', href: '#bit-write' }}
      sections={[
        { heading: 'Type it, tap funnier, post it', body: '1. Type your bit, line by line. 2. Tap “funnier” on any line you want punched up. 3. Post it, or perform it. The box is already a bit: hook, setup, two tags, button. Write any line yourself, lock the ones you like, and "finish the bit" writes only what you left empty, around yours. Nothing on the page changes until you tap.' },
        { heading: 'What a complete bit is', body: 'The hook opens with a reason to listen, in the first two seconds. The setup gives just enough of the story to follow the turn. Tags add laughs after the turn without restarting the story. The button is the last line, the one you can stop on.' },
        { heading: 'The video, the stage, the page', body: 'Every bit comes with a 5-second cartoon whose cast and room match the story. Run it as stand-up on the teleprompter, lay it out as a skit you can film alone, or as a one-page sketch in screenplay format.' },
        { heading: 'Hotter, tighter, swapped, mixed', body: 'Rewrites go hotter or tighter, swap the crowd-work line, or let you mix your own from every candidate. My creations keeps every version. Free writes one bit a day; Basic three with rewrites; Pro without limits.' },
        { heading: 'Who it is for', body: 'Creators with a storytime that needs a post. Comedians working a premise into a bit to rehearse. Social media managers, hosts, podcasters and speakers who have to be funny on a schedule. Nobody at Shutap reads your stories, and they never train anything.' },
      ]}
      others={[
        { href: '/realtors', label: 'Shutap for Realtors' },
        { href: '/toasts', label: 'Shutap Toasts' },
        { href: '/business', label: 'Shutap Enterprise' },
        { href: '/how-it-works', label: 'How Shutap works' },
        { href: '/pricing', label: 'Pricing' },
      ]}
    />
  )
}
