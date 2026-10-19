import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { sitemapIndexResponse } from "./sitemap[.]xml";

// Same index as /sitemap.xml, on a path the edge cache has never stored.
// The live /sitemap.xml was stuck on an old cached copy; submit this one.
export const Route = createFileRoute("/sitemap-index.xml")({
  server: { handlers: { GET: sitemapIndexResponse } },
});
