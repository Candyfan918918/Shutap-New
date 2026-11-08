// The sample kit on /realtors (Nov 8 2026): real product output, the funny
// tone. Written by Shutap in /kit-lab from a public Zillow listing (a 4-bed in
// Menlo Park), kit_evals b65d3a48-1c22-423e-81eb-0c5df119c1d8, chosen by Candy
// on Nov 8 as the demo ("choose a funny and entertaining one"). Nothing here
// is hand-written. Replaces the Nov 6 "young" kit (kit_evals 6fd3e033).
//
// Nov 7 2026 (Candy): the street address and the price are swapped for
// [address] and [price] everywhere, so /realtors never points at one specific
// home for sale (ChatGPT ads policy: a landing page must not reference a
// specific listing). Every other word is as Shutap wrote it.
import type { Kit, Listing, ListingControls } from './listing'

export const SAMPLE_EVAL_ID = 'b65d3a48-1c22-423e-81eb-0c5df119c1d8'

export const SAMPLE_LISTING: Listing = {
  source: 'zillow.com', url: null, address: null, city: 'Menlo Park', price: null, beds: 4, baths: 2, sqft: 1480, year_built: 1948,
  hoa: '$0/month', taxes: '$170/year', lot_sqft: 6005, mls: null, status: null, open_houses: [],
  description: 'Located in Menlo Park, this 1,480 sq. ft. home features four bedrooms including a primary suite/retreat, and two full bathrooms. The kitchen is equipped with gas hookups and a gas oven range, offering practical cooking options. Flooring throughout water proof laminated, complemented by double pane windows for energy efficiency. The living room includes an insert fireplace.',
  photos: [], note: '',
}

export const SAMPLE_CONTROLS: ListingControls = { tone: 'funny', roast_house: true, roast_neighborhood: true, mention_price: false, must_say: [], never_say: [] }

export const SAMPLE_KIT: Kit = {
  "walkthrough": {
    "shots": [
      {
        "where": "front walk · to camera",
        "action": "Start mid-stride, point at the address numbers, then the door; say the hook.",
        "line": "Welcome to [address], where waterproof floors judge your spill history.",
        "seconds": "0–4",
        "fact": "address; water proof laminated flooring"
      },
      {
        "where": "entry · swing to living room",
        "action": "Open door, step in, sweep to the insert fireplace and pause hand over it.",
        "line": "Insert fireplace: because matches deserved a tech upgrade and your socks, heat.",
        "seconds": "4–8",
        "fact": "living room includes an insert fireplace"
      },
      {
        "where": "living to kitchen · walk and reveal",
        "action": "Walk into kitchen, tap the gas range knobs like a piano for emphasis.",
        "line": "Gas hookups and a gas oven range—finally, flames that aren’t from emails.",
        "seconds": "8–12",
        "fact": "kitchen with gas hookups and a gas oven range"
      },
      {
        "where": "kitchen window · pan to glass",
        "action": "Press palm to the window, nod approvingly at the reflection.",
        "line": "Double pane windows: outside noise stays outside, like your unread newsletters.",
        "seconds": "12–15",
        "fact": "double pane windows for energy efficiency"
      },
      {
        "where": "hallway · quick stat drop",
        "action": "Walk the hall, hold up fingers counting beds and baths as you pass doors.",
        "line": "4 bed, 2 bath, 1,480 square feet—bring stuff, not excuses.",
        "seconds": "15–19",
        "fact": "4 bed; 2 bath; 1480 sqft"
      },
      {
        "where": "primary suite · doorway lean",
        "action": "Lean in the doorway, gesture at the room like it’s a VIP lounge.",
        "line": "Primary suite slash retreat: finally a meeting that could’ve been a nap.",
        "seconds": "19–23",
        "fact": "primary suite/retreat"
      },
      {
        "where": "secondary bedroom · walk-through",
        "action": "Glide through, toe-tap the waterproof floor for the running gag.",
        "line": "These waterproof floors heard your ‘only water’ promise and said, sure.",
        "seconds": "23–26",
        "fact": "water proof laminated flooring"
      },
      {
        "where": "back door view · quick lot nod",
        "action": "Open to the yard, frame the outdoor space with your hands.",
        "line": "Lot is 6005 square feet—room for lawn chairs and questionable hobbies.",
        "seconds": "26–29",
        "fact": "lot 6005 sqft"
      },
      {
        "where": "front door · closing button",
        "action": "Step out, pull door, tap the floor one last time and grin.",
        "line": "Built 1948, upgraded where it counts—like floors that forgive spaghetti.",
        "seconds": "29–32",
        "fact": "built 1948; water proof laminated flooring"
      }
    ],
    "cut15": "1,2,3,5,9",
    "cut60": "Add a slow pan of both bathrooms and linger on the energy-efficient double pane windows while repeating the waterproof floor gag once more in a whisper."
  },
  "voiceover": [
    {
      "label": "front walk",
      "text": "Welcome to [address], where waterproof floors judge your spill history."
    },
    {
      "label": "living room",
      "text": "Insert fireplace: because matches deserved a tech upgrade and your socks, heat."
    },
    {
      "label": "kitchen",
      "text": "Gas hookups and a gas oven range—finally, flames that aren’t from emails."
    },
    {
      "label": "kitchen window",
      "text": "Double pane windows: outside noise stays outside, like your unread newsletters."
    },
    {
      "label": "hallway",
      "text": "4 bed, 2 bath, 1,480 square feet—bring stuff, not excuses."
    },
    {
      "label": "primary suite",
      "text": "Primary suite slash retreat: finally a meeting that could’ve been a nap."
    },
    {
      "label": "bedroom two",
      "text": "These waterproof floors heard your ‘only water’ promise and said, sure."
    },
    {
      "label": "yard",
      "text": "Lot is 6005 square feet—room for lawn chairs and questionable hobbies."
    },
    {
      "label": "exit",
      "text": "Built 1948, upgraded where it counts—like floors that forgive spaghetti."
    }
  ],
  "hooks": [
    {
      "line": "This floor remembers every spill you deny.",
      "move": "buyer’s inner voice"
    },
    {
      "line": "Insert fireplace, because chaos needed a slot.",
      "move": "reversal"
    },
    {
      "line": "Gas range: real fire, not your inbox.",
      "move": "specific picture"
    }
  ],
  "open_house": [
    {
      "label": "invite post",
      "text": "Tour [address] in Menlo Park. Four bedrooms, two bathrooms, 1,480 sq. ft., built 1948 on a 6005 sq. ft. lot. No HOA and taxes listed at $170/year. Open-house time not provided; reach out and I’ll share the schedule."
    },
    {
      "label": "story · 3 frames",
      "text": "1) [address]: insert fireplace, insert you. 2) 4 bed, 2 bath, 1,480 sq. ft. Proof by doors. 3) Time TBD—DM for the open window."
    },
    {
      "label": "sign line",
      "text": "Insert yourself here"
    },
    {
      "label": "day-before reminder",
      "text": "[address] shows tomorrow—time TBD, message me for the window."
    },
    {
      "label": "thank-you text",
      "text": "Great meeting you at [address] today. If any details stick—beds, baths, or those windows—happy to send the specs."
    }
  ],
  "posts": [
    {
      "label": "just listed · instagram",
      "text": "Just listed: [address] in Menlo Park. 4 bed, 2 bath, 1,480 sq. ft., built 1948 on a 6005 sq. ft. lot. Kitchen with gas hookups and a gas oven range, double pane windows, waterproof laminated flooring, and an insert fireplace. Listed at [price]. HOA $0/month; taxes $170/year."
    },
    {
      "label": "just listed · tiktok",
      "text": "Menlo Park. 4 bed, 2 bath. 1,480 sq. ft. Gas range. Insert fireplace. Double pane windows. Waterproof floors. Lot 6005 sq. ft. [price]."
    },
    {
      "label": "just listed · facebook",
      "text": "Now live: [address], Menlo Park. This 1,480 sq. ft. home offers 4 bedrooms including a primary suite/retreat and 2 full bathrooms. Kitchen features gas hookups and a gas oven range; living room has an insert fireplace. Waterproof laminated flooring and double pane windows add everyday ease. Built in 1948 on a 6005 sq. ft. lot. Listed at [price]. HOA $0/month; taxes $170/year."
    },
    {
      "label": "price improvement",
      "text": "Now offering [address] with all the same features you toured."
    },
    {
      "label": "pending",
      "text": "[address] is pending—thank you for the incredible interest."
    },
    {
      "label": "sold",
      "text": "Closed on [address]. Congratulations to the new owners and to Menlo Park for gaining a great home."
    }
  ],
  "straight": "Located at [address] in Menlo Park, this 1,480 sq. ft. home offers 4 bedrooms, including a primary suite/retreat, and 2 full bathrooms. The kitchen includes gas hookups and a gas oven range. Flooring throughout is waterproof laminated, and double pane windows support energy efficiency. The living room features an insert fireplace. Built in 1948, the home sits on a 6005 sq. ft. lot. Listed at [price]. HOA is $0/month and taxes are $170/year."
}
