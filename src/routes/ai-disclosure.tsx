import { createFileRoute } from '@tanstack/react-router'
import { ogImageMeta } from "@/lib/seo/meta";
import { DocLayout } from '@/components/site/DocLayout'
import { SITE_URL } from '@/lib/site'

const URL = `${SITE_URL}/ai-disclosure`
const TITLE = 'AI disclosure — Shutap'
const DESCRIPTION =
  'Every joke on Shutap is written by AI (Google Gemini and OpenAI models, via the Lovable AI Gateway). It can be wrong or offensive, and you decide what to post.'

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
      subline="what writes your jokes"
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
          your jokes are written by ai, not a person. it can get things wrong, miss the joke, or
          say something offensive. it&rsquo;s not therapy, and it can&rsquo;t give medical,
          mental-health or legal advice. you decide what to post.
        </div>
      </div>
      <p>
        Shutap uses AI models (Google&rsquo;s Gemini and OpenAI models, through the Lovable AI Gateway) to remove
        identifying details, run the crisis check, write your jokes and build the Mirror. No
        person writes or reviews a joke before you see it.
      </p>
      <p>
        AI output can be inaccurate, unfunny or offensive. Treat it as entertainment. You are
        responsible for what you download, share and post. We don&rsquo;t use your content to
        train AI models.
      </p>
      <p>
        Some places, including California, require clear notice when you&rsquo;re dealing with AI
        rather than a person. This page is that notice.
      </p>
    </DocLayout>
  )
}
