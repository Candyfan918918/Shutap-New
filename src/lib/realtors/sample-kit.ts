// The sample kit on /realtors (Nov 6 2026): real product output. Written by
// Shutap in /kit-lab from a public Zillow listing (a 4-bed in Menlo Park),
// tone "young", and rated "pick" by Candy (kit_evals
// 6fd3e033-b4ca-407c-8f21-4389923b43b1). Nothing here is hand-written.
//
// Nov 7 2026 (Candy): the street address and the price are swapped for
// [address] and [price] everywhere, so /realtors never points at one specific
// home for sale (ChatGPT ads policy: a landing page must not reference a
// specific listing). Every other word is as Shutap wrote it; the original is
// the kit_evals row above.
import type { Kit, Listing, ListingControls } from './listing'

export const SAMPLE_LISTING: Listing = {
  source: 'zillow.com', url: null, address: null, city: 'Menlo Park', price: null, beds: 4, baths: 2, sqft: 1480, year_built: 1948,
  hoa: '$0/month', taxes: null, lot_sqft: 6005, mls: null, status: null, open_houses: [],
  description: 'Located in Menlo Park, this 1,480 sq. ft. home features four bedrooms including a primary suite/retreat, and two full bathrooms. The kitchen is equipped with gas hookups and a gas oven range. Flooring throughout water proof laminated, complemented by double pane windows for energy efficiency. The living room includes an insert fireplace.',
  photos: [], note: '',
}

export const SAMPLE_CONTROLS: ListingControls = { tone: 'young', roast_house: true, roast_neighborhood: true, mention_price: false, must_say: [], never_say: [] }

export const SAMPLE_KIT: Kit = {
  walkthrough: {
    shots: [
      { where: 'front door · to camera', action: 'Start at the threshold, tap the door, step in fast, hold a grin.', line: '[address], Menlo Park. Blink and you’re in the living room.', seconds: '0–3' },
      { where: 'living room · push forward past fireplace', action: 'Walk toward the insert fireplace, hand out to the mantel, warm your palms.', line: 'Insert fireplace for vibes. Marshmallows optional, opinions mandatory.', seconds: '3–7' },
      { where: 'living room window · pan to glass', action: 'Tilt down to flooring, then up to the window, tap the pane.', line: 'Waterproof laminate underfoot, double pane windows playing defense.', seconds: '7–10' },
      { where: 'kitchen entry · swing to range', action: 'Spin into kitchen, point at the gas range, flick a burner knob.', line: 'Gas hookups, gas oven range. Flames on, takeout off.', seconds: '10–14' },
      { where: 'hallway · walk and count doors', action: 'Glide down the hall, finger count doors as you pass.', line: 'Four bedrooms. Door math that finally favors you.', seconds: '14–18' },
      { where: 'primary suite · slow reveal', action: 'Back into the primary, spin once, land on the doorway.', line: 'Primary suite slash retreat. Yes, the door closes.', seconds: '18–22' },
      { where: 'bathroom · quick mirror glance', action: 'Lean into the mirror, point to the shower, step out.', line: 'Two full bathrooms. Schedule peace like a pro.', seconds: '22–25' },
      { where: 'back door · step to yard', action: 'Open to the yard, show depth with a quick walk and turn.', line: 'Lot is 6005 square feet. Lawn goals meet weekend reality.', seconds: '25–28' },
      { where: 'front door · turning back to street', action: 'Head out, angle to street, close door on the last beat.', line: '[price], 1,480 sq. ft., built 1948, Menlo Park. Zero HOA.', seconds: '28–30' },
    ],
    cut15: '1,2,4,6,9',
    cut60: 'Add a yard beat on 8 with a second line about space for whatever fits.',
  },
  voiceover: [
    { label: 'entry', text: '[address], Menlo Park. Blink and you’re in the living room.' },
    { label: 'living room', text: 'Insert fireplace for vibes. Marshmallows optional, opinions mandatory.' },
    { label: 'windows and floors', text: 'Waterproof laminate underfoot, double pane windows playing defense.' },
    { label: 'kitchen', text: 'Gas hookups, gas oven range. Flames on, takeout off.' },
    { label: 'hallway', text: 'Four bedrooms. Door math that finally favors you.' },
    { label: 'primary', text: 'Primary suite slash retreat. Yes, the door closes.' },
    { label: 'bath', text: 'Two full bathrooms. Schedule peace like a pro.' },
    { label: 'yard', text: 'Lot is 6005 square feet. Lawn goals meet weekend reality.' },
    { label: 'button', text: '[price], 1,480 sq. ft., built 1948, Menlo Park. Zero HOA.' },
  ],
  hooks: [
    { line: 'Four bedrooms. Bring your door drama.', move: "buyer's inner voice" },
    { line: 'Insert fireplace. Insert personality.', move: 'specific picture' },
    { line: 'Menlo Park, gas range, zero HOA. Proceed.', move: 'listing-speak vs reality' },
  ],
  open_house: [
    { label: 'invite post', text: 'Tour [address] in Menlo Park. Four bedrooms, two baths, 1,480 sq. ft., and a 6005 sq. ft. lot. Built 1948, updated where it counts with gas cooking, double pane windows, and waterproof laminate floors.' },
    { label: 'story · 3 frames', text: '1) Menlo Park address. You in? 2) Gas range, insert fireplace, four bedrooms. 3) Zero HOA. Come see.' },
    { label: 'sign line', text: 'Gas range. Door drama solved.' },
    { label: 'day-before reminder', text: 'Tour [address] tomorrow—beds, baths, fireplace, yard, and zero HOA.' },
    { label: 'thank-you text', text: 'Great meeting you at [address]. If you want the disclosures or another walk-through, I’ve got them ready.' },
  ],
  posts: [
    { label: 'just listed · instagram', text: 'Menlo Park spot with four bedrooms, two baths, and 1,480 sq. ft. Gas hookups and gas oven range in the kitchen, insert fireplace in the living room, waterproof laminate plus double pane windows. Built 1948 on a 6005 sq. ft. lot. [price]. HOA $0/month.' },
    { label: 'just listed · tiktok', text: 'Menlo Park. 4 bed, 2 bath, 1,480 sq. ft. Gas range. Insert fireplace. 6005 sq. ft. lot. Built 1948. [price]. Zero HOA.' },
    { label: 'just listed · facebook', text: 'Now live: [address], Menlo Park. 4 bed, 2 bath, 1,480 sq. ft., built in 1948 on a 6005 sq. ft. lot. Kitchen with gas hookups and gas oven range, insert fireplace in the living room, waterproof laminate flooring throughout, and double pane windows. Offered at [price] with HOA $0/month.' },
    { label: 'price improvement', text: 'Now available with fresh attention—ask for the current details.' },
    { label: 'pending', text: '[address] is pending—thank you for the strong interest.' },
    { label: 'sold', text: 'Closed at [address], Menlo Park. Congratulations to the new owners and thanks to everyone who toured.' },
  ],
  straight: 'Located at [address] in Menlo Park, this 1,480 sq. ft. home offers four bedrooms, including a primary suite/retreat, and two full bathrooms. The kitchen features gas hookups and a gas oven range. Flooring throughout is waterproof laminated, and double pane windows add energy efficiency. The living room includes an insert fireplace. Built in 1948 on a 6005 sq. ft. lot, the property is offered at [price]. HOA $0/month.',
}
