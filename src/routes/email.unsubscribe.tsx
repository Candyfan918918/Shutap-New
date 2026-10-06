import { createFileRoute, Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { processUnsubscribe, type PrefsDto } from '@/lib/email/prefs.functions'
import { EyeMark } from '@/components/brand/EyeMark'

export const Route = createFileRoute('/email/unsubscribe')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  head: () => ({
    meta: [
      { title: 'unsubscribed · shutap' },
      { name: 'robots', content: 'noindex,nofollow' },
      { name: 'description', content: 'email unsubscribe' },
    ],
  }),
  component: UnsubscribeRoute,
})

function UnsubscribeRoute() {
  const { token } = Route.useSearch()
  const run = useServerFn(processUnsubscribe)
  const [state, setState] = useState<'pending' | PrefsDto>('pending')

  useEffect(() => {
    if (!token) {
      setState({ ok: false })
      return
    }
    run({ data: { token } })
      .then((r) => setState(r))
      .catch(() => setState({ ok: false }))
  }, [token, run])

  const ok = state !== 'pending' && state.ok

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#ffffff',
        color: '#100c14',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 22px',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: '100%',
          background: '#ffffff',
          border: '1px solid rgba(11,8,15,.08)',
          borderRadius: 22,
          padding: '40px 34px',
          textAlign: 'center',
          boxShadow: '0 22px 44px -28px rgba(20,16,22,.42)',
          animation: 'shutap-fadeup .5s ease both',
        }}
      >
        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            color: '#100c14',
            marginBottom: 22,
          }}
        >
          <EyeMark size={34} />
          <span
            style={{
              fontFamily: 'Sora, sans-serif',
              fontWeight: 800,
              fontSize: 20,
              letterSpacing: '-.02em',
            }}
          >
            shutap
          </span>
        </a>

        {state === 'pending' ? (
          <p style={{ color: '#443c42', margin: 0, fontSize: 14 }}>
            updating your preferences…
          </p>
        ) : ok ? (
          <>
            <h1
              style={{
                fontFamily: 'Sora, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(22px, 4.5vw, 30px)',
                letterSpacing: '-.02em',
                margin: '4px 0 12px',
                color: '#0b080f',
                lineHeight: 1.15,
              }}
            >
              you're unsubscribed.
            </h1>
            <p
              style={{
                fontFamily: 'Newsreader, serif',
                fontStyle: 'italic',
                color: '#443c42',
                lineHeight: 1.6,
                margin: '0 0 22px',
                fontSize: 16,
              }}
            >
              sign-in links and account emails still arrive. everything else is off.
            </p>
            {state.email ? (
              <p style={{ color: '#6f666c', fontSize: 12.5, margin: '0 0 26px' }}>
                for {state.email}
              </p>
            ) : null}
            <Link
              to="/email/preferences"
              search={{ token }}
              style={{
                display: 'inline-block',
                background: '#2b2630',
                color: '#ffffff',
                padding: '13px 26px',
                borderRadius: 999,
                textDecoration: 'none',
                fontFamily: 'Sora, sans-serif',
                fontSize: 13.5,
                fontWeight: 600,
                letterSpacing: '-.005em',
                boxShadow: '0 18px 40px -14px rgba(20,16,22,.55)',
                transition: 'transform .18s, box-shadow .18s',
              }}
            >
              manage preferences instead
            </Link>
          </>
        ) : (
          <>
            <h1
              style={{
                fontFamily: 'Sora, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(20px, 4vw, 26px)',
                letterSpacing: '-.02em',
                margin: '4px 0 12px',
                color: '#0b080f',
              }}
            >
              this link isn't valid.
            </h1>
            <p
              style={{
                fontFamily: 'Newsreader, serif',
                fontStyle: 'italic',
                color: '#443c42',
                lineHeight: 1.6,
                margin: 0,
                fontSize: 15.5,
              }}
            >
              it may have expired or been used. sign in to manage your email.
            </p>
          </>
        )}
      </div>
      <style>{`
        @keyframes shutap-fadeup {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </main>
  )
}
