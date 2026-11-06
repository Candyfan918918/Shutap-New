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
  "You bring what you want to say: what happened, a listing link, your stories about the person. Shutap drafts it funnier, and you decide what stays. Here is how each one works.";
const STEPS = [
  { heading: "What you type, and what Shutap does", body: "You type the situation: the meeting, the text, the thing your kid said. Not your jokes; you don't need any. Shutap drafts the bit from its own in-house jokes and techniques, written and rated by people at the Lab, and lays it out as a video, stand-up, a sketch or a skit. Any line you write yourself stays word for word; tap \"funnier\" on one line and it offers three ways for that line only. Nobody at Shutap reads your story or your bit, and neither is ever added to the dataset or used to train a model. Your material stays yours; the drafting is ours." },
  { heading: "1. Type what happened", body: "One box, any story: the meeting that should have been an email, the text from your mom, the roommate's girlfriend who never left. More detail means a better bit. What they actually said, word for word, is usually the funniest part." },
  { heading: "2. Shutap removes names and places", body: "Before anything is saved, names, addresses, places, phone numbers and emails are taken out. Only the cleaned text is kept, so the bit is about the situation, not a person someone could look up." },
  { heading: "3. Get the bit and the video", body: "Shutap writes your story as a bit: a hook for the first two seconds, a setup that tells it straight, tags that keep it going, and a button to end on. Each draft is built on one comedy technique from the Humor Amplifier Lab bank; several are written and a second model ranks them, so you see the strongest one. With it comes a 5-second video in the Shutap style." },
  { heading: "4. Pick your format", body: "Stand-up: the bit on a teleprompter, full-screen, at talking pace. Sketch: one page in script format, with characters and action. Skit: a shot list for a short vertical video you film alone, every role yours. Every format takes a free account." },
  { heading: "5. Post it, or film it", body: "Download the video and post it to TikTok, Instagram Reels or YouTube Shorts; or film it yourself as stand-up off the teleprompter, take it to an open mic, or post it to a room — office, work, family, school, live or social — where people like, comment and follow." },
];
const SECTIONS = [
  ...STEPS,
  { heading: "Realtor kits: paste the listing", body: "Paste the listing's web address (or the listing text). Shutap reads the facts and drafts the walkthrough to shoot, the voiceover, the hooks, the open-house kit, the posts and the straight listing copy, in your tone. Every line is checked for fair-housing words and for numbers that aren't in the listing. Tap \"funnier\" on any one line; shoot mode opens the teleprompter on your phone. Your first kit is free. shutap.com/realtors" },
  { heading: "Toasts: your stories, in your words", body: "Pick the occasion (best man, maid of honor, parents, Thanksgiving, the holiday party, New Year's, a retirement, a birthday), give three stories in your own words and the one true thing, and choose a tone and length. Shutap builds the toast around your words, kept word for word, with pause marks, a running clock, cue cards and a phone prompter. Names stay in your browser. Your first toast is free. shutap.com/toasts" },
  { heading: "Enterprise: presentations, by request", body: "Shutap Enterprise brings the same approach to company presentations, drafted from your own material with your speakers deciding every line. It's by request: tell us what you need at shutap.com/business." },
  { heading: "What's free", body: "Sign in first: it's free and one tap with Google or Apple, and your story stays in the box while you do. A free account gets one new bit a day with its 5-second video, stand-up, sketch and skit, My creations with every bit, posting, following, likes and comments, unlimited downloads (the video and the picture, with a shutap.com watermark), unlimited \"funnier\" on any line, and your first realtor kit. You pay to make something new, never to use it. Rewrites, crowd-work swaps and mix your own come with Basic and Pro." },
  { heading: "Daily limit", body: "Free: 1 new bit a day. Basic: 3, and a rewrite (hotter, tighter, storytelling) counts as one, because it is written again and its video rendered again. Pro has no daily number. Crowd-work swaps and mix your own don't count. Downloads count separately: the video is one, the picture or PDF another, a copied realtor-kit output one and the kit PDF six; Basic has 20 a month. Limits reset at midnight Pacific; the monthly pool on the 1st." },
  { heading: "Basic and Pro", body: "Basic is $19.99 a month: 3 new bits a day (a rewrite counts as one), crowd-work swaps and mix your own, 20 realtor kits a month and 1 toast a month, with unlimited downloads and no watermark. Pro is $49.99 a month: unlimited bits, rewrites, kits and toasts, no watermark, and the Mirror, a private read-back of what keeps coming up in your stories. Cancel anytime." },
  { heading: "Tips for a funnier bit", body: "Give the specific detail, not the summary: the exact text, the time it happened, the object involved. Say who did what. Leave out real names — Shutap removes them anyway. If a bit feels thin, add what they actually said and run it again." },
  { heading: "Safety", body: "Bits go at the situation, never at a real person. If what you write reads as a crisis, Shutap writes nothing and shows where to get help instead. Shutap is entertainment, not therapy or advice. 18+." },
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
      tryIt="how-it-works"
      breadcrumbs={[{ name: "How it works", path: PATH }]}
      h1="How the Shutap Humor Amplifier Lab works"
      capsule={CAPSULE}
      sections={SECTIONS}
      others={OTHERS}
      whoDoesWhat
    />
  ),
});
