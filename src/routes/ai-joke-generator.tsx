import { createFileRoute } from '@tanstack/react-router'
import { ContentPage } from '@/components/seo/ContentPage'
import { SITE_URL } from '@/lib/site'
import { breadcrumbScript } from '@/lib/seo/breadcrumbs'

const PATH = '/ai-joke-generator'
const TITLE = 'AI Joke Generator — Turn Your Story Into a Comedy Bit | Shutap'
const DESCRIPTION = 'Turn your story into a complete comedy bit with Shutap’s AI joke generator: hook, setup, tags and button. For creators, short videos and stand-up.'

export const Route = createFileRoute('/ai-joke-generator')({
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
    scripts: [breadcrumbScript([{ name: 'AI joke generator', path: PATH }])],
  }),
  component: AIJokeGeneratorPage,
})

function AIJokeGeneratorPage() {
  return (
    <ContentPage
      tryIt="ai-joke-generator"
      breadcrumbs={[{ name: 'AI joke generator', path: PATH }]}
      h1="AI joke generator: turn your story into a bit"
      capsule="Shutap turns your story into a complete comedy bit — hook, setup, tags and button. Start with what happened to you, not a request for a random joke. The result is material for a video or the stage, built around the details that make your story yours."
      cta={{ label: 'Write your story, get the bit', href: '/' }}
      sections={[
        {
          heading: 'Your story, not a random one-liner',
          body: 'A topic such as “work” gives a joke generator very little to work with. The meeting your manager called to discuss having fewer meetings gives it a scene, a contradiction and somewhere to go. Shutap starts with that situation and builds connected beats around it, rather than handing you unrelated punchlines about a broad category.',
        },
        {
          heading: 'What makes it a complete bit?',
          body: 'The hook opens with a reason to listen. The setup gives the audience enough of the story to follow the turn. Tags add laughs after that turn without starting the story again. The button is the final line: the ending you can stop on. Those four parts give you a sequence to perform, not just a sentence to paste into a caption.',
        },
        {
          heading: 'How to generate jokes from your own story',
          body: 'Write what happened in the story box. Include who did what, the exact words you remember and the small detail that made it ridiculous; leave real names out. Choose your audience, voice, length and heat, then let Shutap write the bit. Read the draft out loud and decide what fits your delivery. You can tighten it, change the tags or mix your own version before filming.',
        },
        {
          heading: 'For creators and comedians',
          body: 'Content creators can turn a storytime premise into material for TikTok, Instagram Reels or YouTube Shorts. Comedians can use a familiar experience as the starting point for a stand-up bit to rehearse and refine. Choose a social or live audience to suit the delivery. Deadpan, storyteller and dry voices offer different ways to tell the same situation without borrowing another performer’s lines.',
        },
        {
          heading: 'From draft to delivery',
          body: 'Read the bit to camera in the teleprompter, lay it out beat by beat as a scene, or format it as a screenplay page. The format changes how you use the material; the story remains the starting point. Edit anything you would not naturally say, and rehearse the pauses before recording or performing.',
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