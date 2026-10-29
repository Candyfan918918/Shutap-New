import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";
import { GUIDES, GUIDE_TOPICS, guidePath, guidesInTopic, topicPath } from "@/lib/seo/guides";

const PATH = "/guides";
const TITLE = "Guides & Tools for Writing Funnier Videos and Sets | Shutap";
const DESCRIPTION =
  "Guides and tools from the Shutap Humor Lab: storytime scripts, stand-up bits, POV skits, toasts, captions, teleprompter and screenplay pages, plus how to write a hook, tags and a button. Every technique here feeds the humor amplifier.";
const CAPSULE =
  "Shutap is the humor amplifier. These guides cover the craft: how to turn a story into a bit, how long a TikTok bit should be, and how to write tags, plus the tools for scripts, skits, teleprompter and screenplay pages.";

const toItems = (kind: "tool" | "guide" | "business") =>
  GUIDES.filter((g) => g.kind === kind).map((g) => ({
    href: guidePath(g.slug),
    label: g.h1,
    blurb: g.blurb,
  }));

// Guides grouped by topic: the newest few per topic, then a link to the topic
// hub that lists all of them. Stays readable however many articles exist.
const PER_TOPIC = 5;
const topicGroups = () =>
  GUIDE_TOPICS.map((t) => ({ t, list: guidesInTopic(t.id) }))
    .filter((x) => x.list.length > 0)
    .map(({ t, list }) => ({
      heading: t.label,
      items: [
        ...list.slice(0, PER_TOPIC).map((g) => ({ href: guidePath(g.slug), label: g.h1, blurb: g.blurb })),
        { href: topicPath(t.id), label: `All ${t.label.toLowerCase()} guides (${list.length}) →`, blurb: t.description },
      ],
    }));
const untopicGuides = () =>
  GUIDES.filter((g) => g.kind === "guide" && !g.topic).map((g) => ({ href: guidePath(g.slug), label: g.h1, blurb: g.blurb }));

export const Route = createFileRoute("/guides/")({
  codeSplitGroupings: [["component"]],
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
      tryIt="guides"
      breadcrumbs={[{ name: "Guides", path: PATH }]}
      h1="Guides and tools for writing funnier"
      capsule={CAPSULE}
      sections={[]}
      linkGroups={[
        { heading: "Tools", items: [
          { href: "/ai-joke-generator", label: "AI joke generator", blurb: "Turn your own story into a complete comedy bit: hook, setup, tags and button — not random one-liners." },
          ...toItems("tool"),
        ] },
        ...topicGroups(),
        ...(untopicGuides().length ? [{ heading: "More guides", items: untopicGuides() }] : []),
        {
          heading: "Shutap Enterprise (in development)",
          items: [
            { href: "/business", label: "Request pricing and solutions", blurb: "Humor for presentations, demos, launches and meetings." },
            ...toItems("business"),
          ],
        },
      ]}
      cta={{ label: "Type what happened. Say it funnier.", href: "/" }}
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
