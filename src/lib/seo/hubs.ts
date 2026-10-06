// 20 starter situation hubs (5 per pillar) at /is-it-normal/$slug.
// Slugs are verbatim-question style and stay fixed (indexed URLs).
// Copy frames each situation as joke material. No advice, no invented stats.

export type PillarSlug = "relationships" | "marriage" | "family" | "career";

export interface SituationHub {
  slug: string;
  pillar: PillarSlug;
  /** Verbatim question — also the H1. */
  question: string;
  /** 40–60 word answer-first paragraph. First ~155 chars double as meta description. */
  answer: string;
  /** People-Also-Ask cluster. 3–5 entries. */
  paa: { q: string; a: string }[];
}

export const HUBS: SituationHub[] = [
  // ── relationships ──
  {
    slug: "is-it-normal-to-feel-lonely-in-a-relationship",
    pillar: "relationships",
    question: "Is it normal to feel lonely in a relationship?",
    answer:
      "Common enough to be a genre. Feeling lonely next to someone is good material: two people on one couch, two phones, one shared streaming password. Shutap writes three jokes about it. The take names what's really going on, the clapback is the line you didn't say, the roast goes at the situation.",
    paa: [
      { q: "What's funny about feeling lonely next to someone?", a: "The gap between the picture and the reality. Same bed, separate group chats. Same dinner, one person narrating a podcast. The contrast does the work." },
      { q: "Will the joke be about my partner?", a: "No. Jokes go at the situation, never at a real person someone could identify. Names are removed before anything is saved." },
      { q: "Is Shutap relationship advice?", a: "No. Shutap writes jokes. It's not advice and not therapy." },
    ],
  },
  {
    slug: "am-i-overreacting-or-is-this-a-red-flag",
    pillar: "relationships",
    question: "Am I overreacting, or is this a red flag?",
    answer:
      "Shutap won't rule on it. It will write jokes about it. The overreacting-or-red-flag loop is great material: the screenshot sent to four friends, the close reading of one emoji, the timeline built from a single \"k.\" Paste what happened and get three jokes: the take, the clapback and the roast.",
    paa: [
      { q: "Where's the joke in a red flag?", a: "Usually in the gap between how small the moment was and how much investigation it caused." },
      { q: "What should I paste in?", a: "What happened, in order, with the real details: what was said, where, what you did next. Specifics make sharper jokes than summaries." },
      { q: "Can Shutap tell me if it's a red flag?", a: "No. Shutap writes jokes. It doesn't judge relationships. It's not advice and not therapy." },
    ],
  },
  {
    slug: "why-do-i-feel-guilty-after-going-no-contact",
    pillar: "relationships",
    question: "Why do I feel guilty after going no-contact?",
    answer:
      "Plenty of people do. Shutap won't explain the guilt, but it can write jokes about the situation around it: the blocked number that still finds a way, the relative who becomes a messenger, the holiday you suddenly have free. Paste what happened and Shutap writes three jokes, aimed at the situation, never at you.",
    paa: [
      { q: "Can you joke about something this heavy?", a: "Comedians do it all the time. The jokes go at the logistics and the absurd parts, not at the hurt. You decide what you paste and what you keep." },
      { q: "Will the other person be identifiable?", a: "No. Names and places are removed before anything is saved, and jokes never target a real person someone could identify." },
      { q: "Is this a substitute for real help?", a: "No. Shutap writes jokes. It is not therapy. If you're in crisis, call or text 988 in the US or visit findahelpline.com." },
    ],
  },
  {
    slug: "is-it-bad-that-i-went-through-his-phone",
    pillar: "relationships",
    question: "Is it bad that I went through his phone?",
    answer:
      "Shutap won't grade you. It will write jokes about it. Phone-checking is classic material: the passcode guess, the lock-screen glance at 2am, the moment you realize you're running a detective agency from your own bed. Paste what happened and get three jokes: the take, the clapback and the roast.",
    paa: [
      { q: "What angles does Shutap take on snooping?", a: "The take names what the snooping was really about. The clapback is the line you wish you'd had ready. The roast goes at the situation: the setup, the timing, the evidence." },
      { q: "Will the joke expose him?", a: "No. Names are removed before anything is saved, and jokes never target a real person someone could identify." },
      { q: "Can I keep it private?", a: "Yes. Nothing is public unless you post it to a room." },
    ],
  },
  {
    slug: "how-do-you-know-when-youve-outgrown-someone",
    pillar: "relationships",
    question: "How do you know when you've outgrown someone?",
    answer:
      "Shutap can't tell you that, but outgrowing someone is good material: the same three stories at every dinner, the inside joke that expired years ago, the catch-up that feels like a rerun. Paste what happened and Shutap writes three jokes about the situation: the take, the clapback and the roast.",
    paa: [
      { q: "Why is outgrowing someone funny?", a: "Because nothing dramatic happens. The comedy is in the repeats: the same order, the same story, the same plans that never get made." },
      { q: "Can I use the jokes in a set or a video?", a: "Yes. Download them for TikTok, Reels or the stage, or post the best one to a room." },
      { q: "Do I need to sign in?", a: "No. Guests see one joke. Sign in free to see all three." },
    ],
  },
  // ── marriage ──
  {
    slug: "is-it-normal-to-feel-invisible-in-my-marriage",
    pillar: "marriage",
    question: "Is it normal to feel invisible in my marriage?",
    answer:
      "Common enough to be a genre. Feeling invisible at home is good material: the haircut nobody noticed, the story you told twice to someone looking at a phone, the shared calendar that knows you better than anyone. Paste what happened and Shutap writes three jokes about the situation.",
    paa: [
      { q: "What's funny about feeling invisible?", a: "The evidence. Being invisible leaves a trail of small, specific moments, and specific moments are what jokes are made of." },
      { q: "Will the joke make fun of my spouse?", a: "No. Jokes go at the situation, never at a real person someone could identify." },
      { q: "Is this marriage counseling?", a: "No. Shutap writes jokes. It's not advice and not therapy." },
    ],
  },
  {
    slug: "should-i-stay-married-for-the-kids",
    pillar: "marriage",
    question: "Should I stay married for the kids?",
    answer:
      "That's not a call Shutap makes. Shutap writes jokes. What it can do is take the situation around the question, the polite handoffs, the united front at the school play, the arguments held in whispers, and write three jokes about it: the take, the clapback and the roast.",
    paa: [
      { q: "Can I joke about this without it being about my kids?", a: "Yes. The jokes go at the situation, not at anyone in it. Names are removed before anything is saved." },
      { q: "What should I paste in?", a: "One specific moment, told in order: what happened, who said what, what you did next. One good scene beats a summary of years." },
      { q: "Where do I get help with the decision?", a: "From a licensed professional. Shutap writes jokes. It's not advice and not therapy." },
    ],
  },
  {
    slug: "why-dont-i-feel-anything-for-my-husband-anymore",
    pillar: "marriage",
    question: "Why don't I feel anything for my husband anymore?",
    answer:
      "Shutap won't diagnose it. It will write jokes about the situation. Flat marriages are full of material: the date night spent discussing gutters, the goodnight that sounds like a meeting wrap-up, two people choosing a show so nobody has to choose a topic. Paste what happened and get three jokes.",
    paa: [
      { q: "Can a joke about this be kind?", a: "Yes. The jokes go at the situation, not at you or him. The roast lands on the routine, not the person." },
      { q: "Who sees what I paste?", a: "Nobody, unless you post a joke to a room. Names and places are removed before anything is saved." },
      { q: "Is Shutap a replacement for counseling?", a: "No. Shutap writes jokes. It's not advice and not therapy." },
    ],
  },
  {
    slug: "is-it-normal-to-not-want-sex-with-my-husband",
    pillar: "marriage",
    question: "Is it normal to not want sex with my husband?",
    answer:
      "Plenty of people say so. Shutap won't analyze it, but the situation around it is good material: the strategic early bedtime, the sudden urge to fold laundry at 10pm, the mental to-do list that never closes. Paste what happened and Shutap writes three jokes about the situation.",
    paa: [
      { q: "What angle do the jokes take?", a: "The situation: schedules, excuses, the logistics of a shared bed. Not your husband, and not you." },
      { q: "Is it private?", a: "Yes. You use a pseudonym, names are removed before anything is saved, and nothing is public unless you post it." },
      { q: "Is this sex or relationship advice?", a: "No. Shutap writes jokes. It's not advice and not therapy." },
    ],
  },
  {
    slug: "how-do-people-know-when-their-marriage-is-over",
    pillar: "marriage",
    question: "How do people know when their marriage is over?",
    answer:
      "Shutap can't answer that. It writes jokes. But the stretch where people start asking is full of material: separate streaming profiles, the divorce lawyer ads your feed suddenly serves you, the fight about the fight. Paste what happened and Shutap writes three jokes about it.",
    paa: [
      { q: "Can I joke about a divorce?", a: "Yes. Divorce comedy is a whole tradition. The jokes go at the situation, never at a real person someone could identify." },
      { q: "Can I use the jokes on stage?", a: "Yes. Download them for TikTok, Reels or the stage, or post the best one to a room." },
      { q: "Does Shutap give marriage advice?", a: "No. Shutap writes jokes. It's not advice and not therapy." },
    ],
  },
  // ── family ──
  {
    slug: "is-it-normal-to-not-like-my-own-mother",
    pillar: "family",
    question: "Is it normal to not like my own mother?",
    answer:
      "Plenty of people feel this and don't say it. Shutap writes jokes about the situation, not a verdict: the compliment with a hook in it, the phone call that runs on a script, the holiday where you age backwards twenty years. Paste what happened and get three jokes: the take, the clapback and the roast.",
    paa: [
      { q: "Will the joke be about my mom?", a: "It's about the situation, never a real person someone could identify. Names are removed before anything is saved." },
      { q: "What's the clapback?", a: "The line you wish you'd said in the moment, written to leave no good reply." },
      { q: "Is this family advice?", a: "No. Shutap writes jokes. It's not advice and not therapy." },
    ],
  },
  {
    slug: "how-do-i-set-boundaries-with-my-parents-without-the-guilt",
    pillar: "family",
    question: "How do I set boundaries with my parents without the guilt?",
    answer:
      "Shutap doesn't coach boundaries. It writes jokes about the situation around them: the unannounced visit, the \"just checking in\" call that is not just checking in, the group chat that turned into a tribunal. Paste what happened and Shutap writes three jokes about it.",
    paa: [
      { q: "What makes a boundary fight funny?", a: "The negotiation. Two sides with very different ideas of what \"Sunday lunch\" means, both sure they're being reasonable." },
      { q: "Can I keep the jokes private?", a: "Yes. Nothing is public unless you post it to a room." },
      { q: "Is this advice on setting boundaries?", a: "No. Shutap writes jokes. It's not advice and not therapy." },
    ],
  },
  {
    slug: "am-i-wrong-for-not-inviting-a-family-member-to-my-wedding",
    pillar: "family",
    question: "Am I wrong for not inviting a family member to my wedding?",
    answer:
      "Shutap doesn't rule on guest lists. It writes jokes about them. Wedding family politics is premium material: the seating chart drafted like a peace treaty, the RSVP with a plus-one nobody invited, the relative running a back channel. Paste what happened and get three jokes.",
    paa: [
      { q: "Can I use the jokes in a toast?", a: "You can download them and use them anywhere: TikTok, Reels, the stage, a toast. Keep them at the situation, not at a guest anyone could identify." },
      { q: "Will names show up?", a: "No. Names and places are removed before anything is saved." },
      { q: "Do I need an account?", a: "No. Guests see one joke. Sign in free to see all three." },
    ],
  },
  {
    slug: "is-it-okay-to-go-low-contact-with-toxic-parents",
    pillar: "family",
    question: "Is it okay to go low-contact with toxic parents?",
    answer:
      "Shutap doesn't weigh in on that. It writes jokes. Low-contact life has its own material: the carefully timed holiday visit, the text you drafted eleven times, the sibling who becomes the news service. Paste what happened and Shutap writes three jokes, aimed at the situation, never at you.",
    paa: [
      { q: "Is it okay to joke about a hard family situation?", a: "Comedians have built careers on it. The jokes go at the situation and the absurd details, not at the hurt." },
      { q: "Will my parents be identifiable?", a: "No. Names and places are removed before anything is saved, and jokes never target a real person someone could identify." },
      { q: "Is Shutap a crisis service?", a: "No. Shutap writes jokes. It is not therapy. If you're in crisis, call or text 988 in the US or visit findahelpline.com." },
    ],
  },
  {
    slug: "why-does-my-family-make-me-feel-small",
    pillar: "family",
    question: "Why does my family make me feel small?",
    answer:
      "Shutap won't analyze your family. It will write jokes about the situation. Family gatherings are built for it: the role you were cast in at twelve, the old story everyone retells, the kids' table you somehow still get seated at. Paste what happened and get three jokes: the take, the clapback and the roast.",
    paa: [
      { q: "What's the take?", a: "The take names what was really going on underneath, in words the situation didn't give you." },
      { q: "Will the jokes be about me?", a: "No. The jokes go at the situation, never at the person telling it." },
      { q: "Can I post one?", a: "Yes. Post the best one to the family room, or download it for TikTok, Reels or the stage." },
    ],
  },
  // ── career ──
  {
    slug: "is-it-normal-to-cry-at-work",
    pillar: "career",
    question: "Is it normal to cry at work?",
    answer:
      "Plenty of people have. Shutap writes jokes about the situation around it: the bathroom stall that doubles as an office, the camera-off meeting, the coworker who asks \"all good?\" and keeps walking. Paste what happened and Shutap writes three jokes, aimed at the situation, never at you.",
    paa: [
      { q: "Can crying at work be funny?", a: "Later, usually. The logistics are the material: where you went, what you pretended to be doing, who almost walked in." },
      { q: "Can my employer see this?", a: "No. You post under a pseudonym, and names, company names and places are removed before anything is saved." },
      { q: "Is Shutap mental health help?", a: "No. Shutap writes jokes. It is not therapy. If you're in crisis, call or text 988 in the US or visit findahelpline.com." },
    ],
  },
  {
    slug: "should-i-quit-a-job-everyone-thinks-is-great",
    pillar: "career",
    question: "Should I quit a job everyone thinks is great?",
    answer:
      "Shutap won't make that call. It writes jokes. \"Great job, why would you leave\" is good material: free snacks as compensation, mandatory fun, relatives who think your job title is a personality. Paste what happened and get three jokes: the take, the clapback and the roast.",
    paa: [
      { q: "What's the clapback here?", a: "The line you wish you'd said to the next person who calls it a dream job, written to leave no good reply." },
      { q: "Can I use the jokes on TikTok?", a: "Yes. Download them for TikTok, Reels or the stage, or post the best one to the work room." },
      { q: "Is this career advice?", a: "No. Shutap writes jokes. It's not advice." },
    ],
  },
  {
    slug: "how-do-i-know-if-im-underpaid",
    pillar: "career",
    question: "How do I know if I'm underpaid?",
    answer:
      "Shutap doesn't benchmark salaries. It writes jokes. Pay is reliable material: the raise that rounds to zero, the offer paid in \"exposure,\" the pizza party in place of a bonus, the new hire who out-earns you on day one. Paste what happened and Shutap writes three jokes about it.",
    paa: [
      { q: "Will Shutap tell me what I should earn?", a: "No. It writes jokes, not salary advice." },
      { q: "Can I name my company?", a: "You can type it, but names, company names and places are removed before anything is saved. The jokes go at the situation, not a company anyone could identify." },
      { q: "Do I need to sign in?", a: "No. Guests see one joke. Sign in free to see all three." },
    ],
  },
  {
    slug: "why-do-i-feel-guilty-taking-time-off",
    pillar: "career",
    question: "Why do I feel guilty taking time off?",
    answer:
      "Shutap won't explain the guilt, but it can write jokes about it. Time off is full of material: the out-of-office you edited four times, checking email from a beach chair, the \"quick question\" that arrives the moment you land. Paste what happened and get three jokes.",
    paa: [
      { q: "What does the roast go after?", a: "The situation: the inbox, the meeting invite, a culture that treats a vacation like a confession." },
      { q: "Can I post it?", a: "Yes. Post the best one to the work room, or download it for TikTok, Reels or the stage." },
      { q: "Is this advice?", a: "No. Shutap writes jokes. It's not advice and not therapy." },
    ],
  },
  {
    slug: "how-do-you-know-when-to-quit-without-another-job-lined-up",
    pillar: "career",
    question: "How do you know when to quit without another job lined up?",
    answer:
      "Shutap can't tell you that. It writes jokes. Quitting without a plan is good material: the resignation drafted in your notes app, the exit interview, relatives asking \"so what's next\" at every meal. Paste what happened and Shutap writes three jokes: the take, the clapback and the roast.",
    paa: [
      { q: "Can I turn my resignation into content?", a: "Yes. Download the jokes for TikTok, Reels or the stage, or post the best one to a room." },
      { q: "Will my old boss be identifiable?", a: "No. Names, company names and places are removed before anything is saved, and jokes never target a real person someone could identify." },
      { q: "Is this career advice?", a: "No. Shutap writes jokes. It's not advice." },
    ],
  },
];

export const HUBS_BY_PILLAR: Record<PillarSlug, SituationHub[]> = {
  relationships: HUBS.filter((h) => h.pillar === "relationships"),
  marriage: HUBS.filter((h) => h.pillar === "marriage"),
  family: HUBS.filter((h) => h.pillar === "family"),
  career: HUBS.filter((h) => h.pillar === "career"),
};

export function getHub(slug: string): SituationHub | undefined {
  return HUBS.find((h) => h.slug === slug);
}
