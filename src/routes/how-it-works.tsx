import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

const PATH = "/how-it-works";
const TITLE = "How Shutap Works — Turn a Story Into a Bit With AI";
const DESCRIPTION =
  "How to turn a real story into a comedy bit with AI: paste what happened, get the hook, setup, tags and button, then film it with the teleprompter, shoot it as a scene, or export a screenplay page.";
const CAPSULE =
  "Paste what happened. Shutap writes it into a bit — hook, setup, tags and a button. Read it off the teleprompter, shoot it as a scene, or take the screenplay page. Then post the best one to a room.";
const STEPS = [
  { heading: "1. Paste what happened", body: "One box, any story: the meeting that should have been an email, the text from your mom, the roommate's girlfriend who never left. More detail means a better bit. What they actually said, word for word, is usually the funniest part." },
  { heading: "2. Shutap removes names and places", body: "Before anything is saved, names, addresses, places, phone numbers and emails are taken out. Only the cleaned text is kept, so the bit is about the situation, not a person someone could look up." },
  { heading: "3. Get the bit", body: "Shutap writes your story as a bit: a hook for the first two seconds, a setup that tells it straight, tags that keep it going, and a button to end on. Several drafts are written and ranked so you see the strongest one." },
  { heading: "4. Pick your format", body: "Teleprompter: full-screen scrolling text to read to camera. Scene: the bit laid out beat by beat for a POV or skit. Screenplay page: formatted like a script, with characters and action." },
  { heading: "5. Film it or post it", body: "Shoot it for TikTok, Instagram Reels or YouTube Shorts, take it to an open mic, or post it to a room — office, work, family, school, live or social — where people like, comment and follow." },
];
const SECTIONS = [
  ...STEPS,
  { heading: "What's free", body: "Writing bits is free. Your first bit needs no account. Signing in is free, keeps every bit in your set list, and lets you post, follow, like and comment. Free downloads carry a small Shutap watermark." },
  { heading: "Daily limit", body: "Five stories a day for everyone, free or paid." },
  { heading: "Shutap+", body: "$7.99 a month or $49.99 a year. Removes the watermark from every download and adds the Mirror, a private read-back of what keeps coming up in your stories. It doesn't buy more bits. Cancel anytime." },
  { heading: "Tips for a funnier bit", body: "Give the specific detail, not the summary: the exact text, the time it happened, the object involved. Say who did what. Leave out real names — Shutap removes them anyway. If a bit feels thin, add what they actually said and run it again." },
  { heading: "Safety", body: "Bits go at the situation, never at a real person. If what you paste reads as a crisis, Shutap writes nothing and shows where to get help instead. Shutap is entertainment, not therapy or advice. 18+." },
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
          name: "How to turn a story into a comedy bit with Shutap",
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
      h1="How the AI bit generator works"
      capsule={CAPSULE}
      sections={SECTIONS}
      others={OTHERS}
    />
  ),
});
