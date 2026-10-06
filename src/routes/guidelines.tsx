import { createFileRoute } from '@tanstack/react-router'
import { ogImageMeta } from "@/lib/seo/meta";
import { DocLayout } from '@/components/site/DocLayout'
import { SITE_URL } from '@/lib/site'

const URL = `${SITE_URL}/guidelines`
const TITLE = 'House rules — Shutap'
const DESCRIPTION =
  'Joke about the situation, never about a real person. What\u2019s allowed in Shutap rooms and what gets removed.'

export const Route = createFileRoute('/guidelines')({
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
  component: GuidelinesPage,
})

function GuidelinesPage() {
  return (
    <DocLayout
      active="/guidelines"
      title="House rules"
      subline="the short version"
    >
      <div
        style={{
          background: '#fff',
          border: '.5px solid rgba(11,8,15,.08)',
          borderRadius: 18,
          padding: '22px 24px',
          marginTop: 18,
        }}
      >
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            <b>Joke about the situation, never about a real person someone could identify.</b>
          </li>
          <li>
            <b>No real names.</b> No addresses, workplaces, handles or anything else that points to
            someone. Our scrubber removes a lot of this. Don&rsquo;t add it back in a caption or
            comment.
          </li>
          <li>No harassment, threats or targeting anyone.</li>
          <li>No hate.</li>
          <li>No sexual content involving minors. Ever.</li>
          <li>No doxxing.</li>
          <li>No spam, impersonation or scraping.</li>
          <li>Nothing illegal.</li>
          <li>
            Five stories a day is the limit for everyone. Don&rsquo;t make extra accounts to get
            around it.
          </li>
          <li>
            See something that breaks these rules? <b>Report it.</b> When three different people
            report a post, it&rsquo;s hidden until we review it.
          </li>
        </ul>
      </div>
      <p style={{ marginTop: 16 }}>
        Break the rules and we remove the content and may suspend or close the account. You can
        delete your own posts and comments at any time.
      </p>
    </DocLayout>
  )
}
