import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";

const PATH = "/trust";
const TITLE =
  "Trust and privacy — Shutap";
const DESCRIPTION =
  "How Shutap protects you: a pseudonym instead of your name, details scrubbed before storage, private until you post, reporting and fast takedowns.";
const CAPSULE =
  "Shutap removes names and identifying details before anything is stored and keeps only the cleaned text. You appear under a pseudonym, never your real name. Your jokes stay private unless you post them to a room.";
const SECTIONS = [
  {
    heading: "a pseudonym, not your name",
    body: "You appear under a made-up name. Your real name is never shown to anyone.",
  },
  {
    heading: "the scrubber",
    body: "Before storage, Shutap removes names, addresses, places, phone numbers and emails from what you write. We keep only the cleaned text.",
  },
  {
    heading: "private until you post",
    body: "Jokes you don't post stay private. Only what you post to a room is public, under your pseudonym. The Mirror is private to you. Anything flagged by the crisis check is never posted.",
  },
  {
    heading: "reporting",
    body: "Anyone can report a post or comment. When three different people report a post, it's hidden until we review it. Content that breaks the house rules is removed.",
  },
  {
    heading: "your data",
    body: "Delete any post, comment or set, export your data, or delete your account at any time. We don't sell personal data.",
  },
  {
    heading: "takedowns",
    body: "If a post is about you, ask us to remove it at hello@shutap.com or through the report page.",
  },
];
const OTHERS = [
  { href: "/about", label: "About" },
  { href: "/how-it-works", label: "How it works" },
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
      h1="trust and privacy"
      capsule={CAPSULE}
      sections={SECTIONS}
      others={OTHERS}
    />
  ),
});
