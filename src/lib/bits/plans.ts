// New bits per Pacific day, by tier. Safe to import in the browser.
// Only new bits count: hotter, tighter, escalate, mix and tag swap are free on
// any bit the person made (each bit is capped at MAX_VERSIONS versions).
// Pro's fair-use cap lives on the server only (usage.server.ts), so the
// browser never shows a number for "unlimited".
import type { BitTier } from './shared'

export const BIT_CAPS: Record<Exclude<BitTier, 'pro'>, number> = {
  guest: 1,
  free: 2, // counting the bit written as a guest earlier that day
  basic: 5,
}
