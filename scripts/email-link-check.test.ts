import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { render } from '@react-email/render'
import { renderTemplate } from '../src/lib/email/render'
import { TEMPLATES, type TemplateId, type TemplateVars } from '../src/lib/email/templates'
import { SignupEmail } from '../src/lib/email-templates/signup'
import { RecoveryEmail } from '../src/lib/email-templates/recovery'
import { InviteEmail } from '../src/lib/email-templates/invite'
import { MagicLinkEmail } from '../src/lib/email-templates/magic-link'
import { EmailChangeEmail } from '../src/lib/email-templates/email-change'
import { ReauthenticationEmail } from '../src/lib/email-templates/reauthentication'

const vars: TemplateVars = {
  alias: 'Office Owl', first_alias: 'office', first_name: 'Candy', first_name_plain: 'Candy',
  company: 'Shutap Studio', company_plain: 'Shutap Studio',
  deep_link: 'https://shutap.com', cta_url: 'https://shutap.com/rooms/test-post',
  invoice_url: 'https://invoice.stripe.com/i/test-invoice',
  resume_url: 'https://shutap.com/subscribe', manage_url: 'https://shutap.com/profile',
  rescan_url: 'https://shutap.com', spill_url: 'https://shutap.com/rooms',
  code: '482916', plan_name: 'Basic', plan_interval: 'monthly', amount: '$1.99',
  period_range: 'November 1 – November 30, 2026', trial_end: 'November 8, 2026',
  access_until: 'November 30, 2026', room_title: 'Office coffee', room_alias: 'Office Owl',
  room_excerpt: 'The coffee machine scheduled its own performance review.',
  hall_name: 'Office', resonance_count: '42', resonance_pct: '64',
  relate_count: '12', reaction_count: '8', reply_count: '3', sitting_count: '5',
  spill_excerpt: 'My calendar invited me to a meeting with my calendar.',
  follower_alias: 'Stage Fox', follower_plain: 'Stage Fox', replier_alias: 'Stage Fox',
  reply_snippet: 'That calendar deserves its own desk.',
  scan_score: '420', scan_band: 'Quite a day', scan_pct: '42',
  scan_topic: 'office coffee', scan_prompt: 'What happened at the coffee machine?',
  unsubscribe_url: 'https://shutap.com/email/unsubscribe?token=t',
  preferences_url: 'https://shutap.com/email/preferences?token=t',
}
for (let n = 1; n <= 3; n += 1) {
  vars[`room${n}_title`] = `Office story ${n}`
  vars[`room${n}_alias`] = 'Office Owl'
  vars[`room${n}_relate`] = String(n * 7)
  vars[`room${n}_sitting`] = String(n * 2)
  vars[`hall${n}_title`] = `Story of the week ${n}`
  vars[`hall${n}_alias`] = 'Stage Fox'
  vars[`hall${n}_relate`] = String(n * 9)
}

function assertLinks(html: string) {
  expect(html).not.toContain('{{')
  expect(html).not.toMatch(/href\s*=\s*["']\s*["']/i)
  const anchors = [...html.matchAll(/<a\s+[^>]*>/gi)]
  expect(anchors.length).toBe((html.match(/<\/a>/gi) ?? []).length)
  for (const [anchor] of anchors) {
    const href = anchor.match(/href\s*=\s*["']([^"']*)["']/i)?.[1]
    expect(href).toMatch(/^(https:\/\/|mailto:)/)
  }
  expect(html).toContain('2261 Market St')
}

describe('all registered email templates', () => {
  for (const id of Object.keys(TEMPLATES) as TemplateId[]) {
    it(`${id}: links resolve with realistic vars`, () => {
      assertLinks(renderTemplate(id, vars).html)
    })
    it(`${id}: address survives empty unsubscribe and preferences links`, () => {
      const html = renderTemplate(id, { ...vars, unsubscribe_url: '', preferences_url: '' }).html
      assertLinks(html)
      expect(html).not.toContain('href="https://shutap.com/email/')
    })
    // A missing optional action removes its button, not neighboring prose.
    const optionalUrls = [...TEMPLATES[id].htmlDesign.matchAll(/href="\{\{\{?(\w+)\}?\}\}"/g)]
      .map((match) => match[1])
      .filter((name) => !['cta_url', 'deep_link', 'unsubscribe_url', 'preferences_url'].includes(name))
    for (const name of new Set(optionalUrls)) {
      it(`${id}: missing ${name} leaves body and address intact`, () => {
        const complete = renderTemplate(id, vars).html
        const missing = renderTemplate(id, { ...vars, [name]: '' }).html
        assertLinks(missing)
        const prose = [...complete.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)]
          .map((match) => match[1])
        expect(prose.length).toBeGreaterThan(0)
        for (const paragraph of prose) expect(missing).toContain(paragraph)
        expect(missing).not.toContain(`href="${vars[name]}"`)
      })
    }
  }
})

describe('ported auth templates', () => {
  const confirmationUrl = 'https://shutap.com/auth/callback?token_hash=test&type=signup'
  const props = { siteName: 'Shutap', siteUrl: 'https://shutap.com', recipient: 'old@example.test', confirmationUrl }
  const emails = [
    ['signup', createElement(SignupEmail, props)],
    ['recovery', createElement(RecoveryEmail, props)],
    ['invite', createElement(InviteEmail, props)],
    ['magiclink', createElement(MagicLinkEmail, props)],
    ['email_change', createElement(EmailChangeEmail, { ...props, oldEmail: 'old@example.test', email: 'new@example.test', newEmail: 'new@example.test' })],
    ['reauthentication', createElement(ReauthenticationEmail, { token: '482916' })],
  ] as const
  for (const [name, element] of emails) {
    it(`${name}: links resolve and secure callback is preserved`, async () => {
      const html = await render(element)
      assertLinks(html)
      if (name === 'reauthentication') {
        expect(html).toContain('482916')
        expect(html).not.toContain('token_hash=')
      } else expect(html).toContain(confirmationUrl.replaceAll('&', '&amp;'))
      if (name === 'email_change') {
        expect(html).toMatch(/from[\s\S]*old@example\.test[\s\S]*to[\s\S]*new@example\.test/)
      }
    })
  }
})