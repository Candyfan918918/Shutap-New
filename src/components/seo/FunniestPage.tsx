import { Link } from "@tanstack/react-router";
import { Words } from '@/components/motion'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import type { Crumb } from '@/lib/seo/breadcrumbs'
import type { FunniestEntry } from '@/lib/seo/funniest'

const INK = '#0b080f'
const MUTED = '#443c42'
const BRAND = '#8e1c4c'
const CARD = {
  background: '#ffffff',
  border: '1px solid rgba(11,8,15,.10)',
  borderRadius: 18,
} as const

const h2Style = {
  fontFamily: "'Sora', system-ui, sans-serif",
  fontSize: 'clamp(20px, 2.6vw, 24px)',
  fontWeight: 600,
  letterSpacing: '-0.02em',
  margin: '0 0 14px',
  color: INK,
} as const

const label = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: MUTED,
  margin: '14px 0 4px',
} as const

export function FunniestPage({
  entry,
  breadcrumbs,
  others,
}: {
  entry: FunniestEntry
  breadcrumbs: Crumb[]
  others: { href: string; label: string }[]
}) {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'transparent',
        color: INK,
        fontFamily: "'Sora', system-ui, sans-serif",
        padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 40px)',
      }}
    >
      <article style={{ maxWidth: 720, margin: '0 auto', lineHeight: 1.65 }}>
        <Breadcrumbs trail={breadcrumbs} />

        <Words
          as="h1"
          key={entry.h1}
          style={{
            fontFamily: "'Sora', system-ui, sans-serif",
            fontSize: 'clamp(32px, 6vw, 52px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            margin: '0 0 28px',
            color: BRAND,
          }}
        >
          {entry.h1}
        </Words>

        <p
          style={{
            ...CARD,
            fontFamily: "'Newsreader', Georgia, serif",
            fontSize: 'clamp(19px, 2.4vw, 23px)',
            lineHeight: 1.55,
            padding: '24px 26px',
            margin: '0 0 48px',
            boxShadow: '0 12px 30px -24px rgba(20,16,22,.3)',
          }}
        >
          {entry.capsule}
        </p>

        <section style={{ marginBottom: 40 }}>
          <h2 style={h2Style}>The pick: {entry.pick.name}</h2>
          <p style={{ fontSize: 15, color: MUTED, margin: '0 0 8px' }}>{entry.pick.role}</p>
          <p style={{ fontSize: 17, margin: 0 }}>{entry.pick.why}</p>
        </section>

        {entry.runnersUp.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={h2Style}>Also in the running</h2>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8, fontSize: 17 }}>
              {entry.runnersUp.map((p) => (
                <li key={p.name}>
                  <strong>{p.name}</strong>
                  <span style={{ color: MUTED }}> ({p.role})</span>: {p.why}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section style={{ marginBottom: 40 }}>
          <h2 style={h2Style}>What made them funny</h2>
          {entry.style.map((para, i) => (
            <p key={i} style={{ fontSize: 17, margin: '0 0 14px' }}>
              {para}
            </p>
          ))}
        </section>

        <section style={{ marginBottom: 40 }}>
          <h2 style={h2Style}>Techniques to take into your videos and sets</h2>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 18 }}>
            {entry.techniques.map((t, i) => (
              <li key={t.name} style={{ ...CARD, padding: '20px 22px' }}>
                <h3 style={{ fontSize: 19, fontWeight: 700, margin: 0, color: INK }}>
                  {i + 1}. {t.name}
                </h3>
                <span style={label}>What they did</span>
                <p style={{ fontSize: 16, margin: 0 }}>{t.whatTheyDid}</p>
                <span style={label}>Why it works</span>
                <p style={{ fontSize: 16, margin: 0 }}>{t.whyItWorks}</p>
                <span style={label}>Example (original, written by Shutap)</span>
                <p
                  style={{
                    fontFamily: "'Newsreader', Georgia, serif",
                    fontSize: 18,
                    margin: 0,
                    paddingLeft: 12,
                    borderLeft: `3px solid ${BRAND}`,
                  }}
                >
                  {t.example}
                </p>
                <span style={label}>Try it</span>
                <p style={{ fontSize: 16, margin: 0 }}>{t.tryIt}</p>
              </li>
            ))}
          </ol>
        </section>

        {entry.checkNote && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={h2Style}>Before you quote them</h2>
            <p style={{ fontSize: 17, margin: 0 }}>{entry.checkNote}</p>
          </section>
        )}

        <p style={{ margin: '8px 0 36px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-block',
              background: BRAND,
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 17,
              padding: '14px 24px',
              borderRadius: 999,
            }}
          >
            Try these techniques on your own story →
          </Link>
        </p>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ ...h2Style, fontSize: 18 }}>Sources</h2>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 15, display: 'grid', gap: 6 }}>
            {entry.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} rel="noopener" target="_blank" style={{ color: INK }}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <nav
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 18,
            padding: '20px 0',
            borderTop: '1px solid rgba(11,8,15,.10)',
            borderBottom: '1px solid rgba(11,8,15,.10)',
            margin: '40px 0',
            fontSize: 15,
          }}
        >
          <span style={{ color: '#656565' }}>more:</span>
          {others.map((o) => (
            <Link
              key={o.href}
              to={o.href}
              style={{
                color: INK,
                textDecoration: 'none',
                borderBottom: '1px solid rgba(11,8,15,.25)',
                paddingBottom: 1,
              }}
            >
              {o.label.toLowerCase()}
            </Link>
          ))}
        </nav>

        <p style={{ marginTop: 40, fontSize: 15 }}>
          <Link
            to="/"
            style={{
              color: '#17131a',
              textDecoration: 'none',
              fontWeight: 600,
              borderBottom: '1px solid rgba(23,19,26,.35)',
              paddingBottom: 2,
            }}
          >
            SHUTAP. Say it funnier.
          </Link>
        </p>
      </article>
    </main>
  )
}
