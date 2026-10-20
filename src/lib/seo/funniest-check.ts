// Publish gate for "The funniest ..." entries. Nobody reviews these pages before
// they go live, so this code is the editor. It runs in two places:
//   1. funniest.ts drops any entry that fails, so it is never routed, linked or
//      put in a sitemap (a failing page 404s instead of publishing).
//   2. scripts/seo/funniest-check.mjs runs it from the command line so the daily
//      agent sees exactly what failed before opening a PR.
//
// No runtime imports here (type-only), so Node can load this file directly.

import type { FunniestEntry } from "./funniest";

const DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const BANNED =
  /\b(safe space|community|therapy|therapist|support|positive|silver lining|reframe|resilience|mindset|anonymous|anonymously|the stream|bit generator|brainstormer|joke cards?)\b/i;

const words = (s: string) => (s.match(/[A-Za-z0-9'’-]+/g) ?? []).length;
const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** Text that states facts about the people (not the invented example lines). */
function factText(e: FunniestEntry): string {
  return [
    e.capsule,
    e.pick.why,
    ...e.runnersUp.map((r) => `${r.role} ${r.why}`),
    ...e.style,
    ...e.techniques.map((t) => t.whatTheyDid),
    e.checkNote ?? "",
  ].join(" ");
}

/** Prose a template could repeat: style, explanations and instructions. */
function proseText(e: FunniestEntry): string {
  return [...e.style, ...e.techniques.flatMap((t) => [t.whatTheyDid, t.whyItWorks, t.tryIt]), ...(e.faq ?? []).map((f) => f.a)].join(" ");
}

/** Specific, checkable details: numbers, years and multi-word proper names. */
function specifics(s: string): Set<string> {
  const out = new Set<string>();
  for (const m of s.match(/\b\d[\d,.]*\b/g) ?? []) out.add(m.replace(/[.,]$/, ""));
  for (const m of s.match(/\b[A-Z][a-z’'.-]+(?:\s+(?:of|the|de|van|von)?\s*[A-Z][a-z’'.-]+)+/g) ?? []) out.add(m);
  return out;
}

function shingles(s: string, n = 5): Set<string> {
  const w = s.toLowerCase().match(/[a-z0-9']+/g) ?? [];
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / Math.max(1, a.size + b.size - inter);
}

/** Entries that came first. A new page has to be different from these, never the other way round. */
function earlier(e: FunniestEntry, all: FunniestEntry[]): FunniestEntry[] {
  return all.filter(
    (o) => o.slug !== e.slug && (o.published < e.published || (o.published === e.published && o.slug < e.slug)),
  );
}

/**
 * Everything wrong with an entry. Empty array = publishable.
 * `all` is the whole series (including `e`); `today` is YYYY-MM-DD.
 */
export function funniestProblems(e: FunniestEntry, all: FunniestEntry[], today?: string): string[] {
  const p: string[] = [];
  const cat = e.category.toLowerCase();

  // --- the quotable answer: one sentence, first thing on the page ---
  const a = (e.answer ?? "").trim();
  if (!a) p.push("missing `answer`: one sentence, e.g. \"The funniest US president is Abraham Lincoln, according to <ranking>, because …\"");
  else {
    if (!/^The funniest /.test(a)) p.push('answer must start with "The funniest "');
    if (!a.toLowerCase().includes(cat)) p.push(`answer must name the category ("${e.category}")`);
    if (!a.includes(e.pick.name)) p.push(`answer must name the pick ("${e.pick.name}")`);
    if (!/\baccording to\b/i.test(a)) p.push('answer must say who says so ("according to …")');
    if (!/\bbecause\b/i.test(a)) p.push('answer must say why ("because …")');
    if (!/[.]$/.test(a)) p.push("answer must end with a period");
    const n = words(a);
    if (n < 18 || n > 60) p.push(`answer is ${n} words (want 18–60)`);
    const stripped = a.replace(/\b(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|Inc|Co|vs|No|U\.S|U\.K|e\.g|i\.e|[A-Z])\./g, "");
    if (/[.!?]\s+[A-Z]/.test(stripped)) p.push("answer must be a single sentence");
  }

  // --- named, dated sources ---
  const src = e.sources ?? [];
  if (src.length < 3) p.push(`need at least 3 sources (got ${src.length})`);
  const domains = new Set(src.map((s) => host(s.url)).filter(Boolean));
  if (domains.size < 3) p.push(`sources must come from at least 3 different sites (got ${domains.size})`);
  for (const s of src) {
    const tag = s.label?.slice(0, 50) || s.url;
    if (!/^https:\/\//.test(s.url ?? "")) p.push(`source url must be https: ${s.url}`);
    if (/shutap\.com/.test(s.url ?? "")) p.push("a source cannot be shutap.com");
    if (!s.publisher?.trim()) p.push(`source has no publisher: ${tag}`);
    if (!s.date && !s.accessed) p.push(`source needs a date (published/updated) or an accessed date: ${tag}`);
    for (const d of [s.date, s.accessed]) {
      if (d && !DATE.test(d)) p.push(`source date "${d}" must be YYYY, YYYY-MM or YYYY-MM-DD: ${tag}`);
      if (d && today && d > today) p.push(`source date "${d}" is in the future: ${tag}`);
    }
  }
  const basis = src.filter((s) => s.kind === "ranking" || s.kind === "profile");
  if (basis.length === 0) p.push('mark at least one source kind "ranking" (a list, poll or book ranking) or "profile" (writing that names them for their humor)');
  for (const s of basis) if (!s.date) p.push(`a ranking/profile source needs its publication date, not just an accessed date: ${s.label}`);
  if (a && basis.length && !basis.some((s) => s.publisher && a.includes(s.publisher))) {
    p.push("answer must name the publisher of at least one ranking/profile source it relies on");
  }
  if (!src.some((s) => s.kind === "ranking") && !/\bno (formal|published|single|agreed)[^.]{0,20}ranking\b/i.test(`${a} ${e.capsule}`)) {
    p.push('no source is a "ranking": the answer or capsule must say plainly that no formal ranking exists');
  }

  // --- FAQ ---
  const faq = e.faq ?? [];
  if (faq.length < 3 || faq.length > 6) p.push(`need 3–6 FAQ entries (got ${faq.length})`);
  for (const f of faq) {
    if (!f.q?.trim().endsWith("?")) p.push(`FAQ question must end with "?": ${f.q}`);
    const n = words(f.a ?? "");
    if (n < 12 || n > 80) p.push(`FAQ answer is ${n} words (want 12–80): ${f.q}`);
  }

  // --- dates ---
  if (!DATE.test(e.published) || e.published.length !== 10) p.push(`published must be YYYY-MM-DD (got ${e.published})`);
  if (e.updated && (e.updated.length !== 10 || !DATE.test(e.updated) || e.updated < e.published)) p.push(`updated must be YYYY-MM-DD and not before published (got ${e.updated})`);

  // --- brand words ---
  const allText = [e.title, e.h1, e.description, a, e.capsule, e.blurb, e.pick.why, ...e.runnersUp.map((r) => r.why), ...e.style,
    ...e.techniques.flatMap((t) => [t.name, t.whatTheyDid, t.whyItWorks, t.example, t.tryIt]), e.checkNote ?? "", ...faq.flatMap((f) => [f.q, f.a])].join("\n");
  const banned = allText.match(BANNED);
  if (banned) p.push(`banned word "${banned[0]}"`);

  // --- different from every page that came before it ---
  const prior = earlier(e, all);
  const priorSpecifics = new Set(prior.flatMap((o) => [...specifics(factText(o))]));
  const fresh = [...specifics(factText(e))].filter((x) => !priorSpecifics.has(x));
  if (fresh.length < 8) p.push(`only ${fresh.length} facts (names, dates, numbers) not already on other pages; need at least 8 new ones`);
  const mine = shingles(proseText(e));
  for (const o of prior) {
    const j = jaccard(mine, shingles(proseText(o)));
    if (j >= 0.1) p.push(`prose overlaps ${Math.round(j * 100)}% with /funniest/${o.slug} (max 10%)`);
    if (o.pick.name.toLowerCase() === e.pick.name.toLowerCase()) p.push(`${e.pick.name} is already the pick on /funniest/${o.slug}`);
  }
  const priorTech = new Set(prior.flatMap((o) => o.techniques.map((t) => t.name.toLowerCase())));
  const priorEx = new Set(prior.flatMap((o) => o.techniques.map((t) => t.example.toLowerCase())));
  for (const t of e.techniques) {
    if (priorTech.has(t.name.toLowerCase())) p.push(`technique name "${t.name}" is already used on another page`);
    if (priorEx.has(t.example.toLowerCase())) p.push(`example line reused from another page: ${t.example.slice(0, 60)}`);
  }

  return p;
}
