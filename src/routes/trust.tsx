import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";

const PATH = "/trust";
const TITLE =
  "Trust & Privacy — Shutap AI Joke Generator";
const DESCRIPTION =
  "How Shutap keeps the jokes on the situation and your identity private: a made-up name, names and places removed before saving, private until you post, reporting and takedowns.";
const CAPSULE =
  "Shutap is an AI joke generator for creators and comedians, and the jokes come from real stories. So privacy is built in: names and details come out before anything is saved, you post under a made-up name, and nothing is public unless you post it.";
const SECTIONS = [
  { heading: "A made-up name, never your real one", body: "You post, comment and get followed under a Shutap name. Your real name is never shown to anyone." },
  { heading: "Names and places removed before saving", body: "Before anything is stored, Shutap removes names, addresses, places, phone numbers and emails from what you write — including captions and comments. Only the cleaned text is kept." },
  { heading: "Private until you post", body: "Jokes you write stay in your private set list. Only what you post to a room is public. The Mirror is private to you." },
  { heading: "Jokes about situations, not people", body: "Shutap's jokes go at the situation, never at a real person someone could identify. That keeps your content shareable and keeps rooms from turning into callouts." },
  { heading: "Reporting and takedowns", body: "Anyone can report a post or comment. When three different people report a post, it's hidden until reviewed. If a post is about you, email hello@shutap.com or use the report page and we'll take a look." },
  { heading: "Crisis check", body: "If something you write reads as a crisis, Shutap writes no jokes, posts nothing, and shows where to get help. Shutap is not a crisis service." },
  { heading: "Your data, your call", body: "Delete any post, comment, set or your whole account, or export your data, at any time. We don't sell personal data." },
  { heading: "AI, disclosed", body: "Jokes are written and ranked by AI models. AI can be wrong or offensive, so you decide what to post." },
];
const OTHERS = [
  { href: "/", label: "Write jokes" },
  { href: "/about", label: "About" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/privacy", label: "Privacy policy" },
  { href: "/guidelines", label: "House rules" },
  { href: "/ai-disclosure", label: "AI disclosure" },
];

export const Route = createFileRoute("/trust")({
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
          "@type": "WebPage",
          name: "Trust and privacy at Shutap",
          description: DESCRIPTION,
          url: `${SITE_URL}${PATH}`,
        }),
      },
    ],
  }),
  component: () => (
    <ContentPage
      h1="Trust and privacy"
      capsule={CAPSULE}
      sections={SECTIONS}
      others={OTHERS}
    />
  ),
});
