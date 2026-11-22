// Shutap for small business: the funnel the admin page shows (Nov 21 2026).
// Pure: counts distinct people at each step from event rows. A person is
// their account when signed in, their browser session otherwise. Admin
// accounts, every browser an admin was ever seen on, and smoke-test events
// are left out before this is called (see admin-shops.functions.ts): the
// numbers count real users only.
export type FunnelEvent = { who: string; name: string; properties: Record<string, unknown> | null }

export const FUNNEL_STEPS: { key: string; label: string; test: (e: FunnelEvent) => boolean }[] = [
  { key: 'opened', label: 'Opened the page', test: (e) => e.name === 'sb_step' || e.name === 'sb_desk_view' },
  { key: 'lookup', label: 'Looked up their business', test: (e) => e.name === 'sb_lookup' || e.name === 'shop_lookup' },
  { key: 'saved', label: 'Saved their business (signed up)', test: (e) => e.name === 'shop_saved' },
  { key: 'skits', label: 'Got three skits', test: (e) => e.name === 'shop_skits_written' },
  { key: 'picked', label: 'Picked a skit', test: (e) => e.name === 'shop_skit_picked' },
  { key: 'camera', label: 'Turned the camera on', test: (e) => e.name === 'sb_camera' && e.properties?.['ok'] === true },
  { key: 'filmed', label: 'Filmed all 3 shots', test: (e) => e.name === 'sb_shot' && Number(e.properties?.['n']) >= 3 },
  { key: 'made', label: 'Made a video', test: (e) => e.name === 'shop_video_made' },
  { key: 'savedVideo', label: 'Saved a video to post', test: (e) => e.name === 'shop_video_saved' },
]

export type FunnelRow = { key: string; label: string; people: number; ofFirst: number | null; ofPrevious: number | null }

export function funnel(events: FunnelEvent[]): FunnelRow[] {
  const sets = FUNNEL_STEPS.map(() => new Set<string>())
  for (const e of events) FUNNEL_STEPS.forEach((s, i) => { if (s.test(e)) sets[i]!.add(e.who) })
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null)
  return FUNNEL_STEPS.map((s, i) => ({ key: s.key, label: s.label, people: sets[i]!.size, ofFirst: i === 0 ? null : pct(sets[i]!.size, sets[0]!.size), ofPrevious: i === 0 ? null : pct(sets[i]!.size, sets[i - 1]!.size) }))
}

/** How many times each kind of thing happened: the problems and the limits. */
export function tally(events: FunnelEvent[], name: string, by: string): { what: string; n: number }[] {
  const m = new Map<string, number>()
  for (const e of events) if (e.name === name) { const k = String(e.properties?.[by] ?? 'unknown'); m.set(k, (m.get(k) ?? 0) + 1) }
  return [...m.entries()].map(([what, n]) => ({ what, n })).sort((a, b) => b.n - a.n)
}
