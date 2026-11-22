// Shutap for small business: finding a business's logo on its own website
// (Nov 21 2026). Pure: reads a page's HTML and says which icon to fetch.
// The fetching is in logo.server.ts.

/** A website as typed ("yourbusiness.com") as a URL we may fetch, or null.
 *  Public web addresses only: no IP numbers, no local or internal names. */
export function siteUrl(typed: string | null | undefined): URL | null {
  const t = (typed ?? '').trim()
  if (!t) return null
  let u: URL
  try { u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`) } catch { return null }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const h = u.hostname.toLowerCase()
  if (!h.includes('.') || /^[\d.]+$/.test(h) || h.includes(':') || h.startsWith('[')) return null
  if (/(^|\.)(localhost|local|internal|lan|home|corp|test|invalid|example)$/.test(h)) return null
  if (u.username || u.password) return null
  return u
}

type Found = { href: string; score: number }

/** The icons a page offers, best first: the touch icon (a square made to be
 *  shown big), then the largest declared icon, then the plain favicon. */
export function iconLinks(html: string, base: URL): string[] {
  const found: Found[] = []
  for (const tag of html.slice(0, 400_000).match(/<link\b[^>]*>/gi) ?? []) {
    const attr = (n: string) => new RegExp(`\\b${n}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag)?.slice(1).find((x) => x !== undefined) ?? ''
    const rel = attr('rel').toLowerCase()
    const href = attr('href').trim()
    // a mask icon is a one-colour silhouette, not a logo
    if (!href || href.startsWith('data:') || !/icon/.test(rel) || /mask-icon/.test(rel)) continue
    const size = Number(/(\d+)x\d+/.exec(attr('sizes'))?.[1] ?? 0)
    let score = /apple-touch-icon/.test(rel) ? 1000 + (size || 180) : size || 16
    if (/\.svg(\?|$)/i.test(href)) score += 300
    try { const u = new URL(href, base); if (siteUrl(u.href)) found.push({ href: u.href, score }) } catch { /* skip */ }
  }
  found.sort((a, b) => b.score - a.score)
  const out = [...new Set(found.map((f) => f.href))].slice(0, 4)
  for (const p of ['/apple-touch-icon.png', '/favicon.ico']) { const u = new URL(p, base).href; if (!out.includes(u)) out.push(u) }
  return out
}

export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
/** the stored logo is at most this many bytes of image */
export const LOGO_MAX_BYTES = 150_000
export const LOGO_DATA = /^data:image\/(png|jpeg|webp|gif|svg\+xml|x-icon|vnd\.microsoft\.icon);base64,[A-Za-z0-9+/=]+$/
