import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { loadPrefs, savePrefs, type PrefsDto } from '@/lib/email/prefs.functions'
import { EyeMark } from '@/components/brand/EyeMark'

export const Route = createFileRoute('/email/preferences')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  head: () => ({
    meta: [
      { title: 'email preferences · shutap' },
      { name: 'robots', content: 'noindex,nofollow' },
      { name: 'description', content: 'manage your shutap email preferences' },
    ],
  }),
  component: PreferencesRoute,
})

type GroupKey =
  | 'notif_checkins_opt_out'
  | 'notif_community_opt_out'
  | 'notif_digest_opt_out'

const GROUPS: { key: GroupKey; title: string; desc: string }[] = [
  {
    key: 'notif_checkins_opt_out',
    title: 'reminders',
    desc: 'the occasional note about your account.',
  },
  {
    key: 'notif_community_opt_out',
    title: 'activity',
    desc: 'likes, comments, and new followers on your posts.',
  },
  {
    key: 'notif_digest_opt_out',
    title: 'roundups',
    desc: "what's popular in rooms, and a catch-up when you've been away.",
  },
]

function PreferencesRoute() {
  const { token } = Route.useSearch()
  const load = useServerFn(loadPrefs)
  const save = useServerFn(savePrefs)
  const [state, setState] = useState<'pending' | PrefsDto>('pending')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!token) {
      setState({ ok: false })
      return
    }
    load({ data: { token } })
      .then((r) => setState(r))
      .catch(() => setState({ ok: false }))
  }, [token, load])

  async function toggle(key: GroupKey, nextValue: boolean) {
    if (state === 'pending' || !state.ok || !state.prefs) return
    const nextPrefs = { ...state.prefs, [key]: nextValue }
    setState({ ...state, prefs: nextPrefs })
    setSaving(true)
    setSaved(false)
    try {
      const r = await save({ data: { token, [key]: nextValue } })
      if (r.ok) {
        setState(r)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#ffffff',
        color: '#100c14',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '48px 22px 80px',
      }}
    >
      <div
        style={{
          maxWidth: 600,
          width: '100%',
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
            marginBottom: 28,
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

        <div
          style={{
            fontFamily: 'Sora, sans-serif',
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: '#6f666c',
            marginBottom: 8,
          }}
        >
          your inbox
        </div>
        <h1
          style={{
            fontFamily: 'Sora, sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(26px, 5vw, 34px)',
            letterSpacing: '-.02em',
            color: '#0b080f',
            margin: '0 0 10px',
            lineHeight: 1.12,
          }}
        >
          email preferences
        </h1>
        {state !== 'pending' && state.ok && state.email ? (
          <p
            style={{
              fontFamily: 'Newsreader, serif',
              fontStyle: 'italic',
              color: '#443c42',
              fontSize: 15,
              margin: '0 0 28px',
            }}
          >
            for {state.email}
          </p>
        ) : (
          <p
            style={{
              fontFamily: 'Newsreader, serif',
              fontStyle: 'italic',
              color: '#443c42',
              fontSize: 15,
              margin: '0 0 28px',
            }}
          >
            choose what shows up in your inbox.
          </p>
        )}

        <div
          style={{
            background: '#ffffff',
            border: '1px solid rgba(11,8,15,.08)',
            borderRadius: 22,
            padding: '28px 26px',
            boxShadow: '0 22px 44px -28px rgba(20,16,22,.32)',
          }}
        >
          {state === 'pending' ? (
            <p style={{ color: '#443c42', margin: 0, fontSize: 14 }}>loading…</p>
          ) : !state.ok || !state.prefs ? (
            <div>
              <p
                style={{
                  lineHeight: 1.65,
                  margin: '0 0 20px',
                  color: '#2b2730',
                  fontSize: 14.5,
                }}
              >
                this link expired. sign in to manage your email.
              </p>
              <a
                href="/auth?next=/email/preferences"
                style={{
                  display: 'inline-block',
                  background: '#2b2630',
                  color: '#ffffff',
                  padding: '12px 24px',
                  borderRadius: 999,
                  textDecoration: 'none',
                  fontFamily: 'Sora, sans-serif',
                  fontSize: 13.5,
                  fontWeight: 600,
                  boxShadow: '0 18px 40px -14px rgba(20,16,22,.55)',
                }}
              >
                sign in
              </a>
            </div>
          ) : (
            <>
              {state.prefs.notif_all_opt_out ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(23,19,26,.28)',
                    borderRadius: 14,
                    padding: '12px 14px',
                    fontFamily: 'Newsreader, serif',
                    fontStyle: 'italic',
                    fontSize: 13.5,
                    color: '#000000',
                    marginBottom: 18,
                    lineHeight: 1.55,
                  }}
                >
                  you're unsubscribed from all optional email. turn any back on below.
                </div>
              ) : null}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {GROUPS.map((g) => {
                  const off = Boolean(state.prefs?.[g.key])
                  return (
                    <label
                      key={g.key}
                      className="shutap-pref-row"
                      style={{
                        display: 'flex',
                        gap: 14,
                        alignItems: 'flex-start',
                        padding: '14px 16px',
                        background: '#ffffff',
                        border: '1px solid rgba(11,8,15,.06)',
                        borderRadius: 16,
                        cursor: 'pointer',
                        transition: 'border-color .15s, background .15s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!off}
                        onChange={(e) => toggle(g.key, !e.target.checked)}
                        disabled={saving}
                        style={{
                          marginTop: 3,
                          accentColor: '#2b2630',
                          width: 16,
                          height: 16,
                        }}
                      />
                      <div>
                        <div
                          style={{
                            fontFamily: 'Sora, sans-serif',
                            fontWeight: 700,
                            fontSize: 14.5,
                            color: '#0b080f',
                            letterSpacing: '-.005em',
                          }}
                        >
                          {g.title}
                        </div>
                        <div
                          style={{
                            color: '#443c42',
                            fontSize: 13,
                            lineHeight: 1.55,
                            marginTop: 3,
                          }}
                        >
                          {g.desc}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>

              <div
                style={{
                  marginTop: 20,
                  minHeight: 20,
                  fontSize: 12.5,
                  fontFamily: 'Newsreader, serif',
                  fontStyle: 'italic',
                  color: saved ? '#17131a' : '#6f666c',
                  transition: 'color .2s',
                }}
              >
                {saving ? 'saving…' : saved ? 'saved.' : ''}
              </div>
            </>
          )}
        </div>

        <p
          style={{
            marginTop: 22,
            fontSize: 12,
            color: '#6f666c',
            lineHeight: 1.6,
            textAlign: 'center',
          }}
        >
          sign-in links and account emails always arrive.
        </p>
      </div>
      <style>{`
        @keyframes shutap-fadeup {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
        .shutap-pref-row:hover {
          border-color: rgba(23,19,26,.35) !important;
          background: #eeeeee !important;
        }
      `}</style>
    </main>
  )
}
