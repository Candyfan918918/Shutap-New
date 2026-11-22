// Which guide and funniest pages get the small-business box (Nov 21 2026,
// Candy): pages about small business content send owners to /smallbusiness
// with their business name and city already typed. A page qualifies by its
// slug, or by its heading and opening naming small businesses or owners.
// Safe in the browser.
const SLUGS = new Set(['funny-content-ideas-for-small-business', 'funny-social-media-content-plan'])
const RE = /\b(small[ -]business(es)?|business owners?|shop owners?|store owners?|local business(es)?)\b/i

export function isSmallBusinessContent(slug: string, ...texts: Array<string | null | undefined>): boolean {
  const s = slug.split('/').pop() ?? slug
  return SLUGS.has(s) || RE.test(texts.filter(Boolean).join(' '))
}
