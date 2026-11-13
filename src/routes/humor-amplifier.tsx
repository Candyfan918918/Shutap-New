import { createFileRoute, redirect } from '@tanstack/react-router'
import { ContentPage } from '@/components/seo/ContentPage'
import { SITE_URL } from '@/lib/site'
import { breadcrumbScript } from '@/lib/seo/breadcrumbs'

const PATH = '/humor-amplifier'
const TITLE = 'Shutap Bits — write your bit, AI fills only the gaps | Shutap Humor Amplifier Lab'
const DESCRIPTION = 'Shutap Bits, for creators and comedians: tell your story your way and get it back as a bit (hook, setup, two tags, button) in your own words, tap funnier on any line you’re stuck on, and get a 5-second video, stand-up, a sketch and a skit.'

export const Route = createFileRoute('/humor-amplifier')({
  // newnav (Nov 6 2026): the product page is /bits; this URL keeps working
  beforeLoad: async () => {
    const { getFlags } = await import('@/lib/flags.functions')
    const f = await getFlags().catch(() => null)
    if (f?.newnav) throw redirect({ to: '/bits', statusCode: 301 })
  },
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
    scripts: [breadcrumbScript([{ name: 'The humor amplifier', path: PATH }])],
  }),
  component: HumorAmplifierPage,
})

function HumorAmplifierPage() {
  return (
    <ContentPage
      tryIt="humor-amplifier"
      breadcrumbs={[{ name: 'The humor amplifier', path: PATH }]}
      h1="The humor amplifier: your bit, funnier where you ask"
      capsule="Shutap amplifies your humor without replacing it. On Shutap Bits you tell it your way and get it back as a bit: a hook, a setup, two tags and a button, your words kept word for word, and any line your story didn't cover drafted by the AI copilot. When a line isn't landing, tap funnier for three other ways to say it, yours first. The finished bit comes back as a 5-second video to post, and stand-up, a sketch and a skit to perform."
      cta={{ label: 'Write your bit. AI fills only the gaps.', href: '/bits' }}
      sections={[
        {
          heading: 'Your material, not a random one-liner',
          body: 'A topic such as “work” gives any joke tool very little to work with. The meeting your manager called to discuss having fewer meetings gives you a scene, a contradiction and somewhere to go. You write that situation as your bit, and Shutap helps only on the lines you ask about.',
        },
        {
          heading: 'What makes it a complete bit?',
          body: 'The hook opens with a reason to listen. The setup gives the audience enough of the story to follow the turn. Tags add laughs after that turn without starting the story again. The button is the final line: the ending you can stop on. The box asks for each of these as its own line, so you write a sequence to perform, not just a sentence to paste into a caption.',
        },
        {
          heading: 'How to amplify your own bit',
          body: 'Tell the story your way; Shutap cuts it into the parts of a bit in your words. Include who did what, the exact words you remember and the small detail that made it ridiculous; leave real names out. If a line is flat, tap funnier on it: you get three other ways to say it, built from your other lines, and nothing changes until you pick. Lock the lines that are done, then make the bit.',
        },
        {
          heading: 'For anyone who needs to say it funnier',
          body: 'Creators can shape a storytime premise into a post for TikTok, Instagram Reels or YouTube Shorts. Comedians can work a familiar experience into a stand-up bit to rehearse and refine. Choose a social, live, office, work, family or school audience and a deadpan, storyteller or dry voice for the options funnier offers.',
        },
        {
          heading: 'From your lines to a post',
          body: 'Download the 5-second video and post it, or run your bit as stand-up on the teleprompter, with delivery cues to rehearse with, lay it out as a skit you film alone, or format it as a one-page sketch. The format changes how you use the material; the lines stay yours. Rehearse the pauses before recording or performing.',
        },
      ]}
      others={[
        { href: '/how-it-works', label: 'How Shutap works' },
        { href: '/guides', label: 'Writing guides and tools' },
        { href: '/faq', label: 'FAQ' },
      ]}
    />
  )
}