import { describe, expect, test } from 'bun:test'
import { LANDINGS, OCCASION_PAGES, landingFor } from './landings'
import { OCCASION, OCCASIONS } from './shared'
import { productFor } from '../seo/product-for'

const BANNED = /\b(generator|safe space|community|therapy|support|positive|silver lining|reframe|resilience|mindset|anonymous|joke cards?)\b/i

describe('toast occasion pages (Nov 8 2026)', () => {
  test('ten occasion pages plus any occasion, unique slugs, real occasions', () => {
    expect(OCCASION_PAGES.length).toBe(10)
    expect(new Set(LANDINGS.map((l) => l.slug)).size).toBe(LANDINGS.length)
    for (const l of LANDINGS) expect(OCCASIONS).toContain(l.occasion)
  })
  test('no banned words, no old prices, no "names are removed"', () => {
    for (const l of LANDINGS) {
      const text = JSON.stringify(l)
      expect(text).not.toMatch(BANNED)
      expect(text).not.toMatch(/\$1\.99|\$7\.99|names are removed/i)
    }
  })
  test('length answers match what the form offers', () => {
    expect(OCCASION.christmas.lengths).toEqual([60, 120])
    expect(LANDINGS.find((l) => l.slug === 'christmas')!.hub.lengths).toBe('1 or 2 min')
    expect(LANDINGS.find((l) => l.slug === 'office-holiday-party')!.hub.lengths).toBe('60s, 90s or 2 min')
  })
  test('every occasion has a page to land on', () => {
    for (const o of OCCASIONS) expect(landingFor(o).slug).toBeTruthy()
    expect(landingFor('parent', 'mom').slug).toBe('mother-of-the-bride')
    expect(landingFor('parent', 'dad').slug).toBe('father-of-the-bride')
    expect(landingFor('toastmasters').slug).toBe('any-occasion')
  })
  test('SEO pages point to the exact occasion page', () => {
    const to = (slug: string, category = '') => { const p = productFor({ slug, category, product: 'toasts' }); return p.kind === 'toasts' ? p.href : p.kind }
    expect(to('best-man-speech')).toBe('/toasts/best-man')
    expect(to('funny-christmas-toast')).toBe('/toasts/christmas')
    expect(to('father-of-the-bride-speech')).toBe('/toasts/father-of-the-bride')
    expect(to('mother-of-the-bride-speech')).toBe('/toasts/mother-of-the-bride')
    expect(to('retirement-speech')).toBe('/toasts/retirement')
    expect(to('birthday-toast')).toBe('/toasts/birthday')
    expect(to('office-holiday-party-toast')).toBe('/toasts/office-holiday-party')
    expect(to('thanksgiving-toast')).toBe('/toasts/thanksgiving')
    expect(to('new-years-toast')).toBe('/toasts/new-years')
  })
})
