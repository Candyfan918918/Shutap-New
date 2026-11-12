// New bits per Pacific day, by tier. Safe to import in the browser.
// Nov 12 2026 (Candy): a guest makes one bit and sees it before signing in
// (supersedes Nov 1's sign-in first). Only from their own words (the story
// box cut into five lines, no writer); watching, rehearsing, the sketch, the
// skit, saving and versions all take an account.
// Free is one bit a day, as written: rewrites (hotter, tighter, storytelling),
// crowd-work swaps and mix your own are Basic and Pro only. On Basic a
// rewrite counts as a new bit (swap and mix don't; no model call).
// Pro's fair-use cap lives on the server only (usage.server.ts), so the
// browser never shows a number for "unlimited".
import type { BitTier } from './shared'

export const BIT_CAPS: Record<Exclude<BitTier, 'pro'>, number> = {
  guest: 1, // one bit, readable; everything done with it takes an account
  free: 1,
  basic: 3,
}

/** Downloads. Free: 1 a day, watermarked. Basic (Nov 5 2026): a pool of 20 a
 *  month, shared by everything a person takes (a video, a picture, a PDF, a
 *  copied line; later a realtor kit = 6). Pro: no cap. A download is one of
 *  ('caption' stays in the kind list for the ledger's history) the picture,
 *  the PDF, the video. The same kind on the same version the same day is
 *  free. Guests can't download at all (sign-in first). */
export const DOWNLOAD_CAPS: Record<Exclude<BitTier, 'pro' | 'guest'>, number> = {
  free: 1,
  basic: 20,
}
export const DOWNLOAD_PERIOD: Record<Exclude<BitTier, 'pro' | 'guest'>, 'day' | 'month'> = {
  free: 'day',
  basic: 'month',
}
export const DOWNLOAD_KINDS = ['caption', 'image', 'pdf', 'video'] as const
export type DownloadKind = (typeof DOWNLOAD_KINDS)[number]
