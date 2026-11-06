import { createFileRoute } from '@tanstack/react-router'
import { ogImageMeta } from "@/lib/seo/meta";
import { HomePage } from '@/pages/home/HomePage'
import { SITE_URL } from '@/lib/site'
import { listDailyIdea } from '@/lib/daily-idea.functions'

const HOME_TITLE = "Shutap Humor Amplifier Lab"
const HOME_DESCRIPTION =
  "Shutap Humor Amplifier Lab helps everyone say it funnier, for any occasion, in any format."
const HOME_OG_DESCRIPTION =
  "Shutap Humor Amplifier Lab helps everyone say it funnier, for any occasion, in any format."

const HOME_URL = `${SITE_URL}/`

export const Route = createFileRoute('/')({
  headers: () => ({
    'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
  }),
  // Coming back to Write reuses the last reading for 5 minutes.
  staleTime: 5 * 60_000,
  // Nothing here blocks the write box: "what to post today" is handed down
  // as a promise and fills in when it lands; on the server it still streams
  // into the HTML, so search engines see the section.
  loader: () => ({ dailyIdea: listDailyIdea().catch(() => null) }),
  head: () => ({
    meta: [
      { title: HOME_TITLE },
      { name: "description", content: HOME_DESCRIPTION },
      { property: "og:title", content: "Shutap Humor Amplifier Lab" },
      { property: "og:description", content: HOME_OG_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: HOME_URL },
      ...ogImageMeta(),
      { name: "twitter:title", content: "Shutap Humor Amplifier Lab" },
      { name: "twitter:description", content: HOME_DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: HOME_URL },
    ],
  }),

  component: HomeRouteComponent,
})

function HomeRouteComponent() {
  const { dailyIdea } = Route.useLoaderData()
  return <HomePage dailyIdea={dailyIdea} />
}
