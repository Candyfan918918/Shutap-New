import { pageMeta } from '@/lib/seo/page-meta'
// Joke battle admin: write the bank, see what the room picks, retire lines.
// Every number comes from real rows; flagged picks (too fast, picked the
// control line, repeats, players who keep failing test rounds) are counted
// apart and left out of every rate.
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { AdminShell } from '@/components/AdminShell'
import {
  adminBattleArchiveBank,
  adminBattleGoLive,
  adminBattleReport,
  adminBattleToggle,
  adminBattleWriteSetups,
  adminBattleWriteVersions,
  type AdminBattleReport,
  type AdminBattleSetup,
} from '@/lib/battle.functions'
import { BATTLE } from '@/lib/battle'

export const Route = createFileRoute('/_authenticated/admin/battle')({
  head: () => ({ meta: [...pageMeta('Admin · Joke battle — Shutap', 'Review joke battle results and the battle joke bank in the private administration area.', '/admin/battle'), { name: 'robots', content: 'noindex' }] }),
  component: () => (
    <div data-ph-private style={{ display: 'contents' }}>
      <AdminBattlePage />
    </div>
  ),
})

const pct = (x: number) => `${Math.round(x * 100)}%`

function AdminBattlePage() {
  const load = useServerFn(adminBattleReport)
  const toggle = useServerFn(adminBattleToggle)
  const writeSetups = useServerFn(adminBattleWriteSetups)
  const writeVersions = useServerFn(adminBattleWriteVersions)
  const goLive = useServerFn(adminBattleGoLive)
  const archive = useServerFn(adminBattleArchiveBank)
  const [data, setData] = useState<AdminBattleReport | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [sort, setSort] = useState<'n' | 'picks' | 'none'>('n')
  const [open, setOpen] = useState<string | null>(null)
  const stop = useRef(false)

  const refresh = useCallback(async () => {
    try {
      setData(await load())
      setErr(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'load failed')
    }
  }, [load])
  useEffect(() => { void refresh() }, [refresh])

  async function fillBank() {
    stop.current = false
    setLog([])
    try {
      // Setups first, 20 a call, until the bank holds the target.
      for (let i = 0; i < 20 && !stop.current; i++) {
        setBusy(`writing setups… (${data?.bank.setups ?? 0} so far)`)
        const r = await writeSetups()
        setLog((l) => [...l, `setups: +${r.added} (now ${r.setups})${r.errors.length ? ` · ${r.errors.join('; ')}` : ''}`])
        if (r.setups >= BATTLE.setups || r.added === 0) break
      }
      // Then four versions per setup, 5 setups a call.
      for (let i = 0; i < 60 && !stop.current; i++) {
        const r = await writeVersions()
        setBusy(`writing versions… ${r.withoutVersions} setups to go`)
        setLog((l) => [...l, `versions: +${r.added} · ${r.withoutVersions} setups to go${r.errors.length ? ` · ${r.errors.join('; ')}` : ''}`])
        if (r.withoutVersions === 0) break
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'writing failed')
    } finally {
      setBusy(null)
      void refresh()
    }
  }

  async function archiveBank() {
    if (!window.confirm('Retire the whole current bank? It comes off the homepage and is kept only for the record. Then "write the bank" writes a new one.')) return
    try {
      const r = await archive()
      setLog((l) => [...l, `archived ${r.archived} setups`])
      await refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'archive failed')
    }
  }

  async function allLive() {
    if (!data?.bank.readyNotLive) return
    if (!window.confirm(`Put ${data.bank.readyNotLive} setups on the homepage?`)) return
    try {
      const r = await goLive()
      setLog((l) => [...l, `live: +${r.turnedOn} setups`])
      await refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'update failed')
    }
  }

  async function flip(kind: 'setup' | 'version' | 'live', id: string, active: boolean) {
    try {
      await toggle({ data: { kind, id, active } })
      setData((d) => {
        if (!d) return d
        if (kind === 'live') return { ...d, setups: d.setups.map((s) => (s.id === id ? { ...s, live: active } : s)) }
        if (kind === 'setup') return { ...d, setups: d.setups.map((s) => (s.id === id ? { ...s, active } : s)) }
        return { ...d, setups: d.setups.map((s) => ({ ...s, versions: s.versions.map((v) => (v.id === id ? { ...v, active } : v)) })) }
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'update failed')
    }
  }

  const setups = useMemo(() => {
    const list = [...(data?.setups ?? [])]
    if (sort === 'picks') list.sort((a, b) => b.picks - a.picks)
    if (sort === 'none') list.sort((a, b) => b.noneRate - a.noneRate || b.picks - a.picks)
    return list
  }, [data, sort])

  const t = data?.totals
  const flaggedTotal = t ? t.flagged.too_fast + t.flagged.test_fail + t.flagged.repeat + t.flagged.low_quality_player : 0
  const nonSkip = t ? t.decided - t.skips : 0

  return (
    <AdminShell
      title="joke battle"
      subtitle={data ? `${data.bank.liveSetups} setups on the homepage · ${data.bank.readyNotLive} ready, not live · ${data.bank.versions} lines · ${t?.counted ?? 0} counted picks` : undefined}
      right={
        <div style={{ display: 'flex', gap: 8 }}>
          {busy ? (
            <button type="button" style={btn} onClick={() => (stop.current = true)}>stop after this call</button>
          ) : (
            <button type="button" style={btn} onClick={() => void fillBank()} disabled={!data}>
              {data && data.bank.setups < BATTLE.setups ? `write the bank (${data.bank.setups}/${BATTLE.setups})` : data?.bank.setupsWithoutVersions ? `write missing versions (${data.bank.setupsWithoutVersions})` : 'bank is full'}
            </button>
          )}
          {!!data?.bank.readyNotLive && !busy && (
            <button type="button" style={{ ...btn, background: '#0b080f', color: '#fff' }} onClick={() => void allLive()}>put {data.bank.readyNotLive} ready setups live</button>
          )}
          {!busy && !!data?.bank.setups && (
            <button type="button" style={btn} onClick={() => void archiveBank()}>retire this bank</button>
          )}
          <button type="button" style={btn} onClick={() => void refresh()}>refresh</button>
        </div>
      }
    >
      {err && <div style={{ color: '#c1216b', marginBottom: 12 }}>{err}</div>}
      {busy && <div style={{ ...card, marginBottom: 16, fontSize: 13 }}>{busy}</div>}
      {log.length > 0 && (
        <details style={{ ...card, marginBottom: 16, fontSize: 12 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>writing log ({log.length})</summary>
          <pre style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{log.join('\n')}</pre>
        </details>
      )}
      {!data || !t ? (
        <div style={{ color: '#443c42' }}>loading…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            <Kpi label="counted picks" value={t.counted} sub={`${t.decided} decided · ${t.served} rounds served · ${t.today} today`} />
            <Kpi label="players" value={t.players} sub={`${t.guests} guests · ${t.signedIn} signed in`} />
            <Kpi label='"none of these"' value={t.counted ? pct(t.nones / t.counted) : '—'} sub={`${t.nones} rounds`} />
            <Kpi label="skips" value={t.decided ? pct(t.skips / t.decided) : '—'} sub={`${t.skips} rounds`} />
            <Kpi label="filtered out" value={nonSkip ? pct(flaggedTotal / nonSkip) : '—'} sub={`${t.flagged.too_fast} too fast · ${t.flagged.test_fail} picked the control · ${t.flagged.repeat} repeats · ${t.flagged.low_quality_player} from low-quality players`} />
            <Kpi
              label="guests agree with signed-in"
              value={data.agreement ? pct(data.agreement.agree / data.agreement.setupsCompared) : '—'}
              sub={data.agreement ? `same top line on ${data.agreement.agree} of ${data.agreement.setupsCompared} setups` : 'needs 5+ picks from each group on a setup'}
            />
          </div>

          <section style={{ ...card, marginBottom: 24, padding: 0, overflowX: 'auto' }}>
            <h2 style={{ ...h2, padding: '16px 16px 0' }}>Techniques, by pick rate (a fair share is 1 in 3)</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr><th style={th}>technique</th><th style={th}>guide</th><th style={th}>lines</th><th style={th}>shown</th><th style={th}>picked</th><th style={th}>pick rate</th></tr>
              </thead>
              <tbody>
                {data.techniques.map((x) => (
                  <tr key={`${x.guideSlug}|${x.name}`}>
                    <td style={{ ...td, fontWeight: 600 }}>{x.name}</td>
                    <td style={td}>{x.guideSlug ? <a href={`/guides/${x.guideSlug}`} style={{ color: '#a3175a' }}>{x.guideSlug}</a> : '—'}</td>
                    <td style={td}>{x.versions}</td>
                    <td style={td}>{x.shown}</td>
                    <td style={td}>{x.picked}</td>
                    <td style={{ ...td, minWidth: 180 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ flex: 1, height: 6, background: '#e9e5e8', borderRadius: 999 }}>
                          <span style={{ display: 'block', height: 6, borderRadius: 999, background: x.rate >= 1 / 3 ? '#c1216b' : '#6b4a5c', width: `${Math.min(100, Math.round(x.rate * 100))}%` }} />
                        </span>
                        <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{x.shown ? pct(x.rate) : '—'}</strong>
                      </span>
                    </td>
                  </tr>
                ))}
                {!data.techniques.length && <tr><td style={td} colSpan={6}>no lines yet. write the bank first.</td></tr>}
              </tbody>
            </table>
          </section>

          <section style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              <h2 style={{ ...h2, margin: 0 }}>Setups</h2>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['n', 'picks', 'none'] as const).map((k) => (
                  <button key={k} type="button" style={{ ...btn, background: sort === k ? '#0b080f' : '#fff', color: sort === k ? '#fff' : '#0b080f' }} onClick={() => setSort(k)}>
                    {k === 'n' ? 'by number' : k === 'picks' ? 'most picked' : '"none" most often'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {setups.map((s) => (
                <SetupRow key={s.id} s={s} open={open === s.id} onOpen={() => setOpen(open === s.id ? null : s.id)} onFlip={flip} />
              ))}
              {!setups.length && <div style={card}>no setups yet. "write the bank" writes {BATTLE.setups} setups, then four lines each. Nothing goes on the homepage until you put it live.</div>}
            </div>
          </section>
        </>
      )}
    </AdminShell>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 12, color: '#6b4a5c' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b4a5c', marginTop: 4, lineHeight: 1.4 }}>{sub}</div>
    </div>
  )
}

function SetupRow({ s, open, onOpen, onFlip }: { s: AdminBattleSetup; open: boolean; onOpen: () => void; onFlip: (k: 'setup' | 'version' | 'live', id: string, a: boolean) => void }) {
  const live = s.versions.filter((v) => v.active).length
  return (
    <div style={{ ...card, padding: 12, opacity: s.active ? 1 : 0.6 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={onOpen} style={{ flex: 1, minWidth: 240, textAlign: 'left', background: 'none', border: 0, padding: 0, cursor: 'pointer', fontFamily: "'Sora',sans-serif", color: '#0b080f' }} aria-expanded={open}>
          <span style={{ fontSize: 12, color: '#6b4a5c' }}>#{s.n} · {s.live ? 'on the homepage' : 'not live'} · {s.topic} · {live} lines · {s.picks} picks{s.picks ? ` · none ${pct(s.noneRate)}` : ''}{s.picks >= BATTLE.retireAfter ? ' · retired (enough picks)' : ''}</span>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 600, marginTop: 2 }}>{s.setup}</span>
        </button>
        <button type="button" style={btn} onClick={() => onFlip('live', s.id, !s.live)}>{s.live ? 'take off homepage' : 'put live'}</button>
        <button type="button" style={btn} onClick={() => onFlip('setup', s.id, !s.active)}>{s.active ? 'pause setup' : 'turn on'}</button>
      </div>
      {open && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 8 }}>
          <tbody>
            {s.versions.map((v) => (
              <tr key={v.id} style={{ opacity: v.active ? 1 : 0.5 }}>
                <td style={{ ...td, fontFamily: "'Newsreader',serif", fontSize: 15 }}>{v.text}<div style={{ fontFamily: "'Sora',sans-serif", fontSize: 11, color: '#6b4a5c', marginTop: 2 }}>{v.technique}{v.guideSlug ? ` · ${v.guideSlug}` : ''}</div></td>
                <td style={{ ...td, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{v.shown ? `${pct(v.share)} of ${v.shown}` : 'not shown yet'}</td>
                <td style={{ ...td, textAlign: 'right' }}><button type="button" style={btn} onClick={() => onFlip('version', v.id, !v.active)}>{v.active ? 'retire' : 'bring back'}</button></td>
              </tr>
            ))}
            {!s.versions.length && <tr><td style={td}>no lines yet</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  )
}

const btn: React.CSSProperties = { minHeight: 36, padding: '0 14px', borderRadius: 999, border: '.5px solid rgba(11,8,15,.16)', background: '#fff', color: '#0b080f', fontFamily: "'Sora',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }
const card: React.CSSProperties = { background: '#fff', border: '.5px solid rgba(11,8,15,.10)', borderRadius: 14, padding: 16 }
const h2: React.CSSProperties = { fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 800, color: '#0b080f', margin: '0 0 10px' }
const th: React.CSSProperties = { textAlign: 'left', padding: '12px 14px', fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6b4a5c', borderBottom: '.5px solid rgba(11,8,15,.10)' }
const td: React.CSSProperties = { padding: '12px 14px', borderBottom: '.5px solid rgba(11,8,15,.06)', verticalAlign: 'top' }
