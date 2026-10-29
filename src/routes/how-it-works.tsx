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
  { heading: "1. Type what happened", body: "One box, any story: the meeting that should have been an email, the text from your mom, the roommate's girlfriend who never left. More detail means a better bit. What they actually said, word for word, is usually the funniest part." },
  { heading: "2. Shutap removes names and places", body: "Before anything is saved, names, addresses, places, phone numbers and emails are taken out. Only the cleaned text is kept, so the bit is about the situation, not a person someone could look up." },
  { heading: "3. Get the bit, the video, the caption", body: "Shutap writes your story as a bit: a hook for the first two seconds, a setup that tells it straight, tags that keep it going, and a button to end on. Each draft is built on one comedy technique from the Humor Amplifier Lab bank; several are written and a second model ranks them, so you see the strongest one. With it come a 5-second video in the Shutap style, a caption under 100 characters and five hashtags." },
  { heading: "4. Pick your format", body: "Teleprompter: full-screen scrolling text to read to camera. Scene: the bit laid out beat by beat for a POV or skit. Screenplay page: formatted like a script, with characters and action." },
  { heading: "5. Post it, or film it", body: "Download the video with the caption and hashtags and post it to TikTok, Instagram Reels or YouTube Shorts; or film it yourself off the teleprompter, take it to an open mic, or post it to a room — office, work, family, school, live or social — where people like, comment and follow." },
];
const SECTIONS = [
  ...STEPS,
  { heading: "What's free", body: "Your first bit needs no account, and you see the whole bit. Signing in is free, lets you rewrite and save that bit, gives you 2 new bits a day, keeps every bit in your set list, and lets you post, follow, like and comment. A rewrite (hotter, tighter, escalate) counts as a new bit; tag swap and mix your own are free. Free accounts get one download a day (the video, or the caption and hashtags, or the picture) with a shutap.com watermark; Basic three a day, clean; Pro unlimited." },
  { heading: "Daily limit", body: "Your first bit needs no account. Signed in, you get 2 new bits a day. Basic gets 5, Pro has no daily number. A rewrite counts as a new bit. Tag swap and mix your own don't. Limits reset at midnight Pacific." },
  { heading: "Basic and Pro", body: "Basic is $1.99 a month: 5 new bits a day and no watermark. Pro is $7.99 a month: unlimited bits, no watermark, and the Mirror, a private read-back of what keeps coming up in your stories. Cancel anytime." },
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
    />
  ),
});
