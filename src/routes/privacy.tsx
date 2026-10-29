import { createFileRoute } from '@tanstack/react-router'
import { ogImageMeta } from "@/lib/seo/meta";
import { DocLayout } from '@/components/site/DocLayout'
import { SITE_URL } from '@/lib/site'

const URL = `${SITE_URL}/privacy`
const TITLE = "Privacy Policy — Shutap, the Humor Amplifier"
const DESCRIPTION =
  "How Shutap, the humor amplifier, handles your data: names and details removed before saving, bits private until you post, never used to train AI, never sold, delete your account anytime."

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
      subline="Last updated: October 22, 2026 · Controller: Shutap"
    >
      <h3>1. The short version</h3>
      <p>
        Before a story you write is saved, our scrubber uses automated checks and an AI model to
        remove names, addresses, places, phone numbers and emails. <b>We store only the cleaned
        text.</b> The scrubber can miss things, so leave out details you don&rsquo;t want kept. Your
        bits stay private unless you post them. Your profile and posts show the name and picture
        from your sign-in, and you can change both. <b>We do not sell your personal data, we do not use your content to train AI
        models, and we never add your stories or bits to the Shutap joke dataset.</b> You can delete
        your posts, comments or whole account at any time.
      </p>

      <h3>2. What we collect</h3>
      <ul>
        <li>
          <b>Account:</b> your email (for sign-in and account emails); the name and picture your
          Google or Apple sign-in shares, or, if you sign in with email, a name made from the part
          of your email address before the @; your plan; timezone, notification settings and
          consent records. Your account record also keeps the name your sign-in provider shared,
          your picture&rsquo;s web address, your approximate city and country, your browser and how
          many times you have signed in.
        </li>
        <li>
          <b>What you write:</b> your original story is checked for contact details and sent to an
          AI model that removes identifying details. If that model doesn&rsquo;t respond, only
          emails, phone numbers and links are removed before saving. We save the cleaned story,
          with the bits Shutap writes from it and any rewrites you make.
        </li>
        <li>
          <b>Rooms:</b> what you post, your comments, likes, saves, follows and reports.
        </li>
        <li>
          <b>Daily limit counters:</b> how many bits you&rsquo;ve made today, tied to your account
          or, for guests, to a random ID stored in your browser, plus, for guests, a short hash of
          your network address for rate limiting. Counters hold no story text.
        </li>
        <li>
          <b>Enterprise requests:</b> if you use the form at shutap.com/business, the name, title,
          company, work email, company size, needs, timeline and message you send. They are emailed to us and used only to
          reply to you. They are not added to your account or to our dataset.
        </li>
        <li>
          <b>Billing:</b> Basic and Pro payments are handled by Stripe. We keep your plan status and
          receipts, not your full card number.
        </li>
        <li>
          <b>Analytics (PostHog):</b> the pages you visit and the actions you take (such as writing
          a bit or starting checkout), your device and browser, your IP address (which PostHog uses
          to estimate your approximate location) and error reports. When you sign in, these are
          linked to your account ID, email and name. Our own database also logs the pages you
          visit, where you came from (referrer and campaign tags), your approximate city and your
          browser.
        </li>
        <li>
          <b>Session replay (PostHog):</b> recordings of clicks, scrolling and the pages you move
          through, used to find and fix problems. Replays show Shutap&rsquo;s own pages, menus and
          buttons. Everything you type, the text of your stories and bits, your set list, Mirror
          and profile, and your name in the menu are hidden, and profile pictures and bit images
          are not recorded. Public pages, such as rooms and posted bits, are recorded as anyone
          would see them. Replays are kept for 30 days.
        </li>
        <li>
          <b>Technical:</b> standard device and log data.
        </li>
      </ul>

      <h3>3. How we use it</h3>
      <p>
        To write your bits and rewrites; to run rooms; to enforce limits; to run the crisis check;
        to provide the Mirror for Pro members (a private read-back of your activity on Shutap); to bill you; to understand how Shutap is used and fix problems; to keep the
        service safe; to improve it using aggregated, de-identified data; and to comply with the
        law.
      </p>

      <h3>4. What&rsquo;s public, and who sees the rest</h3>
      <p>
        Only what you post to a room is public. Posting a bit also publishes the cleaned story
        behind it on its own page. A post appears under the profile name and picture you had when
        you posted it, along with your comments, likes and follows, and your current profile
        picture can be seen by anyone. Bits you don&rsquo;t post stay private. The Mirror is private
        to you. Anyone can download or share a public post, so deleting it can&rsquo;t recall those
        copies.
      </p>
      <p>
        <b>Shutap staff don&rsquo;t read the text of your stories or bits, except to fix a problem
        you report or when the law requires it.</b> Bits you post to a room are public, and we
        review a post when someone reports it. Your stories and bits are never added to the Shutap joke dataset,
        which the Shutap team writes, selects and rates in-house, and Shutap never uses them to
        train or tune AI models.
      </p>

      <h3>5. AI processing</h3>
      <p>
        Your text is sent, through the Lovable AI Gateway, to AI models from Google (Gemini) and
        OpenAI to remove identifying details, run the crisis check, write and rank your bits,
        write rewrites and build the Mirror. Your original story goes to the model that removes
        identifying details; Shutap saves only the cleaned version.{' '}
        <b>We do not use your content to train AI models.</b> We send it to these providers only to
        produce your result, and their handling of what we send is governed by their own terms.
      </p>

      <h3>6. Service providers</h3>
      <p>
        Lovable / Supabase (hosting and database), Google and OpenAI (AI models, via the Lovable AI
        Gateway), Stripe (payments), Resend (email) and PostHog (analytics and session replay).
        Each uses data only to provide its service to us.
      </p>

      <h3>7. Legal and safety disclosure</h3>
      <p>
        We may disclose information when the law requires it (for example, valid legal process) or
        to prevent imminent harm. If the crisis check flags what you write, Shutap saves no story
        and no bit, only a record that a flag happened, with its category and severity, linked to
        your account. That record stays
        private, is excluded from aggregated data, and is never sold.
      </p>

      <h3>7a. Shutap Enterprise requests</h3>
      <p>
        If you ask about Shutap Enterprise or the joke dataset at shutap.com/business, we collect
        the name, title, company, work email, company size, needs, timeline and message you
        send. The form emails them to us through Resend. We use them only to reply, to scope a
        solution and to share pricing. We do not add them to an account, to Mirror patterns or to
        the joke dataset, and we do not sell them. Please do not send confidential company
        material through the form. If we later work together, how company material is handled
        would be set out in a separate written agreement before any is shared. To see or delete
        your request, write to hello@shutap.com.
      </p>

      <h3>8. Retention</h3>
      <p>
        We keep your data while your account is active and as long as needed for the purposes
        above. You can delete a post or comment at any time; it is removed from Shutap at once,
        including the post&rsquo;s story page, and the record is erased when you delete your
        account. Deleting your account in your profile removes your account, profile, uploaded
        profile pictures, bits and the cleaned stories behind them, posts and comments, and cancels
        any subscription, except where the law requires us to keep something. Some records stay
        after account deletion with the link to you removed: page-visit logs, crisis-check
        records, daily counters and logs of failed bit attempts (which hold no story or bit text).
        Your sign-in provider&rsquo;s name stays in your account record until you delete the
        account, even if you change your profile name. To delete a single private bit, email
        hello@shutap.com. Analytics records in PostHog are not removed automatically when you
        delete your account; email us and we will delete them. Session replays are deleted after
        30 days. Daily counters are kept per day and hold no story text.
        Enterprise requests are kept in our email only as long as needed to respond and for our
        records, and you can ask us to delete yours. For guests, the cleaned story and bit are kept
        under the random browser ID, not a name or email, and move to your account if you sign in
        from the bit you just wrote. Guest bits are not currently deleted automatically.
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
        <b>You can delete your posts, comments or whole account in the app.</b> For a copy of your
        data, or to delete a single bit or anything else, email hello@shutap.com. We don&rsquo;t sell personal data, so there is nothing to
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
        We use essential cookies and browser storage to sign you in and keep the service secure, and
        PostHog analytics cookies and browser storage to measure use and record session replays.
        You can block or clear cookies in your browser settings.
      </p>

      <h3>14. Changes and contact</h3>
      <p>
        We&rsquo;ll post updates with a new date and tell you in the app about material changes.
        Questions or requests: hello@shutap.com.
      </p>
    </DocLayout>
  )
}
