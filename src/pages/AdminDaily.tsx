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
  const label = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
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
            <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: INK, margin: '0 0 10px' }}>most made <span style={{ fontWeight: 500, color: DIM, fontSize: 12 }}>{r.is_today ? 'today' : 'that day'} · all time</span></h3>
            {r.top_makers.length === 0 && r.guests.bits_total === 0 ? (
              <div style={{ color: DIM, fontStyle: 'italic', fontSize: 13 }}>nothing made yet</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: MID }}>
                      <th style={th}>#</th>
                      <th style={th}>who</th>
                      <th style={{ ...th, textAlign: 'right' }}>bits</th>
                      <th style={{ ...th, textAlign: 'right' }}>realtor kits</th>
                      <th style={{ ...th, textAlign: 'right' }}>toasts</th>
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
                        <DayAll day={m.bits_day} all={m.bits_total} />
                        <DayAll day={m.kits_day} all={m.kits_total} />
                        <DayAll day={m.toasts_day} all={m.toasts_total} />
                      </tr>
                    ))}
                    <tr style={{ ...tr, background: '#fbf8fa' }}>
                      <td style={{ ...td, color: DIM }} />
                      <td style={{ ...td, color: MID }}>guests (not signed in, all together)</td>
                      <DayAll day={r.guests.bits_day} all={r.guests.bits_total} />
                      <td style={{ ...num, color: DIM }}>—</td>
                      <td style={{ ...num, color: DIM }}>—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <h3 style={sectionH3}>realtor kits</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
            <Stat label="visited /realtors" value={r.realtors.visited} sub="people" />
            <Stat label="pasted a listing" value={r.realtors.pasted} sub={`${r.realtors.read_ok} read · ${r.realtors.read_failed} failed`} />
            <Stat label="kits made" value={r.realtors.kits} sub={`by ${r.realtors.makers} ${r.realtors.makers === 1 ? 'person' : 'people'} · ${r.realtors.total_kits} all time (${r.realtors.total_makers} ${r.realtors.total_makers === 1 ? 'person' : 'people'})`} />
            <Stat label="bought one kit" value={r.realtors.paid} sub="$12.99 one-time" />
            <Stat label="kit downloads & copies" value={r.realtors.downloads} />
          </div>

          <h3 style={sectionH3}>toasts</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
            <Stat label="visited /toasts" value={r.toasts.visited} sub="people" />
            <Stat label="opened the form" value={r.toasts.form_opened} sub="people" />
            <Stat
              label="toasts written"
              value={r.toasts.written}
              sub={`by ${r.toasts.writers} ${r.toasts.writers === 1 ? 'person' : 'people'} · ${r.toasts.total} all time (${r.toasts.total_writers} ${r.toasts.total_writers === 1 ? 'person' : 'people'})${r.toasts.occasions.length ? ' · ' + r.toasts.occasions.map(([o, n]) => `${o.replace(/_/g, ' ')} ${n}`).join(', ') : ''}`}
            />
            <Stat label="locked (finished)" value={r.toasts.locked} />
            <Stat label="bought one toast" value={r.toasts.paid} sub="$12.99 one-time" />
            <Stat label="toast downloads" value={r.toasts.downloads} sub="speech, cue cards, keepsake" />
          </div>

          <h3 style={sectionH3}>paywall</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
            <Stat
              label="sign-in prompt"
              value={r.paywall.signin_prompt_seen}
              sub={`guests asked to sign in · bit 2: ${r.paywall.signin_by_where.bit_2} · rewrite: ${r.paywall.signin_by_where.rewrite} · download: ${r.paywall.signin_by_where.download} · keep: ${r.paywall.signin_by_where.keep} · other: ${r.paywall.signin_by_where.other}`}
            />
            <Stat
              label="saw the paywall"
              value={r.paywall.seen.total}
              sub={`out of bits: ${r.paywall.seen.bit_3} · rewrite: ${r.paywall.seen.rewrite} · limit: ${r.paywall.seen.daily_limit} · download: ${r.paywall.seen.download}`}
            />
            <Stat label="picked a plan" value={r.paywall.plan_chosen.basic + r.paywall.plan_chosen.pro} sub={`basic ${r.paywall.plan_chosen.basic} · pro ${r.paywall.plan_chosen.pro}`} />
            <Stat
              label="opened checkout"
              value={r.paywall.checkout_started.basic + r.paywall.checkout_started.pro}
              sub={`${pctText(r.paywall.checkout_rate_pct)} of paywall views · basic ${r.paywall.checkout_started.basic} · pro ${r.paywall.checkout_started.pro}`}
            />
            <Stat
              label="paid"
              value={r.paywall.paid.basic + r.paywall.paid.pro}
              sub={`${pctText(r.paywall.paid_rate_pct)} of checkouts · basic ${r.paywall.paid.basic} · pro ${r.paywall.paid.pro}`}
            />
            <Stat label="upgraded to pro" value={r.paywall.upgrades} sub="Basic → Pro, no checkout" />
          </div>

          <p style={{ fontSize: 11, color: DIM, marginTop: 10, lineHeight: 1.6 }}>
            Realtor kit and toast visits, pasted listings and form opens are unique people that day; kits, toasts and downloads are counts. Everyone who makes a kit or toast is signed in.{' '}
            Paywall numbers are unique people that day (an account, or a guest's browser session). The sign-in prompt counts guests asked to sign in for a second bit or to rewrite, save or keep a bit; "other" is stand-up, sketch, skit or post. "Opened checkout" counts checkouts reached from the paywall. "Paid" is a new plan (live payments only), not a renewal; its rate is the share of people who opened checkout and paid that day.{' '}
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

function DayAll({ day, all }: { day: number; all: number }) {
  return (
    <td style={{ ...num, whiteSpace: 'nowrap' }}>
      <span style={{ fontWeight: day > 0 ? 800 : 400 }}>{day}</span>
      <span style={{ color: DIM }}> · {all}</span>
    </td>
  )
}

const sectionH3: React.CSSProperties = { fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: INK, margin: '18px 0 10px' }
const th: React.CSSProperties = { padding: '8px 12px', fontWeight: 600, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '9px 12px', color: '#100c14', verticalAlign: 'top' }
const num: React.CSSProperties = { ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }
const tr: React.CSSProperties = { borderTop: '.5px solid rgba(11,8,15,.05)' }
