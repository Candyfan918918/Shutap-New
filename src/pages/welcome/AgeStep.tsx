/* Age gate (18+). Lazy-loaded — pulls in `recordLegalAcceptance` only when
 * the user actually reaches this step. */
import { useState } from 'react'
import { Words } from '@/components/motion'
import { MONTHS, wheelSelect, primaryBtn, BG, ACCENT, TEXT, SOFT, MUTED, type Msg } from './shared'

export interface AgeStepProps {
  ageBlocked: boolean
  onBlocked: () => void
  onConfirm: (birth: { day: number; month: number; year: number }) => void
}

export function AgeStep({ ageBlocked, onBlocked, onConfirm }: AgeStepProps) {
  const maxYear = new Date().getFullYear() - 18
  const [birth, setBirth] = useState({ day: 1, month: 1, year: maxYear - 12 })
  const [msg, setMsg] = useState<Msg>(null)

  const confirmAge = () => {
    const dob = new Date(birth.year, birth.month - 1, birth.day)
    if (isNaN(dob.getTime())) { setMsg({ kind: 'err', text: 'pick a valid date' }); return }
    const now = new Date()
    let age = now.getFullYear() - dob.getFullYear()
    const m = now.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
    if (age < 18) {
      try { sessionStorage.setItem('shutap_age_rejected', '1') } catch { /* noop */ }
      onBlocked()
      setMsg({ kind: 'err', text: "shutap is 18+ only. you can't make an account." })
      return
    }
    setMsg(null)
    onConfirm(birth)
  }

  return (
    <div className="wstep" style={{ display: 'flex', flexDirection: 'column', gap: 24, textAlign: 'center' }}>
      <div>
        <Words as="div" style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 22, lineHeight: 1.4, color: TEXT, marginBottom: 8 }}>How old are you?</Words>
        <div style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 15, color: SOFT, lineHeight: 1.55, maxWidth: '34ch', margin: '0 auto' }}>
          Shutap is 18+.
        </div>
      </div>
      <div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: MUTED, marginBottom: 14 }}>your date of birth</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <select style={wheelSelect} value={birth.day} onChange={(e) => setBirth({ ...birth, day: +e.target.value })}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d} style={{ background: BG }}>{String(d).padStart(2, '0')}</option>
            ))}
          </select>
          <select style={{ ...wheelSelect, minWidth: 110 }} value={birth.month} onChange={(e) => setBirth({ ...birth, month: +e.target.value })}>
            {MONTHS.map((m, i) => (<option key={m} value={i + 1} style={{ background: BG }}>{m}</option>))}
          </select>
          <select style={wheelSelect} value={birth.year} onChange={(e) => setBirth({ ...birth, year: +e.target.value })}>
            {Array.from({ length: maxYear - 1924 + 1 }, (_, i) => maxYear - i).map((y) => (
              <option key={y} value={y} style={{ background: BG }}>{y}</option>
            ))}
          </select>
        </div>
        {msg && (
          <div style={{ marginTop: 12, fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 14, color: msg.kind === 'err' ? ACCENT : '#e2dde0' }}>{msg.text}</div>
        )}
      </div>
      {ageBlocked ? (
        <div data-testid="age-blocked" style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(23,19,26,.08)', border: '1px solid rgba(23,19,26,.35)', color: '#e2dde0', fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 14, lineHeight: 1.5 }}>
          shutap is 18+ only. accounts aren't available on this browser.
        </div>
      ) : (
        <button style={primaryBtn} onClick={confirmAge}>confirm →</button>
      )}
    </div>
  )
}

export default AgeStep
