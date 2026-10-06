import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

const PATH = "/about";
const TITLE = "About Shutap";
const DESCRIPTION =
  "Shutap turns what happened into jokes for TikTok, Reels or the stage, and a place to post them. Pseudonymous, 18+.";
const CAPSULE =
  "You have the story. Shutap writes the jokes. Paste what happened, get a set of jokes from different angles, post the best one or take it to camera.";
const SECTIONS = [
  { heading: "Who it's for", body: "Content creators, comedians, and anyone who tells the story better than they joke about it." },
  { heading: "What you get", body: "Three jokes per story: the take, the clapback, the roast. Download them, share them, or post them to a room where people can like, comment and follow." },
  { heading: "The one rule", body: "Joke about the situation, not a real person. Names, places and contact details are removed before anything is saved. Posts that target someone get reported and taken down." },
  { heading: "Pseudonymous", body: "You get a made-up name. It's what people see and follow. Your real name never shows." },
  { heading: "Not therapy", body: "Shutap writes jokes. It doesn't give advice or diagnose anything. If something is heavy, it stops joking and shows you where to get help." },
  { heading: "18+", body: "Adults only." },
];
const OTHERS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/trust", label: "Trust & privacy" },
];

export const Route = createFileRoute("/about")({
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
          "@type": "WebPage",
          name: "About Shutap",
          description: DESCRIPTION,
          url: `${SITE_URL}${PATH}`,
        }),
      },
      breadcrumbScript([{ name: "About", path: PATH }]),
    ],
  }),
  component: () => (
    <ContentPage
      breadcrumbs={[{ name: "About", path: PATH }]}
      h1="About"
      capsule={CAPSULE}
      sections={SECTIONS}
      others={OTHERS}
    />
  ),
});
