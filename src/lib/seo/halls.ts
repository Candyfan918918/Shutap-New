// Legacy URLs at /halls/$hall/$region/$window. These pages now render a
// short noindex page pointing to rooms and the joke generator. Slugs stay
// so indexed URLs keep resolving.

export const HALLS = {
  "most-related": {
    title: "Most liked",
    blurb: "The jokes people liked most now live in rooms.",
  },
  "longest-thread": {
    title: "Most talked about",
    blurb: "The jokes people commented on most now live in rooms.",
  },
  "best-outcomes": {
    title: "Most saved",
    blurb: "The jokes people saved most now live in rooms.",
  },
} as const;

export type HallSlug = keyof typeof HALLS;

export const REGIONS = ["global", "us", "uk", "eu", "ca", "au"] as const;
export type Region = (typeof REGIONS)[number];

export const WINDOWS = ["7d", "30d", "90d", "all-time"] as const;
export type Window = (typeof WINDOWS)[number];

export const MIN_HALL_ENTRIES = 20;

export interface HallEntry {
  id: string;
  title: string;
  href: string;
  /** Short metric label, e.g. "likes". */
  metric: string;
}

export interface HallView {
  hall: HallSlug;
  region: Region;
  window: Window;
  entries: HallEntry[];
  updatedAt: string;
}

// Intentionally empty. Routes render the short page and emit noindex.
export function getHallView(
  hall: HallSlug,
  region: Region,
  window: Window,
): HallView | undefined {
  void hall;
  void region;
  void window;
  return undefined;
}

export function isValidHall(s: string): s is HallSlug {
  return s in HALLS;
}
export function isValidRegion(s: string): s is Region {
  return (REGIONS as readonly string[]).includes(s);
}
export function isValidWindow(s: string): s is Window {
  return (WINDOWS as readonly string[]).includes(s);
}
