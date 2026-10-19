import { createFileRoute } from '@tanstack/react-router'
import { ogImageMeta } from "@/lib/seo/meta";
import { HomePage } from '@/pages/home/HomePage'
import { HOME_FAQ } from '@/pages/home/HomeFAQ'
import { SITE_URL } from '@/lib/site'
import { countOpenRooms } from '@/lib/rooms-count.functions'
import { listNewestRooms } from '@/lib/newest-rooms.functions'
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
  // Coming back to Write reuses the last reading for 5 minutes instead of
  // waiting on three server round-trips every click.
  staleTime: 5 * 60_000,
  loader: async () => {
    const [openRooms, newestRooms, dailyIdea] = await Promise.all([
      countOpenRooms().catch(() => 0),
      listNewestRooms().catch(() => []),
      listDailyIdea().catch(() => null),
    ])
    return { openRooms, newestRooms, dailyIdea }
  },
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
  const { openRooms, newestRooms, dailyIdea } = Route.useLoaderData()
  return <HomePage openRoomsCount={openRooms} newestRooms={newestRooms} dailyIdea={dailyIdea} />
}
