import { createFileRoute } from '@tanstack/react-router'
import { ogImageMeta } from "@/lib/seo/meta";
import { ProductHome } from '@/pages/home/ProductHome'
import { SmallBusinessHome } from '@/pages/home/sb/SmallBusinessHome'
import { getFlags } from '@/lib/flags.functions'
import { useSmallBusinessOpen } from '@/hooks/use-smallbusiness-open'
import { SITE_URL } from '@/lib/site'

// Nov 14 2026 (Candy): titles and descriptions use the words people search
// and ask ChatGPT with (make a joke funnier, funny toast, best man speech,
// listing video script), brand first, banned words never. ChatGPT visits to
// the homepage fell from 25 a week to 2 after the Oct 29 repositioning.
const HOME_TITLE = "Shutap Humor Amplifier Lab · Make your jokes, toasts and speeches funnier"
const HOME_DESCRIPTION =
  "Say it funnier. Turn your own story into a stand-up bit, write a funny toast or best man speech in your words, or turn a real estate listing into a video script and posts. Your words stay yours."
const HOME_OG_DESCRIPTION = HOME_DESCRIPTION

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

  // Nov 21 2026: the small-business homepage shows once /smallbusiness is
  // open (its flag on); admins see it earlier, checked in the browser.
  loader: async () => ({ sb: (await getFlags().catch(() => null))?.smallbusiness ?? false }),
  component: HomeRouteComponent,
})

function HomeRouteComponent() {
  const { sb } = Route.useLoaderData()
  const open = useSmallBusinessOpen(sb)
  return open ? <SmallBusinessHome /> : <ProductHome />
}
