import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { renderUrlset, type SitemapEntry } from "@/lib/seo/sitemap";

/** Joke posts in rooms that are public and not hidden. Posts younger than
 *  ten minutes are left out so a quick delete never reaches a crawler. */
export async function listPostsForSitemap(limit = 5000): Promise<Array<{ id: string; updated_at: string }>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data } = await (supabaseAdmin as any)
    .from("rooms")
    .select("id, updated_at")
    .eq("source", "joke")
    .eq("hidden", false)
    .lt("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Array<{ id: string; updated_at: string }>).map((r) => ({ id: r.id, updated_at: r.updated_at }));
}

export const Route = createFileRoute("/sitemaps/posts.xml")({
  server: {
    handlers: {
      GET: async () => {
        const rows = await listPostsForSitemap();
        if (rows.length === 0) return new Response("Not Found", { status: 404 });
        const entries: SitemapEntry[] = rows.map((r) => ({
          path: `/rooms/${r.id}`,
          lastmod: r.updated_at,
          changefreq: "weekly",
          priority: "0.6",
        }));
        return new Response(renderUrlset(entries), {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=900" },
        });
      },
    },
  },
});
