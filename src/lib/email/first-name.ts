// One rule for the first name every Shutap email greets someone by.
//
// Sources, in order:
//   1. the first name typed on their profile (profiles.first_name)
//   2. the name from their Google/Apple sign-in (user_metadata full_name / name)
//   3. their profile name (aliases.display_name), only when they set it themselves
// Never: the auto-assigned alias ("Quiet Welsh Bear"), the "Shutap user"
// placeholder, a name made from the email address ("Janedoe" for
// janedoe@…), or a business name ("ACME TELECOM LLC", "Pies & Pints").
//
// The first word is used, unless it is 1-2 letters ("jo bloggs"); then the
// whole name exactly as typed. A name typed in all caps or all lowercase is
// title-cased ("MARGOT" -> "Margot", "tobias" -> "Tobias"); mixed
// case is kept ("McKenzie", "LeBron"). No name -> null; callers drop the name
// from the greeting rather than guess.

export type AliasNameRow = {
  display_name?: string | null
  emotion?: string | null
  nation?: string | null
  creature?: string | null
} | null | undefined

export type NameSources = {
  profileFirstName?: string | null
  metaName?: string | null
  alias?: AliasNameRow
  email?: string | null
}

const BUSINESS_RE = /(^|\s)(llc|l\.l\.c\.|inc\.?|ltd\.?|corp\.?|co\.|gmbh|company|studios?|media|group|agency|realty|official)(\s|$)|&|\bshutap\b/i

const lettersOnly = (s: string) => s.toLowerCase().replace(/[^\p{L}]/gu, '')

function titleCase(word: string): string {
  const hasUpper = word !== word.toLowerCase()
  const hasLower = word !== word.toUpperCase()
  if (hasUpper && hasLower) return word // mixed case: they chose it
  return word
    .toLowerCase()
    .replace(/(^|[-'’])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase())
}

function fromName(raw: string | null | undefined): string | null {
  const name = (raw ?? '').replace(/\s+/g, ' ').trim()
  if (!name || BUSINESS_RE.test(name)) return null
  const first = name.split(' ')[0]!
  if ([...first].length <= 2) return name // as they typed it
  return titleCase(first)
}

function aliasName(alias: AliasNameRow, email: string | null | undefined): string | null {
  const shown = (alias?.display_name ?? '').trim()
  if (!shown) return null
  const auto = [alias?.emotion, alias?.nation, alias?.creature].filter(Boolean).join(' ').toLowerCase()
  if (auto && shown.toLowerCase() === auto) return null
  if (shown.toLowerCase() === 'shutap user') return null
  const local = (email ?? '').split('@')[0] ?? ''
  if (local && lettersOnly(local) === lettersOnly(shown)) return null // made from the email address
  return shown
}

export function firstNameFor(src: NameSources): string | null {
  for (const candidate of [src.profileFirstName, src.metaName, aliasName(src.alias, src.email)]) {
    const n = fromName(candidate)
    if (n) return n
  }
  return null
}

export const escHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/**
 * Greeting variables for the email designs, from a plain first name (or none).
 * first_name / name_* are HTML-escaped; first_name_plain is for text bodies.
 */
export function nameVars(first: string | null): Record<string, string> {
  if (!first) return { first_name: '', first_name_plain: '', name_space: '', name_comma: '', name_lead: '' }
  const h = escHtml(first)
  return {
    first_name: h,
    first_name_plain: first,
    name_space: ` ${h}`, // "hey{{name_space}}."            -> "hey Rosa." / "hey."
    name_comma: `, ${h}`, // "this week{{name_comma}}."      -> "this week, Rosa." / "this week."
    name_lead: `${h}, `, // "{{name_lead}}type it in …"     -> "Rosa, type it in …" / "type it in …"
  }
}
