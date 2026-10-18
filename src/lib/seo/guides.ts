// Shutap-written guides and tool pages. This is the public, indexable content
// of the site: nothing here comes from what members write. Every page is one
// search intent, one answer, and one route into the generator.
//
// Voice: terse, concrete. No card counts, no wellness vocabulary, no claims
// about features that are not in the product.

export type GuideKind = "tool" | "guide";

export interface GuideSection {
  heading: string;
  body: string;
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
}

const CTA = { label: "Write your story, get the bit", href: "/" };
const PUBLISHED = "2026-10-17";

export const GUIDES: Guide[] = [
  // ---- tools ----------------------------------------------------------
  {
    slug: "storytime-script-generator",
    kind: "tool",
    title: "Storytime Script Generator for TikTok & Reels | Shutap",
    h1: "Storytime script generator",
    description:
      "Turn the story you were going to tell anyway into a storytime script with a hook, setup, tags and a button. First bit needs no account. Film it off the teleprompter.",
    capsule:
      "Shutap is a storytime script generator. Write what happened, pick a voice and a length, and it returns a script with a hook, a setup, tags and a button, ready to read off the teleprompter. Your first one needs no account.",
    blurb: "Turn what happened into a script with a hook, setup, tags and a button.",
    sections: [
      {
        heading: "What a storytime script needs",
        body: "A storytime video lives or dies in the first two seconds. The script needs a hook that names the stakes, a setup that tells it in order without detours, a turn where it goes wrong, and a last line people can repeat. Shutap builds all four from your story, so you are editing a draft instead of facing a blank page.",
      },
      {
        heading: "How it works",
        body: "Write the story the way you would tell a friend. Pick who it is for (social, live, office, work, family or school), a voice (deadpan, storyteller, roast or dry), a length (15 seconds, 30 seconds, 60 seconds or 2 minutes) and a heat level from 1 to 5. Shutap returns the script. Names and places are removed before anything is saved.",
      },
      {
        heading: "Film it",
        body: "Open the teleprompter view and the script scrolls full-screen while you look at the lens. Reading off a prompter keeps your eyes up and your timing steady, which is most of what makes a storytime feel told instead of read.",
      },
      {
        heading: "Keep it yours",
        body: "The script uses the details you gave it, so it sounds like your story and not a template. Edit any line, then film it. You can download, share and post what Shutap writes for you.",
      },
      {
        heading: "The one rule",
        body: "Shutap writes about the situation, never about a real person someone could identify. It is comedy, not advice. Adults 18 and over.",
      },
    ],
    related: ["how-to-turn-a-story-into-a-bit", "how-long-should-a-tiktok-bit-be", "comedy-teleprompter"],
    cta: CTA,
    published: PUBLISHED,
  },
  {
    slug: "stand-up-bit-generator",
    kind: "tool",
    title: "AI Stand-Up Bit Generator: First Drafts From Your Stories | Shutap",
    h1: "Stand-up bit generator",
    description:
      "Write a story from your own life and get a stand-up bit draft: setup, tags and a button. Use it to get unstuck, then take it to the open mic.",
    capsule:
      "Shutap is an AI stand-up bit generator. You write a real story from your life and it drafts the bit: a setup, tags and a button, in your choice of voice and length. It is a first draft to push against, not a finished set.",
    blurb: "A first draft of the bit, with setup, tags and a button, from a real story.",
    sections: [
      {
        heading: "From story to premise",
        body: "Stand-up starts with something that actually happened and an angle on it. Most writers have more stories than premises. Write the story as it happened and Shutap finds an angle and drafts the bit around your details, so the material stays yours.",
      },
      {
        heading: "What you get",
        body: "A hook to open on, a setup that tells the story straight, tags that keep the laughs coming after the first one lands, and a button to end on. You choose a voice (deadpan, storyteller, roast or dry), a length from 15 seconds to 2 minutes, and a heat level from 1 to 5.",
      },
      {
        heading: "When you are stuck",
        body: "A draft you disagree with is useful. It shows you what you would not say and makes you find what you would. Writers use it to get past a blank page, to find a new tag for a bit that is almost working, or to warm up before a writing session.",
      },
      {
        heading: "Rehearse it",
        body: "Run the bit in the teleprompter to hear the timing out loud, or format it as a screenplay page to mark it up. Then say it to a room. A bit is not finished until an audience has told you where it is slow.",
      },
      {
        heading: "What it will not do",
        body: "It does not know your audience, and it does not replace your voice. Cut anything that does not sound like you. Shutap writes about the situation, never about a real person someone could identify.",
      },
    ],
    related: ["how-to-write-comedy-tags", "how-to-turn-a-story-into-a-bit", "comedy-screenplay-format"],
    cta: CTA,
    published: PUBLISHED,
  },
  {
    slug: "pov-skit-generator",
    kind: "tool",
    title: "POV & Skit Script Generator for Creators | Shutap",
    h1: "POV and skit generator",
    description:
      "Turn a real situation into a POV or skit laid out beat by beat. Shutap writes the bit, then shows it as a scene you can shoot.",
    capsule:
      "Shutap writes a bit from your story and lays it out as a scene, beat by beat, so you can shoot it as a POV or a skit. Write what happened and the scene view shows who says what and when.",
    blurb: "See your bit as a scene, beat by beat, ready to shoot.",
    sections: [
      {
        heading: "Why POV works",
        body: "A POV puts the viewer inside one moment: the text that landed wrong, the meeting that went sideways, the dinner comment. It works because the situation is already familiar. What it needs is a clear first beat, a turn, and a last line that lands.",
      },
      {
        heading: "The scene view",
        body: "Every bit Shutap writes can be shown as a scene. The scene view breaks it into beats in order, so you can see the setup, the escalation and the button as separate shots instead of one block of text.",
      },
      {
        heading: "Shooting it",
        body: "Solo creators can play every part by changing a prop or a posture between beats. If you have a second person, hand them the lines marked for the other character. Keep each beat to one idea and cut as soon as the line lands.",
      },
      {
        heading: "Start from something true",
        body: "Skits built on something that really happened read as specific, and specific is what gets shared. Write the real version first. Shutap handles the structure and keeps your details.",
      },
    ],
    related: ["comedy-screenplay-format", "how-to-turn-a-story-into-a-bit", "storytime-script-generator"],
    cta: CTA,
    published: PUBLISHED,
  },
  {
    slug: "comedy-teleprompter",
    kind: "tool",
    title: "Teleprompter for Comedy Videos & Open Mics | Shutap",
    h1: "Teleprompter for comedy",
    description:
      "Every bit Shutap writes runs in a full-screen teleprompter, so you can film to camera or rehearse a set with your eyes up.",
    capsule:
      "Every bit Shutap writes can be run in a full-screen teleprompter. It scrolls the script while you look at the lens, so you can film a TikTok, Reel or Short, or rehearse a set, with your eyes up.",
    blurb: "Run any bit full-screen and read it to camera.",
    sections: [
      {
        heading: "Why use a prompter for comedy",
        body: "Comedy lives on timing, and timing falls apart when you look down to read. A prompter keeps your eyes at the lens and your pace steady, which is what makes a written bit sound like something you are saying.",
      },
      {
        heading: "How it works",
        body: "Write your story and get the bit. Open the teleprompter view and the script runs full-screen. Put your phone or camera where you can see it, start the scroll, and read to the lens.",
      },
      {
        heading: "Rehearsing a set",
        body: "Use the prompter as a rehearsal tool too. Reading a bit out loud, at speed, shows you which words trip you up and where you need a breath. Fix those lines and run it again.",
      },
      {
        heading: "Pair it with the right length",
        body: "A 15 second bit is a few dozen words. A 2 minute bit is a few hundred. Pick the length before you write, so the script fits the video and you are not cutting on the fly.",
      },
    ],
    related: ["how-long-should-a-tiktok-bit-be", "storytime-script-generator", "stand-up-bit-generator"],
    cta: CTA,
    published: PUBLISHED,
  },
  {
    slug: "comedy-screenplay-format",
    kind: "tool",
    title: "Comedy Scene & Screenplay Page Generator | Shutap",
    h1: "Comedy screenplay page generator",
    description:
      "Shutap formats your bit as a screenplay page, with characters and action, ready to shoot, share or hand to someone else.",
    capsule:
      "Shutap can format your bit as a screenplay page, laid out like a script with character names, action and dialogue. Write what happened, get the bit, and take it to a shoot, a rehearsal or a writers' room.",
    blurb: "Your bit as a script page, with characters and action.",
    sections: [
      {
        heading: "What a screenplay page is",
        body: "A screenplay page separates what is said from what is seen. Character names sit above their lines, action is written in plain present tense, and everything reads top to bottom. That layout makes a bit easy to hand to another performer.",
      },
      {
        heading: "From bit to page",
        body: "Write your story and Shutap writes the bit. Switch to the screenplay view and the same material is laid out as a script page. Nothing is rewritten for the format, only arranged.",
      },
      {
        heading: "When it helps",
        body: "Use the page when more than one person is in the video, when you want to mark timing and actions, or when you are pitching a sketch. It is also the easiest version to read aloud at a table read.",
      },
      {
        heading: "Edit before you shoot",
        body: "Treat the page as a draft. Cut what you would not say, add what you would, and keep the lines that already sound like you.",
      },
    ],
    related: ["pov-skit-generator", "stand-up-bit-generator", "how-to-turn-a-story-into-a-bit"],
    cta: CTA,
    published: PUBLISHED,
  },

  // ---- guides ---------------------------------------------------------
  {
    slug: "how-to-turn-a-story-into-a-bit",
    kind: "guide",
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
    related: ["how-to-write-comedy-tags", "how-long-should-a-tiktok-bit-be", "storytime-script-generator"],
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
    related: ["comedy-teleprompter", "how-to-turn-a-story-into-a-bit", "storytime-script-generator"],
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
        heading: "Let Shutap draft tags",
        body: "Every bit Shutap writes includes tags. Use them as a starting list, cross out the ones that sound like anyone could have said them, and write your own in their place.",
      },
    ],
    related: ["how-to-turn-a-story-into-a-bit", "stand-up-bit-generator", "how-long-should-a-tiktok-bit-be"],
    cta: CTA,
    published: PUBLISHED,
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function guidePath(slug: string): string {
  return `/guides/${slug}`;
}
