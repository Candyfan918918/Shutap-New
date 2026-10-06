import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { SITE_URL } from "@/lib/site";
import { OUTCOMES, isOutcomeIndexable } from "@/lib/seo/outcomes";
import { PROFILES, isProfileIndexable } from "@/lib/seo/profiles";
import { countIndexableStories } from "@/lib/seo/story.server";
import { renderSitemapIndex } from "@/lib/seo/sitemap";
import { listPostsForSitemap } from "./sitemaps/posts[.]xml";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const children: { loc: string; lastmod?: string }[] = [
          { loc: `${SITE_URL}/sitemaps/core.xml` },
        ];

        if (OUTCOMES.filter(isOutcomeIndexable).length > 0) {
          children.push({ loc: `${SITE_URL}/sitemaps/outcomes.xml` });
        }
        if (PROFILES.filter(isProfileIndexable).length > 0) {
          children.push({ loc: `${SITE_URL}/sitemaps/profiles.xml` });
        }

        // Stories: advertise the child sitemap when at least one real
        // (non-seed) public, non-crisis, non-deleted story exists.
        const storyCount = await countIndexableStories();
        if (storyCount > 0) {
          children.push({ loc: `${SITE_URL}/sitemaps/stories.xml` });
        }

        // Room posts: advertised once at least one public post exists.
        const posts = await listPostsForSitemap(1)
        if (posts.length > 0) {
          children.push({ loc: `${SITE_URL}/sitemaps/posts.xml` });
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
