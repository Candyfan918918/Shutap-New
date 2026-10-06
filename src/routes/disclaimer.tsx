import { createFileRoute } from '@tanstack/react-router'
import { ogImageMeta } from "@/lib/seo/meta";
import { DocLayout } from '@/components/site/DocLayout'
import { SITE_URL } from '@/lib/site'

const URL = `${SITE_URL}/disclaimer`
const TITLE = "Disclaimer — Shutap AI Joke Generator"
const DESCRIPTION =
  "Shutap is an AI joke generator for entertainment. It is not therapy, advice, a diagnosis or a crisis service. Adults 18+."

export const Route = createFileRoute('/disclaimer')({
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
  component: DisclaimerPage,
})

function DisclaimerPage() {
  return (
    <DocLayout
      active="/disclaimer"
      title="Medical and legal disclaimer"
      subline="the formal version, then the short one"
    >
      <h3>Formal</h3>
      <p>
        Shutap is an AI joke generator for entertainment only. It does not provide medical,
        psychological, mental-health, crisis or legal services or advice, and using it creates no
        professional relationship. In an emergency, call or text 988 or call 911 (US), call
        Samaritans on 116 123 (UK and Ireland), or go to findahelpline.com. 18+ only.
      </p>
      <p>
        Jokes are written by AI and may be inaccurate, unfunny or offensive. The Mirror reads back
        what keeps coming up in what you write. It observes; it does not assess, diagnose or
        advise. Shutap+ removes the watermark and adds the Mirror. It does not buy advice,
        treatment or more jokes. Daily limits (five stories a day for everyone) are cost controls
        and may change.
      </p>

      <h3>Short version</h3>
      <div
        style={{
          background: '#fff',
          border: '.5px solid rgba(11,8,15,.08)',
          borderRadius: 14,
          padding: '16px 18px',
          fontFamily: 'Newsreader,serif',
          fontStyle: 'italic',
          fontSize: 15.5,
          color: '#2b2730',
          lineHeight: 1.55,
        }}
      >
        shutap writes jokes. not therapy, not advice, not a diagnosis. paying removes the
        watermark and adds the mirror. it doesn&rsquo;t buy a cure. if it&rsquo;s heavy,{' '}
        <a href="/safety">here&rsquo;s real help →</a>
      </div>
    </DocLayout>
  )
}
