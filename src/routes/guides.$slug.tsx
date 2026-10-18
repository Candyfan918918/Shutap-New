import { createFileRoute, notFound } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SeoPage } from "@/components/seo/SeoPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";
import { GUIDES, getGuide, guidePath } from "@/lib/seo/guides";

export const Route = createFileRoute("/guides/$slug")({
  loader: ({ params }) => {
    const guide = getGuide(params.slug);
    if (!guide) throw notFound();
    return { slug: guide.slug };
  },
  head: ({ params }) => {
    const g = getGuide(params.slug);
    if (!g) {
      return { meta: [{ title: "Not found — Shutap" }, { name: "robots", content: "noindex, follow" }] };
    }
    const path = guidePath(g.slug);
    const url = `${SITE_URL}${path}`;
    const jsonLd =
      g.kind === "guide"
        ? {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: g.h1,
            description: g.description,
            url,
            datePublished: g.published,
            author: { "@type": "Organization", name: "Shutap", url: SITE_URL },
            publisher: { "@type": "Organization", name: "Shutap", url: SITE_URL },
          }
        : {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: g.h1,
            description: g.description,
            url,
            datePublished: g.published,
            about: {
              "@type": "SoftwareApplication",
              name: "Shutap",
              applicationCategory: "EntertainmentApplication",
              operatingSystem: "Web",
              url: SITE_URL,
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            },
          };
    return {
      meta: [
        { title: g.title },
        { name: "description", content: g.description },
        { property: "og:title", content: g.title },
        { property: "og:description", content: g.description },
        { property: "og:type", content: g.kind === "guide" ? "article" : "website" },
        { property: "og:url", content: url },
        ...ogImageMeta(),
        { name: "twitter:title", content: g.title },
        { name: "twitter:description", content: g.description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(jsonLd) },
        breadcrumbScript([
          { name: "Guides", path: "/guides" },
          { name: g.h1, path },
        ]),
      ],
    };
  },
  component: GuideRoute,
  notFoundComponent: () => (
    <SeoPage>
      <h1 className="text-2xl font-semibold">That guide doesn't exist.</h1>
      <a href="/guides" className="mt-4 inline-block underline">
        See all guides →
      </a>
    </SeoPage>
  ),
});

function GuideRoute() {
  const { slug } = Route.useParams();
  const g = getGuide(slug);
  if (!g) return null;
  const related = g.related
    .map((s) => GUIDES.find((x) => x.slug === s))
    .filter((x): x is NonNullable<typeof x> => !!x)
    .map((x) => ({ href: guidePath(x.slug), label: x.h1 }));
  return (
    <ContentPage
      breadcrumbs={[
        { name: "Guides", path: "/guides" },
        { name: g.h1, path: guidePath(g.slug) },
      ]}
      h1={g.h1}
      capsule={g.capsule}
      sections={g.sections}
      cta={g.cta}
      others={[...related, { href: "/guides", label: "All guides" }, { href: "/pricing", label: "Pricing" }]}
    />
  );
}
