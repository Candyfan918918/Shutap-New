import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

const PATH = "/faq";
const URL = `${SITE_URL}/faq`;
const TITLE = "AI Joke Generator FAQ — Shutap for Creators & Comedians";
const DESCRIPTION =
  "Answers about Shutap, the AI joke generator for content creators and comedians: is it free, can it write stand-up and TikTok jokes, roasts and comebacks, who owns the jokes, privacy and pricing.";
const CAPSULE =
  "Everything people ask about Shutap, the AI joke generator that turns a real story into jokes for TikTok, Reels, YouTube Shorts and the stage.";

const QA: { heading: string; body: string }[] = [
  { heading: "What is Shutap?", body: "Shutap is an AI joke generator for content creators and comedians. Paste something that happened and it writes three jokes about it: a take, a clapback and a roast. Download them, use them in your content or on stage, or post the best one to a room." },
  { heading: "Is Shutap a free joke generator?", body: "Yes. Writing jokes is free, and your first set needs no account. Signing in is free and shows all three jokes per story, keeps them, and lets you post, follow and comment. Shutap+ is optional." },
  { heading: "How is Shutap different from other AI joke generators?", body: "Most joke generators write generic puns about a topic. Shutap writes from your actual story, so the jokes use your details and three different angles on the same situation. Each set is written fresh and several drafts are ranked before you see one." },
  { heading: "Can Shutap write jokes for TikTok, Reels and YouTube Shorts?", body: "Yes. That's what it's built for. Use a joke as the punchline of a storytime, POV or talking-head video, put it in a caption, or download it as a vertical image to post." },
  { heading: "Can comedians use Shutap to write stand-up?", body: "Yes. Paste a premise or a story from your life and use the three angles to find a tag, a callback or a new direction. Treat it as a writing partner for first drafts; the bit is still yours to shape and perform." },
  { heading: "Can it write roasts and comebacks?", body: "Every set includes a roast and a clapback — the comeback you wish you'd said. They roast the situation, not a real person someone could identify." },
  { heading: "Can I use the jokes in my own videos and sets?", body: "Yes. You can download, share and use the jokes Shutap writes for you in your own content and performances. AI can produce lines similar to existing jokes, so check anything you rely on commercially." },
  { heading: "What are rooms?", body: "Rooms are public feeds by topic: office, work, family, school, live and social. Post a joke under your Shutap name, get likes and comments, save jokes and follow other writers." },
  { heading: "How much does Shutap+ cost?", body: "$7.99 a month or $49.99 a year. It removes the watermark from downloads and adds the Mirror. Everyone, free or paid, gets five stories a day. Cancel anytime." },
  { heading: "Is there a daily limit?", body: "Five stories a day for everyone." },
  { heading: "Is my real name on anything?", body: "No. You use a made-up Shutap name. Names, addresses, places, phone numbers and emails are removed from what you write before it's saved. Jokes stay private unless you post them." },
  { heading: "What can't I post?", body: "Jokes that target a real, identifiable person, real names, harassment, hate, spam or anything illegal. Anyone can report a post; when three people report it, it's hidden for review." },
  { heading: "Who writes the jokes?", body: "AI models write and rank them. AI can get things wrong or miss the joke, so you decide what to post." },
  { heading: "Is Shutap therapy or advice?", body: "No. Shutap is an entertainment tool that writes jokes. If something you paste reads as a crisis, it writes no jokes and shows where to get help: in the US call or text 988, in the UK Samaritans 116 123, anywhere findahelpline.com." },
  { heading: "Can I delete my jokes or account?", body: "Yes, anytime. Delete posts, sets or your whole account in your account settings, or email hello@shutap.com." },
  { heading: "Do you sell my data?", body: "No." },
  { heading: "Who can use Shutap?", body: "Adults 18 and older." },
];

const OTHERS = [
  { href: "/", label: "Write jokes" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/rooms", label: "Rooms" },
  { href: "/trust", label: "Trust & privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
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
      h1="AI joke generator FAQ"
      capsule={CAPSULE}
      sections={QA}
      others={OTHERS}
    />
  ),
});
