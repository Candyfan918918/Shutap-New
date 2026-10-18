import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";
import { FAQ_ITEMS as QA } from "@/lib/seo/faq";

const PATH = "/faq";
const URL = `${SITE_URL}/faq`;
const TITLE = "AI Bit & Joke Generator FAQ — Shutap for Creators & Comedians";
const DESCRIPTION =
  "Answers about Shutap, the AI bit generator for content creators and comedians: is it free, the teleprompter, scene and screenplay views, TikTok and stand-up, who owns the bits, privacy and pricing.";
const CAPSULE =
  "Everything people ask about Shutap, the AI bit generator that turns a real story into a bit for TikTok, Reels, YouTube Shorts and the stage.";



const OTHERS = [
  { href: "/", label: "Write jokes" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/guides", label: "Guides" },
  { href: "/business", label: "Enterprise" },
  { href: "/trust", label: "Trust & privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      ...ogImageMeta(),
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: QA.map((q) => ({
            "@type": "Question",
            name: q.heading,
            acceptedAnswer: { "@type": "Answer", text: q.body },
          })),
        }),
      },
      breadcrumbScript([{ name: "FAQ", path: "/faq" }]),
    ],
  }),
  component: () => (
    <ContentPage
      breadcrumbs={[{ name: "FAQ", path: "/faq" }]}
      h1="AI bit generator FAQ"
      capsule={CAPSULE}
      sections={QA}
      others={OTHERS}
    />
  ),
});
