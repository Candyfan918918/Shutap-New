import { createFileRoute } from '@tanstack/react-router'
import { ContentPage } from '@/components/seo/ContentPage'
import { SITE_URL } from '@/lib/site'
import { breadcrumbScript } from '@/lib/seo/breadcrumbs'

const PATH = '/humor-amplifier'
const TITLE = 'The Humor Amplifier — Turn What Happened Into a Post | Shutap'
const DESCRIPTION = 'Shutap, the humor amplifier: type what happened and get a bit in your voice, a 5-second video, a caption and hashtags. Hook, setup, tags and button. For creators, short videos and stand-up.'

export const Route = createFileRoute('/humor-amplifier')({
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
      h1="The humor amplifier: turn what happened into a post"
      capsule="Shutap amplifies your own story into a complete bit — hook, setup, tags and button — in your voice, with a 5-second video, a caption and five hashtags, ready to post. Start with what happened to you, not a request for a random joke. It amplifies your humor; it never replaces it."
      cta={{ label: 'Type what happened. Say it funnier.', href: '/' }}
      sections={[
        {
          heading: 'Your story, not a random one-liner',
          body: 'A topic such as “work” gives any joke tool very little to work with. The meeting your manager called to discuss having fewer meetings gives it a scene, a contradiction and somewhere to go. Shutap starts with that situation and builds connected beats around it, rather than handing you unrelated punchlines about a broad category.',
        },
        {
          heading: 'What makes it a complete bit?',
          body: 'The hook opens with a reason to listen. The setup gives the audience enough of the story to follow the turn. Tags add laughs after that turn without starting the story again. The button is the final line: the ending you can stop on. Those four parts give you a sequence to perform, not just a sentence to paste into a caption.',
        },
        {
          heading: 'How to amplify your own story',
          body: 'Write what happened in the story box. Include who did what, the exact words you remember and the small detail that made it ridiculous; leave real names out. Choose your audience, voice, length and how wild, then let Shutap write the bit. Read the draft out loud and decide what fits your delivery. You can make it hotter, tighter, change the tags or mix your own version. Each version gets its own 5-second video, caption and hashtags.',
        },
        {
          heading: 'For creators and comedians',
          body: 'Content creators can turn a storytime premise into material for TikTok, Instagram Reels or YouTube Shorts. Comedians can use a familiar experience as the starting point for a stand-up bit to rehearse and refine. Choose a social or live audience to suit the delivery. Deadpan, storyteller and dry voices offer different ways to tell the same situation without borrowing another performer’s lines.',
        },
        {
          heading: 'From draft to post',
          body: 'Download the video with its caption and hashtags and post it, or read the bit to camera in the teleprompter, lay it out beat by beat as a scene, or format it as a screenplay page. The format changes how you use the material; the story remains the starting point. Edit anything you would not naturally say, and rehearse the pauses before recording or performing.',
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