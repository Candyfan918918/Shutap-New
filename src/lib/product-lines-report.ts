// The realtor-kit and toast sections of the admin daily report. Pure: it takes
// rows already fetched for the day (plus all-time kits and toasts) and counts.
// People are unique per day — an account when signed in, otherwise a guest's
// browser session. Admins and accounts with no email are left out by
// `include`, the same way the rest of the report does.

export const PRODUCT_LINE_EVENTS = [
  'page_view',
  'listing_read_started',
  'listing_read',
  'listing_read_failed',
  'toast_form_viewed',
  'toast_downloaded',
] as const

export type PlEventRow = {
  name: string
  user_id: string | null
  session_id: string | null
  properties: Record<string, unknown> | null
}
export type KitRow = { user_id: string; created_at: string; paid: boolean }
export type KitDownloadRow = { user_id: string; created_at: string }
export type ToastRow = { user_id: string; created_at: string; paid: boolean; locked_at: string | null; occasion: string | null }

export interface RealtorsDay {
  /** people who opened a /realtors page */
  visited: number
  /** people who pasted a listing (or listing text) */
  pasted: number
  /** of those, the listing was read */
  read_ok: number
  /** of those, reading the listing failed */
  read_failed: number
  /** kits made that day */
  kits: number
  /** people who made a kit that day */
  makers: number
  /** kits bought one at a time ($12.99) that day */
  paid: number
  /** kit downloads and copies that day */
  downloads: number
  total_kits: number
  total_makers: number
}

export interface ToastsDay {
  /** people who opened a /toasts page */
  visited: number
  /** people who saw the toast form */
  form_opened: number
  /** toasts written that day */
  written: number
  /** people who wrote a toast that day */
  writers: number
  /** toasts locked (finished) that day */
  locked: number
  /** toasts bought one at a time ($12.99) that day */
  paid: number
  /** toast downloads that day (speech, cue cards, keepsake) */
  downloads: number
  total: number
  total_writers: number
  /** occasions of the toasts written that day, most first */
  occasions: Array<[string, number]>
}

export function aggregateProductLines(input: {
  events: PlEventRow[]
  kits: KitRow[]
  kitDownloads: KitDownloadRow[]
  toasts: ToastRow[]
  inDay: (iso: string) => boolean
  include: (userId: string) => boolean
}): { realtors: RealtorsDay; toasts: ToastsDay } {
  const { events, kits, kitDownloads, toasts, inDay, include } = input
  const sets = new Map<string, Set<string>>()
  const add = (bucket: string, who: string) => {
    let s = sets.get(bucket)
    if (!s) sets.set(bucket, (s = new Set()))
    s.add(who)
  }
  const n = (k: string) => sets.get(k)?.size ?? 0

  for (const r of events) {
    if (r.user_id && !include(r.user_id)) continue
    const who = r.user_id ?? (r.session_id ? `s:${r.session_id}` : null)
    if (!who) continue
    const p = r.properties ?? {}
    switch (r.name) {
      case 'page_view': {
        const path = String(p['path'] ?? '')
        if (path === '/realtors' || path.startsWith('/realtors/')) add('realtors:visited', who)
        if (path === '/toasts' || path.startsWith('/toasts/')) add('toasts:visited', who)
        break
      }
      case 'listing_read_started': add('realtors:pasted', who); break
      case 'listing_read': add('realtors:read_ok', who); break
      case 'listing_read_failed': add('realtors:read_failed', who); break
      case 'toast_form_viewed': add('toasts:form', who); break
    }
  }
  const toastDownloads = events.filter((r) => r.name === 'toast_downloaded' && !(r.user_id && !include(r.user_id))).length

  const kitsCounted = kits.filter((k) => include(k.user_id))
  const kitsDay = kitsCounted.filter((k) => inDay(k.created_at))
  const toastsCounted = toasts.filter((t) => include(t.user_id))
  const toastsDay = toastsCounted.filter((t) => inDay(t.created_at))
  const occ = new Map<string, number>()
  for (const t of toastsDay) {
    const k = t.occasion || 'other'
    occ.set(k, (occ.get(k) ?? 0) + 1)
  }

  return {
    realtors: {
      visited: n('realtors:visited'),
      pasted: n('realtors:pasted'),
      read_ok: n('realtors:read_ok'),
      read_failed: n('realtors:read_failed'),
      kits: kitsDay.length,
      makers: new Set(kitsDay.map((k) => k.user_id)).size,
      paid: kitsDay.filter((k) => k.paid).length,
      downloads: kitDownloads.filter((d) => include(d.user_id) && inDay(d.created_at)).length,
      total_kits: kitsCounted.length,
      total_makers: new Set(kitsCounted.map((k) => k.user_id)).size,
    },
    toasts: {
      visited: n('toasts:visited'),
      form_opened: n('toasts:form'),
      written: toastsDay.length,
      writers: new Set(toastsDay.map((t) => t.user_id)).size,
      locked: toastsCounted.filter((t) => t.locked_at && inDay(t.locked_at)).length,
      paid: toastsDay.filter((t) => t.paid).length,
      downloads: toastDownloads,
      total: toastsCounted.length,
      total_writers: new Set(toastsCounted.map((t) => t.user_id)).size,
      occasions: [...occ.entries()].sort((a, b) => b[1] - a[1]),
    },
  }
}
