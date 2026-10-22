// The Pacific calendar day. Daily bit limits and the admin daily report both
// reset at midnight in Los Angeles, for everyone, whatever their own timezone.
// One copy of the date math, so the two can never disagree.

export const PACIFIC_TZ = 'America/Los_Angeles'

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: PACIFIC_TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: PACIFIC_TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/** 'YYYY-MM-DD' for the Pacific calendar day containing this instant. */
export function pacificDay(at: number | Date = Date.now()): string {
  return dayFmt.format(typeof at === 'number' ? new Date(at) : at)
}

/** The day `days` after (or before, if negative) a 'YYYY-MM-DD' key. */
export function shiftDay(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** The UTC instant (ms) of midnight in Los Angeles on the given 'YYYY-MM-DD'. */
export function pacificMidnight(key: string): number {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number]
  const guess = Date.UTC(y, m - 1, d)
  let start = guess
  // Two passes settle the offset, including on the days the clocks change.
  for (let i = 0; i < 2; i++) {
    const p = Object.fromEntries(partsFmt.formatToParts(new Date(start)).map((x) => [x.type, x.value]))
    const shown = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour! % 24, +p.minute!, +p.second!)
    start += guess - shown
  }
  return start
}

/** ISO string of the next Pacific midnight after this instant: when the day's
 *  limits reset. */
export function nextPacificMidnight(at: number | Date = Date.now()): string {
  const ms = typeof at === 'number' ? at : at.getTime()
  return new Date(pacificMidnight(shiftDay(pacificDay(ms), 1))).toISOString()
}
