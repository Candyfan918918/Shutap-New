import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

const PATH = "/how-it-works";
const TITLE = "How the Shutap AI Joke Generator Works — Story to Jokes in Seconds";
const DESCRIPTION =
  "How to turn a real story into jokes with AI: paste what happened, get a take, a clapback and a roast, then download for TikTok, Reels or Shorts, or post to a room. Free to start.";
const CAPSULE =
  "Paste what happened. Shutap's AI joke generator writes three jokes about it. Download the one you like for TikTok, Reels or YouTube Shorts, use it on stage, or post it to a room.";
const STEPS = [
  { heading: "1. Paste what happened", body: "One box, any story: the meeting that should have been an email, the text from your mom, the roommate's girlfriend who never left. More detail means better jokes. What they actually said, word for word, is usually the funniest part." },
  { heading: "2. Shutap removes names and places", body: "Before anything is saved, names, addresses, places, phone numbers and emails are taken out. Only the cleaned text is kept, so the jokes are about the situation, not a person someone could look up." },
  { heading: "3. Get three jokes", body: "Shutap writes a set of three: the take (what really happened, said sharper), the clapback (the comeback you wish you'd said) and the roast (the situation, roasted). Each is written fresh for your story, and several drafts are ranked so you see the strongest one." },
  { heading: "4. Use it", body: "Download a joke as a vertical image for TikTok, Instagram Reels or YouTube Shorts. Copy the text into a script or a caption. Work it into a stand-up bit. Or post it to a room — office, work, family, school, live or social — where people like, comment and follow." },
];
const SECTIONS = [
  ...STEPS,
  { heading: "What's free", body: "Writing jokes is free. Guests see one joke per story with no account. Signing in is free and shows all three, keeps them in your set list, and lets you post, follow, like and comment. Free downloads carry a small Shutap watermark." },
  { heading: "Daily limit", body: "Five stories a day for everyone, free or paid." },
  { heading: "Shutap+", body: "$7.99 a month or $49.99 a year. Removes the watermark from every download and adds the Mirror, a private read-back of what keeps coming up in your stories. It doesn't buy more jokes. Cancel anytime." },
  { heading: "Tips for funnier jokes", body: "Give the specific detail, not the summary: the exact text, the time it happened, the object involved. Say who did what. Leave out real names — Shutap removes them anyway. If a set feels thin, add what they actually said and run it again." },
  { heading: "Safety", body: "Jokes go at the situation, never at a real person. If what you paste reads as a crisis, Shutap writes no jokes and shows where to get help instead. Shutap is entertainment, not therapy or advice. 18+." },
];
const OTHERS = [
  { href: "/", label: "Write jokes" },
  { href: "/rooms", label: "Rooms" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
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
          "@type": "HowTo",
          name: "How to turn a story into jokes with Shutap",
          description: DESCRIPTION,
          url: `${SITE_URL}${PATH}`,
          totalTime: "PT1M",
          estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: "0" },
          step: STEPS.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.heading.replace(/^\d+\.\s*/, ""),
            text: s.body,
          })),
        }),
      },
      breadcrumbScript([{ name: "How it works", path: PATH }]),
    ],
  }),
  component: () => (
    <ContentPage
      breadcrumbs={[{ name: "How it works", path: PATH }]}
      h1="How the AI joke generator works"
      capsule={CAPSULE}
      sections={SECTIONS}
      others={OTHERS}
    />
  ),
});
