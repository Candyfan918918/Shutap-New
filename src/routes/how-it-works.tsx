import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

const PATH = "/how-it-works";
const TITLE = "How Shutap works";
const DESCRIPTION =
  "Paste what happened. Get three jokes. Post the best one to a room, or download it for TikTok, Reels or the stage.";
const CAPSULE = "Paste. Get jokes. Post.";
const SECTIONS = [
  { heading: "1. Paste what happened", body: "One box. Any story. Names and places are removed before anything is saved." },
  { heading: "2. Get three jokes", body: "The take, the clapback, the roast. Guests see one. Sign in free to see all three and keep them." },
  { heading: "3. Post or download", body: "Post to a room — office, work, family, school, live, social — where people like, comment and follow. Or download it. Free downloads carry a small watermark." },
  { heading: "Limits", body: "Five stories a day for everyone." },
  { heading: "Shutap+", body: "No watermark on downloads, plus the Mirror: what keeps coming up in your jokes." },
  { heading: "Safety", body: "Jokes go at the situation, never a real person. Anyone can report a post. If something is heavy, Shutap stops joking and shows you where to get help." },
];
const OTHERS = [
  { href: "/subscribe", label: "What members get" },
  { href: "/faq", label: "FAQ" },
  { href: "/terms#plans", label: "Plans & limits (terms)" },
  { href: "/about", label: "About" },
  { href: "/trust", label: "Trust & privacy" },
];

export const Route = createFileRoute("/how-it-works")({
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
          name: "How Shutap works",
          description: DESCRIPTION,
          url: `${SITE_URL}${PATH}`,
        }),
      },
      breadcrumbScript([{ name: "How it works", path: PATH }]),
    ],
  }),
  component: () => (
    <ContentPage
      breadcrumbs={[{ name: "How it works", path: PATH }]}
      h1="How it works"
      capsule={CAPSULE}
      sections={SECTIONS}
      others={OTHERS}
    />
  ),
});
