// Bit failure alerts. Added Oct 21 2026 after five days of every write
// failing with nobody told: six people from search tried and left.
//
// Any failed write — a real visitor's, or the scheduled health check's —
// emails the founder. At most one email per 30 minutes (bit_alerts), so an
// outage is one email, not a flood. Never includes story text.
import { sendResendEmail } from '@/lib/resend.server'

const ALERT_TO = process.env.BIT_ALERT_TO || 'hello@shutap.com'
const ALERT_FROM = 'Shutap alerts <hello@shutap.com>'
const QUIET_MS = 30 * 60 * 1000

export type BitAlertKind = 'user_write_failed' | 'health_check_failed'

export async function alertBitFailure(kind: BitAlertKind, detail: Record<string, unknown>): Promise<void> {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const db = supabaseAdmin as any
    const since = new Date(Date.now() - QUIET_MS).toISOString()
    const { count } = await db.from('bit_alerts').select('id', { count: 'exact', head: true }).gte('created_at', since)
    const summary = JSON.stringify(detail, null, 2).slice(0, 3000)
    await db.from('bit_alerts').insert({ kind, detail: summary })
    if ((count ?? 0) > 0) return

    // How bad is it: failures and successes in the last hour.
    const hour = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const [{ count: failed }, { count: ok }] = await Promise.all([
      db.from('bit_failures').select('id', { count: 'exact', head: true }).gte('created_at', hour),
      db.from('bits').select('id', { count: 'exact', head: true }).gte('created_at', hour),
    ])
    const who = kind === 'user_write_failed' ? 'A visitor just tried to write a bit and got an error.' : 'The scheduled test bit failed.'
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)
    const text = `${who}\n\nLast hour: ${failed ?? 0} failed, ${ok ?? 0} written.\n\nDetail:\n${summary}\n\nLive check: https://shutap.com/api/public/bit-health\nOne email per 30 minutes while it keeps failing.`
    const res = await sendResendEmail({
      to: ALERT_TO,
      from: ALERT_FROM,
      subject: `Shutap: bits are failing (${failed ?? 0} in the last hour)`,
      text,
      html: `<pre style="font:14px/1.5 ui-monospace,monospace;white-space:pre-wrap">${esc(text)}</pre>`,
    })
    if (!res.ok) console.error('[bit-alert] email failed', res.error)
  } catch (e) {
    console.error('[bit-alert] failed', e instanceof Error ? e.message : e)
  }
}
