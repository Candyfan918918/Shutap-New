// Central sender-identity registry. Every Resend send MUST route through
// one of these identities — no hardcoded from addresses elsewhere.
//
// Routing policy (brief):
//   hello    → companion voice; ALL classes (transactional / engagement /
//              nontransactional). Default sender for check-ins, welcome,
//              product nudges.
//   safety   → account-safety + moderation notices ONLY (transactional).
//              NEVER used for crisis follow-ups — crisis flows stay in-app.
//   privacy  → data-rights / privacy notices ONLY (transactional).
//              Ignores user opt-outs (legally required).
//   legal    → policy / terms / billing notices ONLY (transactional).
//              Ignores user opt-outs (legally required).

export type IdentityId = 'hello' | 'safety' | 'privacy' | 'legal'

export type EmailClass = 'transactional' | 'engagement' | 'nontransactional'

export type Identity = {
  id: IdentityId
  fromName: string
  fromAddress: string // bare email, e.g. hello@shutap.com
  replyTo: string // same as fromAddress
  allowedClasses: EmailClass[]
}

export const IDENTITIES: Record<IdentityId, Identity> = {
  hello: {
    id: 'hello',
    fromName: 'shutap',
    fromAddress: 'hello@shutap.com',
    replyTo: 'hello@shutap.com',
    allowedClasses: ['transactional', 'engagement', 'nontransactional'],
  },
  safety: {
    id: 'safety',
    fromName: 'shutap safety',
    fromAddress: 'hello@shutap.com',
    replyTo: 'hello@shutap.com',
    allowedClasses: ['transactional'],
  },
  privacy: {
    id: 'privacy',
    fromName: 'shutap privacy',
    fromAddress: 'hello@shutap.com',
    replyTo: 'hello@shutap.com',
    allowedClasses: ['transactional'],
  },
  legal: {
    id: 'legal',
    fromName: 'shutap legal',
    fromAddress: 'hello@shutap.com',
    replyTo: 'hello@shutap.com',
    allowedClasses: ['transactional'],
  },
}

// Formatted "Name <addr>" string for Resend `from` field.
export function formatFrom(identity: Identity): string {
  return `${identity.fromName} <${identity.fromAddress}>`
}
