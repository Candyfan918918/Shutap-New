import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

const PATH = "/about";
const TITLE = "About — Shutap Humor Amplifier Lab";
const DESCRIPTION =
  "Shutap is the humor amplifier. Type what happened, get a bit in your voice with a hook, setup, tags and button, a 5-second video, caption and hashtags, then run it in the teleprompter, as a scene or a screenplay page.";
const CAPSULE =
  "Shutap is the humor amplifier. Type what happened. Shutap amplifies it into a bit in your voice — hook, setup, tags and a button — with a 5-second video, a caption and hashtags, then runs it in the teleprompter, lays it out as a scene, or formats it as a screenplay page. It amplifies your humor; it never replaces it.";
const SECTIONS = [
  {
    heading: "Our goal: say it funnier",
    body: "Shutap exists to help people say it funnier, because humor is a form of wisdom and the people who use it well are listened to. Shutap amplifies your humor and never replaces it: stay funny, stay human. Today that starts with a bit and a video from what happened to you. Over time we want to bring it to more of how people speak, present and tell stories, so nobody has to say it flat.",
  },
  {
    heading: "A bit, not a pun",
    body: "Most joke tools hand you a one-liner about a keyword. Shutap amplifies the humor already in your story: a hook that stops the scroll, a setup that tells it straight, tags that keep the laughs coming, and a button to end on. It uses your details and your voice, so it sounds like you, not like anyone could have posted it. It amplifies; it never replaces.",
  },
  {
    heading: "Built for content creators",
    body: "Storytime, POV, talking-head and skit videos all run on the same structure. Type the story you were going to tell anyway, get the bit with its 5-second video, caption and hashtags, and post it, or read it straight off the teleprompter while you film for TikTok, Instagram Reels or YouTube Shorts.",
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
    heading: "What to post today",
    body: "Never start from a blank page. The homepage shows a daily idea of what to post, with a hook, a short bit and a tag, drawn from what is trending, along with a trend panel that shows which topics are rising or cooling.",
  },
  {
    heading: "Your post, in five seconds",
    body: "Every bit comes with a 5-second vertical video in the Shutap style, a caption under 100 characters and five hashtags, so what happened to you is ready to post without opening an editor. Watch it free. Downloading it needs an account; free downloads carry a shutap.com watermark, Basic and Pro remove it.",
  },
  {
    heading: "The Shutap Humor Amplifier Lab",
    body: "The Humor Amplifier Lab is Shutap's research arm. It writes, selects and rates the in-house joke dataset the amplifier learns from (never from users), publishes The funniest series on the techniques of famously funny people, and does the work behind Shutap Enterprise. Its motto is ours: stay funny, stay human.",
  },
  {
    heading: "The funniest: learn from the best",
    body: "The funniest is a growing series of educational pages. Each asks who is the funniest in a category, using published rankings and sources, then breaks down how that person was funny into techniques you can use, each with an original example line and a way to try it. Read them at shutap.com/funniest.",
  },
  {
    heading: "Why Shutap is different",
    body: "Shutap writes a whole bit from your own story, then lets you steer it: hotter, tighter, escalate, or mix your own lines. It sits on an in-house dataset the Shutap team writes, selects and rates, pairing everyday situations with jokes, tagged by technique, voice and how wild. Around the tool you get a daily idea of what to post and a library of techniques taken from funny people. To our knowledge, no other joke tool pairs all of these, and the aim is simple: you get funnier, and the voice stays yours.",
  },
  {
    heading: "Post the best one to a room",
    body: "Rooms are public feeds by topic: office, work, family, school, live and social. Post a bit under your Shutap name, get likes and comments, follow writers you like, and see what's landing for other creators.",
  },
  {
    heading: "What is coming next",
    body: "The humor amplifier is the tool you can use today. Next we are building Shutap Enterprise, which brings original, human-steered humor to presentations and slides, roadshows, product demos, launches and meetings, written from a company's own material. Behind both is the Shutap Humor Amplifier Lab: the research arm that writes, selects and rates an in-house joke dataset pairing everyday situations with jokes, tagged by technique, voice and how wild, and publishes The funniest series. Beyond that we are exploring screenwriting and audio stories. These are plans, not promises of dates, and we will say so when each is ready. To request Enterprise pricing and solutions, or to ask about the dataset, use the form at shutap.com/business.",
  },
  {
    heading: "The one rule",
    body: "Bits go at the situation, never at a real person someone could identify. Names, places and contact details are removed before anything is saved, and anyone can report a post that breaks the rule.",
  },
  {
    heading: "Free to start",
    body: "Your first bit needs no account. Signing in is free, lets you rewrite it and download once a day (the video, or the caption and hashtags, or the picture) with a shutap.com watermark, keeps every bit in your set list and lets you post. Basic: 5 bits and 3 clean downloads a day. Pro: unlimited bits and downloads, no watermark, and the Mirror.",
  },
  {
    heading: "Who makes Shutap",
    body: "Shutap is an independent product. Questions, ideas or press: hello@shutap.com. Enterprise pricing: shutap.com/business. Adults 18+. Shutap writes comedy; it is not therapy or advice.",
  },
];
const OTHERS = [
  { href: "/", label: "Write jokes" },
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
      h1="About Shutap, the humor amplifier"
      capsule={CAPSULE}
      sections={SECTIONS}
      others={OTHERS}
    />
  ),
});
