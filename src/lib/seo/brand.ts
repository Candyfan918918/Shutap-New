// Single source of truth for machine-read brand surfaces.
// Keep these strings identical across <title>, meta description base,
// Organization JSON-LD, About page, and llms.txt.

export const BRAND = {
  name: "Shutap",
  tagline: "SHUTAP. Say it funnier.",
  // The entity sentence (locked) — goes in every machine-read surface.
  entitySentence:
    "Shutap is an AI bit generator for content creators and comedians. Paste something that happened and Shutap writes it into a bit — hook, setup, tags and a button — then runs it in the teleprompter, lays it out as a scene, or formats it as a screenplay page. Film it for TikTok, Reels or YouTube Shorts, take it to the stage, or post the best one to a room. Pseudonymous. Your real name never shows.",
  // Short variant for title tags.
  entitySentenceShort:
    "Shutap — AI bit generator. Paste what happened, get the bit.",
} as const;

export const PILLARS = [
  {
    slug: "relationships",
    title: "Relationships",
    blurb:
      "Dating, situationships, breakups and the texts you shouldn't have sent.",
  },
  {
    slug: "marriage",
    title: "Marriage",
    blurb: "The long haul: chore wars, roommate energy and the same fight on repeat.",
  },
  {
    slug: "family",
    title: "Family",
    blurb: "Parents, siblings, in-laws and the comment at dinner.",
  },
  {
    slug: "career",
    title: "Career",
    blurb: "Meetings, managers, pay and the job you're supposed to be grateful for.",
  },
] as const;
