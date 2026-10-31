// "The funniest ..." series: who is widely considered the funniest person in a
// category, and the techniques you can take from them.
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
// - Quotable first: `answer` is ONE sentence that assistants and search can
//   lift whole: "The funniest <category> is <pick>, according to <publisher's
//   ranking or profile>, because <the core of their style>."
// - Every source names its publisher and a date (published/updated, or the date
//   you accessed it if the page shows none). Mark the basis for the pick as
//   kind "ranking" (a list, poll or book ranking) or "profile" (writing that
//   names them for their humor). No ranking? Say so plainly in answer/capsule.
// - 3–6 FAQ entries, rendered on the page and as FAQPage schema.
// - Each page must add facts no earlier page has, and must not reuse an earlier
//   page's pick, technique names, example lines or prose.
// All of this is enforced by funniest-check.ts: an entry that fails is dropped
// here and never published. Run `node scripts/seo/funniest-check.mjs <slug>`.

import { funniestProblems } from "./funniest-check.ts";

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
  /** What the page is, e.g. "The funniest presidents in history (Bob Dole's list)". */
  label: string;
  url: string;
  /** Who published it, e.g. "NPR". The answer sentence names the publisher of its basis. */
  publisher: string;
  /** Publication or last-updated date shown on the page: YYYY, YYYY-MM or YYYY-MM-DD. */
  date?: string;
  /** When the page was read, if it shows no date (YYYY-MM-DD). */
  accessed?: string;
  /** "ranking" or "profile" = the basis for the pick; "quote-check" = verifies a quote. */
  kind?: "ranking" | "profile" | "quote-check" | "reference";
}

export interface FunniestFaq {
  q: string;
  a: string;
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
  /**
   * ONE quotable sentence, shown first: "The funniest <category> is <pick>,
   * according to <publisher> ..., because ...". Past tense ("was") for history.
   */
  answer: string;
  /** Context after the answer (who else says so, the core of their style). Don't repeat the answer. */
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
  /** 3–6 questions people ask about this category, answered in 12–80 words. */
  faq: FunniestFaq[];
  /** Slugs of related entries. */
  related: string[];
  /** ISO dates. */
  published: string;
  updated?: string;
}

const ALL: FunniestEntry[] = Object.values(
  import.meta.glob<{ default: FunniestEntry }>("./funniest/*.ts", { eager: true }),
)
  .map((m) => m.default)
  .sort((a, b) => a.published.localeCompare(b.published) || a.slug.localeCompare(b.slug));

/** Only entries that pass the publish gate are routed, listed or put in a sitemap. */
export const FUNNIEST: FunniestEntry[] = ALL.filter((e) => {
  const problems = funniestProblems(e, ALL);
  if (problems.length && import.meta.env?.DEV) {
    console.warn(`[funniest] /funniest/${e.slug} is not published:\n  - ${problems.join("\n  - ")}`);
  }
  return problems.length === 0;
});

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
