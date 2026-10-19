import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { renderUrlset, type SitemapEntry, SITEMAP_CACHE_CONTROL } from "@/lib/seo/sitemap";
import { listIndexableStoriesForSitemap } from "@/lib/seo/story.server";
import { INDEX_USER_CONTENT } from "@/lib/seo/flags";

export const Route = createFileRoute("/sitemaps/stories.xml")({
  server: {
    handlers: {
      GET: async () => {
        // Retired: tells crawlers the URL is gone for good.
        if (!INDEX_USER_CONTENT) return new Response("Gone", { status: 410 });
        const rows = await listIndexableStoriesForSitemap(5000);
        if (rows.length === 0) {
          return new Response("Not Found", { status: 404 });
        }
        const entries: SitemapEntry[] = rows.map((r) => ({
          path: `/story/${r.pillar}/${r.slug}`,
          lastmod: r.updated_at,
          changefreq: "weekly",
          priority: "0.7",
        }));
        return new Response(renderUrlset(entries), {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": SITEMAP_CACHE_CONTROL,
          },
        });
      },
    },
  },
});
