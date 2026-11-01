// New bits per Pacific day, by tier. Safe to import in the browser.
// Nov 1 2026: signing in comes before the first bit (guests write none).
// Free is one bit a day, as written: rewrites (hotter, tighter, storytelling),
// crowd-work swaps and mix your own are Basic and Pro only. On Basic a
// rewrite counts as a new bit (swap and mix don't; no model call).
// Pro's fair-use cap lives on the server only (usage.server.ts), so the
// browser never shows a number for "unlimited".
import type { BitTier } from './shared'

export const BIT_CAPS: Record<Exclude<BitTier, 'pro'>, number> = {
  guest: 0, // sign in first
  free: 1,
  basic: 3,
}

/** Downloads a day. A download is one of: the caption + hashtags (copied),
 *  the picture or script PDF, the 5-second video. Each kind counts on its
 *  own; a second copy of the same version in the same day is free. Pro has
 *  no cap. Guests can't download at all (sign-in first). */
export const DOWNLOAD_CAPS: Record<Exclude<BitTier, 'pro' | 'guest'>, number> = {
  free: 1,
  basic: 3,
}
export const DOWNLOAD_KINDS = ['caption', 'image', 'pdf', 'video'] as const
export type DownloadKind = (typeof DOWNLOAD_KINDS)[number]
