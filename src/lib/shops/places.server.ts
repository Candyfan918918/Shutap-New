// Shutap for small business: finding the owner's shop on Google (Nov 21 2026,
// Candy: "list a few from Google to choose from"). Server only: the key is
// GOOGLE_PLACES_API_KEY, read from the server environment and never sent to
// the browser (never a VITE_ variable).
//
// Two calls, kept apart on purpose because Google bills by the fields asked
// for:
//   searchShops  — the list the owner picks from. Name, address and the kind
//                  of business only (Google's "Pro" fields).
//   shopDetails  — the one they picked. Adds the website, Google's own
//                  summary and review text, used once to suggest what the
//                  videos can mention.
//
// Nothing here stores anything. Review text is read to suggest a few
// "your videos can mention" chips and is not kept; what is saved is what the
// owner confirms or types. Every failure (no key, Google down, nothing
// found) returns a reason, and the screen falls back to "I'll type it in":
// the lookup never blocks an owner.
import type { Country } from './shop'

const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText'
const DETAILS_URL = 'https://places.googleapis.com/v1/places/'
const TIMEOUT_MS = 6000
/** How many shops the owner chooses between. */
export const MAX_MATCHES = 5

const REGION: Record<Country, string | null> = { us: 'US', ca: 'CA', uk: 'GB', au: 'AU', other: null }

export type ShopMatch = { place_id: string; name: string; address: string; kind: string | null }
export type ShopDetails = ShopMatch & { website: string | null; summary: string | null; reviews: string[] }

export type LookupFail = { ok: false; reason: 'no_key' | 'bad_input' | 'failed' | 'none' }
export type SearchResult = { ok: true; matches: ShopMatch[] } | LookupFail
export type DetailsResult = { ok: true; shop: ShopDetails } | LookupFail

type Deps = { fetch?: typeof fetch; key?: string | undefined }

function keyOf(deps: Deps): string | null {
  const k = (deps.key ?? process.env['GOOGLE_PLACES_API_KEY'] ?? '').trim()
  return k || null
}

function clean(s: unknown, max: number): string {
  return typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

function toMatch(p: any): ShopMatch | null {
  const place_id = clean(p?.id, 200)
  const name = clean(p?.displayName?.text, 120)
  if (!place_id || !name) return null
  return { place_id, name, address: clean(p?.formattedAddress, 200), kind: clean(p?.primaryTypeDisplayName?.text, 60) || null }
}

/** Up to five shops matching a name and city, for the owner to pick from. */
export async function searchShops(q: { name: string; city: string; country: Country }, deps: Deps = {}): Promise<SearchResult> {
  const name = clean(q.name, 120)
  const city = clean(q.city, 80)
  if (name.length < 2 || !city) return { ok: false, reason: 'bad_input' }
  const key = keyOf(deps)
  if (!key) return { ok: false, reason: 'no_key' }
  const region = REGION[q.country]
  try {
    const res = await (deps.fetch ?? fetch)(SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.primaryTypeDisplayName',
      },
      body: JSON.stringify({ textQuery: `${name}, ${city}`, pageSize: MAX_MATCHES, ...(region ? { regionCode: region } : {}) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) {
      console.warn('[shops] places search failed', res.status)
      return { ok: false, reason: 'failed' }
    }
    const body = (await res.json()) as { places?: unknown[] }
    const matches = (Array.isArray(body.places) ? body.places : []).map(toMatch).filter((m): m is ShopMatch => !!m).slice(0, MAX_MATCHES)
    return matches.length ? { ok: true, matches } : { ok: false, reason: 'none' }
  } catch (e) {
    console.warn('[shops] places search threw', e instanceof Error ? e.message : e)
    return { ok: false, reason: 'failed' }
  }
}

/** The shop the owner picked, with what its page and its reviews say. */
export async function shopDetails(placeId: string, deps: Deps = {}): Promise<DetailsResult> {
  const id = clean(placeId, 200)
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(id)) return { ok: false, reason: 'bad_input' }
  const key = keyOf(deps)
  if (!key) return { ok: false, reason: 'no_key' }
  try {
    const res = await (deps.fetch ?? fetch)(DETAILS_URL + encodeURIComponent(id), {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,primaryTypeDisplayName,websiteUri,editorialSummary,reviews',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) {
      console.warn('[shops] place details failed', res.status)
      return { ok: false, reason: res.status === 404 ? 'none' : 'failed' }
    }
    const p = (await res.json()) as any
    const base = toMatch(p)
    if (!base) return { ok: false, reason: 'none' }
    const reviews = (Array.isArray(p?.reviews) ? p.reviews : [])
      .map((r: any) => clean(r?.text?.text, 600))
      .filter(Boolean)
      .slice(0, 5)
    return { ok: true, shop: { ...base, website: clean(p?.websiteUri, 300) || null, summary: clean(p?.editorialSummary?.text, 400) || null, reviews } }
  } catch (e) {
    console.warn('[shops] place details threw', e instanceof Error ? e.message : e)
    return { ok: false, reason: 'failed' }
  }
}
