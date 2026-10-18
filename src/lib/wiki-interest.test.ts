import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarizeInterest, wikiWindow, readWikiInterest } from './wiki-interest.server'

const items = Array.from({ length: 28 }, (_, i) => ({
  timestamp: `202609${String(i + 1).padStart(2, '0')}00`, views: i < 21 ? 100 : 200,
}))
test('the window is 28 days ending yesterday UTC', () => {
  assert.deepEqual(wikiWindow(new Date('2026-10-18T02:25:00Z')), { start: '20260920', end: '20261017' })
})
test('interest compares the last seven days to the previous seven', () => {
  const result = summarizeInterest(items)
  assert.equal(result?.thisWeek, 1400)
  assert.equal(result?.lastWeek, 700)
  assert.equal(result?.change, 100)
  assert.equal(result?.series.length, 14)
  assert.equal(result?.series[0].date, '2026-09-15')
  assert.equal(result?.peakDay, '2026-09-22')
})
test('zero previous-week views yield no percentage', () => {
  assert.equal(summarizeInterest(items.map((item) => ({ ...item, views: 0 })))?.change, null)
})
test('incomplete readings are not displayed as real totals', () => {
  assert.equal(summarizeInterest(items.slice(0, 13)), null)
})
test('failed fetch retries one day earlier and the result is cached for an hour', async () => {
  const original = globalThis.fetch
  const urls: string[] = []
  globalThis.fetch = (async (url, init) => {
    urls.push(String(url))
    assert.equal(new Headers(init?.headers).get('User-Agent'), 'Shutap/1.0 (hello@shutap.com)')
    return urls.length === 1 ? new Response('', { status: 404 }) : Response.json({ items })
  }) as typeof fetch
  try {
    const now = new Date('2026-09-30T02:25:00Z')
    assert.equal((await readWikiInterest('Test_article', now))?.thisWeek, 1400)
    await readWikiInterest('Test_article', now)
    assert.equal(urls.length, 2)
    assert.match(urls[0], /20260902\/20260929$/)
    assert.match(urls[1], /20260901\/20260928$/)
  } finally { globalThis.fetch = original }
})