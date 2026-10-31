// Single source of truth for machine-read brand surfaces.
// Keep these strings identical across <title>, meta description base,
// Organization JSON-LD, About page, and llms.txt.

export const BRAND = {
  name: "Shutap",
  tagline: "SHUTAP. Say it funnier.",
  // The entity sentence (locked) — goes in every machine-read surface.
  entitySentence:
    "Shutap is the humor amplifier. Type what happened and Shutap amplifies it into a bit in your voice — hook, setup, tags and a button — with a 5-second video, a caption and hashtags, then runs it as stand-up, lays it out as a skit, or formats it as a one-page sketch. Film it for TikTok, Reels or YouTube Shorts, take it to the stage, or bring it to a toast, a talk or a meeting. Shutap amplifies your humor; it never replaces it. Your stories and jokes stay yours.",
  // Short variant for title tags.
  entitySentenceShort:
    "Shutap — the humor amplifier. Type what happened. Say it funnier.",
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
