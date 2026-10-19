import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { SITE_URL } from "@/lib/site";
import { OUTCOMES, isOutcomeIndexable } from "@/lib/seo/outcomes";
import { PROFILES, isProfileIndexable } from "@/lib/seo/profiles";
import { countIndexableStories } from "@/lib/seo/story.server";
import { INDEX_USER_CONTENT } from "@/lib/seo/flags";
import { renderSitemapIndex, todayPacific, SITEMAP_CACHE_CONTROL } from "@/lib/seo/sitemap";
import { listPostsForSitemap } from "./sitemaps/posts[.]xml";
import { GUIDES } from "@/lib/seo/guides";
import { FUNNIEST } from "@/lib/seo/funniest";

/** Today: the homepage idea changes daily, so the pages sitemap changes daily. Also covers any newer guide or funniest date. */
const coreLastmod = () =>
  [
    todayPacific(),
    ...GUIDES.map((g) => g.published),
    ...FUNNIEST.map((e) => e.updated ?? e.published),
  ]
    .sort()
    .at(-1);

/** Shared by /sitemap.xml and /sitemap-index.xml. */
export async function sitemapIndexResponse(): Promise<Response> {
  const children: { loc: string; lastmod?: string }[] = [
    { loc: `${SITE_URL}/sitemaps/site.xml`, lastmod: coreLastmod() },
  ];

  if (OUTCOMES.filter(isOutcomeIndexable).length > 0) {
    children.push({ loc: `${SITE_URL}/sitemaps/outcomes.xml` });
  }
  if (PROFILES.filter(isProfileIndexable).length > 0) {
    children.push({ loc: `${SITE_URL}/sitemaps/profiles.xml` });
  }

  // User-written content (stories, room posts) is never advertised
  // unless INDEX_USER_CONTENT is switched on.
  if (INDEX_USER_CONTENT) {
    const storyCount = await countIndexableStories();
    if (storyCount > 0) {
      children.push({ loc: `${SITE_URL}/sitemaps/stories.xml` });
    }
    const posts = await listPostsForSitemap(1);
    if (posts.length > 0) {
      children.push({ loc: `${SITE_URL}/sitemaps/posts.xml` });
    }
  }

  return new Response(renderSitemapIndex(children), {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": SITEMAP_CACHE_CONTROL,
    },
  });
}

export const Route = createFileRoute("/sitemap.xml")({
  server: { handlers: { GET: sitemapIndexResponse } },
});
