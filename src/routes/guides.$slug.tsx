import { createFileRoute, notFound } from "@tanstack/react-router";
import { Route as RootRoute } from "./__root";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SeoPage } from "@/components/seo/SeoPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";
import { GUIDES, getGuide, getTopic, guidePath, topicPath } from "@/lib/seo/guides";

export const Route = createFileRoute("/guides/$slug")({
  // Keep boundary options in the registered route; only the page is lazy.
  codeSplitGroupings: [["component"]],
  loader: ({ params }) => {
    const guide = getGuide(params.slug);
    if (!guide) throw notFound({ routeId: "/guides/$slug" });
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
      g.kind !== "tool"
        ? {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: g.h1,
            description: g.description,
            url,
            datePublished: g.published,
            dateModified: g.updated ?? g.published,
            ...(g.keyword ? { keywords: g.keyword } : {}),
            ...(g.sources?.length ? { citation: g.sources.map((s) => s.url) } : {}),
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
        { property: "og:type", content: g.kind !== "tool" ? "article" : "website" },
        { property: "og:url", content: url },
        ...ogImageMeta(),
        { name: "twitter:title", content: g.title },
        { name: "twitter:description", content: g.description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(jsonLd) },
        ...(g.faq?.length
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: g.faq.map((f) => ({
                    "@type": "Question",
                    name: f.q,
                    acceptedAnswer: { "@type": "Answer", text: f.a },
                  })),
                }),
              },
            ]
          : []),
        breadcrumbScript([
          { name: "Guides", path: "/guides" },
          ...(g.topic ? [{ name: getTopic(g.topic)?.label ?? g.topic, path: topicPath(g.topic) }] : []),
          { name: g.h1, path },
        ]),
      ],
    };
  },
  component: GuideRoute,
  errorComponent: (props) => {
    const ErrorPage = RootRoute.options.errorComponent;
    return ErrorPage ? <ErrorPage {...props} /> : null;
  },
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
  const topic = g.topic ? getTopic(g.topic) : undefined;
  const related = g.related
    .map((s) => GUIDES.find((x) => x.slug === s))
    .filter((x): x is NonNullable<typeof x> => !!x)
    .map((x) => ({ href: guidePath(x.slug), label: x.h1 }));
  return (
    <ContentPage
      tryIt={`guides/${slug}`}
      preset={g.preset}
      sample={g.sample}
      breadcrumbs={[
        { name: "Guides", path: "/guides" },
        ...(topic ? [{ name: topic.label, path: topicPath(topic.id) }] : []),
        { name: g.h1, path: guidePath(g.slug) },
      ]}
      h1={g.h1}
      capsule={g.capsule}
      sections={g.sections}
      cta={g.cta}
      children={<GuideExtras faq={g.faq} sources={g.sources} techniques={g.techniques} />}
      others={[...related, ...(topic ? [{ href: topicPath(topic.id), label: `More on ${topic.label.toLowerCase()}` }] : []), { href: "/guides", label: "All guides" }, { href: "/funniest", label: "The funniest" }, { href: "/business", label: "Shutap Enterprise" }, { href: "/pricing", label: "Pricing" }]}
    />
  );
}

const H2 = {
  fontFamily: "'Sora', system-ui, sans-serif",
  fontSize: "clamp(20px, 2.6vw, 24px)",
  fontWeight: 600,
  letterSpacing: "-0.02em",
  margin: "0 0 12px",
  color: "#0b080f",
} as const;

function GuideExtras({ faq, sources, techniques }: { faq?: { q: string; a: string }[]; sources?: { label: string; url: string }[]; techniques?: { name: string; whyItWorks: string; example: string; tryIt: string }[] }) {
  if (!faq?.length && !sources?.length && !techniques?.length) return null;
  return (
    <>
      {techniques?.length ? (
        <section style={{ marginBottom: 36 }}>
          <h2 style={H2}>The techniques, as Shutap uses them</h2>
          <p style={{ fontSize: 15, margin: "0 0 14px", color: "#443c42" }}>
            Each move on this page is in the humor amplifier's technique bank: when you type what happened, one of these may be the shape your bit is built on.
          </p>
          {techniques.map((t) => (
            <div key={t.name} style={{ marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 4px", color: "#0b080f" }}>{t.name}</h3>
              <p style={{ fontSize: 16, margin: "0 0 4px", color: "#0b080f" }}>{t.whyItWorks}</p>
              <p style={{ fontSize: 16, margin: "0 0 4px", color: "#0b080f", fontStyle: "italic" }}>{t.example}</p>
              <p style={{ fontSize: 15, margin: 0, color: "#443c42" }}>Try it: {t.tryIt}</p>
            </div>
          ))}
        </section>
      ) : null}
      {faq?.length ? (
        <section style={{ marginBottom: 36 }}>
          <h2 style={H2}>Questions people ask</h2>
          {faq.map((f) => (
            <div key={f.q} style={{ marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, margin: "0 0 4px", color: "#0b080f" }}>{f.q}</h3>
              <p style={{ fontSize: 17, margin: 0, color: "#0b080f" }}>{f.a}</p>
            </div>
          ))}
        </section>
      ) : null}
      {sources?.length ? (
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ ...H2, fontSize: 18 }}>Sources</h2>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 15, color: "#443c42" }}>
            {sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} rel="noopener" target="_blank" style={{ color: "#443c42" }}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
