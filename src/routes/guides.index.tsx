import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";
import { GUIDES, guidePath } from "@/lib/seo/guides";

const PATH = "/guides";
const TITLE = "Guides & Tools for Writing Funnier Videos and Sets | Shutap";
const DESCRIPTION =
  "Guides and tools for creators and comedians: storytime scripts, stand-up bits, POV skits, teleprompter and screenplay pages, plus how to write a hook, tags and a button.";
const CAPSULE =
  "Shutap is an AI bit generator for content creators and comedians. These guides cover the craft: how to turn a story into a bit, how long a TikTok bit should be, and how to write tags, plus the tools for scripts, skits, teleprompter and screenplay pages.";

const toItems = (kind: "tool" | "guide" | "business") =>
  GUIDES.filter((g) => g.kind === kind).map((g) => ({
    href: guidePath(g.slug),
    label: g.h1,
    blurb: g.blurb,
  }));

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
          hasPart: GUIDES.map((g) => ({
            "@type": "WebPage",
            name: g.h1,
            url: `${SITE_URL}${guidePath(g.slug)}`,
          })),
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
      linkGroups={[
        { heading: "Tools", items: toItems("tool") },
        { heading: "Guides", items: toItems("guide") },
        {
          heading: "For business (in development)",
          items: [
            { href: "/business", label: "Request information or the joke dataset", blurb: "Tell us who you are and what you need." },
            ...toItems("business"),
          ],
        },
      ]}
      cta={{ label: "Write your story, get the bit", href: "/" }}
      others={[
        { href: "/how-it-works", label: "How it works" },
        { href: "/pricing", label: "Pricing" },
        { href: "/faq", label: "FAQ" },
        { href: "/about", label: "About" },
      ]}
    />
  ),
});
