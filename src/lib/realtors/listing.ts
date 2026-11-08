// Shutap for Realtors (Nov 5 2026): what a listing is, once read. Safe in
// the browser. Nothing in a kit may say more than this: the writer gets the
// listing and the agent's own note, and the nothing-added check reads back
// against it.
export const TONES = ['professional', 'funny', 'luxury', 'young'] as const
export type Tone = (typeof TONES)[number]
export const TONE_LABEL: Record<Tone, string> = {
  professional: 'professional & trustworthy',
  funny: 'funny & relatable',
  luxury: 'sophisticated & luxury',
  young: 'young, energetic & trend-aware',
}

export type Listing = {
  /** where it came from: a host name, or 'pasted' */
  source: string
  url: string | null
  address: string | null
  city: string | null
  price: string | null
  beds: number | null
  baths: number | null
  sqft: number | null
  year_built: number | null
  /** monthly HOA dues, annual taxes, lot size, as the listing states them */
  hoa: string | null
  taxes: string | null
  lot_sqft: number | null
  /** MLS number, status and open houses, as the listing states them */
  mls: string | null
  status: string | null
  open_houses: string[]
  /** the listing's own description, as published */
  description: string
  /** photo captions or alt text the page gave, in order */
  photos: string[]
  /** what the agent typed: the one thing about it */
  note: string
}

export type ListingControls = {
  tone: Tone
  roast_house: boolean
  roast_neighborhood: boolean
  mention_price: boolean
  must_say: string[]
  never_say: string[]
}

export const DEFAULT_LISTING_CONTROLS: ListingControls = {
  tone: 'funny',
  roast_house: true,
  roast_neighborhood: true,
  mention_price: false,
  must_say: [],
  never_say: [],
}

export const OUTPUTS = ['walkthrough', 'voiceover', 'hooks', 'open_house', 'posts', 'straight'] as const
export type Output = (typeof OUTPUTS)[number]
export const OUTPUT_LABEL: Record<Output, string> = {
  walkthrough: 'the walkthrough',
  voiceover: 'voiceover',
  hooks: 'hooks',
  open_house: 'open-house kit',
  posts: 'posts',
  straight: 'MLS copy',
}

export type Shot = { where: string; action: string; line: string; seconds: string; fact?: string }
export type Hook = { line: string; move: string }
export type Labeled = { label: string; text: string }

/** One kit: the six outputs for one tone. */
export type Kit = {
  walkthrough: { shots: Shot[]; cut15: string; cut60: string }
  voiceover: Labeled[]
  hooks: Hook[]
  open_house: Labeled[]
  posts: Labeled[]
  straight: string
}

/** The facts a kit may use, as one block for the prompts and the check. */
export function listingFacts(l: Listing): string[] {
  const f: string[] = []
  if (l.address) f.push(`address: ${l.address}`)
  if (l.city) f.push(`city: ${l.city}`)
  if (l.price) f.push(`price: ${l.price}`)
  if (l.beds !== null) f.push(`${l.beds} bed`)
  if (l.baths !== null) f.push(`${l.baths} bath`)
  if (l.sqft !== null) f.push(`${l.sqft} sqft`)
  if (l.year_built !== null) f.push(`built ${l.year_built}`)
  if (l.lot_sqft !== null) f.push(`lot ${l.lot_sqft} sqft`)
  if (l.hoa) f.push(`HOA ${l.hoa}`)
  if (l.taxes) f.push(`taxes ${l.taxes}`)
  if (l.mls) f.push(`MLS# ${l.mls}`)
  if (l.status) f.push(`status: ${l.status}`)
  for (const o of l.open_houses ?? []) f.push(`open house: ${o}`)
  return f
}

/** Words that fair housing forbids in real-estate advertising, and the
 *  coded versions. Any output line containing one is thrown out. */
export const FAIR_HOUSING = [
  /\b(famil(y|ies)|kids?|children|couples?|singles?|bachelor|newlyweds?|empty.?nesters?|retirees?|seniors?|adults? only|mature)\b/i,
  /\b(christian|church|temple|mosque|synagogue|jewish|muslim|catholic|hindu)\b/i,
  /\b(white|black|asian|hispanic|latino|ethnic|racial|integrated|exclusive neighborhood|private community)\b/i,
  /\b(safe|secure|low.?crime|quiet neighborhood|good schools?|great schools?|top schools?)\b/i,
  /\b(disab(led|ility)|wheelchair|handicap|able.?bodied|healthy|crazy|insane)\b/i,
  /\b(immigrants?|foreigners?|citizens?|english.?speaking|national origin)\b/i,
  /\b(gay|lesbian|straight people|trans)\b/i,
  /\b(no (section 8|vouchers?))\b/i,
]
export function fairHousingHit(line: string): string | null {
  for (const re of FAIR_HOUSING) {
    const m = re.exec(line)
    if (m) return m[0]
  }
  return null
}
