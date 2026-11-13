import { createFileRoute } from '@tanstack/react-router'
import { WhoDoesWhat } from '@/components/site/WhoDoesWhat'
import { ogImageMeta } from "@/lib/seo/meta";
import { DocLayout } from '@/components/site/DocLayout'
import { SITE_URL } from '@/lib/site'

const URL = `${SITE_URL}/ai-disclosure`
const TITLE = "AI Disclosure — How Shutap Uses AI | Shutap Humor Amplifier Lab"
const DESCRIPTION =
  "Shutap uses AI (Google Gemini and OpenAI models, through the Lovable AI Gateway): on Bits to cut your story into lines, draft only the lines your story didn't cover, and offer other ways to say a line when you tap funnier; for realtor kits and toasts, to draft from your material. Nobody at Shutap reads what you make, and none of it is used to train AI. AI can be wrong; you decide what to use."

export const Route = createFileRoute('/ai-disclosure')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: URL },
      ...ogImageMeta(),
      { name: 'twitter:title', content: TITLE },
      { name: 'twitter:description', content: DESCRIPTION },
    ],
    links: [{ rel: 'canonical', href: URL }],
  }),
  component: AiDisclosurePage,
})

function AiDisclosurePage() {
  return (
    <DocLayout
      active="/ai-disclosure"
      title="AI disclosure"
      subline="what you bring, what shutap does, what it never does"
    >
      <div
        style={{
          background: 'linear-gradient(160deg,#100c14,#100c14)',
          borderRadius: 18,
          padding: 24,
          margin: '18px 0',
          display: 'flex',
          gap: 13,
          alignItems: 'flex-start',
        }}
      >
        <svg
          viewBox="0 0 56 56"
          fill="none"
          style={{ width: 34, height: 34, flex: 'none' }}
          aria-hidden
        >
          <circle cx="28" cy="28" r="27" fill="rgba(23,19,26,.14)" />
          <rect x="15.25" y="16" width="11.5" height="24" rx="5.75" fill="url(#eyeGAI)" />
          <rect x="29.25" y="16" width="11.5" height="24" rx="5.75" fill="url(#eyeGAI)" />
          <ellipse cx="21" cy="30" rx="4" ry="5" fill="url(#pupGAI)" />
          <ellipse cx="35" cy="30" rx="4" ry="5" fill="url(#pupGAI)" />
          <path
            d="M21 20 C19.5 18 16.5 18 16.5 21 C16.5 24 21 27 21 27 C21 27 25.5 24 25.5 21 C25.5 18 22.5 18 21 20Z"
            fill="#fff"
            opacity=".95"
          />
          <path
            d="M35 20 C33.5 18 30.5 18 30.5 21 C30.5 24 35 27 35 27 C35 27 39.5 24 39.5 21 C39.5 18 36.5 18 35 20Z"
            fill="#fff"
            opacity=".95"
          />
          <defs>
            <radialGradient id="eyeGAI" cx="40%" cy="18%" r="75%">
              <stop offset="0%" stopColor="#fff" />
              <stop offset="18%" stopColor="#ffd0e8" />
              <stop offset="48%" stopColor="#a52a5f" />
              <stop offset="78%" stopColor="#c1216b" />
              <stop offset="100%" stopColor="#890041" />
            </radialGradient>
            <radialGradient id="pupGAI" cx="50%" cy="55%" r="58%">
              <stop offset="0%" stopColor="#100c14" />
              <stop offset="100%" stopColor="#100c14" />
            </radialGradient>
          </defs>
        </svg>
        <div
          style={{
            fontFamily: 'Newsreader,serif',
            fontStyle: 'italic',
            fontSize: 16,
            lineHeight: 1.55,
            color: '#e4dfe2',
          }}
        >
          you bring the material: your story, your listing, your stories about the person. on a
          bit, your lines stay word for word and ai drafts only the lines you leave empty, marked
          as ai drafts; realtor kits and toasts are drafted with ai from what you give, and you
          edit them. nobody at
          shutap reads what you make, and none of it is ever used to train anything. ai can get
          things wrong, miss the joke or say something offensive. it&rsquo;s not therapy or advice.
          you decide what to use.
        </div>
      </div>
      <WhoDoesWhat />
      <h3>What you bring stays yours</h3>
      <p>
        On Bits your lines stay yours, word for word: unread by staff, out of the dataset and out
        of training. A line the AI drafts for you is yours to change, keep or delete. For realtor kits and toasts you give Shutap the listing or
        your memories of the person, and it drafts from that, using the Lab&rsquo;s in-house
        dataset of jokes written and rated by people at the Lab and the techniques on its
        /funniest and /guides pages. Whatever you type stays yours.
      </p>
      <p>
        Shutap uses AI models from Google (Gemini) and OpenAI, through the Lovable AI Gateway. No
        person writes or reviews anything before you see it. Here is what the AI does in each
        product.
      </p>
      <p>
        <b>Bits.</b> You tell your story; a model cuts it into a hook, setup, two tags and a
        button, and code keeps only lines found word for word in what you typed. Every line is
        optional. Any line your story didn&rsquo;t cover is drafted by AI (the copilot), right
        after the cut, around your lines, and marked &ldquo;AI draft&rdquo; until you change it;
        your own lines are never rewritten. Write all five lines yourself and nothing is drafted:
        the bit is your lines, word for word. Tap &ldquo;funnier&rdquo; on a line and a model
        offers three other ways to say it, built from your lines and one
        technique from the Shutap Humor Amplifier Lab bank (the operation, never anyone&rsquo;s
        material); nothing changes until you pick. Before anything is saved or sent to a model,
        identifying details are removed and the crisis check runs. Rewrites on Basic and Pro
        (hotter, tighter, storytelling) and the Mirror are AI-written when you ask for them. The
        sketch and the skit are laid out by a model from your lines, in script and shot form, and
        it is told to add no new jokes; the 5-second video is not AI-generated: a fixed template draws it from your finished bit on your own device.
      </p>
      <p>
        <b>Realtor kits.</b> Shutap reads the listing page you link, or the text you paste, and
        pulls out the facts. Anything it can&rsquo;t read stays blank and is never guessed. AI
        drafts the six outputs in your tone, and every line is checked for fair-housing words, for
        numbers that aren&rsquo;t in the listing, and for your must-say and never-say words.
        &ldquo;Funnier&rdquo; changes only the line you tap. No video is made; you shoot it yourself.
      </p>
      <p>
        <b>Toasts.</b> Names stay in your browser, and Shutap never receives them; any left in the
        text become role labels. The crisis check runs first. Two models draft, and a judge from a
        different model family picks the better one. Your stories and your one true thing are put
        back word for word, so the AI can&rsquo;t rewrite them.
      </p>
      <p>
        <b>Enterprise.</b> Not live yet, so nothing is processed. Please don&rsquo;t send company
        material through the request form.
      </p>
      <p>
        Removing identifying details uses automated checks and an AI model, and it can miss things.
        Nothing Shutap&rsquo;s AI suggests searches the internet for other people&rsquo;s jokes, and no
        comedian&rsquo;s lines are in Shutap&rsquo;s instructions. The AI models were trained by
        Google and OpenAI, not by Shutap, on data those companies chose; we can&rsquo;t change what
        they trained on, and we don&rsquo;t pretend otherwise. What we control is what goes in from
        here: our own in-house dataset, written by people we pay, and never a word of yours. AI can
        produce a line close to an existing joke by accident, so check anything you rely on
        commercially.
      </p>
      <h3>Your content stays yours</h3>
      <p>
        <b>Shutap staff don&rsquo;t read what you make (stories, bits, kits or toasts), except to fix a problem
        you report or when the law requires it. Shutap never uses any of it to train AI
        models, and it is never added to the Shutap joke dataset.</b> Bits you post to a room are
        public, and we review a post when someone reports it.
      </p>
      <h3>Our own jokes</h3>
      <p>
        The Shutap Humor Amplifier Lab dataset is in-house: the Shutap team writes, selects and rates its own
        jokes, pairing everyday situations with jokes tagged by technique, voice and how wild. It is
        what guides Shutap&rsquo;s suggestions, and it is the only joke material Shutap uses to train or
        tune AI models. How your text is handled is set out in the{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>
      <p>
        AI output can be inaccurate, unfunny or offensive. Treat it as entertainment. You are
        responsible for what you save, share and post.
      </p>
      <p>
        Some places, including California, require clear notice when you&rsquo;re dealing with AI
        rather than a person. This page is that notice.
      </p>
    </DocLayout>
  )
}
