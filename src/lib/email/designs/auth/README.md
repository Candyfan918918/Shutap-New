# Shutap auth emails (Lovable Cloud → Emails → Auth emails)

Six designs, one layout, generated from the brand tokens in `src/styles/tokens.css`:
canvas `#fbf6f7`, card `#ffffff`, ink `#17131a` / `#0b080f`, accent `#c1216b` (logo "ap"),
eyebrow `#c1216b`, Sora + Newsreader italic. Every email opens with the shutap logo + "SHUTAP. Say it funnier." and ends with the founder sign-off
(Candy Fan · Founder, Shutap · hello@shutap.com)

| file | Lovable template | subject |
|---|---|---|
| signup.html | Confirm signup | confirm your email for shutap |
| recovery.html | Password reset | reset your shutap password |
| magic-link.html | Magic link | your shutap sign-in link |
| invite.html | Invite | you've been invited to shutap |
| email-change.html | Email change | confirm your new shutap email |
| reauthentication.html | Reauthentication | your shutap verification code |

The subject is the first-line HTML comment in each file.

## Placeholders → template props

| placeholder | maps to |
|---|---|
| `{{confirmationUrl}}` | the auth action link prop (keep Lovable's secure callback link intact) |
| `{{token}}` | the OTP / code prop (reauthentication) |
| `{{email}}` | current address (email change) |
| `{{newEmail}}` | new address (email change) |

## Wiring

1. In Lovable: Cloud → Emails → Auth emails → **Customize auth emails** (generates the six React Email files).
2. Port each design into its generated file: same structure, inline styles, swap the placeholders for the file's existing props. Don't touch the props or callback URLs.
3. Logo is served from `https://shutap.com/email/shutap-wordmark.png` (`public/email/`) — publish once so it resolves.
4. TanStack Start app → publish to apply.
