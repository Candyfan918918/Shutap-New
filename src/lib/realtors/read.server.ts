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
  | { ok: true; listing: Listing; how: 'jsonld' | 'og' | 'text' | 'card'; seen?: string }
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


/** A results page that lists many homes (an MLS "Matrix" portal link an
 *  agent sends a client, a brokerage search page). Each home is one card;
 *  the "#3" at the end of the link is the card the agent was looking at
 *  (1-based). Fields are read from the card's own labels, so the price is
 *  the card's price and never a filter-menu option. */
export function cardsFromHtml(html: string): string[] {
  const starts: number[] = []
  const re = /<div[^>]+class="[^"]*\bmultiLineDisplay\b[^"]*"/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) starts.push(m.index)
  if (!starts.length) return []
  const out: string[] = []
  for (let i = 0; i < starts.length; i++) {
    const raw = html.slice(starts[i]!, starts[i + 1] ?? starts[i]! + 60000)
    const text = raw
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' | ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
      .replace(/(\s*\|\s*)+/g, ' | ').replace(/\s+/g, ' ').trim()
    // a real card has a price or an address; menus and headers don't
    if (/\$\s?[0-9]{1,3}(?:,[0-9]{3})+/.test(text) && /\b(Beds?|SqFt|Baths?)\b/i.test(text)) out.push(text)
  }
  return out
}

/** Which card the link points at: "...#3" → 2. Default the first. */
export function cardIndexFromUrl(url: string): number {
  const m = /#(\d{1,3})$/.exec(url)
  const n = m ? Number(m[1]) - 1 : 0
  return n >= 0 ? n : 0
}

/** Facts from one card's text, read label by label ("2 | Beds", "1,340 |
 *  SqFt", "5,000 | Lot SqFt", "Built in | 1957"). Nothing is guessed. */
export function factsFromCard(text: string): Partial<Listing> {
  const out: Partial<Listing> = {}
  const t = text
  const grab = (re: RegExp) => re.exec(t)?.[1] ?? null
  const money = grab(/\$\s?([0-9]{1,3}(?:,[0-9]{3})+)(?!\s*\/)/)
  if (money) out.price = '$' + money
  out.beds = num(grab(/\b([0-9]{1,2})\s*\|\s*Beds?\b/i))
  const full = grab(/\b([0-9]{1,2})\s*\|\s*Full Baths?\b/i)
  const half = grab(/\b([0-9]{1,2})\s*\|\s*Half Baths?\b/i)
  const baths = grab(/\b([0-9]{1,2}(?:\.[0-9])?)\s*\|\s*Baths?\b/i)
  out.baths = full ? (num(full) ?? 0) + (half ? (num(half) ?? 0) * 0.5 : 0) : num(baths)
  out.sqft = num(grab(/\b([0-9]{1,3}(?:,[0-9]{3})*|[0-9]{3,5})\s*\|\s*SqFt\b/i))
  out.lot_sqft = num(grab(/\b([0-9]{1,3}(?:,[0-9]{3})*|[0-9]{3,6})\s*\|\s*Lot SqFt\b/i))
  const lotAcres = grab(/\b([0-9]+(?:\.[0-9]+)?)\s*\|\s*(?:Lot )?Acres?\b/i)
  if (!out.lot_sqft && lotAcres) out.lot_sqft = Math.round(Number(lotAcres) * 43560)
  out.year_built = num(grab(/Built in\s*\|\s*((?:18|19|20)[0-9]{2})\b/i) ?? grab(/Year Built\s*:?\s*\|?\s*((?:18|19|20)[0-9]{2})\b/i))
  out.mls = grab(/MLS\s*#?\s*:?\s*\|\s*([A-Z]{0,4}[0-9]{6,12})\b/i)
  out.status = grab(/\|\s*(Active|Pending|Contingent|Sold|Coming Soon|Active Under Contract)\s*\|/i)
  // "230 Selby Ln | Atherton, California 94027"
  const addr = /\|\s*([0-9]{1,6}[A-Za-z]?\s+[A-Za-z0-9.' ]{2,60}?)\s*\|\s*([A-Z][A-Za-z.' ]{2,40}?),\s*(?:[A-Z]{2}|[A-Z][a-z]+(?: [A-Z][a-z]+)?)\s+[0-9]{5}\b/.exec(t)
  if (addr) { out.address = addr[1]!.trim(); out.city = addr[2]!.trim() }
  // open houses: "In Person | 11/07/2026 | 2:00PM-4:00PM"
  const oh: string[] = []
  const ohRe = /\b((?:0?[1-9]|1[0-2])\/(?:0?[1-9]|[12][0-9]|3[01])\/20[0-9]{2})\s*\|\s*([0-9]{1,2}:[0-9]{2}\s?[AP]M\s?[-–]\s?[0-9]{1,2}:[0-9]{2}\s?[AP]M)/gi
  let om: RegExpExecArray | null
  while ((om = ohRe.exec(t)) && oh.length < 10) oh.push(`${om[1]} ${om[2]!.replace(/\s+/g, '')}`)
  out.open_houses = oh
  const hoa = /\bHOA(?:\s*(?:Fee|Dues))?\s*\|?\s*\$\s?([0-9]{1,3}(?:,[0-9]{3})*)/i.exec(t)
  if (hoa) out.hoa = '$' + hoa[1] + '/month'
  // the description is the longest prose run (sentences, not labels)
  const prose = t.split(' | ').map((x) => x.trim()).filter((x) => x.length > 60 && /[a-z]{3}/.test(x) && !/\$/.test(x))
  if (prose.length) out.description = prose.sort((a, b) => b.length - a.length)[0]!.slice(0, 3000)
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
  const base: Listing = { source: h, url, address: null, city: null, price: null, beds: null, baths: null, sqft: null, year_built: null, hoa: null, taxes: null, lot_sqft: null, mls: null, status: null, open_houses: [], description: '', photos: [], note: '' }
  // a results page with many homes: read the one card the link points at
  const cards = cardsFromHtml(html)
  if (cards.length) {
    const idx = Math.min(cardIndexFromUrl(url), cards.length - 1)
    const facts = factsFromCard(cards[idx]!)
    const listing: Listing = { ...base, ...facts } as Listing
    const seen = `${cards.length} homes on this page · reading #${idx + 1} · ${cards[idx]!.slice(0, 300)}`
    if (listing.price || listing.address) return { ok: true, listing, how: 'card', seen }
  }
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
  const listing: Listing = { source, url: null, address: null, city: null, price: null, beds: null, baths: null, sqft: null, year_built: null, hoa: null, taxes: null, lot_sqft: null, mls: null, status: null, open_houses: [], description: clean.slice(0, 3000), photos: [], note: '', ...facts }
  if (![listing.price, listing.beds, listing.address, listing.sqft].some(Boolean)) return { ok: false, reason: 'not_a_listing' }
  return { ok: true, listing, how: 'text' }
}
