// Daily report at the top of /admin: one Pacific day, with arrows to step back.
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { adminDailyReport, type DailyReport } from '@/lib/admin-daily.functions'

const INK = '#0b080f'
const DIM = '#6f666c'
const MID = '#443c42'

const pctText = (v: number | null) => (v == null ? '—' : `${v}%`)

function prettyDay(key: string, today: boolean): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number]
  const label = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  return today ? `today · ${label}` : label
}

function Big({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: '#fff', border: '.5px solid rgba(11,8,15,.08)', borderRadius: 18, padding: '20px 22px' }}>
      <div style={{ fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: DIM, fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 56, lineHeight: 1.05, fontWeight: 800, color: INK, marginTop: 6, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.03em' }}>{value}</div>
      {sub && <div style={{ fontSize: 12.5, color: MID, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: '#fff', border: '.5px solid rgba(11,8,15,.08)', borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: DIM }}>{label}</div>
      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 30, fontWeight: 800, color: INK, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: MID, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export function DailyReportSection() {
  const load = useServerFn(adminDailyReport)
  const [day, setDay] = useState<string | undefined>(undefined)
  const [r, setR] = useState<DailyReport | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let dead = false
    setBusy(true)
    setErr(null)
    load({ data: day ? { day } : {} })
      .then((x) => { if (!dead) setR(x as DailyReport) })
      .catch((e) => { if (!dead) setErr(e instanceof Error ? e.message : 'load failed') })
      .finally(() => { if (!dead) setBusy(false) })
    return () => { dead = true }
  }, [load, day])

  const arrow = (label: string, to: string | null | undefined, title: string) => (
    <button
      onClick={() => to && setDay(to)}
      disabled={!to || busy}
      title={title}
      style={{ width: 34, height: 34, borderRadius: 999, border: '.5px solid rgba(11,8,15,.15)', background: '#fff', cursor: to && !busy ? 'pointer' : 'default', opacity: to ? 1 : 0.35, fontSize: 15, color: INK }}
    >{label}</button>
  )

  return (
    <section style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, color: INK, margin: 0, letterSpacing: '-.01em' }}>
          daily report{r ? ` · ${prettyDay(r.day, r.is_today)}` : ''}
        </h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {arrow('‹', r?.prev_day, 'previous day')}
          {arrow('›', r?.next_day, 'next day')}
          {r && !r.is_today && (
            <button onClick={() => setDay(undefined)} disabled={busy} style={{ padding: '7px 12px', borderRadius: 999, border: '.5px solid rgba(11,8,15,.15)', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: INK }}>today</button>
          )}
        </div>
      </div>

      {err && <div style={{ color: '#17131a', marginBottom: 12 }}>{err}</div>}
      {!r ? (
        !err && <div style={{ color: MID }}>loading…</div>
      ) : (
        <div style={{ opacity: busy ? 0.55 : 1, transition: 'opacity .15s' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 }}>
            <Big label="total users" value={r.users.total} sub={`+${r.users.new_today} new ${r.is_today ? 'today' : 'that day'}`} />
            <Big label="dau" value={r.users.dau} sub="signed-in users active" />
            <Big label="mau" value={r.users.mau} sub="active in the 30 days to this day" />
            <Big label="bits generated" value={r.bits.day} sub={`${r.bits.total} all time`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 14 }}>
            <Stat label="visits" value={r.visits.sessions} sub={`${r.visits.unique} people · ${r.visits.new} new`} />
            <Stat label="returning visitors" value={r.visits.returning} sub="had visited before this day" />
            <Stat label="returning users" value={r.users.returning} sub="signed-in, joined before this day" />
            <Stat label="sign-in rate" value={pctText(r.rates.signed_in_pct)} sub={`${r.rates.signed_in_people} signed-in of ${r.visits.unique} visitors`} />
            <Stat label="sign-up rate" value={pctText(r.rates.signup_pct)} sub={`${r.users.new_today} new accounts of ${r.visits.unique} visitors`} />
            <Stat label="bits by who" value={`${r.bits.day_signed_in} / ${r.bits.day_guest}`} sub={`signed-in / guest · ${r.bits.rewrites_day} rewrites`} />
          </div>

          <div style={{ background: '#fff', border: '.5px solid rgba(11,8,15,.08)', borderRadius: 14, padding: 16 }}>
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: INK, margin: '0 0 10px' }}>most bits generated</h3>
            {r.top_makers.length === 0 && r.guests.bits_total === 0 ? (
              <div style={{ color: DIM, fontStyle: 'italic', fontSize: 13 }}>no bits yet</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: MID }}>
                      <th style={th}>#</th>
                      <th style={th}>who</th>
                      <th style={{ ...th, textAlign: 'right' }}>{r.is_today ? 'today' : 'that day'}</th>
                      <th style={{ ...th, textAlign: 'right' }}>all time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.top_makers.map((m, i) => (
                      <tr key={m.user_id ?? i} style={tr}>
                        <td style={{ ...td, color: DIM, width: 30 }}>{i + 1}</td>
                        <td style={td}>
                          <div style={{ fontWeight: 600 }}>{m.name || m.email || '—'}</div>
                          {m.name && <div style={{ color: DIM, fontSize: 12 }}>{m.email}</div>}
                        </td>
                        <td style={{ ...num, fontWeight: m.bits_day > 0 ? 800 : 400 }}>{m.bits_day}</td>
                        <td style={num}>{m.bits_total}</td>
                      </tr>
                    ))}
                    <tr style={{ ...tr, background: '#fbf8fa' }}>
                      <td style={{ ...td, color: DIM }} />
                      <td style={{ ...td, color: MID }}>guests (not signed in, all together)</td>
                      <td style={num}>{r.guests.bits_day}</td>
                      <td style={num}>{r.guests.bits_total}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p style={{ fontSize: 11, color: DIM, marginTop: 10, lineHeight: 1.6 }}>
            Days are {r.timezone} calendar days. Visits are human sessions (bots removed); people = distinct visitors. Sign-in rate = signed-in users active that day ÷ distinct visitors.
            Returning users = signed-in users active that day who joined on an earlier day. Totals are as of the end of the day.
            {r.hidden.admins > 0 ? ` Admin accounts (${r.hidden.admins}) are left out.` : ''}
            {r.hidden.no_email > 0 ? ` Accounts with no email (${r.hidden.no_email}) are hidden.` : ''}
          </p>
        </div>
      )}
    </section>
  )
}

const th: React.CSSProperties = { padding: '8px 12px', fontWeight: 600, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '9px 12px', color: '#100c14', verticalAlign: 'top' }
const num: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
const tr: React.CSSProperties = { borderTop: '.5px solid rgba(11,8,15,.05)' }
