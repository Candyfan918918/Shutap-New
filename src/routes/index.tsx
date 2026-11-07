import { createFileRoute } from '@tanstack/react-router'
import { ogImageMeta } from "@/lib/seo/meta";
import { ProductHome } from '@/pages/home/ProductHome'
import { SITE_URL } from '@/lib/site'

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
  // Nov 6 2026: the homepage presents the four product lines; the write box
  // lives on /bits (old box links are forwarded there by ProductHome).
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
  return <ProductHome />
}
