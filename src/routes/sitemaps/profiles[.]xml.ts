import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { PROFILES, isProfileIndexable } from "@/lib/seo/profiles";
import { renderUrlset, type SitemapEntry, SITEMAP_CACHE_CONTROL } from "@/lib/seo/sitemap";

export const Route = createFileRoute("/sitemaps/profiles.xml")({
  server: {
    handlers: {
      GET: async () => {
        const indexable = PROFILES.filter(isProfileIndexable);
        if (indexable.length === 0) {
          return new Response("Not Found", { status: 404 });
        }
        const entries: SitemapEntry[] = indexable.map((p) => ({
          path: `/u/${p.pseudonym}`,
          changefreq: "weekly",
          priority: "0.5",
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
