// renderTemplate: substitutes vars into the template's full HTML design,
// strips rows whose placeholders are missing, and returns
// { subject, html, text, identity }.
//
// Placeholder syntax: both `{{var}}` and `{{{var}}}` are supported and
// normalized to the same token. Missing values default to empty string;
// any `<tr>...</tr>` containing an absent variable is dropped entirely so
// conditional stat/recap rows disappear cleanly.

import { IDENTITIES, type Identity } from './identities'
import { TEMPLATES, type TemplateId, type TemplateVars } from './templates'

export type RenderedEmail = {
  subject: string
  html: string
  text: string
  identity: Identity
}

const DEFAULT_DEEP_LINK = 'https://shutap.com'

// The exact paragraph in the spill-followup design that gets swapped out
// with each check-in beat's one-line copy.
const SPILL_FOLLOWUP_DAY1_LINE =
  `a day ago you let it out, {{first_alias}}. that took something. while you were away, the room showed up for you.`

const PLACEHOLDER_RE = /\{\{\{?(\w+)\}?\}\}/g
// Innermost rows only: a row that contains no nested <tr>. Matching an outer
// row would cut from its start to the first inner </tr> and break the layout.
const TR_RE = /<tr\b[^>]*>(?:(?!<tr\b)[\s\S])*?<\/tr>/gi

function firstAlias(alias?: string): string {
  if (!alias) return 'you'
  return alias.trim().split(/\s+/)[0]?.toLowerCase() ?? 'you'
}

function buildVarMap(vars: TemplateVars): Record<string, string> {
  const deep_link = vars.deep_link || DEFAULT_DEEP_LINK
  const cta_url = vars.cta_url || deep_link
  const first_alias = vars.first_alias || firstAlias(vars.alias)

  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(vars)) {
    if (typeof v === 'string') out[k] = v
  }
  // Overrides / defaults. unsubscribe_url / preferences_url are supplied by
  // the send layer per-recipient; leave empty when the caller omits them.
  out.unsubscribe_url = vars.unsubscribe_url ?? ''
  out.preferences_url = vars.preferences_url ?? ''
  out.deep_link = deep_link
  out.cta_url = cta_url
  out.first_alias = first_alias
  if (vars.alias) out.alias = vars.alias
  return out
}

/** Extract every placeholder name referenced in a chunk of HTML. */
function placeholdersIn(html: string): string[] {
  const names = new Set<string>()
  html.replace(PLACEHOLDER_RE, (_m, name: string) => {
    names.add(name)
    return _m
  })
  return [...names]
}

/**
 * Drop any `<tr>...</tr>` that references a placeholder whose value is
 * missing or empty. Runs before substitution so partial rows never leak
 * literal `{{var}}` text into the rendered email.
 */
function stripEmptyRows(html: string, values: Record<string, string>): string {
  return html.replace(TR_RE, (row) => {
    const names = placeholdersIn(row)
    if (names.length === 0) return row
    for (const name of names) {
      const v = values[name]
      if (v === undefined || v === '') return ''
    }
    return row
  })
}

/** Substitute all placeholders; unknown or empty values render as ''. */
function substituteAll(html: string, values: Record<string, string>): string {
  return html.replace(PLACEHOLDER_RE, (_m, name: string) => values[name] ?? '')
}

export function renderTemplate(templateId: TemplateId, vars: TemplateVars): RenderedEmail {
  const tpl = TEMPLATES[templateId]
  if (!tpl) throw new Error(`unknown template: ${templateId}`)
  const identity = IDENTITIES[tpl.identity]

  const values = buildVarMap(vars)

  // 1. Start from the design's raw HTML.
  let html = tpl.htmlDesign

  // 2. For check-in beats, swap the day-1 paragraph text for this beat's line.
  if (tpl.beatLine) {
    html = html.split(SPILL_FOLLOWUP_DAY1_LINE).join(tpl.beatLine)
  }

  // 3. Drop `<tr>` blocks whose placeholders can't be filled.
  html = stripEmptyRows(html, values)

  // 4. Substitute remaining placeholders.
  html = substituteAll(html, values)

  const subject = substituteAll(tpl.subject(vars), values)
  const preview = substituteAll(tpl.preview(vars), values)

  // Prepend a preview-text hint to the plain-text body for parity.
  const footer = values.unsubscribe_url
    ? `\n\n—\nunsubscribe or manage preferences: ${values.unsubscribe_url}\n`
    : '\n'
  const text = `${preview}\n\n${tpl.buildBodyText(vars).trim()}${footer}`

  return { subject, html, text, identity }
}
