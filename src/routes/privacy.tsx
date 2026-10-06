import { createFileRoute } from '@tanstack/react-router'
import { ogImageMeta } from "@/lib/seo/meta";
import { DocLayout } from '@/components/site/DocLayout'
import { SITE_URL } from '@/lib/site'

const URL = `${SITE_URL}/privacy`
const TITLE = 'Privacy Policy — Shutap'
const DESCRIPTION =
  'How Shutap handles your data: names and details scrubbed before storage, a pseudonym instead of your real name, no sale of personal data, and delete or export anytime.'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: 'description', content: DESCRIPTION },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: URL },
      ...ogImageMeta(),
      { name: 'twitter:title', content: TITLE },
      { name: 'twitter:description', content: DESCRIPTION },
    ],
    links: [{ rel: 'canonical', href: URL }],
  }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <DocLayout
      active="/privacy"
      title="Privacy Policy"
      subline="Last updated: October 6, 2026 · Controller: Shutap"
    >
      <h3>1. The short version</h3>
      <p>
        Before anything you write is stored, our scrubber removes names, addresses, places, phone
        numbers and emails. <b>We store only the cleaned text.</b> You appear under a pseudonym;
        your real name is never shown. <b>We do not sell your personal data.</b> You can delete or
        export your data at any time.
      </p>

      <h3>2. What we collect</h3>
      <ul>
        <li>
          <b>Account:</b> your pseudonym, email (for sign-in and account emails), timezone,
          notification settings and consent records.
        </li>
        <li>
          <b>What you write:</b> the stories you paste and the jokes Shutap writes, stored only in
          scrubbed form.
        </li>
        <li>
          <b>Rooms:</b> what you post, your comments, likes, saves, follows and reports.
        </li>
        <li>
          <b>Daily limit counters:</b> how many stories you&rsquo;ve used today, tied to your
          account or, for guests, to a random ID stored in your browser, plus a one-way hash of
          your network address for rate limiting. Counters hold no content.
        </li>
        <li>
          <b>Billing:</b> Shutap+ payments are handled by Stripe. We keep your plan status and
          receipts, not your full card number.
        </li>
        <li>
          <b>Usage:</b> app analytics (via PostHog), tied to a pseudonymous ID, not your name.
        </li>
        <li>
          <b>Technical:</b> standard device and log data.
        </li>
      </ul>

      <h3>3. How we use it</h3>
      <p>
        To write your jokes; to run rooms; to enforce limits; to run the crisis check; to provide
        the Mirror for Shutap+ members (a private read-back built from what you write while signed
        in); to bill you; to keep the service safe; to improve it using aggregated, de-identified
        data; and to comply with the law.
      </p>

      <h3>4. What&rsquo;s public</h3>
      <p>
        Only what you post to a room is public. It appears under your pseudonym, along with your
        comments, likes and follows. Jokes you don&rsquo;t post stay private. The Mirror is
        private to you. Anyone can download or share a public post, so deleting it can&rsquo;t
        recall those copies.
      </p>

      <h3>5. AI processing</h3>
      <p>
        Your text is processed by AI models (Google&rsquo;s Gemini and OpenAI models, through the Lovable AI Gateway)
        to scrub identifying details, run the crisis check, write your jokes and build the Mirror.{' '}
        <b>We do not use your content to train AI models.</b> We send it to these providers only to
        produce your result.
      </p>

      <h3>6. Service providers</h3>
      <p>
        Lovable / Supabase (hosting and database), Google and OpenAI (AI models, via the Lovable AI
        Gateway), Stripe (payments), Resend (email) and PostHog (analytics). Each uses data only to
        provide its service to us.
      </p>

      <h3>7. Legal and safety disclosure</h3>
      <p>
        We may disclose information when the law requires it (for example, valid legal process) or
        to prevent imminent harm. Anything flagged by the crisis check stays private, is never
        posted, is excluded from aggregated data, and is never sold.
      </p>

      <h3>8. Retention</h3>
      <p>
        We keep your data while your account is active and as long as needed for the purposes
        above. Delete a post, a set or your account and we remove it, except where the law
        requires us to keep it. Daily counters are kept per day and hold no content. For guests,
        we keep the scrubbed story only long enough to write the set and, if you sign in, move it
        to your account.
      </p>

      <h3>9. Security</h3>
      <p>
        We use reasonable technical and organizational measures to protect your data. No system is
        perfectly secure. If a breach affects your personal data, we&rsquo;ll notify you and the
        authorities as the law requires.
      </p>

      <h3>10. Your rights</h3>
      <p>
        Depending on where you live (including under <b>GDPR</b> and{' '}
        <b>California&rsquo;s CCPA/CPRA</b>), you may have the right to access, correct, delete,
        export, object to or restrict processing of your data, and to withdraw consent.{' '}
        <b>You can delete posts, sets or your account, and export your data, in your settings</b>,
        or by emailing hello@shutap.com. We don&rsquo;t sell personal data, so there is nothing to
        opt out of there. We won&rsquo;t treat you differently for using these rights.
      </p>

      <h3>11. Children</h3>
      <p>
        Shutap is for adults <b>18+</b>. We don&rsquo;t knowingly collect data from anyone under
        18. If we learn we have, we delete it.
      </p>

      <h3>12. International transfers</h3>
      <p>
        If you use Shutap from outside the US, your data may be processed in the US and other
        countries where our providers operate. Where required, we rely on Standard Contractual
        Clauses or equivalent safeguards for transfers out of the EEA, UK and Switzerland.
      </p>

      <h3>13. Cookies</h3>
      <p>
        We use essential cookies to sign you in and keep the service secure, plus analytics (via
        PostHog). Where required, such as in the EU and UK, we ask before loading non-essential
        cookies.
      </p>

      <h3>14. Changes and contact</h3>
      <p>
        We&rsquo;ll post updates with a new date and tell you in the app about material changes.
        Questions or requests: hello@shutap.com.
      </p>
    </DocLayout>
  )
}
