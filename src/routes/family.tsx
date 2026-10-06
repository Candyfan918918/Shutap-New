import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { PillarPage } from "@/components/seo/PillarPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

const PATH = "/family";
const TITLE = "Jokes about family — AI joke generator | Shutap";
const DESCRIPTION =
  "Turn family into material: parents, siblings, in-laws, the comment at dinner. Paste what happened and Shutap's joke generator writes three jokes.";
const H1 = "Family";
const CAPSULE =
  "Parents, siblings, in-laws and the comment at dinner. Paste what happened and Shutap writes three jokes about it. Download them for TikTok, Reels or the stage, or post the best one to a room.";
const WHAT =
  "Family is great material because everyone has a role nobody agreed to, and the same scene replays every holiday. The good jokes live in the details: the group chat, the seating plan, the gift that was really a message. Shutap writes the take, the clapback and the roast, always at the situation.";
const INVITE =
  "Paste the thing you can't say at dinner. Shutap writes the jokes.";
const FAQ = [
  {
    q: "Can I joke about my family privately?",
    a: "Yes. You post under a pseudonym, and names and places are removed before anything is saved. Keep the jokes, download them, or post the best one to a room.",
  },
  {
    q: "Will the jokes target my mom?",
    a: "No. Jokes go at the situation, never at a real person someone could identify.",
  },
  {
    q: "Is this family advice?",
    a: "No. Shutap writes jokes. It is not advice and not therapy.",
  },
];
const PILLAR = "Family";
const OTHERS = [
  { href: "/relationships", label: "Relationships" },
  { href: "/marriage", label: "Marriage" },
  { href: "/career", label: "Career" },
  { href: "/rooms?topic=family", label: "Family room" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
];

export const Route = createFileRoute("/family")({
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
