import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

const PATH = "/about";
const TITLE = "About Shutap — AI Joke Generator for Content Creators & Comedians";
const DESCRIPTION =
  "Shutap is an AI joke generator for content creators and comedians. Paste a real story, get a take, a clapback and a roast for TikTok, Reels, YouTube Shorts or the stage.";
const CAPSULE =
  "Shutap is an AI joke generator built for content creators and comedians. You paste something that actually happened. Shutap writes it into a set of jokes, each from a different angle, ready to film for TikTok, Instagram Reels or YouTube Shorts, or to work into a stand-up set.";
const SECTIONS = [
  {
    heading: "An AI joke generator that starts with your story",
    body: "Most joke generators hand you puns about a keyword. Shutap starts from a real situation: the coworker, the group chat, the landlord, the date. The details are where the funny is, so the jokes come out specific to what happened to you, not generic one-liners anyone could post.",
  },
  {
    heading: "Built for content creators",
    body: "Storytime videos, POV skits, talking-head clips and captions all need a punchline. Paste the story you were going to tell anyway and get jokes you can say to camera. Download any joke as a vertical image for TikTok, Reels or Shorts, or copy the text into your script.",
  },
  {
    heading: "Built for comedians",
    body: "Stand-up comedians already know the move: take a bad night and turn it into a bit. Shutap gives you three angles on the same premise to test against your own instincts — the take that names what was really going on, the clapback you wish you'd said, and the roast. Use it to get unstuck on a premise, find a tag, or warm up before you write.",
  },
  {
    heading: "Three angles on every story",
    body: "The take: what actually happened here, said sharper than you'd say it. The clapback: the comeback you thought of in the shower. The roast: the situation, roasted. Every set is written fresh for your story.",
  },
  {
    heading: "Post the best one to a room",
    body: "Rooms are public feeds by topic: office, work, family, school, live and social. Post a joke under your Shutap name, get likes and comments, follow writers you like, and see what's landing for other creators.",
  },
  {
    heading: "The one rule",
    body: "Jokes go at the situation, never at a real person someone could identify. Names, places and contact details are removed before anything is saved, and anyone can report a post that breaks the rule.",
  },
  {
    heading: "Free to start",
    body: "Your first set needs no account. Signing in is free and shows all three jokes, keeps them in your set list and lets you post. Shutap+ removes the watermark from downloads and adds the Mirror.",
  },
  {
    heading: "Who makes Shutap",
    body: "Shutap is an independent product. Questions, ideas or press: hello@shutap.com. Adults 18+. Shutap writes jokes; it is not therapy or advice.",
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
      h1="About Shutap, the AI joke generator"
      capsule={CAPSULE}
      sections={SECTIONS}
      others={OTHERS}
    />
  ),
});
