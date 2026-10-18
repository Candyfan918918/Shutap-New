import type { Interest } from './daily-idea.functions'

const cache = new Map<string, { expires: number; value: Interest | null }>()
const pending = new Map<string, Promise<Interest | null>>()
const DAY = 86_400_000

export function wikiWindow(now = new Date(), shift = 0) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - DAY * (1 + shift))
  const start = new Date(end.getTime() - 27 * DAY)
  const stamp = (date: Date) => date.toISOString().slice(0, 10).replaceAll('-', '')
  return { start: stamp(start), end: stamp(end) }
}

export function summarizeInterest(items: unknown): Interest | null {
  if (!Array.isArray(items)) return null
  const days = items.filter((item) => item && /^\d{10}$/.test(item.timestamp) &&
    typeof item.views === 'number' && Number.isInteger(item.views) && item.views >= 0)
    .map((item) => ({ date: `${item.timestamp.slice(0, 4)}-${item.timestamp.slice(4, 6)}-${item.timestamp.slice(6, 8)}`, views: item.views }))
    .sort((a, b) => a.date.localeCompare(b.date))
  const series = days.slice(-14)
  if (series.length !== 14 || new Set(series.map((d) => d.date)).size !== 14) return null
  if (series.some((day, i) => i > 0 && Date.parse(day.date) - Date.parse(series[i - 1].date) !== DAY)) return null
  const sum = (values: typeof series) => values.reduce((total, day) => total + day.views, 0)
  const thisWeek = sum(series.slice(-7))
  const lastWeek = sum(series.slice(0, 7))
  const peakDay = series.reduce((peak, day) => day.views > peak.views ? day : peak).date
  return { series, thisWeek, lastWeek, change: lastWeek > 0 ? Math.round((thisWeek - lastWeek) / lastWeek * 100) : null, peakDay }
}

async function readWindow(wiki: string, window: ReturnType<typeof wikiWindow>): Promise<Interest | null> {
  const controller = new AbortController()
  const timer = globalThis.setTimeout(() => controller.abort(), 4000)
  try {
    const response = await fetch(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(wiki)}/daily/${window.start}/${window.end}`, {
      headers: { 'User-Agent': 'Shutap/1.0 (hello@shutap.com)' },
      signal: controller.signal,
    })
    if (!response.ok) return null
    const body = await response.json() as { items?: unknown }
    return summarizeInterest(body.items)
  } catch {
    return null
  } finally {
    globalThis.clearTimeout(timer)
  }
}

export async function readWikiInterest(wiki: string, now = new Date()): Promise<Interest | null> {
  const window = wikiWindow(now)
  const key = `${wiki}:${window.end}`
  const previous = cache.get(key)
  if (previous && previous.expires > Date.now()) return previous.value
  const ongoing = pending.get(key)
  if (ongoing) return ongoing
  const read = async () => {
    const value = await readWindow(wiki, window) ?? await readWindow(wiki, wikiWindow(now, 1))
    for (const [entry, cached] of cache) if (cached.expires <= Date.now()) cache.delete(entry)
    cache.set(key, { value, expires: Date.now() + 3_600_000 })
    return value
  }
  const result = read()
  pending.set(key, result)
  try { return await result } finally { pending.delete(key) }
}