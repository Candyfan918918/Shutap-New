// Server-only: the starting name and picture for a new profile, taken from
// what the sign-in provider shared (Oct 2026: real names, no made-up alias).
// Every path that creates an aliases row goes through this, so none of them
// can mint a made-up name ahead of the real one.

type UserLike = {
  email?: string | null
  user_metadata?: Record<string, unknown> | null
} | null | undefined

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function nameFromEmail(email: string | null | undefined): string | null {
  const local = email?.split('@')[0]?.replace(/[._+-]+/g, ' ').replace(/\d+/g, ' ').trim()
  if (!local) return null
  return local
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .slice(0, 80)
}

export function realNameSeed(user: UserLike): {
  display_name: string
  avatar_url: string | null
  emotion: string
  nation: string
  creature: string
  emoji: string
} {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
  const given = str(meta.given_name) ?? str(meta.first_name)
  const family = str(meta.family_name) ?? str(meta.last_name)
  const joined = [given, family].filter(Boolean).join(' ') || null
  const display_name = (
    str(meta.full_name) ?? str(meta.name) ?? joined ?? nameFromEmail(user?.email) ?? 'Shutap user'
  ).slice(0, 80)
  return {
    display_name,
    avatar_url: str(meta.avatar_url) ?? str(meta.picture),
    emotion: '',
    nation: '',
    creature: '',
    emoji: '',
  }
}
