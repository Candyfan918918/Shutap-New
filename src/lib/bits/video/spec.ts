// The 5-second video: what goes on screen, decided from the bit and the
// story. Pure, so it is unit-tested; the drawing is in draw.ts.
//
// Style is the daily @ShutapOfficial series: a light gradient stage, a black
// pill, the hook huge in two colours, numbered tag rows, the button in a
// white box, a flat-cartoon scene of the roles in the story, the tagline on
// the ding. Each version gets its own palette and motion seed so two videos
// never look like the same template.
import type { BitVersion } from '@/lib/bits/shared'

export const VIDEO_W = 1080
export const VIDEO_H = 1920
export const VIDEO_FPS = 30
export const VIDEO_SECONDS = 5
export const VIDEO_FRAMES = VIDEO_FPS * VIDEO_SECONDS

export type SceneKind = 'kitchen' | 'office' | 'living' | 'phone' | 'car' | 'generic'
export type Role = 'partner' | 'parent' | 'boss' | 'coworker' | 'roommate' | 'kid' | 'landlord' | 'friend' | 'stranger' | 'me'

export type Palette = {
  /** stage gradient, top to bottom */
  stage: [string, string, string]
  /** hook line one / line two */
  hookA: string
  hookB: string
  /** badge colours for tag 1 / tag 2 */
  badge1: string
  badge2: string
  /** the button's accent word and the tagline */
  accent: string
  pill: string
}

export const PALETTES: Palette[] = [
  { stage: ['#ffe9dc', '#fff6ee', '#f7f2ea'], hookA: '#0b6b45', hookB: '#d62f3a', badge1: '#2f6db5', badge2: '#d9a441', accent: '#d62f3a', pill: '#1d1a1a' },
  { stage: ['#e9f3ff', '#f7fbff', '#f3f0ea'], hookA: '#1d3f8f', hookB: '#e0508a', badge1: '#0b6b45', badge2: '#f2a93b', accent: '#c1216b', pill: '#1d1a1a' },
  { stage: ['#fde3ee', '#fff7fa', '#f6f1ee'], hookA: '#0b080f', hookB: '#c1216b', badge1: '#2f6db5', badge2: '#0b6b45', accent: '#c1216b', pill: '#0b080f' },
  { stage: ['#eef8ec', '#f9fdf7', '#f5f2ec'], hookA: '#245b3c', hookB: '#d9522b', badge1: '#1d3f8f', badge2: '#d9a441', accent: '#d9522b', pill: '#1d1a1a' },
]

export type VideoSpec = {
  /** the hook, split into two lines for the two colours */
  hook: [string, string]
  /** up to two tags, cut to twenty-two words (three lines on screen) */
  tags: string[]
  /** the button; the last clause is the accent */
  button: { lead: string; accent: string }
  tagline: string
  scene: SceneKind
  role: Role
  palette: Palette
  /** 0..1 seeds for motion and character variants */
  seed: number
  /** cue times in seconds */
  cues: { pill: number; hook: number; tag1: number; tag2: number; button: number; tagline: number }
}

/** A stable 0..1 from a string (the version id), so a version always renders the same. */
export function seedFrom(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

const SCENE_WORDS: [SceneKind, RegExp][] = [
  ['kitchen', /\b(dish|dishes|pan|pot|stove|sink|fridge|kitchen|cook|oven|microwave|leftover|dinner|lunch|breakfast|coffee)\b/i],
  ['office', /\b(boss|manager|meeting|office|email|slack|zoom|coworker|co-worker|deck|desk|hr|client|interview|job|work)\b/i],
  ['car', /\b(car|drive|driving|parking|traffic|uber|lyft|freeway|highway|gas)\b/i],
  ['phone', /\b(text|texted|group chat|dm|message|messaged|phone|call|called|instagram|tiktok|comment)\b/i],
  ['living', /\b(couch|tv|remote|living room|apartment|roommate|landlord|rent|laundry|bathroom|bed|sleep)\b/i],
]

const ROLE_WORDS: [Role, RegExp][] = [
  ['partner', /\b(husband|wife|boyfriend|girlfriend|partner|fianc[ée]e?|spouse|my ex)\b/i],
  ['parent', /\b(mom|mother|dad|father|mother-in-law|father-in-law|in-law|grandma|grandpa|aunt|uncle)\b/i],
  ['boss', /\b(boss|manager|ceo|supervisor|team lead|director)\b/i],
  ['coworker', /\b(coworker|co-worker|colleague|intern|hr)\b/i],
  ['roommate', /\b(roommate|flatmate|housemate)\b/i],
  ['kid', /\b(my son|my daughter|my kid|my kids|toddler|baby|my child)\b/i],
  ['landlord', /\b(landlord|hoa|neighbor|neighbour)\b/i],
  ['friend', /\b(friend|bestie|buddy|cousin|sister|brother)\b/i],
  ['stranger', /\b(barista|waiter|cashier|driver|customer|guy|woman|man|stranger|courier|delivery)\b/i],
]

export function sceneFor(story: string): SceneKind {
  for (const [k, re] of SCENE_WORDS) if (re.test(story)) return k
  return 'generic'
}
export function roleFor(story: string): Role {
  for (const [k, re] of ROLE_WORDS) if (re.test(story)) return k
  return 'me'
}

/** Split the hook into two lines of roughly equal width, breaking at a word. */
export function splitHook(hook: string): [string, string] {
  const words = hook.replace(/\s+/g, ' ').trim().split(' ')
  if (words.length < 3) return [words.join(' '), '']
  let best = 1
  let bestDiff = Infinity
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ').length
    const b = words.slice(i).join(' ').length
    const diff = Math.abs(a - b)
    if (diff < bestDiff) {
      bestDiff = diff
      best = i
    }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')]
}

/** Cut a line to `n` words, ending on the last complete word. */
export function cutWords(line: string, n: number): string {
  const words = line.replace(/\s+/g, ' ').trim().split(' ')
  if (words.length <= n) return words.join(' ')
  return words.slice(0, n).join(' ').replace(/[,;:]$/, '') + '…'
}

/** The button: everything up to the last colon or quote is the lead; the rest is the accent. */
export function splitButton(button: string): { lead: string; accent: string } {
  const t = button.trim()
  const m = t.match(/^(.*?[:—–-]\s*)(["“].+["”]\.?|.+)$/)
  if (m && m[1].length < t.length - 3 && m[2].split(' ').length <= 8) return { lead: m[1].trim(), accent: m[2].trim() }
  const words = t.split(' ')
  if (words.length <= 5) return { lead: '', accent: t }
  const k = Math.max(2, Math.min(5, Math.round(words.length * 0.35)))
  return { lead: words.slice(0, -k).join(' '), accent: words.slice(-k).join(' ') }
}

export function buildSpec(v: Pick<BitVersion, 'id' | 'hook' | 'tags' | 'button'>, story: string): VideoSpec {
  const seed = seedFrom(v.id)
  const palette = PALETTES[Math.floor(seed * PALETTES.length) % PALETTES.length]!
  const tags = v.tags.slice(0, 2).map((t) => cutWords(t, 22))
  // Motion seeds nudge the cue times a little so two videos never move in lockstep.
  const j = (seed * 7919) % 1
  return {
    hook: splitHook(v.hook),
    tags,
    button: splitButton(v.button),
    tagline: 'Say it funnier.',
    scene: sceneFor(story),
    role: roleFor(story),
    palette,
    seed,
    cues: {
      pill: 0.0,
      hook: 0.18 + j * 0.08,
      tag1: 0.9 + j * 0.15,
      tag2: tags.length > 1 ? 2.0 + j * 0.15 : 2.0,
      button: 3.1 + j * 0.1,
      tagline: 4.3,
    },
  }
}
