import { createFileRoute } from '@tanstack/react-router'
import { ogImageMeta } from "@/lib/seo/meta";
import { HomePage } from '@/pages/home/HomePage'
import { HOME_FAQ } from '@/pages/home/HomeFAQ'
import { SITE_URL } from '@/lib/site'
import { listDailyIdea } from '@/lib/daily-idea.functions'

const HOME_TITLE = "Shutap — AI Joke Generator for Creators"
const HOME_DESCRIPTION =
  "Shutap is the AI joke generator for creators. Write your story and get a bit: hook, setup, tags and button. Run it in the teleprompter, as a scene or a screenplay page."
const HOME_OG_DESCRIPTION =
  "Shutap is the AI joke generator for creators. Write your story and get a bit: hook, setup, tags and button. Run it in the teleprompter, as a scene or a screenplay page."

const HOME_URL = `${SITE_URL}/`

export const Route = createFileRoute('/')({
  headers: () => ({
    'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
  }),
  // Coming back to Write reuses the last reading for 5 minutes.
  staleTime: 5 * 60_000,
  // Nothing here blocks the write box (Oct 21 2026): "what to post today" is
  // handed down as a promise and fills in when it lands (it can wait on
  // Wikipedia for seconds), so a click on Write shows the page at once. On
  // the server the promise still streams into the HTML, so search engines
  // see the section. The open-rooms count and newest rooms are no longer
  // shown on the homepage, so they are no longer fetched.
  loader: () => ({ dailyIdea: listDailyIdea().catch(() => null) }),
  head: () => ({
    meta: [
      { title: HOME_TITLE },
      { name: "description", content: HOME_DESCRIPTION },
      { property: "og:title", content: "Shutap — AI Joke Generator for Creators" },
      { property: "og:description", content: HOME_OG_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: HOME_URL },
      ...ogImageMeta(),
      { name: "twitter:title", content: "Shutap — AI Joke Generator for Creators" },
      { name: "twitter:description", content: "Shutap is the AI joke generator for creators. Write your story and get a bit: hook, setup, tags and button. Run it in the teleprompter, as a scene or a screenplay page." },
    ],
    links: [
      { rel: "canonical", href: HOME_URL },
    ],
    scripts: [
      // Runs before the app loads: whatever a visitor types into the story
      // box in the first seconds is copied to the draft, so the box doesn't
      // come back empty once the app takes it over.
      {
        children:
          "document.addEventListener('input',function(e){var t=e.target;if(t&&t.id==='bit-story'){try{sessionStorage.setItem('shutap_bit_draft',t.value)}catch(_){}}},true);",
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: HOME_FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),

  component: HomeRouteComponent,
})

function HomeRouteComponent() {
  const { dailyIdea } = Route.useLoaderData()
  return <HomePage dailyIdea={dailyIdea} />
}
