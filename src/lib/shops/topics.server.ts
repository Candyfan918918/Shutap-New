// Shutap for small business (Nov 21 2026, Candy: "also do hot news"): what
// people are talking about today, for the "today" skit and the idea chips.
// Server only. It reads the site's own daily list (daily_ideas.signals, the
// same one behind "what to post today" on the homepage); the skit writer
// never recalls news by itself. Fail-soft: no row, an old row or a read
// error is an empty list, and the "today" skit falls back to the calendar.

/** A daily list older than this many days is not "today". */
const FRESH_DAYS = 2
export const MAX_TOPICS = 6

type SignalTopic = { topic?: unknown; note?: unknown; direction?: unknown }

/** Pure: the topic lines out of a daily_ideas row. A cooling topic is old
 *  news and is left out; the day's own chosen topic goes first. */
export function topicsFromRow(row: { day?: string; topic?: unknown; signals?: { topics?: SignalTopic[] } | null } | null, today: string): string[] {
  if (!row?.day) return []
  const age = Math.round((Date.parse(today) - Date.parse(row.day)) / 86_400_000)
  if (!(age >= 0 && age <= FRESH_DAYS)) return []
  const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
  const out: string[] = []
  const seen = new Set<string>()
  const add = (topic: string, note = '') => {
    const key = topic.toLowerCase()
    if (!topic || seen.has(key) || out.length >= MAX_TOPICS) return
    seen.add(key)
    out.push(note ? `${topic} (${note})`.slice(0, 120) : topic)
  }
  add(clean(row.topic, 80))
  for (const t of Array.isArray(row.signals?.topics) ? row.signals!.topics! : []) {
    if (t?.direction === 'cooling') continue
    add(clean(t?.topic, 80), clean(t?.note, 60))
  }
  return out
}

export async function todaysTopics(admin: any, today: string): Promise<string[]> {
  try {
    const { data, error } = await admin.from('daily_ideas').select('day, topic, signals').lte('day', today).order('day', { ascending: false }).limit(1).maybeSingle()
    if (error || !data) return []
    return topicsFromRow(data, today)
  } catch {
    return []
  }
}
