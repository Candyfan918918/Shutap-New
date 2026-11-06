// Which product a page's box should be (Nov 6 2026): a guide or funniest
// page about listings, open houses, agents or loan officers gets the
// realtor listing box; everything else gets the bit box. Safe in the browser.
const RE = /\b(realtors?|real[ -]estate|listings?|open[ -]houses?|loan officers?|mortgage|brokerages?|just listed|home (buyers?|sellers?)|house hunting|homebuying)\b/i

export function isRealtorContent(...texts: Array<string | null | undefined>): boolean {
  return RE.test(texts.filter(Boolean).join(' '))
}
