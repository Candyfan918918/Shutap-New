import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

const PATH = "/faq";
const URL = `${SITE_URL}/faq`;
const TITLE = "Shutap FAQ";
const DESCRIPTION =
  "Answers about Shutap: what it is, what's free, posting, privacy and safety.";
const CAPSULE = "Short answers.";

const QA: { heading: string; body: string }[] = [
  { heading: "What is Shutap?", body: "Paste what happened. Shutap writes three jokes: the take, the clapback, the roast. Post the best one to a room, or download it." },
  { heading: "Is it free?", body: "Yes. Writing, posting, following and commenting are free. Five stories a day for everyone. Guests see one joke per story; sign in free to see all three." },
  { heading: "What does Shutap+ buy?", body: "No watermark on downloads, plus the Mirror. $7.99/month or $49.99/year. Cancel anytime. It doesn't buy more stories." },
  { heading: "How do rooms work?", body: "Rooms are topics: office, work, family, school, live, social. Post a joke to one. People can like, comment, save and follow you." },
  { heading: "Who sees what I write?", body: "Only what you post. Everything else stays private. Names, places and contact details are removed before anything is saved." },
  { heading: "Is my name on anything?", body: "No. You get a made-up name. That's what people see and follow." },
  { heading: "What can't I post?", body: "Jokes about a real person someone could identify, real names, hate, spam. Anyone can report a post. Enough reports take it down." },
  { heading: "Who writes the jokes?", body: "AI. It can get things wrong." },
  { heading: "Is this therapy?", body: "No. Shutap writes jokes. No advice, no diagnosis." },
  { heading: "What if something is heavy?", body: "Shutap stops joking. US: call or text 988. UK: Samaritans 116 123. Anywhere: findahelpline.com." },
  { heading: "Can I delete my stuff?", body: "Yes. Delete any post, set or your account in settings, or email privacy@shutap.com." },
  { heading: "Do you sell my data?", body: "No." },
  { heading: "Who can use it?", body: "Adults 18+." },
];

const OTHERS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/subscribe", label: "What members get" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/guidelines", label: "House rules" },
  { href: "/safety", label: "If it\u2019s heavy" },
  { href: "/ai-disclosure", label: "AI disclosure" },
  { href: "/legal", label: "Legal & policies" },
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
      h1="FAQ"
      capsule={CAPSULE}
      sections={QA}
      others={OTHERS}
      nosnippetCapsule
    />
  ),
});
