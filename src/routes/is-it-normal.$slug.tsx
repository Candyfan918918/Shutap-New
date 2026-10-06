import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { SeoPage } from "@/components/seo/SeoPage";
import { getHub, HUBS_BY_PILLAR, type SituationHub } from "@/lib/seo/hubs";
import { SITE_URL } from "@/lib/site";
import { breadcrumbScript, hubTrail } from "@/lib/seo/breadcrumbs";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const Route = createFileRoute("/is-it-normal/$slug")({
  loader: ({ params }) => {
    const hub = getHub(params.slug);
    if (!hub) throw notFound();
    return hub;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Not found" }] };
    const title = `${capitalize(loaderData.question)} — shutap`;
    const description = loaderData.answer.slice(0, 155);
    const url = `${SITE_URL}/is-it-normal/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: loaderData.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: loaderData.answer,
                },
              },
              ...loaderData.paa.map((p) => ({
                "@type": "Question",
                name: p.q,
                acceptedAnswer: { "@type": "Answer", text: p.a },
              })),
            ],
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: loaderData.question,
            description,
            articleSection: loaderData.pillar,
          }),
        },
        breadcrumbScript(hubTrail(loaderData)),
      ],
    };
  },
  component: SituationHubPage,
  notFoundComponent: () => (
    <SeoPage>
      <h1 className="text-2xl font-semibold">we don't have a room for that question yet.</h1>
      <p className="mt-3 text-muted-foreground">
        try one of the{" "}
        <Link to="/relationships" className="underline">
          pillars
        </Link>{" "}
        to find something close.
      </p>
    </SeoPage>
  ),
  errorComponent: ({ reset }) => (
    <SeoPage>
      <h1 className="text-2xl font-semibold">something broke loading this room.</h1>
      <button onClick={reset} className="mt-3 underline">
        try again
      </button>
    </SeoPage>
  ),
});

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function SituationHubPage() {
  const hub = Route.useLoaderData() as SituationHub;
  const siblings = HUBS_BY_PILLAR[hub.pillar].filter((h: SituationHub) => h.slug !== hub.slug);

  return (
    <SeoPage>
      <article className="space-y-10">
        <header className="space-y-3">
          <Breadcrumbs trail={hubTrail(hub)} />
          <h1 className="text-3xl font-semibold tracking-tight">{hub.question}</h1>
          <p className="text-lg leading-relaxed">{hub.answer}</p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">people also ask</h2>
          <dl className="space-y-5">
            {hub.paa.map((p) => (
              <div key={p.q} className="space-y-1">
                <dt className="font-medium">{p.q}</dt>
                <dd className="text-muted-foreground">{p.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="space-y-3 rounded-lg border border-border p-5">
          <h2 className="text-base font-semibold">turn yours into a joke</h2>
          <p className="text-sm text-muted-foreground">
            paste what happened. get jokes. post the best one.
          </p>
          <Link
            to="/"
            className="inline-block text-sm font-medium underline underline-offset-4"
          >
            open a room →
          </Link>
        </section>

        {siblings.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">more from {hub.pillar}</h2>
            <ul className="space-y-2">
              {siblings.map((s) => (
                <li key={s.slug}>
                  <Link
                    to="/is-it-normal/$slug"
                    params={{ slug: s.slug }}
                    className="underline-offset-4 hover:underline"
                  >
                    {s.question}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </SeoPage>
  );
}
