import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { LANDINGS, OCCASION_PAGES, landingFor } from './landings'
import { OCCASION, OCCASIONS } from './shared'
import { productFor } from '../seo/product-for'

const BANNED = /\b(generator|safe space|community|therapy|support|positive|silver lining|reframe|resilience|mindset|anonymous|joke cards?)\b/i

describe('toast occasion pages (Nov 8 2026)', () => {
  test('ten occasion pages plus any occasion, unique slugs, real occasions', () => {
    assert.equal(OCCASION_PAGES.length, 10)
    assert.equal(new Set(LANDINGS.map((l) => l.slug)).size, LANDINGS.length)
    for (const l of LANDINGS) assert.ok((OCCASIONS as readonly string[]).includes(l.occasion))
  })
  test('no banned words, no old prices, no "names are removed"', () => {
    for (const l of LANDINGS) {
      const text = JSON.stringify(l)
      assert.doesNotMatch(text, BANNED)
      assert.doesNotMatch(text, /\$1\.99|\$7\.99|names are removed/i)
    }
  })
  test('length answers match what the form offers', () => {
    assert.deepEqual(OCCASION.christmas.lengths, [60, 120])
    assert.equal(LANDINGS.find((l) => l.slug === 'christmas')!.hub.lengths, '1 or 2 min')
    assert.equal(LANDINGS.find((l) => l.slug === 'office-holiday-party')!.hub.lengths, '60s, 90s or 2 min')
  })
  test('every occasion has a page to land on', () => {
    for (const o of OCCASIONS) assert.ok(landingFor(o).slug)
    assert.equal(landingFor('parent', 'mom').slug, 'mother-of-the-bride')
    assert.equal(landingFor('parent', 'dad').slug, 'father-of-the-bride')
    assert.equal(landingFor('toastmasters').slug, 'any-occasion')
  })
  test('SEO pages point to the exact occasion page', () => {
    const to = (slug: string, category = '') => { const p = productFor({ slug, category, product: 'toasts' }); return p.kind === 'toasts' ? p.href : p.kind }
    assert.equal(to('best-man-speech'), '/toasts/best-man')
    assert.equal(to('funny-christmas-toast'), '/toasts/christmas')
    assert.equal(to('father-of-the-bride-speech'), '/toasts/father-of-the-bride')
    assert.equal(to('mother-of-the-bride-speech'), '/toasts/mother-of-the-bride')
    assert.equal(to('retirement-speech'), '/toasts/retirement')
    assert.equal(to('birthday-toast'), '/toasts/birthday')
    assert.equal(to('office-holiday-party-toast'), '/toasts/office-holiday-party')
    assert.equal(to('thanksgiving-toast'), '/toasts/thanksgiving')
    assert.equal(to('new-years-toast'), '/toasts/new-years')
  })
})
