import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

const PATH = "/about";
const TITLE = "About Shutap — AI Bit & Joke Generator for Content Creators & Comedians";
const DESCRIPTION =
  "Shutap is an AI bit generator for content creators and comedians. Write your story, get a bit with a hook, setup, tags and button, then run it in the teleprompter, as a scene or a screenplay page.";
const CAPSULE =
  "Shutap is an AI bit generator for content creators and comedians. Write your story. Shutap turns it into a bit — hook, setup, tags and a button — then runs it in the teleprompter, lays it out as a scene, or formats it as a screenplay page.";
const SECTIONS = [
  {
    heading: "A bit, not a pun",
    body: "Most joke generators hand you a one-liner about a keyword. Shutap writes a bit from your real story: a hook that stops the scroll, a setup that tells it straight, tags that keep the laughs coming, and a button to end on. It uses your details, so it sounds like you, not like anyone could have posted it.",
  },
  {
    heading: "Built for content creators",
    body: "Storytime, POV, talking-head and skit videos all run on the same structure. Write the story you were going to tell anyway, get the bit, and read it straight off the teleprompter while you film for TikTok, Instagram Reels or YouTube Shorts.",
  },
  {
    heading: "Built for comedians",
    body: "Stand-up starts with a premise and lives on tags. Shutap gives you a first draft of the bit — setup, tags, button — to push against your own instincts. Use it to get unstuck, find a new tag, or warm up before a writing session, then rehearse it on the prompter.",
  },
  {
    heading: "Teleprompter, scene and screenplay",
    body: "Every bit comes in three views. The teleprompter scrolls it full-screen for filming to camera. The scene lays it out beat by beat for a POV or sketch. The screenplay page formats it like a script, with characters and action, ready to shoot or share.",
  },
  {
    heading: "Post the best one to a room",
    body: "Rooms are public feeds by topic: office, work, family, school, live and social. Post a bit under your Shutap name, get likes and comments, follow writers you like, and see what's landing for other creators.",
  },
  {
    heading: "The one rule",
    body: "Bits go at the situation, never at a real person someone could identify. Names, places and contact details are removed before anything is saved, and anyone can report a post that breaks the rule.",
  },
  {
    heading: "Free to start",
    body: "Your first bit needs no account. Signing in is free, keeps every bit in your set list and lets you post. Shutap+ removes the watermark from downloads and adds the Mirror.",
  },
  {
    heading: "Who makes Shutap",
    body: "Shutap is an independent product. Questions, ideas or press: hello@shutap.com. Adults 18+. Shutap writes comedy; it is not therapy or advice.",
  },
];
const OTHERS = [
  { href: "/", label: "Write jokes" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/rooms", label: "Rooms" },
  { href: "/faq", label: "FAQ" },
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
          "@type": "AboutPage",
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
      h1="About Shutap, the AI bit generator"
      capsule={CAPSULE}
      sections={SECTIONS}
      others={OTHERS}
    />
  ),
});
