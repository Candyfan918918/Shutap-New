import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

const PATH = "/about";
const TITLE = "About Shutap, the humor amplifier: say it funnier";
// Nov 9 2026: 307 impressions, 10 clicks at position ~3. The snippet now says
// what Shutap is and names the three products.
const DESCRIPTION =
  "Shutap is a humor amplifier on demand: say it funnier for any occasion. Bits for creators and comedians, Kits for realtors, Toasts for special occasions.";
const CAPSULE =
  "Shutap is a humor amplifier on demand. It helps people say it funnier on the occasions that matter, with three products: Bits for creators and comedians, Kits for realtors, and Toasts for special occasions. You bring what you want to say; Shutap makes it funnier; you decide what stays. Your stories and words stay yours.";
const SECTIONS = [
  {
    heading: "What Shutap is: a humor amplifier, on demand",
    body: "People who use humor well get listened to. Shutap amplifies the humor you already have, when you need it: a post, a listing, a toast. Bits are for creators and comedians, Kits are for realtors, and Toasts are for weddings, holidays, birthdays and every other occasion with a glass raised. Enterprise brings it to company presentations. Shutap works from your material; you decide what stays. Stay funny, stay human.",
  },
  {
    heading: "Bits: your bit, funnier",
    body: "Tell it your way, get the bit. AI fills only the gaps. For creators and comedians: you tell the story in your own words, and Shutap cuts it into a hook, setup, two tags and a button and keeps your words word for word. A line your story didn’t cover, the AI copilot drafts, marked “AI draft” so you can change it or keep it. Every line is optional. Stuck on a line? Tap “funnier” for three other ways to say it, yours first. The finished bit becomes a 5-second video to post, and stand-up on the prompter, with delivery cues to rehearse with (beats, pauses for the laugh, voices), a sketch page and a skit to perform. shutap.com/bits",
  },
  {
    heading: "Realtors: your listing, funnier",
    body: "Paste a listing. Get a video script and every post to go with it. To film: the walkthrough, the voiceover and the hooks. To post: the open-house kit, social posts and the MLS copy. Pick one of four tones (professional, funny, luxury or young) and the kit is written in about 30 seconds. Fair-housing checked, nothing made up. Rehearse and shoot it with the teleprompter on your phone, with a cue on how to say each line. shutap.com/realtors",
  },
  {
    heading: "Toasts: your toast, funnier",
    body: "Ready for life’s big moments. Be ready for the moments that matter. Your stories become the toast, then you rehearse it, carry cue cards, read from the prompter and keep a keepsake. Best man, maid of honor, Thanksgiving, the holiday party, New Year’s and more: pick the occasion, type your stories in your words, then edit, lock and give it. Names stay in your browser. shutap.com/toasts",
  },
  {
    heading: "Enterprise: your presentation, funnier",
    body: "Talks people listen to and remember. People listen to the speaker who makes them laugh. Bring humor to your decks, pitches and meetings, and walk up with more confidence. Tell us the talk, we scope it and send pricing, and your speakers steer every line. Shutap Enterprise is in development, by request at shutap.com/business.",
  },
  {
    heading: "Why Shutap is different",
    body: "Most AI tools write for you. Shutap starts from what only you have (your story, your listing, your memories of the person) and builds from it, so the result couldn't belong to anyone else. Every line draws on the Lab's in-house dataset, which the Shutap team writes, selects and rates, never from users.",
  },
  {
    heading: "The Shutap Humor Amplifier Lab",
    body: "Shutap's research arm. It writes, selects and rates the in-house joke dataset every product draws on (never from users), builds the technique bank behind bits, realtor kits and toasts, publishes The funniest and the guides, and does the work behind Shutap Enterprise. Its line: stay funny, stay human.",
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
          mainEntity: {
            "@type": "Organization",
            name: "Shutap",
            url: SITE_URL,
            slogan: "Say it funnier.",
            description: "A humor amplifier on demand. Products: Shutap Bits (for creators and comedians), Shutap for Realtors (listing kits), Shutap Toasts (special occasions).",
          },
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
      whoDoesWhat
      others={OTHERS}
    />
  ),
});
