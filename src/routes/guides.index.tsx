import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";
import { GUIDES, guidePath } from "@/lib/seo/guides";
import { GuidesBrowser } from "@/components/seo/GuidesBrowser";

const PATH = "/guides";
const TITLE = "Guides & Tools for Writing Funnier Videos and Sets | Shutap";
const DESCRIPTION =
  "Guides and tools for creators and comedians: storytime scripts, stand-up bits, POV skits, teleprompter and screenplay pages, plus how to write a hook, tags and a button.";
const CAPSULE =
  "Tools and guides from Shutap, the AI joke generator for creators: search, pick a category, or sort by newest.";

export const Route = createFileRoute("/guides/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}${PATH}` },
      ...ogImageMeta(),
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}${PATH}` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Shutap guides and tools",
          description: DESCRIPTION,
          url: `${SITE_URL}${PATH}`,
          hasPart: [{
            "@type": "WebPage",
            name: "AI joke generator",
            url: `${SITE_URL}/ai-joke-generator`,
          }, ...GUIDES.map((g) => ({
            "@type": "WebPage",
            name: g.h1,
            url: `${SITE_URL}${guidePath(g.slug)}`,
          }))],
        }),
      },
      breadcrumbScript([{ name: "Guides", path: PATH }]),
    ],
  }),
  component: () => (
    <ContentPage
      breadcrumbs={[{ name: "Guides", path: PATH }]}
      h1="Guides and tools for writing funnier"
      capsule={CAPSULE}
      sections={[]}
      children={<GuidesBrowser />}
      cta={{ label: "Write your story, get the bit", href: "/" }}
      others={[
        { href: "/funniest", label: "The funniest people and their techniques" },
        { href: "/how-it-works", label: "How it works" },
        { href: "/pricing", label: "Pricing" },
        { href: "/faq", label: "FAQ" },
        { href: "/about", label: "About" },
      ]}
    />
  ),
});
