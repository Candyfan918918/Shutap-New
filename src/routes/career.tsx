import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { PillarPage } from "@/components/seo/PillarPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

const PATH = "/career";
const TITLE = "Jokes about work & career — joke generator | Shutap";
const DESCRIPTION =
  "Turn work into material: meetings, managers, pay, reply-all. Paste what happened and Shutap's joke generator writes three jokes for TikTok, Reels or the stage.";
const H1 = "Career";
const CAPSULE =
  "Meetings, managers, pay and the job you're supposed to be grateful for. Paste what happened and Shutap writes three jokes about it. Download them for TikTok, Reels or the stage, or post the best one to a room.";
const WHAT =
  "Work runs on rules nobody believes in, which is why it's funny: the meeting about the meeting, the \"quick sync,\" the pizza party instead of a raise. Shutap writes the take, the clapback and the roast. The jokes go at the situation, not at a coworker anyone could identify.";
const INVITE =
  "Paste the thing you can't say on Slack. Shutap writes the jokes.";
const FAQ = [
  {
    q: "Can I joke about my job without it getting back to me?",
    a: "You post under a pseudonym. Names, company names and places are removed before anything is saved.",
  },
  {
    q: "Can I use the jokes on stage or TikTok?",
    a: "Yes. Download them for TikTok, Reels or the stage, or post the best one to a room.",
  },
  {
    q: "Is this career advice?",
    a: "No. Shutap writes jokes. It is not advice and not therapy.",
  },
];
const PILLAR = "Career";
const OTHERS = [
  { href: "/relationships", label: "Relationships" },
  { href: "/marriage", label: "Marriage" },
  { href: "/family", label: "Family" },
  { href: "/rooms?topic=work", label: "Work room" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
];

export const Route = createFileRoute("/career")({
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
          name: PILLAR,
          description: DESCRIPTION,
          url: `${SITE_URL}${PATH}`,
        }),
      },
      breadcrumbScript([{ name: PILLAR, path: PATH }]),
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: () => (
    <PillarPage
      breadcrumbs={[{ name: PILLAR, path: PATH }]}
      h1={H1}
      capsule={CAPSULE}
      what={WHAT}
      invite={INVITE}
      faq={FAQ}
      others={OTHERS}
    />
  ),
});
