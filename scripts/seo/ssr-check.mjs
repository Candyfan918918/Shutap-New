#!/usr/bin/env node
// Keeps every public page readable by AI crawlers.
//
// ChatGPT's and Claude's crawlers fetch HTML but do not run JavaScript, so a page
// only counts if its words are in the server response.
//
//   node scripts/seo/ssr-check.mjs          static check (no network)
//   node scripts/seo/ssr-check.mjs --live   also fetch live pages as a bot
//
// Static: any route that is client-only (`ssr: false`, or under the
// /_authenticated layout) must be Disallowed in public/robots.txt. A new public
// page that switches off server rendering fails here instead of silently
// vanishing from AI answers.
//
// Live: fetches content pages from the sitemap with the OAI-SearchBot user agent
// and fails if the raw HTML has no <h1> or too little text outside <script>.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname;
const ROUTES = join(ROOT, "src/routes");
const SITE = process.env.SITE_URL || "https://shutap.com";
const MIN_WORDS = Number(process.env.SSR_MIN_WORDS || 150);
const LIVE_PREFIXES = ["/funniest", "/guides", "/how-it-works", "/about", "/faq", "/ai-joke-generator"];
const LIVE_LIMIT = Number(process.env.SSR_LIVE_LIMIT || 80);
const BOT_UA = "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; OAI-SearchBot/1.3; +https://openai.com/searchbot)";

const failures = [];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|jsx?)$/.test(name) ? [p] : [];
  });
}

function disallows() {
  return readFileSync(join(ROOT, "public/robots.txt"), "utf8")
    .split("\n")
    .map((l) => l.match(/^\s*Disallow:\s*(\S+)/i)?.[1])
    .filter(Boolean);
}

function staticCheck() {
  const rules = disallows();
  const blocked = (path) => rules.some((r) => path === r.replace(/\/$/, "") || path.startsWith(r));
  for (const file of walk(ROUTES)) {
    const src = readFileSync(file, "utf8");
    const m = src.match(/createFileRoute\(\s*['"`]([^'"`]+)['"`]/);
    if (!m) continue;
    const raw = m[1];
    const clientOnly = /\bssr:\s*false\b/.test(src) || raw.startsWith("/_authenticated/");
    if (!clientOnly || raw === "/_authenticated") continue;
    // Public URL: drop pathless layout segments (_x) and dynamic params onward.
    const path = "/" + raw.split("/").filter((s) => s && !s.startsWith("_")).join("/");
    const prefix = path.split("/$")[0] || "/";
    if (!blocked(prefix)) {
      failures.push(`${relative(ROOT, file)} renders client-only (${path}) but robots.txt does not Disallow it. ` +
        `Either remove \`ssr: false\` so crawlers see the content, or add "Disallow: ${prefix}" if the page is private.`);
    }
  }
}

async function sitemapUrls(url, seen = new Set()) {
  if (seen.has(url)) return [];
  seen.add(url);
  const xml = await (await fetch(url, { headers: { "user-agent": BOT_UA } })).text();
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((x) => x[1]);
  if (/<sitemapindex/i.test(xml)) {
    const nested = await Promise.all(locs.map((l) => sitemapUrls(l, seen)));
    return nested.flat();
  }
  return locs;
}

function readable(html) {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ");
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]+>/g, "").trim();
  return { h1, words: body.split(/\s+/).filter(Boolean).length };
}

async function liveCheck() {
  const all = await sitemapUrls(`${SITE}/sitemap.xml`);
  const pages = [...new Set(all)]
    .filter((u) => LIVE_PREFIXES.some((p) => new URL(u).pathname.startsWith(p)))
    .slice(0, LIVE_LIMIT);
  if (!pages.length) failures.push(`live: no content pages found in ${SITE}/sitemap.xml`);
  for (const url of pages) {
    try {
      const res = await fetch(url, { headers: { "user-agent": BOT_UA }, redirect: "follow" });
      if (!res.ok) { failures.push(`live: ${url} returned HTTP ${res.status} to a crawler`); continue; }
      const { h1, words } = readable(await res.text());
      if (!h1) failures.push(`live: ${url} has no <h1> in the server HTML (content is likely client-rendered)`);
      else if (words < MIN_WORDS) failures.push(`live: ${url} has only ${words} words in the server HTML (min ${MIN_WORDS})`);
      else console.log(`ok  ${words.toString().padStart(5)} words  ${url}`);
    } catch (e) {
      failures.push(`live: ${url} fetch failed: ${e.message}`);
    }
  }
}

staticCheck();
if (process.argv.includes("--live")) await liveCheck();

if (failures.length) {
  console.error(`\nssr-check: ${failures.length} problem(s)\n- ` + failures.join("\n- "));
  process.exit(1);
}
console.log("ssr-check: all public pages are server-rendered and private client-only routes are disallowed.");
