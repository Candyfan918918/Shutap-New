// Pulls search performance for shutap.com into seo-data/ so the daily
// content agent can pick keywords from real data.
//   seo-data/gsc-latest.json   Google Search Console, last 28 days (query x page)
//   seo-data/bing-latest.json  Bing Webmaster query stats
// Each source is skipped quietly if its secret is missing.
// Google auth: GSC_ACCESS_TOKEN (minted keylessly by Workload Identity Federation in the
// workflow) or, as a fallback, GSC_SERVICE_ACCOUNT (full JSON key). Bing: BING_WEBMASTER_API_KEY.
// No dependencies; Node 20+.

import { createSign } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";

const GSC_PROPERTY = "sc-domain:shutap.com";
const BING_SITE = "https://shutap.com/";
const OUT = "seo-data";
mkdirSync(OUT, { recursive: true });

const day = (offset) => new Date(Date.now() - offset * 86400_000).toISOString().slice(0, 10);
const b64url = (s) => Buffer.from(s).toString("base64url");

async function googleToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const sig = createSign("RSA-SHA256").update(`${head}.${claim}`).sign(sa.private_key, "base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${head}.${claim}.${sig}`,
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`Google token: ${JSON.stringify(j)}`);
  return j.access_token;
}

async function gscQuery(token, body) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_PROPERTY)}/searchAnalytics/query`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`GSC ${r.status}: ${JSON.stringify(j)}`);
  return j.rows ?? [];
}

async function pullGsc() {
  const { GSC_ACCESS_TOKEN, GSC_SERVICE_ACCOUNT } = process.env;
  if (!GSC_ACCESS_TOKEN && !GSC_SERVICE_ACCOUNT) return console.log("GSC: no credentials, skipped");
  const token = GSC_ACCESS_TOKEN || (await googleToken(JSON.parse(GSC_SERVICE_ACCOUNT)));
  const range = { startDate: day(30), endDate: day(2) }; // GSC data lags ~2 days
  const queryPage = await gscQuery(token, { ...range, dimensions: ["query", "page"], rowLimit: 5000 });
  const pages = await gscQuery(token, { ...range, dimensions: ["page"], rowLimit: 1000 });
  const shape = (rows, keys) =>
    rows.map((r) => ({
      ...Object.fromEntries(keys.map((k, i) => [k, r.keys[i]])),
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: Number(r.ctr.toFixed(4)),
      position: Number(r.position.toFixed(1)),
    }));
  const qp = shape(queryPage, ["query", "page"]);
  // Striking distance: already seen by Google, ranking 5-20 — the cheapest wins.
  const striking = qp
    .filter((r) => r.position >= 5 && r.position <= 20)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 100);
  writeFileSync(
    `${OUT}/gsc-latest.json`,
    JSON.stringify(
      { property: GSC_PROPERTY, ...range, pulledAt: new Date().toISOString(), striking, pages: shape(pages, ["page"]), queryPage: qp },
      null,
      1,
    ),
  );
  console.log(`GSC: ${qp.length} query×page rows, ${striking.length} striking-distance`);
}

async function pullBing() {
  const key = process.env.BING_WEBMASTER_API_KEY;
  if (!key) return console.log("Bing: no secret, skipped");
  const base = "https://ssl.bing.com/webmaster/api.svc/json";
  const q = `siteUrl=${encodeURIComponent(BING_SITE)}&apikey=${key}`;
  const get = async (m) => {
    const r = await fetch(`${base}/${m}?${q}`);
    if (!r.ok) throw new Error(`Bing ${m} ${r.status}: ${await r.text()}`);
    return (await r.json()).d ?? [];
  };
  const queries = await get("GetQueryStats");
  const pages = await get("GetPageStats");
  writeFileSync(`${OUT}/bing-latest.json`, JSON.stringify({ site: BING_SITE, pulledAt: new Date().toISOString(), queries, pages }, null, 1));
  console.log(`Bing: ${queries.length} queries, ${pages.length} pages`);
}

let failed = false;
for (const [name, fn] of [["GSC", pullGsc], ["Bing", pullBing]]) {
  try {
    await fn();
  } catch (e) {
    failed = true;
    console.error(`${name} failed: ${e.message}`);
  }
}
if (failed) process.exit(1);
