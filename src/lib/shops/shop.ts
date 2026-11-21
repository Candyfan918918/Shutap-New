// Shutap for small business (Nov 21 2026, approved by Candy): the choices an
// owner makes and the small rules behind the screens, in one place. Pure and
// safe in the browser: no secrets, no server calls.
//
// The brief: claude/smallbusiness/smallbusiness-build-brief.md in the Project.
// An owner says one thing that happened at the shop, picks one of three
// skits, approves the lines, films 3 clips on their phone and gets one
// vertical video with the text on screen. Funny only; the owner picks the
// kind of funny. Shutap drafts; the owner steers and decides.

/** What kind of business (required): a café, a salon and a car shop get
 *  different skits. */
export const BUSINESS_TYPES = [
  { key: 'cafe', name: 'Café or coffee shop' },
  { key: 'salon', name: 'Beauty salon' },
  { key: 'auto', name: 'Car shop' },
  { key: 'restaurant', name: 'Restaurant' },
  { key: 'barber', name: 'Barber shop' },
  { key: 'store', name: 'Boutique or store' },
  { key: 'gym', name: 'Gym or studio' },
  { key: 'other', name: 'Something else' },
] as const
export type BusinessType = (typeof BUSINESS_TYPES)[number]['key']
export const BUSINESS_TYPE_KEYS = BUSINESS_TYPES.map((t) => t.key) as [BusinessType, ...BusinessType[]]

/** Country (required). 'other' is "Another country". */
export const COUNTRIES = [
  { key: 'us', name: 'United States' },
  { key: 'ca', name: 'Canada' },
  { key: 'uk', name: 'United Kingdom' },
  { key: 'au', name: 'Australia' },
  { key: 'other', name: 'Another country' },
] as const
export type Country = (typeof COUNTRIES)[number]['key']
export const COUNTRY_KEYS = COUNTRIES.map((c) => c.key) as [Country, ...Country[]]

/** The kind of funny. There is no not-funny option. */
export const VOICES = [
  { key: 'dry', name: 'Dry and deadpan' },
  { key: 'warm', name: 'Warm and friendly' },
  { key: 'sassy', name: 'Sassy' },
  { key: 'goofy', name: 'Big and goofy' },
] as const
export type Voice = (typeof VOICES)[number]['key']
export const VOICE_KEYS = VOICES.map((v) => v.key) as [Voice, ...Voice[]]

/** Video length in seconds. */
export const LENGTHS = [7, 15, 30] as const
export type Length = (typeof LENGTHS)[number]
export const DEFAULT_LENGTH: Length = 15

/** Who is on camera. It changes the skit itself, not only the filming tip:
 *  'me' gets one-person skits, 'faceless' gets hands and products only. */
export const CAMERAS = [
  { key: 'me', name: 'Me' },
  { key: 'team', name: 'Me + team' },
  { key: 'faceless', name: 'No faces' },
] as const
export type Camera = (typeof CAMERAS)[number]['key']
export const CAMERA_KEYS = CAMERAS.map((c) => c.key) as [Camera, ...Camera[]]

export type Facing = 'front' | 'back'

/** The camera the film screen opens on. The owner can always flip it. */
export function defaultFacing(camera: Camera): Facing {
  return camera === 'me' ? 'front' : 'back'
}

/** The one-line filming tip under each shot. */
export function cameraTip(camera: Camera, facing: Facing): string {
  const lead = facing === 'front' ? 'Front camera. ' : 'Back camera. '
  if (camera === 'me') return lead + (facing === 'front' ? 'Prop your phone up. You play every part.' : 'Prop your phone up and step in front.')
  if (camera === 'team') return lead + (facing === 'front' ? 'Hold it out and squeeze everyone in.' : 'One of you films, the rest act.')
  return lead + (facing === 'front' ? 'Flip back to keep faces out.' : 'Hands and products only. No faces.')
}

/** The code word customers say in the shop, so the owner sees who a video
 *  brought in. 'none' stays an option: some owners have nothing to give away. */
export const OFFERS = [
  { key: 'none', name: 'No code word' },
  { key: 'freebie', name: 'A freebie for saying it' },
  { key: 'promotion', name: 'A promotion for saying it' },
] as const
export type Offer = (typeof OFFERS)[number]['key']
export const OFFER_KEYS = OFFERS.map((o) => o.key) as [Offer, ...Offer[]]

/** The last line of the video. `gift` is what the owner typed (the freebie
 *  or the promotion); with none typed the line stops at the invitation.
 *  Returns null when the owner chose no code word. */
export function codeWordLine(offer: Offer, word: string, gift: string): string | null {
  if (offer === 'none') return null
  const w = word.trim()
  if (!w) return null
  const g = gift.trim().replace(/[.!\s]+$/, '')
  return `Say “${w}” when you come in${g ? ` for ${g}` : ''}.`
}

/** How many lines the owner approves: the hook, one per shot, and the code
 *  word line unless they chose none. */
export function lineCount(offer: Offer): number {
  return offer === 'none' ? 4 : 5
}
export const SHOTS = 3

/* ─────────────────────────── the week ───────────────────────────
   The goal is 3 posted videos a week; 5 unlocks that week's badge. A send to
   TikTok or a save to the phone each count once per video (Shutap cannot see
   whether a saved video was posted, so the count trusts the owner). */
export const WEEK_GOAL = 3
export const WEEK_BADGE = 5

export type WeekStatus = { posted: number; goalMet: boolean; badge: boolean; toGoal: number; toBadge: number }

export function weekStatus(posted: number): WeekStatus {
  const n = Math.max(0, Math.floor(posted))
  return { posted: n, goalMet: n >= WEEK_GOAL, badge: n >= WEEK_BADGE, toGoal: Math.max(0, WEEK_GOAL - n), toBadge: Math.max(0, WEEK_BADGE - n) }
}

/** The Monday ('YYYY-MM-DD') that starts the week containing a day key. A
 *  new week starts Monday. */
export function weekStart(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number) as [number, number, number]
  const t = new Date(Date.UTC(y, m - 1, d))
  const back = (t.getUTCDay() + 6) % 7 // Monday = 0
  t.setUTCDate(t.getUTCDate() - back)
  return t.toISOString().slice(0, 10)
}

/* ─────────────────────── keeping and deleting ───────────────────────
   Finished videos are kept 30 days, then deleted; My creations says so on
   each one. The raw clips are deleted as soon as the video is made. */
export const KEEP_DAYS = 30

/** The day ('YYYY-MM-DD') a video made on `madeDay` is deleted. */
export function deleteDay(madeDay: string): string {
  const [y, m, d] = madeDay.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d + KEEP_DAYS)).toISOString().slice(0, 10)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** What My creations shows under a video: "Deletes Dec 21", "Deletes
 *  tomorrow" on its last full day, "Deletes today" on the day itself.
 *  `soon` marks the last two so the screen can highlight them. */
export function deleteLabel(madeDay: string, today: string): { text: string; soon: boolean } {
  const due = deleteDay(madeDay)
  const days = Math.round((Date.parse(due) - Date.parse(today)) / 86_400_000)
  if (days <= 0) return { text: 'Deletes today', soon: true }
  if (days === 1) return { text: 'Deletes tomorrow', soon: true }
  const [, m, d] = due.split('-').map(Number) as [number, number, number]
  return { text: `Deletes ${MONTHS[m - 1]} ${d}`, soon: false }
}
