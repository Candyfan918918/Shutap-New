import { createFileRoute } from '@tanstack/react-router'
import { ogImageMeta } from "@/lib/seo/meta";
import { HomePage } from '@/pages/home/HomePage'
import { SITE_URL } from '@/lib/site'

const HOME_TITLE = "Shutap Humor Amplifier Lab"
const HOME_DESCRIPTION =
  "Shutap is the humor amplifier. Type what happened and get a bit in your voice: hook, setup, tags and button, with a 5-second video, caption and hashtags. Run it in the teleprompter, as a scene or a screenplay page."
const HOME_OG_DESCRIPTION =
  "Shutap is the humor amplifier. Type what happened and get a bit in your voice: hook, setup, tags and button, with a 5-second video, caption and hashtags. Run it in the teleprompter, as a scene or a screenplay page."

const HOME_URL = `${SITE_URL}/`

export const Route = createFileRoute('/')({
  headers: () => ({
    'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
  }),
  // Coming back to Write reuses the last reading for 5 minutes.
  staleTime: 5 * 60_000,
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
      { name: "twitter:description", content: "Shutap is the humor amplifier. Type what happened and get a bit in your voice: hook, setup, tags and button, with a 5-second video, caption and hashtags. Run it in the teleprompter, as a scene or a screenplay page." },
    ],
    links: [
      { rel: "canonical", href: HOME_URL },
    ],
  }),

  component: HomeRouteComponent,
})

function HomeRouteComponent() {
  return <HomePage />
}
