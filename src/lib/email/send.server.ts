// sendEmail: single Resend send wrapper. Resolves identity, looks up the
// recipient's email preferences, injects tokenized unsubscribe/preferences
// URLs, renders the template, enforces the routing + suppression policy,
// then posts to Resend with RFC 8058 List-Unsubscribe headers for
// non-transactional classes. All outbound Resend sends in this codebase
// MUST go through this wrapper.
import { formatFrom, IDENTITIES, type IdentityId } from './identities'
import { ensureEmailPrefsToken, type EmailPrefs } from './prefs.server'
import { renderTemplate } from './render'
import { TEMPLATES, type TemplateId, type TemplateVars } from './templates'

const RESEND_URL = 'https://api.resend.com/emails'
const APP_ORIGIN = 'https://shutap.com'

export type SendResult = {
  ok: boolean
  error?: string
  id?: string
  suppressed?: boolean
  reason?: string
}

/**
 * Caller overrides. Enforcement now derives suppression from the recipient's
 * stored preferences; these fields let callers force additional suppression
 * (crisisFlagged remains the primary use — crisis contexts silence engagement
 * + nontransactional even if the recipient hasn't opted out).
 */
export type SendOpts = {
  marketingOptOut?: boolean
  threadMuted?: boolean
  crisisFlagged?: boolean
}

// Community templates — engagement class, suppressed by notif_community_opt_out.
const COMMUNITY_TEMPLATES = new Set<TemplateId>(['new_reply', 'milestone', 'new_follower'])
// Digest / nontransactional templates — suppressed by notif_digest_opt_out.
const DIGEST_TEMPLATES = new Set<TemplateId>([
  'digest',
  'popular_today',
  'hall_updates',
  'reengagement',
])

function suppressionFromPrefs(
  templateId: TemplateId,
  emailClass: 'transactional' | 'engagement' | 'nontransactional',
  prefs: EmailPrefs,
  opts: SendOpts,
): string | null {
  if (emailClass === 'transactional') return null

  if (prefs.notif_all_opt_out) return 'notif_all_opt_out'

  if (opts.crisisFlagged) return 'crisisFlagged'

  if (emailClass === 'engagement') {
    if (templateId.startsWith('checkin_') && (prefs.notif_checkins_opt_out || opts.threadMuted)) {
      return prefs.notif_checkins_opt_out ? 'notif_checkins_opt_out' : 'threadMuted'
    }
    if (COMMUNITY_TEMPLATES.has(templateId) && prefs.notif_community_opt_out) {
      return 'notif_community_opt_out'
    }
  }

  if (emailClass === 'nontransactional') {
    if (DIGEST_TEMPLATES.has(templateId) && (prefs.notif_digest_opt_out || opts.marketingOptOut)) {
      return prefs.notif_digest_opt_out ? 'notif_digest_opt_out' : 'marketingOptOut'
    }
  }

  return null
}

export async function sendEmail(
  identityId: IdentityId,
  templateId: TemplateId,
  vars: TemplateVars,
  to: string,
  opts: SendOpts = {},
): Promise<SendResult> {
  const tpl = TEMPLATES[templateId]
  if (!tpl) {
    const error = `unknown template: ${templateId}`
    console.warn(`[sendEmail] rejected — ${error}`)
    return { ok: false, error }
  }

  // Template pins its own identity; if caller passes a different id, prefer
  // caller — lets safety/privacy/legal reuse a template if ever needed.
  const identity = IDENTITIES[identityId] ?? IDENTITIES[tpl.identity]

  // 1. Routing policy: identity must permit this email class.
  if (!identity.allowedClasses.includes(tpl.emailClass)) {
    const reason = `identity ${identity.id} does not allow class ${tpl.emailClass}`
    console.warn(`[sendEmail] rejected template=${templateId} — ${reason}`)
    return { ok: false, error: reason }
  }

  // 2. Recipient preferences — lazily mint token on first send.
  const record = await ensureEmailPrefsToken(to).catch(() => null)

  // 3. Suppression matrix (derived from stored prefs + caller overrides).
  if (record) {
    const reason = suppressionFromPrefs(templateId, tpl.emailClass, record.prefs, opts)
    if (reason) {
      console.warn(`[sendEmail] suppressed template=${templateId} reason=${reason}`)
      return { ok: true, suppressed: true, reason }
    }
  } else if (tpl.emailClass !== 'transactional') {
    // No profile row (e.g. test address). Apply caller-passed overrides only.
    if (opts.crisisFlagged) return { ok: true, suppressed: true, reason: 'crisisFlagged' }
    if (opts.marketingOptOut && tpl.emailClass === 'nontransactional') {
      return { ok: true, suppressed: true, reason: 'marketingOptOut' }
    }
    if (opts.threadMuted && tpl.emailClass === 'engagement') {
      return { ok: true, suppressed: true, reason: 'threadMuted' }
    }
  }

  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, error: 'RESEND_API_KEY missing' }

  // 4. Inject tokenized URLs unless caller already supplied them.
  const unsubscribeUrl = record ? `${APP_ORIGIN}/email/unsubscribe?token=${record.token}` : ''
  const preferencesUrl = record ? `${APP_ORIGIN}/email/preferences?token=${record.token}` : ''
  const finalVars: TemplateVars = {
    ...vars,
    unsubscribe_url: vars.unsubscribe_url ?? unsubscribeUrl,
    preferences_url: vars.preferences_url ?? preferencesUrl,
  }

  const rendered = renderTemplate(templateId, finalVars)

  // 5. RFC 8058 one-click headers for engagement + nontransactional only.
  const headers: Record<string, string> = {}
  if (tpl.emailClass !== 'transactional' && finalVars.unsubscribe_url) {
    headers['List-Unsubscribe'] = `<${finalVars.unsubscribe_url}>`
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
  }

  try {
    const r = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from: formatFrom(identity),
        to: [to],
        reply_to: identity.replyTo,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        ...(Object.keys(headers).length ? { headers } : {}),
      }),
    })
    if (!r.ok) {
      const txt = await r.text().catch(() => '')
      return { ok: false, error: `resend ${r.status}: ${txt.slice(0, 300)}` }
    }
    const body = (await r.json().catch(() => ({}))) as { id?: string }
    return { ok: true, id: body.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'fetch failed' }
  }
}
