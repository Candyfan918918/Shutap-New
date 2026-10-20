// Enterprise pricing / solutions request form. Emails hello@shutap.com via Resend; nothing is stored.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const InquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(200),
  companySize: z.enum(['1-50', '51-500', '501-5000', '5000+']),
  useCases: z
    .array(z.enum(['presentations', 'roadshows', 'demos', 'meetings', 'dataset', 'other']))
    .min(1)
    .max(6),
  timeline: z.enum(['now', 'quarter', 'exploring']),
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
    const label = data.useCases.includes('dataset') ? 'enterprise + dataset pricing request' : 'enterprise pricing request'
    const uc = data.useCases.join(', ')
    const html = `<!doctype html><html><body style="font-family:Sora,Arial,sans-serif;color:#0b080f;padding:24px">
<p style="margin:0 0 6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6f666c">enterprise inquiry · ${esc(label)}</p>
<table style="font-size:14px;line-height:1.6;border-collapse:collapse">
<tr><td style="padding-right:14px;color:#6f666c">name</td><td>${esc(data.name)}</td></tr>
<tr><td style="padding-right:14px;color:#6f666c">title</td><td>${esc(data.title)}</td></tr>
<tr><td style="padding-right:14px;color:#6f666c">company</td><td>${esc(data.company)}</td></tr>
<tr><td style="padding-right:14px;color:#6f666c">email</td><td>${esc(data.email)}</td></tr>
<tr><td style="padding-right:14px;color:#6f666c">company size</td><td>${esc(data.companySize)}</td></tr>
<tr><td style="padding-right:14px;color:#6f666c">use cases</td><td>${esc(uc)}</td></tr>
<tr><td style="padding-right:14px;color:#6f666c">timeline</td><td>${esc(data.timeline)}</td></tr>
</table>
<p style="white-space:pre-wrap;font-size:14px;margin-top:14px">${esc(data.message || '(no message)')}</p>
</body></html>`
    const text = `Enterprise inquiry (${label})\nName: ${data.name}\nTitle: ${data.title}\nCompany: ${data.company}\nSize: ${data.companySize}\nEmail: ${data.email}\nUse cases: ${uc}\nTimeline: ${data.timeline}\n\n${data.message}`
    const res = await sendResendEmail({
      to: IDENTITIES.hello.fromAddress,
      from: formatFrom(IDENTITIES.hello),
      replyTo: data.email,
      subject: `enterprise inquiry · ${label} · ${data.company}`.slice(0, 120),
      html,
      text,
    })
    if (!res.ok) {
      console.error('business inquiry email failed', res.error)
      return { ok: false as const }
    }
    // Confirmation to the requester, from hello@shutap.com. Best-effort.
    try {
      const { sendEmail } = await import('@/lib/email/send.server')
      const first = data.name.split(/\s+/)[0] || data.name
      await sendEmail('hello', 'enterprise_received', {
        first_name: esc(first),
        first_name_plain: first,
        company: esc(data.company),
        company_plain: data.company,
      }, data.email)
    } catch (e) {
      console.warn('enterprise confirmation email failed', e)
    }
    return { ok: true as const }
  })
