import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { SeoPage } from '@/components/seo/SeoPage'
import { ogImageMeta } from '@/lib/seo/meta'
import { SITE_URL } from '@/lib/site'
import { submitBusinessInquiry } from '@/lib/business-inquiry.functions'

const URL = `${SITE_URL}/business`
const TITLE = 'Shutap Enterprise: Humor for Presentations, Demos, Launches and Meetings | Shutap'
const DESCRIPTION =
  'Shutap Enterprise, from the Shutap Humor Amplifier Lab: original, human-steered humor for presentations, roadshows, product demos, launches and meetings, built on the Humor Amplifier Lab dataset. Request pricing and a tailored solution.'

type UseCase = 'presentations' | 'roadshows' | 'demos' | 'meetings' | 'dataset' | 'other'
type Size = '1-50' | '51-500' | '501-5000' | '5000+'
type Timeline = 'now' | 'quarter' | 'exploring'

const USE_CASES: { id: UseCase; label: string }[] = [
  { id: 'presentations', label: 'Presentations and slides' },
  { id: 'roadshows', label: 'Roadshows and investor pitches' },
  { id: 'demos', label: 'Product demos and launches' },
  { id: 'meetings', label: 'Meetings and conversations' },
  { id: 'dataset', label: 'The Shutap Humor Amplifier Lab dataset' },
  { id: 'other', label: 'Something else' },
]

const VALUE = [
  {
    h: 'Written from your material',
    b: 'Shutap starts from your own story, product and facts, so every line belongs to your company and could not be dropped into anyone else’s deck.',
  },
  {
    h: 'The Humor Amplifier Lab dataset, built by hand',
    b: 'Behind the writing is the Shutap Humor Amplifier Lab dataset, an in-house collection the Shutap team writes, selects and rates, pairing everyday situations with jokes, tagged by technique, voice and how wild. None of it comes from users. It is the foundation for how Shutap finds what is funny.',
  },
  {
    h: 'Your people stay in charge',
    b: 'Shutap drafts and your speakers decide. Make a line hotter, tighter or more escalated, or build your own from the lines written for your material.',
  },
  {
    h: 'Built with guardrails',
    b: 'Humor goes at the situation, never at a colleague, customer or competitor by name. Names and identifying details are replaced with role labels before anything is stored.',
  },
]

const SOLUTIONS = [
  ['Presentations and slides', 'Find the true, funny detail in a deck and place it where attention dips.'],
  ['Roadshows and investor pitches', 'Lines that survive being said fifty times and adapt to each room.'],
  ['Product demos and launches', 'Open with the problem everyone recognizes and let the product be the turn.'],
  ['Meetings and conversations', 'Lighter, clearer communication for the people who lead and present.'],
  ['Humor Amplifier Lab dataset access', 'For teams and researchers: access is reviewed case by case under a separate agreement.'],
]

const STEPS = [
  ['Tell us about your use case', 'Share who you are, what you present and how often.'],
  ['We scope a solution', 'A person from Shutap replies to understand your needs.'],
  ['You receive a proposal with pricing', 'Pricing is tailored to your use case and team size.'],
]

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
const card: React.CSSProperties = { background: '#fff', border: '.5px solid rgba(11,8,15,.1)', borderRadius: 14, padding: '16px 18px' }
const h2: React.CSSProperties = { fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '40px 0 14px' }

function BusinessPage() {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [useCases, setUseCases] = useState<UseCase[]>([])
  const [needUse, setNeedUse] = useState(false)

  const toggle = (id: UseCase) =>
    setUseCases((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (useCases.length === 0) {
      setNeedUse(true)
      return
    }
    const f = new FormData(e.currentTarget)
    setState('sending')
    try {
      const r = await submitBusinessInquiry({
        data: {
          name: String(f.get('name') || ''),
          title: String(f.get('title') || ''),
          company: String(f.get('company') || ''),
          email: String(f.get('email') || ''),
          companySize: String(f.get('size') || '1-50') as Size,
          useCases,
          timeline: String(f.get('timeline') || 'exploring') as Timeline,
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
      <p style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6f666c', margin: '0 0 10px' }}>Shutap Enterprise</p>
      <h1 style={{ fontFamily: "'Sora', system-ui, sans-serif", fontSize: 'clamp(30px,6vw,46px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 18px', color: '#8e1c4c' }}>
        Humor is wisdom. Bring it to the way your company speaks.
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.6, margin: '0 0 12px' }}>
        The people who are listened to are often the ones who can find the true and funny thing to say. Shutap Enterprise helps teams bring original, human-steered humor to presentations, roadshows, product demos, launches and meetings.
      </p>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: '#6f666c', margin: '0 0 8px' }}>
        Shutap Enterprise is in development. Tell us what you need and we will scope a solution and send pricing.
      </p>
      <a href="#request" style={{ display: 'inline-block', marginTop: 10, background: '#0b080f', color: '#fff', borderRadius: 999, padding: '12px 22px', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
        Request pricing and solutions
      </a>

      <h2 style={h2}>What makes Shutap different</h2>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
        {VALUE.map((v) => (
          <div key={v.h} style={card}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{v.h}</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: '#443c42' }}>{v.b}</div>
          </div>
        ))}
      </div>

      <h2 style={h2}>Solutions</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        {SOLUTIONS.map(([t, d]) => (
          <div key={t} style={card}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{t}</div>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: '#443c42', marginTop: 3 }}>{d}</div>
          </div>
        ))}
      </div>

      <h2 style={h2}>How it works</h2>
      <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
        {STEPS.map(([t, d]) => (
          <li key={t} style={{ marginBottom: 8 }}>
            <strong>{t}.</strong> <span style={{ color: '#443c42' }}>{d}</span>
          </li>
        ))}
      </ol>

      <h2 id="request" style={h2}>Request pricing and solutions</h2>
      {state === 'done' ? (
        <p style={{ ...card, padding: '18px 20px', lineHeight: 1.6 }}>
          Thank you. Your request is in. A person from Shutap will reply from hello@shutap.com to understand your needs and share pricing.
        </p>
      ) : (
        <form onSubmit={onSubmit} style={{ maxWidth: 560 }}>
          <label style={{ ...label, marginTop: 0 }} htmlFor="b-name">Name</label>
          <input id="b-name" name="name" required maxLength={120} style={input} autoComplete="name" />
          <label style={label} htmlFor="b-title">Title</label>
          <input id="b-title" name="title" required maxLength={120} style={input} autoComplete="organization-title" />
          <label style={label} htmlFor="b-company">Company name</label>
          <input id="b-company" name="company" required maxLength={160} style={input} autoComplete="organization" />
          <label style={label} htmlFor="b-email">Work email</label>
          <input id="b-email" name="email" type="email" required maxLength={200} style={input} autoComplete="email" />
          <label style={label} htmlFor="b-size">Company size (employees)</label>
          <select id="b-size" name="size" defaultValue="51-500" style={input}>
            <option value="1-50">1–50</option>
            <option value="51-500">51–500</option>
            <option value="501-5000">501–5,000</option>
            <option value="5000+">5,000+</option>
          </select>
          <span style={label}>What would you like help with?</span>
          <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
            {USE_CASES.map((u) => (
              <label key={u.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={useCases.includes(u.id)} onChange={() => toggle(u.id)} /> {u.label}
              </label>
            ))}
          </div>
          {needUse && useCases.length === 0 ? (
            <p style={{ color: '#8e1c4c', fontSize: 13, margin: '8px 0 0' }}>Please choose at least one.</p>
          ) : null}
          <label style={label} htmlFor="b-timeline">Timeline</label>
          <select id="b-timeline" name="timeline" defaultValue="exploring" style={input}>
            <option value="now">Ready to start now</option>
            <option value="quarter">Within the next quarter</option>
            <option value="exploring">Exploring</option>
          </select>
          <label style={label} htmlFor="b-message">Tell us more (optional)</label>
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
            {state === 'sending' ? 'Sending…' : 'Request pricing and solutions'}
          </button>
          {state === 'error' ? (
            <p style={{ color: '#8e1c4c', fontSize: 13.5, marginTop: 12 }}>
              That did not send. Please email <a href="mailto:hello@shutap.com">hello@shutap.com</a> with the same details.
            </p>
          ) : null}
        </form>
      )}

      <p style={{ marginTop: 32, fontSize: 14, color: '#443c42' }}>
        Want to see the engine first? <Link to="/">Write a story and get a bit</Link>, or read <Link to="/guides/$slug" params={{ slug: 'humor-is-wisdom' }}>why we believe humor is wisdom</Link>.
      </p>
    </SeoPage>
  )
}
