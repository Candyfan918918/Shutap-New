import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

const PATH = "/about";
const TITLE = "About — Shutap Humor Amplifier Lab";
const DESCRIPTION =
  "Shutap Humor Amplifier Lab helps everyone say it funnier, for any occasion, in any format.";
const CAPSULE =
  "Shutap Humor Amplifier Lab helps everyone say it funnier, for any occasion, in any format. You bring what you want to say; Shutap drafts it funnier; you decide what stays. Your stories and words stay yours.";
const SECTIONS = [
  {
    heading: "Our goal: say it funnier",
    body: "People who use humor well get listened to. Shutap started with bits for creators. Now it also makes listing kits for realtors and toasts for anyone with a speech to give, and Enterprise brings it to company presentations. Shutap drafts from your material; you decide what stays. Stay funny, stay human.",
  },
  {
    heading: "Bits, for creators",
    body: "Type what happened and get a bit: a hook that stops the scroll, a setup, tags and a button, plus a 5-second video. Tap \"funnier\" on any line you want punched up; the rest stays yours. Run it as stand-up on the teleprompter, a one-page sketch or a skit you film alone. shutap.com/bits",
  },
  {
    heading: "Kits, for realtors",
    body: "Paste the listing's web address. Shutap drafts the walkthrough to shoot, the voiceover, the hooks, the open-house kit, the posts and the straight listing copy, in your tone: professional, luxury, funny or young. Fair-housing checked, nothing made up. Shoot mode opens the teleprompter on your phone. shutap.com/realtors",
  },
  {
    heading: "Toasts, for everyone",
    body: "Best man, maid of honor, parents, Thanksgiving, the holiday party, New Year's, a retirement, a birthday. You give the stories in your words, and Shutap builds them into a toast with pause marks, a running clock, cue cards and a phone prompter. Names stay in your browser. shutap.com/toasts",
  },
  {
    heading: "Presentations, for enterprise",
    body: "Shutap Enterprise brings the same approach to company presentations: funnier lines drafted from your own material, and your speakers decide every line. It's by request: tell us what you need at shutap.com/business.",
  },
  {
    heading: "Why Shutap is different",
    body: "Most AI tools write for you. Shutap starts from what only you have (your story, your listing, your memories of the person) and drafts around it, so the result couldn't belong to anyone else. Every line draws on the Lab's in-house dataset, which the Shutap team writes, selects and rates, never from users.",
  },
  {
    heading: "The Shutap Humor Amplifier Lab",
    body: "Shutap's research arm. It writes, selects and rates the in-house joke dataset every product drafts from (never from users), builds the technique bank behind bits, realtor kits and toasts, publishes The funniest and the guides, and does the work behind Shutap Enterprise. Its line: stay funny, stay human.",
  },
  {
    heading: "The funniest: learn from the best",
    body: "Who's the funniest president, billionaire, actor or philosopher, according to the people who rank them, and how they did it, broken into techniques for a post, a listing video, a toast or a presentation, each with an original example line. Read them at shutap.com/funniest.",
  },
  {
    heading: "My creations",
    body: "Every bit, realtor kit and toast you make is saved under your profile in My creations. Once paid for, it's yours to open and download again any time.",
  },
  {
    heading: "What to post today",
    body: "For creators who post every day: the homepage has a fresh hook, a short bit and a tag each day, drawn from what's trending.",
  },
  {
    heading: "Rooms",
    body: "Public feeds by topic: office, work, family, school, live and social. Post a bit under your Shutap name, get likes and comments, and follow writers you like.",
  },
  {
    heading: "The one rule",
    body: "A bit goes at the situation, never at a real person someone could identify. A toast can tease the person you're toasting, and their name never leaves your browser. Names, places and contact details are removed before anything is saved, and anyone can report a post.",
  },
  {
    heading: "What's coming next",
    body: "Enterprise presentations come first, by request. After that we're exploring screenwriting and audio stories. These are plans, not dates.",
  },
  {
    heading: "Free to start",
    body: "A free account (one tap with Google or Apple) gets one bit a day, your first realtor kit and your first toast, each marked \"— shutap.com\". Basic is $19.99 a month: 3 bits a day with rewrites, 20 realtor kits and 1 toast a month, no watermark. Pro is $49.99 a month: unlimited bits, kits and toasts, plus the Mirror. One kit or one toast on its own is $12.99. You pay to make something, never to use it.",
  },
  {
    heading: "Who makes Shutap",
    body: "An independent product. Questions, ideas or press: hello@shutap.com. Enterprise: shutap.com/business. Adults 18+. Shutap is entertainment, not therapy or advice.",
  },
];
const OTHERS = [
  { href: "/bits", label: "Bits" },
  { href: "/realtors", label: "Realtors" },
  { href: "/toasts", label: "Toasts" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/guides", label: "Guides" },
  { href: "/funniest", label: "The funniest" },
  { href: "/business", label: "Enterprise" },
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
      h1="About the Shutap Humor Amplifier Lab"
      capsule={CAPSULE}
      sections={SECTIONS}
      whoDoesWhat
      others={OTHERS}
    />
  ),
});
