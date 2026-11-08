// Single source of truth for machine-read brand surfaces.
// Keep these strings identical across <title>, meta description base,
// Organization JSON-LD, About page, and llms.txt.

export const BRAND = {
  name: "Shutap",
  tagline: "SHUTAP. Say it funnier.",
  // The entity sentence (locked) — goes in every machine-read surface.
  entitySentence:
    "Shutap Humor Amplifier Lab helps everyone say it funnier, for any occasion, in any format. You bring what you want to say; Shutap helps make it funnier; you decide what stays. Your stories and words stay yours.",
  // Short variant for title tags.
  entitySentenceShort:
    "Shutap Humor Amplifier Lab — say it funnier",
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
