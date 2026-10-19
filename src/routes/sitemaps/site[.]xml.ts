import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { renderUrlset, SITEMAP_CACHE_CONTROL } from "@/lib/seo/sitemap";
import { getCoreEntries } from "./core[.]xml";

// Same URLs as core.xml and pages.xml. Those two paths were cached at the edge
// for weeks before sitemaps sent s-maxage; this path starts clean.
export const Route = createFileRoute("/sitemaps/site.xml")({
  server: {
    handlers: {
      GET: async () =>
        new Response(renderUrlset(getCoreEntries()), {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": SITEMAP_CACHE_CONTROL,
          },
        }),
    },
  },
});
