// "The funniest ..." series: who is widely considered the funniest person in a
// category, and the techniques creators and comedians can take from them.
//
// One entry per file in ./funniest/<slug>.ts (default export: FunniestEntry).
// The daily agent adds one file per pull request, so PRs never conflict.
//
// Rules for every entry:
// - "Funniest" is opinion: name who is widely considered funniest and cite who
//   says so. Never declare a winner on Shutap's own authority.
// - Quotes: short, verified, attributed, with a source in `sources`. If a famous
//   line can't be traced, leave it out or say it's disputed.
// - Techniques are described in our own words. Example lines are originals
//   written by Shutap about everyday situations, never jokes about the person.
// - No card counts, no wellness vocabulary, no claims the product can't back.

export interface FunniestPerson {
  name: string;
  /** Short identifier shown under the name, e.g. "16th US president, 1861–1865". */
  role: string;
  /** Why they're the pick, one sentence. */
  why: string;
}

export interface FunniestTechnique {
  /** Technique name, e.g. "The reversed concession". */
  name: string;
  /** What they did, in our words. May include one short, sourced quote. */
  whatTheyDid: string;
  /** Why it works on an audience. */
  whyItWorks: string;
  /** An original line written by Shutap that uses the technique on an everyday situation. */
  example: string;
  /** One instruction for using it in a video or set. */
  tryIt: string;
}

export interface FunniestSource {
  label: string;
  url: string;
}

/** Shelf on the /funniest hub, used for filtering. */
export type FunniestField =
  | "politics"
  | "business"
  | "screen-and-stage"
  | "sports"
  | "science"
  | "writers-and-thinkers"
  | "other";

export const FUNNIEST_FIELDS: { id: FunniestField; label: string }[] = [
  { id: "politics", label: "Politics & public life" },
  { id: "business", label: "Business" },
  { id: "screen-and-stage", label: "Screen, stage & music" },
  { id: "sports", label: "Sports" },
  { id: "science", label: "Science & space" },
  { id: "writers-and-thinkers", label: "Writers & thinkers" },
  { id: "other", label: "Other" },
];

export interface FunniestEntry {
  slug: string;
  /** Category as people search it, e.g. "US president". */
  category: string;
  /**
   * Hub shelf. Pick the closest: politics (presidents, prime ministers, judges,
   * first ladies), business (CEOs, founders, billionaires), screen-and-stage
   * (actors, musicians, chefs, anchors), sports, science (incl. astronauts),
   * writers-and-thinkers (authors, poets, philosophers, monks, court wits).
   */
  field?: FunniestField;
  /** <title>. Keep under ~60 characters. */
  title: string;
  h1: string;
  description: string;
  /** The direct answer engines quote: who, who says so, and the core of their style. */
  capsule: string;
  /** Short line for the hub. */
  blurb: string;
  pick: FunniestPerson;
  runnersUp: FunniestPerson[];
  /** Paragraphs on what made them funny. */
  style: string[];
  techniques: FunniestTechnique[];
  /** Optional note: disputed quotes, myths, caveats. */
  checkNote?: string;
  sources: FunniestSource[];
  /** Slugs of related entries. */
  related: string[];
  /** ISO dates. */
  published: string;
  updated?: string;
}

export const FUNNIEST: FunniestEntry[] = Object.values(
  import.meta.glob<{ default: FunniestEntry }>("./funniest/*.ts", { eager: true }),
)
  .map((m) => m.default)
  .sort((a, b) => a.published.localeCompare(b.published) || a.slug.localeCompare(b.slug));

export function funniestField(e: FunniestEntry): FunniestField {
  return e.field ?? "other";
}

export function getFunniest(slug: string): FunniestEntry | undefined {
  return FUNNIEST.find((e) => e.slug === slug);
}

export function funniestPath(slug: string): string {
  return `/funniest/${slug}`;
}

export const FUNNIEST_HUB = "/funniest";
