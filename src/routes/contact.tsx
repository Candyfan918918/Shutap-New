import { createFileRoute } from '@tanstack/react-router'
import { ogImageMeta } from "@/lib/seo/meta";
import { DocLayout } from '@/components/site/DocLayout'
import { SITE_URL } from '@/lib/site'

const URL = `${SITE_URL}/contact`
const TITLE = 'Contact — Shutap'
const DESCRIPTION =
  'Write to Shutap at hello@shutap.com for help, privacy, legal, safety and reports.'

type Cbox = { email: string; label: string; sub: string }

const CBOXES: Cbox[] = [
  {
    email: 'hello@shutap.com',
    label: 'email us',
    sub: 'help, privacy and data requests, legal, safety and reports.',
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
      subline="one address for everything"
    >
      <p>A person reads every message. We usually reply within a couple of days.</p>
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
        in an emergency, don&rsquo;t email us. we can&rsquo;t reply in real time. use the{' '}
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
        please don&rsquo;t send anything that identifies you or someone else unless you need to.
      </p>
    </DocLayout>
  )
}
