// Publish gate for daily articles (src/lib/seo/articles/<slug>.ts).
// Nobody reviews these pages before they go live, so this script is the editor.
//
//   node scripts/seo/article-check.mjs <slug>
//
// Exit 0 = publishable. Any FAIL line = do not publish.
// No dependencies; Node 22+ (type stripping imports the .ts article directly).

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const slug = process.argv[2];
if (!slug) {
  console.error("usage: node scripts/seo/article-check.mjs <slug>");
  process.exit(2);
}

const ART_DIR = "src/lib/seo/articles";
const FUN_DIR = "src/lib/seo/funniest";
const file = `${ART_DIR}/${slug}.ts`;
const fails = [];
const warns = [];
const fail = (m) => fails.push(m);

if (!existsSync(file)) {
  console.error(`FAIL no file at ${file}`);
  process.exit(1);
}

const g = (await import(pathToFileURL(file).href)).default;

// ---------- shape ----------
const req = ["slug", "kind", "title", "h1", "description", "capsule", "blurb", "sections", "related", "cta", "published", "keyword", "faq"];
for (const k of req) if (g?.[k] === undefined || g[k] === "") fail(`missing field: ${k}`);
if (g.slug !== slug) fail(`slug field "${g.slug}" does not match file name "${slug}"`);
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail("slug must be lowercase-hyphenated");
if (g.kind !== "guide") fail(`kind must be "guide" (got "${g.kind}")`);

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
if (g.published !== today && !g.updated) fail(`published must be today (${today}), got ${g.published}`);

const words = (s) => (String(s).match(/[A-Za-z0-9'’-]+/g) ?? []).length;
if (g.title?.length > 65) fail(`title is ${g.title.length} chars (max 65)`);
if (!/\| Shutap$/.test(g.title ?? "")) fail('title must end with "| Shutap"');
if (g.description?.length < 110 || g.description?.length > 165) fail(`description is ${g.description?.length} chars (want 110–165)`);
const capW = words(g.capsule);
if (capW < 35 || capW > 90) fail(`capsule is ${capW} words (want 35–90: a direct answer)`);
if (!Array.isArray(g.sections) || g.sections.length < 5) fail(`need ≥5 sections (got ${g.sections?.length})`);
for (const s of g.sections ?? []) {
  if (!s.heading || !s.body) fail("a section is missing heading or body");
  if (words(s.body) < 45) fail(`section "${s.heading}" is thin (${words(s.body)} words, min 45)`);
}
if (!Array.isArray(g.faq) || g.faq.length < 3) fail(`need ≥3 FAQ entries (got ${g.faq?.length})`);
for (const f of g.faq ?? []) {
  if (!f.q?.trim().endsWith("?")) fail(`FAQ question must end with "?": ${f.q}`);
  const n = words(f.a);
  if (n < 12 || n > 80) fail(`FAQ answer length ${n} words (want 12–80): ${f.q}`);
}
const allText = [g.title, g.h1, g.description, g.capsule, g.blurb, ...(g.sections ?? []).flatMap((s) => [s.heading, s.body]), ...(g.faq ?? []).flatMap((f) => [f.q, f.a])].join("\n");
const total = words(allText);
if (total < 900) fail(`article is ${total} words (min 900)`);

// keyword must appear in title or h1, and in the capsule
const kw = String(g.keyword ?? "").toLowerCase();
const kwCore = kw.split(/\s+/).filter((w) => w.length > 3);
const hasAll = (t) => kwCore.every((w) => t.toLowerCase().includes(w.replace(/s$/, "")));
if (kw && !hasAll(`${g.title} ${g.h1}`)) fail(`target keyword "${g.keyword}" not reflected in title/h1`);
if (kw && !hasAll(g.capsule ?? "")) warns.push(`keyword "${g.keyword}" not fully in capsule`);

// ---------- brand rules ----------
const banned = /\b(safe space|community|therapy|therapist|support|positive|silver lining|reframe|resilience|mindset|anonymous|anonymously|the stream|bit generator|brainstormer|joke cards?|the mirror)\b/i;
const ventNoun = /\b(a|the|your|my|this|that|every)\s+vents?\b|\bvents\b/i;
for (const [i, line] of allText.split("\n").entries()) {
  const m = line.match(banned);
  if (m) fail(`banned word "${m[0]}" in: ${line.slice(0, 90)}`);
  if (ventNoun.test(line)) fail(`"vent" used as a noun in: ${line.slice(0, 90)}`);
}
if (/\b\d+\s+(cards?|jokes? in a set)\b/i.test(allText)) fail("states a card/joke count");

// ---------- facts ----------
const statLike = /(\d+(\.\d+)?\s?%|\bpercent\b|\bstud(y|ies)\b|\bsurvey\b|\bresearch (shows|found)\b|\baccording to\b|\bmillion\b|\bbillion\b)/i;
const hasStats = statLike.test(allText);
const srcs = g.sources ?? [];
if (hasStats && srcs.length === 0) fail("page states figures/studies but lists no sources");
for (const s of srcs) {
  if (!/^https:\/\//.test(s.url ?? "")) fail(`source url must be https: ${s.url}`);
  if (/shutap\.com/.test(s.url)) fail("a source cannot be shutap.com");
}
if (/\bshutap\b[^.]{0,60}\b(users|creators|people|members)\b[^.]{0,30}\b\d/i.test(allText)) fail("looks like an invented Shutap usage metric");

// ---------- links: only to pages that exist ----------
const baseGuides = readFileSync("src/lib/seo/guides.ts", "utf8");
const existingGuideSlugs = new Set([...baseGuides.matchAll(/^\s{4}slug: "([^"]+)"/gm)].map((m) => m[1]));
const baseTitles = [...baseGuides.matchAll(/^\s{4}(?:title|h1): "([^"]+)"/gm)].map((m) => m[1]);
const others = [];
for (const f of readdirSync(ART_DIR)) {
  if (!f.endsWith(".ts") || f === `${slug}.ts`) continue;
  const o = (await import(pathToFileURL(`${ART_DIR}/${f}`).href)).default;
  existingGuideSlugs.add(o.slug);
  others.push(o);
}
const funniestSlugs = new Set(existsSync(FUN_DIR) ? readdirSync(FUN_DIR).filter((f) => f.endsWith(".ts")).map((f) => f.slice(0, -3)) : []);
if (existingGuideSlugs.has(slug)) fail(`slug "${slug}" already exists`);
for (const r of g.related ?? []) if (!existingGuideSlugs.has(r)) fail(`related slug "${r}" is not a live guide (links must point at existing pages)`);
if ((g.related ?? []).length < 2) fail("need ≥2 related guides for internal linking");
const staticPaths = new Set(["/", "/guides", "/funniest", "/pricing", "/about", "/faq", "/how-it-works", "/business", "/ai-joke-generator", "/trust"]);
const href = g.cta?.href ?? "";
const okHref = staticPaths.has(href) || (href.startsWith("/guides/") && existingGuideSlugs.has(href.slice(8))) || (href.startsWith("/funniest/") && funniestSlugs.has(href.slice(10)));
if (!okHref) fail(`cta href "${href}" is not a known live page`);
if (/https?:\/\/(?!\S*\bshutap\.com)/.test(allText)) fail("body text contains a raw external URL (put it in sources)");

// ---------- no duplicate topics (cannibalization) ----------
const toks = (s) => new Set(String(s).toLowerCase().replace(/\| shutap/g, "").match(/[a-z0-9]+/g)?.filter((w) => w.length > 2 && !STOP.has(w)) ?? []);
const STOP = new Set(["the", "and", "for", "how", "what", "with", "your", "you", "are", "why", "does", "that", "this", "from", "into", "can", "get", "use", "make", "guide", "shutap", "ideas", "best"]);
const jac = (a, b) => {
  const A = toks(a), B = toks(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  return inter / Math.max(1, new Set([...A, ...B]).size);
};
const pool = [...baseTitles, ...others.flatMap((o) => [o.title, o.h1, o.keyword ?? ""])];
for (const t of pool) {
  const score = Math.max(jac(g.title, t), jac(g.h1, t), jac(g.keyword, t));
  if (score >= 0.6) fail(`too close to an existing page (${score.toFixed(2)}): "${t}"`);
}
for (const o of others) if (o.keyword && o.keyword.toLowerCase() === kw) fail(`keyword "${kw}" already targeted by ${o.slug}`);

// ---------- report ----------
for (const w of warns) console.log(`WARN ${w}`);
if (fails.length) {
  for (const f of fails) console.log(`FAIL ${f}`);
  console.log(`\n${fails.length} check(s) failed — do not publish.`);
  process.exit(1);
}
console.log(`PASS ${slug}: ${total} words, ${g.sections.length} sections, ${g.faq.length} FAQ, ${srcs.length} sources, keyword "${g.keyword}"`);
