import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";

const PATH = "/trust";
const TITLE =
  "Trust & Privacy — Shutap AI Joke Generator";
const DESCRIPTION =
  "How Shutap keeps the jokes on the situation and your stories private: names and places removed before saving, private until you post, never used to train AI, reporting and takedowns.";
const CAPSULE =
  "Shutap is an AI joke generator for creators and comedians, and the jokes come from real stories. So privacy is built in: names and details come out of your story before it is saved, nothing is public unless you post it, and your stories never train AI or go into the joke dataset.";
const SECTIONS = [
  { heading: "Your name, your choice", body: "Your profile starts with the name and picture from your sign-in, or a name made from your email address. You can change both in your profile, and your posts appear under them." },
  { heading: "Names and places removed before saving", body: "Before anything is stored, Shutap removes names, addresses, places, phone numbers and emails from what you write, including comments. Only the cleaned text is kept." },
  { heading: "Private until you post", body: "Bits you write stay in your private set list. Only what you post to a room is public. The Mirror is private to you. No one at Shutap reads private bits as part of running the service." },
  { heading: "Jokes about situations, not people", body: "Shutap's jokes go at the situation, never at a real person someone could identify. That keeps your content shareable and keeps rooms from turning into callouts." },
  { heading: "Reporting and takedowns", body: "Anyone can report a post or comment. When three different people report a post, it's hidden until reviewed. If a post is about you, email hello@shutap.com or use the report page and we'll take a look." },
  { heading: "Crisis check", body: "If something you write reads as a crisis, Shutap writes no jokes, posts nothing, and shows where to get help. Shutap is not a crisis service." },
  { heading: "Your data, your call", body: "Delete any post, comment or your whole account in the app at any time. To get a copy of your data or delete a single bit, email hello@shutap.com. We don't sell personal data." },
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
