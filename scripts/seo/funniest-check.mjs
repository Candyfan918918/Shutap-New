// Publish gate for "The funniest ..." entries (src/lib/seo/funniest/<slug>.ts).
// Same rules the site applies at runtime (src/lib/seo/funniest-check.ts): an
// entry that fails here is dropped from the site and never published.
//
//   node scripts/seo/funniest-check.mjs <slug>    check one entry
//   node scripts/seo/funniest-check.mjs --all     check every entry
//
// Exit 0 = publishable. Any FAIL line = do not publish.
// No dependencies; Node 22+ (type stripping imports the .ts files directly).

import { readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";

const arg = process.argv[2];
if (!arg) {
  console.error("usage: node scripts/seo/funniest-check.mjs <slug> | --all");
  process.exit(2);
}

const DIR = "src/lib/seo/funniest";
const { funniestProblems } = await import(pathToFileURL("src/lib/seo/funniest-check.ts").href);

const all = [];
for (const f of readdirSync(DIR).filter((f) => f.endsWith(".ts"))) {
  const e = (await import(pathToFileURL(`${DIR}/${f}`).href)).default;
  if (e?.slug !== f.slice(0, -3)) console.log(`FAIL ${f}: slug field "${e?.slug}" does not match the file name`);
  all.push(e);
}
all.sort((a, b) => a.published.localeCompare(b.published) || a.slug.localeCompare(b.slug));

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
const targets = arg === "--all" ? all : all.filter((e) => e.slug === arg);
if (!targets.length) {
  console.error(`FAIL no entry at ${DIR}/${arg}.ts`);
  process.exit(1);
}

let failed = 0;
for (const e of targets) {
  const problems = funniestProblems(e, all, today);
  if (problems.length) {
    failed++;
    for (const p of problems) console.log(`FAIL ${e.slug}: ${p}`);
  } else {
    console.log(`PASS ${e.slug}: ${e.sources.length} sources, ${e.faq.length} FAQ — "${e.answer.slice(0, 80)}…"`);
  }
}
if (failed) {
  console.log(`\n${failed} entr${failed === 1 ? "y" : "ies"} failed — not publishable (the site drops failing entries).`);
  process.exit(1);
}
