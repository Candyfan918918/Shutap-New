import { createFileRoute } from '@tanstack/react-router'
import { ogImageMeta } from "@/lib/seo/meta";
import { DocLayout } from '@/components/site/DocLayout'
import { SITE_URL } from '@/lib/site'

const URL = `${SITE_URL}/contact`
const TITLE = 'Contact — Shutap'
const DESCRIPTION =
  'shutap is small on purpose. a real person reads every message. write us at hello@shutap.com, privacy@shutap.com, safety@shutap.com, or legal@shutap.com.'

type Cbox = { email: string; label: string; sub: string }

const CBOXES: Cbox[] = [
  {
    email: 'hello@shutap.com',
    label: 'general',
    sub: 'questions, feedback, \u201cwhat is this?\u201d \u2014 anything that doesn\u2019t fit below.',
  },
  {
    email: 'privacy@shutap.com',
    label: 'privacy & your data',
    sub: 'access, export, or delete your data; anything about how we handle it.',
  },
  {
    email: 'safety@shutap.com',
    label: 'safety & reports',
    sub: "report content or a person, or flag something that isn\u2019t safe.",
  },
  {
    email: 'legal@shutap.com',
    label: 'legal',
    sub: 'takedown requests, legal process, and everything in Terms & Privacy.',
  },
]

export const Route = createFileRoute('/contact')({
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
  component: ContactPage,
})

function ContactPage() {
  return (
    <DocLayout
      active="/contact"
      title="Contact"
      subline="a real person reads every message — not a bot"
    >
      <p>
        shutap is small on purpose. when you write in, a person reads it and writes back. pick the
        box that fits, and we&rsquo;ll get to you — usually within a couple of days.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '20px 0 4px' }}>
        {CBOXES.map((c) => (
          <a
            key={c.email}
            href={`mailto:${c.email}`}
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
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 14,
              }}
            >
              <div
                style={{
                  fontFamily: 'Sora,sans-serif',
                  fontWeight: 700,
                  fontSize: 14.5,
                  color: '#0b080f',
                  flex: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.label}
              </div>
              <div
                style={{
                  fontFamily: 'Sora,sans-serif',
                  fontSize: 13,
                  color: '#17131a',
                  flex: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.email}
              </div>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: '#443c42', marginTop: 4 }}>
              {c.sub}
            </div>
          </a>
        ))}
      </div>
      <p style={{ marginTop: 14 }}>
        in an emergency, don&rsquo;t email us — we can&rsquo;t respond in real time. use the{' '}
        <a
          href="/safety"
          style={{ color: '#000000', textDecoration: 'none', fontWeight: 600 }}
        >
          crisis lines →
        </a>
      </p>
      <p
        style={{
          marginTop: 16,
          fontFamily: 'Newsreader,serif',
          fontStyle: 'italic',
          color: '#443c42',
        }}
      >
        shutap is 18+, pseudonymous, and not a medical or legal service. please don&rsquo;t send us
        anything that could identify you or someone else unless it&rsquo;s necessary. 🤍
      </p>
    </DocLayout>
  )
}
