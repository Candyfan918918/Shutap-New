// Public-story SEO helpers: gate predicate, query-shaped title,
// JSON-LD builder. Shared by the story route and the sitemap child.
import { SITE_URL } from "@/lib/site";

export type JsonValue = string | number | boolean | null | { [k: string]: JsonValue } | JsonValue[];

export type PillarSlug = "relationships" | "marriage" | "family" | "career";

export interface StoryRow {
  id: string;
  slug: string | null;
  pillar: PillarSlug;
  clean_text: string;
  title: string | null;
  initial_scan: number | null;
  scan_band: string | null;
  scan_reasoning: JsonValue | null;
  is_public: boolean;
  is_seed: boolean;
  crisis_flag: boolean;
  deleted_at: string | null;
  room_id: string | null;
  created_at: string;
  updated_at: string;
  kind?: string | null;
}

export interface StoryGateInput {
  is_public: boolean;
  is_seed: boolean;
  crisis_flag: boolean;
  deleted_at: string | null;
}

/** A row is publicly renderable ONLY when the gate passes. */
export function isStoryRenderable(s: StoryGateInput): boolean {
  if (!s.is_public) return false;
  if (s.crisis_flag) return false;
  if (s.deleted_at) return false;
  return true;
}

/** Real (non-seed) public, non-crisis, non-deleted stories are indexable. */
export function isStoryIndexable(s: StoryGateInput): boolean {
  if (!isStoryRenderable(s)) return false;
  return s.is_seed === false;
}

const STOP = new Set([
  "the","a","an","and","or","but","so","of","to","in","on","at","for","with","from","by",
  "is","am","are","was","were","be","been","being","i","me","my","mine","you","your",
  "he","she","it","we","us","they","them","that","this","these","those","as","if",
]);

/** Slug helper mirroring the DB trigger — used for outbound links. */
export function slugify(text: string, idSuffix?: string): string {
  const base = (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  const cleaned = base || "story";
  if (!idSuffix) return cleaned;
  return `${cleaned}-${idSuffix.replace(/-/g, "").slice(0, 6)}`;
}

/**
 * Query-shaped title. Frames the story as the search query someone in the
 * same spot would type. Keeps it short, lowercase, human.
 */
export function storyQueryTitle(row: Pick<StoryRow, "clean_text" | "pillar" | "title">): string {
  const seed = (row.title || row.clean_text || "").replace(/\s+/g, " ").trim();
  const words = seed.toLowerCase().split(/\s+/).filter(Boolean);
  // Keep the first ~14 content words; drop trailing punctuation.
  const kept: string[] = [];
  for (const w of words) {
    if (kept.length >= 14) break;
    const clean = w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
    if (!clean) continue;
    if (kept.length === 0 && STOP.has(clean)) continue;
    kept.push(clean);
  }
  const q = kept.join(" ") || row.pillar;
  return `is it normal — ${q}?`;
}

export function storyDescription(clean_text: string): string {
  const t = (clean_text || "").replace(/\s+/g, " ").trim();
  if (t.length <= 155) return t;
  return t.slice(0, 152).replace(/[,;:.\-]+$/, "") + "…";
}

export function storyUrl(pillar: PillarSlug, slug: string): string {
  return `${SITE_URL}/story/${pillar}/${slug}`;
}

/**
 * DiscussionForumPosting JSON-LD. Chosen over QAPage because Shutap
 * stories are first-person posts with likes and comments, not
 * question/answer pairs with a defined accepted answer.
 */
export function buildStoryJsonLd(args: {
  url: string;
  headline: string;
  text: string;
  datePublished: string;
  dateModified: string;
  relates: number;
  band: string | null;
  score: number | null;
}) {
  const interactions: Array<Record<string, unknown>> = [
    {
      "@type": "InteractionCounter",
      interactionType: { "@type": "LikeAction" },
      userInteractionCount: Math.max(0, args.relates),
    },
  ];
  const additional: Array<Record<string, unknown>> = [];
  if (typeof args.score === "number") {
    additional.push({
      "@type": "PropertyValue",
      name: "shutap_score",
      value: args.score,
    });
  }
  if (args.band) {
    additional.push({
      "@type": "PropertyValue",
      name: "shutap_band",
      value: args.band,
    });
  }
  return {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    "@id": args.url,
    url: args.url,
    headline: args.headline,
    articleBody: args.text,
    datePublished: args.datePublished,
    dateModified: args.dateModified,
    author: { "@type": "Person", name: "pseudonymous" },
    publisher: { "@type": "Organization", name: "Shutap", url: SITE_URL },
    interactionStatistic: interactions,
    ...(additional.length ? { additionalProperty: additional } : {}),
  };
}
