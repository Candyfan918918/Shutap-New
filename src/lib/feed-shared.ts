// Shared between client and server: topics, slugs, post shape.

export const TOPICS = ['office', 'work', 'family', 'school', 'live', 'social'] as const
export type Topic = (typeof TOPICS)[number]

export const TOPIC_LABEL: Record<Topic, string> = {
  office: 'office',
  work: 'work',
  family: 'family',
  school: 'school',
  live: 'live',
  social: 'social',
}

export const REPORT_REASONS = [
  ['targets_a_person', 'targets a real person'],
  ['real_name', 'has a real name'],
  ['hateful', 'hateful'],
  ['spam', 'spam'],
  ['other', 'something else'],
] as const
export type ReportReason = (typeof REPORT_REASONS)[number][0]

/** "Feral Norwegian Heron" → "feral-norwegian-heron" */
export function aliasSlug(name: string): string {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export type FeedPost = {
  id: string
  alias: string
  emoji: string
  slug: string
  topic: Topic | null
  joke: string
  slot: string | null
  situation: string
  created_at: string
  likes: number
  comments: number
  liked: boolean
  saved: boolean
  mine: boolean
  following: boolean
  /** 'card' is the retired single-joke post; new posts are a whole bit or scene */
  kind: 'card' | 'bit' | 'scene'
  bit: PostBit | null
  scene: PostScene | null
}

export type FeedComment = {
  id: string
  alias: string
  emoji: string
  slug: string
  text: string
  created_at: string
  mine: boolean
}

export function ago(iso: string): string {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** What a bit or scene post carries, snapshotted when it was posted. */
export type PostBit = { hook: string; setup: string; tags: string[]; button: string; secs: number }
export type PostScene = { hook: string; beats: { shot: string; speaker: string; line: string; on_screen: string }[]; secs: number }
