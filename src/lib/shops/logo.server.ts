// Fetch a business's icon from the website the owner gave. Server only.
// Never throws: a site that is slow, blocks us or has no icon gives null and
// the end card simply shows no logo. Only the owner's own typed website is
// ever fetched, and only public web addresses (see siteUrl).
import { LOGO_MAX_BYTES, LOGO_TYPES, iconLinks, siteUrl } from './logo'

async function get(url: string, ms: number): Promise<Response | null> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    const r = await fetch(url, { signal: ctl.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (compatible; ShutapBot/1.0; +https://shutap.com)', accept: '*/*' } })
    // a redirect must still end on a public web address
    return r.ok && siteUrl(r.url || url) ? r : null
  } catch { return null } finally { clearTimeout(t) }
}

function base64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

export async function fetchSiteLogo(website: string | null): Promise<{ logo: string | null; why: string }> {
  const site = siteUrl(website)
  if (!site) return { logo: null, why: 'no_site' }
  const page = await get(site.href, 5000)
  const html = page ? await page.text().catch(() => '') : ''
  const base = page?.url ? new URL(page.url) : site
  for (const href of iconLinks(html, base).slice(0, 5)) {
    const r = await get(href, 4000)
    if (!r) continue
    const type = (r.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase()
    const kind = LOGO_TYPES.includes(type) ? type : /\.ico(\?|$)/i.test(href) ? 'image/x-icon' : /\.png(\?|$)/i.test(href) ? 'image/png' : /\.svg(\?|$)/i.test(href) ? 'image/svg+xml' : ''
    if (!kind) continue
    const buf = new Uint8Array(await r.arrayBuffer().catch(() => new ArrayBuffer(0)))
    if (buf.length < 100 || buf.length > LOGO_MAX_BYTES) continue
    return { logo: `data:${kind};base64,${base64(buf)}`, why: 'found' }
  }
  return { logo: null, why: page ? 'no_icon' : 'no_page' }
}
