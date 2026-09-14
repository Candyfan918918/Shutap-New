// Single source of truth for machine-read brand surfaces.
// Keep these strings identical across <title>, meta description base,
// Organization JSON-LD, About page, and llms.txt.

export const BRAND = {
  name: "Shutap",
  tagline: "SHUTAP. Joke about it.",
  // The entity sentence (locked) — goes in every machine-read surface.
  entitySentence:
    "life's a bitch, so make fun of it. type what happened, draw three angles, flip one and see what it does with it. pseudonymous — your real name never shows.",
  // Short variant for title tags.
  entitySentenceShort:
    "Shutap — joke about it. type what happened, draw three angles, flip one.",
} as const;

export const PILLARS = [
  {
    slug: "relationships",
    title: "Relationships",
    blurb:
      "dating, partners, situationships, breakups, the gray area in between.",
  },
  {
    slug: "marriage",
    title: "Marriage",
    blurb: "the long-haul stuff: roommate energy, resentment, repair, leaving, staying.",
  },
  {
    slug: "family",
    title: "Family",
    blurb: "parents, siblings, in-laws, the dinner comment, the guilt.",
  },
  {
    slug: "career",
    title: "Career",
    blurb: "work, money, bosses, burnout, the job everyone tells you to be grateful for.",
  },
] as const;
