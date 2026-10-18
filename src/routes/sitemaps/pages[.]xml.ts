import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { renderUrlset, SITEMAP_CACHE_CONTROL } from "@/lib/seo/sitemap";
import { getCoreEntries } from "./core[.]xml";

// Same URLs as /sitemaps/core.xml. The sitemap index points here because the
// live core.xml was stuck on an old cached copy that never listed new pages.
export const Route = createFileRoute("/sitemaps/pages.xml")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(renderUrlset(getCoreEntries()), {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": SITEMAP_CACHE_CONTROL,
          },
        });
      },
    },
  },
});
