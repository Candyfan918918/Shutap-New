// Template registry. Each template pins its sender identity, subject,
// and full email-safe HTML design (loaded verbatim from src/lib/email/designs/
// via Vite `?raw`). Plain-text fallbacks live per template. The check-in
// templates are no longer sent; they keep a short generic copy.

import welcomeHtml from './designs/welcome.html?raw'
import spillFollowupHtml from './designs/spill-followup.html?raw'
import scanFollowupHtml from './designs/scan-followup.html?raw'
import reengagementHtml from './designs/re-engagement.html?raw'
import magicLinkHtml from './designs/magic-link.html?raw'
import newReplyHtml from './designs/new-reply.html?raw'
import digestHtml from './designs/digest.html?raw'
import milestoneHtml from './designs/milestone.html?raw'
import popularTodayHtml from './designs/popular-today.html?raw'
import hallUpdatesHtml from './designs/hall-updates.html?raw'
import mirrorReceiptHtml from './designs/mirror-receipt.html?raw'
import mirrorCancelledHtml from './designs/mirror-cancelled.html?raw'
import mirrorTrialEndingHtml from './designs/mirror-trial-ending.html?raw'

import type { EmailClass, IdentityId } from './identities'

export type TemplateId =
  | 'welcome'
  | 'checkin_day1'
  | 'checkin_day2'
  | 'checkin_day3'
  | 'checkin_day7'
  | 'checkin_day14'
  | 'checkin_day30'
  | 'reengagement'
  | 'scan_followup'
  | 'magic_link'
  | 'new_reply'
  | 'digest'
  | 'milestone'
  | 'popular_today'
  | 'hall_updates'
  | 'mirror_receipt'
  | 'mirror_cancelled'
  | 'mirror_trial_ending'

export type TemplateVars = {
  alias?: string
  situation_hint?: string
  deep_link?: string
  unsubscribe_url?: string
  [key: string]: string | undefined
}

export type TemplateEntry = {
  id: TemplateId
  identity: IdentityId
  emailClass: EmailClass
  subject: (v: TemplateVars) => string
  preview: (v: TemplateVars) => string
  cta: string
  /** Full HTML document loaded from src/lib/email/designs/. */
  htmlDesign: string
  /**
   * For check-in variants (no longer sent): optional one-line copy for
   * the follow-up shell's main paragraph.
   */
  beatLine?: string
  buildBodyText: (v: TemplateVars) => string
}

// Salutation for text fallbacks.
const g = (v: TemplateVars) => (v.alias ? `hey ${v.alias.toLowerCase()},` : 'hey,')

// Text-fallback builder for the (unused) check-in templates.
const checkinText = (line: (v: TemplateVars) => string) => (v: TemplateVars) =>
  `${g(v)}\n\n${line(v)}\n\nopen shutap: ${v.deep_link ?? ''}`

// One generic line for every retired check-in template.
const CHECKIN_LINE = 'got a new story? paste it in and get it back funnier.'
const checkin = (id: TemplateId): TemplateEntry => ({
  id,
  identity: 'hello',
  emailClass: 'engagement',
  subject: () => 'got a new one?',
  preview: () => 'paste what happened. get it back funnier.',
  cta: 'open shutap',
  htmlDesign: spillFollowupHtml,
  beatLine: CHECKIN_LINE,
  buildBodyText: checkinText(() => CHECKIN_LINE),
})

export const TEMPLATES: Record<TemplateId, TemplateEntry> = {
  welcome: {
    id: 'welcome',
    identity: 'hello',
    emailClass: 'transactional',
    subject: () => "you're in. SHUTAP. Say it funnier.",
    preview: () => 'paste what happened. get three jokes back.',
    cta: 'write your first jokes',
    htmlDesign: welcomeHtml,
    buildBodyText: (v) => `${g(v)}

you're in. paste what happened and get three jokes back: the take, the clapback, the roast. keep them, download them, or post them to a room.

your made-up name is what people see. your real name never shows.

write your first jokes: ${v.deep_link ?? v.cta_url ?? 'https://shutap.com'}`,
  },

  checkin_day1: checkin('checkin_day1'),
  checkin_day2: checkin('checkin_day2'),
  checkin_day3: checkin('checkin_day3'),
  checkin_day7: checkin('checkin_day7'),
  checkin_day14: checkin('checkin_day14'),
  checkin_day30: checkin('checkin_day30'),

  reengagement: {
    id: 'reengagement',
    identity: 'hello',
    emailClass: 'nontransactional',
    subject: () => 'something happen this week?',
    preview: () => 'paste it in. get it back funnier.',
    cta: 'write some jokes',
    htmlDesign: reengagementHtml,
    buildBodyText: (v) => `${g(v)}

something annoying happen lately? paste it in and get three jokes back. or see what people are posting in the rooms.

write some jokes: ${v.deep_link ?? v.cta_url ?? 'https://shutap.com'}`,
  },

  scan_followup: {
    id: 'scan_followup',
    identity: 'hello',
    emailClass: 'engagement',
    subject: () => 'got a new one?',
    preview: () => 'paste what happened. get it back funnier.',
    cta: 'open shutap',
    htmlDesign: scanFollowupHtml,
    buildBodyText: (v) => `${g(v)}

${CHECKIN_LINE}

open shutap: ${v.deep_link ?? 'https://shutap.com'}`,
  },

  magic_link: {
    id: 'magic_link',
    identity: 'hello',
    emailClass: 'transactional',
    subject: () => 'your shutap sign-in link',
    preview: () => 'works once. expires in 10 minutes.',
    cta: 'sign in',
    htmlDesign: magicLinkHtml,
    buildBodyText: (v) => `${g(v)}

tap the link to sign in. it works once and expires in 10 minutes.

${v.magic_link ?? ''}

or enter this code: ${v.code ?? ''}

didn't ask for this? ignore it. no one gets in without this link.`,
  },

  new_reply: {
    id: 'new_reply',
    identity: 'hello',
    emailClass: 'engagement',
    subject: () => 'someone commented on your post',
    preview: () => 'see what they said.',
    cta: 'see the comment',
    htmlDesign: newReplyHtml,
    buildBodyText: (v) => `${g(v)}

${v.replier_alias || 'someone'} commented on your post in ${v.room_title || 'a room'}: "${v.reply_snippet || ''}"

see the comment: ${v.cta_url ?? v.deep_link ?? ''}`,
  },

  digest: {
    id: 'digest',
    identity: 'hello',
    emailClass: 'nontransactional',
    subject: () => 'this week in the rooms',
    preview: () => 'likes, comments, and new followers on your posts.',
    cta: 'open the rooms',
    htmlDesign: digestHtml,
    buildBodyText: (v) => `${g(v)}

here's what happened on your posts this week, plus what people are posting in the rooms.

open the rooms: ${v.cta_url ?? v.deep_link ?? 'https://shutap.com/rooms'}`,
  },

  milestone: {
    id: 'milestone',
    identity: 'hello',
    emailClass: 'engagement',
    subject: () => 'your post is getting likes',
    preview: () => 'people are liking what you posted.',
    cta: 'see your post',
    htmlDesign: milestoneHtml,
    buildBodyText: (v) => `${g(v)}

people are liking ${v.room_title || 'your post'}.

see your post: ${v.cta_url ?? v.deep_link ?? ''}`,
  },

  popular_today: {
    id: 'popular_today',
    identity: 'hello',
    emailClass: 'nontransactional',
    subject: () => 'popular in the rooms today',
    preview: () => 'the post everyone is liking today.',
    cta: 'see the post',
    htmlDesign: popularTodayHtml,
    buildBodyText: (v) => `${g(v)}

the post everyone is liking today: ${v.room_title || 'see it in the rooms'}.

see the post: ${v.cta_url ?? v.deep_link ?? ''}`,
  },

  mirror_receipt: {
    id: 'mirror_receipt',
    identity: 'hello',
    emailClass: 'transactional',
    subject: (v) => `your Shutap+ receipt — ${v.amount ?? ''}`.trim(),
    preview: () => 'payment received. thanks.',
    cta: 'view invoice',
    htmlDesign: mirrorReceiptHtml,
    buildBodyText: (v) => `${g(v)}

payment received: ${v.amount ?? ''} for Shutap+ (${v.plan_interval ?? ''}), covering ${v.period_range ?? ''}. tax included where it applies.

view your invoice: ${v.invoice_url ?? ''}`,
  },

  mirror_cancelled: {
    id: 'mirror_cancelled',
    identity: 'hello',
    emailClass: 'transactional',
    subject: (v) => `cancelled. Shutap+ stays on until ${v.access_until ?? 'the end of your period'}`,
    preview: () => 'no more charges. your jokes stay yours.',
    cta: 'resume Shutap+',
    htmlDesign: mirrorCancelledHtml,
    buildBodyText: (v) => `${g(v)}

you've cancelled. Shutap+ stays on until ${v.access_until ?? 'the end of your billing period'}, with no more charges after that. your jokes stay in your set list, and writing jokes stays free.

changed your mind? resume anytime: ${v.resume_url ?? 'https://shutap.com/subscribe'}`,
  },

  mirror_trial_ending: {
    id: 'mirror_trial_ending',
    identity: 'hello',
    emailClass: 'transactional',
    subject: (v) => `your Shutap+ trial ends ${v.trial_end ?? 'soon'}`,
    preview: () => 'keep it or cancel. no surprises.',
    cta: 'open the mirror',
    htmlDesign: mirrorTrialEndingHtml,
    buildBodyText: (v) => `${g(v)}

heads up before anything is charged: your free trial ends ${v.trial_end ?? 'soon'}. to keep Shutap+, do nothing. your ${v.plan_interval ?? ''} plan (${v.amount ?? ''} + tax where it applies) starts then. don't want it? cancel from your account before then and you won't be charged.

open the mirror: ${v.deep_link ?? 'https://shutap.com/mirror'}
manage or cancel: ${v.manage_url ?? 'https://shutap.com/profile'}`,
  },

  hall_updates: {
    id: 'hall_updates',
    identity: 'hello',
    emailClass: 'nontransactional',
    subject: () => 'new in the rooms this week',
    preview: () => 'the posts people liked most this week.',
    cta: 'open the rooms',
    htmlDesign: hallUpdatesHtml,
    buildBodyText: (v) => `${g(v)}

the posts people liked most in the rooms this week.

open the rooms: ${v.cta_url ?? v.deep_link ?? 'https://shutap.com/rooms'}`,
  },
}
