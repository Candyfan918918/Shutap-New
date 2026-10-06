import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { HUBS } from "@/lib/seo/hubs";
import { VENT_TOPICS } from "@/lib/seo/venting-topics";
import { renderUrlset, type SitemapEntry } from "@/lib/seo/sitemap";

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/rooms", changefreq: "daily", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/how-it-works", changefreq: "monthly", priority: "0.8" },
  { path: "/trust", changefreq: "monthly", priority: "0.6" },
  { path: "/relationships", changefreq: "weekly", priority: "0.9" },
  { path: "/marriage", changefreq: "weekly", priority: "0.9" },
  { path: "/family", changefreq: "weekly", priority: "0.9" },
  { path: "/career", changefreq: "weekly", priority: "0.9" },
  { path: "/faq", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "yearly", priority: "0.4" },
  { path: "/terms", changefreq: "yearly", priority: "0.4" },
  { path: "/privacy", changefreq: "yearly", priority: "0.4" },
  { path: "/guidelines", changefreq: "yearly", priority: "0.4" },
  { path: "/safety", changefreq: "yearly", priority: "0.4" },
  { path: "/ai-disclosure", changefreq: "yearly", priority: "0.4" },
  { path: "/disclaimer", changefreq: "yearly", priority: "0.4" },
  { path: "/legal", changefreq: "yearly", priority: "0.3" },
  ...HUBS.map((h) => ({
    path: `/is-it-normal/${h.slug}`,
    changefreq: "monthly" as const,
    priority: "0.7",
  })),
  ...VENT_TOPICS.map((t) => ({
    path: `/vent/${t.slug}`,
    changefreq: "weekly" as const,
    priority: "0.8",
  })),
];

export const Route = createFileRoute("/sitemaps/core.xml")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(renderUrlset(entries), {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
