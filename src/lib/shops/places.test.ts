import { test } from 'node:test'
import assert from 'node:assert/strict'
import { searchShops, shopDetails } from './places.server'

type Call = { url: string; init: RequestInit }
function fake(status: number, body: unknown, calls: Call[] = []): typeof fetch {
  return (async (url: any, init: any) => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch
}
const PLACE = { id: 'ChIJabcdefghijk123', displayName: { text: 'Little Fern Coffee' }, formattedAddress: '700 Santa Cruz Ave, Menlo Park, CA', primaryTypeDisplayName: { text: 'Coffee shop' } }

test('no key: the lookup says so and never calls Google', async () => {
  const calls: Call[] = []
  assert.deepEqual(await searchShops({ name: 'Little Fern', city: 'Menlo Park', country: 'us' }, { key: '', fetch: fake(200, {}, calls) }), { ok: false, reason: 'no_key' })
  assert.equal(calls.length, 0)
})
test('a name and a city are both needed', async () => {
  assert.deepEqual(await searchShops({ name: 'L', city: 'Menlo Park', country: 'us' }, { key: 'k', fetch: fake(200, {}) }), { ok: false, reason: 'bad_input' })
  assert.deepEqual(await searchShops({ name: 'Little Fern', city: ' ', country: 'us' }, { key: 'k', fetch: fake(200, {}) }), { ok: false, reason: 'bad_input' })
})
test('the list asks only for name, address and kind, in the owner’s country', async () => {
  const calls: Call[] = []
  const r = await searchShops({ name: 'Little Fern Coffee', city: 'Menlo Park', country: 'uk' }, { key: 'secret', fetch: fake(200, { places: [PLACE, { id: '', displayName: { text: 'no id' } }] }, calls) })
  assert.deepEqual(r, { ok: true, matches: [{ place_id: 'ChIJabcdefghijk123', name: 'Little Fern Coffee', address: '700 Santa Cruz Ave, Menlo Park, CA', kind: 'Coffee shop' }] })
  const h = calls[0]!.init.headers as Record<string, string>
  assert.equal(h['X-Goog-Api-Key'], 'secret')
  assert.equal(h['X-Goog-FieldMask'], 'places.id,places.displayName,places.formattedAddress,places.primaryTypeDisplayName')
  assert.deepEqual(JSON.parse(String(calls[0]!.init.body)), { textQuery: 'Little Fern Coffee, Menlo Park', pageSize: 5, regionCode: 'GB' })
})
test('"Another country" sends no region', async () => {
  const calls: Call[] = []
  await searchShops({ name: 'Little Fern', city: 'Lisbon', country: 'other' }, { key: 'k', fetch: fake(200, { places: [PLACE] }, calls) })
  assert.equal('regionCode' in JSON.parse(String(calls[0]!.init.body)), false)
})
test('at most five shops to choose from', async () => {
  const many = Array.from({ length: 9 }, (_, i) => ({ ...PLACE, id: `ChIJabcdefghijk${i}00` }))
  const r = await searchShops({ name: 'Little Fern', city: 'Menlo Park', country: 'us' }, { key: 'k', fetch: fake(200, { places: many }) })
  assert.equal(r.ok && r.matches.length, 5)
})
test('nothing found, a Google error and a thrown fetch each give a reason', async () => {
  assert.deepEqual(await searchShops({ name: 'Zzz', city: 'Nowhere', country: 'us' }, { key: 'k', fetch: fake(200, {}) }), { ok: false, reason: 'none' })
  assert.deepEqual(await searchShops({ name: 'Little Fern', city: 'Menlo Park', country: 'us' }, { key: 'k', fetch: fake(403, { error: {} }) }), { ok: false, reason: 'failed' })
  const boom = (async () => { throw new Error('offline') }) as unknown as typeof fetch
  assert.deepEqual(await searchShops({ name: 'Little Fern', city: 'Menlo Park', country: 'us' }, { key: 'k', fetch: boom }), { ok: false, reason: 'failed' })
})
test('the picked shop: website, summary and up to five reviews', async () => {
  const calls: Call[] = []
  const reviews = Array.from({ length: 7 }, (_, i) => ({ text: { text: `Great  latte ${i}` } }))
  const r = await shopDetails('ChIJabcdefghijk123', { key: 'k', fetch: fake(200, { ...PLACE, websiteUri: 'https://littlefern.example', editorialSummary: { text: 'Cozy spot with a patio.' }, reviews: [...reviews, { text: {} }] }, calls) })
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.equal(r.shop.name, 'Little Fern Coffee')
  assert.equal(r.shop.website, 'https://littlefern.example')
  assert.equal(r.shop.summary, 'Cozy spot with a patio.')
  assert.deepEqual(r.shop.reviews, ['Great latte 0', 'Great latte 1', 'Great latte 2', 'Great latte 3', 'Great latte 4'])
  assert.equal(calls[0]!.url, 'https://places.googleapis.com/v1/places/ChIJabcdefghijk123')
})
test('the picked shop: a made-up id never reaches Google', async () => {
  const calls: Call[] = []
  assert.deepEqual(await shopDetails('../secrets', { key: 'k', fetch: fake(200, PLACE, calls) }), { ok: false, reason: 'bad_input' })
  assert.equal(calls.length, 0)
  assert.deepEqual(await shopDetails('ChIJabcdefghijk123', { key: 'k', fetch: fake(404, {}) }), { ok: false, reason: 'none' })
})
