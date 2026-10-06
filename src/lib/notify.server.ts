// Server-only admin notifications. Fires from server functions after
// meaningful events (e.g. a new public room). All calls are fire-and-forget
// — never block the user flow, never throw.
import { sendResendEmail } from '@/lib/resend.server'

const ADMIN_INBOX = 'hello@shutap.com'
const SITE = 'https://shutap.com'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function notifyRoomCreated(args: {
  roomId: string
  title: string
  clean_text: string
  pillar: string
  scan: number | null
  scan_band: string | null
}): Promise<void> {
  try {
    const first = (args.clean_text || '').slice(0, 220)
    const scanLine =
      typeof args.scan === 'number'
        ? `<p style="margin:0 0 8px;color:#443c42;font-family:Sora,sans-serif;font-size:13px">score ${args.scan}${args.scan_band ? ' · ' + args.scan_band : ''}</p>`
        : ''
    const html = `<!doctype html><html><body style="font-family:Sora,sans-serif;color:#0b080f;background:#ffffff;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:22px 24px;border:.5px solid rgba(11,8,15,.08)">
    <p style="margin:0 0 4px;color:#6f666c;font-size:11px;letter-spacing:.14em;text-transform:uppercase">new post · ${esc(args.pillar)}</p>
    <h1 style="margin:0 0 10px;font-family:Sora,sans-serif;font-size:20px;line-height:1.3">${esc(args.title || 'untitled')}</h1>
    ${scanLine}
    <p style="margin:0 0 14px;font-family:Newsreader,serif;font-size:15px;color:#0b080f;white-space:pre-wrap">${esc(first)}${args.clean_text.length > 220 ? '…' : ''}</p>
    <p style="margin:0">
      <a href="${SITE}/room?id=${encodeURIComponent(args.roomId)}" style="color:#17131a;text-decoration:none;font-weight:600;margin-right:14px">open post →</a>
      <a href="${SITE}/admin" style="color:#443c42;text-decoration:none">admin →</a>
    </p>
  </div>
</body></html>`
    await sendResendEmail({
      to: ADMIN_INBOX,
      subject: `new post · ${args.pillar} · ${(args.title || 'untitled').slice(0, 60)}`,
      html,
      from: process.env.RESEND_FROM || 'shutap <hello@shutap.com>',
    })
  } catch {
    /* fire-and-forget */
  }
}
