import { createFileRoute, notFound } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { SeoPage } from "@/components/seo/SeoPage";
import { FunniestPage } from "@/components/seo/FunniestPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";
import { FUNNIEST, FUNNIEST_HUB, funniestPath, getFunniest, type FunniestEntry } from "@/lib/seo/funniest";

/** Related entries, falling back to the newest other entries so every page links two siblings. */
function siblings(e: FunniestEntry): FunniestEntry[] {
  const picked = e.related
    .map((s) => getFunniest(s))
    .filter((x): x is FunniestEntry => !!x && x.slug !== e.slug);
  const rest = [...FUNNIEST]
    .reverse()
    .filter((x) => x.slug !== e.slug && !picked.some((p) => p.slug === x.slug));
  return [...picked, ...rest].slice(0, 3);
}

export const Route = createFileRoute("/funniest/$slug")({
  loader: ({ params }) => {
    const e = getFunniest(params.slug);
    if (!e) throw notFound();
    return { slug: e.slug };
  },
  head: ({ params }) => {
    const e = getFunniest(params.slug);
    if (!e) {
      return { meta: [{ title: "Not found — Shutap" }, { name: "robots", content: "noindex, follow" }] };
    }
    const path = funniestPath(e.slug);
    const url = `${SITE_URL}${path}`;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: e.h1,
      description: e.description,
      url,
      datePublished: e.published,
      dateModified: e.updated ?? e.published,
      about: { "@type": "Person", name: e.pick.name, description: e.pick.role },
      mentions: e.runnersUp.map((p) => ({ "@type": "Person", name: p.name })),
      citation: e.sources.map((s) => s.url),
      author: { "@type": "Organization", name: "Shutap", url: SITE_URL },
      publisher: { "@type": "Organization", name: "Shutap", url: SITE_URL },
    };
    return {
      meta: [
        { title: e.title },
        { name: "description", content: e.description },
        { property: "og:title", content: e.title },
        { property: "og:description", content: e.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...ogImageMeta(),
        { name: "twitter:title", content: e.title },
        { name: "twitter:description", content: e.description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(jsonLd) },
        breadcrumbScript([
          { name: "The funniest", path: FUNNIEST_HUB },
          { name: e.h1, path },
        ]),
      ],
    };
  },
  component: FunniestRoute,
  notFoundComponent: () => (
    <SeoPage>
      <h1 className="text-2xl font-semibold">That page doesn't exist.</h1>
      <a href={FUNNIEST_HUB} className="mt-4 inline-block underline">
        See the whole series →
      </a>
    </SeoPage>
  ),
});

function FunniestRoute() {
  const { slug } = Route.useParams();
  const e = getFunniest(slug);
  if (!e) return null;
  return (
    <FunniestPage
      entry={e}
      breadcrumbs={[
        { name: "The funniest", path: FUNNIEST_HUB },
        { name: e.h1, path: funniestPath(e.slug) },
      ]}
      others={[
        ...siblings(e).map((x) => ({ href: funniestPath(x.slug), label: `Funniest ${x.category}` })),
        { href: FUNNIEST_HUB, label: "The whole series" },
        { href: "/guides", label: "Guides" },
      ]}
    />
  );
}
