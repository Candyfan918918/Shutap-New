import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { renderUrlset, todayPacific, type SitemapEntry } from "@/lib/seo/sitemap";
import { GUIDES, GUIDE_TOPICS, guidePath, guidesInTopic, topicPath } from "@/lib/seo/guides";
import { FUNNIEST, FUNNIEST_HUB, funniestPath } from "@/lib/seo/funniest";

const newest = (dates: (string | undefined)[]) => dates.filter(Boolean).sort().at(-1) as string | undefined;

/** Sitewide reposition to "the humor amplifier" (PRs #105–#122), then Oct 30: audience is everyone, no "generator" anywhere: every page's
 *  header, CTA and copy changed that day, so no lastmod is older than this. */
const REPOSITIONED = "2026-10-30";
const fresh = (d: string | undefined) => newest([d, REPOSITIONED]);

/**
 * Built per request (not at module load) so lastmod stays fresh. The homepage
 * carries a new "what to post today" idea every day, so its lastmod is today.
 * Pages, guides and funniest entries come from data files: add an entry and the
 * sitemap lists it on the next request.
 */
export function getCoreEntries(): SitemapEntry[] {
  return [
  { path: "/", lastmod: todayPacific(), changefreq: "daily", priority: "1.0" },
  { path: "/guides", lastmod: fresh(newest(GUIDES.map((g) => g.updated ?? g.published))), changefreq: "weekly", priority: "0.9" },
  { path: "/humor-amplifier", lastmod: REPOSITIONED, changefreq: "monthly", priority: "0.9" },
  ...GUIDE_TOPICS.filter((t) => guidesInTopic(t.id).length > 0).map((t): SitemapEntry => ({
    path: topicPath(t.id),
    lastmod: fresh(newest(guidesInTopic(t.id).map((g) => g.updated ?? g.published))),
    changefreq: "weekly",
    priority: "0.8",
  })),
  ...GUIDES.map((g): SitemapEntry => ({
    path: guidePath(g.slug),
    lastmod: fresh(g.updated ?? g.published),
    changefreq: "monthly",
    priority: g.kind === "tool" ? "0.8" : "0.7",
  })),
  ...(FUNNIEST.length > 0
    ? [
        {
          path: FUNNIEST_HUB,
          lastmod: fresh(FUNNIEST.map((e) => e.updated ?? e.published).sort().at(-1)),
          changefreq: "daily",
          priority: "0.8",
        } as SitemapEntry,
      ]
    : []),
  ...FUNNIEST.map((e): SitemapEntry => ({
    path: funniestPath(e.slug),
    lastmod: fresh(e.updated ?? e.published),
    changefreq: "monthly",
    priority: "0.7",
  })),
  { path: "/about", lastmod: REPOSITIONED, changefreq: "monthly", priority: "0.8" },
  { path: "/how-it-works", lastmod: REPOSITIONED, changefreq: "monthly", priority: "0.8" },
  { path: "/pricing", lastmod: REPOSITIONED, changefreq: "monthly", priority: "0.8" },
  { path: "/trust", lastmod: REPOSITIONED, changefreq: "monthly", priority: "0.6" },
  { path: "/faq", lastmod: REPOSITIONED, changefreq: "monthly", priority: "0.7" },
  { path: "/contact", lastmod: REPOSITIONED, changefreq: "yearly", priority: "0.4" },
  { path: "/business", lastmod: REPOSITIONED, changefreq: "monthly", priority: "0.6" },
  { path: "/terms", lastmod: REPOSITIONED, changefreq: "yearly", priority: "0.4" },
  { path: "/privacy", lastmod: REPOSITIONED, changefreq: "yearly", priority: "0.4" },
  { path: "/guidelines", lastmod: REPOSITIONED, changefreq: "yearly", priority: "0.4" },
  { path: "/safety", lastmod: REPOSITIONED, changefreq: "yearly", priority: "0.4" },
  { path: "/ai-disclosure", lastmod: REPOSITIONED, changefreq: "yearly", priority: "0.4" },
  { path: "/disclaimer", lastmod: REPOSITIONED, changefreq: "yearly", priority: "0.4" },
  { path: "/legal", lastmod: REPOSITIONED, changefreq: "yearly", priority: "0.3" },
  ];
}

export const Route = createFileRoute("/sitemaps/core.xml")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(renderUrlset(getCoreEntries()), {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
