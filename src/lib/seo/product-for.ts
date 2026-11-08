// Which Shutap product a funniest page puts in front of its reader (Nov 6 2026):
// a page about listings, agents or loan officers gets Shutap for Realtors; a
// page about a toast or speech (best man, maid of honor, parents, Thanksgiving,
// holidays, New Year…) gets Shutap Toasts, opened on that occasion; everything
// else gets Shutap Bits (the homepage box). An entry can force one with
// `product`. Safe in the browser.
import { isRealtorContent } from '@/lib/realtors/is-realtor'
import type { Occasion } from '@/lib/toasts/shared'

export type PageProduct =
  | { kind: 'bits' }
  | { kind: 'realtors' }
  | { kind: 'toasts'; href: string; search?: { occasion: Occasion }; occasionLabel: string }

const TOAST_RE = /\b(toasts?|speech(es)?|best[ -]man|maid[ -]of[ -]honou?r|bridesmaid|groomsm[ae]n|wedding|bride|groom|officiant|thanksgiving|christmas|holiday[ -]party|new[ -]years?|retirement|birthday|toastmasters?)\b/i

function toastTarget(text: string): PageProduct {
  const t = text.toLowerCase()
  const to = (href: string, occasionLabel: string, occasion?: Occasion): PageProduct => ({
    kind: 'toasts',
    href,
    occasionLabel,
    ...(occasion ? { search: { occasion } } : {}),
  })
  // Nov 8 2026: every occasion has its own page with a real toast for exactly
  // that occasion; the hub is only for pages about toasts in general.
  if (/best[ -]man|groomsm/.test(t)) return to('/toasts/best-man', 'best man speech')
  if (/maid[ -]of[ -]honou?r|bridesmaid/.test(t)) return to('/toasts/maid-of-honor', 'maid of honor speech')
  if (/thanksgiving/.test(t)) return to('/toasts/thanksgiving', 'Thanksgiving toast')
  if (/holiday[ -]party|office|end[ -]of[ -]year/.test(t)) return to('/toasts/office-holiday-party', 'holiday party toast')
  if (/christmas|xmas/.test(t)) return to('/toasts/christmas', 'Christmas toast')
  if (/chinese|lunar/.test(t)) return to('/toasts/any-occasion', 'Lunar New Year toast')
  if (/new[ -]years?/.test(t)) return to('/toasts/new-years', "New Year's toast")
  if (/mother|mom\b/.test(t)) return to('/toasts/mother-of-the-bride', 'mother of the bride speech')
  if (/father|dad\b|parent/.test(t)) return to('/toasts/father-of-the-bride', 'father of the bride speech')
  if (/retirement/.test(t)) return to('/toasts/retirement', 'retirement speech')
  if (/birthday/.test(t)) return to('/toasts/birthday', 'birthday toast')
  if (/toastmasters?/.test(t)) return to('/toasts/any-occasion', 'Toastmasters speech')
  if (/wedding|bride|groom|officiant/.test(t)) return to('/toasts', 'wedding toast')
  return to('/toasts', 'toast')
}

export function productFor(entry: { slug: string; category: string; product?: 'bits' | 'realtors' | 'toasts' }): PageProduct {
  const text = `${entry.slug.replace(/-/g, ' ')} ${entry.category}`
  if (entry.product === 'bits') return { kind: 'bits' }
  if (entry.product === 'realtors') return { kind: 'realtors' }
  if (entry.product === 'toasts') return toastTarget(text)
  if (isRealtorContent(text)) return { kind: 'realtors' }
  if (TOAST_RE.test(text)) return toastTarget(text)
  return { kind: 'bits' }
}
