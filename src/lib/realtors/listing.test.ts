import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fairHousingHit, listingFacts } from './listing'
import { factsFromText, readListingText } from './read.server'
import { checkKit, kitLines } from './kit.server'
import type { Kit, Listing, ListingControls } from './listing'

const SAMPLE = '4B Alder Court, San Mateo, CA 94401. $749,000. 2 bed 1 bath condo, 870 sq ft, built 1987. Original hardwood, balcony. HOA $410/month. Open house Sunday 1-4.'

test('the price is the one beside the facts, never a fee; a Matrix portal page reads exactly', () => {
  assert.equal(factsFromText('HOA $410/month. Taxes $10,000. Listed at $749,000. 2 bed 1 bath.').price, '$749,000')
  const matrix = 'Office Ph: (650) 622-1000 Find a Home Back to Results 1 of 17 230 Selby Ln Atherton, California 94027 MLS#: CC41153069 Total Home $2,588,000 New Listing Active 2 Bedrooms 1 Full Baths 1 Half Baths 1,340 sqft 5,000 Lot SqFt Built in 1957 Detached Upcoming Open Houses 11/07/2026 2:00PM-4:00PM'
  const f = factsFromText(matrix)
  assert.equal(f.price, '$2,588,000'); assert.equal(f.beds, 2); assert.equal(f.baths, 1.5); assert.equal(f.sqft, 1340); assert.equal(f.year_built, 1957)
  assert.equal(f.address, '230 Selby Ln'); assert.equal(f.city, 'Atherton'); assert.equal(f.lot_sqft, 5000)
  const g = factsFromText('HOA $410/month. Taxes $10,000. Listed at $749,000. 2 bed 1 bath.')
  assert.equal(g.hoa, '$410/month'); assert.equal(g.taxes, '$10,000/year')
  assert.equal(factsFromText('a cheap lot: $9,500, 0.2 acres, 3 bed').price, '$9,500')
})

test('facts come out of pasted text', () => {
  const f = factsFromText(SAMPLE)
  assert.equal(f.price, '$749,000'); assert.equal(f.beds, 2); assert.equal(f.baths, 1); assert.equal(f.sqft, 870); assert.equal(f.year_built, 1987)
  assert.equal(f.address, '4B Alder Court'); assert.equal(f.city, 'San Mateo')
  const r = readListingText(SAMPLE)
  assert.ok(r.ok && listingFacts(r.listing).length >= 6)
  assert.equal(readListingText('hello there this is not a listing at all, just words and more words to pass forty').ok, false)
})

test('fair housing words are caught, plain and coded', () => {
  assert.ok(fairHousingHit('Perfect for families with kids'))
  assert.ok(fairHousingHit('a safe, quiet neighborhood'))
  assert.ok(fairHousingHit('close to the church'))
  assert.equal(fairHousingHit('The balcony fits one chair and one decision.'), null)
})

const listing: Listing = { source: 'pasted', url: null, address: '4B Alder Court', city: 'San Mateo', price: '$749,000', beds: 2, baths: 1, sqft: 870, year_built: 1987, hoa: '$410/month', taxes: null, lot_sqft: null, mls: null, status: null, open_houses: [], description: SAMPLE, photos: [], note: 'balcony fits one chair' }
const kit: Kit = {
  walkthrough: { shots: [{ where: 'front door', action: 'Open it on the last word.', line: 'Two bedrooms, one bath, a balcony that fits one chair.', seconds: '0–3' }], cut15: '1', cut60: 'adds the bath' },
  voiceover: [{ label: 'front door', text: 'Two bedrooms, one bath.' }],
  hooks: [{ line: 'One chair. One decision.', move: 'cut' }],
  open_house: [{ label: 'invite post', text: 'Open house Sunday 1-4 at 4B Alder Court, San Mateo. $749,000.' }],
  posts: [{ label: 'just listed', text: 'Just listed: 4B Alder Court, San Mateo, $749,000, 870 square feet, great for families.' }, { label: 'sold', text: 'Sold. Congratulations. Renovated in 2019 with a 3-car garage.' }],
  straight: 'Two-bedroom condominium at 4B Alder Court, San Mateo, 870 square feet, built 1987. $749,000. Open house Sunday 1-4.',
}
const controls: ListingControls = { tone: 'funny', roast_house: true, roast_neighborhood: true, mention_price: true, must_say: ['$749,000', 'Compass'], never_say: ['cozy'] }

test('the checks flag fair housing, added numbers and missing must-say', () => {
  const fails = checkKit(kit, listing, controls)
  assert.ok(fails.some((f) => f.rule.startsWith('fair housing') && f.where.includes('just listed')))
  assert.ok(fails.some((f) => f.rule === 'added number: 2019'))
  const bad = checkKit({ ...kit, straight: 'Offered at $10,000,000 with 7,000 square feet.' }, listing, controls)
  assert.ok(bad.some((f) => f.rule === 'changed number: 10,000,000'))
  assert.ok(bad.some((f) => f.rule === 'changed number: 7,000'))
  assert.ok(fails.some((f) => f.rule === 'must say missing: "Compass"' && f.where === 'posts'))
  assert.ok(!fails.some((f) => f.rule.startsWith('added number') && (f.rule.includes('870') || f.rule.includes('749'))))
  assert.ok(kitLines(kit).length >= 6)
})

// A Matrix portal results page: thirty homes, the link ends in "#1"
import { cardsFromHtml, cardIndexFromUrl, factsFromCard } from './read.server'
const CARD = `<div class="multiLineDisplay ajax_display d1347m_show"><span class="d-fontSize--largest">$2,588,000</span><span class="badge">New Listing</span> <a>Save as Favorite</a> <span>Active</span> <span>MLS#:</span> <span>CC41153069</span> <span>230 Selby Ln</span> <span>Atherton, California 94027</span> <td>Type</td><td>Open House Date / Time</td> <td>In Person</td><td>11/07/2026</td><td>2:00PM-4:00PM</td> <td>In Person</td><td>11/08/2026</td><td>1:00PM-4:00PM</td> <td>In Person</td><td>11/10/2026</td><td>10:00AM-1:00PM</td> <span>2</span><span>Beds</span> <span>2</span><span>Baths</span> <span>1,340</span><span>SqFt</span> <span>5,000</span><span>Lot SqFt</span> <span>Built in</span><span>1957</span> <span>Res. Single Family</span> <span>Detached</span> <p>Here is your chance to own a home in Atherton! Timeless charm, and an inviting indoor-outdoor connec...</p></div>`
const PAGE = `<html><select><option>$10,000</option><option>7,000 SqFt</option></select>${CARD}<div class="multiLineDisplay ajax_display d1385m_show nonresponsive"><span>$2,688,000</span> <span>1040 Ringwood Ave</span> <span>Menlo Park, California 94025</span> <span>4</span><span>Beds</span> <span>2</span><span>Baths</span> <span>1,700</span><span>SqFt</span></div></html>`
test('a results page is split into cards and the #N card is read exactly', () => {
  const cards = cardsFromHtml(PAGE)
  assert.equal(cards.length, 2)
  assert.equal(cardIndexFromUrl('https://search.mlslistings.com/Matrix/Public/Portal.aspx?ID=0-1&L=1#1'), 0)
  assert.equal(cardIndexFromUrl('https://x.com/p#2'), 1)
  const f = factsFromCard(cards[0]!)
  assert.equal(f.price, '$2,588,000'); assert.equal(f.beds, 2); assert.equal(f.baths, 2)
  assert.equal(f.sqft, 1340); assert.equal(f.lot_sqft, 5000); assert.equal(f.year_built, 1957)
  assert.equal(f.address, '230 Selby Ln'); assert.equal(f.city, 'Atherton')
  assert.equal(f.mls, 'CC41153069'); assert.equal(f.status, 'Active')
  assert.deepEqual(f.open_houses, ['11/07/2026 2:00PM-4:00PM', '11/08/2026 1:00PM-4:00PM', '11/10/2026 10:00AM-1:00PM'])
  assert.match(f.description ?? '', /^Here is your chance/)
  const g = factsFromCard(cards[1]!)
  assert.equal(g.price, '$2,688,000'); assert.equal(g.beds, 4); assert.equal(g.sqft, 1700); assert.equal(g.city, 'Menlo Park')
})
