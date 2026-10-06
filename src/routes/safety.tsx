import { createFileRoute } from '@tanstack/react-router'
import { ogImageMeta } from "@/lib/seo/meta";
import { DocLayout } from '@/components/site/DocLayout'
import { SITE_URL } from '@/lib/site'

const URL = `${SITE_URL}/safety`
const TITLE = 'Crisis help — Shutap'
const DESCRIPTION =
  'Shutap is not a crisis service. If you need help now: US call or text 988, UK and Ireland Samaritans 116 123, or findahelpline.com.'

type Card = { name: string; action: string; href: string; external?: boolean }

const CARDS: Card[] = [
  { name: 'US — 988 Suicide & Crisis Lifeline', action: 'call or text 988', href: 'tel:988' },
  { name: 'US — Crisis Text Line', action: 'text HOME to 741741', href: 'sms:741741' },
  { name: 'UK & Ireland — Samaritans', action: 'call 116 123', href: 'tel:116123' },
  {
    name: 'Anywhere else — findahelpline.com',
    action: 'find a line in your country',
    href: 'https://findahelpline.com',
    external: true,
  },
]

export const Route = createFileRoute('/safety')({
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
  component: SafetyPage,
})

function SafetyPage() {
  return (
    <DocLayout
      active="/safety"
      title="Crisis help"
      subline="if you need help right now"
    >
      <p>
        Shutap is a joke generator, not a crisis service. If you or someone else is in danger, get
        help from a person now:
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '18px 0' }}>
        {CARDS.map((c) => (
          <a
            key={c.href}
            href={c.href}
            target={c.external ? '_blank' : undefined}
            rel={c.external ? 'noopener' : undefined}
            style={{
              textDecoration: 'none',
              background: '#fff',
              border: '.5px solid rgba(11,8,15,.1)',
              borderRadius: 14,
              padding: '15px 17px',
              display: 'block',
            }}
          >
            <div
              style={{
                fontFamily: 'Sora,sans-serif',
                fontWeight: 700,
                fontSize: 14.5,
                color: '#0b080f',
              }}
            >
              {c.name}
            </div>
            <div style={{ fontSize: 13, color: '#443c42', marginTop: 2 }}>{c.action}</div>
          </a>
        ))}
      </div>
      <p>
        Shutap runs a crisis check on what people type, post and comment. If something reads as a
        crisis, Shutap writes no jokes, posts nothing, and shows these lines instead. Anything
        flagged stays private and is never posted.
      </p>
    </DocLayout>
  )
}
