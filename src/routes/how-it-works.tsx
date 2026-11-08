import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

const PATH = "/how-it-works";
const TITLE = "How Shutap works — bits, realtor kits and toasts";
const DESCRIPTION =
  "How the Shutap Humor Amplifier Lab helps you say it funnier, for any occasion, in any format.";
const CAPSULE =
  "You bring what you want to say: your bit, a listing link, your stories about the person. Shutap helps make it funnier, and you decide what stays. Here is how each one works.";
const STEPS = [
  { heading: "What you write, and what Shutap does", body: "On Bits you write the bit: five lines in your own words, the hook, setup, two tags and button. Shutap never fills a line for you. Tap \"funnier\" on one line and it offers three other ways to say that line, yours first, built from Shutap's in-house comedy techniques; nothing changes until you pick. Lock a line when it's done. Nobody at Shutap reads your bit, and it's never added to the dataset or used to train a model. Your material stays yours." },
  { heading: "1. Write your five lines", body: "The hook (the first two seconds), the setup (the one fact the hook left out), two tags (laughs after the turn) and the button (the line you stop on). Specific beats general: what they actually said, word for word, is usually the funniest part." },
  { heading: "2. Funnier where you're stuck", body: "Write a rough version of the line, even a plain sentence, and tap \"funnier\". You get three other ways to say it, built from the lines you wrote, with yours first. Keep yours or pick one. Before any line goes to a model, names, addresses, places, phone numbers and emails are taken out." },
  { heading: "3. Make the bit", body: "With all five lines written, \"Make my bit\" keeps them word for word and lays them out: a 5-second video in the Shutap style, with a cast and a room drawn from your lines." },
  { heading: "4. Pick your format", body: "Stand-up: your bit on a teleprompter, full-screen, at talking pace. Sketch: one page in script format, with characters and action, using your lines. Skit: a shot list for a short vertical video you film alone, every role yours, every line yours. Every format takes a free account." },
  { heading: "5. Post it, or film it", body: "Download the video and post it to TikTok, Instagram Reels or YouTube Shorts; or film it yourself as stand-up off the teleprompter, take it to an open mic, or post it to a room — office, work, family, school, live or social — where people like, comment and follow." },
];
const SECTIONS = [
  ...STEPS,
  { heading: "Realtor kits: paste the listing", body: "Paste a listing. Get a video script and every post to go with it. Paste the listing's web address (or the listing text) and check the facts Shutap reads back. Then pick a tone and Shutap writes, to film: the walkthrough, the voiceover and the hooks; to post: the open-house kit, social posts and the MLS copy. Every line is checked for fair-housing words and for numbers that aren't in the listing. Tap \"funnier\" on any one line; shoot mode opens the teleprompter on your phone. Your first kit is free. shutap.com/realtors" },
  { heading: "Toasts: your stories, in your words", body: "Ready for life’s big moments. Pick the occasion (best man, maid of honor, parents, Thanksgiving, the holiday party, New Year's, a retirement, a birthday), give three stories in your own words and the one true thing, and choose a tone and length. Shutap builds the toast around your words, kept word for word, with pause marks, a running clock, cue cards and a phone prompter. Names stay in your browser. Your first toast is free. shutap.com/toasts" },
  { heading: "Enterprise: presentations, by request", body: "Talks people listen to and remember. Shutap Enterprise brings the same approach to company presentations, drafted from your own material with your speakers deciding every line. It's by request: tell us what you need at shutap.com/business." },
  { heading: "What's free", body: "Sign in first: it's free and one tap with Google or Apple, and your lines stay in the box while you do. A free account gets one new bit a day with its 5-second video, stand-up, sketch and skit, My creations with every bit, posting, following, likes and comments, unlimited downloads (the video and the picture, with a shutap.com watermark), unlimited \"funnier\" on any line, and your first realtor kit. You pay to make something new, never to use it. Rewrites, crowd-work swaps and mix your own come with Basic and Pro." },
  { heading: "Daily limit", body: "Free: 1 new bit a day. Basic: 3, and a rewrite (hotter, tighter, storytelling) counts as one, because it is written again and its video rendered again. Pro has no daily number. Crowd-work swaps and mix your own don't count. Downloads count separately: the video is one, the picture or PDF another, a copied realtor-kit output one and the kit PDF six; Basic has 20 a month. Limits reset at midnight Pacific; the monthly pool on the 1st." },
  { heading: "Basic and Pro", body: "Basic is $19.99 a month: 3 new bits a day (a rewrite counts as one), crowd-work swaps and mix your own, 20 realtor kits a month and 1 toast a month, with unlimited downloads and no watermark. Pro is $49.99 a month: unlimited bits, rewrites, kits and toasts, no watermark, and the Mirror, a private read-back of what keeps coming up in your stories. Cancel anytime." },
  { heading: "Tips for a funnier bit", body: "Give the specific detail, not the summary: the exact text, the time it happened, the object involved. Say who did what. Don't retell the story in the tags; push the same idea further. Leave out real names — Shutap removes them anyway. If a line feels thin, tap \"funnier\" on it and see three other ways to say it." },
  { heading: "Safety", body: "Bits go at the situation, never at a real person. If what you write reads as a crisis, Shutap makes nothing and shows where to get help instead. Shutap is entertainment, not therapy or advice. 18+." },
];
const OTHERS = [
  { href: "/bits", label: "Bits" },
  { href: "/realtors", label: "Realtors" },
  { href: "/toasts", label: "Toasts" },
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
          name: "How to write a comedy bit with Shutap",
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
      h1="How the Shutap Humor Amplifier Lab works"
      capsule={CAPSULE}
      sections={SECTIONS}
      others={OTHERS}
      whoDoesWhat
    />
  ),
});
