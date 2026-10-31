// New bits per Pacific day, by tier. Safe to import in the browser.
// Only new bits count: hotter, tighter, storytelling, mix and angle swap are free on
// any bit the person made (each bit is capped at MAX_VERSIONS versions).
// Pro's fair-use cap lives on the server only (usage.server.ts), so the
// browser never shows a number for "unlimited".
import type { BitTier } from './shared'

export const BIT_CAPS: Record<Exclude<BitTier, 'pro'>, number> = {
  guest: 1,
  free: 2, // counting the bit written as a guest earlier that day
  basic: 5,
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
