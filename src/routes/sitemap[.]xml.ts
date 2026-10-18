import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { SITE_URL } from "@/lib/site";
import { OUTCOMES, isOutcomeIndexable } from "@/lib/seo/outcomes";
import { PROFILES, isProfileIndexable } from "@/lib/seo/profiles";
import { countIndexableStories } from "@/lib/seo/story.server";
import { INDEX_USER_CONTENT } from "@/lib/seo/flags";
import { renderSitemapIndex } from "@/lib/seo/sitemap";
import { listPostsForSitemap } from "./sitemaps/posts[.]xml";
import { GUIDES } from "@/lib/seo/guides";
import { FUNNIEST } from "@/lib/seo/funniest";

/** Newest guide or funniest date, so crawlers see core.xml change the day a page is added. */
const coreLastmod = [
  ...GUIDES.map((g) => g.published),
  ...FUNNIEST.map((e) => e.updated ?? e.published),
]
  .sort()
  .at(-1);

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const children: { loc: string; lastmod?: string }[] = [
          { loc: `${SITE_URL}/sitemaps/core.xml`, lastmod: coreLastmod },
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
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
