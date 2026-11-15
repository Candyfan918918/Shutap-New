// /admin/guests (Nov 14 2026): people before they sign up — what they do,
// where they leave, what turns them into accounts — then the paywall and
// payment problems. Pure: the server function loads rows, this counts them,
// so it can be tested on its own. Every number is unique visits (a browser
// session) or unique people, from real rows only.

export type GuestEventRow = {
  name: string
  user_id: string | null
  session_id: string | null
  ts: string
  properties: Record<string, unknown> | null
}

export type GuestVisitRow = {
  session_id: string | null
  is_bot: boolean | null
  utm_source: string | null
  referrer: string | null
}

export type GuestsInput = {
  events: GuestEventRow[]
  visits: GuestVisitRow[]
  /** real accounts: signed up, not anonymous, with an email */
  accountIds: Set<string>
  /** user ids whose sessions are dropped entirely (Candy, other admins) */
  adminIds: Set<string>
  emails: Map<string, string>
  subs: { status: string; environment: string }[]
  /** kits and toasts made in the window (Nov 14 2026, section 7) */
  kits?: { user_id: string; created_at: string; paid: boolean }[]
  toasts?: { user_id: string; created_at: string; paid: boolean }[]
}

export type LineStep = { key: string; label: string; n: number }

export type Row = { label: string; n: number }

export type GuestsReport = {
  funnel: { key: string; label: string; n: number }[]
  bounced: number
  landing: { path: string; visits: number; engaged: number; signed_up: number }[]
  last_step: Row[]
  actions: { name: string; label: string; guests: number; signed_up_after: number }[]
  views: Row[]
  signup: {
    total: number
    drivers: { key: string; label: string; signups: number; prompted: number | null; rate_pct: number | null }[]
    sources: Row[]
    signin_return_failed: number
    abandoned_signin: number
  }
  paywall: {
    rows: { where: string; label: string; seen: number; chose: number; checkout: number; paid: number; closed: number }[]
    total: { seen: number; chose: number; checkout: number; paid: number; closed: number }
    to_pricing: number
  }
  payments: {
    abandoned_checkout: { who: string; plan: string | null; at: string }[]
    problems: { kind: string; label: string; n: number; list: { who: string; amount: number | null; reason: string | null; at: string }[] }[]
    active_plans: number
    canceled_plans: number
  }
  /** section 7: the realtor kit and toast funnels, guests and accounts together */
  lines: { realtors: LineStep[]; toasts: LineStep[] }
}

/** Events that fire on their own (a view, an impression) — not something the
 *  person chose to do. */
export const PASSIVE = new Set([
  'page_view', 'toast_form_viewed', 'battle_round_served', 'battle_viewed', 'poll_viewed',
  'signin_prompt_seen', 'signin_sheet_opened', 'paywall_seen', 'bits_lead_tile', 'result_seen_guest',
  'limit_shown', 'bit_written', 'bit_write_failed', 'story_split_done', 'story_split_failed',
  'sign_in_completed', 'sign_up_completed', 'sign_in_succeeded', 'sign_in_return_failed', 'sign_in',
  'battle_collect_prompt', 'video_gated', 'lock_needs_signin', 'funnier_needs_signin',
])

const LABELS: Record<string, string> = {
  line_typed: 'typed in the bit box',
  story_split: 'pressed “make it a bit” on a story',
  lined_make: 'pressed make',
  bit_submitted: 'pressed make',
  line_tap_empty: 'tapped an empty line',
  line_locked: 'locked a line',
  line_touched: 'tapped “funnier” on a line',
  lined_finish: 'finished all five lines',
  lined_keep: 'kept a line',
  box_submit: 'submitted the box',
  paste_box_submit: 'pasted a story',
  story_back: 'went back to the story',
  sample_tile_open: 'opened a realtor sample',
  sample_prompter_open: 'opened the realtor prompter',
  demo_tile_open: 'opened a bit demo',
  demo_remix: 'remixed the demo',
  home_cta: 'tapped a home button',
  home_product_tab: 'tapped a product tab',
  seo_cta_clicked: 'clicked a guide’s button',
  battle_pick: 'picked in the joke battle',
  battle_skip: 'skipped a battle round',
  battle_rank_up: 'ranked up in the battle',
  battle_learn_clicked: 'opened battle “learn”',
  poll_option_tapped: 'tapped a poll option',
  poll_voted: 'voted in the poll',
  poll_signin_dismissed: 'closed the poll sign-in',
  video_tapped: 'tapped a video',
  download_tapped: 'tapped download',
  toast_mid_box: 'used the toast box',
  sign_in_started: 'started sign-up',
  sign_in_code_sent: 'asked for an email code',
  signin_dismissed: 'closed the sign-up sheet',
  // views
  toast_form_viewed: 'toast form shown',
  battle_round_served: 'battle round shown',
  battle_viewed: 'battle shown',
  poll_viewed: 'poll shown',
  bits_lead_tile: 'bits page lead tile shown',
  video_gated: 'gated video shown',
}
export const label = (name: string) => LABELS[name] ?? name.replace(/_/g, ' ')

/** Where a guest was asked to sign up, from signin_prompt_seen.where or
 *  signin_sheet_opened.from. */
const PROMPT_LABELS: Record<string, string> = {
  bit_2: 'second bit',
  lock: 'locking a line',
  funnier: '“funnier” after the free tap',
  rewrite: 'rewrite',
  download: 'download',
  save: 'save',
  video: 'video',
  watch: 'watch',
  post: 'post',
  standup: 'stand-up',
  sketch: 'sketch',
  skit: 'skit',
  poll: 'poll',
  battle: 'joke battle',
}
const promptLabel = (w: string) => PROMPT_LABELS[w] ?? w.replace(/_/g, ' ')

const PAYWALL_LABELS: Record<string, string> = {
  bit_3: 'out of free bits',
  rewrite: 'asked for a rewrite, swap or mix',
  download: 'download (watermark)',
  download_limit: 'Basic download limit',
  download_count: 'free download limit',
  daily_limit: 'Basic at its daily limit',
}

const PROBLEM_LABELS: Record<string, string> = {
  card_declined: 'card declined',
  renewal_failed: 'renewal failed',
  checkout_expired: 'checkout expired unpaid',
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null)
const str = (v: unknown) => (typeof v === 'string' && v ? v : null)

export function sourceOf(v: { utm_source: string | null; referrer: string | null } | undefined): string {
  const raw = (v?.utm_source || '').toLowerCase().trim()
  const ref = (() => {
    try { return v?.referrer ? new URL(v.referrer).hostname.replace(/^www\./, '') : '' } catch { return '' }
  })()
  const s = raw || ref
  if (!s || s === 'shutap.com') return 'no source (direct, typed in)'
  if (s.includes('chatgpt') || s.includes('openai')) return 'ChatGPT'
  if (s.includes('google')) return 'Google'
  if (s.includes('tiktok')) return 'TikTok'
  if (s.includes('instagram')) return 'Instagram'
  if (s.includes('youtube')) return 'YouTube'
  if (s.includes('facebook') || s === 'fb') return 'Facebook'
  if (s.startsWith('hello_') || s === 'email' || s.includes('mail')) return 'Shutap email'
  return s
}

const bump = (m: Map<string, number>, k: string, by = 1) => m.set(k, (m.get(k) ?? 0) + by)
const top = (m: Map<string, number>, n: number): Row[] =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, n]) => ({ label, n }))

export function aggregateGuests(input: GuestsInput): GuestsReport {
  const { accountIds, adminIds } = input
  const ms = (s: string) => new Date(s).getTime()
  const bots = new Set(input.visits.filter((v) => v.is_bot && v.session_id).map((v) => v.session_id!))
  const visitBySession = new Map<string, GuestVisitRow>()
  for (const v of input.visits) if (v.session_id && !visitBySession.has(v.session_id)) visitBySession.set(v.session_id, v)

  const events = [...input.events].sort((a, b) => ms(a.ts) - ms(b.ts))

  // Sessions dropped: bots, smoke tests, and any session an admin touched
  // (Candy's own browsers, signed in or not).
  const dropped = new Set<string>(bots)
  for (const e of events) {
    if (!e.session_id) continue
    if ((e.user_id && adminIds.has(e.user_id)) || e.properties?.smoke) dropped.add(e.session_id)
  }

  // ---- guests: per session, the events from before they were an account ----
  type S = { events: GuestEventRow[]; signedUp: boolean; signupAt: number | null }
  const sessions = new Map<string, S>()
  for (const e of events) {
    if (!e.session_id || dropped.has(e.session_id)) continue
    let s = sessions.get(e.session_id)
    if (!s) sessions.set(e.session_id, (s = { events: [], signedUp: false, signupAt: null }))
    if (e.name === 'sign_up_completed') {
      if (!s.signedUp) { s.signedUp = true; s.signupAt = ms(e.ts) }
      continue
    }
    const asGuest = !e.user_id || !accountIds.has(e.user_id)
    if (asGuest && (s.signupAt === null || ms(e.ts) <= s.signupAt)) s.events.push(e)
  }
  const guests = [...sessions.entries()].filter(([, s]) => s.events.length > 0)
  const has = (s: S, ...names: string[]) => s.events.some((e) => names.includes(e.name))
  const acted = (s: S) => s.events.some((e) => !PASSIVE.has(e.name))
  const guestTier = (e: GuestEventRow) => !e.properties?.tier || e.properties.tier === 'guest'

  const count = (f: (s: S) => boolean) => guests.filter(([, s]) => f(s)).length
  const funnel = [
    { key: 'landed', label: 'landed', n: guests.length },
    { key: 'acted', label: 'did something (a tap, not just a view)', n: count(acted) },
    { key: 'typed', label: 'typed in the bit box', n: count((s) => has(s, 'line_typed', 'story_split', 'paste_box_submit')) },
    { key: 'make', label: 'pressed make', n: count((s) => s.events.some((e) => (e.name === 'lined_make' || e.name === 'bit_submitted') && guestTier(e))) },
    { key: 'bit', label: 'got a bit back', n: count((s) => s.events.some((e) => e.name === 'bit_written' && guestTier(e))) },
    { key: 'asked', label: 'asked to sign up', n: count((s) => has(s, 'signin_prompt_seen', 'signin_sheet_opened')) },
    { key: 'started', label: 'started sign-up', n: count((s) => has(s, 'sign_in_started')) },
    { key: 'signed_up', label: 'signed up', n: count((s) => s.signedUp) },
  ]

  const pageOf = (e: GuestEventRow) => str(e.properties?.path)
  const bounced = count((s) => !acted(s) && s.events.filter((e) => e.name === 'page_view').length <= 1)

  // landing pages
  const land = new Map<string, { visits: number; engaged: number; signed_up: number }>()
  for (const [, s] of guests) {
    const first = s.events.find((e) => e.name === 'page_view')
    const path = (first && pageOf(first)) || '(no page view)'
    const r = land.get(path) ?? { visits: 0, engaged: 0, signed_up: 0 }
    r.visits++
    if (acted(s)) r.engaged++
    if (s.signedUp) r.signed_up++
    land.set(path, r)
  }
  const landing = [...land.entries()].map(([path, r]) => ({ path, ...r })).sort((a, b) => b.visits - a.visits).slice(0, 12)

  // the last thing before leaving, for guests who didn't sign up
  const last = new Map<string, number>()
  let abandonedSignin = 0
  for (const [, s] of guests) {
    if (s.signedUp) continue
    const e = s.events[s.events.length - 1]
    if (e.name === 'sign_in_started' || e.name === 'sign_in_code_sent') abandonedSignin++
    const k = e.name === 'page_view' ? `left on ${pageOf(e) ?? '?'}` : e.name === 'sign_in_started' ? 'started sign-up, never came back' : `${label(e.name)}, then left`
    bump(last, k)
  }

  // actions: unique guest sessions per action; views listed apart
  const act = new Map<string, { guests: number; signed_up_after: number }>()
  const view = new Map<string, number>()
  for (const [, s] of guests) {
    const seen = new Set<string>()
    for (const e of s.events) {
      if (seen.has(e.name)) continue
      seen.add(e.name)
      if (e.name === 'page_view') continue
      if (PASSIVE.has(e.name)) { bump(view, label(e.name)); continue }
      const r = act.get(e.name) ?? { guests: 0, signed_up_after: 0 }
      r.guests++
      if (s.signedUp) r.signed_up_after++
      act.set(e.name, r)
    }
  }
  const actions = [...act.entries()].map(([name, r]) => ({ name, label: label(name), ...r })).sort((a, b) => b.guests - a.guests).slice(0, 15)

  // ---- sign-ups: the last prompt before signing up, and the source ----
  const promptedBy = new Map<string, number>() // sessions shown a prompt, by where
  const driverSignups = new Map<string, number>()
  const sources = new Map<string, number>()
  let signups = 0
  for (const [sid, s] of sessions) {
    const prompts = s.events.filter((e) => e.name === 'signin_prompt_seen' || e.name === 'signin_sheet_opened')
    const wheres = new Set(prompts.map((e) => str(e.properties?.where) ?? str(e.properties?.from) ?? 'other'))
    for (const w of wheres) bump(promptedBy, w)
    if (!s.signedUp) continue
    signups++
    const lastPrompt = prompts[prompts.length - 1]
    bump(driverSignups, lastPrompt ? (str(lastPrompt.properties?.where) ?? str(lastPrompt.properties?.from) ?? 'other') : '(none)')
    bump(sources, sourceOf(visitBySession.get(sid)))
  }
  const driverKeys = new Set([...driverSignups.keys(), ...promptedBy.keys()])
  const drivers = [...driverKeys].map((key) => {
    const n = driverSignups.get(key) ?? 0
    const prompted = key === '(none)' ? null : promptedBy.get(key) ?? 0
    return { key, label: key === '(none)' ? 'sign-up button, no prompt' : promptLabel(key), signups: n, prompted, rate_pct: prompted ? pct(n, prompted) : null }
  }).sort((a, b) => b.signups - a.signups || (b.prompted ?? 0) - (a.prompted ?? 0))
  const returnFailed = new Set(events.filter((e) => e.name === 'sign_in_return_failed' && e.session_id && !dropped.has(e.session_id)).map((e) => e.session_id!)).size

  // ---- paywall: signed-in people (accounts), unique per step ----
  const person = (e: GuestEventRow) => (e.user_id && accountIds.has(e.user_id) && !adminIds.has(e.user_id) ? e.user_id : null)
  type P = { seen: Set<string>; chose: Set<string>; checkout: Set<string>; paid: Set<string>; closed: Set<string> }
  const pw = new Map<string, P>()
  const getP = (w: string) => { let p = pw.get(w); if (!p) pw.set(w, (p = { seen: new Set(), chose: new Set(), checkout: new Set(), paid: new Set(), closed: new Set() })); return p }
  const lastWhere = new Map<string, string>() // person -> where of their last paywall
  const firstPaywallAt = new Map<string, number>()
  const checkoutBy = new Map<string, { plan: string | null; at: string }>()
  const paidBy = new Set<string>()
  const pricingAfter = new Set<string>()
  for (const e of events) {
    const who = person(e)
    if (!who) continue
    const where = str(e.properties?.where)
    switch (e.name) {
      case 'paywall_seen':
        getP(where ?? 'other').seen.add(who)
        lastWhere.set(who, where ?? 'other')
        if (!firstPaywallAt.has(who)) firstPaywallAt.set(who, ms(e.ts))
        break
      case 'paywall_closed':
        getP(where ?? lastWhere.get(who) ?? 'other').closed.add(who)
        break
      case 'plan_chosen':
        getP(where ?? lastWhere.get(who) ?? 'other').chose.add(who)
        break
      case 'checkout_started':
        if (where || lastWhere.has(who)) getP(where ?? lastWhere.get(who)!).checkout.add(who)
        checkoutBy.set(who, { plan: str(e.properties?.plan), at: e.ts })
        break
      case 'paid':
        paidBy.add(who)
        if (lastWhere.has(who)) getP(lastWhere.get(who)!).paid.add(who)
        break
      case 'page_view':
        if (pageOf(e) === '/pricing' && firstPaywallAt.has(who) && ms(e.ts) > firstPaywallAt.get(who)!) pricingAfter.add(who)
        break
    }
  }
  const pwRows = [...pw.entries()].map(([where, p]) => ({
    where, label: PAYWALL_LABELS[where] ?? where.replace(/_/g, ' '),
    seen: p.seen.size, chose: p.chose.size, checkout: p.checkout.size, paid: p.paid.size, closed: p.closed.size,
  })).sort((a, b) => b.seen - a.seen)
  const uni = (k: keyof P) => new Set([...pw.values()].flatMap((p) => [...p[k]])).size

  // ---- payments ----
  const whoLabel = (uid: string | null, email: unknown) => (uid && input.emails.get(uid)) || str(email) || uid || 'unknown'
  const abandoned = [...checkoutBy.entries()].filter(([who]) => !paidBy.has(who)).map(([who, c]) => ({ who: whoLabel(who, null), plan: c.plan, at: c.at }))
  const probs = new Map<string, { who: string; amount: number | null; reason: string | null; at: string }[]>()
  for (const e of events) {
    if (e.name !== 'payment_problem' || e.properties?.env !== 'live') continue
    if (e.user_id && adminIds.has(e.user_id)) continue
    const kind = str(e.properties?.kind) ?? 'other'
    const list = probs.get(kind) ?? []
    list.push({ who: whoLabel(e.user_id, e.properties?.email), amount: typeof e.properties?.amount === 'number' ? e.properties.amount : null, reason: str(e.properties?.reason), at: e.ts })
    probs.set(kind, list)
  }
  const problems = ['card_declined', 'renewal_failed', 'checkout_expired', ...[...probs.keys()].filter((k) => !PROBLEM_LABELS[k])].map((kind) => {
    const list = (probs.get(kind) ?? []).reverse()
    return { kind, label: PROBLEM_LABELS[kind] ?? kind, n: list.length, list: list.slice(0, 20) }
  })
  const live = input.subs.filter((s) => s.environment === 'live')

  // ---- section 7: realtors and toasts. One person = an account when signed
  // in, else a guest's browser session. Admins and dropped sessions are out.
  const lineEvents = events.filter((e) => !(e.session_id && dropped.has(e.session_id)) && !(e.user_id && adminIds.has(e.user_id)))
  // a session that signed in or up counts as that account all along
  const sessionAccount = new Map<string, string>()
  for (const e of lineEvents) if (e.session_id && e.user_id && accountIds.has(e.user_id) && !sessionAccount.has(e.session_id)) sessionAccount.set(e.session_id, e.user_id)
  const personKey = (e: GuestEventRow) =>
    e.user_id && accountIds.has(e.user_id) ? e.user_id
      : e.session_id ? sessionAccount.get(e.session_id) ?? `s:${e.session_id}`
        : e.user_id ? `u:${e.user_id}` : null
  const people = (f: (e: GuestEventRow) => boolean) => {
    const set = new Set<string>()
    for (const e of lineEvents) if (f(e)) { const k = personKey(e); if (k) set.add(k) }
    return set.size
  }
  const onPath = (e: GuestEventRow, root: string) => e.name === 'page_view' && (pageOf(e) === root || (pageOf(e) ?? '').startsWith(root + '/'))
  const ofProduct = (e: GuestEventRow, product: string) => e.properties?.product === product
  const LINE_PASSIVE = new Set([...PASSIVE, 'kit_prepaid_seen', 'kit_bought_seen', 'kit_limit_shown', 'toast_prepaid_seen', 'toast_limit_shown', 'toast_unmarked_seen', 'toast_guard_shown', 'listing_read', 'listing_read_failed', 'toast_written', 'kit_written', 'toast_midnight_synced'])
  const signedUpAfter = (root: string) => {
    let n = 0
    for (const [, s] of sessions) {
      if (!s.signedUp) continue
      if (s.events.some((e) => onPath(e, root))) n++
    }
    return n
  }
  const owners = (rows: { user_id: string; paid: boolean }[] | undefined, paidOnly = false) =>
    new Set((rows ?? []).filter((r) => !adminIds.has(r.user_id) && (!paidOnly || r.paid)).map((r) => r.user_id)).size
  const lines = {
    realtors: [
      { key: 'visited', label: 'opened a /realtors page', n: people((e) => onPath(e, '/realtors')) },
      { key: 'acted', label: 'did something (a tap, not just a view)', n: people((e) => ofProduct(e, 'realtors') && !LINE_PASSIVE.has(e.name)) },
      { key: 'pasted', label: 'pasted a listing', n: people((e) => e.name === 'paste_box_submit' || e.name === 'listing_read_started') },
      { key: 'read', label: 'listing read', n: people((e) => e.name === 'listing_read') },
      { key: 'asked', label: 'asked to sign up', n: people((e) => e.name === 'signin_prompt_seen' && ofProduct(e, 'realtors')) },
      { key: 'signed_up', label: 'signed up (visit included /realtors)', n: signedUpAfter('/realtors') },
      { key: 'made', label: 'made a kit', n: owners(input.kits) },
      { key: 'buy', label: 'tapped buy', n: people((e) => e.name === 'kit_buy_clicked' || e.name === 'kit_prebuy_opened') },
      { key: 'paid', label: 'paid for a kit', n: owners(input.kits, true) },
      { key: 'download', label: 'downloaded a kit', n: people((e) => e.name === 'kit_download') },
    ],
    toasts: [
      { key: 'visited', label: 'opened a /toasts page', n: people((e) => onPath(e, '/toasts')) },
      { key: 'form', label: 'toast form shown', n: people((e) => e.name === 'toast_form_viewed') },
      { key: 'acted', label: 'did something (a tap, not just a view)', n: people((e) => ofProduct(e, 'toasts') && !LINE_PASSIVE.has(e.name)) },
      { key: 'started', label: 'started writing a toast', n: people((e) => e.name === 'toast_write_started') },
      { key: 'asked', label: 'asked to sign up', n: people((e) => (e.name === 'signin_prompt_seen' && ofProduct(e, 'toasts')) || e.name === 'toast_prompter_signin') },
      { key: 'signed_up', label: 'signed up (visit included /toasts)', n: signedUpAfter('/toasts') },
      { key: 'made', label: 'got a toast written', n: owners(input.toasts) },
      { key: 'buy', label: 'tapped buy', n: people((e) => e.name === 'toast_prebuy_opened' || e.name === 'toast_change_checkout_opened' || e.name === 'toast_unmark_opened') },
      { key: 'paid', label: 'paid for a toast', n: owners(input.toasts, true) },
      { key: 'download', label: 'downloaded a toast', n: people((e) => e.name === 'toast_downloaded') },
    ],
  }

  return {
    funnel,
    bounced,
    landing,
    last_step: top(last, 10),
    actions,
    views: top(view, 8),
    signup: {
      total: signups,
      drivers,
      sources: top(sources, 8),
      signin_return_failed: returnFailed,
      abandoned_signin: abandonedSignin,
    },
    paywall: {
      rows: pwRows,
      total: { seen: uni('seen'), chose: uni('chose'), checkout: uni('checkout'), paid: uni('paid'), closed: uni('closed') },
      to_pricing: pricingAfter.size,
    },
    payments: {
      abandoned_checkout: abandoned,
      problems,
      active_plans: live.filter((s) => ['active', 'trialing', 'past_due'].includes(s.status)).length,
      canceled_plans: live.filter((s) => s.status === 'canceled').length,
    },
    lines,
  }
}
