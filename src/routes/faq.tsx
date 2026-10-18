import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";

const PATH = "/faq";
const URL = `${SITE_URL}/faq`;
const TITLE = "AI Bit & Joke Generator FAQ — Shutap for Creators & Comedians";
const DESCRIPTION =
  "Answers about Shutap, the AI bit generator for content creators and comedians: is it free, the teleprompter, scene and screenplay views, TikTok and stand-up, who owns the bits, privacy and pricing.";
const CAPSULE =
  "Everything people ask about Shutap, the AI bit generator that turns a real story into a bit for TikTok, Reels, YouTube Shorts and the stage.";

const QA: { heading: string; body: string }[] = [
  { heading: "What is Shutap?", body: "Shutap is an AI bit generator for content creators and comedians. Write your story and it turns it into a bit — hook, setup, tags and a button — then runs it in the teleprompter, lays it out as a scene, or formats it as a screenplay page." },
  { heading: "What is a bit?", body: "A bit is a short comedy routine built around one story: a hook to grab attention, a setup that tells what happened, tags that add laughs on the same premise, and a button that ends it." },
  { heading: "Is Shutap a free joke generator?", body: "Yes. Writing bits is free, and your first bit needs no account. Signing in is free, keeps every bit, and lets you post, follow and comment. Shutap+ is optional." },
  { heading: "How is Shutap different from other AI joke generators?", body: "Most joke generators write generic one-liners about a topic. Shutap writes a full bit from your actual story, using your details, and gives you a teleprompter, a scene and a screenplay page to perform it." },
  { heading: "What does the teleprompter do?", body: "It shows your bit full-screen and scrolls it at talking pace, so you can read it while you film to camera." },
  { heading: "What are the scene and screenplay views?", body: "The scene lays the bit out beat by beat for a POV video or sketch. The screenplay page formats it like a script, with characters and action, ready to shoot or share with a collaborator." },
  { heading: "Can Shutap write bits for TikTok, Reels and YouTube Shorts?", body: "Yes. That's what it's built for: storytime, POV, talking-head and skit videos. The hook is written for the first two seconds of a vertical video." },
  { heading: "Can comedians use Shutap to write stand-up?", body: "Yes. Write a premise or a story from your life and use the bit as a first draft: find a tag, a callback or a new direction, then rehearse it on the prompter. The final bit is still yours to shape and perform." },
  { heading: "Can it write roasts and comebacks?", body: "Yes. Tags and buttons often land as a roast of the situation or the comeback you wish you'd said. They go at the situation, never a real person someone could identify." },
  { heading: "Can I use the bits in my own videos and sets?", body: "Yes. You can download, share and perform the bits Shutap writes for you in your own content. AI can produce lines similar to existing jokes, so check anything you rely on commercially." },
  { heading: "What are rooms?", body: "Rooms are public feeds by topic: office, work, family, school, live and social. Post a bit under your Shutap name, get likes and comments, save bits and follow other writers." },
  { heading: "How much does Shutap+ cost?", body: "$7.99 a month or $49.99 a year. It removes the watermark from downloads and adds the Mirror. Everyone, free or paid, gets five stories a day. Cancel anytime." },
  { heading: "Is my real name on anything?", body: "No. You use a made-up Shutap name. Names, addresses, places, phone numbers and emails are removed from what you write before it's saved. Bits stay private unless you post them." },
  { heading: "What can't I post?", body: "Bits that target a real, identifiable person, real names, harassment, hate, spam or anything illegal. Anyone can report a post; when three people report it, it's hidden for review." },
  { heading: "Who writes the bits?", body: "AI models write and rank them. AI can get things wrong or miss the joke, so you decide what to film and post." },
  { heading: "Is Shutap therapy or advice?", body: "No. Shutap is an entertainment tool that writes comedy. If something you write reads as a crisis, it writes nothing and shows where to get help: in the US call or text 988, in the UK Samaritans 116 123, anywhere findahelpline.com." },
  { heading: "Can I delete my bits or account?", body: "Yes, anytime. Delete posts, bits or your whole account in your account settings, or email hello@shutap.com." },
  { heading: "Do you sell my data?", body: "No." },
  { heading: "Who can use Shutap?", body: "Adults 18 and older." },
  { heading: "What is Shutap Enterprise?", body: "Shutap Enterprise brings original, human-steered humor to the way companies speak: presentations and slides, roadshows and investor pitches, product demos and launches, and meetings and conversations. It is written from your own material, and your speakers stay in control of every line. It is in development." },
  { heading: "Who is Shutap Enterprise for?", body: "Teams that present and persuade: founders and executives, sales and marketing teams, product teams running demos and launches, and anyone who leads meetings or speaks to customers, investors or staff." },
  { heading: "What will Shutap Enterprise help with?", body: "Finding the true, funny detail in your material, drafting lines in your voice, and letting you make them hotter, tighter or more escalated. The same engine that writes bits for creators and comedians is being shaped for presentations, roadshows, demos, launches and meetings." },
  { heading: "How do I get Enterprise pricing?", body: "Use the request form at shutap.com/business with your name, title, company, work email, company size, what you need and your timeline, or write to hello@shutap.com. A person replies to scope a solution and share pricing tailored to your use case and team size. There is no published price yet." },
  { heading: "Is Shutap Enterprise available today?", body: "Not yet. The bit engine is live and has an audience setting for work and office. The tools made for presentations, demos, launches and meetings are in development, and requests help us decide what to build first." },
  { heading: "Will Shutap write my company's presentations for me?", body: "No. Shutap drafts and you decide. It offers lines grounded in your own facts and you choose what goes in, what is cut and how it sounds in your voice." },
  { heading: "Can I send confidential company material through the request form?", body: "Please don't. The form is for introducing yourself and describing what you need. Terms for handling company material would be agreed in writing before any is shared." },
  { heading: "What is the Shutap joke dataset?", body: "A growing dataset that pairs real situations with jokes, tagged by technique, voice and heat, built up by hand. It helps guide how Shutap writes. If you want to know what is available and on what terms, request it at shutap.com/business. Access is reviewed case by case and terms are not yet fixed." },
  { heading: "Do you store Enterprise requests?", body: "The form sends your details to hello@shutap.com by email and we use them only to reply to you. We do not add them to your account or to the joke dataset." },
];

const OTHERS = [
  { href: "/", label: "Write jokes" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/guides", label: "Guides" },
  { href: "/business", label: "Enterprise" },
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
      h1="AI bit generator FAQ"
      capsule={CAPSULE}
      sections={QA}
      others={OTHERS}
    />
  ),
});
