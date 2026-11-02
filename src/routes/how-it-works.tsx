import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

const PATH = "/how-it-works";
const TITLE = "How Shutap Works — Turn a Story Into a Bit With AI";
const DESCRIPTION =
  "How the humor amplifier works: type what happened, get the bit (hook, setup, tags and button) with a 5-second video, caption and hashtags, then post it, film it with the teleprompter, shoot it as a scene, or export a screenplay page.";
const CAPSULE =
  "Type what happened. Shutap amplifies it into a bit in your voice — hook, setup, tags and a button — with a 5-second video, a caption and hashtags. Post it, read it off the teleprompter, shoot it as a scene, or take the screenplay page.";
const STEPS = [
  { heading: "What you type, and what Shutap does", body: "You type the situation: the meeting, the text, the thing your kid said. Not your jokes; you don't need any. Shutap drafts the bit from its own in-house jokes and techniques, written and rated by people at the Lab, and lays it out as a video, a caption, stand-up, a sketch or a skit. Nobody at Shutap reads your story or your bit, and neither is ever added to the dataset or used to train a model. Your material stays yours; the drafting is ours." },
  { heading: "1. Type what happened", body: "One box, any story: the meeting that should have been an email, the text from your mom, the roommate's girlfriend who never left. More detail means a better bit. What they actually said, word for word, is usually the funniest part." },
  { heading: "2. Shutap removes names and places", body: "Before anything is saved, names, addresses, places, phone numbers and emails are taken out. Only the cleaned text is kept, so the bit is about the situation, not a person someone could look up." },
  { heading: "3. Get the bit, the video, the caption", body: "Shutap writes your story as a bit: a hook for the first two seconds, a setup that tells it straight, tags that keep it going, and a button to end on. Each draft is built on one comedy technique from the Humor Amplifier Lab bank; several are written and a second model ranks them, so you see the strongest one. With it come a 5-second video in the Shutap style, a caption under 100 characters and five hashtags." },
  { heading: "4. Pick your format", body: "Stand-up: the bit on a teleprompter, full-screen, at talking pace. Sketch: one page in script format, with characters and action. Skit: a shot list for a short vertical video you film alone, every role yours. Every format takes a free account." },
  { heading: "5. Post it, or film it", body: "Download the video with the caption and hashtags and post it to TikTok, Instagram Reels or YouTube Shorts; or film it yourself as stand-up off the teleprompter, take it to an open mic, or post it to a room — office, work, family, school, live or social — where people like, comment and follow." },
];
const SECTIONS = [
  ...STEPS,
  { heading: "What's free", body: "Sign in first: it's free and one tap with Google or Apple, and your story stays in the box while you do. A free account gets one new bit a day with its 5-second video, caption and hashtags, stand-up, sketch and skit, a set list of every bit, posting, following, likes and comments, and one download a day (the video with a shutap.com watermark, or the caption and hashtags). Rewrites, crowd-work swaps and mix your own come with Basic and Pro." },
  { heading: "Daily limit", body: "Free: 1 new bit a day. Basic: 3, and a rewrite (hotter, tighter, storytelling) counts as one, because it is written again and its video rendered again. Pro has no daily number. Crowd-work swaps and mix your own don't count. Downloads count separately: the video is one, copying the caption and hashtags is another. Limits reset at midnight Pacific." },
  { heading: "Basic and Pro", body: "Basic is $7.99 a month: 3 new bits a day (a rewrite counts as one), crowd-work swaps and mix your own, and 3 downloads a day with no watermark. Pro is $49.99 a month: unlimited bits, rewrites and downloads, no watermark, and the Mirror, a private read-back of what keeps coming up in your stories. Cancel anytime." },
  { heading: "Tips for a funnier bit", body: "Give the specific detail, not the summary: the exact text, the time it happened, the object involved. Say who did what. Leave out real names — Shutap removes them anyway. If a bit feels thin, add what they actually said and run it again." },
  { heading: "Safety", body: "Bits go at the situation, never at a real person. If what you write reads as a crisis, Shutap writes nothing and shows where to get help instead. Shutap is entertainment, not therapy or advice. 18+." },
];
const OTHERS = [
  { href: "/", label: "Write jokes" },
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
      h1="How the humor amplifier works"
      capsule={CAPSULE}
      sections={SECTIONS}
      others={OTHERS}
      whoDoesWhat
    />
  ),
});
