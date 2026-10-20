// Submits shutap.com URLs to IndexNow (Bing, Yandex, Seznam, Naver; Bing feeds
// ChatGPT search and Copilot). Walks the live sitemap index.
// Default: URLs whose <lastmod> is within RECENT_DAYS (plus the homepage).
// INDEXNOW_ALL=1 submits every URL in the sitemap.
// No dependencies; Node 20+.

const SITE = "https://shutap.com";
const HOST = "shutap.com";
const KEY = "4da5aa857dda0b0fdedc3d1033e004cf"; // matches public/<KEY>.txt
const RECENT_DAYS = Number(process.env.RECENT_DAYS ?? 3);
const ALL = process.env.INDEXNOW_ALL === "1";

async function getText(url) {
  const r = await fetch(url, { headers: { "User-Agent": "shutap-indexnow/1.0" } });
  if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
  return r.text();
}

function entries(xml, tag) {
  const out = [];
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g");
  for (const m of xml.matchAll(re)) {
    const loc = m[1].match(/<loc>\s*([^<\s]+)\s*<\/loc>/)?.[1];
    const lastmod = m[1].match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/)?.[1];
    if (loc) out.push({ loc, lastmod });
  }
  return out;
}

const index = await getText(`${SITE}/sitemap.xml`);
const childMaps = entries(index, "sitemap");
const maps = childMaps.length ? childMaps.map((s) => s.loc) : [`${SITE}/sitemap.xml`];

let urls = [];
for (const m of maps) {
  try {
    urls.push(...entries(await getText(m), "url"));
  } catch (e) {
    console.warn(`skip ${m}: ${e.message}`);
  }
}

const cutoff = Date.now() - RECENT_DAYS * 86400_000;
const picked = new Set([`${SITE}/`]);
for (const u of urls) {
  if (!u.loc.startsWith(SITE)) continue;
  if (ALL || !u.lastmod || Date.parse(u.lastmod) >= cutoff) picked.add(u.loc);
}
const urlList = [...picked].slice(0, 10000);
console.log(`sitemap URLs: ${urls.length} · submitting: ${urlList.length}`);

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `${SITE}/${KEY}.txt`,
    urlList,
  }),
});
console.log(`IndexNow -> HTTP ${res.status} ${await res.text()}`);
// 200/202 = accepted. 403 = key file not live yet (deploy first). 422 = URL/host mismatch.
if (![200, 202].includes(res.status)) process.exit(1);
