import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

const PATH = "/relationships";
const TITLE = "Jokes about dating & relationships — joke generator | Shutap";
const DESCRIPTION =
  "Turn dating, situationships and breakups into jokes. Paste what happened and Shutap's joke generator writes three: the take, the clapback and the roast.";
const H1 = "Relationships";
const CAPSULE =
  "Dating, situationships, breakups and the texts you shouldn't have sent. Paste what happened and Shutap writes three jokes about it. Download them for TikTok, Reels or the stage, or post the best one to a room.";
const WHAT =
  "Relationships are two people performing for each other, and the seams show: the three-day text gap, the read receipt, the \"we should talk\" that turns out to be about a sofa. Shutap writes three angles on it. The take names what was really going on. The clapback is the line you wish you'd said. The roast goes at the situation itself.";
const INVITE =
  "You don't need it to be funny yet. Paste it as it happened and Shutap writes the jokes.";
const FAQ = [
  {
    q: "Can I turn my breakup into a joke?",
    a: "Yes. Paste what happened. Shutap writes three jokes about the situation. The more specific the details, the better the jokes.",
  },
  {
    q: "Will the jokes be about my ex?",
    a: "They're about the situation, never a real person someone could identify. Names and places are removed before anything is saved.",
  },
  {
    q: "Is this relationship advice?",
    a: "No. Shutap writes jokes. It is not advice and not therapy.",
  },
];
const PILLAR = "Relationships";
const OTHERS = [
  { href: "/marriage", label: "Marriage" },
  { href: "/family", label: "Family" },
  { href: "/career", label: "Career" },
  { href: "/rooms", label: "Rooms" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
];

export const Route = createFileRoute("/relationships")({
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

import { PillarPage } from "@/components/seo/PillarPage";
