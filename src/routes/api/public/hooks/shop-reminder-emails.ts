// Hourly cron (:17): the small-business reminder. An owner who turned
// "Remind me tomorrow" on gets one email a day, late morning Pacific, asking
// what happened today, with a button back to shutap.com/smallbusiness. Not
// sent on a day they already made a video, never twice a day
// (shop_reminder_emails), and never while the product is closed to them.
// Opt-outs are enforced by sendEmail. Calling this route by hand can only
// send what the hour's run would have sent anyway.
import { createFileRoute } from '@tanstack/react-router'

const FROM_HOUR = 10 // Pacific
const UNTIL_HOUR = 13
const MAX_PER_RUN = 60
const GAP_MS = 600
const SKIP_EMAIL = /(@test\.local|@example\.com)$/i
const CTA = 'https://shutap.com/smallbusiness?utm_source=hello_shutap&utm_medium=email&utm_campaign=sb_reminder'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const pacificHour = () => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', hourCycle: 'h23' }).format(new Date()))

async function run() {
  try {
    const hour = pacificHour()
    if (hour < FROM_HOUR || hour >= UNTIL_HOUR) return Response.json({ ok: true, sent: 0, why: 'outside the sending hours' })
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { sendEmail } = await import('@/lib/email/send.server')
    const { today } = await import('@/lib/bits/tier.server')
    const { readFlags } = await import('@/lib/flags')
    const db = supabaseAdmin as any
    const day = today().day
    const open = !!readFlags().smallbusiness
    const { data: shops, error } = await db.from('shops').select('user_id, name').eq('remind', true).limit(2000)
    if (error) return Response.json({ ok: false }, { status: 500 })
    const [{ data: done }, { data: made }] = await Promise.all([
      db.from('shop_reminder_emails').select('user_id').eq('day', day),
      db.from('shop_videos').select('user_id').eq('day', day),
    ])
    const skip = new Set<string>([...(done ?? []), ...(made ?? [])].map((r: { user_id: string }) => r.user_id))
    let sent = 0, suppressed = 0, failed = 0
    for (const s of (shops ?? []) as { user_id: string; name: string }[]) {
      if (sent >= MAX_PER_RUN) break
      if (skip.has(s.user_id)) continue
      // while the product is dark, only an admin can open it: nobody is emailed a link to a page they cannot see
      if (!open) { const { data: isAdmin } = await db.rpc('has_role', { _user_id: s.user_id, _role: 'admin' }); if (!isAdmin) continue }
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(s.user_id)
      const who = u?.user
      const email = who?.email
      if (!who || !email || !who.email_confirmed_at || SKIP_EMAIL.test(email)) continue
      // claim the day first, so two runs at once cannot both send
      const claim = await db.from('shop_reminder_emails').insert({ user_id: s.user_id, day })
      if (claim.error) continue
      const res = await sendEmail('hello', 'sb_reminder', { business: esc(s.name), business_plain: s.name, cta_url: CTA, deep_link: CTA }, email)
      if (!res.ok) { failed++; await db.from('shop_reminder_emails').delete().eq('user_id', s.user_id).eq('day', day); continue }
      if ((res as { suppressed?: boolean }).suppressed) suppressed++
      else { sent++; await db.from('events').insert({ user_id: s.user_id, name: 'shop_reminder_sent', product: 'smallbusiness', properties: { product: 'smallbusiness', day } }) }
      await sleep(GAP_MS)
    }
    return Response.json({ ok: true, sent, suppressed, failed })
  } catch (e) {
    console.error('[shop-reminder-emails] failed', e)
    return Response.json({ ok: false }, { status: 500 })
  }
}

export const Route = createFileRoute('/api/public/hooks/shop-reminder-emails')({
  server: { handlers: { GET: run, POST: run } },
})
