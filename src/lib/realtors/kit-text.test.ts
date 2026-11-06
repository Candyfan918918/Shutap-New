import { test } from 'node:test'
import assert from 'node:assert/strict'
import { copyText, outputText, voiceoverTxt } from './kit-text'
import { kitPdf } from './kit-pdf'
import { DEFAULT_LISTING_CONTROLS, type Kit, type Listing } from './listing'

const kit: Kit = {
  walkthrough: { shots: [{ where: 'front door', action: 'to camera', line: 'Two bedrooms, one bath.', seconds: '0–3' }, { where: 'balcony', action: 'reveal, hold', line: 'Here is the chair.', seconds: '3–7' }], cut15: 'shots 1 and 2', cut60: 'adds the bath' },
  voiceover: [{ label: 'front door', text: 'Two bedrooms, one bath.' }, { label: 'balcony', text: 'Here is the chair.' }],
  hooks: [{ line: 'One chair, one decision.', move: 'the running gag' }],
  open_house: [{ label: 'invite post', text: 'Open house Sunday 1–4.' }],
  posts: [{ label: 'just listed · instagram', text: 'Just listed: 4B Alder Court.' }],
  straight: 'Two-bedroom condo with a balcony.',
}
const listing: Listing = { source: 'pasted', url: null, address: '4B Alder Court', city: 'San Mateo', price: '$749,000', beds: 2, baths: 1, sqft: 870, year_built: 1987, hoa: '$410/month', taxes: null, lot_sqft: null, mls: null, status: null, open_houses: ['11/09/2026 1:00PM-4:00PM'], description: 'A condo.', photos: [], note: 'the chair' }

test('copies carry the mark on Free and not otherwise; the txt is one paragraph per segment', () => {
  assert.equal(copyText(kit, 'hooks', false), '"One chair, one decision." (the running gag)')
  assert.match(copyText(kit, 'hooks', true), / — shutap\.com$/)
  assert.match(outputText(kit, 'walkthrough'), /^1\. front door · 0–3s\nto camera\n"Two bedrooms, one bath\."/)
  assert.equal(voiceoverTxt(kit, false), 'Two bedrooms, one bath.\n\nHere is the chair.\n')
})

test('the kit PDF is Letter, seven pages (cover + one per output), marked on Free', async () => {
  for (const marked of [false, true]) {
    const blob = kitPdf(kit, listing, { ...DEFAULT_LISTING_CONTROLS, must_say: ['$749,000'] }, { marked })
    const s = await blob.text()
    assert.match(s, /^%PDF-1\.4/)
    assert.match(s, /\/Count 7 >>/)
    assert.match(s, /MediaBox \[0 0 612 792\]/)
    assert.equal(/SHUTAP\.COM \. SHUTAP\.COM/.test(s), marked)
    assert.match(s, /4B Alder Court/)
    assert.match(s, /%%EOF$/)
  }
})
