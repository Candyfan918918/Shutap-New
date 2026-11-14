// Shutap-written guides and tool pages. This is the public, indexable content
// of the site: nothing here comes from what members write. Every page is one
// search intent, one answer, and one route into the humor amplifier.
//
// Voice: terse, concrete. No card counts, no wellness vocabulary, no claims
// about features that are not in the product.

import type { BitControls } from "@/lib/bits/shared";

export type GuideKind = "tool" | "guide" | "business";

export interface GuideSection {
  heading: string;
  body: string;
}

export interface GuideFaq {
  q: string;
  a: string;
}

export interface GuideSource {
  label: string;
  url: string;
}

/** Topic clusters. Fixed list: add a topic here before an article uses it. */
export type GuideTopic =
  | "how-to-be-funny"
  | "humor-techniques"
  | "writing-jokes"
  | "types-of-humor"
  | "stand-up"
  | "storytime-and-pov"
  | "skits-and-sketches"
  | "roasts"
  | "jokes-for-occasions"
  | "realtors"
  | "toasts-and-speeches"
  | "presentations-and-work"
  | "finding-ideas"
  | "growing-views"
  | "watch-time"
  | "comedy-creators"
  | "using-shutap"
  | "shutap-vs-other-tools"
  | "ai-writing-partner";

export interface GuideTopicInfo {
  id: GuideTopic;
  label: string;
  /** <title> for the topic hub. Keep under ~60 characters. */
  title: string;
  description: string;
  /** Opening paragraph on the hub: what this topic covers. */
  intro: string;
}

export const GUIDE_TOPICS: GuideTopicInfo[] = [
  {
    id: "how-to-be-funny",
    label: "How to be funny",
    title: "How to Be Funny: Practical Guides With Examples | Shutap",
    description: "How to be funnier in conversation, at work, on dates, in texts and on camera, with habits you can practice and original example lines.",
    intro: "Being funny is a skill, not a personality type. These guides break it into things you can practice: noticing specifics, timing, saying less, and knowing the room.",
  },
  {
    id: "humor-techniques",
    label: "Humor techniques",
    title: "Comedy Techniques: Rule of Three, Callbacks & More | Shutap",
    description: "The named techniques comedians use, from the rule of three, callbacks and misdirection to fake precision and escalation, with original examples.",
    intro: "The named moves behind most laughs: misdirection, the rule of three, callbacks, fake precision, escalation, the object given a life, and more. One technique per guide, each with original examples you can copy the shape of.",
  },
  {
    id: "writing-jokes",
    label: "Writing jokes",
    title: "How to Write Jokes: Setups, Punchlines & Tags | Shutap",
    description: "Guides to writing jokes that land: premises, setups, punchlines, tags, buttons, rewrites and the structures comedians use.",
    intro: "How a joke is built and how to write one on purpose: finding the premise, writing a setup that points the wrong way, landing the punchline, then tagging it and ending on a button.",
  },
  {
    id: "stand-up",
    label: "Stand-up & open mics",
    title: "Stand-Up Comedy Guides: Writing, Open Mics & Sets | Shutap",
    description: "Guides for stand-up comedians: writing your first five minutes, open mics, building a set, stage time and working a room.",
    intro: "From the first open mic to a tight set: how to write material from your own life, how to structure five minutes, and what to do with the bits that die.",
  },
  {
    id: "storytime-and-pov",
    label: "Storytime & POV videos",
    title: "Storytime & POV Video Guides for Creators | Shutap",
    description: "How to turn real stories into storytime and POV videos: hooks, pacing, length, structure and endings that get rewatched.",
    intro: "How to take something that actually happened and tell it to camera: the hook in the first two seconds, the order of the beats, how long it should run, and the last line.",
  },
  {
    id: "skits-and-sketches",
    label: "Skits & sketches",
    title: "Comedy Skit & Sketch Writing Guides | Shutap",
    description: "How to write comedy skits and sketches: premises, characters, escalation, playing every part yourself and shooting it.",
    intro: "Skits and sketches: finding the game of the scene, escalating it, writing for one person playing every part, and laying it out shot by shot.",
  },
  {
    id: "types-of-humor",
    label: "Types of humor",
    title: "Types of Humor Explained: Dry, Dark, Deadpan & More | Shutap",
    description: "Dry, dark, deadpan, sarcastic, absurd and self-deprecating humor: what each one is, how it works, and how to write it.",
    intro: "The registers of funny and how each one works: dry, deadpan, dark, sarcastic, absurd, observational and self-deprecating, with original examples of each.",
  },
  {
    id: "realtors",
    label: "For realtors",
    title: "Funny Real Estate Captions, Listing Videos & More | Shutap",
    description: "How real estate agents make listings people watch to the end: funny captions, listing videos, open-house lines and hooks, fair-housing safe.",
    intro: "For agents who have to be funny on a schedule: listing videos, captions, open houses and hooks that get a listing noticed without breaking fair-housing rules or making anything up.",
  },
  {
    id: "toasts-and-speeches",
    label: "Toasts & speeches",
    title: "Funny Toasts & Speeches: Wedding, Holiday & More | Shutap",
    description: "How to write a funny toast or speech: best man, maid of honor, wedding vows, Thanksgiving, Christmas, graduation and more, with original example lines.",
    intro: "Toasts and speeches where you have to be funny in front of people who know the person: weddings, holidays, graduations and family occasions. How to build it from your own stories, and original lines to start from.",
  },
  {
    id: "presentations-and-work",
    label: "Presentations & work",
    title: "Funny Presentations, Talks & Work Humor | Shutap",
    description: "How to be funny at work: presentations, training icebreakers, Toastmasters speeches and emails, with original example lines that fit the room.",
    intro: "Humor where the room is colleagues, customers or an audience you have to keep: presentations, trainings, Toastmasters and the everyday email. What lands at work and what to leave out.",
  },
  {
    id: "jokes-for-occasions",
    label: "Jokes for occasions",
    title: "Funny Lines for Work, Toasts, Birthdays & Captions | Shutap",
    description: "How to be funny in a toast, a work email, a birthday card, a caption or a presentation, with original example lines.",
    intro: "Being funny when it has to fit a moment: toasts, speeches, work emails, captions, cards and presentations. What lands, what to avoid, and original lines to start from.",
  },
  {
    id: "roasts",
    label: "Roasts",
    title: "How to Write a Roast: Roast Jokes & Structure | Shutap",
    description: "How to write a roast that gets laughs without losing the room: targets, structure, punching at choices not people, and closers.",
    intro: "Roasts: picking what to aim at, keeping it about choices and situations rather than things people cannot change, structuring the set, and ending warm.",
  },
  {
    id: "finding-ideas",
    label: "Finding ideas",
    title: "Comedy Video Ideas: How to Find Topics Every Day | Shutap",
    description: "Where comedy ideas come from and how to find a topic to post every day: your own life, trends, notes habits and prompts.",
    intro: "Never staring at a blank page: where comedy material actually comes from, how to catch it before you forget it, and how to turn a trend into something only you would post.",
  },
  {
    id: "growing-views",
    label: "Growing views",
    title: "How to Get More Views on Comedy Videos | Shutap",
    description: "How comedy creators grow views on TikTok, Reels and YouTube Shorts: hooks, formats, posting cadence, series and what the algorithms reward.",
    intro: "Getting comedy in front of more people: the first two seconds, formats you can repeat, series that bring viewers back, posting cadence, and reading what the numbers say.",
  },
  {
    id: "watch-time",
    label: "Watch time & completion",
    title: "Improve Watch Time & Completion Rate on Shorts | Shutap",
    description: "How to keep viewers watching to the end of a comedy video: pacing, cutting, loops, payoffs and the beats where people swipe away.",
    intro: "Keeping people to the last second: where viewers swipe away, how to cut dead air, pacing a bit for short video, ending on a button, and loops that get rewatched.",
  },
  {
    id: "comedy-creators",
    label: "Life as a comedy creator",
    title: "Guides for Comedy Creators: Voice, Habits & Brand Deals | Shutap",
    description: "For people making comedy online: finding your voice, writing habits, burnout-proof schedules, collaborations and working with brands.",
    intro: "The work around the work: finding a voice people recognize, writing habits that survive a busy week, collaborating with other creators, and working with brands without losing the funny.",
  },
  {
    id: "using-shutap",
    label: "Using Shutap",
    title: "How to Use Shutap: Workflows for Posts, Sets and Speeches | Shutap",
    description: "How to use Shutap as a storytime writer, a stand-up drafting partner, a skit planner, a caption writer and more, step by step.",
    intro: "Practical workflows: how to use Shutap as a storytime script writer, a first-draft partner for stand-up, a skit planner, a punch-up pass, and more.",
  },
  {
    id: "shutap-vs-other-tools",
    label: "Shutap vs other tools",
    title: "Shutap vs ChatGPT, Claude, Gemini & Joke Tools | Shutap",
    description: "How Shutap compares with ChatGPT, Claude, Gemini, Punchlines.ai, Witscript and other comedy script writers: what each is built for and when to use which.",
    intro: "Honest comparisons with general AI assistants and other comedy tools: what each one is built for, where it is stronger, and when Shutap is the better fit.",
  },
  {
    id: "ai-writing-partner",
    label: "AI as a writing partner",
    title: "Brainstorm Comedy With AI Without Losing Your Voice | Shutap",
    description: "How to use AI to brainstorm and punch up comedy while the jokes stay yours: drafts to push against, not a ghostwriter.",
    intro: "Using AI the way writers use a room: to throw out options, find the angle you missed and test a tag, while you decide what stays. The voice on stage or on camera has to be yours.",
  },
];

/** A bit the live product actually wrote, shown on a tool page under the
 *  writer button. Paste real output only: never write one by hand. */
export interface GuideSample {
  /** The story that was typed in, as typed (already scrubbed of names). */
  story: string;
  hook: string;
  setup: string;
  tags: string[];
  button: string;
  /** Date it was generated on shutap.com (YYYY-MM-DD). */
  made: string;
}

export interface Guide {
  slug: string;
  kind: GuideKind;
  /** <title> tag. Keep under ~60 characters. */
  title: string;
  h1: string;
  /** Meta description. */
  description: string;
  /** One-paragraph answer. This is the sentence engines quote. */
  capsule: string;
  /** Short line shown on the hub. */
  blurb: string;
  sections: GuideSection[];
  /** Slugs of related guides. */
  related: string[];
  cta: { label: string; href: string };
  /** ISO date the page was first published. */
  published: string;
  /** ISO date of the last substantive edit. */
  updated?: string;
  /** Topic cluster (required for daily articles). */
  topic?: GuideTopic;
  /** Search query this page targets (daily articles). One page per query. */
  keyword?: string;
  /** Questions people also ask, answered in 1-3 sentences. Rendered + FAQPage schema. */
  faq?: GuideFaq[];
  /** Where any fact or figure on the page comes from. */
  sources?: GuideSource[];
  /** Tool pages: open the writer with these controls set (story box stays empty). */
  preset?: Partial<BitControls>;
  /** Tool pages: one real bit from the product, shown below the writer button. */
  sample?: GuideSample;
  /** The line-level techniques this guide teaches, in the same shape as the
   *  /funniest pages. They feed the bit writer's technique bank at build:
   *  `name` short, `tryIt` an instruction, `example` an original Shutap
   *  line. Only moves doable in a written line; performance moves stay out. */
  techniques?: GuideTechnique[];
}

export interface GuideTechnique {
  name: string;
  whatTheyDid: string;
  whyItWorks: string;
  example: string;
  tryIt: string;
}

const CTA = { label: "Write your bit. AI fills only the gaps.", href: "/bits" };
const BIZ_CTA = { label: "Request pricing and solutions", href: "/business" };
const PUBLISHED = "2026-10-17";

const BASE_GUIDES: Guide[] = [
  // ---- tools ----------------------------------------------------------
  {
    slug: "storytime-script-writer",
    kind: "tool",
    preset: { audience: "social", voice: "storyteller", length: "60s" },
    title: "Storytime Script Writer for TikTok & Reels | Shutap",
    h1: "Storytime script writer",
    description:
      "Write your storytime as a hook, setup, two tags and a button, in your own words. Tap funnier on any line you're stuck on, then film it off the teleprompter. Free with an account.",
    capsule:
      "Shutap helps you shape your storytime into a script you wrote. Tell it your way and Shutap cuts it into a hook, a setup, two tags and a button, your words kept word for word; any line your story didn't cover, the AI copilot drafts. Tap funnier on any line for three other ways to say it, yours first. Then read it off the teleprompter or post the 5-second video. A free account makes 3 free bits.",
    blurb: "Write your story as a hook, setup, tags and a button; tap funnier where you're stuck.",
    sections: [
      {
        heading: "What a storytime script needs",
        body: "A storytime video lives or dies in the first two seconds. The script needs a hook that names the stakes, a setup that tells it in order without detours, a turn where it goes wrong, and a last line people can repeat. Shutap's box asks for each of these as its own line, so you are filling in a shape instead of facing a blank page.",
      },
      {
        heading: "How it works",
        body: "Tell the story the way you would tell a friend; Shutap cuts it into a hook, setup, two tags and a button, in your words. Stuck on one? Write a rough version and tap funnier: you get three other ways to say that line, built from your other lines, with yours first. Lock the lines that are done. Names and places are removed before anything is saved.",
      },
      {
        heading: "Film it",
        body: "Open the teleprompter view and the script scrolls full-screen while you look at the lens. Reading off a prompter keeps your eyes up and your timing steady, which is most of what makes a storytime feel told instead of read. Delivery cues like (beat) and (pause for the laugh) sit where they go, and the scroll holds for a moment at each pause.",
      },
      {
        heading: "Keep it yours",
        body: "Your lines are kept word for word. AI drafts only the lines you leave empty, marked as AI drafts, and offers other ways to say a line when you tap funnier. You can save, share and post what you make.",
      },
      {
        heading: "The one rule",
        body: "The joke goes at the situation, never at a real person someone could identify. It is comedy, not advice. Adults 18 and over.",
      },
    ],
    related: ["how-to-turn-a-story-into-a-bit", "how-long-should-a-tiktok-bit-be", "comedy-teleprompter"],
    cta: CTA,
    published: PUBLISHED,
  },
  {
    slug: "stand-up-bit-writer",
    kind: "tool",
    preset: { audience: "live", voice: "deadpan", length: "2m" },
    title: "Stand-Up Bit Writer: Shape Your Own Material | Shutap",
    h1: "Stand-up bit writer",
    description:
      "Write your bit as a hook, setup, two tags and a button, in your own words. Tap funnier on the line that isn't landing yet, then rehearse it on the prompter, with delivery cues, before the open mic.",
    capsule:
      "Shutap helps you shape a stand-up bit you write yourself. Tell your premise your way; it comes back as a hook, a setup, two tags and a button, in your words. When a line isn't landing, tap funnier for three other ways to say it, yours first; nothing changes until you pick. Then rehearse it on the prompter.",
    blurb: "Tell it your way, get the bit, with funnier on the line you're stuck on.",
    sections: [
      {
        heading: "From story to premise",
        body: "Stand-up starts with something that actually happened and an angle on it. Write the angle as your hook and the one fact it needs as your setup. The tags and the button are where the laughs build. The material is yours from the first line.",
      },
      {
        heading: "What you get",
        body: "A story box that comes back in the shape of a bit: a hook to open on, a setup that tells it straight, two tags that keep the laughs coming, and a button to end on. Funnier on any line offers three other ways to say it, built from your lines. Once every line is yours, the bit runs as stand-up on the teleprompter, a sketch page or a skit.",
      },
      {
        heading: "When you are stuck",
        body: "Write the plain version of the line and tap funnier. Seeing three other ways to say it shows you what you would not say and helps you find what you would. Keep yours, pick one, or rewrite it in your own words.",
      },
      {
        heading: "Rehearse it",
        body: "Run the bit in the teleprompter, with its delivery cues, to hear the timing out loud, or format it as a one-page sketch to mark it up. Then say it to a room. A bit is not finished until an audience has told you where it is slow.",
      },
      {
        heading: "What it will not do",
        body: "It does not write your bit for you, and it does not know your audience. Every line is yours unless you pick a funnier option, and the joke goes at the situation, never at a real person someone could identify.",
      },
    ],
    related: ["how-to-write-comedy-tags", "how-to-turn-a-story-into-a-bit", "comedy-screenplay-format"],
    cta: CTA,
    published: PUBLISHED,
  },
  {
    slug: "pov-skit-writer",
    kind: "tool",
    preset: { audience: "social", voice: "deadpan", length: "30s" },
    title: "POV & Skit Script Writer | Shutap",
    h1: "POV and skit writer",
    description:
      "Tell your story, get the bit, then see it as a skit laid out beat by beat, shot by shot, ready to film alone.",
    capsule:
      "Tell your story in your own words; Shutap cuts it into a bit and lays it out as a skit: a shot list you can film alone, beat by beat, with who says what and when. Every line you say is from your bit.",
    blurb: "See your own bit as a skit, beat by beat, ready to shoot.",
    sections: [
      {
        heading: "Why POV works",
        body: "A POV puts the viewer inside one moment: the text that landed wrong, the meeting that went sideways, the dinner comment. It works because the situation is already familiar. What it needs is a clear first beat, a turn, and a last line that lands.",
      },
      {
        heading: "The scene view",
        body: "Every bit you make can be shown as a skit. The skit breaks your lines into beats in order, so you can see the setup, the turn and the button as separate shots instead of one block of text. It is told not to add new jokes.",
      },
      {
        heading: "Shooting it",
        body: "Solo creators can play every part by changing a prop or a posture between beats. If you have a second person, hand them the lines marked for the other character. Keep each beat to one idea and cut as soon as the line lands.",
      },
      {
        heading: "Start from something true",
        body: "Skits built on something that really happened read as specific, and specific is what gets shared. Tell the real version; the skit keeps your words and adds the shots.",
      },
    ],
    related: ["comedy-screenplay-format", "how-to-turn-a-story-into-a-bit", "storytime-script-writer"],
    cta: CTA,
    published: PUBLISHED,
  },
  {
    slug: "comedy-teleprompter",
    kind: "tool",
    preset: { audience: "social", voice: "storyteller", length: "30s" },
    title: "Teleprompter for Comedy Videos & Open Mics | Shutap",
    h1: "Teleprompter for comedy",
    description:
      "Every bit you make runs in a full-screen teleprompter with delivery cues, so you can film to camera or rehearse a set with your eyes up.",
    capsule:
      "Every bit you make on Shutap can run in a full-screen teleprompter. It scrolls your lines while you look at the lens, with delivery cues where they go, like (beat), (pause for the laugh) or (his voice), so you can film a TikTok, Reel or Short, or rehearse a set, with your eyes up.",
    blurb: "Run any bit full-screen and read it to camera.",
    sections: [
      {
        heading: "Why use a prompter for comedy",
        body: "Comedy lives on timing, and timing falls apart when you look down to read. A prompter keeps your eyes at the lens and your pace steady, which is what makes a written bit sound like something you are saying.",
      },
      {
        heading: "How it works",
        body: "Tell your story and make the bit. Open stand-up and your lines run full-screen on the teleprompter. Put your phone or camera where you can see it, start the scroll, and read to the lens. Delivery cues from your sketch page show between the lines, and the scroll holds for a moment at each pause so the laugh has room. Tap cues to hide them.",
      },
      {
        heading: "Rehearsing a set",
        body: "Use the prompter as a rehearsal tool too. Reading a bit out loud, at speed, shows you which words trip you up and where you need a breath, and the cues show where to take a beat, when to do a voice and when to slow down for the button. Fix those lines and run it again; hide the cues once you know it cold.",
      },
      {
        heading: "Pair it with the right length",
        body: "A 15 second bit is a few dozen words. A 2 minute bit is a few hundred. Shutap counts at about 2.6 words a second, so you can see whether your lines fit the video before you film.",
      },
    ],
    related: ["how-long-should-a-tiktok-bit-be", "storytime-script-writer", "stand-up-bit-writer"],
    cta: CTA,
    published: PUBLISHED,
  },
  {
    slug: "comedy-screenplay-format",
    kind: "tool",
    preset: { audience: "social", voice: "dry", length: "60s" },
    title: "Comedy Scene & Screenplay Page Formatter | Shutap",
    h1: "Comedy screenplay page formatter",
    description:
      "Shutap lays your bit out as a screenplay page, with characters and action, ready to shoot, share or hand to someone else.",
    capsule:
      "Shutap can lay your bit out as a screenplay page, with character names, action and dialogue. Tell your story, make the bit, and take the page to a shoot, a rehearsal or a writers' room.",
    blurb: "Your bit as a script page, with characters and action.",
    sections: [
      {
        heading: "What a screenplay page is",
        body: "A screenplay page separates what is said from what is seen. Character names sit above their lines, action is written in plain present tense, and everything reads top to bottom. That layout makes a bit easy to hand to another performer.",
      },
      {
        heading: "From bit to page",
        body: "Tell your story and make the bit. Switch to the sketch and your lines are laid out as a script page; the layout is told not to add new jokes and to keep your lines close to word for word.",
      },
      {
        heading: "When it helps",
        body: "Use the page when more than one person is in the video, when you want to mark timing and actions, or when you are pitching a sketch. It is also the easiest version to read aloud at a table read.",
      },
      {
        heading: "Edit before you shoot",
        body: "Read the page out loud. If a line reads wrong in a scene, go back to the box, fix it in your words or tap funnier on it, and lay it out again.",
      },
    ],
    related: ["pov-skit-writer", "stand-up-bit-writer", "how-to-turn-a-story-into-a-bit"],
    cta: CTA,
    published: PUBLISHED,
  },

  // ---- guides ---------------------------------------------------------
  // ---- how it is built / comparison ------------------------------------
  {
    slug: "how-shutap-is-built",
    kind: "guide",
    title: "How Shutap Is Built: The Humor Amplifier You Steer | Shutap",
    h1: "How Shutap is built",
    description:
      "How Shutap Bits works: you tell the story, Shutap cuts it into a bit in your words, and the engine underneath drafts only the lines your story didn't cover, or runs when you ask: funnier on one line, or a rewrite on Basic and Pro.",
    capsule:
      "On Shutap Bits your story is cut into its parts and kept word for word. Any part your story didn't cover is drafted by the AI copilot, marked so you can change it or keep it; write all five lines and nothing is drafted. Otherwise the engine described here runs only when you ask for it: funnier on one line offers three other ways to say it, built from your lines and a comedy technique, and on Basic and Pro you can ask for a hotter, tighter or storytelling version.",
    blurb: "The pipeline in detail: observations, whole bits, rules, a judge, and the steering controls.",
    sections: [
      {
        heading: "What makes it different",
        body: "Most joke tools take a topic and return a line you either use or do not. Shutap Bits works the other way: you tell the story, it comes back in the shape comics use (hook, setup, tags, button) in your words, and AI helps only on the line you tap. You stay the writer. Shutap is the sparring partner.",
      },
      {
        heading: "You write it, not a prompt",
        body: "You write your lines the way you would tell a friend. Before anything is saved or sent to a model, names, places and contact details are replaced with role labels. If what you write reads as heavy, Shutap does not turn it into a joke. It stops and points to real help instead.",
      },
      {
        heading: "Step one: find what is actually funny",
        body: "When you ask for a rewrite, Shutap does not begin by writing jokes. It first lists observations about the situation: what is strange about it, what someone said against what they did, what a word was hiding, so the rewrite starts from what is actually funny.",
      },
      {
        heading: "Step two: write whole bits, not lines",
        body: "Four complete bits are written in one pass, each built on a different observation, plus five crowd-work angles: spare lines on the same situation. Every bit has a hook of eight words or fewer that can sit on screen for two seconds, a setup that states the facts plainly, one to three tags that each end on something you can picture, and a button. Four controls shape the writing: audience (social, live, office, work, family or school), voice (deadpan, storyteller, roast or dry), length (15 seconds to 2 minutes) and how wild, from 1 (true to your story) to 5 (goes wild). It sets how far the jokes stray from the facts, never who they're aimed at.",
      },
      {
        heading: "Step three: rules in code, then a judge",
        body: "Rules written in code run first, so they hold even when a model slips. No advice. Jokes go at the situation and the other party's behavior, never at the teller or a real person. No invented facts about someone else. No jokes about bodies, age, looks, intelligence, race, religion, sexuality or disability. And the swap test: if a tag would work just as well on a stranger's story, it is cut. The bits that pass are ranked by a second AI model from a different family than the writer, so the model that wrote a bit never grades its own work. It ranks on whether there is a picture, whether the hook would stop a thumb, whether the button lands instead of explaining, and whether a person would actually say the line out loud. If the judge is unavailable, the first bit that passes the rules is used.",
      },
      {
        heading: "A library of comedy technique",
        body: "Behind the prompts is a library of named comedy techniques: how a joke gets a picture, how tags escalate on one premise, how a button turns a situation around. There is also a hall of fame of lines the founder approved as funny. It sets the bar for what counts, and new writing is checked against it so Shutap does not repeat those lines. The library teaches Shutap how funny writing is built. The writing you get back is about your story.",
      },
      {
        heading: "A dataset we write ourselves",
        body: "The writing is guided by an in-house dataset the Shutap team writes, selects and rates, pairing everyday situations with jokes, tagged by technique, voice and how wild. None of it comes from users. It grows as the team adds to it, so the guidance gets better over time.",
      },
      {
        heading: "What to post today",
        body: "Never start from a blank page. The Shutap homepage shows a daily idea of what to post, with a hook, a short bit and a tag, drawn from what is trending, alongside a trend panel that shows which topics are rising or cooling.",
      },
      {
        heading: "Learn from the funniest",
        body: "The funniest is a series of educational pages. Each asks who is the funniest in a category, such as US presidents, using published rankings and sources, then breaks down how that person was funny into techniques you can use, each with an original example line and a way to try it. Read them at shutap.com/funniest.",
      },
      {
        heading: "You steer",
        body: "Hotter takes it two levels further from the facts, up to 5. Tighter cuts the bit to about 60 percent of its words and keeps only the best tag. Escalate moves each tag one step further along the same line and flips who is in charge on the button. Swap a tag trades one line for another. Mix your own lets you pick the hook, the tag and the button you like from the lines Shutap actually wrote for your story, and rebuilds the bit around the setup. Every change is saved as a new version, so you can go back.",
      },
      {
        heading: "Then film it",
        body: "Each bit can run in a full-screen teleprompter with delivery cues, as a scene laid out beat by beat with shots, speakers and on-screen text (the skit), or as a one-page sketch with scene headings, action, character names and dialogue. Length is estimated from the word count at about 2.6 words a second.",
      },
      {
        heading: "Versioned, tested, and honest about limits",
        body: "Every bit is stamped with the version of the prompts that wrote it. Changes to the writing are checked against a fixed set of test stories that are never used as examples. Shutap is written by AI and gets things wrong, so you decide what to perform. Test it on a real audience before you trust it.",
      },
    ],
    related: ["ai-joke-tools-compared", "shutap-vs-chatgpt-for-jokes", "humor-is-wisdom"],
    cta: CTA,
    published: PUBLISHED,
  },
  {
    slug: "shutap-vs-punchlines-ai",
    kind: "guide",
    title: "Shutap vs Punchlines.ai: Which AI Joke Tool Fits? | Shutap",
    h1: "Shutap vs Punchlines.ai",
    description:
      "Punchlines.ai writes late-night style one-liners from a headline or setup. Shutap helps you write a whole bit yourself, with funnier on any line you're stuck on. Which to use, and when.",
    capsule:
      "Punchlines.ai and Shutap do different jobs. Punchlines.ai writes late-night style punchlines from a headline or setup you give it. Shutap helps you write a whole bit yourself, with a hook, setup, tags and a button, and offers other ways to say any line you tap.",
    blurb: "A fair comparison: one-liners from headlines versus a whole bit you write, with help on demand.",
    sections: [
      {
        heading: "The short answer",
        body: "If you want quick one-liners on a news headline, in a late-night monologue style, Punchlines.ai is built for that. If you want to turn something that happened to you into a bit you will perform, on camera or on stage, Shutap is built for that. They overlap less than the names suggest.",
      },
      {
        heading: "What Punchlines.ai does",
        body: "According to its public descriptions, you give it a joke setup or a news headline and it returns punchlines in the style of late-night monologue jokes, using a model fine-tuned on thousands of them. It offers a limited number of free jokes a day, with more after signing in. The unit of output is a line.",
      },
      {
        heading: "What Shutap does",
        body: "You tell the story; it comes back as a hook, a setup, two tags and a button, your words kept word for word, with any line your story didn't cover drafted by the AI copilot. Tap funnier on a line and it offers three other ways to say it, built from your lines and a comedy technique, yours first. The unit of output is your bit, laid out as a 5-second video, stand-up, a sketch page or a skit. A free account makes 3 free bits.",
      },
      {
        heading: "Who is the writer",
        body: "With a one-liner tool you pick from lines. With Shutap you write, and AI helps only on the line you ask about. The material is yours, and so is the final call.",
      },
      {
        heading: "What you can do with the result",
        body: "A one-liner goes into a caption or a monologue. A Shutap bit runs as stand-up on a full-screen teleprompter with delivery cues, lays out as a skit beat by beat, or formats as a one-page sketch, so it is ready to film or take to an open mic.",
      },
      {
        heading: "Beyond the bit",
        body: "Around the humor amplifier, Shutap gives you a daily idea of what to post, with a hook, a short bit and a tag drawn from what is trending, and a series called The funniest, which breaks down the techniques of funny people with original example lines you can try. Both sit on an in-house dataset the Shutap team writes, selects and rates, pairing everyday situations with jokes, tagged by technique, voice and how wild.",
      },
      {
        heading: "Which should you use",
        body: "Use Punchlines.ai for topical one-liners built on news. Use Shutap when the funny thing is your own story and you want to perform it. Plenty of people could reasonably use both.",
      },
      {
        heading: "About this page",
        body: "The description of Punchlines.ai comes from its public pages and third-party listings as of October 2026, and tools change. Check its own site for what it does today.",
      },
    ],
    related: ["how-shutap-is-built", "stand-up-bit-writer", "how-to-turn-a-story-into-a-bit"],
    cta: CTA,
    published: PUBLISHED,
  },

  {
    slug: "humor-is-wisdom",
    kind: "guide",
    title: "Humor Is Wisdom: Why Shutap Exists | Shutap",
    h1: "Humor is wisdom",
    description:
      "Shutap's vision: humor is a form of human wisdom, and technology should help people find and sharpen their own, not replace it.",
    capsule:
      "Shutap is built on one belief from its founder: humor is wisdom. Seeing a hard moment clearly enough to say something true and funny about it is a skill worth building, and technology should help people build it rather than do it for them.",
    blurb: "The belief behind Shutap: humor is human wisdom, and technology should sharpen it.",
    sections: [
      {
        heading: "The belief",
        body: "Humor is wisdom. To make someone laugh about a hard moment, you have to see it clearly: what actually happened, what everyone was pretending, and what is absurd underneath. That is a way of understanding, and the people who do it well are rarely fooled.",
      },
      {
        heading: "What the founder sees in technology",
        body: "Candy, the founder of Shutap, does not think the tools of the last decade have left people feeling better. This is a personal view, not a study. Feeds and assistants make more content and more answers, and they often leave people more hurried, more compared and more alone with their thoughts. Shutap starts from a different question: what if technology helped people get better at something deeply human instead of doing it for them?",
      },
      {
        heading: "Why the funniest people matter",
        body: "Watch who gets welcomed into a room. The funniest people tend to be wanted at the table, listened to when they speak, and followed when they lead. Humor lets a person say the hard thing in a way others can hear. It builds trust, lowers the temperature and makes a point stick. A leader who can find the funny in a bad day is easier to follow through it.",
      },
      {
        heading: "Technology that enhances, not replaces",
        body: "Shutap does not write your bit for you. On Bits you write every line, and AI helps only on the line you tap: three other ways to say it, yours first, nothing changed until you pick. The point is that you get funnier, and the voice stays yours. A tool that makes you better at being funny is a different thing from a tool that is funny instead of you.",
      },
      {
        heading: "Learn from the funniest",
        body: "If humor is wisdom, it can be studied. The funniest is a series of pages that ask who is the funniest in a category, using published rankings and sources, then break down the techniques that made them funny, each with an original example line and a way to try it.",
      },
      {
        heading: "Where it goes",
        body: "Shutap is for anyone who needs to say it funnier: creators and comedians turning stories into bits, and anyone with a toast, a talk, an interview, a demo, a product launch or a meeting coming up. All of them go better when the person talking can find the true and funny thing to say. The aim is the same throughout, to help people bring more of their own humor into the room.",
      },
      {
        heading: "What Shutap is not",
        body: "Shutap is entertainment and a writing tool. It is not therapy, not crisis care and not advice, and it is for adults 18 and over. If you are struggling, please reach out to a person or a local helpline. In the US you can call or text 988, in the UK and Ireland Samaritans on 116 123, and findahelpline.com lists services worldwide.",
      },
    ],
    related: ["how-shutap-is-built", "shutap-vs-punchlines-ai", "how-to-turn-a-story-into-a-bit"],
    cta: CTA,
    published: PUBLISHED,
  },

  {
    slug: "ai-joke-tools-compared",
    kind: "guide",
    title: "AI Joke Tools Compared: Shutap, Witscript, Punchlines.ai, ChatGPT | Shutap",
    h1: "AI joke tools compared",
    description:
      "A plain comparison of AI joke tools: Shutap, Witscript, Punchlines.ai and ChatGPT. What each takes as input, what it returns, and who it fits.",
    capsule:
      "AI joke tools fall into three kinds: tools that return one-liners from a setup or headline (Witscript, Punchlines.ai), general chatbots you prompt for jokes (ChatGPT, Claude), and Shutap, where you tell your own story, get it back as a bit in your words, and AI helps only on the line you tap.",
    blurb: "Shutap, Witscript, Punchlines.ai and ChatGPT side by side: input, output and fit.",
    sections: [
      {
        heading: "The three kinds of tool",
        body: "One-liner tools take a setup or headline and return punchlines. General chatbots take any prompt and return whatever you ask for, jokes included. Bit tools take a story and return a structured piece you can perform. Which one you need depends on whether you want a line, a draft, or a bit.",
      },
      {
        heading: "Shutap",
        body: "Input: your story, told your way, cut into a bit (hook, setup, two tags, button) in your words. Help: tap funnier on any line for three other ways to say it, yours first. Output: your bit as a 5-second video to post, and stand-up on the teleprompter, a skit and a one-page sketch to perform. A free account makes 3 free bits.",
      },
      {
        heading: "Witscript",
        body: "Input: a setup sentence, such as a news headline or an observation. Output: several jokes with a favorite picked, plus tools to punch up a joke, rate it and find setups from the news. Built by former late-night head writer Joe Toplyn, it is a paid monthly subscription and, per its site, currently limited to users in the United States. Best for topical joke writing from a given setup.",
      },
      {
        heading: "Punchlines.ai",
        body: "Input: a setup or headline in a chat box. Output: late-night style punchlines. It has offered a limited number of free tries. Best for fast topical one-liners.",
      },
      {
        heading: "ChatGPT, Claude and other general chatbots",
        body: "Input: any prompt. Output: jokes in whatever style you describe. They are flexible and free to start, and a good way to brainstorm. They are not built around comedy structure, so the result depends heavily on how well you prompt and how much you edit, and they do not give you a hook, tags and a button unless you ask for them.",
      },
      {
        heading: "What Shutap adds around the tool",
        body: "Shutap pairs the humor amplifier with a daily what-to-post idea, The funniest (a series that teaches the techniques of funny people), and an in-house joke dataset the Shutap team writes, selects and rates, never from users. To our knowledge, no other joke tool pairs all of these.",
      },
      {
        heading: "Which should you pick",
        body: "Topical one-liners from the news: Witscript or Punchlines.ai. Open-ended brainstorming: a chatbot. A bit built from something that happened to you, ready to film or take to an open mic: Shutap. Many writers use more than one.",
      },
      {
        heading: "About this page",
        body: "Descriptions come from each tool's public pages and third-party listings as of October 2026. Features, prices and availability change, so check each site. Shutap is written by its own founder and is listed here as one option among several.",
      },
    ],
    related: ["shutap-vs-punchlines-ai", "shutap-vs-witscript", "shutap-vs-chatgpt-for-jokes", "shutap-vs-claude-for-jokes"],
    cta: CTA,
    published: PUBLISHED,
  },
  {
    slug: "shutap-vs-witscript",
    kind: "guide",
    title: "Shutap vs Witscript: Which AI Joke Writer Fits? | Shutap",
    h1: "Shutap vs Witscript",
    description:
      "Witscript turns a setup sentence into jokes. Shutap turns your own story into a bit in your words, with funnier on any line you're stuck on. How they differ and who each is for.",
    capsule:
      "Witscript takes a setup sentence, such as a headline, and returns jokes. Shutap is where you write your own bit, a hook, setup, two tags and a button, and tap funnier on any line for three other ways to say it.",
    blurb: "Setup-to-jokes versus story-to-bit.",
    sections: [
      {
        heading: "The short answer",
        body: "Use Witscript when you have a setup and want jokes on it, especially topical ones. Use Shutap when you want to write your own bit to perform and keep every line yours, with help where you're stuck. They solve neighboring problems.",
      },
      {
        heading: "What Witscript does",
        body: "Per its own site, you give it a setup sentence and it returns several jokes and picks a favorite. It also offers a tool to punch up a joke, one that rates a joke, and one that suggests setups from current news. It was created by Joe Toplyn, a former late-night head writer, and is a paid monthly subscription currently available to users in the United States.",
      },
      {
        heading: "What Shutap does",
        body: "You tell the story and get it back as a bit, your words kept word for word; any line it didn't cover, the AI copilot drafts. Tap funnier on a line and Shutap offers three other ways to say it, built from your lines and one named comedy technique, checked by rules in code; yours stays the first choice. Nothing changes until you pick.",
      },
      {
        heading: "Input and output",
        body: "Witscript starts from a sentence and returns jokes. Shutap starts from your lines and returns your bit, laid out as a 5-second video, a teleprompter, a skit or a screenplay page.",
      },
      {
        heading: "Beyond the bit",
        body: "Around the humor amplifier, Shutap gives you a daily idea of what to post, with a hook, a short bit and a tag drawn from what is trending, and a series called The funniest, which breaks down the techniques of funny people with original example lines you can try. Both sit on an in-house dataset the Shutap team writes, selects and rates, pairing everyday situations with jokes, tagged by technique, voice and how wild.",
      },
      {
        heading: "Who should use which",
        body: "Writers of topical material, speeches and captions fit Witscript. Anyone building bits from their own life, for a post, a set, a toast or a talk, fits Shutap. Using both is reasonable.",
      },
      {
        heading: "About this page",
        body: "Witscript details come from its public site as of October 2026 and may have changed. Check witscript.joetoplyn.com for the current offer.",
      },
    ],
    related: ["ai-joke-tools-compared", "how-shutap-is-built", "shutap-vs-punchlines-ai"],
    cta: CTA,
    published: PUBLISHED,
  },
  {
    slug: "shutap-vs-chatgpt-for-jokes",
    kind: "guide",
    title: "Shutap vs ChatGPT and Claude for Writing Jokes and Bits | Shutap",
    h1: "Shutap vs ChatGPT and Claude for jokes",
    description:
      "ChatGPT and Claude can write jokes if you prompt them well. Shutap Bits is built for writers who want to write their own bit, with help on the line they're stuck on. What the difference means in practice.",
    capsule:
      "ChatGPT and Claude are general assistants that can write jokes when prompted. Shutap Bits is built for one job: turning your own story into a bit, in your words, with a hook, setup, tags and a button. AI only offers other ways to say a line when you tap funnier, and the finished bit comes back as a video, stand-up, a sketch and a skit.",
    blurb: "A general chatbot versus a tool built for writing your own bits.",
    sections: [
      {
        heading: "The short answer",
        body: "ChatGPT and Claude are flexible, capable writers and good brainstorming partners. Shutap does one thing: it helps you write your own bit, in the shape comics use, and builds the checks around the help so you do not have to prompt for them.",
      },
      {
        heading: "What you do yourself with a chatbot",
        body: "With a general chatbot you decide the structure, write the prompt, ask for tags, ask for a button, and judge the result. You can get good material, and it takes prompting skill and editing. The model tends to explain or generalize unless you push it.",
      },
      {
        heading: "What Shutap does for you",
        body: "Shutap cuts your story into the shape of a bit, in your words. Tap funnier on any line and it offers three other ways to say it, built from your lines and one named comedy technique, with checks that block advice, jokes at the teller and lines that would work on anyone's story. Yours always stays the first choice.",
      },
      {
        heading: "What only Shutap has around the tool",
        body: "A daily idea of what to post with a hook, a bit and a tag, drawn from what is trending. The funniest, a series of educational pages that break down the techniques of funny people with original example lines. And an in-house dataset the Shutap team writes, selects and rates, pairing everyday situations with jokes, tagged by technique, voice and how wild. A general chatbot gives you a blank box. Shutap gives you the structure, the checks and the learning material around it.",
      },
      {
        heading: "Formats",
        body: "Shutap lays your bit out as a 5-second video to post, stand-up on a full-screen teleprompter with delivery cues, a skit beat by beat, or a one-page sketch.",
      },
      {
        heading: "Who should use which",
        body: "Use a chatbot for open-ended brainstorming and anything outside comedy. Use Shutap when you want to write your own bit, keep every line yours, and get help only where you ask.",
      },
      {
        heading: "Limits",
        body: "Both are AI and both get things wrong. In either case you decide what to perform, and a real audience is the final test.",
      },
    ],
    related: ["ai-joke-tools-compared", "how-shutap-is-built", "shutap-vs-witscript"],
    cta: CTA,
    published: PUBLISHED,
  },
  {
    slug: "funny-for-business",
    kind: "business",
    title: "Shutap Enterprise: Humor for Presentations, Demos and Meetings | Shutap",
    h1: "Shutap Enterprise",
    description:
      "Where Shutap is heading: helping teams bring humor to presentations, roadshows, demos, product launches and meetings, written from their own material.",
    capsule:
      "Shutap's goal is to make the way businesses talk funnier: presentations, roadshows, demos, product launches, slides and meetings, written from the speaker's own stories and facts, with the speaker staying in control.",
    blurb: "The business direction: humor for presentations, roadshows, demos, launches and meetings.",
    sections: [
      {
        heading: "Why business needs funnier people",
        body: "Most corporate communication is forgettable. Slides get skimmed, demos blur together and meetings drift. A well-placed funny line makes a point stick, lowers the room's guard and makes the speaker easier to trust. Shutap is built on the idea that humor is wisdom, and that people who use it well get listened to.",
      },
      {
        heading: "What Shutap is building",
        body: "The same engine behind funnier on Shutap Bits is being shaped for work: finding what is actually funny in your material, offering candidate lines in your voice, and leaving every choice to you. The plan covers presentations and slides, roadshows and investor pitches, product demos and launches, and everyday conversations and meetings.",
      },
      {
        heading: "You stay the speaker",
        body: "Shutap drafts and you decide. It does not write your talk or speak for you. It offers lines grounded in your own facts, and you choose what goes in, what gets cut and how it sounds in your mouth.",
      },
      {
        heading: "Guardrails for work",
        body: "Lines go at the situation, never at a colleague, customer or competitor by name, and never at the speaker. No advice, no jokes about bodies, age, race, religion, sexuality or disability. Names and details are replaced with role labels before anything is stored.",
      },
      {
        heading: "Where this stands today",
        body: "Shutap's engine is live now in Bits, where you write your own bit and tap funnier on any line for other ways to say it. Tools made specifically for presentations, slides, demos and meetings are in development, and this page describes where Shutap is heading rather than a finished feature. Try it on a bit of your own and see how it helps.",
      },
    ],
    related: ["funny-presentations-and-slides", "funny-product-demos-and-launches", "humor-is-wisdom"],
    cta: BIZ_CTA,
    published: PUBLISHED,
  },
  {
    slug: "funny-presentations-and-slides",
    kind: "business",
    title: "Make Presentations and Slides Funny Without Being Cringe | Shutap",
    h1: "Make presentations and slides funny",
    description:
      "How to add humor to a presentation or slide deck without undercutting your message, and how Shutap is heading toward helping.",
    capsule:
      "The funniest slides come from something true about your material, not from a joke bolted on. Find the real absurd detail, say it plainly, place it at a transition, then move on. Shutap is being built to help presenters find and sharpen those lines.",
    blurb: "Where to put humor in a deck, how to write it, and what to avoid.",
    sections: [
      {
        heading: "Start with a true detail",
        body: "The best presentation humor is a real observation about your topic, your industry or your own experience. Generic jokes pasted in from the internet feel like filler. A specific detail from your material cannot be used by anyone else.",
      },
      {
        heading: "Place it at a transition",
        body: "Put one funny line where attention dips: after a dense slide, at the start of a new section, or at the close. One well-placed line beats five scattered ones.",
      },
      {
        heading: "Keep it short and plain",
        body: "State the facts plainly, add one twist, and stop. Do not explain the joke, and do not apologize for it.",
      },
      {
        heading: "Aim at the situation, not people",
        body: "Joke about the process, the jargon, the situation or yourself carefully. Avoid naming colleagues, customers or competitors, and avoid anything about identity.",
      },
      {
        heading: "Check the room",
        body: "Know the audience. A board meeting, a customer webinar and an all-hands call for different distances from the facts. Shutap's wild setting controls exactly that: 1 is true to what happened, 5 goes wild.",
      },
      {
        heading: "Where this stands today",
        body: "Shutap's engine is live now in Bits, where you write your own bit and tap funnier on any line for other ways to say it. Tools made specifically for presentations, slides, demos and meetings are in development, and this page describes where Shutap is heading rather than a finished feature. Try it on a bit of your own and see how it helps.",
      },
    ],
    related: ["funny-for-business", "funny-product-demos-and-launches", "how-to-write-comedy-tags"],
    cta: BIZ_CTA,
    published: PUBLISHED,
  },
  {
    slug: "funny-product-demos-and-launches",
    kind: "business",
    title: "Funny Product Demos and Launches: Humor That Sells | Shutap",
    h1: "Funny product demos and launches",
    description:
      "How humor helps product demos, launches and roadshows land, and how to write it from real customer and product stories.",
    capsule:
      "A demo or launch is easier to remember when it carries one real, funny story: the problem everyone has lived through. Start from a true customer or team story, state it plainly and let the product be the button. Shutap is being built to help find those moments.",
    blurb: "Humor for demos, launches and roadshows, built from real stories.",
    sections: [
      {
        heading: "Open with the problem everyone recognizes",
        body: "The pain your product removes is usually absurd when you describe it plainly. A true story about the old way of doing things gets a laugh and sets up your solution.",
      },
      {
        heading: "Make the product the button",
        body: "The strongest structure is setup, tags, then the product as the turn. The audience laughs at the problem and then sees the fix.",
      },
      {
        heading: "Use real stories, not stock jokes",
        body: "A story from a real customer, a launch-week disaster or a team mishap carries credibility that stock humor cannot. Names and identifying details should be removed or approved.",
      },
      {
        heading: "Roadshows and pitches",
        body: "Pitches are repeated many times. Humor that lives in a tight tag or button survives repetition and can be adapted to each room.",
      },
      {
        heading: "Keep control",
        body: "You should be able to tighten, escalate or cut any line. Shutap's controls are designed around that.",
      },
      {
        heading: "Where this stands today",
        body: "Shutap's engine is live now in Bits, where you write your own bit and tap funnier on any line for other ways to say it. Tools made specifically for presentations, slides, demos and meetings are in development, and this page describes where Shutap is heading rather than a finished feature. Try it on a bit of your own and see how it helps.",
      },
    ],
    related: ["funny-for-business", "funny-presentations-and-slides", "how-shutap-is-built"],
    cta: BIZ_CTA,
    published: PUBLISHED,
  },
  {
    slug: "shutap-vs-claude-for-jokes",
    kind: "guide",
    title: "Shutap vs Claude for Writing Jokes and Bits | Shutap",
    h1: "Shutap vs Claude for jokes",
    description:
      "Claude is a general AI assistant that can draft and edit jokes. Shutap Bits turns your own story into a bit in your words, with funnier on demand, daily ideas and technique guides around it.",
    capsule:
      "Claude is a general AI assistant that writes and edits well, jokes included, when you prompt it. Shutap Bits is built for one job: turning your own story into a bit in your words, drafting only the lines your story didn't cover, and offering other ways to say a line when you tap funnier.",
    blurb: "A general assistant versus a tool built for bits.",
    sections: [
      {
        heading: "The short answer",
        body: "Claude is a strong general writer and a good partner for brainstorming and editing a joke you already have. Shutap is a specialized tool: it gives you the shape of a bit to write in your own words and helps on the line you're stuck on, then lays the finished bit out to film or perform.",
      },
      {
        heading: "What you do yourself with Claude",
        body: "You decide the structure, write the prompt, ask for tags and a button, and judge the result. With good prompting you can get strong material. It is flexible, and it is also work, and the result depends on how you steer it.",
      },
      {
        heading: "What Shutap does for you",
        body: "Shutap cuts your story into the parts of a bit, in your words. Tap funnier on any line and it offers three other ways to say it, built from your lines and one named comedy technique, with checks that block advice, jokes at the teller and lines that would work on anyone's story. Yours always stays the first choice.",
      },
      {
        heading: "What only Shutap has around the tool",
        body: "A daily idea of what to post with a hook, a bit and a tag, drawn from what is trending. The funniest, a series of educational pages that break down the techniques of funny people with original example lines. And an in-house dataset the Shutap team writes, selects and rates, pairing everyday situations with jokes, tagged by technique, voice and how wild.",
      },
      {
        heading: "Formats",
        body: "Shutap lays your bit out as a 5-second video to post, stand-up on a full-screen teleprompter with delivery cues, a skit beat by beat, or a one-page sketch.",
      },
      {
        heading: "Who should use which",
        body: "Use Claude for open-ended writing, editing and anything outside comedy. Use Shutap when you want to write your own bit, keep every line yours, and get help only where you ask.",
      },
      {
        heading: "Limits",
        body: "Both are AI and both get things wrong. You decide what to perform, and a real audience is the final test.",
      },
    ],
    related: ["shutap-vs-chatgpt-for-jokes", "ai-joke-tools-compared", "how-shutap-is-built"],
    cta: CTA,
    published: PUBLISHED,
  },
  {
    slug: "how-to-turn-a-story-into-a-bit",
    kind: "guide",
    preset: { voice: "storyteller", length: "60s" },
    title: "How to Turn a Story Into a Comedy Bit (Step by Step) | Shutap",
    h1: "How to turn a story into a bit",
    description:
      "A step-by-step method for turning something that happened to you into a comedy bit: find the moment, write the hook, tell the setup, add tags, end on a button.",
    capsule:
      "To turn a story into a bit, pick one moment, find the specific detail that made it strange, open on a hook, tell the setup in order, add tags that keep the same angle going, and end on a button. Cut anything that does not serve the laugh.",
    blurb: "A six-step method: moment, detail, hook, setup, tags, button.",
    sections: [
      {
        heading: "1. Pick one moment",
        body: "A story is a night. A bit is one minute of it. Choose the single moment where the situation turned, not the whole timeline. If you need a paragraph of background before the funny part, start later.",
      },
      {
        heading: "2. Find the specific detail",
        body: "Generic is the enemy. The exact words someone said, the object on the table, the number they used: that is what makes a bit sound true. Write down the detail that made you stop and think, then build around it.",
      },
      {
        heading: "3. Write the hook",
        body: "The hook is the first line, and it has to make a stranger stay. Lead with the strangest true thing, not the context. Context comes after they are listening.",
      },
      {
        heading: "4. Tell the setup straight",
        body: "The setup is the facts, in order, with no jokes fighting for attention. Say what happened as plainly as you can. The plainer the setup, the harder the turn lands.",
      },
      {
        heading: "5. Add tags",
        body: "Tags are extra lines after the first laugh that keep pushing the same angle. They are short and each one adds something new. Two or three is plenty.",
      },
      {
        heading: "6. End on a button",
        body: "The button is the closing line. It should feel final. If you can end on a callback to the hook, do. Then stop talking.",
      },
      {
        heading: "Or let Shutap draft it",
        body: "Shutap does these steps for you. Write the story as it happened and it returns a hook, setup, tags and a button in your voice and length. Edit it until it sounds like you.",
      },
    ],
    related: ["how-to-write-comedy-tags", "how-long-should-a-tiktok-bit-be", "storytime-script-writer"],
    cta: CTA,
    published: PUBLISHED,
  },
  {
    slug: "how-long-should-a-tiktok-bit-be",
    kind: "guide",
    title: "How Long Should a TikTok Comedy Bit Be? Word Counts | Shutap",
    h1: "How long should a TikTok bit be?",
    description:
      "Word counts for 15 second, 30 second, 60 second and 2 minute comedy bits, and how to pick the right length for TikTok, Reels and Shorts.",
    capsule:
      "Most people speak about 130 to 170 words a minute, so a 15 second bit is roughly 35 words, 30 seconds is about 75, 60 seconds is about 150, and 2 minutes is about 300. Leave room for pauses, because laughs and beats take time.",
    blurb: "Word counts for 15s, 30s, 60s and 2 minute bits.",
    sections: [
      {
        heading: "The quick numbers",
        body: "At a normal speaking pace of roughly 150 words a minute: 15 seconds is about 35 words, 30 seconds is about 75, 60 seconds is about 150, and 2 minutes is about 300. These are estimates. Your own pace may be faster or slower, so read a draft out loud with a timer once.",
      },
      {
        heading: "Leave room for beats",
        body: "Comedy needs pauses: a beat before the turn, a breath after the laugh line. Cut about a tenth of the words from any script to make room for them, or the video will run over.",
      },
      {
        heading: "15 seconds",
        body: "One premise, one punch. This is the length for a single sharp observation or a fast POV. There is no room for a setup, so the hook is the setup.",
      },
      {
        heading: "30 to 60 seconds",
        body: "The workhorse range for storytime. Enough time for a hook, a short setup, a turn and a tag or two. If you are unsure, start here.",
      },
      {
        heading: "2 minutes",
        body: "Room for a real bit with several tags and a callback. Only worth it if the story earns it. If the second minute is not as strong as the first, cut it back to 60.",
      },
      {
        heading: "Pick the length first",
        body: "Decide the length before you write. In Shutap you choose 15s, 30s, 60s or 2m up front, so the script is written to fit the video.",
      },
    ],
    related: ["comedy-teleprompter", "how-to-turn-a-story-into-a-bit", "storytime-script-writer"],
    cta: CTA,
    published: PUBLISHED,
  },
  {
    slug: "how-to-write-comedy-tags",
    kind: "guide",
    title: "How to Write Comedy Tags: Method and Rules | Shutap",
    h1: "How to write comedy tags",
    description:
      "A tag is an extra joke after the punchline that keeps the same angle going. How to find tags, how many to write, and why the last one matters most.",
    capsule:
      "A tag is a short extra line after the first laugh that keeps pushing the same premise. Write two or three, keep each one shorter than the last, make each add something new, and put the strongest one at the end.",
    blurb: "What a tag is, how to find one, and how many to write.",
    sections: [
      {
        heading: "What a tag is",
        body: "A bit has a setup and a punchline. A tag is any line you add after that punchline using the same setup. The audience has already agreed to the premise, so each tag is cheaper to land than the first joke. Good bits are often mostly tags.",
      },
      {
        heading: "How to find them",
        body: "Go back to the premise and ask what else is true about it. Who else is in the situation? What would happen next? What is the most extreme version? Each answer is a candidate. Write ten, keep the best two or three.",
      },
      {
        heading: "Keep them short",
        body: "Tags should get shorter as they go. A long tag restarts the setup and costs you the rhythm. If a tag needs explaining, it is a new bit, not a tag.",
      },
      {
        heading: "Do not repeat the shape",
        body: "If every tag is built the same way, the audience hears the pattern and stops laughing at the content. Change the shape: a question, a comparison, a quiet understatement.",
      },
      {
        heading: "End on the best one",
        body: "Order tags by strength, weakest first. The last line is what people remember, so make it the strongest, then stop. That closing line is the button.",
      },
      {
        heading: "Get unstuck on a tag",
        body: "Write your tags in the Shutap box as tag 1 and tag 2. If one isn't landing, tap funnier on it for three other ways to say it, built from your other lines. Cross out anything that sounds like anyone could have said it, and keep what sounds like you.",
      },
    ],
    related: ["how-to-turn-a-story-into-a-bit", "stand-up-bit-writer", "how-long-should-a-tiktok-bit-be"],
    cta: CTA,
    published: PUBLISHED,
  },
];

// Daily articles: one file per article in ./articles/<slug>.ts (default export:
// Guide, kind "guide"). Written by the daily article agent, one file per PR.
const ARTICLES: Guide[] = Object.values(
  import.meta.glob<{ default: Guide }>("./articles/*.ts", { eager: true }),
)
  .map((m) => m.default)
  .sort((a, b) => a.published.localeCompare(b.published) || a.slug.localeCompare(b.slug));

// Topics for the hand-written guides (kept here so their objects stay untouched).
const BASE_TOPICS: Record<string, GuideTopic> = {
  "shutap-vs-punchlines-ai": "shutap-vs-other-tools",
  "ai-joke-tools-compared": "shutap-vs-other-tools",
  "shutap-vs-witscript": "shutap-vs-other-tools",
  "shutap-vs-chatgpt-for-jokes": "shutap-vs-other-tools",
  "shutap-vs-claude-for-jokes": "shutap-vs-other-tools",
  "how-shutap-is-built": "using-shutap",
  "how-to-turn-a-story-into-a-bit": "storytime-and-pov",
  "how-long-should-a-tiktok-bit-be": "storytime-and-pov",
  "how-to-write-comedy-tags": "writing-jokes",
};

export const GUIDES: Guide[] = [
  ...BASE_GUIDES.map((g) => (BASE_TOPICS[g.slug] && !g.topic ? { ...g, topic: BASE_TOPICS[g.slug] } : g)),
  ...ARTICLES,
];

export function getTopic(id: string): GuideTopicInfo | undefined {
  return GUIDE_TOPICS.find((t) => t.id === id);
}

export function topicPath(id: GuideTopic): string {
  return `/guides/topic/${id}`;
}

export function guidesInTopic(id: GuideTopic): Guide[] {
  return GUIDES.filter((g) => g.topic === id).sort(
    (a, b) => (b.updated ?? b.published).localeCompare(a.updated ?? a.published) || a.h1.localeCompare(b.h1),
  );
}

/** Old guide addresses that had "generator" in them (retired Oct 30 2026).
 *  They redirect, so links and search results keep working. */
export const GUIDE_SLUG_REDIRECTS: Record<string, string> = {
  "storytime-script-generator": "storytime-script-writer",
  "stand-up-bit-generator": "stand-up-bit-writer",
  "pov-skit-generator": "pov-skit-writer",
  "ai-joke-generators-compared": "ai-joke-tools-compared",
  "best-ai-joke-generator-for-tiktok": "best-ai-joke-tool-for-tiktok",
  "ai-roast-generator": "ai-roast-tools-compared",
  // Nov 9 2026: addresses people arrive at (outside links, ads) that never
  // were guides. A value starting with "/" is a page elsewhere on the site.
  "office-holiday-party-speech": "/toasts/office-holiday-party",
  "how-shutap-writes-a-bit": "/how-it-works",
};

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function guidePath(slug: string): string {
  return `/guides/${slug}`;
}
