import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { FunniestBrowser } from "@/components/seo/FunniestBrowser";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";
import { FUNNIEST, FUNNIEST_HUB, funniestPath } from "@/lib/seo/funniest";

const TITLE = "The Funniest People in the World, and Their Techniques | Shutap";
const DESCRIPTION =
  "Who is the funniest president, billionaire, actor, philosopher and more, according to the people who rank them, and the techniques creators and comedians can take from each.";
const CAPSULE =
  "Each page answers one question, like who was the funniest US president, using published rankings and sources rather than our own opinion. Then it breaks down how that person was funny into techniques you can use in a video or a set, each with an original example line and a way to try it.";

export const Route = createFileRoute("/funniest/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      // An empty hub is thin content: keep it out of the index until the first entry ships.
      ...(FUNNIEST.length === 0 ? [{ name: "robots", content: "noindex, follow" }] : []),
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}${FUNNIEST_HUB}` },
      ...ogImageMeta(),
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}${FUNNIEST_HUB}` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "The funniest people in the world, and their techniques",
          description: DESCRIPTION,
          url: `${SITE_URL}${FUNNIEST_HUB}`,
          hasPart: FUNNIEST.map((e) => ({
            "@type": "Article",
            headline: e.h1,
            url: `${SITE_URL}${funniestPath(e.slug)}`,
          })),
        }),
      },
      breadcrumbScript([{ name: "The funniest", path: FUNNIEST_HUB }]),
    ],
  }),
  component: () => (
    <ContentPage
      breadcrumbs={[{ name: "The funniest", path: FUNNIEST_HUB }]}
      h1="The funniest people in the world, and what to take from them"
      capsule={CAPSULE}
      sections={[]}
      cta={{ label: "Try a technique on your own story", href: "/" }}
      others={[
        { href: "/guides", label: "Guides" },
        { href: "/guides/how-to-turn-a-story-into-a-bit", label: "How to turn a story into a bit" },
        { href: "/how-it-works", label: "How it works" },
        { href: "/about", label: "About" },
      ]}
    >
      <FunniestBrowser entries={FUNNIEST} />
    </ContentPage>
  ),
});
