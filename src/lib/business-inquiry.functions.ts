// Business / dataset inquiry form. Emails hello@shutap.com via Resend; nothing is stored.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const InquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(200),
  interest: z.enum(['information', 'dataset', 'both']),
  message: z.string().trim().max(2000).optional().default(''),
  website: z.string().max(200).optional().default(''), // honeypot
})

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const submitBusinessInquiry = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => InquirySchema.parse(d))
  .handler(async ({ data }) => {
    if (data.website) return { ok: true as const } // bot: pretend success
    const { sendResendEmail } = await import('@/lib/resend.server')
    const { IDENTITIES, formatFrom } = await import('@/lib/email/identities')
    const label =
      data.interest === 'dataset'
        ? 'dataset request'
        : data.interest === 'both'
          ? 'information + dataset request'
          : 'information request'
    const html = `<!doctype html><html><body style="font-family:Sora,Arial,sans-serif;color:#0b080f;padding:24px">
<p style="margin:0 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6f666c">business inquiry · ${esc(label)}</p>
<table style="font-size:14px;line-height:1.6;border-collapse:collapse">
<tr><td style="padding-right:14px;color:#6f666c">name</td><td>${esc(data.name)}</td></tr>
<tr><td style="padding-right:14px;color:#6f666c">title</td><td>${esc(data.title)}</td></tr>
<tr><td style="padding-right:14px;color:#6f666c">company</td><td>${esc(data.company)}</td></tr>
<tr><td style="padding-right:14px;color:#6f666c">email</td><td>${esc(data.email)}</td></tr>
<tr><td style="padding-right:14px;color:#6f666c">interest</td><td>${esc(label)}</td></tr>
</table>
<p style="white-space:pre-wrap;font-size:14px;margin-top:14px">${esc(data.message || '(no message)')}</p>
</body></html>`
    const text = `Business inquiry (${label})\nName: ${data.name}\nTitle: ${data.title}\nCompany: ${data.company}\nEmail: ${data.email}\n\n${data.message}`
    const res = await sendResendEmail({
      to: IDENTITIES.hello.fromAddress,
      from: formatFrom(IDENTITIES.hello),
      replyTo: data.email,
      subject: `business inquiry · ${label} · ${data.company}`.slice(0, 120),
      html,
      text,
    })
    if (!res.ok) {
      console.error('business inquiry email failed', res.error)
      return { ok: false as const }
    }
    return { ok: true as const }
  })
