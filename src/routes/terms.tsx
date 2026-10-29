import { createFileRoute } from '@tanstack/react-router'
import { ogImageMeta } from "@/lib/seo/meta";
import { DocLayout } from '@/components/site/DocLayout'
import { SITE_URL } from '@/lib/site'

const URL = `${SITE_URL}/terms`
const TITLE = "Terms of Service — Shutap, the Humor Amplifier"
const DESCRIPTION =
  "Terms for using Shutap, the humor amplifier: using the jokes you generate, posting to rooms, house rules, Basic and Pro billing, AI output and liability."

export const Route = createFileRoute('/terms')({
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
  component: TermsPage,
})

function TermsPage() {
  return (
    <DocLayout
      active="/terms"
      title="Terms of Service"
      subline="Last updated: October 17, 2026 · Operator: Shutap"
    >
      <p>
        These terms are an agreement between you and Shutap. By using Shutap, you agree to them.
      </p>

      <h3>1. What Shutap is</h3>
      <p>
        Shutap is the humor amplifier: it amplifies your own story into a bit. You type what
        happened. Shutap removes identifying details and writes comedy from it, in your voice, with
        a short video, a caption and hashtags, and teleprompter, scene and screenplay views. You
        can download, share or post what it writes. Shutap amplifies your humor; it never replaces
        it. Shutap is for entertainment only.
      </p>
      <p>
        We are also developing Shutap Enterprise, for presentations, demos, launches and meetings.
        It is not yet available. A request for pricing or solutions, or a request about our joke
        dataset, is not an offer or a contract. Any enterprise or dataset access would be covered
        by a separate written agreement.
      </p>

      <h3>2. What Shutap is not</h3>
      <p>
        <b>
          Shutap is not therapy, not medical or legal advice, not a diagnosis, and not a crisis
          service.
        </b>{' '}
        Using it creates no professional relationship of any kind. Nothing on Shutap, including the
        Mirror, is advice. Don&rsquo;t use Shutap in place of professional care.
      </p>

      <h3>3. Emergencies</h3>
      <p>
        If you or someone else may be in danger, contact emergency services. In the US, call or
        text <b>988</b> or call <b>911</b>. In the UK and Ireland, call Samaritans on{' '}
        <b>116 123</b>. Elsewhere, go to findahelpline.com. If something you type reads as a
        crisis, Shutap writes no jokes and shows these resources instead.
      </p>

      <h3>4. Age</h3>
      <p>
        You must be <b>18 or older</b> to use Shutap. By using it, you confirm you are.
      </p>

      <h3>5. Your account and profile name</h3>
      <p>
        Your profile shows the name and picture your Google or Apple sign-in shares, or, if you
        sign in with email, a name made from your email address. You can change both in your
        profile. New posts appear under your current name; posts you have already made keep the
        name they were posted under. We can&rsquo;t promise anonymity against valid
        legal process, and we may disclose information when the law
        requires it (see the Privacy Policy). You are responsible for what happens under your
        account.
      </p>

      <h3>6. Your content</h3>
      <p>
        <b>You own what you write and what you keep. We don&rsquo;t claim your ideas or use them in
        our own content.</b> To run Shutap, you give us a non-exclusive, worldwide,
        royalty-free license to store, process, de-identify, host, display and distribute your
        content on Shutap. We may also use de-identified content in aggregate, such as usage
        statistics, to operate and improve the service. We never use your content to train or tune
        AI models, and we never add it to the Shutap joke dataset, which the Shutap team writes,
        selects and rates in-house. The license for a post ends when you delete it, except for copies we
        must keep by law and copies others already downloaded or shared.
      </p>
      <p>
        The jokes Shutap writes for you are yours to save, share and post, including in your
        own content. AI output may be similar to output for other people, and we don&rsquo;t
        promise any joke is unique or free of third-party rights.
      </p>
      <p>
        You confirm you have the right to share what you submit and that it doesn&rsquo;t
        violate anyone&rsquo;s rights or these terms.
      </p>

      <h3>7. Rooms and public posts</h3>
      <p>
        Rooms are public topic feeds. When you post a joke to a room, anyone can see it under your
        profile name and picture, along with the cleaned story behind it on its own page, and
        people can like, comment on, save, report and follow. Jokes you don&rsquo;t
        post stay private. You can delete your posts and comments at any time, which also takes down the post&rsquo;s story page. We can&rsquo;t
        recall copies others have already downloaded or shared.
      </p>

      <h3>8. House rules</h3>
      <p>Joke about the situation, never about a real person someone could identify. Don&rsquo;t:</p>
      <ul>
        <li>post real names or anyone&rsquo;s private or identifying information (doxxing);</li>
        <li>harass, threaten or target anyone;</li>
        <li>post hate;</li>
        <li>post any sexual content involving minors;</li>
        <li>post anything illegal or infringing;</li>
        <li>spam, impersonate, scrape, or misuse the service or its AI;</li>
        <li>try to identify other users;</li>
        <li>make extra accounts or sessions to get around limits.</li>
      </ul>

      <h3>9. Moderation and reporting</h3>
      <p>
        Anyone can report a post or comment. When three different people report a post, it is
        hidden until we review it. We may remove any content and suspend or close any account that
        breaks these terms or the law, with or without notice. To ask us to remove content about
        you, write to hello@shutap.com or use the report page.
      </p>

      <h3>10. Copyright notices</h3>
      <p>
        If you believe content on Shutap infringes your copyright, email hello@shutap.com with:
        your contact details; the work you say is infringed; the link to the content; a statement
        that you believe in good faith the use isn&rsquo;t authorized; a statement, under penalty
        of perjury, that your notice is accurate and you are the owner or authorized to act for
        them; and your physical or electronic signature. If your content was removed and you
        believe it was a mistake, you may send a counter-notice to the same address. We close the
        accounts of repeat infringers.
      </p>

      <h3>11. AI output</h3>
      <p>
        Jokes are written by AI.{' '}
        <b>They can be wrong, unfunny or offensive, and you must not rely on them</b> for any
        decision. They are provided &ldquo;as is.&rdquo; You are responsible for what you post,
        save and share.
      </p>

      <h3 id="plans">12. Free use and daily limits</h3>
      <p>
        A guest can write <b>one new bit a day</b> without an account. Signing in is free and allows
        <b>two new bits a day</b> in total, counting any bit written as a guest that day. Basic allows
        five a day; Pro has no daily number, within fair use. A rewrite (hotter, tighter, escalate)
        counts as a new bit; swapping a tag or mixing your own does not. Signing in keeps your bits
        in your set list and lets you post them.
      </p>
      <p>
        Downloads are counted separately. The video, the caption and hashtags (when copied), and
        the picture or script PDF each count as one download; the same one of the same version
        again the same day is free. Guests can watch but not download. A free account gets
        <b>one download a day</b>, with a shutap.com watermark on the video and the picture. Basic
        gets <b>three a day</b> with no watermark; Pro has no daily number, within fair use.
      </p>
      <p>
        Limits reset at midnight Pacific time (Los Angeles) for everyone. Limits are a cost
        control, not a promise. We may change, reduce or pause them, add rate limits, and refuse
        to write a set for anything our safety checks flag.
      </p>

      <h3 id="refunds">13. Paid plans, billing and refunds</h3>
      <p>
        <b>Basic</b> costs <b>US$1.99 per month</b> and allows five new bits a day and three
        downloads a day with no watermark. <b>Pro</b> costs <b>US$7.99 per month</b> (or US$49.99 per
        year where offered) and allows unlimited new bits and downloads within fair use, no
        watermark, and the Mirror. Prices are plus
        any taxes, billed through Stripe. Moving from Basic to Pro charges the prorated difference
        for the current period at the time you switch.
      </p>
      <p>
        <b>There is no free trial. You are charged when you subscribe.</b> A paid plan renews
        automatically each period at the price shown at checkout until you cancel. You can cancel
        anytime. You keep access until the end of the paid period, then return to the free plan.
        Your set list stays. <b>Payments already made are not refunded</b>, except where the law
        requires it.
      </p>

      <h3>14. Your risk</h3>
      <p>
        Jokes about real situations can sting, miss, or land wrong. You use Shutap at your own
        risk.
      </p>

      <h3>15. Disclaimers</h3>
      <p>
        Shutap is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties
        of any kind, express or implied, including fitness for a particular purpose,
        non-infringement, and any warranty that the service or AI output is accurate, reliable or
        suitable for you.
      </p>

      <h3>16. Limitation of liability</h3>
      <p>
        To the fullest extent the law allows, Shutap and its operators are not liable for any
        indirect, incidental, special, consequential or punitive damages, or for any reliance on AI
        output or user content. Our total liability is limited to the greater of what you paid us
        in the past 12 months or <b>US$100</b>.
      </p>

      <h3>17. Indemnity</h3>
      <p>
        You agree to indemnify Shutap against claims arising from your content or your breach of
        these terms.
      </p>

      <h3>18. Ending your use</h3>
      <p>
        You can delete your account at any time. We may suspend or end your access if you break
        these terms.
      </p>

      <h3>19. Disputes and governing law</h3>
      <p>
        Before filing any claim, contact us at hello@shutap.com and try to resolve it informally
        for at least 30 days. Anything not resolved that way goes to{' '}
        <b>binding individual arbitration</b>, not court, except that either side may bring an
        individual claim in small-claims court. You and Shutap{' '}
        <b>give up any right to a jury trial and to take part in a class action</b> or class-wide
        arbitration. These terms are governed by the laws of the State of Delaware, USA, without
        regard to conflict-of-laws rules. The state or federal courts in Delaware are the only
        venue for anything not subject to arbitration.
      </p>

      <h3>20. Changes</h3>
      <p>
        We may update these terms. We&rsquo;ll post the new version with a new date and ask you to
        accept material changes.
      </p>

      <h3>21. Contact</h3>
      <p>hello@shutap.com</p>
    </DocLayout>
  )
}
