// Reading a listing (Nov 5 2026). Server only. Three routes behind one box:
//   1. a brokerage or IDX page: schema.org JSON-LD and Open Graph tags carry
//      address, price, beds, baths, sqft, the description and photo captions
//   2. Zillow / Redfin / Realtor.com: these refuse automated fetches most of
//      the time; the fetch is tried once and the fallback is "paste the text"
//   3. pasted text (an MLS sheet, the page copied): facts are pulled by regex
// Nothing is invented: a field we can't read stays null.
import type { Listing } from './listing'

const UA = 'Mozilla/5.0 (compatible; ShutapKit/1.0; +https://shutap.com/realtors)'
const BLOCKED_HOSTS = ['zillow.com', 'redfin.com', 'realtor.com', 'trulia.com', 'homes.com']

export type ReadResult =
  | { ok: true; listing: Listing; how: 'jsonld' | 'og' | 'text'; seen?: string }
  | { ok: false; reason: 'bad_url' | 'blocked' | 'fetch_failed' | 'nothing_found' | 'not_a_listing'; host?: string; seen?: string }

function host(u: string): string | null {
  try { return new URL(u).hostname.replace(/^www\./, '') } catch { return null }
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 400) : null)
const money = (v: unknown): string | null => {
  const n = num(v)
  return n ? '$' + Math.round(n).toLocaleString('en-US') : null
}
function stripTags(s: string): string {
  return s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
}

/** Every JSON-LD block on the page, flattened (graphs included). */
function jsonLd(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    try {
      const j = JSON.parse(m[1]!.trim())
      const items = Array.isArray(j) ? j : j && typeof j === 'object' && Array.isArray((j as any)['@graph']) ? (j as any)['@graph'] : [j]
      for (const it of items) if (it && typeof it === 'object') out.push(it as Record<string, unknown>)
    } catch { /* not json */ }
  }
  return out
}

function meta(html: string, name: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]+content=["']([^"']*)["']`, 'i')
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i')
  const m = re.exec(html) ?? re2.exec(html)
  return m ? stripTags(m[1]!) : null
}

/** Facts from free text: an MLS sheet, a page copied, a portal page's text.
 *  Exact, not guessed: the price is the dollar figure that sits closest to
 *  the beds / baths / sqft block (that is where every portal prints the list
 *  price; fees and taxes sit elsewhere), never a per-month or per-year figure. */
export function factsFromText(text: string): Partial<Listing> {
  const t = text.replace(/\s+/g, ' ')
  const out: Partial<Listing> = {}
  const beds = /([0-9]+(?:\.[0-9])?)\s*(?:bd|bds|bed|beds|bedrooms?|br)\b/i.exec(t)
  if (beds) out.beds = num(beds[1])
  // "2 bath" · "2.5 baths" · "1 Full Baths 1 Half Baths" (Matrix) · "2 full, 1 half"
  const full = /([0-9]+)\s*(?:full\s*)?(?:ba|bath|baths|bathrooms?)\b/i.exec(t)
  const half = /([0-9]+)\s*half\s*(?:ba|bath|baths|bathrooms?)\b/i.exec(t)
  const dec = /([0-9]+\.[0-9])\s*(?:ba|bath|baths|bathrooms?)\b/i.exec(t)
  if (dec) out.baths = num(dec[1])
  else if (full) out.baths = (num(full[1]) ?? 0) + (half ? (num(half[1]) ?? 0) * 0.5 : 0) || null
  // living area, not the lot: skip a figure labelled lot
  const sqRe = /(?<![\d,])([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,5})\s*(lot\s*)?(?:sq\.?\s?ft|sqft|square feet)/gi
  let sm: RegExpExecArray | null
  while ((sm = sqRe.exec(t))) {
    const before = t.slice(Math.max(0, sm.index - 12), sm.index).toLowerCase()
    const after = t.slice(sm.index, sm.index + sm[0].length + 6).toLowerCase()
    if (sm[2] || /\blot\b/.test(before) || /lot\s*sq/.test(after)) { if (out.lot_sqft === undefined) out.lot_sqft = num(sm[1]); continue }
    if (out.sqft === undefined) out.sqft = num(sm[1])
  }
  const hoa = /\bhoa(?:\s*(?:dues|fee|fees))?\s*:?\s*\$\s?([0-9]{1,3}(?:,[0-9]{3})*)(?:\s*(?:\/|per|a)\s*(mo|month|yr|year))?/i.exec(t)
  if (hoa) out.hoa = '$' + hoa[1] + (hoa[2] ? (/^y/i.test(hoa[2]) ? '/year' : '/month') : '/month')
  const tax = /\b(?:taxes|tax)\s*:?\s*\$\s?([0-9]{1,3}(?:,[0-9]{3})*)(?:\s*(?:\/|per|a)\s*(mo|month|yr|year))?/i.exec(t)
  if (tax) out.taxes = '$' + tax[1] + (tax[2] ? (/^m/i.test(tax[2]) ? '/month' : '/year') : '/year')
  const built = /(?:built(?: in)?|year built)[:\s]+((?:18|19|20)[0-9]{2})\b/i.exec(t)
  if (built) out.year_built = num(built[1])
  // the price: every $ figure that is not per month/year/sqft; pick the one
  // nearest the facts block (beds or sqft), else the largest
  const anchor = beds?.index ?? (out.sqft ? t.search(/sq\.?\s?ft|sqft|square feet/i) : -1)
  const priceRe = /\$\s?([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,9})(?!\s*(?:\/|per|a)\s*(?:mo|month|sqft|sq|yr|year|night|day))/gi
  const prices: { n: number; i: number }[] = []
  let pm: RegExpExecArray | null
  while ((pm = priceRe.exec(t))) {
    const n = Number(pm[1]!.replace(/,/g, ''))
    const ctx = t.slice(Math.max(0, pm.index - 24), pm.index).toLowerCase()
    if (/\b(hoa|tax|taxes|fee|fees|dues|deposit|insurance|save|off)\b/.test(ctx)) continue
    prices.push({ n, i: pm.index })
  }
  if (prices.length) {
    const best = anchor >= 0 ? prices.reduce((b, p) => (Math.abs(p.i - anchor) < Math.abs(b.i - anchor) ? p : b)) : prices.reduce((b, p) => (p.n > b.n ? p : b))
    out.price = '$' + best.n.toLocaleString('en-US')
  }
  const addr = /\b([0-9]{1,6}[A-Za-z]?\s+[A-Z][A-Za-z0-9.' ]{2,40}\s(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ct|Court|Ln|Lane|Way|Blvd|Boulevard|Pl|Place|Ter|Terrace|Cir|Circle|Hwy|Highway|Pkwy|Parkway|Trl|Trail|Loop|Walk)\b\.?(?:\s?(?:#|Unit|Apt)\s?[A-Za-z0-9-]+)?)/.exec(t)
  if (addr) out.address = addr[1]!.trim()
  // "San Mateo, CA 94401" · "Atherton, California 94027"
  // the city is the word(s) right before ", <State> <zip>"; when the street
  // address runs straight into it (a portal header), it starts after the
  // street suffix
  const city = /([A-Z][A-Za-z.' ]{2,30}?),\s*(?:[A-Z]{2}|[A-Z][a-z]+(?: [A-Z][a-z]+)?)\s+[0-9]{5}\b/.exec(t)
  if (city) {
    let c = city[1]!.trim()
    const cut = /\b(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ct|Court|Ln|Lane|Way|Blvd|Boulevard|Pl|Place|Ter|Terrace|Cir|Circle|Hwy|Pkwy|Trl|Loop|Walk)\.?\s+(.+)$/.exec(c)
    if (cut) c = cut[1]!.trim()
    if (c && !/\d/.test(c)) out.city = c
  }
  return out
}

function fromJsonLd(items: Record<string, unknown>[]): Partial<Listing> | null {
  const typed = (it: Record<string, unknown>) => String(it['@type'] ?? '').toLowerCase()
  const re = items.find((it) => /(singlefamilyresidence|house|apartment|residence|accommodation|realestatelisting|product|offer)/.test(typed(it)))
  if (!re) return null
  const out: Partial<Listing> = {}
  const addr = (re.address ?? (re as any).itemOffered?.address) as Record<string, unknown> | string | undefined
  if (typeof addr === 'string') out.address = str(addr)
  else if (addr && typeof addr === 'object') {
    out.address = str(addr.streetAddress) ?? null
    out.city = str(addr.addressLocality) ?? null
  }
  const offers = (re.offers ?? re) as Record<string, unknown>
  out.price = money((offers as any).price ?? (re as any).price) ?? null
  out.beds = num((re as any).numberOfRooms ?? (re as any).numberOfBedrooms) ?? null
  out.baths = num((re as any).numberOfBathroomsTotal ?? (re as any).numberOfFullBathrooms) ?? null
  const size = (re as any).floorSize
  out.sqft = num(size && typeof size === 'object' ? size.value : size) ?? null
  out.year_built = num((re as any).yearBuilt) ?? null
  out.description = str((re as any).description) ?? ''
  const imgs = (re as any).image
  const list = Array.isArray(imgs) ? imgs : imgs ? [imgs] : []
  out.photos = list.map((i: any) => str(typeof i === 'string' ? '' : i?.caption ?? i?.name ?? i?.description)).filter(Boolean).slice(0, 20) as string[]
  return out
}

/** Read a listing from a URL. The page is fetched once, briefly. */
export async function readListingUrl(url: string): Promise<ReadResult> {
  const h = host(url)
  if (!h || !/^https?:$/.test(new URL(url).protocol)) return { ok: false, reason: 'bad_url' }
  if (BLOCKED_HOSTS.some((b) => h === b || h.endsWith('.' + b))) {
    // try once anyway: some pages do answer; most don't
    const r = await tryFetch(url, h)
    return r.ok ? r : { ok: false, reason: 'blocked', host: h }
  }
  return tryFetch(url, h)
}

async function tryFetch(url: string, h: string): Promise<ReadResult> {
  let html: string
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 9000)
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,*/*' }, redirect: 'follow', signal: ctrl.signal })
    clearTimeout(t)
    if (!res.ok) return { ok: false, reason: 'fetch_failed', host: h }
    html = (await res.text()).slice(0, 1_500_000)
  } catch {
    return { ok: false, reason: 'fetch_failed', host: h }
  }
  const base: Listing = { source: h, url, address: null, city: null, price: null, beds: null, baths: null, sqft: null, year_built: null, hoa: null, taxes: null, lot_sqft: null, description: '', photos: [], note: '' }
  const ld = fromJsonLd(jsonLd(html))
  const ogTitle = meta(html, 'og:title')
  const ogDesc = meta(html, 'og:description') ?? meta(html, 'description')
  // A page that is all script and boilerplate (an MLS portal, a map app)
  // gives numbers that are not the listing's. Read facts from the page text
  // only when there is real text; otherwise from the OG tags alone.
  const bodyText = stripTags(html)
  const words = bodyText.split(/\s+/).length
  const thin = words < 120
  const seen = `${words} words of page text · title: ${ogTitle ?? meta(html, 'title') ?? '(none)'} · ${bodyText.slice(0, 240)}`
  const textFacts = factsFromText([ogTitle ?? '', ogDesc ?? '', thin ? '' : bodyText.slice(0, 20000)].join(' '))
  const merged: Listing = { ...base, ...textFacts, ...(ld ? Object.fromEntries(Object.entries(ld).filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && !v.length))) : {}) } as Listing
  if (!merged.description) merged.description = ogDesc ?? ''
  if (!merged.address && ogTitle && /\d/.test(ogTitle)) merged.address = ogTitle.split('|')[0]!.trim().slice(0, 120)
  const found = [merged.address, merged.price, merged.beds, merged.description].filter(Boolean).length
  // a thin page with no description and no structured data is a guess, not a read
  if (found < 2 || (thin && !ld && !merged.description)) return { ok: false, reason: 'nothing_found', host: h, seen }
  return { ok: true, listing: merged, how: ld ? 'jsonld' : 'og', seen }
}

/** Read a listing from pasted text. */
export function readListingText(text: string, source = 'pasted'): ReadResult {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length < 40) return { ok: false, reason: 'nothing_found' }
  const facts = factsFromText(clean)
  const listing: Listing = { source, url: null, address: null, city: null, price: null, beds: null, baths: null, sqft: null, year_built: null, hoa: null, taxes: null, lot_sqft: null, description: clean.slice(0, 3000), photos: [], note: '', ...facts }
  if (![listing.price, listing.beds, listing.address, listing.sqft].some(Boolean)) return { ok: false, reason: 'not_a_listing' }
  return { ok: true, listing, how: 'text' }
}
