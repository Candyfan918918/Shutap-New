// Single source of truth for machine-read brand surfaces.
// Keep these strings identical across <title>, meta description base,
// Organization JSON-LD, About page, and llms.txt.

export const BRAND = {
  name: "Shutap",
  tagline: "SHUTAP. Say it funnier.",
  // The entity sentence (locked) — goes in every machine-read surface.
  entitySentence:
    "Shutap is an AI joke generator for creators, comedians and anyone with a story. Paste what happened and Shutap writes three jokes: the take, the clapback and the roast. Download them for TikTok, Reels or the stage, or post the best one to a room. Pseudonymous. Your real name never shows.",
  // Short variant for title tags.
  entitySentenceShort:
    "Shutap — AI joke generator. Paste what happened, get three jokes.",
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
