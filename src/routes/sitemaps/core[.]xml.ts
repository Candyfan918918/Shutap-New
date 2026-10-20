import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { renderUrlset, todayPacific, type SitemapEntry } from "@/lib/seo/sitemap";
import { GUIDES, GUIDE_TOPICS, guidePath, guidesInTopic, topicPath } from "@/lib/seo/guides";
import { FUNNIEST, FUNNIEST_HUB, funniestPath } from "@/lib/seo/funniest";

const newest = (dates: (string | undefined)[]) => dates.filter(Boolean).sort().at(-1) as string | undefined;

/**
 * Built per request (not at module load) so lastmod stays fresh. The homepage
 * carries a new "what to post today" idea every day, so its lastmod is today.
 * Pages, guides and funniest entries come from data files: add an entry and the
 * sitemap lists it on the next request.
 */
export function getCoreEntries(): SitemapEntry[] {
  return [
  { path: "/", lastmod: todayPacific(), changefreq: "daily", priority: "1.0" },
  { path: "/guides", lastmod: newest(GUIDES.map((g) => g.updated ?? g.published)), changefreq: "weekly", priority: "0.9" },
  { path: "/ai-joke-generator", lastmod: "2026-10-18", changefreq: "monthly", priority: "0.9" },
  ...GUIDE_TOPICS.filter((t) => guidesInTopic(t.id).length > 0).map((t): SitemapEntry => ({
    path: topicPath(t.id),
    lastmod: newest(guidesInTopic(t.id).map((g) => g.updated ?? g.published)),
    changefreq: "weekly",
    priority: "0.8",
  })),
  ...GUIDES.map((g): SitemapEntry => ({
    path: guidePath(g.slug),
    lastmod: g.updated ?? g.published,
    changefreq: "monthly",
    priority: g.kind === "tool" ? "0.8" : "0.7",
  })),
  ...(FUNNIEST.length > 0
    ? [
        {
          path: FUNNIEST_HUB,
          lastmod: FUNNIEST.map((e) => e.updated ?? e.published).sort().at(-1),
          changefreq: "daily",
          priority: "0.8",
        } as SitemapEntry,
      ]
    : []),
  ...FUNNIEST.map((e): SitemapEntry => ({
    path: funniestPath(e.slug),
    lastmod: e.updated ?? e.published,
    changefreq: "monthly",
    priority: "0.7",
  })),
  { path: "/about", lastmod: "2026-10-17", changefreq: "monthly", priority: "0.8" },
  { path: "/how-it-works", changefreq: "monthly", priority: "0.8" },
  { path: "/pricing", changefreq: "monthly", priority: "0.8" },
  { path: "/trust", changefreq: "monthly", priority: "0.6" },
  { path: "/faq", lastmod: "2026-10-17", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "yearly", priority: "0.4" },
  { path: "/business", lastmod: "2026-10-17", changefreq: "monthly", priority: "0.6" },
  { path: "/terms", changefreq: "yearly", priority: "0.4" },
  { path: "/privacy", changefreq: "yearly", priority: "0.4" },
  { path: "/guidelines", changefreq: "yearly", priority: "0.4" },
  { path: "/safety", changefreq: "yearly", priority: "0.4" },
  { path: "/ai-disclosure", changefreq: "yearly", priority: "0.4" },
  { path: "/disclaimer", changefreq: "yearly", priority: "0.4" },
  { path: "/legal", changefreq: "yearly", priority: "0.3" },
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
