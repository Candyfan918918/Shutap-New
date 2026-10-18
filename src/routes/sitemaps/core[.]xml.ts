import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { renderUrlset, type SitemapEntry } from "@/lib/seo/sitemap";
import { GUIDES, guidePath } from "@/lib/seo/guides";
import { FUNNIEST, FUNNIEST_HUB, funniestPath } from "@/lib/seo/funniest";

export const CORE_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/guides", changefreq: "weekly", priority: "0.9" },
  ...GUIDES.map((g): SitemapEntry => ({
    path: guidePath(g.slug),
    lastmod: g.published,
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
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/how-it-works", changefreq: "monthly", priority: "0.8" },
  { path: "/pricing", changefreq: "monthly", priority: "0.8" },
  { path: "/trust", changefreq: "monthly", priority: "0.6" },
  { path: "/faq", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "yearly", priority: "0.4" },
  { path: "/business", changefreq: "monthly", priority: "0.6" },
  { path: "/terms", changefreq: "yearly", priority: "0.4" },
  { path: "/privacy", changefreq: "yearly", priority: "0.4" },
  { path: "/guidelines", changefreq: "yearly", priority: "0.4" },
  { path: "/safety", changefreq: "yearly", priority: "0.4" },
  { path: "/ai-disclosure", changefreq: "yearly", priority: "0.4" },
  { path: "/disclaimer", changefreq: "yearly", priority: "0.4" },
  { path: "/legal", changefreq: "yearly", priority: "0.3" },
];

export const Route = createFileRoute("/sitemaps/core.xml")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(renderUrlset(CORE_ENTRIES), {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
