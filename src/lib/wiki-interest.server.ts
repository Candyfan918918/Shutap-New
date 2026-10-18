export type Interest = { series: { date: string; views: number }[]; thisWeek: number; lastWeek: number; change: number | null }
const cache = new Map<string, { expires: number; value: Promise<Interest | null> }>()

export function wikiWindow(now = new Date(), shift = 0) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1 - shift))
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 27)
  const stamp = (d: Date) => d.toISOString().slice(0, 10).replaceAll('-', '')
  return { start: stamp(start), end: stamp(end) }
}

export function summarizeInterest(items: { timestamp: string; views: number }[]): Interest | null {
  const rows = items.filter((i) => Number.isFinite(i.views) && i.views >= 0 && /^\d{8}/.test(i.timestamp)).sort((a, b) => a.timestamp.localeCompare(b.timestamp)).slice(-14)
  if (rows.length !== 14) return null
  const series = rows.map((i) => ({ date: `${i.timestamp.slice(0, 4)}-${i.timestamp.slice(4, 6)}-${i.timestamp.slice(6, 8)}`, views: i.views }))
  const lastWeek = series.slice(0, 7).reduce((n, i) => n + i.views, 0)
  const thisWeek = series.slice(7).reduce((n, i) => n + i.views, 0)
  return { series, thisWeek, lastWeek, change: lastWeek > 0 ? Math.round((thisWeek - lastWeek) / lastWeek * 100) : null }
}

export function readWikiInterest(wiki: string, now = new Date()): Promise<Interest | null> {
  const key = `${wiki}:${wikiWindow(now).end}`
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) return cached.value
  const value = (async () => {
    for (const shift of [0, 1]) {
      const { start, end } = wikiWindow(now, shift)
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 4000)
      try {
        const response = await fetch(`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(wiki)}/daily/${start}/${end}`, { headers: { 'User-Agent': 'Shutap/1.0 (hello@shutap.com)' }, signal: controller.signal })
        if (!response.ok) continue
        const data = await response.json() as { items?: { timestamp: string; views: number }[] }
        const interest = summarizeInterest(data.items ?? [])
        if (interest) return interest
      } catch { /* public interest is optional */ }
      finally { clearTimeout(timer) }
    }
    return null
  })()
  if (cache.size > 256) cache.clear()
  cache.set(key, { expires: Date.now() + 3600000, value })
  return value
}