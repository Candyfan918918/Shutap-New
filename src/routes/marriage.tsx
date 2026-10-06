import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { PillarPage } from "@/components/seo/PillarPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

const PATH = "/marriage";
const TITLE = "Jokes about marriage — AI joke generator | Shutap";
const DESCRIPTION =
  "Turn marriage into material: chore wars, roommate energy, the same fight on repeat. Paste what happened and Shutap's joke generator writes three jokes.";
const H1 = "Marriage";
const CAPSULE =
  "The long haul: chore wars, roommate energy, the thermostat, the same fight on repeat. Paste what happened and Shutap writes three jokes about it. Download them for TikTok, Reels or the stage, or post the best one to a room.";
const WHAT =
  "Marriage is a long-running show with two writers who disagree about the plot. The good material is in the specifics: who loaded the dishwasher wrong, what \"I'm fine\" meant on Tuesday, the argument that has its own seasons. Shutap writes the take, the clapback and the roast. Every joke goes at the situation, not at you.";
const INVITE =
  "No highlight reel. Paste what actually happened and Shutap writes the jokes.";
const FAQ = [
  {
    q: "Can I joke about my marriage without my spouse knowing?",
    a: "You post under a pseudonym, never your real name. Names and places are removed before anything is saved. Nothing is public unless you post it to a room.",
  },
  {
    q: "Will the jokes make fun of my husband or wife?",
    a: "No. The jokes go at the situation, never at a real person someone could identify.",
  },
  {
    q: "Is this marriage advice?",
    a: "No. Shutap writes jokes. It is not advice and not therapy.",
  },
];
const PILLAR = "Marriage";
const OTHERS = [
  { href: "/relationships", label: "Relationships" },
  { href: "/family", label: "Family" },
  { href: "/career", label: "Career" },
  { href: "/rooms", label: "Rooms" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
];

export const Route = createFileRoute("/marriage")({
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
