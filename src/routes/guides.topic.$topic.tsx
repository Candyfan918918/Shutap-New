import { createFileRoute, notFound } from "@tanstack/react-router";
import { Route as RootRoute } from "./__root";
import { ogImageMeta } from "@/lib/seo/meta";
import { ContentPage } from "@/components/seo/ContentPage";
import { SeoPage } from "@/components/seo/SeoPage";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript } from "@/lib/seo/breadcrumbs";
import { GUIDE_TOPICS, getTopic, guidePath, guidesInTopic, topicPath } from "@/lib/seo/guides";

// Topic hub: one cluster of guides, newest first. Grows on its own as the
// daily article agent adds files with this topic.
export const Route = createFileRoute("/guides/topic/$topic")({
  codeSplitGroupings: [["component"]],
  loader: ({ params }) => {
    const t = getTopic(params.topic);
    if (!t || guidesInTopic(t.id).length === 0) throw notFound({ routeId: "/guides/topic/$topic" });
    return { topic: t.id };
  },
  head: ({ params }) => {
    const t = getTopic(params.topic);
    if (!t) return { meta: [{ title: "Not found — Shutap" }, { name: "robots", content: "noindex, follow" }] };
    const path = topicPath(t.id);
    const url = `${SITE_URL}${path}`;
    const list = guidesInTopic(t.id);
    return {
      meta: [
        { title: t.title },
        { name: "description", content: t.description },
        { property: "og:title", content: t.title },
        { property: "og:description", content: t.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        ...ogImageMeta(),
        { name: "twitter:title", content: t.title },
        { name: "twitter:description", content: t.description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: t.label,
            description: t.description,
            url,
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: list.length,
              itemListElement: list.map((g, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `${SITE_URL}${guidePath(g.slug)}`,
                name: g.h1,
              })),
            },
          }),
        },
        breadcrumbScript([
          { name: "Guides", path: "/guides" },
          { name: t.label, path },
        ]),
      ],
    };
  },
  component: TopicRoute,
  errorComponent: (props) => {
    const ErrorPage = RootRoute.options.errorComponent;
    return ErrorPage ? <ErrorPage {...props} /> : null;
  },
  notFoundComponent: () => (
    <SeoPage>
      <h1 className="text-2xl font-semibold">That topic doesn't exist yet.</h1>
      <a href="/guides" className="mt-4 inline-block underline">
        See all guides →
      </a>
    </SeoPage>
  ),
});

function TopicRoute() {
  const { topic } = Route.useParams();
  const t = getTopic(topic);
  if (!t) return null;
  const list = guidesInTopic(t.id);
  const otherTopics = GUIDE_TOPICS.filter((x) => x.id !== t.id && guidesInTopic(x.id).length > 0);
  return (
    <ContentPage
      tryIt={`guides/topic/${t.id}`}
      breadcrumbs={[
        { name: "Guides", path: "/guides" },
        { name: t.label, path: topicPath(t.id) },
      ]}
      h1={t.label}
      capsule={t.intro}
      sections={[]}
      linkGroups={[
        {
          heading: `${list.length} ${list.length === 1 ? "guide" : "guides"}`,
          items: list.map((g) => ({ href: guidePath(g.slug), label: g.h1, blurb: g.blurb })),
        },
      ]}
      cta={{ label: "Write your story, get the bit", href: "/" }}
      others={[
        ...otherTopics.map((x) => ({ href: topicPath(x.id), label: x.label })),
        { href: "/guides", label: "All guides" },
        { href: "/funniest", label: "The funniest" },
      ]}
    />
  );
}
