// Hourly cron (:05): the daily "what to post" email, sent from hello@shutap.com.
// The "what to post today" scheduled task writes today's daily_ideas row at
// ~7:47 Pacific. From 8am Pacific, once that row exists, every signed-up user
// with a confirmed email and a real name gets today's hook, the finished bit,
// the tag and a "Make it yours" button back to shutap.com. If the idea is late,
// the next hourly run sends it; after 2pm Pacific the day is skipped rather than
// emailing a "today" idea in the evening. One email per user per Pacific day,
// guaranteed by daily_idea_emails (user_id, day). Opt-outs are enforced by
// sendEmail (notif_all_opt_out, notif_digest_opt_out).
//
// Test mode: POST {"only": "<email>"} sends today's email to that one account
// (same rules, same once-a-day claim), ignoring the hour window and FIRST_DAY,
// and returns Resend's id and delivery status for it.
// Delivery check: POST {"internal_to": "<name>@shutap.com"} sends today's email to
// that shutap.com mailbox (no account needed, no claim), to prove Resend delivers.
// Status check: POST {"status_of": "<resend email id>"} returns Resend's record
// for that email (last_event: delivered / bounced / suppressed / complained ...).
import { createFileRoute } from '@tanstack/react-router'

const SEND_FROM_PACIFIC_HOUR = 8
const SEND_UNTIL_PACIFIC_HOUR = 14 // last run that sends is 13:05
const FIRST_DAY = '2026-11-02' // first day the cron sends to everyone
const MAX_PER_RUN = 60 // the next hourly run picks up the rest
const RESEND_GAP_MS = 600 // stay under Resend's default 2 requests/second
const SKIP_EMAIL = /(@test\.local|@example\.com|@shutap\.com|@a2b2\.ai)$/i
// The one link in the body. The writer (/bits since the Nov 6 homepage), no #anchor, so Gmail's link wrapping can't drop anything.
const CTA = 'https://shutap.com/bits?utm_source=hello_shutap&utm_medium=email&utm_campaign=daily_idea'
const WHY_MAX_WORDS = 25

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

function pacificHour(at = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', hourCycle: 'h23' }).format(at),
  )
}

function dayLabel(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  ).replace(/ /g, '\u00a0') // keep "Sun, Nov 1" on one line in the phone kicker
}

// The why-now note can run long. Show its first sentence; if that is still over
// WHY_MAX_WORDS, cut at the last comma inside the limit and end with a period
// (no comma: cut at the limit with an ellipsis).
function shortWhy(s: string): string {
  // A sentence ends at . ! ? followed by a capital or quote, so "6 a.m." never ends it.
  const first = (s.match(/^.*?[.!?]["”']?(?=\s+["“A-Z]|\s*$)/)?.[0] ?? s).trim()
  const words = first.split(/\s+/)
  if (words.length <= WHY_MAX_WORDS) return first
  const head = words.slice(0, WHY_MAX_WORDS)
  for (let i = head.length - 1; i >= 7; i--) {
    if (head[i]!.endsWith(',')) return head.slice(0, i + 1).join(' ').replace(/,$/, '.')
  }
  return head.join(' ').replace(/[,;:]$/, '') + '…'
}

// Address everyone by a real first name; never a generic greeting.
// 1. the name from their Google/Apple sign-in; 2. a profile name they typed themselves;
// never the auto-assigned alias ("Quiet Welsh Bear") or the "Shutap user" placeholder.
// The first word is used, unless it is 1-2 letters ("im expensive"), then the whole name exactly as typed.
function firstNameFor(metaName: string | null | undefined, alias: any): string | null {
  const auto = alias && [alias.emotion, alias.nation, alias.creature].filter(Boolean).join(' ').toLowerCase()
  const fromAlias = (alias?.display_name ?? '').trim()
  const aliasOk = fromAlias && fromAlias.toLowerCase() !== auto && fromAlias.toLowerCase() !== 'shutap user'
  const name = (metaName ?? '').trim() || (aliasOk ? fromAlias : '')
  if (!name) return null
  const first = name.split(/\s+/)[0]!
  if (first.length <= 2) return name // as they typed it
  return first.charAt(0).toUpperCase() + first.slice(1)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type IdeaRow = { topic: string | null; hook: string; bit: string; tag: string | null; why_now: string | null }
function ideaVars(idea: IdeaRow, day: string) {
  return {
    day_label: dayLabel(day),
    topic: esc(idea.topic ?? ''),
    hook: esc(idea.hook),
    hook_plain: idea.hook,
    bit_html: esc(idea.bit).replace(/\r?\n/g, '<br>'),
    bit_plain: idea.bit,
    tag: esc(idea.tag ?? ''),
    tag_plain: idea.tag ?? '',
    why_now: esc(shortWhy(idea.why_now ?? '')),
    cta_url: CTA,
    deep_link: CTA,
  }
}

// Resend's own record for one email: who it went to, from, subject, last_event.
async function resendStatus(id: string): Promise<unknown> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { error: 'RESEND_API_KEY missing' }
  try {
    const r = await fetch(`https://api.resend.com/emails/${encodeURIComponent(id)}`, {
      headers: { authorization: `Bearer ${key}` },
    })
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
    if (!r.ok) return { error: `resend ${r.status}`, body: j }
    const { to, from, subject, created_at, last_event } = j
    return { id, to, from, subject, created_at, last_event }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'fetch failed' }
  }
}

export const Route = createFileRoute('/api/public/hooks/daily-idea-emails')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get('x-cron-secret') ?? ''
        const expected = process.env.CRON_SECRET ?? ''
        if (!expected || provided.length !== expected.length || provided !== expected) {
          return new Response('Unauthorized', { status: 401 })
        }

        const body = (await request.json().catch(() => ({}))) as { only?: unknown; status_of?: unknown; internal_to?: unknown }
        const only = typeof body.only === 'string' ? body.only.trim().toLowerCase() : ''
        const internalTo = typeof body.internal_to === 'string' ? body.internal_to.trim().toLowerCase() : ''

        if (typeof body.status_of === 'string' && /^[\w-]{8,80}$/.test(body.status_of)) {
          return Response.json({ ok: true, resend: await resendStatus(body.status_of) })
        }

        const { pacificDay } = await import('@/lib/pacific-day')
        const day = pacificDay()
        if (!only && !internalTo) {
          const hour = pacificHour()
          if (hour < SEND_FROM_PACIFIC_HOUR) return Response.json({ ok: true, skipped: 'before 8am Pacific', day })
          if (hour >= SEND_UNTIL_PACIFIC_HOUR) return Response.json({ ok: true, skipped: 'after 2pm Pacific', day })
          if (day < FIRST_DAY) return Response.json({ ok: true, skipped: `starts ${FIRST_DAY}`, day })
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        // daily_idea_emails is not in the generated Supabase types.
        const db = supabaseAdmin as any
        const { sendEmail } = await import('@/lib/email/send.server')
        const { ensureEmailPrefsToken } = await import('@/lib/email/prefs.server')
        const { data: idea, error: ideaErr } = await db
          .from('daily_ideas')
          .select('day, topic, hook, bit, tag, why_now')
          .eq('day', day)
          .maybeSingle()
        if (ideaErr) return Response.json({ error: ideaErr.message }, { status: 500 })
        if (!idea?.bit || !idea?.hook) return Response.json({ ok: true, skipped: 'no idea for today yet', day })

        if (internalTo) {
          if (!/^[a-z0-9._+-]+@shutap\.com$/.test(internalTo)) {
            return Response.json({ error: 'internal_to must be a @shutap.com address' }, { status: 400 })
          }
          const res = await sendEmail('hello', 'daily_idea', { ...ideaVars(idea, day), first_name: 'Candy', first_name_plain: 'Candy' }, internalTo)
          return Response.json({ ok: true, day, internal_test: { to: internalTo, ...res } })
        }

        // Everyone already emailed today.
        const { data: done } = await db.from('daily_idea_emails').select('user_id').eq('day', day)
        const already = new Set((done ?? []).map((r: { user_id: string }) => r.user_id))

        // All real, confirmed accounts with an email (no guest sessions).
        const users: { id: string; email: string; metaName: string | null }[] = []
        for (let page = 1; page <= 50; page++) {
          const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
          if (error) return Response.json({ error: error.message }, { status: 500 })
          for (const u of data.users) {
            if (!u.email || u.is_anonymous || !u.email_confirmed_at) continue
            if (only ? u.email.toLowerCase() !== only : SKIP_EMAIL.test(u.email)) continue
            const md = (u.user_metadata ?? {}) as { full_name?: string; name?: string }
            if (!already.has(u.id)) users.push({ id: u.id, email: u.email, metaName: md.full_name ?? md.name ?? null })
          }
          if (data.users.length < 1000) break
        }

        const batch = users.slice(0, MAX_PER_RUN)
        const { data: aliases } = await supabaseAdmin
          .from('aliases')
          .select('user_id, display_name, emotion, nation, creature, email_suppressed')
          .in('user_id', batch.map((u) => u.id))
        const aliasOf = new Map((aliases ?? []).map((a: any) => [a.user_id, a]))

        const vars = ideaVars(idea, day)

        let sent = 0, suppressed = 0, failed = 0, noName = 0, noUnsubscribe = 0
        const tests: { to: string; id: string | null; ok: boolean; suppressed: boolean; reason: string | null; resend?: unknown }[] = []
        for (const u of batch) {
          const a: any = aliasOf.get(u.id)
          if (a?.email_suppressed) { suppressed++; continue }
          const firstName = firstNameFor(u.metaName, a)
          if (!firstName) { noName++; continue } // no real name: skip rather than send a generic greeting
          // A daily email always carries a working unsubscribe link; without a prefs record there is none.
          const prefs = await ensureEmailPrefsToken(u.email).catch(() => null)
          if (!prefs) { noUnsubscribe++; continue }
          // Claim first, so a retry or an overlapping run never double-sends.
          const { error: claimErr } = await db
            .from('daily_idea_emails')
            .insert({ user_id: u.id, day } as never)
          if (claimErr) continue // already claimed (unique user_id + day)

          const res = await sendEmail('hello', 'daily_idea', { ...vars, first_name: esc(firstName), first_name_plain: firstName }, u.email)
          if (only) tests.push({ to: u.email, id: res.id ?? null, ok: res.ok, suppressed: !!res.suppressed, reason: res.reason ?? res.error ?? null })
          if (res.ok && res.suppressed) suppressed++
          else if (res.ok) sent++
          else {
            failed++
            // Release the claim so the next hourly run retries this user.
            await db.from('daily_idea_emails').delete().eq('user_id', u.id).eq('day', day)
          }
          await sleep(RESEND_GAP_MS)
        }

        if (only && tests[0]?.id) {
          await sleep(4000)
          tests[0].resend = await resendStatus(tests[0].id)
        }
        return Response.json({
          ok: true, day, sent, suppressed, failed, noName, noUnsubscribe,
          remaining: Math.max(0, users.length - batch.length),
          ...(only ? { tests } : {}),
        })
      },
    },
  },
})
