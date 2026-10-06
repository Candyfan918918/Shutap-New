/* Alias mint / re-roll step. Lazy-loaded — pulls in alias, legal, and
 * welcome-email server-fn modules only when the user reaches this step. */
import { useMemo, useState } from 'react'
import { Words } from '@/components/motion'
import { upsertMyAlias, randomAliasParts } from '@/lib/alias.functions'
import { recordLegalAcceptance } from '@/lib/legal.functions'
import { sendWelcomeEmail } from '@/lib/welcome-email.functions'
import { setAlias } from '@/lib/auth'
import { CREATURES, primaryBtn, ghostBtn, ACCENT, TEXT, SOFT, type Msg } from './shared'

export interface AliasResult {
  emotion: string
  nation: string
  creature: string
  emoji: string
  display_name: string
}

export interface AliasStepProps {
  birth: { day: number; month: number; year: number }
  initial?: AliasResult
  onComplete: (a: AliasResult) => void
}

export function AliasStep({ birth, initial, onComplete }: AliasStepProps) {
  const [alias, setAliasState] = useState<AliasResult>(() => initial ?? { ...randomAliasParts() })
  const [msg, setMsg] = useState<Msg>(null)
  const [busy, setBusy] = useState(false)
  const emoji = useMemo(() => CREATURES.find((c) => c.n === alias.creature)?.e ?? alias.emoji, [alias])

  const spin = () => setAliasState((prev) => {
    for (let i = 0; i < 8; i++) {
      const next = randomAliasParts()
      if (next.emotion !== prev.emotion || next.nation !== prev.nation || next.creature !== prev.creature) return next
    }
    return randomAliasParts()
  })

  const keepAlias = async () => {
    setBusy(true); setMsg(null)
    try {
      const saved = await upsertMyAlias({
        data: {
          emotion: alias.emotion,
          nation: alias.nation,
          creature: alias.creature,
          emoji,
          display_name: alias.display_name,
          birth_year: birth.year,
          birth_month: birth.month,
          birth_day: birth.day,
        },
      })
      const savedTyped = saved as { display_name?: string; emoji?: string } | null
      setAlias({
        name: savedTyped?.display_name ?? alias.display_name,
        emoji: savedTyped?.emoji ?? emoji,
      })
      await recordLegalAcceptance({ data: {} }).catch(() => {})
      try {
        const { trackEvent } = await import('@/lib/tracking')
        void trackEvent('alias_minted', { display_name: alias.display_name })
        void trackEvent('sign_up_completed', { display_name: alias.display_name })
      } catch { /* noop */ }
      void sendWelcomeEmail().catch(() => {})
      onComplete({ ...alias, emoji })
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'save failed' })
    } finally { setBusy(false) }
  }

  return (
    <div className="wstep" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: ACCENT, marginBottom: 14 }}>your name in the room</div>
        <Words as="div" style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 18, lineHeight: 1.5, color: TEXT, marginBottom: 8 }}>it won't be yours. it will be the name the room knows you by.</Words>
        <div style={{ fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 15, color: SOFT }}>one alias. always yours. never your real name.</div>
      </div>
      <div style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.10)', borderRadius: 20, padding: '28px 24px', textAlign: 'center' }}>
        <div key={alias.display_name + 'emoji'} style={{ fontSize: 44, marginBottom: 16, animation: 'wslotIn .35s ease' }}>{emoji}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap', minHeight: 52 }}>
          <span key={alias.emotion} style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 22, color: '#e2dde0', animation: 'wslotIn .35s ease' }}>{alias.emotion}</span>
          <span style={{ color: ACCENT, fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 18 }}>·</span>
          <span key={alias.nation} style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 22, color: TEXT, animation: 'wslotIn .35s ease' }}>{alias.nation}</span>
          <span style={{ color: ACCENT, fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 18 }}>·</span>
          <span key={alias.creature} style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 22, color: TEXT, animation: 'wslotIn .35s ease' }}>{alias.creature}</span>
        </div>
      </div>
      {msg && (
        <div style={{ textAlign: 'center', fontFamily: "'Newsreader',serif", fontStyle: 'italic', fontSize: 14, color: msg.kind === 'err' ? ACCENT : '#e2dde0' }}>{msg.text}</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button style={ghostBtn} onClick={spin} disabled={busy}>spin again</button>
        <button style={primaryBtn} onClick={keepAlias} disabled={busy}>this is me →</button>
      </div>
    </div>
  )
}

export default AliasStep
