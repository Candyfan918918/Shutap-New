import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { SeoPage } from '@/components/seo/SeoPage'
import { ogImageMeta } from '@/lib/seo/meta'
import { SITE_URL } from '@/lib/site'
import { submitBusinessInquiry } from '@/lib/business-inquiry.functions'

const URL = `${SITE_URL}/business`
const TITLE = 'Shutap for Business: Request Information or the Joke Dataset | Shutap'
const DESCRIPTION =
  'Shutap is building humor for presentations, roadshows, demos, launches and meetings. Request information or ask about access to the Shutap joke dataset.'

export const Route = createFileRoute('/business')({
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
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          name: TITLE,
          url: URL,
          description: DESCRIPTION,
          isPartOf: { '@type': 'WebSite', name: 'Shutap', url: SITE_URL },
        }),
      },
    ],
  }),
  component: BusinessPage,
})

const input: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 13px',
  borderRadius: 10,
  border: '.5px solid rgba(11,8,15,.2)',
  background: '#fff',
  fontFamily: "'Sora', system-ui, sans-serif",
  fontSize: 14,
  color: '#0b080f',
}
const label: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 600, margin: '14px 0 5px', color: '#443c42' }

function BusinessPage() {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [interest, setInterest] = useState<'information' | 'dataset' | 'both'>('information')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setState('sending')
    try {
      const r = await submitBusinessInquiry({
        data: {
          name: String(f.get('name') || ''),
          title: String(f.get('title') || ''),
          company: String(f.get('company') || ''),
          email: String(f.get('email') || ''),
          interest,
          message: String(f.get('message') || ''),
          website: String(f.get('website') || ''),
        },
      })
      setState(r.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }

  return (
    <SeoPage>
      <h1 style={{ fontFamily: "'Sora', system-ui, sans-serif", fontSize: 'clamp(30px,6vw,46px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 22px', color: '#8e1c4c' }}>
        Shutap for business
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, margin: '0 0 22px' }}>
        We are building humor for the way businesses talk: presentations and slides, roadshows, product demos and launches, and meetings. It is in development, so there is no product to buy yet. Tell us who you are and what you need and we will write back.
      </p>

      <h2 style={{ fontSize: 20, margin: '28px 0 8px' }}>Two things you can ask for</h2>
      <p style={{ lineHeight: 1.65, margin: '0 0 10px' }}>
        <strong>Information.</strong> Early access, pilots and what we are building for teams.
      </p>
      <p style={{ lineHeight: 1.65, margin: '0 0 10px' }}>
        <strong>The Shutap joke dataset.</strong> What sets Shutap apart is a growing dataset that pairs real situations with jokes, tagged by technique, voice and heat, and built up by hand. If you are a researcher, a company or a team that wants to know what is available and on what terms, ask here. Access is reviewed case by case, and availability and terms are not yet fixed.
      </p>

      <h2 style={{ fontSize: 20, margin: '28px 0 4px' }}>Request information</h2>
      {state === 'done' ? (
        <p style={{ background: '#fff', border: '.5px solid rgba(11,8,15,.1)', borderRadius: 14, padding: '18px 20px', lineHeight: 1.6 }}>
          Thank you. Your request is in and a person will reply from hello@shutap.com.
        </p>
      ) : (
        <form onSubmit={onSubmit} style={{ maxWidth: 560 }}>
          <span style={label}>I am interested in</span>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 14 }}>
            {([['information', 'Information'], ['dataset', 'The dataset'], ['both', 'Both']] as const).map(([v, t]) => (
              <label key={v} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="radio" name="interest" checked={interest === v} onChange={() => setInterest(v)} /> {t}
              </label>
            ))}
          </div>
          <label style={label} htmlFor="b-name">Name</label>
          <input id="b-name" name="name" required maxLength={120} style={input} autoComplete="name" />
          <label style={label} htmlFor="b-title">Title</label>
          <input id="b-title" name="title" required maxLength={120} style={input} autoComplete="organization-title" />
          <label style={label} htmlFor="b-company">Company name</label>
          <input id="b-company" name="company" required maxLength={160} style={input} autoComplete="organization" />
          <label style={label} htmlFor="b-email">Work email</label>
          <input id="b-email" name="email" type="email" required maxLength={200} style={input} autoComplete="email" />
          <label style={label} htmlFor="b-message">What are you looking for? (optional)</label>
          <textarea id="b-message" name="message" rows={5} maxLength={2000} style={{ ...input, resize: 'vertical' }} />
          <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
            <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <p style={{ fontSize: 12.5, color: '#6f666c', lineHeight: 1.5, margin: '12px 0' }}>
            We use what you send only to reply to you. See the <Link to="/privacy">privacy policy</Link>. Please do not include anything sensitive.
          </p>
          <button
            type="submit"
            disabled={state === 'sending'}
            style={{ background: '#0b080f', color: '#fff', border: 0, borderRadius: 999, padding: '12px 22px', fontFamily: "'Sora', system-ui, sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            {state === 'sending' ? 'Sending…' : 'Send request'}
          </button>
          {state === 'error' ? (
            <p style={{ color: '#8e1c4c', fontSize: 13.5, marginTop: 12 }}>
              That did not send. Please email <a href="mailto:hello@shutap.com">hello@shutap.com</a> with the same details.
            </p>
          ) : null}
        </form>
      )}

      <p style={{ marginTop: 32, fontSize: 14, color: '#443c42' }}>
        Want to see the engine first? <Link to="/">Write a story and get a bit</Link>, or read <Link to="/guides/$slug" params={{ slug: "funny-for-business" }}>where business is heading</Link>.
      </p>
    </SeoPage>
  )
}
