// DEPRECATED: legacy check-in email sender with inline copy. New code MUST
// use `sendEmail(identity, templateId, vars, to)` from `@/lib/email/send.server`
// and the templates registry in `@/lib/email/templates.ts`. Retained only so
// existing dispatch code compiles; not wired into the active scheduler.
import { IDENTITIES, formatFrom } from './email/identities'
const RESEND_URL = 'https://api.resend.com/emails'
const FROM_DEFAULT = formatFrom(IDENTITIES.hello)

export type CheckinType = 'day0' | 'day1' | 'day2' | 'day3' | 'day7' | 'day14'

const COPY: Record<Exclude<CheckinType, 'day0'>, { subject: string; body: string }> = {
  day1: {
    subject: 'still sitting with you',
    body: "you spilled yesterday. no fixing, no advice. just checking — are you still in it, or has the room shifted?",
  },
  day2: {
    subject: 'two days in',
    body: "two mornings since the spill. notice anything different in your body when you read it back?",
  },
  day3: {
    subject: 'a small nudge',
    body: "three days. if a tiny next step appeared, what would it be? you don't have to take it.",
  },
  day7: {
    subject: 'a week of it',
    body: "a week. some things resolve, some don't. either way — what feels true now that didn't last week?",
  },
  day14: {
    subject: 'how did it land?',
    body: "two weeks. ready to close this loop? a one-line outcome is enough.",
  },
}

export type SendArgs = {
  to: string
  type: CheckinType
  situationId: string
  appOrigin: string
}

export async function sendCheckinEmail({ to, type, situationId, appOrigin }: SendArgs): Promise<{ ok: boolean; error?: string }> {
  if (type === 'day0') return { ok: true } // in-app only
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: 'RESEND_API_KEY missing' }
  const c = COPY[type]
  const link = `${appOrigin}/checkin/${situationId}`
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#0b080f;max-width:520px;margin:0 auto;padding:24px">
    <p style="margin:0 0 14px">${escapeHtml(c.body)}</p>
    <p style="margin:18px 0 0"><a href="${link}" style="color:#17131a;text-decoration:none;font-weight:600">open the check-in →</a></p>
    <p style="margin:32px 0 0;font-size:12px;color:#6f666c">shutap · sit with it, no fixing</p>
  </div>`
  try {
    const r = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || FROM_DEFAULT,
        to: [to],
        subject: c.subject,
        html,
      }),
    })
    if (!r.ok) {
      const txt = await r.text().catch(() => '')
      return { ok: false, error: `resend ${r.status}: ${txt.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'fetch failed' }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
